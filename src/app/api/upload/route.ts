import { getPrisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

const EXPECTED_HEADERS = [
  "rank",
  "region_id",
  "region_name",
  "province_name",
  "district_name",
  "hospital_code",
  "hospital_name",
  "hospital_type",
  "masks",
  "encounters",
  "citizens",
  "masks_per_citizen",
  "answered",
  "unanswered",
  "answered_pct",
  "median_reply_hours",
  "p90_reply_hours",
  "oldest_unanswered_days",
  "matched",
  "unmatched",
  "match_rate_pct",
  "masks_prior_90d",
  "masks_recent_90d",
  "change_90d_pct",
  "share_pct",
  "first_date_be",
  "last_date_be",
] as const;

// ดัชนีคอลัมน์อ่านจาก EXPECTED_HEADERS แทนการนับตำแหน่งด้วยมือ — เพิ่ม/ย้ายคอลัมน์
// ในอนาคตแล้วไม่ต้องไล่แก้เลขทุกจุด
const COLUMN = Object.fromEntries(
  EXPECTED_HEADERS.map((header, index) => [header, index]),
) as Record<(typeof EXPECTED_HEADERS)[number], number>;

type ImportRow = {
  rank: number;
  region_id: number;
  region_name: string;
  province_name: string;
  district_name: string;
  hospital_code: string;
  hospital_name: string;
  hospital_type: string;
  masks: number;
  encounters: number;
  citizens: number;
  masks_per_citizen: string;
  answered: number;
  unanswered: number;
  answered_pct: string;
  median_reply_hours: string | null;
  p90_reply_hours: string | null;
  oldest_unanswered_days: string | null;
  matched: number;
  unmatched: number;
  match_rate_pct: string;
  masks_prior_90d: number;
  masks_recent_90d: number;
  change_90d_pct: string | null;
  share_pct: string;
  first_date_be: string;
  last_date_be: string;
};

class UploadValidationError extends Error {}

function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];

    if (quoted) {
      if (character === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
      continue;
    }

    if (character === '"' && field.length === 0) {
      quoted = true;
    } else if (character === ",") {
      row.push(field.trim());
      field = "";
    } else if (character === "\n") {
      row.push(field.trim());
      if (row.some((value) => value !== "")) rows.push(row);
      row = [];
      field = "";
    } else if (character !== "\r") {
      field += character;
    }
  }

  if (quoted) throw new UploadValidationError("พบเครื่องหมายคำพูดในไฟล์ที่ปิดไม่ครบ");

  row.push(field.trim());
  if (row.some((value) => value !== "")) rows.push(row);
  return rows;
}

function parseInteger(value: string, field: string, line: number) {
  if (!/^\d+$/.test(value)) {
    throw new UploadValidationError(`บรรทัด ${line}: ${field} ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new UploadValidationError(`บรรทัด ${line}: ${field} มีค่ามากเกินไป`);
  }
  return parsed;
}

// Decimal ทุกตัวเก็บเป็นสตริงแล้วส่งให้ Prisma แปลงเอง เพื่อไม่ให้ปัดเศษหายระหว่างทาง
function parseDecimal(
  value: string,
  field: string,
  line: number,
  { scale, min, max, allowEmpty = false }: {
    scale: number;
    min: number;
    max: number;
    allowEmpty?: boolean;
  },
) {
  if (value === "") {
    if (allowEmpty) return null;
    throw new UploadValidationError(`บรรทัด ${line}: ${field} ห้ามเว้นว่าง`);
  }

  const pattern = new RegExp(`^-?\\d+(?:\\.\\d{1,${scale}})?$`);
  if (!pattern.test(value)) {
    throw new UploadValidationError(
      `บรรทัด ${line}: ${field} ต้องเป็นตัวเลขทศนิยมไม่เกิน ${scale} ตำแหน่ง`,
    );
  }

  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new UploadValidationError(`บรรทัด ${line}: ${field} ต้องอยู่ระหว่าง ${min} ถึง ${max}`);
  }
  return value;
}

function parseBuddhistDate(value: string, field: string, line: number) {
  if (!/^\d{8}$/.test(value)) {
    throw new UploadValidationError(`บรรทัด ${line}: ${field} ต้องอยู่ในรูปแบบ พ.ศ. 8 หลัก (YYYYMMDD)`);
  }
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new UploadValidationError(`บรรทัด ${line}: ${field} มีเดือนหรือวันที่ไม่ถูกต้อง`);
  }
  return value;
}

function validateRows(rows: string[][]): ImportRow[] {
  if (rows.length < 2) throw new UploadValidationError("ไฟล์ต้องมี header และข้อมูลอย่างน้อย 1 แถว");

  const headers = rows[0].map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  );
  if (headers.join(",") !== EXPECTED_HEADERS.join(",")) {
    throw new UploadValidationError("ชื่อหรือลำดับฟิลด์ใน header ไม่ตรงกับรูปแบบที่กำหนด");
  }

  const dataRows = rows.slice(1);
  if (dataRows.length > MAX_ROWS) {
    throw new UploadValidationError(`ไฟล์มีข้อมูลเกิน ${MAX_ROWS.toLocaleString("th-TH")} แถว`);
  }

  const seenHospitalCodes = new Set<string>();
  return dataRows.map((values, index) => {
    const line = index + 2;
    if (values.length !== EXPECTED_HEADERS.length) {
      throw new UploadValidationError(
        `บรรทัด ${line}: ต้องมีข้อมูลครบ ${EXPECTED_HEADERS.length} คอลัมน์`,
      );
    }

    const regionName = values[COLUMN.region_name];
    const provinceName = values[COLUMN.province_name];
    const districtName = values[COLUMN.district_name];
    const hospitalCode = values[COLUMN.hospital_code];
    const hospitalName = values[COLUMN.hospital_name];
    const hospitalType = values[COLUMN.hospital_type];

    if (!regionName || !provinceName || !districtName || !hospitalCode || !hospitalName || !hospitalType) {
      throw new UploadValidationError(`บรรทัด ${line}: ช่องข้อมูลชื่อและรหัสห้ามเว้นว่าง`);
    }
    if (
      regionName.length > 100 || provinceName.length > 100
      || districtName.length > 100 || hospitalType.length > 100
    ) {
      throw new UploadValidationError(`บรรทัด ${line}: ชื่อเขต จังหวัด อำเภอ หรือประเภทโรงพยาบาลยาวเกิน 100 ตัวอักษร`);
    }
    if (hospitalCode.length > 10 || hospitalName.length > 255) {
      throw new UploadValidationError(`บรรทัด ${line}: รหัสหรือชื่อโรงพยาบาลยาวเกินกำหนด`);
    }
    if (seenHospitalCodes.has(hospitalCode)) {
      throw new UploadValidationError(`บรรทัด ${line}: พบ hospital_code ${hospitalCode} ซ้ำในไฟล์`);
    }
    seenHospitalCodes.add(hospitalCode);

    return {
      rank: parseInteger(values[COLUMN.rank], "rank", line),
      region_id: parseInteger(values[COLUMN.region_id], "region_id", line),
      region_name: regionName,
      province_name: provinceName,
      district_name: districtName,
      hospital_code: hospitalCode,
      hospital_name: hospitalName,
      hospital_type: hospitalType,
      masks: parseInteger(values[COLUMN.masks], "masks", line),
      encounters: parseInteger(values[COLUMN.encounters], "encounters", line),
      citizens: parseInteger(values[COLUMN.citizens], "citizens", line),
      masks_per_citizen: parseDecimal(
        values[COLUMN.masks_per_citizen], "masks_per_citizen", line,
        { scale: 2, min: 0, max: 999_999 },
      )!,
      answered: parseInteger(values[COLUMN.answered], "answered", line),
      unanswered: parseInteger(values[COLUMN.unanswered], "unanswered", line),
      answered_pct: parseDecimal(
        values[COLUMN.answered_pct], "answered_pct", line,
        { scale: 1, min: 0, max: 100 },
      )!,
      median_reply_hours: parseDecimal(
        values[COLUMN.median_reply_hours], "median_reply_hours", line,
        { scale: 1, min: 0, max: 999_999_999, allowEmpty: true },
      ),
      p90_reply_hours: parseDecimal(
        values[COLUMN.p90_reply_hours], "p90_reply_hours", line,
        { scale: 1, min: 0, max: 999_999_999, allowEmpty: true },
      ),
      oldest_unanswered_days: parseDecimal(
        values[COLUMN.oldest_unanswered_days], "oldest_unanswered_days", line,
        { scale: 1, min: 0, max: 999_999_999, allowEmpty: true },
      ),
      matched: parseInteger(values[COLUMN.matched], "matched", line),
      unmatched: parseInteger(values[COLUMN.unmatched], "unmatched", line),
      match_rate_pct: parseDecimal(
        values[COLUMN.match_rate_pct], "match_rate_pct", line,
        { scale: 1, min: 0, max: 100 },
      )!,
      masks_prior_90d: parseInteger(values[COLUMN.masks_prior_90d], "masks_prior_90d", line),
      masks_recent_90d: parseInteger(values[COLUMN.masks_recent_90d], "masks_recent_90d", line),
      // อัตราเปลี่ยนแปลงติดลบได้ และเว้นว่างเมื่อฐาน 90 วันก่อนหน้าเป็น 0
      change_90d_pct: parseDecimal(
        values[COLUMN.change_90d_pct], "change_90d_pct", line,
        { scale: 1, min: -100, max: 99_999_999_999, allowEmpty: true },
      ),
      share_pct: parseDecimal(
        values[COLUMN.share_pct], "share_pct", line,
        { scale: 2, min: 0, max: 100 },
      )!,
      first_date_be: parseBuddhistDate(values[COLUMN.first_date_be], "first_date_be", line),
      last_date_be: parseBuddhistDate(values[COLUMN.last_date_be], "last_date_be", line),
    };
  });
}

function getBangkokUploadTimestamp(now = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return {
    date_up: new Date(Date.UTC(parts.year, parts.month - 1, parts.day)),
    time_up: new Date(Date.UTC(1970, 0, 1, parts.hour, parts.minute, parts.second)),
  };
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!(file instanceof File)) {
      return Response.json({ message: "ไม่พบไฟล์สำหรับนำเข้า" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "txt") {
      return Response.json({ message: "รองรับเฉพาะไฟล์ .csv และ .txt" }, { status: 400 });
    }
    if (file.name.length > 255) {
      return Response.json({ message: "ชื่อไฟล์ต้องยาวไม่เกิน 255 ตัวอักษร" }, { status: 400 });
    }
    if (file.size === 0 || file.size > MAX_FILE_SIZE) {
      return Response.json({ message: "ไฟล์ต้องมีขนาดมากกว่า 0 และไม่เกิน 5 MB" }, { status: 400 });
    }

    const rows = validateRows(parseCsv(await file.text()));
    const prisma = getPrisma();
    const uploadTimestamp = getBangkokUploadTimestamp();

    await prisma.$transaction(
      rows.map((row) =>
        prisma.complaintHosCount.upsert({
          where: {
            date_up_time_up_hospital_code: {
              ...uploadTimestamp,
              hospital_code: row.hospital_code,
            },
          },
          create: { ...row, ...uploadTimestamp, file_name: file.name },
          update: { ...row, ...uploadTimestamp, file_name: file.name },
        }),
      ),
    );

    return Response.json({
      message: `นำเข้าข้อมูลสำเร็จ ${rows.length.toLocaleString("th-TH")} แถว`,
      imported: rows.length,
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    console.error("Unable to import hospital summary file", error);
    return Response.json({ message: "เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล" }, { status: 500 });
  }
}

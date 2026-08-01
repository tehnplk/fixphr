import { getPrisma } from "@/lib/prisma";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

const EXPECTED_HEADERS = [
  "province_name",
  "district_name",
  "hospital_code",
  "hospital_name",
  "hospital_type",
  "masks",
  "citizens",
  "matched",
  "unmatched",
  "match_rate_pct",
] as const;

type ImportRow = {
  province_name: string;
  district_name: string;
  hospital_code: string;
  hospital_name: string;
  hospital_type: string;
  masks: number;
  citizens: number;
  matched: number;
  unmatched: number;
  match_rate_pct: string;
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
      throw new UploadValidationError(`บรรทัด ${line}: ต้องมีข้อมูลครบ 10 คอลัมน์`);
    }

    const [provinceName, districtName, hospitalCode, hospitalName, hospitalType] = values;
    if (!provinceName || !districtName || !hospitalCode || !hospitalName || !hospitalType) {
      throw new UploadValidationError(`บรรทัด ${line}: ช่องข้อมูลชื่อและรหัสห้ามเว้นว่าง`);
    }
    if (provinceName.length > 100 || districtName.length > 100 || hospitalType.length > 100) {
      throw new UploadValidationError(`บรรทัด ${line}: ชื่อจังหวัด อำเภอ หรือประเภทโรงพยาบาลยาวเกิน 100 ตัวอักษร`);
    }
    if (hospitalCode.length > 10 || hospitalName.length > 255) {
      throw new UploadValidationError(`บรรทัด ${line}: รหัสหรือชื่อโรงพยาบาลยาวเกินกำหนด`);
    }
    if (seenHospitalCodes.has(hospitalCode)) {
      throw new UploadValidationError(`บรรทัด ${line}: พบ hospital_code ${hospitalCode} ซ้ำในไฟล์`);
    }
    seenHospitalCodes.add(hospitalCode);

    const matchRate = values[9];
    if (!/^\d+(?:\.\d)?$/.test(matchRate)) {
      throw new UploadValidationError(`บรรทัด ${line}: match_rate_pct ต้องเป็นตัวเลขทศนิยมไม่เกิน 1 ตำแหน่ง`);
    }
    const matchRateNumber = Number(matchRate);
    if (matchRateNumber < 0 || matchRateNumber > 100) {
      throw new UploadValidationError(`บรรทัด ${line}: match_rate_pct ต้องอยู่ระหว่าง 0 ถึง 100`);
    }

    return {
      province_name: provinceName,
      district_name: districtName,
      hospital_code: hospitalCode,
      hospital_name: hospitalName,
      hospital_type: hospitalType,
      masks: parseInteger(values[5], "masks", line),
      citizens: parseInteger(values[6], "citizens", line),
      matched: parseInteger(values[7], "matched", line),
      unmatched: parseInteger(values[8], "unmatched", line),
      match_rate_pct: matchRate,
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

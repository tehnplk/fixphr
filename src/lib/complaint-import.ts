import type { ImportSource } from "@/lib/import-log";
import { Prisma } from "@/generated/prisma/client";
import { getPrisma } from "@/lib/prisma";

export const MAX_IMPORT_SIZE = 5 * 1024 * 1024;
const MAX_ROWS = 10_000;

// ตารางรายหน่วยบริการของรายงาน phr-mask-report ใช้ endpoint นี้ (ชุดข้อมูลเดียวกับ
// ปุ่ม "↓ CSV" แต่ตอบเป็น JSON) — limit สูงสุดที่ต้นทางรับคือ 2000
export const PHR_MASK_HOSPITAL_URL =
  "https://phr1.moph.go.th/phr-mask-report/api/hospital-register?region=2&province=65&limit=2000";

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
  "status_pending",
  "status_in_progress",
  "status_completed",
  "status_no_error_found",
  "status_not_recorded",
  "status_unexpected_code",
  "action_none_yet",
  "action_data_corrected",
  "action_other",
  "action_not_recorded",
  "action_unexpected_code",
] as const;

type Header = (typeof EXPECTED_HEADERS)[number];

// ทั้งไฟล์ CSV และ JSON จากต้นทางถูกแปลงเป็นรูปนี้ก่อน แล้วผ่านการตรวจสอบชุดเดียวกัน
type SourceRecord = Record<Header, string>;

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
  status_pending: number;
  status_in_progress: number;
  status_completed: number;
  status_no_error_found: number;
  status_not_recorded: number;
  status_unexpected_code: number;
  action_none_yet: number;
  action_data_corrected: number;
  action_other: number;
  action_not_recorded: number;
  action_unexpected_code: number;
  // JSON ดิบของหน่วยนั้นจากต้นทาง — มีเฉพาะทาง API ส่วนทาง CSV เป็น null เสมอ
  raw_json: Record<string, unknown> | null;
};

export class UploadValidationError extends Error {}

export function parseCsv(text: string) {
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

function parseInteger(value: string, field: string, at: string) {
  if (!/^\d+$/.test(value)) {
    throw new UploadValidationError(`${at}: ${field} ต้องเป็นจำนวนเต็มตั้งแต่ 0 ขึ้นไป`);
  }
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new UploadValidationError(`${at}: ${field} มีค่ามากเกินไป`);
  }
  return parsed;
}

// Decimal ทุกตัวเก็บเป็นสตริงแล้วส่งให้ Prisma แปลงเอง เพื่อไม่ให้ปัดเศษหายระหว่างทาง
function parseDecimal(
  value: string,
  field: string,
  at: string,
  { scale, min, max, allowEmpty = false }: {
    scale: number;
    min: number;
    max: number;
    allowEmpty?: boolean;
  },
) {
  if (value === "") {
    if (allowEmpty) return null;
    throw new UploadValidationError(`${at}: ${field} ห้ามเว้นว่าง`);
  }

  const pattern = new RegExp(`^-?\\d+(?:\\.\\d{1,${scale}})?$`);
  if (!pattern.test(value)) {
    throw new UploadValidationError(
      `${at}: ${field} ต้องเป็นตัวเลขทศนิยมไม่เกิน ${scale} ตำแหน่ง`,
    );
  }

  const parsed = Number(value);
  if (parsed < min || parsed > max) {
    throw new UploadValidationError(`${at}: ${field} ต้องอยู่ระหว่าง ${min} ถึง ${max}`);
  }
  return value;
}

function parseBuddhistDate(value: string, field: string, at: string) {
  if (!/^\d{8}$/.test(value)) {
    throw new UploadValidationError(`${at}: ${field} ต้องอยู่ในรูปแบบ พ.ศ. 8 หลัก (YYYYMMDD)`);
  }
  const month = Number(value.slice(4, 6));
  const day = Number(value.slice(6, 8));
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    throw new UploadValidationError(`${at}: ${field} มีเดือนหรือวันที่ไม่ถูกต้อง`);
  }
  return value;
}

function csvToRecords(text: string): SourceRecord[] {
  const rows = parseCsv(text);
  if (rows.length < 2) throw new UploadValidationError("ไฟล์ต้องมี header และข้อมูลอย่างน้อย 1 แถว");

  const headers = rows[0].map((header, index) =>
    index === 0 ? header.replace(/^\uFEFF/, "") : header,
  );
  if (headers.join(",") !== EXPECTED_HEADERS.join(",")) {
    throw new UploadValidationError("ชื่อหรือลำดับฟิลด์ใน header ไม่ตรงกับรูปแบบที่กำหนด");
  }

  return rows.slice(1).map((values, index) => {
    if (values.length !== EXPECTED_HEADERS.length) {
      throw new UploadValidationError(
        `บรรทัด ${index + 2}: ต้องมีข้อมูลครบ ${EXPECTED_HEADERS.length} คอลัมน์`,
      );
    }
    return Object.fromEntries(
      EXPECTED_HEADERS.map((header, column) => [header, values[column]]),
    ) as SourceRecord;
  });
}

function validateRecords(records: SourceRecord[], describe: (index: number) => string): ImportRow[] {
  if (records.length === 0) throw new UploadValidationError("ไม่พบข้อมูลสำหรับนำเข้า");
  if (records.length > MAX_ROWS) {
    throw new UploadValidationError(`ข้อมูลมีมากกว่า ${MAX_ROWS.toLocaleString("th-TH")} แถว`);
  }

  const seenHospitalCodes = new Set<string>();
  return records.map((record, index) => {
    const at = describe(index);

    const regionName = record.region_name;
    const provinceName = record.province_name;
    const districtName = record.district_name;
    const hospitalCode = record.hospital_code;
    const hospitalName = record.hospital_name;
    const hospitalType = record.hospital_type;

    if (!regionName || !provinceName || !districtName || !hospitalCode || !hospitalName || !hospitalType) {
      throw new UploadValidationError(`${at}: ช่องข้อมูลชื่อและรหัสห้ามเว้นว่าง`);
    }
    if (
      regionName.length > 100 || provinceName.length > 100
      || districtName.length > 100 || hospitalType.length > 100
    ) {
      throw new UploadValidationError(`${at}: ชื่อเขต จังหวัด อำเภอ หรือประเภทโรงพยาบาลยาวเกิน 100 ตัวอักษร`);
    }
    if (hospitalCode.length > 10 || hospitalName.length > 255) {
      throw new UploadValidationError(`${at}: รหัสหรือชื่อโรงพยาบาลยาวเกินกำหนด`);
    }
    if (seenHospitalCodes.has(hospitalCode)) {
      throw new UploadValidationError(`${at}: พบ hospital_code ${hospitalCode} ซ้ำในชุดข้อมูล`);
    }
    seenHospitalCodes.add(hospitalCode);

    return {
      rank: parseInteger(record.rank, "rank", at),
      region_id: parseInteger(record.region_id, "region_id", at),
      region_name: regionName,
      province_name: provinceName,
      district_name: districtName,
      hospital_code: hospitalCode,
      hospital_name: hospitalName,
      hospital_type: hospitalType,
      masks: parseInteger(record.masks, "masks", at),
      encounters: parseInteger(record.encounters, "encounters", at),
      citizens: parseInteger(record.citizens, "citizens", at),
      masks_per_citizen: parseDecimal(
        record.masks_per_citizen, "masks_per_citizen", at,
        { scale: 2, min: 0, max: 999_999 },
      )!,
      answered: parseInteger(record.answered, "answered", at),
      unanswered: parseInteger(record.unanswered, "unanswered", at),
      answered_pct: parseDecimal(
        record.answered_pct, "answered_pct", at,
        { scale: 1, min: 0, max: 100 },
      )!,
      median_reply_hours: parseDecimal(
        record.median_reply_hours, "median_reply_hours", at,
        { scale: 1, min: 0, max: 999_999_999, allowEmpty: true },
      ),
      p90_reply_hours: parseDecimal(
        record.p90_reply_hours, "p90_reply_hours", at,
        { scale: 1, min: 0, max: 999_999_999, allowEmpty: true },
      ),
      oldest_unanswered_days: parseDecimal(
        record.oldest_unanswered_days, "oldest_unanswered_days", at,
        { scale: 1, min: 0, max: 999_999_999, allowEmpty: true },
      ),
      matched: parseInteger(record.matched, "matched", at),
      unmatched: parseInteger(record.unmatched, "unmatched", at),
      match_rate_pct: parseDecimal(
        record.match_rate_pct, "match_rate_pct", at,
        { scale: 1, min: 0, max: 100 },
      )!,
      masks_prior_90d: parseInteger(record.masks_prior_90d, "masks_prior_90d", at),
      masks_recent_90d: parseInteger(record.masks_recent_90d, "masks_recent_90d", at),
      // อัตราเปลี่ยนแปลงติดลบได้ และเว้นว่างเมื่อฐาน 90 วันก่อนหน้าเป็น 0
      change_90d_pct: parseDecimal(
        record.change_90d_pct, "change_90d_pct", at,
        { scale: 1, min: -100, max: 99_999_999_999, allowEmpty: true },
      ),
      share_pct: parseDecimal(
        record.share_pct, "share_pct", at,
        { scale: 2, min: 0, max: 100 },
      )!,
      first_date_be: parseBuddhistDate(record.first_date_be, "first_date_be", at),
      last_date_be: parseBuddhistDate(record.last_date_be, "last_date_be", at),
      status_pending: parseInteger(record.status_pending, "status_pending", at),
      status_in_progress: parseInteger(record.status_in_progress, "status_in_progress", at),
      status_completed: parseInteger(record.status_completed, "status_completed", at),
      status_no_error_found: parseInteger(record.status_no_error_found, "status_no_error_found", at),
      status_not_recorded: parseInteger(record.status_not_recorded, "status_not_recorded", at),
      status_unexpected_code: parseInteger(record.status_unexpected_code, "status_unexpected_code", at),
      action_none_yet: parseInteger(record.action_none_yet, "action_none_yet", at),
      action_data_corrected: parseInteger(record.action_data_corrected, "action_data_corrected", at),
      action_other: parseInteger(record.action_other, "action_other", at),
      action_not_recorded: parseInteger(record.action_not_recorded, "action_not_recorded", at),
      action_unexpected_code: parseInteger(record.action_unexpected_code, "action_unexpected_code", at),
      // ผู้เรียกที่มี JSON ดิบ (ทาง API) เติมให้ทีหลัง — ตัวตรวจสอบเห็นแต่ค่าที่แปลงเป็น
      // สตริงแล้ว จึงไม่มีทางรู้จัก object ต้นทาง
      raw_json: null,
    };
  });
}

function textOf(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

// ต้นทางส่งตัวเลขเป็น number จึงไม่มีศูนย์ท้าย (12 คือ 12.0) — เติมให้ครบตาม scale
// ของคอลัมน์ปลายทางก่อน แล้วปล่อยให้ validator ตรวจช่วงค่าเหมือนข้อมูลจาก CSV
function decimalOf(value: unknown, scale: number) {
  if (value === null || value === undefined || value === "") return "";
  if (typeof value !== "number" || !Number.isFinite(value)) return textOf(value);
  return value.toFixed(scale);
}

type HospitalRegisterItem = Record<string, unknown>;

// ชื่อฟิลด์ใน JSON ต่างจาก header ของ CSV ทั้งหมด จึงแม็พกลับมาเป็น schema เดียวกับ CSV
// (= ชื่อคอลัมน์ในตาราง ComplaintHosCount) ก่อนตรวจสอบและบันทึก
function hospitalRegisterToRecords(hospitals: HospitalRegisterItem[]): SourceRecord[] {
  return hospitals.map((item) => ({
    rank: textOf(item.rank),
    region_id: textOf(item.rid),
    region_name: textOf(item.rname),
    province_name: textOf(item.pname),
    district_name: textOf(item.dname),
    hospital_code: textOf(item.org),
    hospital_name: textOf(item.hname),
    hospital_type: textOf(item.htname),
    masks: textOf(item.masks),
    encounters: textOf(item.encounters),
    citizens: textOf(item.citizens),
    masks_per_citizen: decimalOf(item.per_citizen, 2),
    answered: textOf(item.answered),
    unanswered: textOf(item.unanswered),
    answered_pct: decimalOf(item.answered_pct, 1),
    median_reply_hours: decimalOf(item.median_hours, 1),
    p90_reply_hours: decimalOf(item.p90_hours, 1),
    oldest_unanswered_days: decimalOf(item.oldest_wait_days, 1),
    matched: textOf(item.matched),
    unmatched: textOf(item.unmatched),
    match_rate_pct: decimalOf(item.match_rate, 1),
    masks_prior_90d: textOf(item.prior),
    masks_recent_90d: textOf(item.recent),
    change_90d_pct: decimalOf(item.delta_pct, 1),
    share_pct: decimalOf(item.share, 2),
    first_date_be: textOf(item.first_be),
    last_date_be: textOf(item.last_be),
    status_pending: textOf(item.st_pending),
    status_in_progress: textOf(item.st_progress),
    status_completed: textOf(item.st_done),
    status_no_error_found: textOf(item.st_no_error),
    status_not_recorded: textOf(item.st_unrecorded),
    status_unexpected_code: textOf(item.st_unexpected),
    action_none_yet: textOf(item.ac_pending),
    action_data_corrected: textOf(item.ac_corrected),
    action_other: textOf(item.ac_other),
    action_not_recorded: textOf(item.ac_unrecorded),
    action_unexpected_code: textOf(item.ac_unexpected),
  }));
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

async function saveRows(rows: ImportRow[], fileName: string, source: ImportSource) {
  const prisma = getPrisma();
  const uploadTimestamp = getBangkokUploadTimestamp();

  await prisma.$transaction(
    rows.map(({ raw_json, ...row }) => {
      // คอลัมน์ Json ที่เป็น nullable ต้องส่ง Prisma.DbNull ไม่ใช่ null ธรรมดา
      const data = {
        ...row,
        ...uploadTimestamp,
        file_name: fileName,
        import_source: source,
        raw_json: (raw_json ?? Prisma.DbNull) as Prisma.InputJsonValue,
      };

      return prisma.complaintHosCount.upsert({
        where: {
          date_up_time_up_hospital_code: {
            ...uploadTimestamp,
            hospital_code: row.hospital_code,
          },
        },
        create: data,
        update: data,
      });
    }),
  );

  return rows.length;
}

// ใช้กับไฟล์ที่ผู้ใช้อัปโหลดเอง (/api/upload)
export function parseComplaintCsv(text: string) {
  return validateRecords(csvToRecords(text), (index) => `บรรทัด ${index + 2}`);
}

export async function importComplaintCsv(text: string, fileName: string) {
  return saveRows(parseComplaintCsv(text), fileName, "csv");
}

// ใช้กับข้อมูลที่ดึงจาก API ต้นทาง (/api/import-api)
export function parseHospitalRegister(payload: unknown) {
  if (typeof payload !== "object" || payload === null) {
    throw new UploadValidationError("ข้อมูลจาก API ไม่ใช่ JSON object");
  }

  const { hospitals, totals } = payload as {
    hospitals?: unknown;
    totals?: { truncated?: unknown } | null;
  };
  if (!Array.isArray(hospitals)) {
    throw new UploadValidationError("ข้อมูลจาก API ไม่มีรายการ hospitals");
  }
  // ต้นทางจำกัด limit สูงสุด 2000 — ถ้าโดนตัดแปลว่าได้ข้อมูลไม่ครบจังหวัด
  if (totals?.truncated === true) {
    throw new UploadValidationError("API ต้นทางตัดข้อมูลบางส่วน (truncated) จึงไม่นำเข้า");
  }

  const items = hospitals as HospitalRegisterItem[];
  const rows = validateRecords(
    hospitalRegisterToRecords(items),
    (index) => `รายการที่ ${index + 1}`,
  );

  // เก็บ JSON ต้นทางไว้ทั้งก้อนคู่กับแถวที่แปลงแล้ว ฟิลด์ที่ยังไม่มีคอลัมน์รองรับ
  // (dx, spark, last_filed_at ฯลฯ) จึงไม่หายไปกับการแปลง และ validateRecords คืนแถว
  // ตามลำดับเดิมเสมอ index จึงตรงกับ items
  rows.forEach((row, index) => {
    row.raw_json = items[index];
  });

  return rows;
}

export async function importHospitalRegister(
  payload: unknown,
  fileName: string,
  source: ImportSource,
) {
  return saveRows(parseHospitalRegister(payload), fileName, source);
}

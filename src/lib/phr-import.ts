import { recordImport, type ImportSource } from "@/lib/import-log";
import {
  importHospitalRegister,
  MAX_IMPORT_SIZE,
  PHR_MASK_HOSPITAL_URL,
  UploadValidationError,
} from "@/lib/complaint-import";

const FETCH_TIMEOUT_MS = 60_000;

export type ImportResult =
  | { ok: true; message: string; imported: number; fileName: string; datasetVersion: string | null }
  | { ok: false; message: string; status: number };

// ตั้งชื่อไฟล์จากเวลาที่ต้นทางสร้างชุดข้อมูล + dataset_version เพื่อให้ย้อนดูได้ว่า
// รอบนำเข้านี้มาจากข้อมูลชุดไหน (ต้นทางไม่ได้ส่งชื่อไฟล์มาเหมือนทาง CSV)
function buildFileName(payload: { generated_at?: unknown; dataset_version?: unknown }) {
  const generatedAt = typeof payload.generated_at === "string" ? payload.generated_at : "";
  const digits = (generatedAt || new Date().toISOString()).replace(/\D/g, "").slice(0, 14);
  // คงรูปแบบ YYYYMMDD_HHMMSS ให้เหมือนชื่อไฟล์ที่ต้นทางตั้งให้ฝั่ง CSV
  const stamp = `${digits.slice(0, 8)}_${digits.slice(8, 14)}`;
  const version = typeof payload.dataset_version === "string" ? payload.dataset_version : "";

  const name = version
    ? `phr_masks_hospital_${stamp}_${version}.json`
    : `phr_masks_hospital_${stamp}.json`;
  return name.slice(0, 255);
}

// ใช้ร่วมกันระหว่างปุ่มบนหน้า /import-api (ผ่าน /api/import-api) กับงานตามเวลาใน
// instrumentation.ts เพื่อให้ทั้งสองทางนำเข้าด้วยกฎการตรวจสอบชุดเดียวกัน
export async function importFromPhrApi(source: ImportSource = "api"): Promise<ImportResult> {
  const fail = async (message: string, status: number, fileName = ""): Promise<ImportResult> => {
    await recordImport({ source, status: "error", message, fileName });
    return { ok: false, message, status };
  };

  let response: Response;
  try {
    response = await fetch(PHR_MASK_HOSPITAL_URL, {
      cache: "no-store",
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
  } catch (error) {
    console.error("Unable to reach phr-mask-report hospital-register API", error);
    return fail("เชื่อมต่อ API ต้นทางไม่สำเร็จ กรุณาลองใหม่อีกครั้ง", 502);
  }

  if (!response.ok) {
    return fail(`API ต้นทางตอบกลับสถานะ ${response.status}`, 502);
  }

  const text = await response.text();
  if (text.length === 0) {
    return fail("API ต้นทางส่งข้อมูลว่าง", 502);
  }
  if (text.length > MAX_IMPORT_SIZE) {
    return fail("ข้อมูลจากต้นทางมีขนาดเกิน 5 MB", 502);
  }

  let payload: { generated_at?: unknown; dataset_version?: unknown };
  try {
    payload = JSON.parse(text);
  } catch {
    return fail("API ต้นทางไม่ได้ส่งข้อมูลเป็น JSON", 502);
  }

  const fileName = buildFileName(payload);
  try {
    const imported = await importHospitalRegister(payload, fileName, source);
    await recordImport({
      source,
      status: "success",
      rowCount: imported,
      hospitalCount: imported,
      fileName,
      message: `dataset ${typeof payload.dataset_version === "string" ? payload.dataset_version : "-"}`,
    });
    return {
      ok: true,
      message: `นำเข้าข้อมูลจาก API สำเร็จ ${imported.toLocaleString("th-TH")} แถว`,
      imported,
      fileName,
      datasetVersion: typeof payload.dataset_version === "string" ? payload.dataset_version : null,
    };
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return fail(error.message, 400, fileName);
    }
    throw error;
  }
}

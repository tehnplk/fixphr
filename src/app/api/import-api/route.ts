import { auth } from "@/auth";
import {
  importHospitalRegister,
  MAX_IMPORT_SIZE,
  PHR_MASK_HOSPITAL_URL,
  UploadValidationError,
} from "@/lib/complaint-import";

export const dynamic = "force-dynamic";

const FETCH_TIMEOUT_MS = 60_000;

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

export async function POST() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "super" && role !== "admin") {
      return Response.json({ message: "ไม่มีสิทธิ์นำเข้าข้อมูล" }, { status: 403 });
    }

    let response: Response;
    try {
      response = await fetch(PHR_MASK_HOSPITAL_URL, {
        cache: "no-store",
        headers: { accept: "application/json" },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("Unable to reach phr-mask-report hospital-register API", error);
      return Response.json(
        { message: "เชื่อมต่อ API ต้นทางไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
        { status: 502 },
      );
    }

    if (!response.ok) {
      return Response.json(
        { message: `API ต้นทางตอบกลับสถานะ ${response.status}` },
        { status: 502 },
      );
    }

    const text = await response.text();
    if (text.length === 0) {
      return Response.json({ message: "API ต้นทางส่งข้อมูลว่าง" }, { status: 502 });
    }
    if (text.length > MAX_IMPORT_SIZE) {
      return Response.json({ message: "ข้อมูลจากต้นทางมีขนาดเกิน 5 MB" }, { status: 502 });
    }

    let payload: { generated_at?: unknown; dataset_version?: unknown };
    try {
      payload = JSON.parse(text);
    } catch {
      return Response.json({ message: "API ต้นทางไม่ได้ส่งข้อมูลเป็น JSON" }, { status: 502 });
    }

    const fileName = buildFileName(payload);
    const imported = await importHospitalRegister(payload, fileName);

    return Response.json({
      message: `นำเข้าข้อมูลจาก API สำเร็จ ${imported.toLocaleString("th-TH")} แถว`,
      imported,
      fileName,
      datasetVersion: payload.dataset_version ?? null,
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    console.error("Unable to import hospital summary from API", error);
    return Response.json({ message: "เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล" }, { status: 500 });
  }
}

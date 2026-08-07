import {
  importComplaintCsv,
  MAX_IMPORT_SIZE,
  UploadValidationError,
} from "@/lib/complaint-import";
import { recordImport } from "@/lib/import-log";

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
    if (file.size === 0 || file.size > MAX_IMPORT_SIZE) {
      return Response.json({ message: "ไฟล์ต้องมีขนาดมากกว่า 0 และไม่เกิน 5 MB" }, { status: 400 });
    }

    let imported: number;
    try {
      imported = await importComplaintCsv(await file.text(), file.name);
    } catch (error) {
      if (error instanceof UploadValidationError) {
        await recordImport({
          source: "csv",
          status: "error",
          fileName: file.name,
          message: error.message,
        });
      }
      throw error;
    }

    await recordImport({
      source: "csv",
      status: "success",
      rowCount: imported,
      hospitalCount: imported,
      fileName: file.name,
    });

    return Response.json({
      message: `นำเข้าข้อมูลสำเร็จ ${imported.toLocaleString("th-TH")} แถว`,
      imported,
    });
  } catch (error) {
    if (error instanceof UploadValidationError) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    console.error("Unable to import hospital summary file", error);
    return Response.json({ message: "เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล" }, { status: 500 });
  }
}

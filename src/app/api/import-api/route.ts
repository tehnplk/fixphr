import { auth } from "@/auth";
import { importFromPhrApi } from "@/lib/phr-import";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "super" && role !== "admin") {
      return Response.json({ message: "ไม่มีสิทธิ์นำเข้าข้อมูล" }, { status: 403 });
    }

    const result = await importFromPhrApi();
    if (!result.ok) {
      return Response.json({ message: result.message }, { status: result.status });
    }

    return Response.json({
      message: result.message,
      imported: result.imported,
      fileName: result.fileName,
      datasetVersion: result.datasetVersion,
    });
  } catch (error) {
    console.error("Unable to import hospital summary from API", error);
    return Response.json({ message: "เกิดข้อผิดพลาดระหว่างบันทึกข้อมูล" }, { status: 500 });
  }
}

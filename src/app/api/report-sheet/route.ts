import { auth } from "@/auth";
import { sendReportToSheet } from "@/lib/report-sheet";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "super" && role !== "admin") {
      return Response.json({ message: "ไม่มีสิทธิ์ส่งรายงาน" }, { status: 403 });
    }

    const sentBy = session?.user?.fullname || session?.user?.name || null;
    const result = await sendReportToSheet(sentBy);

    if (!result.ok) {
      return Response.json({ message: result.message }, { status: result.status });
    }

    return Response.json({
      message: result.message,
      sent: result.sent,
      insertedCount: result.insertedCount,
      startRow: result.startRow,
      sheetMessage: result.sheetMessage,
    });
  } catch (error) {
    console.error("Unable to send report to region sheet", error);
    return Response.json({ message: "เกิดข้อผิดพลาดระหว่างส่งรายงาน" }, { status: 500 });
  }
}

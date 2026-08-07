import { auth } from "@/auth";
import { buildReportRows } from "@/lib/report-rows";

export const dynamic = "force-dynamic";

// Apps Script ใช้เวลาต่อแถวพอสมควรเมื่อเขียนลงชีต จึงเผื่อเวลาไว้มากกว่าการดึงข้อมูลทั่วไป
const FETCH_TIMEOUT_MS = 120_000;

type SheetResponse = {
  status?: string;
  message?: string;
  start_row?: number;
  inserted_count?: number;
};

export async function POST() {
  try {
    const session = await auth();
    const role = session?.user?.role;
    if (role !== "super" && role !== "admin") {
      return Response.json({ message: "ไม่มีสิทธิ์ส่งรายงาน" }, { status: 403 });
    }

    const webhookUrl = process.env.REGION_SHEET_WEBHOOK_URL;
    if (!webhookUrl) {
      return Response.json(
        { message: "ยังไม่ได้ตั้งค่า REGION_SHEET_WEBHOOK_URL" },
        { status: 500 },
      );
    }

    const rows = await buildReportRows();
    if (rows.length === 0) {
      return Response.json({ message: "ยังไม่มีข้อมูลรายงานสำหรับส่ง" }, { status: 400 });
    }

    let response: Response;
    try {
      // Apps Script ตอบ 302 ไปยัง script.googleusercontent.com เสมอ — fetch จะตามต่อ
      // ด้วย GET ให้เอง แล้วได้ JSON ของสคริปต์กลับมา
      response = await fetch(webhookUrl, {
        method: "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rows),
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      });
    } catch (error) {
      console.error("Unable to reach region sheet web app", error);
      return Response.json(
        { message: "เชื่อมต่อ Google Sheet ของเขตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง" },
        { status: 502 },
      );
    }

    const text = await response.text();
    if (!response.ok) {
      console.error("Region sheet web app responded with an error", response.status, text.slice(0, 500));
      return Response.json(
        { message: `Google Sheet ตอบกลับสถานะ ${response.status}` },
        { status: 502 },
      );
    }

    let result: SheetResponse;
    try {
      result = JSON.parse(text);
    } catch {
      // สคริปต์ที่ยังไม่ deploy หรือไม่ได้เปิดสิทธิ์จะคืนหน้า HTML ของ Google แทน JSON
      console.error("Region sheet web app did not return JSON", text.slice(0, 500));
      return Response.json(
        { message: "Google Sheet ไม่ได้ตอบกลับเป็น JSON ตรวจสอบการ deploy ของ Apps Script" },
        { status: 502 },
      );
    }

    if (result.status !== "success") {
      return Response.json(
        { message: result.message || "Google Sheet ปฏิเสธข้อมูลที่ส่งไป" },
        { status: 502 },
      );
    }

    const insertedCount = result.inserted_count ?? rows.length;
    return Response.json({
      message: `ส่งรายงานขึ้น Sheet เขตสำเร็จ ${insertedCount.toLocaleString("th-TH")} แถว`,
      sent: rows.length,
      insertedCount,
      startRow: result.start_row ?? null,
      sheetMessage: result.message ?? null,
    });
  } catch (error) {
    console.error("Unable to send report to region sheet", error);
    return Response.json({ message: "เกิดข้อผิดพลาดระหว่างส่งรายงาน" }, { status: 500 });
  }
}

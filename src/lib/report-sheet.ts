import { getPrisma } from "@/lib/prisma";
import { buildReportRows } from "@/lib/report-rows";

// Apps Script ใช้เวลาต่อแถวพอสมควรเมื่อเขียนลงชีต จึงเผื่อเวลาไว้มากกว่าการดึงข้อมูลทั่วไป
const FETCH_TIMEOUT_MS = 120_000;

// api_response เก็บข้อความดิบจากปลายทาง — ตัดไว้กันกรณี Apps Script ตอบเป็นหน้า HTML ยาว ๆ
const MAX_RESPONSE_LENGTH = 2_000;

type SheetResponse = {
  status?: string;
  message?: string;
  start_row?: number;
  inserted_count?: number;
};

export type SendResult =
  | {
      ok: true;
      message: string;
      sent: number;
      insertedCount: number;
      startRow: number | null;
      sheetMessage: string | null;
    }
  | { ok: false; message: string; status: number };

// บันทึกทุกครั้งที่ส่ง ทั้งสำเร็จและไม่สำเร็จ เพื่อให้หน้า /report-sheet ไล่ดูย้อนหลังได้
// ตัวบันทึกล้มเหลวต้องไม่ทำให้การส่งที่สำเร็จไปแล้วกลายเป็น error
async function writeLog(entry: {
  rowCount: number;
  status: "success" | "error";
  apiResponse: string;
  sentBy: string | null;
}) {
  try {
    await getPrisma().reportSheetLog.create({
      data: {
        row_count: entry.rowCount,
        status: entry.status,
        api_response: entry.apiResponse.slice(0, MAX_RESPONSE_LENGTH),
        sent_by: entry.sentBy,
      },
    });
  } catch (error) {
    console.error("Unable to write report sheet log", error);
  }
}

// ใช้ร่วมกันระหว่างปุ่มบนหน้า /report-sheet (ผ่าน /api/report-sheet) กับงานตามเวลาใน
// instrumentation.ts — ทั้งสองทางจึงส่งข้อมูลชุดเดียวกันและถูกบันทึก log เหมือนกัน
export async function sendReportToSheet(sentBy: string | null): Promise<SendResult> {
  const webhookUrl = process.env.REGION_SHEET_WEBHOOK_URL;
  if (!webhookUrl) {
    return { ok: false, message: "ยังไม่ได้ตั้งค่า REGION_SHEET_WEBHOOK_URL", status: 500 };
  }

  const rows = await buildReportRows();
  if (rows.length === 0) {
    return { ok: false, message: "ยังไม่มีข้อมูลรายงานสำหรับส่ง", status: 400 };
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
    const message = "เชื่อมต่อ Google Sheet ของเขตไม่สำเร็จ กรุณาลองใหม่อีกครั้ง";
    await writeLog({ rowCount: rows.length, status: "error", apiResponse: message, sentBy });
    return { ok: false, message, status: 502 };
  }

  const text = await response.text();
  if (!response.ok) {
    console.error("Region sheet web app responded with an error", response.status, text.slice(0, 500));
    const message = `Google Sheet ตอบกลับสถานะ ${response.status}`;
    await writeLog({
      rowCount: rows.length,
      status: "error",
      apiResponse: `${message}: ${text}`,
      sentBy,
    });
    return { ok: false, message, status: 502 };
  }

  let result: SheetResponse;
  try {
    result = JSON.parse(text);
  } catch {
    // สคริปต์ที่ยังไม่ deploy หรือไม่ได้เปิดสิทธิ์จะคืนหน้า HTML ของ Google แทน JSON
    console.error("Region sheet web app did not return JSON", text.slice(0, 500));
    await writeLog({ rowCount: rows.length, status: "error", apiResponse: text, sentBy });
    return {
      ok: false,
      message: "Google Sheet ไม่ได้ตอบกลับเป็น JSON ตรวจสอบการ deploy ของ Apps Script",
      status: 502,
    };
  }

  if (result.status !== "success") {
    const message = result.message || "Google Sheet ปฏิเสธข้อมูลที่ส่งไป";
    await writeLog({ rowCount: rows.length, status: "error", apiResponse: text, sentBy });
    return { ok: false, message, status: 502 };
  }

  await writeLog({ rowCount: rows.length, status: "success", apiResponse: text, sentBy });

  const insertedCount = result.inserted_count ?? rows.length;
  return {
    ok: true,
    message: `ส่งรายงานขึ้น Sheet เขตสำเร็จ ${insertedCount.toLocaleString("th-TH")} แถว`,
    sent: rows.length,
    insertedCount,
    startRow: result.start_row ?? null,
    sheetMessage: result.message ?? null,
  };
}

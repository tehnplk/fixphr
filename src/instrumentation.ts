// Next.js เรียกไฟล์นี้ครั้งเดียวตอนเซิร์ฟเวอร์เริ่มทำงาน จึงใช้เป็นจุดตั้งงานตามเวลา
export async function register() {
  // edge runtime ไม่มี timer แบบที่ node-cron ใช้ และไม่ต้องรัน prisma อยู่แล้ว
  if (process.env.NEXT_RUNTIME !== "nodejs") return;

  const { startScheduler } = await import("@/lib/scheduler");
  startScheduler();
}

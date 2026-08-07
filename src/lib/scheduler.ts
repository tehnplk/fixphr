import cron from "node-cron";
import { importFromPhrApi } from "@/lib/phr-import";
import { CRON_ACTOR, sendReportToSheet } from "@/lib/report-sheet";

// คอนเทนเนอร์รันด้วยเวลา UTC จึงต้องระบุโซนเวลาให้ชัด ไม่งั้นจะเพี้ยนไป 7 ชั่วโมง
const TIME_ZONE = "Asia/Bangkok";

type Job = {
  name: string;
  expression: string;
  run: () => Promise<{ ok: boolean; message: string }>;
};

const JOBS: Job[] = [
  {
    name: "import-api เช้า",
    expression: "0 7 * * *",
    run: () => importFromPhrApi("api-cron"),
  },
  {
    name: "import-api บ่าย",
    expression: "0 13 * * *",
    run: () => importFromPhrApi("api-cron"),
  },
  {
    name: "report-sheet เที่ยง",
    expression: "0 11 * * *",
    run: () => sendReportToSheet(CRON_ACTOR),
  },
  {
    name: "report-sheet เย็น",
    expression: "30 16 * * *",
    run: () => sendReportToSheet(CRON_ACTOR),
  },
];

// hot reload ของ dev server เรียก instrumentation ซ้ำได้ ถ้าไม่กันไว้จะลงตารางซ้อนกัน
const globalForScheduler = globalThis as unknown as { schedulerStarted?: boolean };

function isEnabled() {
  const flag = process.env.CRON_ENABLED?.trim().toLowerCase();
  if (flag === "1" || flag === "true") return true;
  if (flag === "0" || flag === "false") return false;
  // ค่าเริ่มต้น: ทำงานเฉพาะ production — เครื่อง dev จะได้ไม่ยิงของจริงขึ้น Sheet เขต
  return process.env.NODE_ENV === "production";
}

async function runJob(job: Job) {
  const startedAt = Date.now();
  try {
    const result = await job.run();
    const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
    if (result.ok) {
      console.log(`[cron] ${job.name} สำเร็จใน ${seconds}s — ${result.message}`);
    } else {
      console.error(`[cron] ${job.name} ไม่สำเร็จใน ${seconds}s — ${result.message}`);
    }
  } catch (error) {
    // งานตามเวลาต้องไม่ทำให้เซิร์ฟเวอร์ล้ม ไม่ว่าจะพังด้วยเหตุใด
    console.error(`[cron] ${job.name} เกิดข้อผิดพลาด`, error);
  }
}

export function startScheduler() {
  if (globalForScheduler.schedulerStarted) return;

  if (!isEnabled()) {
    console.log("[cron] ปิดการทำงานตามเวลาไว้ (ตั้ง CRON_ENABLED=1 เพื่อเปิดบนเครื่อง dev)");
    return;
  }

  globalForScheduler.schedulerStarted = true;

  for (const job of JOBS) {
    cron.schedule(job.expression, () => void runJob(job), { timezone: TIME_ZONE });
    console.log(`[cron] ตั้งเวลา ${job.name} ที่ "${job.expression}" (${TIME_ZONE})`);
  }
}

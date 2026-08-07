import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { buildReportRows, REPORT_ROW_LENGTH } from "@/lib/report-rows";
import SendSheetForm from "./SendSheetForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const LOG_LIMIT = 100;

function formatSentAt(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

export default async function ReportSheetPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "super" && role !== "admin") {
    redirect("/login?error=forbidden&callbackUrl=%2Freport-sheet");
  }

  const prisma = getPrisma();
  const rows = await buildReportRows();
  const hospitalCount = new Set(rows.map((row) => row[4])).size;

  // "รอบที่" นับจากรอบแรกสุดเป็น 1 — ใช้จำนวนทั้งหมดลบตำแหน่งในรายการที่เรียงใหม่ไปเก่า
  const [logs, totalLogs] = await Promise.all([
    prisma.reportSheetLog.findMany({
      orderBy: { sent_at: "desc" },
      take: LOG_LIMIT,
    }),
    prisma.reportSheetLog.count(),
  ]);

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.panel}>
          <SendSheetForm
            rowCount={rows.length}
            hospitalCount={hospitalCount}
            columnCount={REPORT_ROW_LENGTH}
          />

          <h2 className={styles.previewTitle}>
            ประวัติการส่ง
            <small>
              {totalLogs > LOG_LIMIT
                ? `${LOG_LIMIT} รอบล่าสุด จากทั้งหมด ${totalLogs.toLocaleString("th-TH")} รอบ`
                : `ทั้งหมด ${totalLogs.toLocaleString("th-TH")} รอบ`}
            </small>
          </h2>

          {logs.length > 0 ? (
            <div className={styles.previewScroll}>
              <table className={styles.preview}>
                <thead>
                  <tr>
                    <th>รอบที่</th>
                    <th>วัน-เวลา</th>
                    <th>จำนวน rows</th>
                    <th>api response</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => (
                    <tr key={log.id}>
                      <td className={styles.mark}>{totalLogs - index}</td>
                      <td>{formatSentAt(log.sent_at)}</td>
                      <td className={styles.mark}>{log.row_count.toLocaleString("th-TH")}</td>
                      <td className={styles.response}>
                        <span
                          className={log.status === "success" ? styles.badgeOk : styles.badgeFail}
                        >
                          {log.status}
                        </span>
                        <code>{log.api_response}</code>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>ยังไม่มีประวัติการส่ง</p>
          )}
        </div>
      </section>
    </main>
  );
}

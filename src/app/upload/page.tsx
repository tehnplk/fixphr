import { Clock3, Database } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import UploadForm from "./UploadForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatTime(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZone: "UTC",
  }).format(value);
}

export default async function UploadPage() {
  const uploadHistory = await getPrisma().complaintHosCount.groupBy({
    by: ["date_up", "time_up"],
    _count: { hospital_code: true },
    orderBy: [{ date_up: "desc" }, { time_up: "desc" }],
    take: 20,
  });

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Database aria-hidden="true" />
            DATA INTAKE · PHITSANULOK
          </div>
        </header>

        <div className={styles.content}>
          <UploadForm />

          <aside className={styles.guide} aria-labelledby="file-structure-title">
            <div className={styles.guideTitle}>
              <Clock3 aria-hidden="true" />
              <div>
                <span>UPLOAD HISTORY</span>
                <h2 id="file-structure-title">วัน–เวลาอัปโหลด</h2>
              </div>
            </div>

            <div className={styles.sortLabel}>
              <span>ล่าสุด</span><i aria-hidden="true" /> <span>เก่าสุด</span>
            </div>

            {uploadHistory.length > 0 ? (
              <ol className={styles.history}>
                {uploadHistory.map((batch, index) => (
                  <li key={`${batch.date_up.toISOString()}-${batch.time_up.toISOString()}`}>
                    <span className={styles.historyIndex}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <strong>{formatDate(batch.date_up)}</strong>
                      <time>{formatTime(batch.time_up)} น.</time>
                    </div>
                    <small>{batch._count.hospital_code.toLocaleString("th-TH")} แห่ง</small>
                  </li>
                ))}
              </ol>
            ) : (
              <p className={styles.emptyHistory}>ยังไม่มีประวัติการอัปโหลด</p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}

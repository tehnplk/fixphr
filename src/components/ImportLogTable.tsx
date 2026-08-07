import { getImportLog, importSourceLabel } from "@/lib/import-log";
import styles from "./ImportLogTable.module.css";

const LOG_LIMIT = 100;

function formatImportedAt(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    dateStyle: "medium",
    timeStyle: "medium",
    timeZone: "Asia/Bangkok",
  }).format(value);
}

// ใช้ร่วมกันทั้งหน้า "นำเข้า CSV" และ "นำเข้า API" — ทุกวิธีนำเข้าเขียน log ลงตารางเดียวกัน
export default async function ImportLogTable() {
  const { rows, total } = await getImportLog(LOG_LIMIT);

  return (
    <>
      <h2 className={styles.title}>
        ประวัติการนำเข้า
        <small>
          {total > LOG_LIMIT
            ? `${LOG_LIMIT} รอบล่าสุด จากทั้งหมด ${total.toLocaleString("th-TH")} รอบ`
            : `ทั้งหมด ${total.toLocaleString("th-TH")} รอบ`}
        </small>
      </h2>

      {rows.length > 0 ? (
        <div className={styles.scroll}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>วันเวลานำเข้า</th>
                <th>วิธีนำเข้า</th>
                <th>สถานะ</th>
                <th>จำนวนหน่วยบริการ</th>
                <th>ไฟล์ / ข้อความ</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.id}>
                  <td className={styles.num}>{total - index}</td>
                  <td>{formatImportedAt(row.imported_at)}</td>
                  <td>
                    <span className={`${styles.tag} ${styles[`src_${row.source.replace("-", "_")}`] ?? ""}`}>
                      {importSourceLabel(row.source)}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`${styles.tag} ${row.status === "success" ? styles.ok : styles.fail}`}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className={styles.num}>{row.hospital_count.toLocaleString("th-TH")}</td>
                  <td className={styles.detail}>
                    {row.file_name}
                    {row.file_name && row.message ? " · " : ""}
                    {row.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.empty}>ยังไม่มีประวัติการนำเข้า</p>
      )}
    </>
  );
}

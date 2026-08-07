import { redirect } from "next/navigation";
import { Sheet } from "lucide-react";
import { auth } from "@/auth";
import { buildReportRows, REPORT_ROW_LENGTH } from "@/lib/report-rows";
import SendSheetForm from "./SendSheetForm";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const PREVIEW_HEADERS = [
  "วัน/เดือน/ปี คำร้อง", "ลำดับ", "จังหวัด", "อำเภอ", "หน่วยงาน", "สป.", "อปท.",
  "ประเด็นที่แจ้ง", "การดำเนินการ",
  "1", "2", "3.1", "3.2", "4", "5", "6", "7", "(โปรดระบุ)",
];

// คอลัมน์ที่เป็นช่องกาเครื่องหมาย จัดกึ่งกลางให้อ่านง่ายเหมือนในแบบฟอร์ม
const MARK_COLUMNS = new Set([1, 5, 6, 9, 10, 11, 12, 13, 14, 15, 16]);

// ไม่โชว์ deployment id เต็ม ๆ บนหน้าเว็บ เพราะใครที่มี URL ก็เขียนลงชีตได้
function maskEndpoint(url: string | undefined) {
  if (!url) return "ยังไม่ได้ตั้งค่า REGION_SHEET_WEBHOOK_URL";
  const match = url.match(/^(https:\/\/script\.google\.com\/macros\/s\/)([^/]+)(\/exec)$/);
  if (!match) return url;
  const id = match[2];
  return `${match[1]}${id.slice(0, 8)}…${id.slice(-6)}${match[3]}`;
}

export default async function ReportSheetPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "super" && role !== "admin") {
    redirect("/login?error=forbidden&callbackUrl=%2Freport-sheet");
  }

  const rows = await buildReportRows();
  const hospitalCount = new Set(rows.map((row) => row[4])).size;

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <header className={styles.header}>
          <div className={styles.eyebrow}>
            <Sheet aria-hidden="true" />
            REPORT · REGION SHEET
          </div>
        </header>

        <div className={styles.panel}>
          <SendSheetForm
            endpointLabel={maskEndpoint(process.env.REGION_SHEET_WEBHOOK_URL)}
            rowCount={rows.length}
            hospitalCount={hospitalCount}
            columnCount={REPORT_ROW_LENGTH}
          />

          <h2 className={styles.previewTitle}>
            ข้อมูลที่จะส่ง
            <small>ทั้งหมด {rows.length.toLocaleString("th-TH")} แถว</small>
          </h2>

          {rows.length > 0 ? (
            <div className={styles.previewScroll}>
              <table className={styles.preview}>
                <thead>
                  <tr>
                    {PREVIEW_HEADERS.map((header, index) => (
                      <th key={`${header}-${index}`}>{header}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                      {row.map((cell, cellIndex) => (
                        <td
                          key={cellIndex}
                          className={MARK_COLUMNS.has(cellIndex) ? styles.mark : undefined}
                        >
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className={styles.empty}>ยังไม่มีข้อมูลในตารางรายงาน</p>
          )}
        </div>
      </section>
    </main>
  );
}

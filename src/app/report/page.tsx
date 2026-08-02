import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { decryptHn } from "@/lib/hn-crypto";
import inspectionResults from "../../../inspection-result.json";
import finalResults from "../../../final-result.json";
import ReportTable from "./ReportTable";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

export default async function ReportPage({
  searchParams,
}: {
  searchParams: Promise<{ hos?: string | string[] }>;
}) {
  const { hos } = await searchParams;
  const hospitalCode = typeof hos === "string" ? hos.trim() : "";

  if (!hospitalCode || hospitalCode.length > 10) notFound();

  const prisma = getPrisma();
  const [latestSummary, hospital, savedReports] = await Promise.all([
    prisma.complaintHosCount.findFirst({
      where: { hospital_code: hospitalCode },
      orderBy: [{ date_up: "desc" }, { time_up: "desc" }],
      select: { masks: true },
    }),
    prisma.hospital.findUnique({
      where: { hospcode: hospitalCode },
      select: { hospnameShort: true },
    }),
    prisma.report.findMany({
      where: { hospital_code: hospitalCode },
      orderBy: { item_no: "asc" },
    }),
  ]);

  // หน่วยบริการที่ยังไม่มีคำร้องก็เปิดหน้านี้เพื่อเพิ่มรายการเองได้ ขอแค่มีอยู่ในตาราง hospitals
  if (!hospital) notFound();

  const total = latestSummary?.masks ?? 0;
  const rows = savedReports.map((report) => ({
      item_no: report.item_no,
      hn: decryptHn(report.hn),
      comp_date: report.comp_date ?? "",
      vstdate: report.vstdate ?? "",
      issue: report.issue ?? "",
      inspection_result: report.inspection_result ?? "",
      note: report.note ?? "",
      final_result: report.final_result ?? "",
    }));

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <ReportTable
          hospitalCode={hospitalCode}
          hospitalNameShort={hospital?.hospnameShort ?? ""}
          initialRows={rows}
          inspectionResults={inspectionResults}
          finalResults={finalResults}
          total={total}
        />
      </section>
    </main>
  );
}

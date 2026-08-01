import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import { decryptHn } from "@/lib/hn-crypto";
import inspectionResults from "../../../inspection-result.json";
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
  const latestSummary = await prisma.complaintHosCount.findFirst({
    where: { hospital_code: hospitalCode },
    orderBy: [{ date_up: "desc" }, { time_up: "desc" }],
    select: { masks: true },
  });

  if (!latestSummary) notFound();

  const total = latestSummary.masks;
  const savedReports = await prisma.report.findMany({
    where: { hospital_code: hospitalCode },
    orderBy: { item_no: "asc" },
  });
  const savedReportByNumber = new Map(
    savedReports.map((report) => [report.item_no, report]),
  );
  const rows = Array.from({ length: total }, (_, index) => {
    const itemNo = index + 1;
    const savedReport = savedReportByNumber.get(itemNo);
    return {
      item_no: itemNo,
      hn: decryptHn(savedReport?.hn),
      vstdate: savedReport?.vstdate ?? "",
      issue: savedReport?.issue ?? "",
      inspection_result: savedReport?.inspection_result ?? "",
      note: savedReport?.note ?? "",
    };
  });

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <ReportTable
          hospitalCode={hospitalCode}
          initialRows={rows}
          inspectionResults={inspectionResults}
          total={total}
        />
      </section>
    </main>
  );
}

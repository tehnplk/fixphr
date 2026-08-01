import { BarChart3 } from "lucide-react";
import Link from "next/link";
import inspectionResults from "../../../inspection-result.json";
import { getPrisma } from "@/lib/prisma";
import SummaryChart from "./SummaryChart";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const DISTRICTS = [
  "เมืองพิษณุโลก",
  "นครไทย",
  "ชาติตระการ",
  "บางระกำ",
  "บางกระทุ่ม",
  "พรหมพิราม",
  "วัดโบสถ์",
  "วังทอง",
  "เนินมะปราง",
] as const;

type District = (typeof DISTRICTS)[number];

function formatNumber(value: number) {
  return value.toLocaleString("th-TH");
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "0.00";
  return ((value / total) * 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab === "type" ? "type" : "district";
  const prisma = getPrisma();

  const [totalByHospital, checkedByHospital, typeGroups] = await Promise.all([
    prisma.report.groupBy({
      by: ["hospital_code"],
      _count: { _all: true },
    }),
    prisma.report.groupBy({
      by: ["hospital_code"],
      where: { inspection_result: { not: null } },
      _count: { _all: true },
    }),
    prisma.report.groupBy({
      by: ["inspection_result"],
      where: {
        inspection_result: {
          in: inspectionResults.map((result) => result.code),
        },
      },
      _count: { _all: true },
    }),
  ]);

  const hospitalCodes = Array.from(
    new Set(totalByHospital.map((row) => row.hospital_code)),
  );
  const hospitals = hospitalCodes.length > 0
    ? await prisma.hospital.findMany({
        where: { hospcode: { in: hospitalCodes } },
        select: { hospcode: true, ampName: true },
      })
    : [];

  const districtByHospital = new Map(
    hospitals.map((hospital) => [hospital.hospcode, hospital.ampName]),
  );
  const checkedCountByHospital = new Map(
    checkedByHospital.map((row) => [row.hospital_code, row._count._all]),
  );
  const districtSummary = new Map<District, { total: number; checked: number }>(
    DISTRICTS.map((district) => [district, { total: 0, checked: 0 }]),
  );

  for (const row of totalByHospital) {
    const district = districtByHospital.get(row.hospital_code);
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const summary = districtSummary.get(district as District);
    if (!summary) continue;
    summary.total += row._count._all;
    summary.checked += checkedCountByHospital.get(row.hospital_code) ?? 0;
  }

  const districtRows = DISTRICTS.map((district) => ({
    district,
    ...(districtSummary.get(district) ?? { total: 0, checked: 0 }),
  }));
  const grandTotal = districtRows.reduce((sum, row) => sum + row.total, 0);
  const grandChecked = districtRows.reduce((sum, row) => sum + row.checked, 0);
  const typeCountByCode = new Map(
    typeGroups.map((row) => [row.inspection_result, row._count._all]),
  );
  const typeRows = inspectionResults.map((result) => ({
    ...result,
    count: typeCountByCode.get(result.code) ?? 0,
  }));
  const typeTotal = typeRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <header className={styles.header}>
          <BarChart3 aria-hidden="true" />
          <h1>สรุปผล</h1>
        </header>

        <section className={styles.card}>
          <nav aria-label="รูปแบบการสรุปผล" className={styles.tabs}>
            <Link
              aria-current={activeTab === "district" ? "page" : undefined}
              className={activeTab === "district" ? styles.activeTab : undefined}
              href="/sum?tab=district"
            >
              รายอำเภอ
            </Link>
            <Link
              aria-current={activeTab === "type" ? "page" : undefined}
              className={activeTab === "type" ? styles.activeTab : undefined}
              href="/sum?tab=type"
            >
              ประเภท
            </Link>
          </nav>

          <div className={styles.contentGrid}>
            <div className={styles.tableWrap}>
              {activeTab === "district" ? (
              <table>
                <thead>
                  <tr>
                    <th scope="col">อำเภอ</th>
                    <th scope="col">จำนวนรายการ</th>
                    <th scope="col">ตรวจสอบแล้ว</th>
                    <th scope="col">ร้อยละ</th>
                  </tr>
                </thead>
                <tbody>
                  {districtRows.map((row) => (
                    <tr key={row.district}>
                      <th scope="row">{row.district}</th>
                      <td>{formatNumber(row.total)}</td>
                      <td>{formatNumber(row.checked)}</td>
                      <td>{formatPercent(row.checked, row.total)}</td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <th scope="row">รวม</th>
                    <td>{formatNumber(grandTotal)}</td>
                    <td>{formatNumber(grandChecked)}</td>
                    <td>{formatPercent(grandChecked, grandTotal)}</td>
                  </tr>
                </tbody>
              </table>
              ) : (
              <table>
                <thead>
                  <tr>
                    <th scope="col">ประเภท</th>
                    <th scope="col">จำนวน</th>
                    <th scope="col">ร้อยละ</th>
                  </tr>
                </thead>
                <tbody>
                  {typeRows.map((row) => (
                    <tr key={row.code}>
                      <th scope="row">{row.label}</th>
                      <td>{formatNumber(row.count)}</td>
                      <td>{formatPercent(row.count, typeTotal)}</td>
                    </tr>
                  ))}
                  <tr className={styles.totalRow}>
                    <th scope="row">รวม</th>
                    <td>{formatNumber(typeTotal)}</td>
                    <td>{formatPercent(typeTotal, typeTotal)}</td>
                  </tr>
                </tbody>
              </table>
              )}
            </div>

            <div className={styles.chartPanel}>
              {activeTab === "district" ? (
                <SummaryChart
                  ariaLabel="กราฟร้อยละการตรวจสอบแล้ว แยกตามอำเภอ"
                  labels={districtRows.map((row) => row.district)}
                  series={[
                    {
                      label: "ตรวจสอบแล้ว",
                      data: districtRows.map((row) => (
                        row.total === 0 ? 0 : (row.checked / row.total) * 100
                      )),
                      backgroundColor: "rgba(18, 96, 73, .78)",
                      borderColor: "#126049",
                    },
                  ]}
                  valueFormat="percent"
                />
              ) : (
                <SummaryChart
                  ariaLabel="กราฟจำนวนผลการตรวจสอบ แยกตามประเภท"
                  chartType="pie"
                  labels={typeRows.map((row) => row.label)}
                  series={[
                    {
                      label: "จำนวน",
                      data: typeRows.map((row) => row.count),
                      backgroundColor: [
                        "#edb83d",
                        "#2a9d76",
                        "#e15759",
                        "#f28e2b",
                        "#4e79a7",
                        "#8f63b8",
                        "#36a2ae",
                        "#d65f8d",
                      ],
                      borderColor: "#fbfcf8",
                    },
                  ]}
                />
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

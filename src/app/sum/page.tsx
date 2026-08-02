import { BarChart3 } from "lucide-react";
import Link from "next/link";
import ignoredHospitals from "../../../hos-ignore.json";
import inspectionResults from "../../../inspection-result.json";
import { getPrisma } from "@/lib/prisma";
import DistrictSummaryTable, { type DistrictHospitalRow } from "./DistrictSummaryTable";
import FinalSummaryTable, { type FinalHospitalRow } from "./FinalSummaryTable";
import RealtimeTimestamp from "./RealtimeTimestamp";
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

const IGNORED_HOSPITAL_CODES = ignoredHospitals.map(
  (hospital) => hospital.hospital_code,
);

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

function formatAffiliation(value: string | null | undefined) {
  if (value === "กระทรวงสาธารณสุข") return "สธ";
  if (value === "องค์กรปกครองส่วนท้องถิ่น") return "อปท";
  return value ?? "—";
}

export default async function SummaryPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>;
}) {
  const params = await searchParams;
  const activeTab = params.tab === "type"
    ? "type"
    : params.tab === "final"
      ? "final"
      : "district";
  const prisma = getPrisma();

  const [latestTargetSnapshot, resultByHospital, typeGroups, finalGroups] = await Promise.all([
    prisma.complaintHosCount.findFirst({
      where: {
        hospital_code: { notIn: IGNORED_HOSPITAL_CODES },
        district_name: { in: [...DISTRICTS] },
      },
      orderBy: [
        { date_up: "desc" },
        { time_up: "desc" },
      ],
      select: {
        date_up: true,
        time_up: true,
      },
    }),
    prisma.report.groupBy({
      by: ["hospital_code"],
      where: {
        hospital_code: { notIn: IGNORED_HOSPITAL_CODES },
        inspection_result: { not: null },
      },
      _count: { _all: true },
    }),
    prisma.report.groupBy({
      by: ["inspection_result"],
      where: {
        hospital_code: { notIn: IGNORED_HOSPITAL_CODES },
        inspection_result: {
          in: inspectionResults.map((result) => result.code),
        },
      },
      _count: { _all: true },
    }),
    prisma.report.groupBy({
      by: ["hospital_code", "final_result"],
      where: { hospital_code: { notIn: IGNORED_HOSPITAL_CODES } },
      _count: { _all: true },
    }),
  ]);

  const targetRows = latestTargetSnapshot
    ? await prisma.complaintHosCount.findMany({
        where: {
          date_up: latestTargetSnapshot.date_up,
          time_up: latestTargetSnapshot.time_up,
          hospital_code: { notIn: IGNORED_HOSPITAL_CODES },
          district_name: { in: [...DISTRICTS] },
        },
        select: {
          hospital_code: true,
          hospital_name: true,
          district_name: true,
          masks: true,
        },
        orderBy: { hospital_name: "asc" },
      })
    : [];

  const hospitalCodes = Array.from(
    new Set([
      ...targetRows.map((row) => row.hospital_code),
      ...resultByHospital.map((row) => row.hospital_code),
      ...finalGroups.map((row) => row.hospital_code),
    ]),
  );
  const hospitals = hospitalCodes.length > 0
    ? await prisma.hospital.findMany({
        where: { hospcode: { in: hospitalCodes } },
        select: {
          hospcode: true,
          hospname: true,
          hospnameShort: true,
          ampName: true,
          mName: true,
        },
      })
    : [];

  const hospitalByCode = new Map(
    hospitals.map((hospital) => [hospital.hospcode, hospital]),
  );
  const districtByHospital = new Map(
    hospitals.map((hospital) => [hospital.hospcode, hospital.ampName]),
  );
  const districtSummary = new Map<District, { target: number; result: number }>(
    DISTRICTS.map((district) => [district, { target: 0, result: 0 }]),
  );
  const hospitalRowsByDistrict = new Map<District, Map<string, DistrictHospitalRow>>(
    DISTRICTS.map((district) => [district, new Map<string, DistrictHospitalRow>()]),
  );

  for (const row of targetRows) {
    const district = row.district_name;
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const summary = districtSummary.get(district as District);
    if (!summary) continue;
    summary.target += row.masks;

    const hospital = hospitalByCode.get(row.hospital_code);
    const districtHospitals = hospitalRowsByDistrict.get(district as District);
    const currentHospital = districtHospitals?.get(row.hospital_code);
    districtHospitals?.set(row.hospital_code, {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_name,
      affiliation: formatAffiliation(hospital?.mName),
      target: row.masks,
      result: currentHospital?.result ?? 0,
    });
  }

  for (const row of resultByHospital) {
    const district = districtByHospital.get(row.hospital_code);
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const summary = districtSummary.get(district as District);
    if (!summary) continue;
    summary.result += row._count._all;

    const hospital = hospitalByCode.get(row.hospital_code);
    const districtHospitals = hospitalRowsByDistrict.get(district as District);
    const currentHospital = districtHospitals?.get(row.hospital_code);
    districtHospitals?.set(row.hospital_code, {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_code,
      affiliation: formatAffiliation(hospital?.mName),
      target: currentHospital?.target ?? 0,
      result: row._count._all,
    });
  }

  const districtRows = DISTRICTS.map((district) => ({
    district,
    ...(districtSummary.get(district) ?? { target: 0, result: 0 }),
    hospitals: Array.from(hospitalRowsByDistrict.get(district)?.values() ?? []).sort(
      (left, right) => left.name.localeCompare(right.name, "th"),
    ),
  }));
  // การดำเนินการ (final_result): 1=ยืนยันคงเดิม, 2=ลบ, 3=แก้ไข — null คืออยู่ระหว่างดำเนินการ
  const FINAL_FIELD_BY_CODE: Record<string, "confirmed" | "deleted" | "edited"> = {
    "1": "confirmed",
    "2": "deleted",
    "3": "edited",
  };
  const finalHospitalsByDistrict = new Map<District, Map<string, FinalHospitalRow>>(
    DISTRICTS.map((district) => [district, new Map<string, FinalHospitalRow>()]),
  );

  for (const row of targetRows) {
    const district = row.district_name;
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const hospital = hospitalByCode.get(row.hospital_code);
    finalHospitalsByDistrict.get(district as District)?.set(row.hospital_code, {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_name,
      affiliation: formatAffiliation(hospital?.mName),
      target: row.masks,
      confirmed: 0,
      edited: 0,
      deleted: 0,
      pending: 0,
    });
  }

  for (const row of finalGroups) {
    const field = FINAL_FIELD_BY_CODE[row.final_result ?? ""];
    if (!field) continue;

    const district = districtByHospital.get(row.hospital_code);
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const districtHospitals = finalHospitalsByDistrict.get(district as District);
    const hospital = hospitalByCode.get(row.hospital_code);
    const currentHospital = districtHospitals?.get(row.hospital_code) ?? {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_code,
      affiliation: formatAffiliation(hospital?.mName),
      target: 0,
      confirmed: 0,
      edited: 0,
      deleted: 0,
      pending: 0,
    };
    districtHospitals?.set(row.hospital_code, {
      ...currentHospital,
      [field]: currentHospital[field] + row._count._all,
    });
  }

  const finalRows = DISTRICTS.map((district) => {
    const hospitalRows = Array.from(finalHospitalsByDistrict.get(district)?.values() ?? [])
      .map((hospital) => ({
        ...hospital,
        pending: Math.max(
          hospital.target - hospital.confirmed - hospital.edited - hospital.deleted,
          0,
        ),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "th"));

    return hospitalRows.reduce(
      (summary, hospital) => ({
        ...summary,
        target: summary.target + hospital.target,
        confirmed: summary.confirmed + hospital.confirmed,
        edited: summary.edited + hospital.edited,
        deleted: summary.deleted + hospital.deleted,
        pending: summary.pending + hospital.pending,
      }),
      { district, target: 0, confirmed: 0, edited: 0, deleted: 0, pending: 0, hospitals: hospitalRows },
    );
  });
  const finalTotals = finalRows.reduce(
    (total, row) => ({
      confirmed: total.confirmed + row.confirmed,
      edited: total.edited + row.edited,
      deleted: total.deleted + row.deleted,
      pending: total.pending + row.pending,
    }),
    { confirmed: 0, edited: 0, deleted: 0, pending: 0 },
  );

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
              href="/sum/amp"
            >
              รายอำเภอ
            </Link>
            <Link
              aria-current={activeTab === "final" ? "page" : undefined}
              className={activeTab === "final" ? styles.activeTab : undefined}
              href="/sum/final"
            >
              การดำเนินการ
            </Link>
            <Link
              aria-current={activeTab === "type" ? "page" : undefined}
              className={activeTab === "type" ? styles.activeTab : undefined}
              href="/sum/type"
            >
              ประเภท
            </Link>
          </nav>

          <div className={styles.contentGrid}>
            <div className={styles.tableWrap}>
              {activeTab === "district" ? (
              <DistrictSummaryTable rows={districtRows} />
              ) : activeTab === "final" ? (
              <FinalSummaryTable rows={finalRows} />
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
              <RealtimeTimestamp
                className={styles.dataTimestamp}
                initialNow={new Date().toISOString()}
              />
            </div>

            <div className={styles.chartPanel}>
              {activeTab === "district" ? (
                <SummaryChart
                  ariaLabel="กราฟร้อยละผลงานเทียบเป้าหมาย แยกตามอำเภอ"
                  labels={districtRows.map((row) => row.district)}
                  series={[
                    {
                      label: "ผลงานเทียบเป้าหมาย",
                      data: districtRows.map((row) => (
                        row.target === 0 ? 0 : (row.result / row.target) * 100
                      )),
                      backgroundColor: "rgba(18, 96, 73, .78)",
                      borderColor: "#126049",
                    },
                  ]}
                  valueFormat="percent"
                />
              ) : activeTab === "final" ? (
                <SummaryChart
                  ariaLabel="กราฟจำนวนการดำเนินการ แยกตามสถานะ"
                  chartType="pie"
                  labels={["ยืนยันคงเดิม", "แก้ไข", "ลบ", "อยู่ระหว่างดำเนินการ"]}
                  series={[
                    {
                      label: "จำนวน",
                      data: [
                        finalTotals.confirmed,
                        finalTotals.edited,
                        finalTotals.deleted,
                        finalTotals.pending,
                      ],
                      backgroundColor: [
                        "#2a9d76",
                        "#edb83d",
                        "#e15759",
                        "#9aa8a1",
                      ],
                      borderColor: "#fbfcf8",
                    },
                  ]}
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

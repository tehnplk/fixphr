import { BarChart3 } from "lucide-react";
import Link from "next/link";
import ignoredHospitals from "../../../hos-ignore.json";
import inspectionResults from "../../../inspection-result.json";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import AutoRefresh from "./AutoRefresh";
import CompSummaryTable, { type CompHospitalRow } from "./CompSummaryTable";
import DistrictSummaryTable, { type DistrictHospitalRow } from "./DistrictSummaryTable";
import FinalSummaryTable, { type FinalHospitalRow } from "./FinalSummaryTable";
import RealtimeTimestamp from "./RealtimeTimestamp";
import SummaryChart from "./SummaryChart";
import TypeSummaryTable, { type TypeHospitalRow } from "./TypeSummaryTable";
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
  const session = await auth();
  // แท็บจำนวนคำร้องเปิดให้ผู้ที่ได้รับสิทธิ์แล้วทุกระดับ — ตรงกับ proxy ที่กัน
  // เฉพาะผู้ยังไม่ล็อกอินกับ role guest ออกจาก /sum/comp
  const role = session?.user?.role;
  const canViewComp = role === "super" || role === "admin" || role === "user";
  const requestedTab = params.tab === "type"
    ? "type"
    : params.tab === "final"
      ? "final"
      : params.tab === "comp"
        ? "comp"
        : "district";
  const activeTab = requestedTab === "comp" && !canViewComp ? "district" : requestedTab;
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
      by: ["hospital_code", "inspection_result"],
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
          citizens: true,
          answered: true,
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

  // ตารางจำแนกผลการตรวจสอบ: แถวเป็นอำเภอ คอลัมน์เป็นผลการตรวจสอบ 1) - 7)
  // drilldown รายหน่วยบริการใช้โครงเดียวกัน — cells เรียงตามลำดับ inspectionResults
  const typeColumnIndexByCode = new Map<string, number>(
    inspectionResults.map((result, index) => [result.code, index] as const),
  );
  const emptyTypeCells = () => inspectionResults.map(() => 0);
  const typeHospitalsByDistrict = new Map<
    District,
    Map<string, Omit<TypeHospitalRow, "total">>
  >(DISTRICTS.map((district) => [district, new Map()]));

  for (const row of targetRows) {
    const district = row.district_name;
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const hospital = hospitalByCode.get(row.hospital_code);
    typeHospitalsByDistrict.get(district as District)?.set(row.hospital_code, {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_name,
      affiliation: formatAffiliation(hospital?.mName),
      cells: emptyTypeCells(),
    });
  }

  for (const row of typeGroups) {
    const columnIndex = typeColumnIndexByCode.get(row.inspection_result ?? "");
    if (columnIndex === undefined) continue;

    const district = districtByHospital.get(row.hospital_code);
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const districtHospitals = typeHospitalsByDistrict.get(district as District);
    const hospital = hospitalByCode.get(row.hospital_code);
    const currentHospital = districtHospitals?.get(row.hospital_code) ?? {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_code,
      affiliation: formatAffiliation(hospital?.mName),
      cells: emptyTypeCells(),
    };
    const cells = [...currentHospital.cells];
    cells[columnIndex] += row._count._all;
    districtHospitals?.set(row.hospital_code, { ...currentHospital, cells });
  }

  const typeRows = DISTRICTS.map((district) => {
    const hospitalRows = Array.from(
      typeHospitalsByDistrict.get(district)?.values() ?? [],
    )
      .map((hospital) => ({
        ...hospital,
        total: hospital.cells.reduce((sum, count) => sum + count, 0),
      }))
      .sort((left, right) => left.name.localeCompare(right.name, "th"));
    const cells = inspectionResults.map((_, index) => (
      hospitalRows.reduce((sum, hospital) => sum + hospital.cells[index], 0)
    ));

    return {
      district,
      cells,
      total: cells.reduce((sum, count) => sum + count, 0),
      hospitals: hospitalRows,
    };
  });

  // ตารางจำนวนคำร้อง: masks = คำร้อง, citizens = ผู้ร้อง ของ snapshot ล่าสุด
  // ผู้ร้องระดับอำเภอเป็นผลรวมรายหน่วยบริการ ไม่ใช่การนับคนแบบไม่ซ้ำ
  // answered = คำร้องที่ตอบกลับแล้วจากระบบต้นทาง (มากับไฟล์อัปโหลด) ไม่ใช่ยอดที่กรอกในระบบนี้
  const compHospitalsByDistrict = new Map<District, Map<string, CompHospitalRow>>(
    DISTRICTS.map((district) => [district, new Map<string, CompHospitalRow>()]),
  );

  for (const row of targetRows) {
    const district = row.district_name;
    if (!district || !DISTRICTS.includes(district as District)) continue;

    const hospital = hospitalByCode.get(row.hospital_code);
    compHospitalsByDistrict.get(district as District)?.set(row.hospital_code, {
      code: row.hospital_code,
      name: hospital?.hospnameShort ?? hospital?.hospname ?? row.hospital_name,
      affiliation: formatAffiliation(hospital?.mName),
      complainants: row.citizens,
      complaints: row.masks,
      answered: row.answered,
    });
  }

  const compRows = DISTRICTS.map((district) => {
    const hospitalRows = Array.from(
      compHospitalsByDistrict.get(district)?.values() ?? [],
    ).sort((left, right) => left.name.localeCompare(right.name, "th"));

    return hospitalRows.reduce(
      (summary, hospital) => ({
        ...summary,
        complainants: summary.complainants + hospital.complainants,
        complaints: summary.complaints + hospital.complaints,
        answered: summary.answered + hospital.answered,
      }),
      { district, complainants: 0, complaints: 0, answered: 0, hospitals: hospitalRows },
    );
  });

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
            {canViewComp ? (
            <Link
              aria-current={activeTab === "comp" ? "page" : undefined}
              className={activeTab === "comp" ? styles.activeTab : undefined}
              href="/sum/comp"
            >
              จำนวนคำร้อง
            </Link>
            ) : null}
            <Link
              aria-current={activeTab === "district" ? "page" : undefined}
              className={activeTab === "district" ? styles.activeTab : undefined}
              href="/sum/amp"
            >
              ยอดการตรวจสอบ
            </Link>
            <Link
              aria-current={activeTab === "type" ? "page" : undefined}
              className={activeTab === "type" ? styles.activeTab : undefined}
              href="/sum/type"
            >
              จำแนกผลการตรวจสอบ
            </Link>
            <Link
              aria-current={activeTab === "final" ? "page" : undefined}
              className={activeTab === "final" ? styles.activeTab : undefined}
              href="/sum/final"
            >
              การดำเนินการ
            </Link>
          </nav>

          <div
            className={
              activeTab === "type" || activeTab === "comp"
                ? `${styles.contentGrid} ${styles.contentGridSingle}`
                : activeTab === "final"
                  ? `${styles.contentGrid} ${styles.contentGridPie}`
                  : styles.contentGrid
            }
          >
            <div
              className={
                activeTab === "comp"
                  ? `${styles.tableWrap} ${styles.tableWrapNarrow}`
                  : styles.tableWrap
              }
            >
              {activeTab === "district" ? (
              <DistrictSummaryTable rows={districtRows} />
              ) : activeTab === "final" ? (
              <FinalSummaryTable rows={finalRows} />
              ) : activeTab === "comp" ? (
              <CompSummaryTable rows={compRows} />
              ) : (
              <TypeSummaryTable columns={inspectionResults} rows={typeRows} />
              )}
              {/* แถบเวลาอยู่ใต้ตารางข้อมูลและกว้างเท่าตารางเสมอ */}
              <RealtimeTimestamp
                className={styles.dataTimestamp}
                initialNow={new Date().toISOString()}
                /* ทุกแท็บดึงข้อมูลใหม่เองทุก 5 นาที */
                leading={<AutoRefresh />}
              />
            </div>

            {/* แท็บที่ไม่มีกราฟต้องไม่ render แผงกราฟเลย ไม่งั้นจะเหลือแผงเปล่า
                สูง 496px ค้างอยู่ใต้ตาราง */}
            {activeTab === "type" || activeTab === "comp" ? null : (
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
                      // สีแท่งตรงกับ badge ร้อยละในตาราง — เขียวเมื่อครบ 100 แดงเมื่อยังไม่ครบ
                      backgroundColor: districtRows.map((row) => (
                        row.target > 0 && row.result >= row.target
                          ? "rgba(22, 192, 96, .78)"
                          : "rgba(217, 45, 32, .78)"
                      )),
                      borderColor: districtRows.map((row) => (
                        row.target > 0 && row.result >= row.target ? "#16c060" : "#d92d20"
                      )),
                    },
                  ]}
                  valueFormat="percent"
                />
              ) : activeTab === "final" ? (
                <div className={styles.pieChartBox}>
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
                        // ตรงกับสี badge ในตาราง (confirm/edit/delete/pending)
                        backgroundColor: [
                          "#16c060",
                          "#f0c04a",
                          "#f6a6a6",
                          "#e0821c",
                        ],
                        borderColor: "#fbfcf8",
                      },
                    ]}
                  />
                </div>
              ) : null}
            </div>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}

import { CalendarRange, FileText } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPrisma } from "@/lib/prisma";
import ignoredHospitals from "../../../json_lookup/hos-ignore.json";
import LiveClock from "../amp/LiveClock";
import ampStyles from "../amp/page.module.css";
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

type CellValue = {
  masks: number;
  citizens: number;
};

type Hospital = {
  code: string;
  name: string;
  affiliation: string;
};

const IGNORED_HOSPITAL_CODES = ignoredHospitals.map(
  (hospital) => hospital.hospital_code,
);

function dateKey(value: Date) {
  return value.toISOString().slice(0, 10);
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(value);
}

function formatColumnDate(value: Date) {
  const parts = new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
    timeZone: "UTC",
  }).formatToParts(value);

  return {
    day: parts.find((part) => part.type === "day")?.value ?? "",
    month: parts.find((part) => part.type === "month")?.value ?? "",
    year: parts.find((part) => part.type === "year")?.value ?? "",
  };
}

function getBangkokToday() {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
      .formatToParts(new Date())
      .filter((part) => part.type !== "literal")
      .map((part) => [part.type, Number(part.value)]),
  );

  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function formatCellNumber(value: number, showSign: boolean) {
  const formatted = Math.abs(value).toLocaleString("th-TH");
  if (!showSign || value === 0) return value < 0 ? `-${formatted}` : formatted;
  return value > 0 ? `+${formatted}` : `-${formatted}`;
}

function renderCellValue(value: CellValue | undefined, showSign = false) {
  if (!value) return "—";

  return (
    <span className={ampStyles.cellValue}>
      <strong>{formatCellNumber(value.masks, showSign)}</strong>
      <span>/</span>
      <small>{formatCellNumber(value.citizens, showSign)}</small>
    </span>
  );
}

function sumCellValues(values: Array<CellValue | undefined>) {
  const availableValues = values.filter((value): value is CellValue => value !== undefined);
  if (availableValues.length === 0) return undefined;

  return availableValues.reduce<CellValue>(
    (total, value) => ({
      masks: total.masks + value.masks,
      citizens: total.citizens + value.citizens,
    }),
    { masks: 0, citizens: 0 },
  );
}

function formatAffiliation(value: string | null | undefined) {
  if (value === "กระทรวงสาธารณสุข") return "สธ";
  if (value === "องค์กรปกครองส่วนท้องถิ่น") return "อปท";
  return value ?? "—";
}

export default async function HospitalPage({
  searchParams,
}: {
  searchParams: Promise<{ amp?: string | string[] }>;
}) {
  const { amp } = await searchParams;
  const districtParam = typeof amp === "string" ? amp : "";
  if (!DISTRICTS.includes(districtParam as District)) notFound();
  const district = districtParam as District;

  const today = getBangkokToday();
  const trendStartDate = new Date(Date.UTC(2026, 6, 31));
  const rollingStartDate = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - 14),
  );
  const displayStartDate = rollingStartDate < trendStartDate ? trendStartDate : rollingStartDate;
  const dates = Array.from(
    { length: 15 },
    (_, index) => new Date(
      Date.UTC(
        displayStartDate.getUTCFullYear(),
        displayStartDate.getUTCMonth(),
        displayStartDate.getUTCDate() + index,
      ),
    ),
  );
  const dateKeys = new Set(dates.map(dateKey));

  const prisma = getPrisma();
  const sourceRows = await prisma.complaintHosCount.findMany({
    where: {
      district_name: district,
      date_up: {
        gte: dates[0],
        lte: dates[dates.length - 1],
      },
      hospital_code: {
        notIn: IGNORED_HOSPITAL_CODES,
      },
    },
    select: {
      date_up: true,
      time_up: true,
      hospital_code: true,
      hospital_name: true,
      masks: true,
      citizens: true,
    },
    orderBy: [{ date_up: "desc" }, { time_up: "desc" }, { hospital_name: "asc" }],
  });

  const hospitalCodes = Array.from(new Set(sourceRows.map((row) => row.hospital_code)));
  const hospitalNames = await prisma.hospital.findMany({
    where: {
      hospcode: {
        in: hospitalCodes,
      },
    },
    select: {
      hospcode: true,
      hospnameShort: true,
      mName: true,
    },
  });
  const hospitalMasterByCode = new Map(
    hospitalNames.map((hospital) => [hospital.hospcode, hospital]),
  );

  const latestTimeByDate = new Map<string, number>();
  const hospitalByCode = new Map<string, Hospital>();
  const valuesByHospital = new Map<string, Map<string, CellValue>>();

  for (const row of sourceRows) {
    const key = dateKey(row.date_up);
    if (!dateKeys.has(key)) continue;

    const rowTime = row.time_up.getTime();
    const latestTime = latestTimeByDate.get(key);
    if (latestTime === undefined) latestTimeByDate.set(key, rowTime);
    if (latestTime !== undefined && latestTime !== rowTime) continue;

    const hospitalMaster = hospitalMasterByCode.get(row.hospital_code);
    hospitalByCode.set(row.hospital_code, {
      code: row.hospital_code,
      name: hospitalMaster?.hospnameShort ?? row.hospital_name,
      affiliation: formatAffiliation(hospitalMaster?.mName),
    });

    const hospitalValues = valuesByHospital.get(row.hospital_code) ?? new Map<string, CellValue>();
    hospitalValues.set(key, {
      masks: row.masks,
      citizens: row.citizens,
    });
    valuesByHospital.set(row.hospital_code, hospitalValues);
  }

  const hospitals = Array.from(hospitalByCode.values()).sort((left, right) =>
    left.name.localeCompare(right.name, "th"),
  );

  const totalsByDate = new Map(
    dates.map((date) => {
      const key = dateKey(date);
      const values = hospitals
        .map((hospital) => valuesByHospital.get(hospital.code)?.get(key))
        .filter((value): value is CellValue => value !== undefined);

      return [key, sumCellValues(values)] as const;
    }),
  );

  const todayKey = dateKey(today);
  const previousDataKeyByDate = new Map<string, string | undefined>();
  let latestDataKey: string | undefined;

  for (const date of dates) {
    const key = dateKey(date);
    if (!totalsByDate.get(key)) continue;
    previousDataKeyByDate.set(key, latestDataKey);
    latestDataKey = key;
  }

  const todayAbsoluteTotal = totalsByDate.get(todayKey)?.masks ?? 0;
  const previousTodayKey = previousDataKeyByDate.get(todayKey);
  const previousTodayTotal = previousTodayKey
    ? totalsByDate.get(previousTodayKey)?.masks ?? 0
    : 0;
  const todayTotal = todayAbsoluteTotal - previousTodayTotal;
  const cumulativeTotal = latestDataKey
    ? totalsByDate.get(latestDataKey)?.masks ?? 0
    : 0;

  function getDisplayValue(hospitalCode: string, date: Date) {
    const key = dateKey(date);
    const currentValue = valuesByHospital.get(hospitalCode)?.get(key);
    const previousKey = previousDataKeyByDate.get(key);
    if (!previousKey) return currentValue;

    const previousValue = valuesByHospital.get(hospitalCode)?.get(previousKey);
    if (!currentValue && !previousValue) return undefined;

    return {
      masks: (currentValue?.masks ?? 0) - (previousValue?.masks ?? 0),
      citizens: (currentValue?.citizens ?? 0) - (previousValue?.citizens ?? 0),
    };
  }

  function getDisplayTotal(date: Date) {
    const key = dateKey(date);
    const currentTotal = totalsByDate.get(key);
    const previousKey = previousDataKeyByDate.get(key);
    if (!currentTotal || !previousKey) return currentTotal;

    const previousTotal = totalsByDate.get(previousKey);
    return {
      masks: currentTotal.masks - (previousTotal?.masks ?? 0),
      citizens: currentTotal.citizens - (previousTotal?.citizens ?? 0),
    };
  }

  const grandTotal = sumCellValues(dates.map(getDisplayTotal));

  return (
    <main className={ampStyles.page}>
      <div className={ampStyles.grid} aria-hidden="true" />

      <section className={ampStyles.shell}>
        <div className={ampStyles.summary}>
          <div>
            <span>เข้าใหม่วันนี้</span>
            <strong>{formatCellNumber(todayTotal, true)}</strong>
          </div>
          <div>
            <span>สะสม</span>
            <strong>{cumulativeTotal.toLocaleString("th-TH")} <small>รายการ</small></strong>
          </div>
          <div className={`${ampStyles.latest} ${ampStyles.latestCompact}`}>
            <CalendarRange aria-hidden="true" />
            <LiveClock />
          </div>
        </div>

        <section className={ampStyles.tableCard} aria-label={`รายชื่อโรงพยาบาล อำเภอ${district}`}>
          <div className={ampStyles.tableWrap}>
            <table className={styles.hospitalTable}>
              <thead>
                <tr>
                  <th aria-label="โรงพยาบาล" className={ampStyles.nameColumn} scope="col" />
                  <th className={styles.affiliationColumn} scope="col">สังกัด</th>
                  {dates.map((date) => {
                    const label = formatColumnDate(date);
                    const key = dateKey(date);
                    const isToday = key === todayKey;
                    const previousKey = previousDataKeyByDate.get(key);
                    return (
                      <th
                        className={isToday ? ampStyles.todayColumn : undefined}
                        scope="col"
                        key={key}
                        title={previousKey
                          ? `${formatDate(date)} — ส่วนต่างจากวันที่ก่อนหน้า`
                          : formatDate(date)}
                      >
                        <time className={ampStyles.dateHeader} dateTime={key}>
                          <strong>{label.day}</strong>
                          <small>{label.month}</small>
                          <small>{label.year}</small>
                        </time>
                      </th>
                    );
                  })}
                  <th className={`${ampStyles.totalColumn} ${styles.totalColumn}`} scope="col">รวม</th>
                  <th aria-label="การดำเนินการ" className={styles.actionColumn} scope="col" />
                </tr>
              </thead>
              <tbody>
                {hospitals.map((hospital) => {
                  const hospitalTotal = sumCellValues(
                    dates.map((date) => getDisplayValue(hospital.code, date)),
                  );

                  return (
                    <tr key={hospital.code}>
                      <th className={`${ampStyles.nameColumn} ${styles.hospitalName}`} scope="row">
                        <span>{hospital.code}</span> - {hospital.name}
                      </th>
                      <td className={styles.affiliationColumn}>{hospital.affiliation}</td>
                      {dates.map((date) => {
                        const key = dateKey(date);
                        const isToday = key === todayKey;
                        const showSign = previousDataKeyByDate.get(key) !== undefined;
                        const value = getDisplayValue(hospital.code, date);
                        return (
                          <td
                            className={`${value === undefined ? ampStyles.noData : ""} ${isToday ? ampStyles.todayColumn : ""}`.trim() || undefined}
                            key={key}
                          >
                            {renderCellValue(value, showSign)}
                          </td>
                        );
                      })}
                      <td className={`${ampStyles.totalColumn} ${styles.totalColumn}`}>{renderCellValue(hospitalTotal)}</td>
                      <td className={styles.actionColumn}>
                        <Link
                          aria-label={`เปิดรายงาน ${hospital.name}`}
                          className={styles.actionLink}
                          href={{ pathname: "/report", query: { hos: hospital.code } }}
                        >
                          <FileText aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
                <tr className={ampStyles.totalRow}>
                  <th className={ampStyles.nameColumn} scope="row">รวม</th>
                  <td className={styles.affiliationColumn} />
                  {dates.map((date) => {
                    const key = dateKey(date);
                    const isToday = key === todayKey;
                    const showSign = previousDataKeyByDate.get(key) !== undefined;
                    return (
                      <td className={isToday ? ampStyles.todayColumn : undefined} key={key}>
                        {renderCellValue(getDisplayTotal(date), showSign)}
                      </td>
                    );
                  })}
                  <td className={`${ampStyles.totalColumn} ${styles.totalColumn}`}>{renderCellValue(grandTotal)}</td>
                  <td className={styles.actionColumn} />
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </section>
    </main>
  );
}

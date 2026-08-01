import { CalendarRange, FileText } from "lucide-react";
import Link from "next/link";
import { getPrisma } from "@/lib/prisma";
import ignoredHospitals from "../../../hos-ignore.json";
import LiveClock from "./LiveClock";
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

const IGNORED_HOSPITAL_CODES = ignoredHospitals.map(
  (hospital) => hospital.hospital_code,
);

type District = (typeof DISTRICTS)[number];

type CellValue = {
  masks: number;
  citizens: number;
};

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
    <span className={styles.cellValue}>
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

export default async function TrendPage() {
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

  const sourceRows = await getPrisma().complaintHosCount.findMany({
    where: {
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
      district_name: true,
      masks: true,
      citizens: true,
    },
    orderBy: [{ date_up: "desc" }, { time_up: "desc" }],
  });

  const latestTimeByDate = new Map<string, number>();
  const valuesByDistrict = new Map<District, Map<string, CellValue>>(
    DISTRICTS.map((district) => [district, new Map<string, CellValue>()]),
  );

  for (const row of sourceRows) {
    const key = dateKey(row.date_up);
    if (!dateKeys.has(key)) continue;

    const rowTime = row.time_up.getTime();
    const latestTime = latestTimeByDate.get(key);

    if (latestTime === undefined) latestTimeByDate.set(key, rowTime);
    if (latestTime !== undefined && latestTime !== rowTime) continue;
    if (!DISTRICTS.includes(row.district_name as District)) continue;

    const districtValues = valuesByDistrict.get(row.district_name as District);
    const currentValue = districtValues?.get(key);
    districtValues?.set(key, {
      masks: (currentValue?.masks ?? 0) + row.masks,
      citizens: (currentValue?.citizens ?? 0) + row.citizens,
    });
  }

  const totalsByDate = new Map(
    dates.map((date) => {
      const key = dateKey(date);
      const values = DISTRICTS
        .map((district) => valuesByDistrict.get(district)?.get(key))
        .filter((value): value is CellValue => value !== undefined);

      return [
        key,
        values.length > 0
          ? values.reduce<CellValue>(
              (total, value) => ({
                masks: total.masks + value.masks,
                citizens: total.citizens + value.citizens,
              }),
              { masks: 0, citizens: 0 },
            )
          : undefined,
      ] as const;
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

  function getDisplayValue(district: District, date: Date) {
    const key = dateKey(date);
    const currentValue = valuesByDistrict.get(district)?.get(key);
    const previousKey = previousDataKeyByDate.get(key);
    if (!currentValue || !previousKey) return currentValue;

    const previousValue = valuesByDistrict.get(district)?.get(previousKey);
    return {
      masks: currentValue.masks - (previousValue?.masks ?? 0),
      citizens: currentValue.citizens - (previousValue?.citizens ?? 0),
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
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.shell}>
        <div className={styles.summary}>
          <div>
            <span>เข้าใหม่วันนี้</span>
            <strong>{formatCellNumber(todayTotal, true)}</strong>
          </div>
          <div>
            <span>สะสม</span>
            <strong>{cumulativeTotal.toLocaleString("th-TH")} <small>รายการ</small></strong>
          </div>
          <div className={`${styles.latest} ${styles.latestCompact}`}>
            <CalendarRange aria-hidden="true" />
            <LiveClock />
          </div>
        </div>

        <section className={styles.tableCard} aria-label="ข้อมูล 9 อำเภอ แยกตามวันที่และยอดรวม">
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th scope="col">อำเภอ</th>
                  {dates.map((date) => {
                    const label = formatColumnDate(date);
                    const key = dateKey(date);
                    const isToday = key === todayKey;
                    const previousKey = previousDataKeyByDate.get(key);
                    return (
                    <th
                      className={isToday ? styles.todayColumn : undefined}
                      scope="col"
                      key={key}
                      title={previousKey
                        ? `${formatDate(date)} — ส่วนต่างจากวันที่ก่อนหน้า`
                        : formatDate(date)}
                    >
                      <time className={styles.dateHeader} dateTime={dateKey(date)}>
                        <strong>{label.day}</strong>
                        <small>{label.month}</small>
                        <small>{label.year}</small>
                      </time>
                    </th>
                    );
                  })}
                  <th className={styles.totalColumn} scope="col">รวม</th>
                  <th aria-label="การดำเนินการ" className={styles.actionColumn} scope="col" />
                </tr>
              </thead>
              <tbody>
                {DISTRICTS.map((district) => {
                  const districtTotal = sumCellValues(
                    dates.map((date) => getDisplayValue(district, date)),
                  );

                  return (
                    <tr key={district}>
                    <th className={styles.districtName} scope="row">{district}</th>
                    {dates.map((date) => {
                      const key = dateKey(date);
                      const isToday = key === todayKey;
                      const showSign = previousDataKeyByDate.get(key) !== undefined;
                      const value = getDisplayValue(district, date);
                      return (
                        <td
                          className={`${value === undefined ? styles.noData : ""} ${isToday ? styles.todayColumn : ""}`.trim() || undefined}
                          key={key}
                        >
                          {renderCellValue(value, showSign)}
                        </td>
                      );
                    })}
                    <td className={styles.totalColumn}>{renderCellValue(districtTotal)}</td>
                    <td className={styles.actionColumn}>
                      <Link
                        aria-label={`เปิดรายชื่อโรงพยาบาล อำเภอ${district}`}
                        className={styles.actionLink}
                        href={{ pathname: "/hos", query: { amp: district } }}
                      >
                        <FileText aria-hidden="true" />
                      </Link>
                    </td>
                  </tr>
                  );
                })}
                <tr className={styles.totalRow}>
                  <th scope="row">รวม</th>
                  {dates.map((date) => {
                    const key = dateKey(date);
                    const isToday = key === todayKey;
                    const showSign = previousDataKeyByDate.get(key) !== undefined;
                    const total = getDisplayTotal(date);
                    return (
                      <td className={isToday ? styles.todayColumn : undefined} key={key}>
                        {renderCellValue(total, showSign)}
                      </td>
                    );
                  })}
                  <td className={styles.totalColumn}>{renderCellValue(grandTotal)}</td>
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

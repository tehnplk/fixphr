"use client";

import { useMemo, useState } from "react";
import styles from "./page.module.css";

const thaiMonths = [
  "มกราคม",
  "กุมภาพันธ์",
  "มีนาคม",
  "เมษายน",
  "พฤษภาคม",
  "มิถุนายน",
  "กรกฎาคม",
  "สิงหาคม",
  "กันยายน",
  "ตุลาคม",
  "พฤศจิกายน",
  "ธันวาคม",
];

const currentGregorianYear = Number(
  new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    timeZone: "Asia/Bangkok",
  }).format(new Date()),
);

type ThaiDateControlProps = {
  name: string;
  yearCount?: number;
  allowYearOnly?: boolean;
  yearName?: string;
};

export default function ThaiDateControl({
  name,
  yearCount = 21,
  allowYearOnly = false,
  yearName,
}: ThaiDateControlProps) {
  const [day, setDay] = useState("");
  const [month, setMonth] = useState("");
  const [thaiYear, setThaiYear] = useState("");
  const [isTouched, setIsTouched] = useState(false);
  const hasDay = day !== "" && day !== "unknown";
  const hasMonth = month !== "" && month !== "unknown";

  const maximumDay = useMemo(() => {
    if (!hasMonth || !thaiYear) return 31;

    return new Date(
      Date.UTC(Number(thaiYear) - 543, Number(month), 0),
    ).getUTCDate();
  }, [hasMonth, month, thaiYear]);

  const visitDate =
    hasDay && hasMonth && thaiYear
      ? `${Number(thaiYear) - 543}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
      : "";

  const thaiYears = useMemo(
    () =>
      Array.from(
        { length: yearCount },
        (_, index) => currentGregorianYear + 543 - index,
      ),
    [yearCount],
  );

  function updateMonth(value: string) {
    setMonth(value);
    if (
      hasDay &&
      thaiYear &&
      Number(day) >
        new Date(
          Date.UTC(Number(thaiYear) - 543, Number(value), 0),
        ).getUTCDate()
    ) {
      setDay("");
    }
  }

  function updateYear(value: string) {
    setThaiYear(value);
    if (
      hasDay &&
      hasMonth &&
      Number(day) >
        new Date(
          Date.UTC(Number(value) - 543, Number(month), 0),
        ).getUTCDate()
    ) {
      setDay("");
    }
  }

  const hasKnownDay = Boolean(day && day !== "unknown");
  const hasKnownMonth = Boolean(month && month !== "unknown");
  const hasCompleteDate = Boolean(
    thaiYear &&
      ((hasKnownDay && hasKnownMonth) ||
        (allowYearOnly && day === "unknown" && month === "unknown")),
  );

  return (
    <>
      <div className={styles.dateControl}>
      <div className={styles.datePart}>
        <select
          name={`${name}_day`}
          aria-label="วัน"
          value={day}
          onChange={(event) => {
            setIsTouched(true);
            setDay(event.target.value);
          }}
          onInvalid={() => setIsTouched(true)}
          required={!allowYearOnly}
        >
          <option value="">เลือกวัน</option>
          {Array.from({ length: maximumDay }, (_, index) => index + 1).map(
            (value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ),
          )}
          {allowYearOnly && <option value="unknown">ไม่มี</option>}
        </select>
      </div>

      <div className={`${styles.datePart} ${styles.monthPart}`}>
        <select
          name={`${name}_month`}
          aria-label="เดือน"
          value={month}
          onChange={(event) => {
            setIsTouched(true);
            updateMonth(event.target.value);
          }}
          onInvalid={() => setIsTouched(true)}
          required={!allowYearOnly}
        >
          <option value="">เลือกเดือน</option>
          {thaiMonths.map((name, index) => (
            <option key={name} value={index + 1}>
              {name}
            </option>
          ))}
          {allowYearOnly && <option value="unknown">ไม่มี</option>}
        </select>
      </div>

      <div className={styles.datePart}>
        <select
          name={`${name}_year`}
          aria-label="ปี พ.ศ."
          value={thaiYear}
          onChange={(event) => {
            setIsTouched(true);
            updateYear(event.target.value);
          }}
          onInvalid={() => setIsTouched(true)}
          required
        >
          <option value="">เลือกปี</option>
          {thaiYears.map((year) => (
            <option key={year} value={year}>
              {year}
            </option>
          ))}
        </select>
      </div>

      <input name={name} type="hidden" value={visitDate} readOnly />
      {yearName && (
        <input
          name={yearName}
          type="hidden"
          value={thaiYear ? String(Number(thaiYear) - 543) : ""}
          readOnly
        />
      )}
      </div>
      {isTouched && !hasCompleteDate && (
        <span className={styles.fieldError} role="alert">
          กรุณาเลือกวัน เดือน และปีให้ครบถ้วน หรือเลือกไม่มีทั้งวันและเดือน
        </span>
      )}
    </>
  );
}

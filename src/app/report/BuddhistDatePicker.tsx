"use client";

import { useEffect, useRef, useState } from "react";
import { CalendarDays, X } from "lucide-react";
import styles from "./page.module.css";

const MONTH_LABELS = [
  "มกราคม", "กุมภาพันธ์", "มีนาคม", "เมษายน", "พฤษภาคม", "มิถุนายน",
  "กรกฎาคม", "สิงหาคม", "กันยายน", "ตุลาคม", "พฤศจิกายน", "ธันวาคม",
];

// ย่อแบบไม่มีจุดสำหรับแสดงในเซลล์ซึ่งพื้นที่จำกัด เช่น "1กค69"
const MONTH_LABELS_COMPACT = [
  "มค", "กพ", "มีค", "เมย", "พค", "มิย",
  "กค", "สค", "กย", "ตค", "พย", "ธค",
];

// ย้อนหลังพอครอบคลุมคำร้องเก่าสุดที่พบในระบบ และไม่เสนอปีอนาคตเพื่อกันกรอกผิด
const YEARS_BACK = 15;

const DAY_OPTIONS = Array.from({ length: 31 }, (_, index) => index + 1);

// เลือกวันก่อนเดือน/ปีตามลำดับที่คนไทยอ่านวันที่ จึงมีช่วงที่ยังไม่รู้ปี —
// ใช้ปีอธิกสุรทินเป็นฐานไว้ก่อน เพื่อไม่ปิด 29 กุมภาพันธ์ ทิ้งก่อนผู้ใช้จะเลือกปี
const LEAP_REFERENCE_YEAR = 2567;

type Step = 1 | 2 | 3;

const STEPS: Step[] = [1, 2, 3];

const STEP_LABELS: Record<Step, string> = { 1: "วัน", 2: "เดือน", 3: "ปี" };

const STEP_TITLES: Record<Step, string> = {
  1: "เลือกวัน",
  2: "เลือกเดือน",
  3: "เลือกปี พ.ศ.",
};

type DateParts = { day: number; month: number; year: number };

const EMPTY_PARTS: DateParts = { day: 0, month: 0, year: 0 };

function pad(value: number) {
  return String(value).padStart(2, "0");
}

function currentBuddhistYear() {
  const year = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Bangkok",
      year: "numeric",
    }).format(new Date()),
  );
  return year + 543;
}

// ค่าที่เก็บเป็นข้อความ YYYY-MM-DD ค.ศ. แต่ของเก่าบางแถวถูกกรอกเป็น พ.ศ. มาแล้ว
// จึงเดาจากช่วงตัวเลขแบบเดียวกับหน้า /sum (ไม่มี ค.ศ. ถึง 2400 และไม่มี พ.ศ. ต่ำกว่า 2400)
function parseValue(value: string): DateParts | null {
  const matched = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!matched) return null;

  const year = Number(matched[1]);
  const month = Number(matched[2]);
  const day = Number(matched[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  return { day, month, year: year >= 2400 ? year : year + 543 };
}

function daysInMonth(buddhistYear: number, month: number) {
  if (!buddhistYear || !month) return 31;
  // วันที่ 0 ของเดือนถัดไป = วันสุดท้ายของเดือนนี้ ครอบคลุมปีอธิกสุรทินให้เอง
  return new Date(buddhistYear - 543, month, 0).getDate();
}

// จำนวนวันสูงสุดเท่าที่รู้ตอนนี้ — ยังไม่เลือกเดือนก็เปิดครบ 31 วัน
function maxDay({ month, year }: DateParts) {
  if (!month) return 31;
  return daysInMonth(year || LEAP_REFERENCE_YEAR, month);
}

// บันทึกกลับเป็น ค.ศ. เสมอ แถวเก่าที่เคยเก็บเป็น พ.ศ. จึงถูกแก้ให้ถูกเมื่อบันทึกซ้ำ
function toStoredValue({ day, month, year }: DateParts) {
  return `${year - 543}-${pad(month)}-${pad(day)}`;
}

// ปีเหลือสองหลักท้าย เช่น 1 กรกฎาคม 2569 -> "1กค69"
function formatDisplay(parts: DateParts | null) {
  if (!parts) return null;
  const month = MONTH_LABELS_COMPACT[parts.month - 1];
  return `${parts.day}${month}${String(parts.year).slice(-2)}`;
}

// ค่าที่เลือกไว้ของแต่ละขั้น ใช้โชว์บนแถวขั้นตอนให้เห็นวันที่ที่กำลังประกอบอยู่
// ช่องแคบเพราะวางเรียงสามช่องในบรรทัดเดียว เดือนจึงใช้ชื่อย่อ
function partLabel(step: Step, parts: DateParts) {
  if (step === 1) return parts.day ? String(parts.day) : null;
  if (step === 2) return parts.month ? MONTH_LABELS_COMPACT[parts.month - 1] : null;
  return parts.year ? String(parts.year) : null;
}

function joinClasses(...values: (string | false)[]) {
  return values.filter(Boolean).join(" ");
}

export default function BuddhistDatePicker({
  ariaLabel,
  onChange,
  value,
}: {
  ariaLabel: string;
  onChange: (value: string) => void;
  value: string;
}) {
  const [open, setOpen] = useState(false);
  // ชั้นเลือกค่าเป็น dialog ซ้อนอีกใบ null = ปิดอยู่ ค้างที่หน้าสรุปสามขั้น
  const [picker, setPicker] = useState<Step | null>(null);
  // แก้บนสำเนาก่อน แล้วค่อยยืนยัน — กดยกเลิกหรือปิดหน้าต่างต้องไม่กระทบค่าเดิม
  const [draft, setDraft] = useState<DateParts>(EMPTY_PARTS);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const pickerRef = useRef<HTMLDialogElement>(null);
  const saved = parseValue(value);

  // ใบนอกต้อง showModal ก่อนใบใน ลำดับนี้เป็นตัวกำหนดว่าใบไหนทับใบไหนใน top layer
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  useEffect(() => {
    const dialog = pickerRef.current;
    if (!dialog) return;

    if (picker && !dialog.open) dialog.showModal();
    if (!picker && dialog.open) dialog.close();
  }, [picker]);

  const thisYear = currentBuddhistYear();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => thisYear - index);
  // ค่าที่บันทึกไว้แล้วแต่อยู่นอกช่วง (เช่นปีอนาคตที่กรอกผิด) ต้องยังเลือกค้างอยู่ได้
  if (draft.year && !years.includes(draft.year)) {
    years.push(draft.year);
    years.sort((left, right) => right - left);
  }

  const dayLimit = maxDay(draft);
  const complete = Boolean(draft.day && draft.month && draft.year);

  function optionsFor(step: Step) {
    if (step === 1) {
      return DAY_OPTIONS.map((day) => ({
        disabled: day > dayLimit,
        label: String(day),
        selected: draft.day === day,
        value: day,
      }));
    }
    if (step === 2) {
      return MONTH_LABELS.map((label, index) => ({
        disabled: false,
        label,
        selected: draft.month === index + 1,
        value: index + 1,
      }));
    }
    return years.map((year) => ({
      disabled: false,
      label: String(year),
      selected: draft.year === year,
      value: year,
    }));
  }

  function gridClassFor(step: Step) {
    if (step === 1) return styles.dateGridDays;
    if (step === 2) return styles.dateGridMonths;
    return styles.dateGridYears;
  }

  function openPicker() {
    setDraft(saved ?? EMPTY_PARTS);
    // เปิดครั้งแรกเห็นชั้นสรุปสามขั้นก่อนเสมอ ผู้ใช้เลือกเองว่าจะเริ่มแก้ขั้นไหน
    setPicker(null);
    setOpen(true);
  }

  function closeAll() {
    setPicker(null);
    setOpen(false);
  }

  function pick(step: Step, value: number) {
    const merged: DateParts =
      step === 1
        ? { ...draft, day: value }
        : step === 2
          ? { ...draft, month: value }
          : { ...draft, year: value };
    // เปลี่ยนเดือน/ปีแล้ววันเกินสิ้นเดือน ให้หดลงมาเป็นวันสุดท้ายของเดือนนั้น
    const next = { ...merged, day: Math.min(merged.day, maxDay(merged)) };
    setDraft(next);

    // ต่อด้วยชั้นเลือกค่าของขั้นแรกที่ยังว่าง ครบสามขั้นแล้วปิดกลับไปหน้าสรุปเพื่อกดตกลง
    if (!next.day) setPicker(1);
    else if (!next.month) setPicker(2);
    else if (!next.year) setPicker(3);
    else setPicker(null);
  }

  function confirm() {
    if (!complete) return;
    onChange(toStoredValue(draft));
    closeAll();
  }

  function clear() {
    onChange("");
    closeAll();
  }

  return (
    <>
      <button
        aria-haspopup="dialog"
        aria-label={ariaLabel}
        className={styles.dateTrigger}
        onClick={openPicker}
        type="button"
      >
        <CalendarDays aria-hidden="true" />
        {formatDisplay(saved)}
      </button>

      <dialog
        aria-label={ariaLabel}
        className={styles.dateDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeAll();
        }}
        onClose={closeAll}
        ref={dialogRef}
      >
        {open ? (
          <div className={styles.dateDialogBody}>
            <div className={styles.dateDialogHead}>
              <span>{ariaLabel}</span>
              <button
                aria-label="ปิดหน้าต่าง"
                className={styles.dateDialogClose}
                onClick={closeAll}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            {/* สามขั้นเรียงตามลำดับที่คนไทยอ่านวันที่ แต่กดแก้ขั้นไหนก่อนก็ได้ */}
            <div className={styles.dateSteps}>
              {STEPS.map((item) => {
                const picked = partLabel(item, draft);
                return (
                  <button
                    aria-haspopup="dialog"
                    aria-label={STEP_TITLES[item]}
                    className={joinClasses(
                      styles.dateStep,
                      picker === item && styles.dateStepActive,
                    )}
                    key={item}
                    onClick={() => setPicker(item)}
                    type="button"
                  >
                    <span className={styles.dateStepHead}>{STEP_LABELS[item]}</span>
                    <span
                      className={joinClasses(styles.dateStepValue, !picked && styles.dateStepEmpty)}
                    >
                      {picked ?? "—"}
                    </span>
                  </button>
                );
              })}
            </div>

            <div className={styles.dateDialogActions}>
              <button
                className={styles.dateClearButton}
                onClick={clear}
                type="button"
              >
                ล้างค่า
              </button>
              <button
                className={styles.dateConfirmButton}
                disabled={!complete}
                onClick={confirm}
                type="button"
              >
                ตกลง
              </button>
            </div>
          </div>
        ) : null}
      </dialog>

      {/* ชั้นเลือกค่าซ้อนบนหน้าสรุป กด Escape หรือคลิกฉากหลังปิดแค่ชั้นนี้ ค่าที่เลือกไว้ยังอยู่ */}
      <dialog
        aria-label={picker ? STEP_TITLES[picker] : undefined}
        className={joinClasses(styles.dateDialog, styles.dateOptionDialog)}
        onClick={(event) => {
          if (event.target === event.currentTarget) setPicker(null);
        }}
        onClose={() => setPicker(null)}
        ref={pickerRef}
      >
        {picker ? (
          <div className={styles.dateDialogBody}>
            <div className={styles.dateDialogHead}>
              <span>{STEP_TITLES[picker]}</span>
              <button
                aria-label="ปิดหน้าต่าง"
                className={styles.dateDialogClose}
                onClick={() => setPicker(null)}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className={joinClasses(styles.dateGrid, gridClassFor(picker))}>
              {optionsFor(picker).map((option) => (
                <button
                  aria-pressed={option.selected}
                  className={joinClasses(
                    styles.dateOption,
                    option.selected && styles.dateOptionSelected,
                  )}
                  disabled={option.disabled}
                  key={option.value}
                  onClick={() => pick(picker, option.value)}
                  type="button"
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

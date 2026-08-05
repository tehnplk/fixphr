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
  // แก้บนสำเนาก่อน แล้วค่อยยืนยัน — กดยกเลิกหรือปิดหน้าต่างต้องไม่กระทบค่าเดิม
  const [draft, setDraft] = useState<DateParts>(EMPTY_PARTS);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const saved = parseValue(value);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const thisYear = currentBuddhistYear();
  const years = Array.from({ length: YEARS_BACK + 1 }, (_, index) => thisYear - index);
  // ค่าที่บันทึกไว้แล้วแต่อยู่นอกช่วง (เช่นปีอนาคตที่กรอกผิด) ต้องยังเลือกค้างอยู่ได้
  if (draft.year && !years.includes(draft.year)) {
    years.push(draft.year);
    years.sort((left, right) => right - left);
  }

  const days = Array.from(
    { length: daysInMonth(draft.year, draft.month) },
    (_, index) => index + 1,
  );
  const complete = Boolean(draft.day && draft.month && draft.year);

  function openPicker() {
    setDraft(saved ?? EMPTY_PARTS);
    setOpen(true);
  }

  function updateDraft(next: DateParts) {
    // เปลี่ยนเดือน/ปีแล้ววันเกินสิ้นเดือน ให้หดลงมาเป็นวันสุดท้ายของเดือนนั้น
    setDraft({ ...next, day: Math.min(next.day, daysInMonth(next.year, next.month)) });
  }

  function confirm() {
    if (!complete) return;
    onChange(toStoredValue(draft));
    setOpen(false);
  }

  function clear() {
    onChange("");
    setOpen(false);
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
          if (event.target === event.currentTarget) setOpen(false);
        }}
        onClose={() => setOpen(false)}
        ref={dialogRef}
      >
        {open ? (
          <div className={styles.dateDialogBody}>
            <div className={styles.dateDialogHead}>
              <span>{ariaLabel}</span>
              <button
                aria-label="ปิดหน้าต่าง"
                className={styles.dateDialogClose}
                onClick={() => setOpen(false)}
                type="button"
              >
                <X aria-hidden="true" />
              </button>
            </div>

            <div className={styles.dateDialogFields}>
              <label>
                <span>วัน</span>
                <select
                  onChange={(event) =>
                    updateDraft({ ...draft, day: Number(event.target.value) })}
                  value={draft.day || ""}
                >
                  <option value="">—</option>
                  {days.map((day) => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>เดือน</span>
                <select
                  onChange={(event) =>
                    updateDraft({ ...draft, month: Number(event.target.value) })}
                  value={draft.month || ""}
                >
                  <option value="">—</option>
                  {MONTH_LABELS.map((label, index) => (
                    <option key={label} value={index + 1}>{label}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>ปี พ.ศ.</span>
                <select
                  onChange={(event) =>
                    updateDraft({ ...draft, year: Number(event.target.value) })}
                  value={draft.year || ""}
                >
                  <option value="">—</option>
                  {years.map((year) => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </label>
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
    </>
  );
}

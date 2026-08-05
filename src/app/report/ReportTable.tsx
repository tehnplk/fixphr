"use client";

import { Check, ClipboardList, Plus, X } from "lucide-react";
import { useState } from "react";
import Swal from "sweetalert2";
import BuddhistDatePicker from "./BuddhistDatePicker";
import styles from "./page.module.css";

type ReportRow = {
  item_no: number;
  hn: string;
  comp_date: string;
  vstdate: string;
  visit_type: string;
  issue: string;
  inspection_result: string;
  note: string;
  final_result: string;
};

type InspectionResult = {
  code: string;
  label: string;
};

type SaveStatus = "saving" | "saved" | "error";

const STATUS_LABELS: Record<SaveStatus, string> = {
  saving: "กำลังบันทึก",
  saved: "บันทึกแล้ว",
  error: "บันทึกไม่สำเร็จ",
};

// สี badge ของการดำเนินการตาม final-result.json — 1) ยืนยันคงเดิม 2) ลบ 3) แก้ไข
const FINAL_RESULT_BADGE_CLASS: Record<string, string> = {
  "1": "finalConfirm",
  "2": "finalDelete",
  "3": "finalEdit",
};

const Toast = Swal.mixin({
  toast: true,
  position: "top-end",
  showConfirmButton: false,
  timer: 3000,
  timerProgressBar: true,
});

export default function ReportTable({
  hospitalCode,
  hospitalNameShort,
  initialRows,
  inspectionResults,
  finalResults,
  visitTypes,
  total,
}: {
  hospitalCode: string;
  hospitalNameShort: string;
  initialRows: ReportRow[];
  inspectionResults: InspectionResult[];
  finalResults: InspectionResult[];
  visitTypes: InspectionResult[];
  total: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [statuses, setStatuses] = useState<Record<number, SaveStatus>>({});
  // รายการที่เพิ่มใหม่หรือแก้ไขค้างอยู่ — แสดงปุ่ม "บันทึก" แทน "ลบ"
  const [dirtyRows, setDirtyRows] = useState<Record<number, boolean>>({});
  const inspectedTotal = rows.filter((row) => row.inspection_result).length;
  const displayTotal = Math.max(total, rows.length);

  function addRow() {
    const usedNumbers = new Set(rows.map((row) => row.item_no));
    let itemNo = 1;
    while (usedNumbers.has(itemNo)) itemNo += 1;

    setRows((currentRows) => [
      ...currentRows,
      {
        item_no: itemNo,
        hn: "",
        comp_date: "",
        vstdate: "",
        visit_type: "",
        issue: "",
        inspection_result: "",
        note: "",
        final_result: "",
      },
    ].sort((left, right) => left.item_no - right.item_no));
    setDirtyRows((current) => ({ ...current, [itemNo]: true }));
  }

  function updateRow(nextRow: ReportRow) {
    setRows((currentRows) =>
      currentRows.map((row) => row.item_no === nextRow.item_no ? nextRow : row),
    );
    setDirtyRows((current) => ({ ...current, [nextRow.item_no]: true }));
  }

  function clearDirty(itemNo: number) {
    setDirtyRows((current) => {
      const next = { ...current };
      delete next[itemNo];
      return next;
    });
  }

  async function saveRow(row: ReportRow, clear = false) {
    if (!row.inspection_result && !clear) {
      setStatuses((current) => {
        const next = { ...current };
        delete next[row.item_no];
        return next;
      });
      return;
    }

    setStatuses((current) => ({ ...current, [row.item_no]: "saving" }));

    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hospital_code: hospitalCode, ...row, clear }),
      });

      if (!response.ok) throw new Error("Unable to save report row");
      setStatuses((current) => ({ ...current, [row.item_no]: "saved" }));
      return true;
    } catch {
      setStatuses((current) => ({ ...current, [row.item_no]: "error" }));
      return false;
    }
  }

  async function clearRow(row: ReportRow) {
    const cleared = await saveRow({
      ...row,
      hn: "",
      comp_date: "",
      vstdate: "",
      visit_type: "",
      issue: "",
      inspection_result: "",
      note: "",
      final_result: "",
    }, true);

    if (!cleared) return;
    setRows((currentRows) => currentRows.filter(
      (currentRow) => currentRow.item_no !== row.item_no,
    ));
    setStatuses((current) => {
      const next = { ...current };
      delete next[row.item_no];
      return next;
    });
    clearDirty(row.item_no);
  }

  async function confirmClearRow(row: ReportRow) {
    const result = await Swal.fire({
      title: `ลบรายการที่ ${row.item_no.toLocaleString("th-TH")}?`,
      text: "ข้อมูลในรายการนี้จะถูกลบออกจากระบบ",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "ยืนยันการลบ",
      cancelButtonText: "ยกเลิก",
      confirmButtonColor: "#a83f3f",
      cancelButtonColor: "#71877e",
      focusCancel: true,
    });

    if (!result.isConfirmed) return;
    await clearRow(row);
  }

  async function submitRow(row: ReportRow) {
    if (!row.inspection_result) {
      void Toast.fire({ icon: "warning", title: "กรุณาเลือกผลการตรวจสอบก่อนบันทึก" });
      return;
    }

    const saved = await saveRow(row);
    if (saved) {
      clearDirty(row.item_no);
      void Toast.fire({ icon: "success", title: "บันทึกสำเร็จ" });
    } else {
      void Toast.fire({ icon: "error", title: "บันทึกไม่สำเร็จ" });
    }
  }

  function updateText(
    row: ReportRow,
    field: "hn" | "comp_date" | "vstdate" | "issue" | "note",
    value: string,
  ) {
    updateRow({ ...row, [field]: value });
  }

  return (
    <>
      <header className={styles.header}>
        <ClipboardList aria-hidden="true" />
        <div className={styles.hospitalIdentity}>
          <strong className={styles.hospitalCode}>{hospitalCode}</strong>
          {hospitalNameShort ? (
            <>
              <span aria-hidden="true">-</span>
              <span className={styles.hospitalNameShort}>{hospitalNameShort}</span>
            </>
          ) : null}
          <a
            className={styles.externalLink}
            href="https://phr1.moph.go.th/dashboard/"
            rel="noopener noreferrer"
            target="_blank"
          >
            ไปที่ระบบตรวจสอบคำร้อง PHR1
          </a>
        </div>
        <p>
          <span>ตรวจสอบแล้ว</span>
          <strong>{inspectedTotal.toLocaleString("th-TH")}</strong>
          <span>/</span>
          <strong>{displayTotal.toLocaleString("th-TH")}</strong>
          <span>รายการ</span>
        </p>
      </header>

      <div className={styles.tableCard}>
      <table>
        <colgroup>
          <col className={styles.numberColumn} />
          <col className={styles.vstdateColumn} />
          <col className={styles.hnColumn} />
          <col className={styles.vstdateColumn} />
          <col className={styles.visitTypeColumn} />
          <col className={styles.issueColumn} />
          <col className={styles.resultColumn} />
          <col className={styles.noteColumn} />
          <col className={styles.finalColumn} />
          <col className={styles.actionColumn} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">รายการที่</th>
            <th scope="col">วันส่งคำร้อง</th>
            <th scope="col">HN</th>
            <th scope="col">วันรับบริการ</th>
            <th scope="col">ประเภทบริการ</th>
            <th scope="col">ประเด็น</th>
            <th scope="col">ผลการตรวจสอบ</th>
            <th scope="col">หมายเหตุ</th>
            <th className={styles.finalHeader} scope="col">
              การดำเนินการ
              <span>กับข้อมูล</span>
            </th>
            <th aria-label="บันทึกหรือลบรายการ" scope="col" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const status = statuses[row.item_no];
            return (
              <tr key={row.item_no}>
                <th scope="row">
                  {row.item_no.toLocaleString("th-TH")}
                  {status ? (
                    <span
                      aria-label={STATUS_LABELS[status]}
                      className={`${styles.saveStatus} ${styles[status]}`}
                      role="status"
                      title={STATUS_LABELS[status]}
                    />
                  ) : null}
                </th>
                <td className={styles.editableCell}>
                  <BuddhistDatePicker
                    ariaLabel={`วันส่งคำร้อง รายการที่ ${row.item_no}`}
                    onChange={(next) => updateText(row, "comp_date", next)}
                    value={row.comp_date}
                  />
                </td>
                <td className={styles.editableCell}>
                  <input
                    aria-label={`HN รายการที่ ${row.item_no}`}
                    maxLength={30}
                    onChange={(event) => updateText(row, "hn", event.target.value)}
                    value={row.hn}
                  />
                </td>
                <td className={styles.editableCell}>
                  <BuddhistDatePicker
                    ariaLabel={`วันรับบริการ รายการที่ ${row.item_no}`}
                    onChange={(next) => updateText(row, "vstdate", next)}
                    value={row.vstdate}
                  />
                </td>
                <td className={styles.editableCell}>
                  <select
                    aria-label={`ประเภทบริการ รายการที่ ${row.item_no}`}
                    onChange={(event) =>
                      updateRow({ ...row, visit_type: event.target.value })}
                    value={row.visit_type}
                  >
                    <option value="" />
                    {visitTypes.map((visitType) => (
                      <option key={visitType.code} value={visitType.code}>
                        {visitType.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={styles.editableCell}>
                  <input
                    aria-label={`ประเด็น รายการที่ ${row.item_no}`}
                    maxLength={5000}
                    onChange={(event) => updateText(row, "issue", event.target.value)}
                    value={row.issue}
                  />
                </td>
                <td className={styles.editableCell}>
                  <select
                    aria-label={`ผลการตรวจสอบ รายการที่ ${row.item_no}`}
                    onChange={(event) =>
                      updateRow({ ...row, inspection_result: event.target.value })}
                    value={row.inspection_result}
                  >
                    <option value="" />
                    {inspectionResults.map((result) => (
                      <option key={result.code} value={result.code}>
                        {result.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={styles.editableCell}>
                  <textarea
                    aria-label={`หมายเหตุ รายการที่ ${row.item_no}`}
                    maxLength={5000}
                    onChange={(event) => updateText(row, "note", event.target.value)}
                    rows={1}
                    value={row.note}
                  />
                </td>
                <td className={styles.editableCell}>
                  <select
                    aria-label={`การดำเนินการ รายการที่ ${row.item_no}`}
                    className={
                      FINAL_RESULT_BADGE_CLASS[row.final_result]
                        ? `${styles.finalBadge} ${styles[FINAL_RESULT_BADGE_CLASS[row.final_result]]}`
                        : undefined
                    }
                    onChange={(event) =>
                      updateRow({ ...row, final_result: event.target.value })}
                    value={row.final_result}
                  >
                    <option value="" />
                    {finalResults.map((result) => (
                      <option key={result.code} value={result.code}>
                        {result.label}
                      </option>
                    ))}
                  </select>
                </td>
                <td className={styles.actionCell}>
                  {dirtyRows[row.item_no] ? (
                    <button
                      className={styles.saveButton}
                      onClick={() => void submitRow(row)}
                      type="button"
                    >
                      <Check aria-hidden="true" />
                      บันทึก
                    </button>
                  ) : (
                    <button
                      onClick={() => void confirmClearRow(row)}
                      type="button"
                    >
                      <X aria-hidden="true" />
                      ลบ
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
          <tr className={styles.addRow}>
            <td colSpan={10}>
              <button onClick={addRow} type="button">
                <Plus aria-hidden="true" />
                เพิ่มรายการ
              </button>
            </td>
          </tr>
        </tbody>
      </table>
      </div>
    </>
  );
}

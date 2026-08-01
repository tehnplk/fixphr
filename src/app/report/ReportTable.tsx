"use client";

import { ClipboardList, Plus } from "lucide-react";
import { useState } from "react";
import styles from "./page.module.css";

type ReportRow = {
  item_no: number;
  hn: string;
  vstdate: string;
  issue: string;
  inspection_result: string;
  note: string;
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

export default function ReportTable({
  hospitalCode,
  hospitalNameShort,
  initialRows,
  inspectionResults,
  total,
}: {
  hospitalCode: string;
  hospitalNameShort: string;
  initialRows: ReportRow[];
  inspectionResults: InspectionResult[];
  total: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [statuses, setStatuses] = useState<Record<number, SaveStatus>>({});
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
        vstdate: "",
        issue: "",
        inspection_result: "",
        note: "",
      },
    ].sort((left, right) => left.item_no - right.item_no));
  }

  function updateRow(nextRow: ReportRow) {
    setRows((currentRows) =>
      currentRows.map((row) => row.item_no === nextRow.item_no ? nextRow : row),
    );
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
      vstdate: "",
      issue: "",
      inspection_result: "",
      note: "",
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
  }

  function updateText(
    row: ReportRow,
    field: "hn" | "vstdate" | "issue" | "note",
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
        </div>
        <p>
          <span>ตรวจสอบแล้ว</span>
          <strong>{inspectedTotal.toLocaleString("th-TH")}</strong>
          <span>/</span>
          <strong>{displayTotal.toLocaleString("th-TH")}</strong>
          <span>รายการ</span>
        </p>
      </header>

      <div className={styles.tableTools}>
        <a
          className={styles.externalLink}
          href="https://phr1.moph.go.th/dashboard/"
          rel="noopener noreferrer"
          target="_blank"
        >
          เว็บตรวจสอบคำร้อง
        </a>
      </div>

      <div className={styles.tableCard}>
      <table>
        <colgroup>
          <col className={styles.numberColumn} />
          <col className={styles.hnColumn} />
          <col className={styles.vstdateColumn} />
          <col className={styles.issueColumn} />
          <col className={styles.resultColumn} />
          <col className={styles.noteColumn} />
          <col className={styles.actionColumn} />
        </colgroup>
        <thead>
          <tr>
            <th scope="col">รายการที่</th>
            <th scope="col">HN</th>
            <th scope="col">VISIT-DATE</th>
            <th scope="col">ประเด็น</th>
            <th scope="col">ผลการตรวจสอบ</th>
            <th scope="col">หมายเหตุ</th>
            <th aria-label="การดำเนินการ" scope="col" />
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
                  <input
                    aria-label={`HN รายการที่ ${row.item_no}`}
                    maxLength={30}
                    onBlur={() => void saveRow(row)}
                    onChange={(event) => updateText(row, "hn", event.target.value)}
                    value={row.hn}
                  />
                </td>
                <td className={styles.editableCell}>
                  <input
                    aria-label={`วันที่รับบริการ รายการที่ ${row.item_no}`}
                    maxLength={20}
                    onBlur={() => void saveRow(row)}
                    onChange={(event) => updateText(row, "vstdate", event.target.value)}
                    value={row.vstdate}
                  />
                </td>
                <td className={styles.editableCell}>
                  <input
                    aria-label={`ประเด็น รายการที่ ${row.item_no}`}
                    maxLength={5000}
                    onBlur={() => void saveRow(row)}
                    onChange={(event) => updateText(row, "issue", event.target.value)}
                    value={row.issue}
                  />
                </td>
                <td className={styles.editableCell}>
                  <select
                    aria-label={`ผลการตรวจสอบ รายการที่ ${row.item_no}`}
                    onChange={(event) => {
                      const nextRow = { ...row, inspection_result: event.target.value };
                      updateRow(nextRow);
                      void saveRow(nextRow);
                    }}
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
                    onBlur={() => void saveRow(row)}
                    onChange={(event) => updateText(row, "note", event.target.value)}
                    rows={1}
                    value={row.note}
                  />
                </td>
                <td className={styles.actionCell}>
                  <button
                    onClick={() => void clearRow(row)}
                    type="button"
                  >
                    ล้าง
                  </button>
                </td>
              </tr>
            );
          })}
          <tr className={styles.addRow}>
            <td colSpan={7}>
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

"use client";

import { ClipboardList } from "lucide-react";
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
  initialRows,
  inspectionResults,
  total,
}: {
  hospitalCode: string;
  initialRows: ReportRow[];
  inspectionResults: InspectionResult[];
  total: number;
}) {
  const [rows, setRows] = useState(initialRows);
  const [statuses, setStatuses] = useState<Record<number, SaveStatus>>({});
  const inspectedTotal = rows.filter((row) => row.inspection_result).length;

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
    } catch {
      setStatuses((current) => ({ ...current, [row.item_no]: "error" }));
    }
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
        <strong className={styles.hospitalCode}>{hospitalCode}</strong>
        <p>
          <span>ตรวจสอบแล้ว</span>
          <strong>{inspectedTotal.toLocaleString("th-TH")}</strong>
          <span>/</span>
          <strong>{total.toLocaleString("th-TH")}</strong>
          <span>รายการ</span>
        </p>
      </header>

      <div className={styles.tableCard}>
      <table>
        <colgroup>
          <col className={styles.numberColumn} />
          <col className={styles.hnColumn} />
          <col className={styles.vstdateColumn} />
          <col className={styles.issueColumn} />
          <col className={styles.resultColumn} />
          <col />
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
                  <input
                    aria-label={`หมายเหตุ รายการที่ ${row.item_no}`}
                    maxLength={5000}
                    onBlur={() => void saveRow(row)}
                    onChange={(event) => updateText(row, "note", event.target.value)}
                    value={row.note}
                  />
                </td>
                <td className={styles.actionCell}>
                  <button
                    onClick={() => {
                      const emptyRow = {
                        ...row,
                        hn: "",
                        vstdate: "",
                        issue: "",
                        inspection_result: "",
                        note: "",
                      };
                      updateRow(emptyRow);
                      void saveRow(emptyRow, true);
                    }}
                    type="button"
                  >
                    ล้าง
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      </div>
    </>
  );
}

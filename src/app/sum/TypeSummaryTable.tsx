"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";
import styles from "./page.module.css";

export type TypeColumn = {
  code: string;
  label: string;
};

export type TypeHospitalRow = {
  code: string;
  name: string;
  affiliation: string;
  cells: number[];
  total: number;
};

export type TypeSummaryRow = {
  district: string;
  cells: number[];
  total: number;
  hospitals: TypeHospitalRow[];
};

function formatNumber(value: number) {
  return value.toLocaleString("th-TH");
}

// label ใน inspection-result.json ขึ้นต้นด้วยเลขข้อ เช่น "3.1) Human Error โดยเจ้าหน้าที่"
// หัวตารางแยกเลขข้อไว้บรรทัดแรก แล้วให้ข้อความตัดบรรทัดเองด้านล่าง
function stripResultPrefix(label: string) {
  return label.replace(/^[\d.]+\)\s*/, "");
}

export default function TypeSummaryTable({
  columns,
  rows,
}: {
  columns: TypeColumn[];
  rows: TypeSummaryRow[];
}) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRow = rows.find((row) => row.district === selectedDistrict);
  const columnTotals = columns.map((_, index) => (
    rows.reduce((sum, row) => sum + row.cells[index], 0)
  ));
  const grandTotal = columnTotals.reduce((sum, count) => sum + count, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDistrict && !dialog.open) dialog.showModal();
    if (!selectedDistrict && dialog.open) dialog.close();
  }, [selectedDistrict]);

  return (
    <>
      <div className={styles.typeTableScroll}>
        <table className={styles.typeTable}>
          <thead>
            <tr>
              <th scope="col">อำเภอ</th>
              {columns.map((column) => (
                <th key={column.code} scope="col" title={column.label}>
                  <span className={styles.typeCode}>{column.code})</span>
                  <span className={styles.typeLabel}>
                    {stripResultPrefix(column.label)}
                  </span>
                </th>
              ))}
              <th scope="col">รวม</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.district}>
                <th scope="row">
                  <button
                    aria-haspopup="dialog"
                    className={styles.districtButton}
                    onClick={() => setSelectedDistrict(row.district)}
                    type="button"
                  >
                    {row.district}
                  </button>
                </th>
                {row.cells.map((count, index) => (
                  <td key={columns[index].code}>{formatNumber(count)}</td>
                ))}
                <td>{formatNumber(row.total)}</td>
              </tr>
            ))}
            <tr className={styles.totalRow}>
              <th scope="row">รวม</th>
              {columnTotals.map((count, index) => (
                <td key={columns[index].code}>{formatNumber(count)}</td>
              ))}
              <td>{formatNumber(grandTotal)}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <dialog
        aria-label={`ผลการตรวจสอบของหน่วยบริการ อำเภอ${selectedRow?.district ?? ""}`}
        className={styles.districtDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedDistrict(null);
        }}
        onClose={() => setSelectedDistrict(null)}
        ref={dialogRef}
      >
        {selectedRow ? (
          <div className={styles.modalShell}>
            <div className={styles.modalTableWrap}>
              <table className={styles.modalTable}>
                <thead>
                  <tr className={styles.modalToolbarRow}>
                    <th colSpan={columns.length + 5}>
                      <button
                        aria-label="ปิดหน้าต่าง"
                        className={styles.modalClose}
                        onClick={() => setSelectedDistrict(null)}
                        type="button"
                      >
                        <X aria-hidden="true" />
                      </button>
                    </th>
                  </tr>
                  <tr>
                    <th scope="col">รหัส</th>
                    <th scope="col">ชื่อหน่วยบริการ</th>
                    <th scope="col">สังกัด</th>
                    {columns.map((column) => (
                      <th key={column.code} scope="col" title={column.label}>
                        {column.code})
                      </th>
                    ))}
                    <th scope="col">รวม</th>
                    <th aria-label="การดำเนินการ" className={styles.modalActionColumn} scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.hospitals.map((hospital) => (
                    <tr key={hospital.code}>
                      <td>{hospital.code}</td>
                      <th scope="row">{hospital.name}</th>
                      <td>{hospital.affiliation}</td>
                      {hospital.cells.map((count, index) => (
                        <td key={columns[index].code}>{formatNumber(count)}</td>
                      ))}
                      <td>{formatNumber(hospital.total)}</td>
                      <td className={styles.modalActionColumn}>
                        <Link
                          aria-label={`เปิดรายงาน ${hospital.name}`}
                          className={styles.modalActionLink}
                          href={{ pathname: "/report", query: { hos: hospital.code } }}
                        >
                          <FileText aria-hidden="true" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th colSpan={3} scope="row">รวม</th>
                    {selectedRow.cells.map((count, index) => (
                      <td key={columns[index].code}>{formatNumber(count)}</td>
                    ))}
                    <td>{formatNumber(selectedRow.total)}</td>
                    <td className={styles.modalActionColumn} />
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        ) : null}
      </dialog>
    </>
  );
}

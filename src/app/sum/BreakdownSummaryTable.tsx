"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";
import styles from "./page.module.css";

export type BreakdownColumn = {
  code: string;
  label: string;
};

export type BreakdownHospitalRow = {
  code: string;
  name: string;
  affiliation: string;
  complaints: number;
  cells: number[];
};

export type BreakdownSummaryRow = {
  district: string;
  complaints: number;
  cells: number[];
  hospitals: BreakdownHospitalRow[];
};

function formatNumber(value: number) {
  if (value === 0) return <span className={styles.zeroCell}>-</span>;
  return value.toLocaleString("th-TH");
}

// ร้อยละคิดจากจำนวนคำร้อง (masks) เป็นฐานเสมอ เหมือนแท็บอื่น
// ยังไม่มีรายการของประเภทนั้นให้ขึ้นขีดจาง ไม่ใช่ "0.00"
function formatPercent(value: number, total: number) {
  if (total === 0 || value === 0) return <span className={styles.zeroCell}>-</span>;
  return Math.min((value / total) * 100, 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

// label ใน visit_type.json ขึ้นต้นด้วยเลขข้อ เช่น "2) บริการ OPD/IPD"
// หัวคอลัมน์ที่ไม่มีเลขข้อ (เช่น ปี พ.ศ.) ผ่านฟังก์ชันนี้แล้วไม่เปลี่ยน
function stripColumnPrefix(label: string) {
  return label.replace(/^[\d.]+\)\s*/, "");
}

// คู่คอลัมน์ (จำนวน/ร้อยละ) ของกลุ่มเดียวกันใช้สีพื้นเดียวกัน
// กลุ่มที่มีไม่กี่กลุ่ม (ประเภทบริการ) วนสามสีให้แต่ละกลุ่มต่างกันไปเลย
// กลุ่มที่มีเยอะ (รายปี) สลับสองสีไปมา ให้เห็นขอบเขตของแต่ละปีชัด ๆ
const GROUP_TINTS = [styles.vtGroupA, styles.vtGroupB, styles.vtGroupC];
const ALTERNATING_TINTS = [styles.vtGroupA, styles.vtGroupB];

export default function BreakdownSummaryTable({
  columns,
  rows,
  countSuffix = " (ครั้ง)",
  countLabel = "ครั้ง",
  dense = false,
  alternateTints = false,
}: {
  columns: BreakdownColumn[];
  rows: BreakdownSummaryRow[];
  /* หัวคอลัมน์ในโมดัล ซึ่งไม่มีแถวกลุ่ม จึงต้องมีชื่อกลุ่มติดอยู่ที่หัวคอลัมน์เอง
     ปีที่รับบริการไม่ต้องมีส่วนต่อท้าย เพราะหัวคอลัมน์สั้นอยู่แล้ว */
  countSuffix?: string;
  /* หัวคอลัมน์นับในตารางหลัก ซึ่งมีชื่อกลุ่มอยู่แถวบนแล้ว */
  countLabel?: string;
  /* ตารางที่มีคอลัมน์เยอะ (เช่น รายปี) ย่อฟอนต์กับ padding ให้พอดีจอ ไม่ต้องเลื่อนแนวนอน
     ตัวห่อยังคง overflow auto ไว้เป็นทางหนีทีไล่เมื่อปีสะสมมากจนย่อแล้วยังไม่พอ */
  dense?: boolean;
  /* สลับสองสีไปมาแทนการวนสามสี — ใช้กับกลุ่มที่มีจำนวนมากอย่างรายปี */
  alternateTints?: boolean;
}) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRow = rows.find((row) => row.district === selectedDistrict);
  const grandComplaints = rows.reduce((sum, row) => sum + row.complaints, 0);
  const columnTotals = columns.map((_, index) => (
    rows.reduce((sum, row) => sum + row.cells[index], 0)
  ));
  const tints = alternateTints ? ALTERNATING_TINTS : GROUP_TINTS;
  const groupTint = (index: number) => tints[index % tints.length];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDistrict && !dialog.open) dialog.showModal();
    if (!selectedDistrict && dialog.open) dialog.close();
  }, [selectedDistrict]);

  return (
    <>
      <div className={styles.typeTableScroll}>
      <table
        className={
          dense
            ? `${styles.visitTypeTable} ${styles.denseTable}`
            : styles.visitTypeTable
        }
      >
        {/* หัวตารางสองชั้น — ลำดับ อำเภอ และคำร้องไม่อยู่ในกลุ่มไหน จึงคร่อมสองแถวด้วย rowSpan
            ชั้นบนเป็นกลุ่ม ชั้นล่างเป็นคอลัมน์จริง (จำนวน/ร้อยละ) ของแต่ละกลุ่ม */}
        <thead>
          <tr className={styles.groupRow}>
            <th className={styles.indexHead} rowSpan={2} scope="col">#</th>
            <th rowSpan={2} scope="col">อำเภอ</th>
            <th rowSpan={2} scope="col">คำร้อง (ครั้ง)</th>
            {columns.map((column, columnIndex) => (
              <th
                className={groupTint(columnIndex)}
                colSpan={2}
                key={column.code}
                scope="colgroup"
              >
                {stripColumnPrefix(column.label)}
              </th>
            ))}
          </tr>
          <tr className={styles.subRow}>
            {columns.map((column, columnIndex) => (
              <Fragment key={column.code}>
                <th className={groupTint(columnIndex)} scope="col">{countLabel}</th>
                <th className={groupTint(columnIndex)} scope="col">ร้อยละ</th>
              </Fragment>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.district}>
              <td className={styles.rowIndex}>{index + 1}</td>
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
              <td>{formatNumber(row.complaints)}</td>
              {columns.map((column, columnIndex) => (
                <Fragment key={column.code}>
                  <td className={groupTint(columnIndex)}>
                    {formatNumber(row.cells[columnIndex])}
                  </td>
                  <td className={groupTint(columnIndex)}>
                    {formatPercent(row.cells[columnIndex], row.complaints)}
                  </td>
                </Fragment>
              ))}
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td className={styles.rowIndex} />
            <th scope="row">รวม</th>
            <td>{formatNumber(grandComplaints)}</td>
            {columns.map((column, columnIndex) => (
              <Fragment key={column.code}>
                <td className={groupTint(columnIndex)}>
                  {formatNumber(columnTotals[columnIndex])}
                </td>
                <td className={groupTint(columnIndex)}>
                  {formatPercent(columnTotals[columnIndex], grandComplaints)}
                </td>
              </Fragment>
            ))}
          </tr>
        </tbody>
      </table>
      </div>

      <dialog
        aria-label={`รายละเอียดหน่วยบริการ อำเภอ${selectedRow?.district ?? ""}`}
        className={styles.districtDialog}
        onClick={(event) => {
          if (event.target === event.currentTarget) setSelectedDistrict(null);
        }}
        onClose={() => setSelectedDistrict(null)}
        ref={dialogRef}
      >
        {selectedRow ? (
          <div className={styles.modalShell}>
            {/* ตารางในโมดัลกว้างกว่ากรอบได้ (เช่น แท็บรายปี) ปุ่มปิดจึงลอยอยู่กับกรอบ
                ไม่ใช่อยู่ในแถวหัวตารางที่เลื่อนหายไปทางขวา */}
            <button
              aria-label="ปิดหน้าต่าง"
              className={`${styles.modalClose} ${styles.modalCloseFloat}`}
              onClick={() => setSelectedDistrict(null)}
              type="button"
            >
              <X aria-hidden="true" />
            </button>
            <div className={styles.modalTableWrap}>
              <table
                className={
                  dense
                    ? `${styles.modalTable} ${styles.compModalTable} ${styles.denseModalTable}`
                    : `${styles.modalTable} ${styles.compModalTable}`
                }
              >
                <thead>
                  <tr className={styles.modalToolbarRow}>
                    <th colSpan={5 + columns.length * 2} />
                  </tr>
                  <tr>
                    <th scope="col">รหัส</th>
                    <th scope="col">ชื่อหน่วยบริการ</th>
                    <th scope="col">สังกัด</th>
                    <th scope="col">คำร้อง (ครั้ง)</th>
                    {columns.map((column, columnIndex) => (
                      <Fragment key={column.code}>
                        <th className={groupTint(columnIndex)} scope="col">
                          {stripColumnPrefix(column.label)}{countSuffix}
                        </th>
                        <th className={groupTint(columnIndex)} scope="col">ร้อยละ</th>
                      </Fragment>
                    ))}
                    <th aria-label="การดำเนินการ" className={styles.modalActionColumn} scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.hospitals.map((hospital) => (
                    <tr key={hospital.code}>
                      <td>{hospital.code}</td>
                      <th scope="row">{hospital.name}</th>
                      <td>{hospital.affiliation}</td>
                      <td>{formatNumber(hospital.complaints)}</td>
                      {columns.map((column, columnIndex) => (
                        <Fragment key={column.code}>
                          <td className={groupTint(columnIndex)}>
                            {formatNumber(hospital.cells[columnIndex])}
                          </td>
                          <td className={groupTint(columnIndex)}>
                            {formatPercent(hospital.cells[columnIndex], hospital.complaints)}
                          </td>
                        </Fragment>
                      ))}
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
                    <td>{formatNumber(selectedRow.complaints)}</td>
                    {columns.map((column, columnIndex) => (
                      <Fragment key={column.code}>
                        <td className={groupTint(columnIndex)}>
                          {formatNumber(selectedRow.cells[columnIndex])}
                        </td>
                        <td className={groupTint(columnIndex)}>
                          {formatPercent(selectedRow.cells[columnIndex], selectedRow.complaints)}
                        </td>
                      </Fragment>
                    ))}
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

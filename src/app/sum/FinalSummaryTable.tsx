"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";
import styles from "./page.module.css";

export type FinalHospitalRow = {
  code: string;
  name: string;
  affiliation: string;
  target: number;
  confirmed: number;
  edited: number;
  deleted: number;
  pending: number;
};

export type FinalSummaryRow = {
  district: string;
  target: number;
  confirmed: number;
  edited: number;
  deleted: number;
  pending: number;
  hospitals: FinalHospitalRow[];
};

function formatNumber(value: number) {
  if (value === 0) return <span className={styles.zeroCell}>-</span>;
  return value.toLocaleString("th-TH");
}

export default function FinalSummaryTable({ rows }: { rows: FinalSummaryRow[] }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRow = rows.find((row) => row.district === selectedDistrict);
  const grand = rows.reduce(
    (total, row) => ({
      target: total.target + row.target,
      confirmed: total.confirmed + row.confirmed,
      edited: total.edited + row.edited,
      deleted: total.deleted + row.deleted,
      pending: total.pending + row.pending,
    }),
    { target: 0, confirmed: 0, edited: 0, deleted: 0, pending: 0 },
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDistrict && !dialog.open) dialog.showModal();
    if (!selectedDistrict && dialog.open) dialog.close();
  }, [selectedDistrict]);

  return (
    <>
      <table className={styles.finalTable}>
        <thead>
          <tr>
            <th scope="col">อำเภอ</th>
            <th scope="col">จำนวนรายการ</th>
            <th scope="col">ยืนยันคงเดิม</th>
            <th scope="col">แก้ไข</th>
            <th scope="col">ลบ</th>
            <th scope="col">อยู่ระหว่างดำเนินการ</th>
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
              <td>{formatNumber(row.target)}</td>
              <td>{formatNumber(row.confirmed)}</td>
              <td>{formatNumber(row.edited)}</td>
              <td>{formatNumber(row.deleted)}</td>
              <td>{formatNumber(row.pending)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <th scope="row">รวม</th>
            <td>{formatNumber(grand.target)}</td>
            <td>{formatNumber(grand.confirmed)}</td>
            <td>{formatNumber(grand.edited)}</td>
            <td>{formatNumber(grand.deleted)}</td>
            <td>{formatNumber(grand.pending)}</td>
          </tr>
        </tbody>
      </table>

      <dialog
        aria-label={`การดำเนินการของหน่วยบริการ อำเภอ${selectedRow?.district ?? ""}`}
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
                    <th colSpan={9}>
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
                    <th scope="col">จำนวนรายการ</th>
                    <th scope="col">ยืนยันคงเดิม</th>
                    <th scope="col">แก้ไข</th>
                    <th scope="col">ลบ</th>
                    <th scope="col">อยู่ระหว่างดำเนินการ</th>
                    <th aria-label="การดำเนินการ" className={styles.modalActionColumn} scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.hospitals.map((hospital) => (
                    <tr key={hospital.code}>
                      <td>{hospital.code}</td>
                      <th scope="row">{hospital.name}</th>
                      <td>{hospital.affiliation}</td>
                      <td>{formatNumber(hospital.target)}</td>
                      <td>{formatNumber(hospital.confirmed)}</td>
                      <td>{formatNumber(hospital.edited)}</td>
                      <td>{formatNumber(hospital.deleted)}</td>
                      <td>{formatNumber(hospital.pending)}</td>
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
                    <td>{formatNumber(selectedRow.target)}</td>
                    <td>{formatNumber(selectedRow.confirmed)}</td>
                    <td>{formatNumber(selectedRow.edited)}</td>
                    <td>{formatNumber(selectedRow.deleted)}</td>
                    <td>{formatNumber(selectedRow.pending)}</td>
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

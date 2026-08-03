"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";
import styles from "./page.module.css";

export type DistrictHospitalRow = {
  code: string;
  name: string;
  affiliation: string;
  target: number;
  result: number;
};

export type DistrictSummaryRow = {
  district: string;
  target: number;
  result: number;
  hospitals: DistrictHospitalRow[];
};

function formatNumber(value: number) {
  if (value === 0) return <span className={styles.zeroCell}>-</span>;
  return value.toLocaleString("th-TH");
}

function formatPercent(value: number, total: number) {
  if (total === 0) return "0.00";
  return Math.min((value / total) * 100, 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function DistrictSummaryTable({ rows }: { rows: DistrictSummaryRow[] }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRow = rows.find((row) => row.district === selectedDistrict);
  const grandTarget = rows.reduce((sum, row) => sum + row.target, 0);
  const grandResult = rows.reduce((sum, row) => sum + row.result, 0);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDistrict && !dialog.open) dialog.showModal();
    if (!selectedDistrict && dialog.open) dialog.close();
  }, [selectedDistrict]);

  return (
    <>
      <table>
        <thead>
          <tr>
            <th scope="col">อำเภอ</th>
            <th scope="col">จำนวนรายการ</th>
            <th scope="col">ตรวจสอบแล้ว</th>
            <th scope="col">ร้อยละ</th>
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
              <td>{formatNumber(row.result)}</td>
              <td>{formatPercent(row.result, row.target)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <th scope="row">รวม</th>
            <td>{formatNumber(grandTarget)}</td>
            <td>{formatNumber(grandResult)}</td>
            <td>{formatPercent(grandResult, grandTarget)}</td>
          </tr>
        </tbody>
      </table>

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
            <div className={styles.modalTableWrap}>
              <table className={styles.modalTable}>
                <thead>
                  <tr className={styles.modalToolbarRow}>
                    <th colSpan={7}>
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
                    <th scope="col">ตรวจสอบแล้ว</th>
                    <th scope="col">ร้อยละ</th>
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
                      <td>{formatNumber(hospital.result)}</td>
                      <td>{formatPercent(hospital.result, hospital.target)}</td>
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
                    <td>{formatNumber(selectedRow.result)}</td>
                    <td>{formatPercent(selectedRow.result, selectedRow.target)}</td>
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

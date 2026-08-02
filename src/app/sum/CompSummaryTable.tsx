"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, X } from "lucide-react";
import styles from "./page.module.css";

export type CompHospitalRow = {
  code: string;
  name: string;
  affiliation: string;
  complainants: number;
  complaints: number;
};

export type CompSummaryRow = {
  district: string;
  complainants: number;
  complaints: number;
  hospitals: CompHospitalRow[];
};

function formatNumber(value: number) {
  if (value === 0) return <span className={styles.zeroCell}>-</span>;
  return value.toLocaleString("th-TH");
}

// เฉลี่ยคำนวณจากยอดรวมจริง ไม่ใช่ค่าเฉลี่ยของค่าเฉลี่ยรายหน่วยบริการ
function formatAverage(complaints: number, complainants: number) {
  if (complainants === 0) return <span className={styles.zeroCell}>-</span>;
  return (complaints / complainants).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function CompSummaryTable({ rows }: { rows: CompSummaryRow[] }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRow = rows.find((row) => row.district === selectedDistrict);
  const grand = rows.reduce(
    (total, row) => ({
      complainants: total.complainants + row.complainants,
      complaints: total.complaints + row.complaints,
    }),
    { complainants: 0, complaints: 0 },
  );

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (selectedDistrict && !dialog.open) dialog.showModal();
    if (!selectedDistrict && dialog.open) dialog.close();
  }, [selectedDistrict]);

  return (
    <>
      <table className={styles.compTable}>
        <thead>
          <tr>
            <th scope="col">อำเภอ</th>
            <th scope="col">จำนวนผู้ร้อง (คน)</th>
            <th scope="col">จำนวนคำร้อง (ครั้ง)</th>
            <th scope="col">เฉลี่ยคนละ (ครั้ง)</th>
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
              <td>{formatNumber(row.complainants)}</td>
              <td>{formatNumber(row.complaints)}</td>
              <td>{formatAverage(row.complaints, row.complainants)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <th scope="row">รวม</th>
            <td>{formatNumber(grand.complainants)}</td>
            <td>{formatNumber(grand.complaints)}</td>
            <td>{formatAverage(grand.complaints, grand.complainants)}</td>
          </tr>
        </tbody>
      </table>

      <dialog
        aria-label={`จำนวนคำร้องของหน่วยบริการ อำเภอ${selectedRow?.district ?? ""}`}
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
                    <th scope="col">จำนวนผู้ร้อง (คน)</th>
                    <th scope="col">จำนวนคำร้อง (ครั้ง)</th>
                    <th scope="col">เฉลี่ยคนละ (ครั้ง)</th>
                    <th aria-label="การดำเนินการ" className={styles.modalActionColumn} scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.hospitals.map((hospital) => (
                    <tr key={hospital.code}>
                      <td>{hospital.code}</td>
                      <th scope="row">{hospital.name}</th>
                      <td>{hospital.affiliation}</td>
                      <td>{formatNumber(hospital.complainants)}</td>
                      <td>{formatNumber(hospital.complaints)}</td>
                      <td>
                        {formatAverage(hospital.complaints, hospital.complainants)}
                      </td>
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
                    <td>{formatNumber(selectedRow.complainants)}</td>
                    <td>{formatNumber(selectedRow.complaints)}</td>
                    <td>
                      {formatAverage(selectedRow.complaints, selectedRow.complainants)}
                    </td>
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

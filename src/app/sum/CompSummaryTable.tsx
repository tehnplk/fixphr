"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { FileText, MessageCircle, X } from "lucide-react";
import styles from "./page.module.css";

export type CompHospitalRow = {
  code: string;
  name: string;
  affiliation: string;
  complainants: number;
  complaints: number;
  answered: number;
};

export type CompSummaryRow = {
  district: string;
  complainants: number;
  complaints: number;
  answered: number;
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

// ร้อยละตอบกลับคิดจากจำนวนคำร้อง (masks) เป็นฐานเสมอ
// ยังไม่มีการตอบกลับให้ขึ้นขีดแบบเดียวกับคอลัมน์จำนวน ไม่ใช่ "0.00"
function formatAnsweredPercent(answered: number, complaints: number) {
  if (complaints === 0 || answered === 0) return <span className={styles.zeroCell}>-</span>;
  return Math.min((answered / complaints) * 100, 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/* หัวกลุ่ม = ไอคอน + ข้อความ ไอคอนเป็นภาพประกอบ ข้อความยังเป็นตัวบอกความหมายจริง */
function GroupHead({ icon: Icon, label }: { icon: typeof FileText; label: string }) {
  return (
    <span className={styles.thLabel}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
}

export default function CompSummaryTable({ rows }: { rows: CompSummaryRow[] }) {
  const [selectedDistrict, setSelectedDistrict] = useState<string | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const selectedRow = rows.find((row) => row.district === selectedDistrict);
  const grand = rows.reduce(
    (total, row) => ({
      complainants: total.complainants + row.complainants,
      complaints: total.complaints + row.complaints,
      answered: total.answered + row.answered,
    }),
    { complainants: 0, complaints: 0, answered: 0 },
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
        {/* หัวตารางสองชั้น — ชั้นบนเป็นกลุ่ม (คำร้อง / ตอบกลับ) ชั้นล่างเป็นคอลัมน์จริง
            ลำดับกับอำเภอไม่อยู่ในกลุ่มไหน จึงคร่อมสองแถวด้วย rowSpan */}
        <thead>
          <tr className={styles.groupRow}>
            <th className={styles.indexHead} rowSpan={2} scope="col">#</th>
            <th rowSpan={2} scope="col">อำเภอ</th>
            <th colSpan={3} scope="colgroup">
              <GroupHead icon={FileText} label="คำร้อง" />
            </th>
            <th colSpan={2} scope="colgroup">
              <GroupHead icon={MessageCircle} label="ตอบกลับ" />
            </th>
          </tr>
          <tr className={styles.subRow}>
            <th scope="col">ผู้ร้อง (คน)</th>
            <th scope="col">จำนวน (ครั้ง)</th>
            <th scope="col">เฉลี่ยคนละ (ครั้ง)</th>
            <th scope="col">จำนวน (ครั้ง)</th>
            <th scope="col">ร้อยละ</th>
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
              <td>{formatNumber(row.complainants)}</td>
              <td>{formatNumber(row.complaints)}</td>
              <td>{formatAverage(row.complaints, row.complainants)}</td>
              <td>{formatNumber(row.answered)}</td>
              <td>{formatAnsweredPercent(row.answered, row.complaints)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td className={styles.rowIndex} />
            <th scope="row">รวม</th>
            <td>{formatNumber(grand.complainants)}</td>
            <td>{formatNumber(grand.complaints)}</td>
            <td>{formatAverage(grand.complaints, grand.complainants)}</td>
            <td>{formatNumber(grand.answered)}</td>
            <td>{formatAnsweredPercent(grand.answered, grand.complaints)}</td>
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
              <table className={`${styles.modalTable} ${styles.compModalTable}`}>
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
                    <th scope="col">จำนวนผู้ร้อง (คน)</th>
                    <th scope="col">จำนวนคำร้อง (ครั้ง)</th>
                    <th scope="col">เฉลี่ยคนละ (ครั้ง)</th>
                    <th scope="col">ตอบกลับแล้ว (ครั้ง)</th>
                    <th scope="col">ร้อยละตอบกลับ</th>
                    <th aria-label="การดำเนินการ" className={styles.modalActionColumn} scope="col" />
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.hospitals.map((hospital) => (
                    <tr key={hospital.code}>
                      <td>{hospital.code}</td>
                      <th scope="row">
                        <Link
                          className={styles.modalNameLink}
                          href={{ pathname: "/report", query: { hos: hospital.code } }}
                        >
                          {hospital.name}
                        </Link>
                      </th>
                      <td>{hospital.affiliation}</td>
                      <td>{formatNumber(hospital.complainants)}</td>
                      <td>{formatNumber(hospital.complaints)}</td>
                      <td>
                        {formatAverage(hospital.complaints, hospital.complainants)}
                      </td>
                      <td>{formatNumber(hospital.answered)}</td>
                      <td>
                        {formatAnsweredPercent(hospital.answered, hospital.complaints)}
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
                    <td>{formatNumber(selectedRow.answered)}</td>
                    <td>
                      {formatAnsweredPercent(selectedRow.answered, selectedRow.complaints)}
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

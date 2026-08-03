"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  Building2,
  ClipboardList,
  Clock,
  FileText,
  Hash,
  Landmark,
  MapPin,
  Pencil,
  ShieldCheck,
  X,
} from "lucide-react";
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

/* คอลัมน์สถานะใช้ badge แยกสี — ค่า 0 ยังคงเป็นขีดจาง ไม่ต้องมี badge */
function formatBadge(value: number, className: string) {
  if (value === 0) return <span className={styles.zeroCell}>-</span>;
  return <span className={className}>{value.toLocaleString("th-TH")}</span>;
}

const formatConfirmed = (value: number) => formatBadge(value, styles.confirmBadge);
const formatEdited = (value: number) => formatBadge(value, styles.editBadge);
const formatDeleted = (value: number) => formatBadge(value, styles.deleteBadge);
const formatPending = (value: number) => formatBadge(value, styles.pendingBadge);

/* หัวคอลัมน์ = ไอคอน + ข้อความ ไอคอนเป็นภาพประกอบ ข้อความยังเป็นตัวบอกความหมายจริง */
function ColumnHead({ icon: Icon, label }: { icon: typeof MapPin; label: string }) {
  return (
    <span className={styles.thLabel}>
      <Icon aria-hidden="true" />
      {label}
    </span>
  );
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
            <th scope="col">#</th>
            <th scope="col"><ColumnHead icon={MapPin} label="อำเภอ" /></th>
            <th scope="col"><ColumnHead icon={ClipboardList} label="จำนวนรายการ" /></th>
            <th scope="col"><ColumnHead icon={ShieldCheck} label="ยืนยันคงเดิม" /></th>
            <th scope="col"><ColumnHead icon={Pencil} label="แก้ไข" /></th>
            <th scope="col"><ColumnHead icon={X} label="ลบ" /></th>
            <th scope="col"><ColumnHead icon={Clock} label="อยู่ระหว่างดำเนินการ" /></th>
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
              <td>{formatNumber(row.target)}</td>
              <td>{formatConfirmed(row.confirmed)}</td>
              <td>{formatEdited(row.edited)}</td>
              <td>{formatDeleted(row.deleted)}</td>
              <td>{formatPending(row.pending)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td className={styles.rowIndex} />
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
                    <th scope="col"><ColumnHead icon={Hash} label="รหัส" /></th>
                    <th scope="col"><ColumnHead icon={Building2} label="ชื่อหน่วยบริการ" /></th>
                    <th scope="col"><ColumnHead icon={Landmark} label="สังกัด" /></th>
                    <th scope="col"><ColumnHead icon={ClipboardList} label="จำนวนรายการ" /></th>
                    <th scope="col"><ColumnHead icon={ShieldCheck} label="ยืนยันคงเดิม" /></th>
                    <th scope="col"><ColumnHead icon={Pencil} label="แก้ไข" /></th>
                    <th scope="col"><ColumnHead icon={X} label="ลบ" /></th>
                    <th scope="col"><ColumnHead icon={Clock} label="อยู่ระหว่างดำเนินการ" /></th>
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
                      <td>{formatConfirmed(hospital.confirmed)}</td>
                      <td>{formatEdited(hospital.edited)}</td>
                      <td>{formatDeleted(hospital.deleted)}</td>
                      <td>{formatPending(hospital.pending)}</td>
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

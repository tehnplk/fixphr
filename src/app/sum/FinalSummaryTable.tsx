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

function closedCount(row: { confirmed: number; edited: number; deleted: number }) {
  return row.confirmed + row.edited + row.deleted;
}

function formatPercent(value: number, total: number) {
  if (total === 0 || value === 0) return <span className={styles.zeroCell}>-</span>;
  return Math.min((value / total) * 100, 100).toLocaleString("th-TH", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
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
          <tr className={styles.groupRow}>
            <th className={styles.indexHead} rowSpan={2} scope="col">#</th>
            <th rowSpan={2} scope="col"><ColumnHead icon={MapPin} label="อำเภอ" /></th>
            <th rowSpan={2} scope="col"><ColumnHead icon={ClipboardList} label="จำนวนคำร้อง" /></th>
            <th className={styles.pendingHead} rowSpan={2} scope="col"><ColumnHead icon={Clock} label="อยู่ระหว่างดำเนินการ" /></th>
            <th colSpan={5} scope="colgroup"><ColumnHead icon={ShieldCheck} label="ดำเนินการแล้ว" /></th>
          </tr>
          <tr className={styles.subRow}>
            <th className={styles.finalActionGroup} scope="col"><ColumnHead icon={ShieldCheck} label="ยืนยันคงเดิม" /></th>
            <th className={styles.finalActionGroup} scope="col"><ColumnHead icon={Pencil} label="แก้ไข" /></th>
            <th className={styles.finalActionGroup} scope="col"><ColumnHead icon={X} label="ลบ" /></th>
            <th className={styles.finalSummaryGroup} scope="col">รวม</th>
            <th className={styles.finalSummaryGroup} scope="col">ร้อยละ</th>
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
              <td>{formatPending(row.pending)}</td>
              <td className={styles.finalActionGroup}>{formatConfirmed(row.confirmed)}</td>
              <td className={styles.finalActionGroup}>{formatEdited(row.edited)}</td>
              <td className={styles.finalActionGroup}>{formatDeleted(row.deleted)}</td>
              <td className={styles.finalSummaryGroup}>{formatNumber(closedCount(row))}</td>
              <td className={styles.finalSummaryGroup}>{formatPercent(closedCount(row), row.target)}</td>
            </tr>
          ))}
          <tr className={styles.totalRow}>
            <td className={styles.rowIndex} />
            <th scope="row">รวม</th>
            <td>{formatNumber(grand.target)}</td>
            <td>{formatNumber(grand.pending)}</td>
            <td className={styles.finalActionGroup}>{formatNumber(grand.confirmed)}</td>
            <td className={styles.finalActionGroup}>{formatNumber(grand.edited)}</td>
            <td className={styles.finalActionGroup}>{formatNumber(grand.deleted)}</td>
            <td className={styles.finalSummaryGroup}>{formatNumber(closedCount(grand))}</td>
            <td className={styles.finalSummaryGroup}>{formatPercent(closedCount(grand), grand.target)}</td>
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
              <table className={`${styles.modalTable} ${styles.finalModalTable}`}>
                <thead>
                  <tr className={styles.modalToolbarRow}>
                    <th colSpan={11}>
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
                  <tr className={styles.modalGroupRow}>
                    <th rowSpan={2} scope="col"><ColumnHead icon={Hash} label="รหัส" /></th>
                    <th rowSpan={2} scope="col"><ColumnHead icon={Building2} label="ชื่อหน่วยบริการ" /></th>
                    <th rowSpan={2} scope="col"><ColumnHead icon={Landmark} label="สังกัด" /></th>
                    <th rowSpan={2} scope="col"><ColumnHead icon={ClipboardList} label="จำนวนคำร้อง" /></th>
                    <th className={styles.pendingHead} rowSpan={2} scope="col"><ColumnHead icon={Clock} label="อยู่ระหว่างดำเนินการ" /></th>
                    <th colSpan={5} scope="colgroup"><ColumnHead icon={ShieldCheck} label="ดำเนินการแล้ว" /></th>
                    <th aria-label="การดำเนินการ" className={styles.modalActionColumn} rowSpan={2} scope="col" />
                  </tr>
                  <tr className={styles.modalSubRow}>
                    <th className={styles.finalActionGroup} scope="col"><ColumnHead icon={ShieldCheck} label="ยืนยันคงเดิม" /></th>
                    <th className={styles.finalActionGroup} scope="col"><ColumnHead icon={Pencil} label="แก้ไข" /></th>
                    <th className={styles.finalActionGroup} scope="col"><ColumnHead icon={X} label="ลบ" /></th>
                    <th className={styles.finalSummaryGroup} scope="col">รวม</th>
                    <th className={styles.finalSummaryGroup} scope="col">ร้อยละ</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedRow.hospitals.map((hospital) => (
                    <tr key={hospital.code}>
                      <td>{hospital.code}</td>
                      <th scope="row">{hospital.name}</th>
                      <td>{hospital.affiliation}</td>
                      <td>{formatNumber(hospital.target)}</td>
                      <td>{formatPending(hospital.pending)}</td>
                      <td className={styles.finalActionGroup}>{formatConfirmed(hospital.confirmed)}</td>
                      <td className={styles.finalActionGroup}>{formatEdited(hospital.edited)}</td>
                      <td className={styles.finalActionGroup}>{formatDeleted(hospital.deleted)}</td>
                      <td className={styles.finalSummaryGroup}>{formatNumber(closedCount(hospital))}</td>
                      <td className={styles.finalSummaryGroup}>{formatPercent(closedCount(hospital), hospital.target)}</td>
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
                    <td>{formatNumber(selectedRow.pending)}</td>
                    <td className={styles.finalActionGroup}>{formatNumber(selectedRow.confirmed)}</td>
                    <td className={styles.finalActionGroup}>{formatNumber(selectedRow.edited)}</td>
                    <td className={styles.finalActionGroup}>{formatNumber(selectedRow.deleted)}</td>
                    <td className={styles.finalSummaryGroup}>{formatNumber(closedCount(selectedRow))}</td>
                    <td className={styles.finalSummaryGroup}>{formatPercent(closedCount(selectedRow), selectedRow.target)}</td>
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

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, AlertTriangle, CheckCircle2, RefreshCw, Send, Sheet } from "lucide-react";
import styles from "./page.module.css";

type SendState =
  | { kind: "idle" }
  | { kind: "sending" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function SendSheetForm({
  endpointLabel,
  rowCount,
  hospitalCount,
  columnCount,
}: {
  endpointLabel: string;
  rowCount: number;
  hospitalCount: number;
  columnCount: number;
}) {
  const router = useRouter();
  const [state, setState] = useState<SendState>({ kind: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "sending" || rowCount === 0) return;

    setState({ kind: "sending" });

    try {
      const response = await fetch("/api/report-sheet", { method: "POST" });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "ส่งรายงานไม่สำเร็จ");
      }

      setState({ kind: "success", message: result.message || "ส่งรายงานสำเร็จ" });
      router.refresh();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "ส่งรายงานไม่สำเร็จ",
      });
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className={styles.stepLabel}><span>01</span> ปลายทางและข้อมูลที่จะส่ง</div>

      <div className={styles.target}>
        <div className={styles.targetHead}>
          <span className={styles.targetIcon} aria-hidden="true"><Sheet /></span>
          <div>
            <strong>Google Sheet ของเขตสุขภาพที่ 2</strong>
            <span>ส่งข้อมูลชุดเดียวกับไฟล์ Excel “ส่งออก Excel” ขึ้นชีตของเขต</span>
          </div>
        </div>

        <p className={styles.endpoint}>{endpointLabel}</p>

        <dl className={styles.stats}>
          <div>
            <dt>แถวที่จะส่ง</dt>
            <dd>{rowCount.toLocaleString("th-TH")}</dd>
          </div>
          <div>
            <dt>หน่วยบริการ</dt>
            <dd>{hospitalCount.toLocaleString("th-TH")}</dd>
          </div>
          <div>
            <dt>คอลัมน์ต่อแถว</dt>
            <dd>{columnCount}</dd>
          </div>
        </dl>
      </div>

      <div className={styles.warning}>
        <AlertTriangle aria-hidden="true" />
        <span>
          สคริปต์ปลายทางจะ <strong>ล้างข้อมูลเดิมในชีตตั้งแต่แถว 7 ลงไป</strong> แล้วเขียนข้อมูลชุดใหม่ทับ
          ไม่ใช่การต่อท้าย ตรวจสอบจำนวนแถวด้านบนให้แน่ใจก่อนกดส่ง
        </span>
      </div>

      {state.kind === "success" && (
        <div className={`${styles.message} ${styles.success}`} role="status">
          <CheckCircle2 aria-hidden="true" /> {state.message}
        </div>
      )}
      {state.kind === "error" && (
        <div className={`${styles.message} ${styles.error}`} role="alert">
          <AlertCircle aria-hidden="true" /> {state.message}
        </div>
      )}

      <button className={styles.submit} type="submit" disabled={state.kind === "sending" || rowCount === 0}>
        {state.kind === "sending" ? (
          <>
            <RefreshCw aria-hidden="true" className={styles.spinning} />
            กำลังส่งขึ้น Sheet เขต...
          </>
        ) : (
          <>
            <Send aria-hidden="true" />
            ส่งรายงานขึ้น Sheet เขต
          </>
        )}
      </button>
    </form>
  );
}

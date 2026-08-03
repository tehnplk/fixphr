"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw } from "lucide-react";
import styles from "./page.module.css";

const FIVE_MINUTES = 5 * 60 * 1_000;

function formatCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.ceil(remainingMs / 1_000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export default function AutoRefresh({ intervalMs = FIVE_MINUTES }: { intervalMs?: number }) {
  const router = useRouter();
  const deadlineRef = useRef(0);
  const [remainingMs, setRemainingMs] = useState(intervalMs);

  useEffect(() => {
    deadlineRef.current = Date.now() + intervalMs;

    const timer = window.setInterval(() => {
      const left = deadlineRef.current - Date.now();

      if (left > 0) {
        setRemainingMs(left);
        return;
      }

      deadlineRef.current = Date.now() + intervalMs;
      setRemainingMs(intervalMs);

      // ข้ามรอบนี้ถ้ากำลังเปิด modal อยู่ — router.refresh() จะ re-render ตาราง
      // แล้วปิดหน้าต่างที่ผู้ใช้กำลังดูรายละเอียดอยู่
      if (document.querySelector("dialog[open]")) return;
      router.refresh();
    }, 1_000);

    return () => window.clearInterval(timer);
  }, [intervalMs, router]);

  return (
    <span className={styles.refreshCountdown}>
      <RefreshCw aria-hidden="true" />
      อัปเดตอัตโนมัติใน{" "}
      <span className={styles.refreshCountdownValue}>{formatCountdown(remainingMs)}</span>
    </span>
  );
}

"use client";

import { useEffect, useState } from "react";
import styles from "./OnlinePresence.module.css";

const PING_INTERVAL_MS = 30_000;

export default function OnlinePresence() {
  const [online, setOnline] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;

    const ping = async () => {
      try {
        const response = await fetch("/api/presence", { method: "POST" });
        if (!response.ok) return;
        const data = await response.json();
        if (!cancelled) setOnline(Number(data.online) || 0);
      } catch {
        /* เงียบไว้ ตัวเลขค้างของเดิมดีกว่าเด้ง error ใส่ผู้ใช้ */
      }
    };

    ping();
    const timer = window.setInterval(ping, PING_INTERVAL_MS);
    /* กลับมาที่แท็บแล้วอัปเดตทันที ไม่ต้องรอครบรอบ */
    const onVisible = () => {
      if (document.visibilityState === "visible") ping();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  if (online === null) return null;

  return (
    <aside aria-live="off" className={styles.badge}>
      <span className={styles.dot} aria-hidden="true" />
      กำลังใช้งาน <span className={styles.count}>{online}</span> คน
    </aside>
  );
}

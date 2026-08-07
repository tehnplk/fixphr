"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AlertCircle, CheckCircle2, CloudDownload, Link2, RefreshCw } from "lucide-react";
import styles from "./page.module.css";

type ImportState =
  | { kind: "idle" }
  | { kind: "importing" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

export default function ImportApiForm({ sourceUrl }: { sourceUrl: string }) {
  const router = useRouter();
  const [state, setState] = useState<ImportState>({ kind: "idle" });

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state.kind === "importing") return;

    setState({ kind: "importing" });

    try {
      const response = await fetch("/api/import-api", { method: "POST" });
      const result = (await response.json()) as { message?: string };

      if (!response.ok) {
        throw new Error(result.message || "ไม่สามารถนำเข้าข้อมูลได้");
      }

      setState({ kind: "success", message: result.message || "นำเข้าข้อมูลสำเร็จ" });
      router.refresh();
    } catch (error) {
      setState({
        kind: "error",
        message: error instanceof Error ? error.message : "ไม่สามารถนำเข้าข้อมูลได้",
      });
    }
  }

  return (
    <form className={styles.panel} onSubmit={handleSubmit}>
      <p className={styles.endpoint}>
        <Link2 aria-hidden="true" width={14} height={14} />{" "}
        <a href={sourceUrl} target="_blank" rel="noreferrer noopener">{sourceUrl}</a>
      </p>

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

      <button className={styles.submit} type="submit" disabled={state.kind === "importing"}>
        {state.kind === "importing" ? (
          <>
            <RefreshCw aria-hidden="true" className={styles.spinning} />
            กำลังดึงข้อมูลและนำเข้า...
          </>
        ) : (
          <>
            <CloudDownload aria-hidden="true" />
            ดึงข้อมูลจาก API และนำเข้า
          </>
        )}
      </button>
    </form>
  );
}

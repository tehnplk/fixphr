"use client";

import { useRef, useState } from "react";
import { AlertCircle, CheckCircle2, FileText, UploadCloud, X } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./page.module.css";

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "success"; message: string }
  | { kind: "error"; message: string };

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

export default function UploadForm() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [state, setState] = useState<UploadState>({ kind: "idle" });

  function chooseFile(nextFile: File | undefined) {
    if (!nextFile) return;

    const extension = nextFile.name.split(".").pop()?.toLowerCase();
    if (extension !== "csv" && extension !== "txt") {
      setFile(null);
      setState({ kind: "error", message: "กรุณาเลือกไฟล์ .csv หรือ .txt เท่านั้น" });
      return;
    }

    setFile(nextFile);
    setState({ kind: "idle" });
  }

  function clearFile() {
    setFile(null);
    setState({ kind: "idle" });
    if (inputRef.current) inputRef.current.value = "";
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!file || state.kind === "uploading") return;

    setState({ kind: "uploading" });
    const formData = new FormData();
    formData.set("file", file);

    try {
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
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
    <form className={styles.uploader} onSubmit={handleSubmit}>
      <label
        className={`${styles.dropzone} ${isDragging ? styles.dragging : ""}`}
        onDragEnter={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragOver={(event) => event.preventDefault()}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          chooseFile(event.dataTransfer.files[0]);
        }}
      >
        <input
          ref={inputRef}
          type="file"
          name="file"
          accept=".csv,.txt,text/csv,text/plain"
          onChange={(event) => chooseFile(event.target.files?.[0])}
        />
        <span className={styles.uploadIcon}><UploadCloud aria-hidden="true" /></span>
        <strong>ลากไฟล์มาวางที่นี่</strong>
        <span>หรือคลิกเพื่อเลือกไฟล์จากเครื่อง</span>
        <small>CSV หรือ TXT · ขนาดไม่เกิน 5 MB</small>
      </label>

      {file && (
        <div className={styles.fileRow}>
          <FileText aria-hidden="true" />
          <div>
            <strong>{file.name}</strong>
            <span>{formatFileSize(file.size)}</span>
          </div>
          <button type="button" onClick={clearFile} aria-label="ยกเลิกไฟล์ที่เลือก">
            <X aria-hidden="true" />
          </button>
        </div>
      )}

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

      <button className={styles.submit} type="submit" disabled={!file || state.kind === "uploading"}>
        {state.kind === "uploading" ? "กำลังตรวจสอบและนำเข้า..." : "ตรวจสอบและนำเข้าข้อมูล"}
      </button>
    </form>
  );
}

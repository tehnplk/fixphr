"use client";

import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { FileImage, X } from "lucide-react";
import styles from "./page.module.css";

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;

function formatSize(bytes: number) {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

type Attachment = {
  file: File;
  url: string;
};

export default function ImageInput() {
  const inputRef = useRef<HTMLInputElement>(null);
  const urlRef = useRef<string | null>(null);
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [error, setError] = useState<string | null>(null);

  // an object URL is a live handle to the picked file; revoke the previous one
  // whenever it is replaced so the browser does not pin every image the user
  // cycles through
  const attach = (file: File | null) => {
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }

    if (!file) {
      setAttachment(null);
      return;
    }

    const url = URL.createObjectURL(file);
    urlRef.current = url;
    setAttachment({ file, url });
  };

  useEffect(
    () => () => {
      if (urlRef.current) {
        URL.revokeObjectURL(urlRef.current);
      }
    },
    [],
  );

  const clear = () => {
    if (inputRef.current) {
      inputRef.current.value = "";
    }

    attach(null);
    setError(null);
  };

  const reject = (message: string) => {
    clear();
    setError(message);
  };

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = event.target.files?.[0] ?? null;

    if (!picked) {
      clear();
      return;
    }

    if (!picked.type.startsWith("image/")) {
      reject("กรุณาเลือกไฟล์รูปภาพเท่านั้น");
      return;
    }

    if (picked.size > MAX_IMAGE_SIZE) {
      reject(`รูปภาพมีขนาด ${formatSize(picked.size)} กรุณาเลือกรูปที่ไม่เกิน 2 MB`);
      return;
    }

    setError(null);
    attach(picked);
  };

  return (
    <div className={styles.imageField}>
      <label className={styles.upload}>
        <FileImage aria-hidden="true" />
        <strong>{attachment ? "เปลี่ยนรูปภาพ" : "เลือกรูปภาพ"}</strong>
        <span>แนบได้ 1 รูป ขนาดไม่เกิน 2 MB</span>
        <input
          ref={inputRef}
          name="image"
          type="file"
          accept="image/*"
          onChange={handleChange}
        />
      </label>

      {error && <p className={styles.fieldError}>{error}</p>}

      {attachment && (
        <div className={styles.imagePreview}>
          {/* a blob: URL cannot go through next/image, which needs a known loader */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={attachment.url}
            alt={`ตัวอย่างรูปที่แนบ: ${attachment.file.name}`}
          />
          <div>
            <strong>{attachment.file.name}</strong>
            <span>{formatSize(attachment.file.size)}</span>
          </div>
          <button type="button" onClick={clear} aria-label="ลบรูปภาพที่แนบ">
            <X aria-hidden="true" />
          </button>
        </div>
      )}
    </div>
  );
}

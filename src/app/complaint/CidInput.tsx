"use client";

import { X } from "lucide-react";
import { useRef, useState } from "react";
import { isValidThaiCid } from "@/lib/cid";
import styles from "./page.module.css";

function formatThaiCid(cid: string) {
  return [
    cid.slice(0, 1),
    cid.slice(1, 5),
    cid.slice(5, 10),
    cid.slice(10, 12),
    cid.slice(12, 13),
  ]
    .filter(Boolean)
    .join("-");
}

export default function CidInput() {
  const [cid, setCid] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const hasInvalidChecksum = cid.length === 13 && !isValidThaiCid(cid);
  const hasIncompleteCid = cid.length > 0 && cid.length < 13;

  return (
    <>
      <span className={styles.cidInputWrap}>
        <input
          ref={inputRef}
          name="cid_display"
          aria-label="เลขประจำตัวประชาชน"
          type="text"
          inputMode="numeric"
          maxLength={17}
          autoComplete="off"
          value={formatThaiCid(cid)}
          aria-invalid={hasInvalidChecksum}
          onChange={(event) => {
            const value = event.target.value.replace(/\D/g, "").slice(0, 13);
            setCid(value);

            if (value.length !== 13) {
              event.target.setCustomValidity(
                "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก",
              );
            } else if (!isValidThaiCid(value)) {
              event.target.setCustomValidity(
                "เลขประจำตัวประชาชนไม่ผ่านการตรวจสอบ Mod 11",
              );
            } else {
              event.target.setCustomValidity("");
            }
          }}
          onInvalid={(event) => {
            if (!event.currentTarget.value) {
              event.currentTarget.setCustomValidity(
                "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก",
              );
            }
          }}
          required
        />
        {cid && (
          <button
            type="button"
            className={styles.cidClear}
            aria-label="ล้างเลขประจำตัวประชาชน"
            onClick={() => {
              setCid("");
              inputRef.current?.setCustomValidity(
                "กรุณากรอกเลขประจำตัวประชาชนให้ครบ 13 หลัก",
              );
              inputRef.current?.focus();
            }}
          >
            <X aria-hidden="true" />
          </button>
        )}
      </span>
      <input name="cid" type="hidden" value={cid} readOnly />
      {hasIncompleteCid && (
        <span className={styles.fieldError} role="alert">
          เลขบัตรต้องครบ 13 หลัก
        </span>
      )}
      {hasInvalidChecksum && (
        <span className={styles.fieldError} role="alert">
          เลขประจำตัวประชาชนไม่ถูกต้อง
        </span>
      )}
    </>
  );
}

"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function RequiredDetailTextarea() {
  const [value, setValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  return (
    <>
      <textarea
        name="detail"
        rows={5}
        value={value}
        placeholder="อธิบายข้อมูลที่ไม่ถูกต้องและข้อมูลที่ควรแก้ไข"
        required
        onChange={(event) => {
          setIsTouched(true);
          setValue(event.target.value);
        }}
        onInvalid={() => setIsTouched(true)}
      />
      {isTouched && !value.trim() && (
        <span className={styles.fieldError} role="alert">
          กรุณากรอกรายละเอียดที่ต้องการแจ้งแก้ไข
        </span>
      )}
    </>
  );
}

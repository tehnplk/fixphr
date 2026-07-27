"use client";

import { useState } from "react";
import styles from "./page.module.css";

export default function RequiredGenderSelect() {
  const [value, setValue] = useState("");
  const [isTouched, setIsTouched] = useState(false);

  return (
    <>
      <select
        name="gender"
        aria-label="เพศ"
        value={value}
        required
        onChange={(event) => {
          setIsTouched(true);
          setValue(event.target.value);
        }}
        onInvalid={() => setIsTouched(true)}
      >
        <option value="" disabled>เลือกเพศ</option>
        <option value="1">ชาย</option>
        <option value="2">หญิง</option>
      </select>
      {isTouched && !value && (
        <span className={styles.fieldError} role="alert">
          กรุณาเลือกเพศ
        </span>
      )}
    </>
  );
}

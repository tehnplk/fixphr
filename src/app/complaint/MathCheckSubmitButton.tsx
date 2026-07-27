"use client";

import type { MouseEvent } from "react";
import { Send } from "lucide-react";
import Swal from "sweetalert2";

function randomDigit() {
  return 1 + Math.floor(Math.random() * 9);
}

export default function MathCheckSubmitButton() {
  const handleClick = async (event: MouseEvent<HTMLButtonElement>) => {
    const form = event.currentTarget.form;

    if (!form) {
      return;
    }

    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const a = randomDigit();
    const b = randomDigit();

    const { isConfirmed } = await Swal.fire({
      icon: "question",
      title: "ยืนยันการส่งเรื่องแจ้ง",
      html: `
        <p style="margin:0 0 12px;font-size:clamp(14px,4vw,17px);color:#668078">เพื่อป้องกันการโจมตีระบบ</p>
        <p style="margin:0;font-size:clamp(17px,5vw,22px);font-weight:700;color:#173f34;line-height:1.6">
          <span style="white-space:nowrap">กรุณาตอบคำถามนี้</span>
          <span style="font-size:clamp(22px,7vw,30px);font-weight:800;color:#08704e;white-space:nowrap">${a} × ${b}</span>
          <span style="white-space:nowrap">มีค่าเท่าไร</span>
        </p>
      `,
      input: "text",
      inputPlaceholder: "กรอกคำตอบ",
      inputAttributes: {
        inputmode: "numeric",
        autocomplete: "off",
        style: "font-size:clamp(17px,5vw,20px);font-weight:700;text-align:center",
      },
      confirmButtonText: "ส่งเรื่องแจ้ง",
      cancelButtonText: "ยกเลิก",
      showCancelButton: true,
      confirmButtonColor: "#0ea5a3",
      inputValidator: (value) =>
        Number(value.trim()) === a * b ? undefined : "คำตอบไม่ถูกต้อง กรุณาลองใหม่",
    });

    if (isConfirmed) {
      form.submit();
    }
  };

  return (
    <button type="submit" onClick={handleClick}>
      ส่งเรื่องแจ้งแก้ไข
      <Send aria-hidden="true" />
    </button>
  );
}

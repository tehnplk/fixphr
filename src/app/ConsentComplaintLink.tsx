"use client";

import { useCallback, useEffect, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";

type ConsentComplaintLinkProps = {
  autoPrompt?: boolean;
};

export default function ConsentComplaintLink({
  autoPrompt = false,
}: ConsentComplaintLinkProps) {
  const router = useRouter();

  const askForConsent = useCallback(async () => {
    const { isConfirmed } = await Swal.fire({
      icon: "info",
      title:
        '<span style="display:block;font-size:clamp(19px,5.6vw,27px);line-height:1.5">ขอความยินยอมเก็บข้อมูลส่วนบุคคล</span>',
      html: `
        <p style="margin:0 0 14px;font-size:clamp(14px,4vw,16px);color:#315f52;line-height:1.85;text-align:left">
          เพื่อประโยชน์ในการตรวจสอบและแก้ไขประวัติสุขภาพของท่านให้ถูกต้อง
          สำนักงานสาธารณสุขจังหวัดพิษณุโลกมีความจำเป็นต้องเก็บรวบรวมข้อมูลส่วนบุคคลบางส่วน
          ได้แก่ เลขประจำตัวประชาชน เพศ และวันเดือนปีเกิด
          เพื่อใช้ตรวจสอบกับฐานข้อมูลของโรงพยาบาล
        </p>
        <p style="margin:0;font-size:clamp(13px,3.6vw,15px);color:#668078;line-height:1.85;text-align:left">
          ข้อมูลดังกล่าวจะถูกเก็บรักษาไว้เป็นความลับ
          และนำไปใช้เฉพาะวัตถุประสงค์ข้างต้นเท่านั้น
        </p>
      `,
      confirmButtonText: "ยินยอม",
      cancelButtonText: "ไม่ยินยอม",
      showCancelButton: true,
      reverseButtons: true,
      confirmButtonColor: "#08704e",
      focusCancel: true,
    });

    if (isConfirmed) {
      const response = await fetch("/api/consent", { method: "POST" });

      if (!response.ok) {
        await Swal.fire({
          icon: "error",
          title: "ไม่สามารถดำเนินการต่อได้",
          text: "ระบบไม่สามารถบันทึกการให้ความยินยอมได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
          confirmButtonText: "รับทราบ",
          confirmButtonColor: "#08704e",
        });
        return;
      }

      router.push("/complaint");
      return;
    }

    await Swal.fire({
      icon: "warning",
      title: "ไม่สามารถดำเนินการต่อได้",
      text: "ระบบจำเป็นต้องได้รับความยินยอมจากท่านก่อน จึงจะสามารถรับเรื่องแจ้งแก้ไขประวัติสุขภาพได้",
      confirmButtonText: "รับทราบ",
      confirmButtonColor: "#08704e",
    });
  }, [router]);

  // the form redirects here when it is opened without consent, so pick the
  // request back up instead of dropping the visitor on the landing page
  useEffect(() => {
    if (autoPrompt) {
      void askForConsent();
    }
  }, [autoPrompt, askForConsent]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    void askForConsent();
  };

  return (
    <a className="complaint-button" href="/complaint" onClick={handleClick}>
      <span className="complaint-label">
        <span>แจ้งแก้ไขประวัติสุขภาพในหมอพร้อม</span>
        <strong>คลิกที่นี่</strong>
      </span>
      <b aria-hidden="true">↗</b>
    </a>
  );
}

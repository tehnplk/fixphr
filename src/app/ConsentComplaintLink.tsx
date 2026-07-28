"use client";

import { useCallback, useEffect, useRef, useState, type MouseEvent } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import Swal from "sweetalert2";

type ConsentComplaintLinkProps = {
  autoPrompt?: boolean;
};

export default function ConsentComplaintLink({
  autoPrompt = false,
}: ConsentComplaintLinkProps) {
  const router = useRouter();
  const lightboxRef = useRef<HTMLDialogElement>(null);
  // set when the close is already followed up by a redirect or its own message,
  // so the generic "consent is required" notice does not pile on top of it
  const answeredRef = useRef(false);
  const [saving, setSaving] = useState(false);

  const openLightbox = useCallback(() => {
    answeredRef.current = false;
    lightboxRef.current?.showModal();
  }, []);

  // the form redirects here when it is opened without consent, so pick the
  // request back up instead of dropping the visitor on the landing page
  useEffect(() => {
    if (autoPrompt) {
      openLightbox();
    }
  }, [autoPrompt, openLightbox]);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    openLightbox();
  };

  // a native dialog ignores clicks on its backdrop, so treat a click that lands
  // on the dialog box itself — never on the panel inside it — as a dismissal
  const handleBackdropClick = (event: MouseEvent<HTMLDialogElement>) => {
    if (event.target === lightboxRef.current) {
      lightboxRef.current?.close();
    }
  };

  const handleClose = () => {
    if (answeredRef.current) {
      return;
    }

    void Swal.fire({
      icon: "warning",
      title: "ไม่สามารถดำเนินการต่อได้",
      text: "ระบบจำเป็นต้องได้รับความยินยอมจากท่านก่อน จึงจะสามารถรับเรื่องแจ้งแก้ไขประวัติสุขภาพได้",
      confirmButtonText: "รับทราบ",
      confirmButtonColor: "#08704e",
    });
  };

  const accept = async () => {
    setSaving(true);
    const response = await fetch("/api/consent", { method: "POST" });
    setSaving(false);

    answeredRef.current = true;
    lightboxRef.current?.close();

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
  };

  return (
    <>
      <a className="complaint-button" href="/complaint" onClick={handleClick}>
        <span className="complaint-label">
          <span>แจ้งแก้ไขประวัติสุขภาพในหมอพร้อม</span>
          <strong>คลิกที่นี่</strong>
        </span>
        <b aria-hidden="true">↗</b>
      </a>

      <dialog
        ref={lightboxRef}
        className="consent-lightbox"
        aria-labelledby="consent-title"
        onClick={handleBackdropClick}
        onClose={handleClose}
      >
        <div className="consent-panel">
          <div className="consent-head">
            <i aria-hidden="true">
              <ShieldCheck />
            </i>
            <h2 id="consent-title">ขอความยินยอมเก็บข้อมูลส่วนบุคคล</h2>
          </div>

          <p>
            เพื่อประโยชน์ในการตรวจสอบและแก้ไขประวัติสุขภาพของท่านให้ถูกต้อง
            สำนักงานสาธารณสุขจังหวัดพิษณุโลกมีความจำเป็นต้องเก็บรวบรวมข้อมูลส่วนบุคคลบางส่วน
            ได้แก่ เลขประจำตัวประชาชน เพศ และวันเดือนปีเกิด
            เพื่อใช้ตรวจสอบกับฐานข้อมูลของโรงพยาบาล
          </p>
          <p>
            ข้อมูลดังกล่าวจะถูกเก็บรักษาไว้เป็นความลับ
            และนำไปใช้เฉพาะวัตถุประสงค์ข้างต้นเท่านั้น
          </p>

          <div className="consent-actions">
            <button
              type="button"
              className="consent-decline"
              onClick={() => lightboxRef.current?.close()}
            >
              ไม่ยินยอม
            </button>
            <button
              type="button"
              className="consent-accept"
              onClick={() => void accept()}
              disabled={saving}
            >
              {saving ? "กำลังบันทึก..." : "ยินยอม"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

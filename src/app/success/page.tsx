import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Check, Home } from "lucide-react";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "รับเรื่องแจ้งเรียบร้อยแล้ว | หมอพร้อม",
  description: "ระบบได้รับข้อมูลแจ้งแก้ไขประวัติสุขภาพจากท่านเรียบร้อยแล้ว",
};

export default function SuccessPage() {
  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <div className={styles.brand}>
          <Image
            src="/moph-logo-transparent.png"
            alt="กระทรวงสาธารณสุข"
            width={120}
            height={120}
            priority
          />
        </div>

        <h1 className={styles.office}>สำนักงานสาธารณสุขจังหวัดพิษณุโลก</h1>

        <div className={styles.message}>
          <span>
            <strong>ได้รับข้อมูลจากท่านแล้ว</strong>
          </span>
          <span>จะดำเนินการแก้ไขให้ถูกต้องต่อไป</span>
        </div>

        <div className={styles.icon}>
          <Check aria-hidden="true" />
        </div>

        <div className={styles.actions}>
          <Link href="/" className={styles.primary}>
            <Home aria-hidden="true" />
            กลับหน้าหลัก
          </Link>
          <Link href="/complaint" className={styles.secondary}>
            <ArrowLeft aria-hidden="true" />
            แจ้งเรื่องใหม่
          </Link>
        </div>
      </section>
    </main>
  );
}

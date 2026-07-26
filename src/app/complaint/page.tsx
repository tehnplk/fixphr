import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarDays,
  FileImage,
  Send,
  ShieldCheck,
} from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import CidInput from "./CidInput";
import HospitalAutocomplete from "./HospitalAutocomplete";
import ThaiDateControl from "./ThaiDateControl";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "แจ้งแก้ไขประวัติสุขภาพ | หมอพร้อม",
  description: "แบบฟอร์มแจ้งแก้ไขประวัติสุขภาพในแอปพลิเคชันหมอพร้อม",
};

type ComplaintPageProps = {
  searchParams: Promise<{
    success?: string;
    id?: string;
    error?: string;
  }>;
};

const errorMessages: Record<string, string> = {
  invalid: "กรุณาตรวจสอบข้อมูลที่กรอกให้ครบถ้วนและถูกต้อง",
  image: "แนบรูปภาพได้ไม่เกิน 5 รูป และแต่ละรูปต้องมีขนาดไม่เกิน 5 MB",
  server: "ระบบไม่สามารถบันทึกข้อมูลได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง",
};

export default async function ComplaintPage({
  searchParams,
}: ComplaintPageProps) {
  const params = await searchParams;
  const errorMessage = params.error ? errorMessages[params.error] : undefined;
  const hospitals = await getPrisma().hospital.findMany({
    select: {
      hospcode: true,
      hospname: true,
    },
    orderBy: {
      hospname: "asc",
    },
  });

  return (
    <main className={styles.page}>
      <section className={styles.shell}>
        <header className={styles.header}>
          <Link href="/" className={styles.backLink}>
            <ArrowLeft aria-hidden="true" />
            กลับหน้าหลัก
          </Link>
          <div className={styles.brand}>
            <Image
              src="/moph-logo-transparent.png"
              alt="กระทรวงสาธารณสุข"
              width={64}
              height={64}
              priority
            />
            <div>
              <strong>สำนักงานสาธารณสุขจังหวัดพิษณุโลก</strong>
              <span>PHITSANULOK PROVINCIAL HEALTH OFFICE</span>
            </div>
          </div>
        </header>

        <div className={styles.intro}>
          <div className={styles.introIcon}>
            <ShieldCheck aria-hidden="true" />
          </div>
          <p>แบบฟอร์มแจ้งแก้ไขข้อมูล</p>
          <h1>แจ้งแก้ไขประวัติสุขภาพ<br />ในแอปพลิเคชันหมอพร้อม</h1>
          <span>
            กรุณากรอกข้อมูลให้ครบถ้วน เพื่อให้เจ้าหน้าที่ตรวจสอบได้อย่างรวดเร็ว
          </span>
        </div>

        {params.success === "1" && (
          <div className={styles.success} role="status">
            <ShieldCheck aria-hidden="true" />
            <div>
              <strong>รับเรื่องแจ้งเรียบร้อยแล้ว</strong>
              <span>หมายเลขเรื่องแจ้ง #{params.id}</span>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className={styles.error} role="alert">
            {errorMessage}
          </div>
        )}

        <form
          className={styles.form}
          action="/api/complaints"
          method="post"
          encType="multipart/form-data"
        >
          <fieldset>
            <legend>ข้อมูลผู้รับบริการ</legend>
            <div className={styles.grid}>
              <div className={`${styles.full} ${styles.fieldGroup}`}>
                <span>เลขประจำตัวประชาชน</span>
                <CidInput />
              </div>
              <label>
                <span>เพศ</span>
                <select name="gender" defaultValue="" required>
                  <option value="" disabled>เลือกเพศ</option>
                  <option value="1">ชาย</option>
                  <option value="2">หญิง</option>
                </select>
              </label>
              <div className={styles.fieldGroup}>
                <span>วันเดือนปีเกิด</span>
                <ThaiDateControl
                  name="birth_date"
                  yearName="birth_year"
                  yearCount={121}
                  allowYearOnly
                />
              </div>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              <CalendarDays aria-hidden="true" />
              รายละเอียดข้อมูลที่ผิด
            </legend>
            <div className={styles.grid}>
              <div className={`${styles.full} ${styles.fieldGroup}`}>
                <span>วันที่เข้ารับบริการและพบข้อมูลผิด</span>
                <ThaiDateControl name="visit_date" />
                <small>วันที่ตามเวลาประเทศไทย (UTC+7)</small>
              </div>
              <div className={`${styles.full} ${styles.fieldGroup}`}>
                <span>โรงพยาบาลที่ทำข้อมูลของท่านผิด</span>
                <HospitalAutocomplete hospitals={hospitals} />
              </div>
              <label className={styles.full}>
                <span>รายละเอียดที่ต้องการแจ้งแก้ไข</span>
                <textarea
                  name="detail"
                  rows={5}
                  placeholder="อธิบายข้อมูลที่ไม่ถูกต้องและข้อมูลที่ควรแก้ไข"
                  required
                />
              </label>
            </div>
          </fieldset>

          <fieldset>
            <legend>
              <FileImage aria-hidden="true" />
              รูปภาพประกอบ
            </legend>
            <label className={styles.upload}>
              <FileImage aria-hidden="true" />
              <strong>เลือกรูปภาพ</strong>
              <span>แนบได้สูงสุด 5 รูป รูปละไม่เกิน 5 MB</span>
              <input name="image" type="file" accept="image/*" multiple />
            </label>
          </fieldset>

          <div className={styles.actions}>
            <p>
              <ShieldCheck aria-hidden="true" />
              โปรดตรวจสอบข้อมูลก่อนส่งเรื่องแจ้ง
            </p>
            <button type="submit">
              ส่งเรื่องแจ้งแก้ไข
              <Send aria-hidden="true" />
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}

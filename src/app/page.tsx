import Image from "next/image";
import { ClipboardCheck, CircleCheckBig, CircleX, MousePointerClick } from "lucide-react";

export default function Home() {
  return (
    <main className="landing-page">
      <div className="page-glow page-glow-one" />
      <div className="page-glow page-glow-two" />

      <section className="hero" aria-labelledby="page-title">
        <header className="brand">
          <Image
            src="/moph-logo-transparent.png"
            alt="กระทรวงสาธารณสุข"
            width={72}
            height={72}
            priority
          />
          <div>
            <p>สำนักงานสาธารณสุขจังหวัดพิษณุโลก</p>
            <span>PHITSANULOK PROVINCIAL HEALTH OFFICE</span>
          </div>
        </header>

        <aside className="case-stats" aria-label="สถิติการรับแจ้ง">
          <div>
            <ClipboardCheck aria-hidden="true" />
            <span>รับแจ้งแล้ว <b>n</b> รายการ</span>
          </div>
          <div>
            <CircleCheckBig aria-hidden="true" />
            <span>แก้ไขแล้ว <b>n</b> รายการ</span>
          </div>
        </aside>

        <div className="hero-grid">
          <div className="hero-copy">
            <h1 id="page-title">
              ศูนย์รับแจ้งแก้ไขประวัติสุขภาพ<br />
              <strong>ในแอปพลิเคชันหมอพร้อม</strong>
            </h1>
            <p className="intro">
              หากข้อมูลสุขภาพของคุณในแอปพลิเคชันหมอพร้อมไม่ถูกต้อง
              สามารถแจ้งรายละเอียดให้เราตรวจสอบและประสานการแก้ไขได้ที่นี่
            </p>
            <a className="complaint-button" href="/complaint">
              <span className="complaint-label">
                <span>แจ้งแก้ไขประวัติสุขภาพในหมอพร้อม</span>
                <strong>คลิกที่นี่</strong>
              </span>
              <b aria-hidden="true">↗</b>
            </a>
          </div>

          <div className="visual" aria-hidden="true">
            <div className="orbit orbit-a" />
            <div className="orbit orbit-b" />
            <div className="leaf leaf-one">✦</div>
            <div className="leaf leaf-two">✦</div>
            <div className="phone-shadow" />
            <div className="phone">
              <div className="phone-top"><i /><span>หมอพร้อม</span><em>•••</em></div>
              <div className="phone-screen">
                <div className="screen-wave" />
                <h2>
                  <span>
                    <span className="issue-icons" aria-hidden="true">
                      <CircleX className="issue-x" strokeWidth={2.5} />
                      <Image
                        className="patient-chart"
                        src="/medical-record.png"
                        alt=""
                        width={48}
                        height={48}
                      />
                    </span>
                    <span className="issue-text">ข้อมูล<br />ผิดพลาด<br />สามารถ<br />แก้ไขได้</span>
                  </span>
                </h2>
                <div className="health-card">
                  <div className="cross">+</div>
                  <div><span>HEALTH PROFILE</span><b>ข้อมูลสุขภาพ</b></div>
                  <i>✓</i>
                </div>
                <div className="screen-lines"><i /><i /><i /></div>
              </div>
            </div>
          </div>
        </div>

        <footer>
          <div className="visit-count" aria-label="จำนวนครั้งเข้าใช้งาน">
            <MousePointerClick aria-hidden="true" />
            <span>เข้าใช้งาน <b>n</b> ครั้ง</span>
          </div>
          <Image
            className="footer-mohprom"
            src="/mohprom-transparent.png"
            alt="แอปพลิเคชันหมอพร้อม"
            width={90}
            height={90}
          />
        </footer>
      </section>
    </main>
  );
}

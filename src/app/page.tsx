import Image from "next/image";
import { ClipboardCheck, CircleCheckBig, CircleX } from "lucide-react";
import { getPrisma } from "@/lib/prisma";
import ConsentComplaintLink from "./ConsentComplaintLink";
import VisitCount from "./VisitCount";

export const dynamic = "force-dynamic";

type HomeProps = {
  searchParams: Promise<{
    consent?: string;
  }>;
};

export default async function Home({ searchParams }: HomeProps) {
  const { consent } = await searchParams;
  const prisma = getPrisma();
  const [receivedCount, resolvedCount, visitCounter] = await prisma.$transaction([
    prisma.complaint.count(),
    prisma.complaint.count({
      where: {
        statuses: {
          some: {
            status: "RESOLVED",
          },
        },
      },
    }),
    prisma.visitCounter.findUnique({
      where: {
        key: "landing_page",
      },
      select: {
        count: true,
      },
    }),
  ]);

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
            <span>รับแจ้งแล้ว <b>{receivedCount.toLocaleString("th-TH")}</b> รายการ</span>
          </div>
          <div>
            <CircleCheckBig aria-hidden="true" />
            <span>แก้ไขแล้ว <b>{resolvedCount.toLocaleString("th-TH")}</b> รายการ</span>
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
            <ConsentComplaintLink autoPrompt={consent === "required"} />
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
          <VisitCount initialCount={visitCounter?.count ?? 0} />
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

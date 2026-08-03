import type { Metadata } from "next";
import AppNav, { type NavUser } from "@/components/AppNav";
import OnlinePresence from "@/components/OnlinePresence";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLK-Masks",
  description: "นำเข้าข้อมูลสรุปหน่วยบริการจากไฟล์ CSV หรือ TXT",
};

// เมนู "รายงานผล" ใช้ได้เฉพาะ hcode ที่มีอยู่จริงในตาราง hospitals
async function findKnownHospitalCode(hcode: string | null) {
  if (!hcode) return null;
  try {
    const hospital = await getPrisma().hospital.findUnique({
      where: { hospcode: hcode },
      select: { hospcode: true },
    });
    return hospital?.hospcode ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  let user: NavUser | null = null;
  if (session?.user) {
    const name = session.user.fullname || session.user.name || "";
    const hcode = session.user.hoscode?.trim() || null;
    user = {
      name,
      initial: session.user.avatarInitial || Array.from(name)[0] || "?",
      hcode,
      reportHcode: await findKnownHospitalCode(hcode),
      canManage: session.user.role === "super" || session.user.role === "admin",
    };
  }

  return (
    <html lang="th">
      <body>
        <AppNav user={user} />
        {children}
        <OnlinePresence />
      </body>
    </html>
  );
}

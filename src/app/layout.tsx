import type { Metadata } from "next";
import AppNav, { type NavUser } from "@/components/AppNav";
import { auth } from "@/auth";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLK-Masks",
  description: "นำเข้าข้อมูลสรุปหน่วยบริการจากไฟล์ CSV หรือ TXT",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();
  let user: NavUser | null = null;
  if (session?.user) {
    const name = session.user.fullname || session.user.name || "";
    user = {
      name,
      initial: session.user.avatarInitial || Array.from(name)[0] || "?",
      hcode: session.user.hoscode || null,
      canManage: session.user.role === "super" || session.user.role === "admin",
    };
  }

  return (
    <html lang="th">
      <body>
        <AppNav user={user} />
        {children}
      </body>
    </html>
  );
}

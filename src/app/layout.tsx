import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ศูนย์รับเรื่องแจ้งแก้ไขประวัติสุขภาพ | หมอพร้อม",
  description: "ศูนย์รับเรื่องร้องเรียนประวัติสุขภาพในแอปพลิเคชันหมอพร้อมไม่ถูกต้อง",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}

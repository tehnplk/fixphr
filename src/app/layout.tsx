import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PLK-Masks",
  description: "นำเข้าข้อมูลสรุปหน่วยบริการจากไฟล์ CSV หรือ TXT",
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

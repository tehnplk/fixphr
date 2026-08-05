import { redirect } from "next/navigation";

// หน้าแรกของระบบคือสรุปยอดการตรวจสอบ ซึ่งเป็นแท็บเดียวที่เปิดสาธารณะ
// ปลายทางหลังล็อกอินก็ใช้ค่านี้ เพราะ DEFAULT_CALLBACK_URL ชี้มาที่ "/"
export default function HomePage() {
  redirect("/sum/amp");
}

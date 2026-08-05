import { redirect } from "next/navigation";

// หน้ารายวันย้ายไป /daily แล้ว ส่วน /amp เดิมชี้ไปหน้าสรุปภาพรวมแทน
// (คงไว้เพื่อไม่ให้ลิงก์เก่าที่ผู้ใช้บุ๊กมาร์กไว้เสีย)
export default function LegacyAmpPage() {
  redirect("/sum/amp");
}

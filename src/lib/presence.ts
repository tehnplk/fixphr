/* นับคนที่กำลังเปิดหน้าเว็บอยู่ตอนนี้ เก็บในหน่วยความจำของ process ไม่แตะฐานข้อมูล
   เพราะ last_activity ในตาราง user_provider หมายถึงเวลาที่ล็อกอินครั้งล่าสุด
   ไม่ใช่การมีตัวตนอยู่ตอนนี้ ค่าจะรีเซ็ตเมื่อ restart container ซึ่งยอมรับได้
   สำหรับข้อมูลชั่วคราวแบบนี้ */

/* TTL ตั้งเป็น 3 เท่าของรอบ ping เผื่อ ping หายไปหนึ่งรอบแล้วคนยังไม่หลุด */
const TTL_MS = 90_000;

/* ผูกไว้กับ globalThis ไม่ให้ hot reload ตอน dev ล้างค่าทิ้งทุกครั้งที่แก้ไฟล์ */
const store: Map<string, number> =
  (globalThis as { __presence?: Map<string, number> }).__presence ??
  ((globalThis as { __presence?: Map<string, number> }).__presence = new Map());

export function touchPresence(key: string) {
  store.set(key, Date.now());
}

export function presenceCount() {
  const cutoff = Date.now() - TTL_MS;

  for (const [key, at] of store) {
    if (at < cutoff) store.delete(key);
  }

  return store.size;
}

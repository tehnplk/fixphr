-- AlterTable
-- เก็บ JSON ดิบทั้งก้อนของหน่วยบริการนั้นตามที่ api/hospital-register ส่งมา (ทุก key
-- รวม dx = สรุปรหัสวินิจฉัย ICD-10 และ spark) เพื่อให้ย้อนดูฟิลด์ที่ยังไม่ได้แตกเป็น
-- คอลัมน์ได้ — แถวเดิมและแถวที่มาจากการอัปโหลด CSV ไม่มีข้อมูลนี้ จึงเป็น NULL
ALTER TABLE "ComplaintHosCount"
ADD COLUMN "raw_json" JSONB;

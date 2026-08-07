-- AlterTable
-- แยกให้ได้ว่ารอบนำเข้าไหนมาจากการอัปโหลดไฟล์ กดดึงจาก API เอง หรืองานตามเวลา
-- ค่าเดิมทั้งหมดเป็น csv ตาม DEFAULT แล้วค่อยแก้เฉพาะรอบที่มาจาก API
ALTER TABLE "ComplaintHosCount"
ADD COLUMN "import_source" VARCHAR(20) NOT NULL DEFAULT 'csv';

-- ตอนสร้างคอลัมน์นี้ยังไม่เคยมี cron ทำงานบน production รอบที่ลงท้าย .json
-- จึงเป็นการกดดึงจาก API ด้วยมือทั้งหมด
UPDATE "ComplaintHosCount"
SET "import_source" = 'api'
WHERE lower("file_name") LIKE '%.json';

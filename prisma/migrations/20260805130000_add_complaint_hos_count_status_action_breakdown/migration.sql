-- AlterTable
-- คอลัมน์ใหม่จาก CSV รูปแบบ 38 คอลัมน์ — ยอด masks ที่ต้นทางแตกตามสถานะการตรวจสอบ
-- และการดำเนินการมาให้แล้ว ทุกคอลัมน์เป็นจำนวนนับ ไม่ติดลบ และ CSV ไม่เว้นว่าง
-- ใส่ DEFAULT 0 ไว้ให้แถวเดิมที่นำเข้าด้วยรูปแบบ 27 คอลัมน์ยังอยู่ได้
ALTER TABLE "ComplaintHosCount"
ADD COLUMN "status_pending" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status_in_progress" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status_completed" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status_no_error_found" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status_not_recorded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "status_unexpected_code" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "action_none_yet" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "action_data_corrected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "action_other" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "action_not_recorded" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "action_unexpected_code" INTEGER NOT NULL DEFAULT 0;

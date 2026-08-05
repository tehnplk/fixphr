-- AlterTable
-- คอลัมน์ใหม่จาก CSV รูปแบบ 27 คอลัมน์ — ตัวที่ CSV เว้นว่างได้กำหนดเป็น NULL
-- ส่วนที่เหลือใส่ DEFAULT ไว้ให้แถวเดิมที่นำเข้าด้วยรูปแบบ 12 คอลัมน์ยังอยู่ได้
ALTER TABLE "ComplaintHosCount"
ADD COLUMN "rank" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "region_id" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "region_name" VARCHAR(100) NOT NULL DEFAULT '',
ADD COLUMN "masks_per_citizen" DECIMAL(8,2) NOT NULL DEFAULT 0,
ADD COLUMN "unanswered" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "answered_pct" DECIMAL(5,1) NOT NULL DEFAULT 0,
ADD COLUMN "median_reply_hours" DECIMAL(10,1),
ADD COLUMN "p90_reply_hours" DECIMAL(10,1),
ADD COLUMN "oldest_unanswered_days" DECIMAL(10,1),
ADD COLUMN "masks_prior_90d" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "masks_recent_90d" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN "change_90d_pct" DECIMAL(12,1),
ADD COLUMN "share_pct" DECIMAL(5,2) NOT NULL DEFAULT 0,
ADD COLUMN "first_date_be" VARCHAR(8) NOT NULL DEFAULT '',
ADD COLUMN "last_date_be" VARCHAR(8) NOT NULL DEFAULT '';

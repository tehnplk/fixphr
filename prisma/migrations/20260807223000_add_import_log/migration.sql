-- CreateTable
-- ประวัติการนำเข้า ComplaintHosCount ทุกครั้ง ทั้งที่สำเร็จและล้มเหลว
CREATE TABLE "import_log" (
    "id" SERIAL NOT NULL,
    "imported_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "source" VARCHAR(20) NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "row_count" INTEGER NOT NULL DEFAULT 0,
    "hospital_count" INTEGER NOT NULL DEFAULT 0,
    "file_name" VARCHAR(255) NOT NULL DEFAULT '',
    "message" TEXT NOT NULL DEFAULT '',

    CONSTRAINT "import_log_pkey" PRIMARY KEY ("id")
);

-- หน้าเว็บเรียงรอบล่าสุดขึ้นก่อนเสมอ
CREATE INDEX "import_log_imported_at_idx" ON "import_log" ("imported_at" DESC);

-- ย้ายประวัติเดิมที่อนุมานได้จากตัวข้อมูลเข้ามา เพื่อไม่ให้รอบก่อนหน้าหายไปจากหน้าเว็บ
-- date_up/time_up เก็บเป็นเวลาไทยแบบไม่มีโซน จึงต้องบอก Postgres ว่าเป็น Asia/Bangkok
INSERT INTO "import_log" ("imported_at", "source", "status", "row_count", "hospital_count", "file_name")
SELECT
    (("date_up"::date + "time_up"::time) AT TIME ZONE 'Asia/Bangkok'),
    "import_source",
    'success',
    count(*)::int,
    count(DISTINCT "hospital_code")::int,
    "file_name"
FROM "ComplaintHosCount"
GROUP BY "date_up", "time_up", "file_name", "import_source";

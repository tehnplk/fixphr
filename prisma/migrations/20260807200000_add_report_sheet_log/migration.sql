-- CreateTable
-- ประวัติการกดส่งรายงานขึ้น Google Sheet ของเขต (/report-sheet)
-- เก็บทั้งรอบที่สำเร็จและไม่สำเร็จ พร้อมข้อความที่ปลายทางตอบกลับมา
CREATE TABLE "report_sheet_log" (
    "id" SERIAL NOT NULL,
    "sent_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "row_count" INTEGER NOT NULL,
    "status" VARCHAR(20) NOT NULL,
    "api_response" TEXT NOT NULL,
    "sent_by" VARCHAR(100),

    CONSTRAINT "report_sheet_log_pkey" PRIMARY KEY ("id")
);

-- หน้า /report-sheet เรียงรอบล่าสุดขึ้นก่อนเสมอ
CREATE INDEX "report_sheet_log_sent_at_idx" ON "report_sheet_log" ("sent_at" DESC);

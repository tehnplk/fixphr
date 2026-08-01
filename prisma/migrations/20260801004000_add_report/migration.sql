CREATE TABLE "report" (
    "hospital_code" VARCHAR(10) NOT NULL,
    "item_no" INTEGER NOT NULL,
    "issue" TEXT,
    "inspection_result" TEXT,
    "note" TEXT,

    CONSTRAINT "report_pkey" PRIMARY KEY ("hospital_code", "item_no")
);

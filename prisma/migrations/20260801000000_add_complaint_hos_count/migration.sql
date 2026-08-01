-- CreateTable
CREATE TABLE "ComplaintHosCount" (
    "province_name" VARCHAR(100) NOT NULL,
    "district_name" VARCHAR(100) NOT NULL,
    "hospital_code" VARCHAR(10) NOT NULL,
    "hospital_name" VARCHAR(255) NOT NULL,
    "hospital_type" VARCHAR(100) NOT NULL,
    "masks" INTEGER NOT NULL,
    "citizens" INTEGER NOT NULL,
    "matched" INTEGER NOT NULL,
    "unmatched" INTEGER NOT NULL,
    "match_rate_pct" DECIMAL(5,1) NOT NULL,

    CONSTRAINT "ComplaintHosCount_pkey" PRIMARY KEY ("hospital_code")
);

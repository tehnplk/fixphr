-- CreateEnum
CREATE TYPE "gender" AS ENUM ('1', '2');

-- CreateTable
CREATE TABLE "hospitals" (
    "hospcode" VARCHAR(10) NOT NULL,
    "hospname" VARCHAR(255) NOT NULL,
    "hospname_short" VARCHAR(255),
    "hostype" VARCHAR(20),
    "address" TEXT,
    "road" TEXT,
    "mu" VARCHAR(20),
    "subdistcode" VARCHAR(20),
    "distcode" VARCHAR(20),
    "provcode" VARCHAR(20),
    "postcode" VARCHAR(20),
    "hoscodenew" VARCHAR(20),
    "bed" VARCHAR(20),
    "level_service" VARCHAR(50),
    "bedhos" VARCHAR(20),
    "hdc_regist" VARCHAR(20),
    "dep" VARCHAR(20),
    "hmain_sent" VARCHAR(20),
    "register_date" VARCHAR(30),
    "mcode" VARCHAR(20),
    "status" VARCHAR(20),
    "m_name" VARCHAR(255),
    "dep_name" VARCHAR(255),
    "zone_code" VARCHAR(20),
    "zone_name" VARCHAR(255),
    "chw_code" VARCHAR(20),
    "chw_name" VARCHAR(255),
    "amp_code" VARCHAR(20),
    "amp_name" VARCHAR(255),
    "tmb_code" VARCHAR(20),
    "tmb_name" VARCHAR(255),
    "bed_cmi" VARCHAR(20),
    "note" TEXT,
    "hostype_new" VARCHAR(20),
    "close_date" VARCHAR(30),
    "is_active" VARCHAR(20),

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("hospcode")
);

-- CreateTable
CREATE TABLE "complaints" (
    "id" SERIAL NOT NULL,
    "cid_hash" VARCHAR(128) NOT NULL,
    "cid" VARCHAR(255) NOT NULL,
    "gender" "gender" NOT NULL,
    "birth_year" SMALLINT NOT NULL,
    "birth_date" DATE,
    "hospcode" VARCHAR(10) NOT NULL,
    "hospname" VARCHAR(255) NOT NULL,
    "visit_date" DATE NOT NULL,
    "detail" TEXT NOT NULL,
    "image" BYTEA[] DEFAULT ARRAY[]::BYTEA[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "complaints_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "complaint_status" (
    "id" SERIAL NOT NULL,
    "complaint_id" INTEGER NOT NULL,
    "status" VARCHAR(50) NOT NULL,
    "note" TEXT,

    CONSTRAINT "complaint_status_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_counters" (
    "key" VARCHAR(50) NOT NULL DEFAULT 'landing_page',
    "count" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "visit_counters_pkey" PRIMARY KEY ("key")
);

-- CreateIndex
CREATE INDEX "hospitals_hospname_idx" ON "hospitals"("hospname");

-- CreateIndex
CREATE INDEX "hospitals_provcode_distcode_idx" ON "hospitals"("provcode", "distcode");

-- CreateIndex
CREATE INDEX "complaints_cid_hash_idx" ON "complaints"("cid_hash");

-- CreateIndex
CREATE INDEX "complaints_hospcode_visit_date_idx" ON "complaints"("hospcode", "visit_date");

-- CreateIndex
CREATE INDEX "complaints_created_at_idx" ON "complaints"("created_at");

-- CreateIndex
CREATE INDEX "complaint_status_complaint_id_idx" ON "complaint_status"("complaint_id");

-- AddForeignKey
ALTER TABLE "complaint_status" ADD CONSTRAINT "complaint_status_complaint_id_fkey" FOREIGN KEY ("complaint_id") REFERENCES "complaints"("id") ON DELETE CASCADE ON UPDATE CASCADE;

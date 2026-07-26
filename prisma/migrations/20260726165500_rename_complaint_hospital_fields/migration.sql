-- RenameColumns
ALTER TABLE "complaints" RENAME COLUMN "hoscode" TO "hospcode";
ALTER TABLE "complaints" RENAME COLUMN "hosname" TO "hospname";

-- RenameIndex
ALTER INDEX "complaints_hoscode_visit_date_idx"
RENAME TO "complaints_hospcode_visit_date_idx";

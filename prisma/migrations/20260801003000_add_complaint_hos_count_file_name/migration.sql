-- AlterTable
ALTER TABLE "ComplaintHosCount"
ADD COLUMN "file_name" VARCHAR(255);

UPDATE "ComplaintHosCount"
SET "file_name" = ''
WHERE "file_name" IS NULL;

ALTER TABLE "ComplaintHosCount"
ALTER COLUMN "file_name" SET NOT NULL;

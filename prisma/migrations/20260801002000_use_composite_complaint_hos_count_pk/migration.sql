-- AlterTable
ALTER TABLE "ComplaintHosCount"
DROP CONSTRAINT "ComplaintHosCount_pkey",
ADD CONSTRAINT "ComplaintHosCount_pkey"
PRIMARY KEY ("date_up", "time_up", "hospital_code");

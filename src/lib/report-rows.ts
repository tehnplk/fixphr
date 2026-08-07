import { getPrisma } from "@/lib/prisma";

// ลำดับช่องกาเครื่องหมาย "ผลการตรวจสอบ" ในแบบฟอร์ม (คอลัมน์ J–Q)
const RESULT_CODES = ["1", "2", "3.1", "3.2", "4", "5", "6", "7"];

const FINAL_LABELS: Record<string, string> = {
  "1": "ยืนยันคงเดิม",
  "2": "ลบ",
  "3": "แก้ไข",
};

// หนึ่งแถวของแบบฟอร์ม = 18 ช่อง เรียงตามคอลัมน์ A–R
export const REPORT_ROW_LENGTH = 18;

export type ReportRow = (string | number)[];

// ใช้ร่วมกันระหว่างไฟล์ Excel (/api/report/export) กับการส่งขึ้น Google Sheet ของเขต
// (/api/report-sheet) เพื่อให้ทั้งสองทางได้ข้อมูลชุดเดียวกันเสมอ
export async function buildReportRows(): Promise<ReportRow[]> {
  const prisma = getPrisma();
  const reports = await prisma.report.findMany({
    orderBy: [{ hospital_code: "asc" }, { item_no: "asc" }],
    select: {
      hospital_code: true,
      comp_date: true,
      issue: true,
      inspection_result: true,
      final_result: true,
      note: true,
    },
  });

  const hospitals = reports.length
    ? await prisma.hospital.findMany({
        where: { hospcode: { in: Array.from(new Set(reports.map((row) => row.hospital_code))) } },
        select: { hospcode: true, hospname: true, chwName: true, ampName: true, mName: true },
      })
    : [];
  const hospitalByCode = new Map(hospitals.map((hospital) => [hospital.hospcode, hospital]));

  return reports
    .map((report) => ({ report, hospital: hospitalByCode.get(report.hospital_code) }))
    .sort((left, right) => {
      const byDistrict = (left.hospital?.ampName ?? "").localeCompare(right.hospital?.ampName ?? "", "th");
      if (byDistrict !== 0) return byDistrict;
      return left.report.hospital_code.localeCompare(right.report.hospital_code);
    })
    .map(({ report, hospital }, index) => [
      report.comp_date ?? "",
      index + 1,
      hospital?.chwName ?? "",
      hospital?.ampName ?? "",
      hospital?.hospname ?? report.hospital_code,
      hospital?.mName === "กระทรวงสาธารณสุข" ? "/" : "",
      hospital?.mName === "องค์กรปกครองส่วนท้องถิ่น" ? "/" : "",
      report.issue ?? "",
      FINAL_LABELS[report.final_result ?? ""] ?? "",
      ...RESULT_CODES.map((code) => (report.inspection_result === code ? "/" : "")),
      report.note ?? "",
    ]);
}

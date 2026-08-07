import ExcelJS from "exceljs";
import { auth } from "@/auth";
import { buildReportRows } from "@/lib/report-rows";

export const dynamic = "force-dynamic";

const TITLE = "การตรวจสอบการลงข้อมูลในระบบหมอพร้อม ของหน่วยบริการ ในเขตสุขภาพที่ 2";

const HEADER_FILL = {
  type: "pattern",
  pattern: "solid",
  fgColor: { argb: "FFEDF2EC" },
} as const;
const BORDER = { style: "thin", color: { argb: "FFB9C7BE" } } as const;
const COLUMN_WIDTHS = [16, 7, 12, 14, 40, 6, 6, 34, 14, 13, 13, 11, 9, 15, 14, 15, 10, 22];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) {
      return Response.json({ message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });
    }
    if (session.user.role !== "super" && session.user.role !== "admin") {
      return Response.json({ message: "เฉพาะผู้ดูแลระบบเท่านั้นที่ส่งออกข้อมูลได้" }, { status: 403 });
    }

    const rows = await buildReportRows();

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("รายงานผลการตรวจสอบ", {
      views: [{ state: "frozen", ySplit: 4 }],
    });

    sheet.addRow([TITLE]);
    sheet.addRow([
      "วัน/เดือน/ปี คำร้อง", "ลำดับ", "จังหวัด", "อำเภอ", "หน่วยงาน",
      "สังกัด (/)", "", "ประเด็นที่แจ้งขอให้ตรวจสอบ", "การดำเนินการ",
      "ผลการตรวจสอบ (/) เลือก 1 ช่อง เท่านั้น", "", "", "", "", "", "", "",
      "(โปรดระบุ)",
    ]);
    sheet.addRow([
      "", "", "", "", "", "สป.", "อปท.", "", "",
      "1. อยู่ระหว่างการวิเคราะห์ข้อมูล", "2. ข้อมูลปกติ ให้บริการจริง",
      "3) Human Error", "", "4) ปรับปรุงข้อมูลที่เกี่ยวข้องกับ KPI",
      "5) ปรับปรุงข้อมูลเพื่อการเบิกจ่าย", "6) ความเข้าใจคลาดเคลื่อนของผู้ร้อง",
      "7) อื่นๆ", "",
    ]);
    sheet.addRow(["", "", "", "", "", "", "", "", "", "", "", "เจ้าหน้าที่", "อสม.", "", "", "", "", ""]);

    sheet.mergeCells("A1:R1");
    for (const column of ["A", "B", "C", "D", "E", "H", "I", "R"]) {
      sheet.mergeCells(`${column}2:${column}4`);
    }
    sheet.mergeCells("F2:G2");
    sheet.mergeCells("J2:Q2");
    for (const column of ["F", "G", "J", "K", "N", "O", "P", "Q"]) {
      sheet.mergeCells(`${column}3:${column}4`);
    }
    sheet.mergeCells("L3:M3");

    for (const row of rows) {
      sheet.addRow(row);
    }

    sheet.getRow(1).font = { name: "TH Sarabun New", size: 16, bold: true };
    sheet.getRow(1).alignment = { horizontal: "center", vertical: "middle" };
    sheet.getRow(1).height = 26;

    for (let rowNumber = 2; rowNumber <= 4; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      row.height = 34;
      row.font = { name: "TH Sarabun New", size: 12, bold: true };
      row.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.fill = HEADER_FILL;
        cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
      });
    }

    COLUMN_WIDTHS.forEach((width, index) => { sheet.getColumn(index + 1).width = width; });

    for (let rowNumber = 5; rowNumber <= sheet.rowCount; rowNumber += 1) {
      const row = sheet.getRow(rowNumber);
      row.font = { name: "TH Sarabun New", size: 12 };
      row.alignment = { vertical: "top", wrapText: true };
      row.eachCell({ includeEmpty: true }, (cell, columnNumber) => {
        cell.border = { top: BORDER, left: BORDER, bottom: BORDER, right: BORDER };
        const isMarkColumn = columnNumber === 2
          || (columnNumber >= 6 && columnNumber <= 7)
          || (columnNumber >= 10 && columnNumber <= 17);
        if (isMarkColumn) cell.alignment = { horizontal: "center", vertical: "top" };
      });
    }

    sheet.autoFilter = { from: { row: 4, column: 1 }, to: { row: sheet.rowCount, column: 18 } };

    const buffer = await workbook.xlsx.writeBuffer();
    const stamp = new Date().toISOString().slice(0, 10);

    return new Response(buffer as ArrayBuffer, {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="fixphr-report-${stamp}.xlsx"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("Unable to export report", error);
    return Response.json({ message: "ส่งออกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

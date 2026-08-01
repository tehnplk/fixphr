import { getPrisma } from "@/lib/prisma";
import { encryptHn } from "@/lib/hn-crypto";
import inspectionResults from "../../../../inspection-result.json";

const RESULT_CODES = new Set(inspectionResults.map((result) => result.code));
const MAX_TEXT_LENGTH = 5_000;

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string" || value.length > maxLength) return undefined;
  const normalized = value.trim();
  return normalized || null;
}

export async function POST(request: Request) {
  try {
    const origin = request.headers.get("origin");
    if (!origin || origin !== new URL(request.url).origin) {
      return Response.json({ message: "คำขอไม่ได้มาจากระบบนี้" }, { status: 403 });
    }

    const body = await request.json();
    const hospitalCode = typeof body.hospital_code === "string"
      ? body.hospital_code.trim()
      : "";
    const itemNo = body.item_no;
    const hn = normalizeText(body.hn, 30);
    const vstdate = normalizeText(body.vstdate, 20);
    const issue = normalizeText(body.issue, MAX_TEXT_LENGTH);
    const note = normalizeText(body.note, MAX_TEXT_LENGTH);
    const inspectionResult = normalizeText(body.inspection_result, 10);
    const clear = body.clear === true;

    if (!hospitalCode || hospitalCode.length > 10 || !Number.isInteger(itemNo) || itemNo < 1) {
      return Response.json({ message: "รหัสโรงพยาบาลหรือรายการไม่ถูกต้อง" }, { status: 400 });
    }
    if (hn === undefined || vstdate === undefined || issue === undefined || note === undefined || inspectionResult === undefined) {
      return Response.json({ message: "ข้อมูลยาวเกินกำหนดหรือรูปแบบไม่ถูกต้อง" }, { status: 400 });
    }
    if (inspectionResult !== null && !RESULT_CODES.has(inspectionResult)) {
      return Response.json({ message: "ผลการตรวจสอบไม่อยู่ในรายการที่กำหนด" }, { status: 400 });
    }
    if (!clear && inspectionResult === null) {
      return Response.json({ message: "กรุณาเลือกผลการตรวจสอบก่อนบันทึก" }, { status: 400 });
    }
    const encryptedHn = encryptHn(hn);

    const prisma = getPrisma();
    const latestSummary = await prisma.complaintHosCount.findFirst({
      where: { hospital_code: hospitalCode },
      orderBy: [{ date_up: "desc" }, { time_up: "desc" }],
      select: { masks: true },
    });

    if (!latestSummary || itemNo > latestSummary.masks) {
      return Response.json({ message: "ไม่พบรายการที่ต้องการบันทึก" }, { status: 404 });
    }

    if (clear) {
      await prisma.report.deleteMany({
        where: {
          hospital_code: hospitalCode,
          item_no: itemNo,
        },
      });
      return Response.json({ saved: true, item_no: itemNo });
    }

    const report = await prisma.report.upsert({
      where: {
        hospital_code_item_no: {
          hospital_code: hospitalCode,
          item_no: itemNo,
        },
      },
      create: {
        hospital_code: hospitalCode,
        item_no: itemNo,
        hn: encryptedHn,
        vstdate,
        issue,
        inspection_result: inspectionResult,
        note,
      },
      update: {
        hn: encryptedHn,
        vstdate,
        issue,
        inspection_result: inspectionResult,
        note,
      },
    });

    return Response.json({ saved: true, item_no: report.item_no });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return Response.json({ message: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
    }

    console.error("Unable to save report row", error);
    return Response.json({ message: "บันทึกข้อมูลไม่สำเร็จ" }, { status: 500 });
  }
}

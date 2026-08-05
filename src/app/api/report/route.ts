import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import { encryptHn } from "@/lib/hn-crypto";
import inspectionResults from "../../../../json_lookup/inspection-result.json";
import finalResults from "../../../../json_lookup/final-result.json";
import visitTypes from "../../../../json_lookup/visit_type.json";

const RESULT_CODES = new Set(inspectionResults.map((result) => result.code));
const FINAL_RESULT_CODES = new Set(finalResults.map((result) => result.code));
const VISIT_TYPE_CODES = new Set(visitTypes.map((visitType) => visitType.code));
const MAX_TEXT_LENGTH = 5_000;

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string" || value.length > maxLength) return undefined;
  const normalized = value.trim();
  return normalized || null;
}

// กัน CSRF แบบเทียบ host — บน prod แอปอยู่หลัง nginx (https ภายนอก, http ภายใน)
// จึงเทียบ origin ตรง ๆ กับ request.url ไม่ได้ ให้เทียบกับ x-forwarded-host แทน
function isTrustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;

  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = (forwardedHost ?? request.headers.get("host") ?? "").split(",")[0].trim();
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    if (!isTrustedOrigin(request)) {
      return Response.json({ message: "คำขอไม่ได้มาจากระบบนี้" }, { status: 403 });
    }

    const session = await auth();
    if (!session?.user) {
      return Response.json({ message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });
    }
    if (session.user.role === "guest") {
      return Response.json({ message: "บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน" }, { status: 403 });
    }
    const actor = (session.user.fullname || session.user.name || session.user.providerId || "").slice(0, 100) || null;

    const body = await request.json();
    const hospitalCode = typeof body.hospital_code === "string"
      ? body.hospital_code.trim()
      : "";
    const itemNo = body.item_no;
    const hn = normalizeText(body.hn, 30);
    const compDate = normalizeText(body.comp_date, 20);
    const vstdate = normalizeText(body.vstdate, 20);
    const visitType = normalizeText(body.visit_type, 10);
    const issue = normalizeText(body.issue, MAX_TEXT_LENGTH);
    const note = normalizeText(body.note, MAX_TEXT_LENGTH);
    const inspectionResult = normalizeText(body.inspection_result, 10);
    const finalResult = normalizeText(body.final_result, 10);
    const clear = body.clear === true;

    if (!hospitalCode || hospitalCode.length > 10 || !Number.isInteger(itemNo) || itemNo < 1) {
      return Response.json({ message: "รหัสโรงพยาบาลหรือรายการไม่ถูกต้อง" }, { status: 400 });
    }
    if (hn === undefined || compDate === undefined || vstdate === undefined || visitType === undefined || issue === undefined || note === undefined || inspectionResult === undefined || finalResult === undefined) {
      return Response.json({ message: "ข้อมูลยาวเกินกำหนดหรือรูปแบบไม่ถูกต้อง" }, { status: 400 });
    }
    if (inspectionResult !== null && !RESULT_CODES.has(inspectionResult)) {
      return Response.json({ message: "ผลการตรวจสอบไม่อยู่ในรายการที่กำหนด" }, { status: 400 });
    }
    if (finalResult !== null && !FINAL_RESULT_CODES.has(finalResult)) {
      return Response.json({ message: "การดำเนินการไม่อยู่ในรายการที่กำหนด" }, { status: 400 });
    }
    if (visitType !== null && !VISIT_TYPE_CODES.has(visitType)) {
      return Response.json({ message: "ประเภทไม่อยู่ในรายการที่กำหนด" }, { status: 400 });
    }
    if (!clear && inspectionResult === null) {
      return Response.json({ message: "กรุณาเลือกผลการตรวจสอบก่อนบันทึก" }, { status: 400 });
    }
    const encryptedHn = encryptHn(hn);

    // ไม่บังคับว่าต้องมีคำร้องมาก่อน ขอแค่เป็นหน่วยบริการที่มีอยู่จริง
    const prisma = getPrisma();
    const hospital = await prisma.hospital.findUnique({
      where: { hospcode: hospitalCode },
      select: { hospcode: true },
    });

    if (!hospital) {
      return Response.json({ message: "ไม่พบหน่วยบริการที่ต้องการบันทึก" }, { status: 404 });
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
        comp_date: compDate,
        vstdate,
        visit_type: visitType,
        issue,
        inspection_result: inspectionResult,
        note,
        final_result: finalResult,
        created_by: actor,
        updated_by: actor,
      },
      update: {
        hn: encryptedHn,
        comp_date: compDate,
        vstdate,
        visit_type: visitType,
        issue,
        inspection_result: inspectionResult,
        note,
        final_result: finalResult,
        updated_by: actor,
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

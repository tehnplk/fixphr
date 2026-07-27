import { createHash } from "node:crypto";
import { type NextRequest, NextResponse } from "next/server";
import { isValidThaiCid } from "@/lib/cid";
import { encryptCid } from "@/lib/cid-crypto";
import { getExternalOrigin, isSameOrigin } from "@/lib/http";
import {
  CONSENT_COOKIE,
  isValidConsentToken,
  isValidFormToken,
} from "@/lib/signed-token";
import { getPrisma } from "@/lib/prisma";

const MAX_IMAGES = 5;
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function parseDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return date.toISOString().slice(0, 10) === value ? date : null;
}

function redirectTo(
  request: Request,
  path: string,
  params: Record<string, string> = {},
) {
  const url = new URL(path, getExternalOrigin(request));
  Object.entries(params).forEach(([key, value]) => url.searchParams.set(key, value));
  return NextResponse.redirect(url, 303);
}

function redirectToForm(request: Request, params: Record<string, string>) {
  return redirectTo(request, "/complaint", params);
}

function hasConsent(request: NextRequest) {
  const consentToken = request.cookies.get(CONSENT_COOKIE)?.value;

  return Boolean(consentToken && isValidConsentToken(consentToken));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const formToken = String(formData.get("form_token") ?? "");

    if (
      !isSameOrigin(request) ||
      !isValidFormToken(formToken) ||
      !hasConsent(request)
    ) {
      return redirectToForm(request, { error: "forbidden" });
    }

    const cid = String(formData.get("cid") ?? "").trim();
    const gender = String(formData.get("gender") ?? "").trim();
    const birthDate = String(formData.get("birth_date") ?? "").trim();
    const birthYear = String(formData.get("birth_year") ?? "").trim();
    const birthDay = String(formData.get("birth_date_day") ?? "").trim();
    const birthMonth = String(formData.get("birth_date_month") ?? "").trim();
    const hospcode = String(formData.get("hospcode") ?? "").trim();
    const hospname = String(formData.get("hospname") ?? "").trim();
    const visitDate = String(formData.get("visit_date") ?? "").trim();
    const detail = String(formData.get("detail") ?? "").trim();
    const birthDateValue = birthDate ? parseDate(birthDate) : null;
    const visitDateValue = parseDate(visitDate);
    const birthYearValue = Number(birthYear);
    const hasBirthDay = birthDay !== "" && birthDay !== "unknown";
    const hasBirthMonth = birthMonth !== "" && birthMonth !== "unknown";
    const hasUnknownBirthDayAndMonth =
      birthDay === "unknown" && birthMonth === "unknown";
    const currentYear = Number(
      new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        timeZone: "Asia/Bangkok",
      }).format(new Date()),
    );
    const images = formData
      .getAll("image")
      .filter((item): item is File => item instanceof File && item.size > 0);

    if (
      !isValidThaiCid(cid) ||
      !["1", "2"].includes(gender) ||
      !Number.isInteger(birthYearValue) ||
      birthYearValue < currentYear - 120 ||
      birthYearValue > currentYear ||
      hasBirthDay !== hasBirthMonth ||
      (!birthDateValue && !hasUnknownBirthDayAndMonth) ||
      (birthDateValue && birthDateValue.getUTCFullYear() !== birthYearValue) ||
      !hospcode ||
      hospcode.length > 10 ||
      !hospname ||
      hospname.length > 255 ||
      !visitDateValue ||
      !detail
    ) {
      return redirectToForm(request, { error: "invalid" });
    }

    const hospital = await getPrisma().hospital.findUnique({
      where: {
        hospcode,
      },
      select: {
        hospname: true,
      },
    });

    if (!hospital || hospital.hospname !== hospname) {
      return redirectToForm(request, { error: "invalid" });
    }

    if (
      images.length > MAX_IMAGES ||
      images.some(
        (image) =>
          !image.type.startsWith("image/") || image.size > MAX_IMAGE_SIZE,
      )
    ) {
      return redirectToForm(request, { error: "image" });
    }

    const imageBytes = await Promise.all(
      images.map(async (image) => new Uint8Array(await image.arrayBuffer())),
    );

    await getPrisma().complaint.create({
      data: {
        cid: encryptCid(cid),
        cidHash: createHash("sha256").update(cid).digest("hex"),
        gender: gender === "1" ? "MALE" : "FEMALE",
        birthYear: birthYearValue,
        birthDate: birthDateValue,
        hospcode,
        hospname: hospital.hospname,
        visitDate: visitDateValue,
        detail,
        image: imageBytes,
        statuses: {
          create: {
            status: "RECEIVED",
            note: "รับเรื่องแจ้งแล้ว",
          },
        },
      },
      select: {
        id: true,
      },
    });

    return redirectTo(request, "/success");
  } catch (error) {
    console.error("Unable to create complaint", error);
    return redirectToForm(request, { error: "server" });
  }
}

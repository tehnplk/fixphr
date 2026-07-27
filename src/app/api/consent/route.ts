import { NextResponse } from "next/server";
import { isSameOrigin } from "@/lib/http";
import {
  CONSENT_COOKIE,
  CONSENT_MAX_AGE_SECONDS,
  createConsentToken,
} from "@/lib/signed-token";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ granted: false }, { status: 403 });
  }

  const response = NextResponse.json(
    { granted: true },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set({
    name: CONSENT_COOKIE,
    value: createConsentToken(),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CONSENT_MAX_AGE_SECONDS,
  });

  return response;
}

import { type NextRequest, NextResponse } from "next/server";
import { getPrisma } from "@/lib/prisma";

const VISIT_COOKIE = "fixphr_visit_counted";

export async function POST(request: NextRequest) {
  const prisma = getPrisma();
  const hasBeenCounted = request.cookies.get(VISIT_COOKIE)?.value === "1";

  if (hasBeenCounted) {
    const counter = await prisma.visitCounter.findUnique({
      where: {
        key: "landing_page",
      },
      select: {
        count: true,
      },
    });

    return NextResponse.json(
      { count: counter?.count ?? 0 },
      { headers: { "Cache-Control": "no-store" } },
    );
  }

  const counter = await prisma.visitCounter.upsert({
    where: {
      key: "landing_page",
    },
    create: {
      key: "landing_page",
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
    select: {
      count: true,
    },
  });

  const response = NextResponse.json(
    { count: counter.count },
    { headers: { "Cache-Control": "no-store" } },
  );

  response.cookies.set({
    name: VISIT_COOKIE,
    value: "1",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  });

  return response;
}

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { auth } from "@/auth";
import { presenceCount, touchPresence } from "@/lib/presence";

export const dynamic = "force-dynamic";

const VISITOR_COOKIE = "fixphr-visitor";
const VISITOR_MAX_AGE = 60 * 60 * 24 * 365;

export async function POST() {
  const session = await auth();
  const userKey = session?.user?.providerId || session?.user?.name || "";

  if (userKey) {
    /* คนที่ล็อกอินยึดตาม providerId จากฝั่ง server เปิดหลายแท็บก็นับเป็นคนเดียว */
    touchPresence(`u:${userKey}`);
    return NextResponse.json({ online: presenceCount() }, {
      headers: { "cache-control": "no-store" },
    });
  }

  /* คนที่ยังไม่ล็อกอินใช้ cookie ที่ server เป็นคนออกให้ ไม่พึ่ง localStorage
     เพราะบางเบราว์เซอร์บล็อก storage แล้วจะนับคนกลุ่มนี้ไม่ได้เลย */
  const store = await cookies();
  const existing = store.get(VISITOR_COOKIE)?.value;
  const visitorId = existing || crypto.randomUUID();
  touchPresence(`g:${visitorId}`);

  const response = NextResponse.json({ online: presenceCount() }, {
    headers: { "cache-control": "no-store" },
  });
  if (!existing) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      maxAge: VISITOR_MAX_AGE,
      path: "/",
      sameSite: "lax",
    });
  }
  return response;
}

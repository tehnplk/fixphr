import { NextResponse } from "next/server";
import { auth } from "@/auth";

// เปิดสาธารณะเฉพาะ /sum/amp (ยอดการตรวจสอบ) กับโมดัลรายหน่วยของแท็บนั้น
// แท็บสรุปผลอื่นทั้งหมดต้องมีสิทธิ์ระดับ user ขึ้นไป
const PROTECTED_PAGE_PREFIXES = [
  "/report",
  "/sum/type",
  "/sum/comp",
  "/sum/final",
  "/sum/visit-type",
  "/sum/visit-year",
  "/manage-user",
];
const PROTECTED_API_PREFIXES = ["/api/report"];
// เฉพาะ role super/admin เท่านั้น
const MANAGER_PAGE_PREFIXES = ["/manage-user"];

function matchesPrefix(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export const proxy = auth((request) => {
  const { pathname, search } = request.nextUrl;
  const isProtectedApi = matchesPrefix(pathname, PROTECTED_API_PREFIXES);
  const isProtectedPage = matchesPrefix(pathname, PROTECTED_PAGE_PREFIXES);
  if (!isProtectedApi && !isProtectedPage) return NextResponse.next();

  const user = request.auth?.user;
  if (!user) {
    if (isProtectedApi) {
      return NextResponse.json({ message: "กรุณาเข้าสู่ระบบก่อนใช้งาน" }, { status: 401 });
    }
    const loginUrl = new URL("/login", request.nextUrl);
    loginUrl.searchParams.set("callbackUrl", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  // ผู้ใช้ใหม่จาก ProviderID จะได้ role "guest" — ต้องให้ผู้ดูแลปรับเป็น user/admin ก่อน
  if (user.role === "guest") {
    if (isProtectedApi) {
      return NextResponse.json({ message: "บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน" }, { status: 403 });
    }
    return NextResponse.redirect(new URL("/login?error=guest", request.nextUrl));
  }

  if (matchesPrefix(pathname, MANAGER_PAGE_PREFIXES) && user.role !== "super" && user.role !== "admin") {
    return NextResponse.redirect(new URL("/login?error=forbidden", request.nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

import { AuthError } from "next-auth";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { IdCard, LockKeyhole, LogIn } from "lucide-react";
import { signIn } from "@/auth";
import styles from "./page.module.css";

const DEFAULT_CALLBACK_URL = "/report";

function localCallbackUrl(value: unknown) {
  const callbackUrl = String(value || "");
  return callbackUrl.startsWith("/") && !callbackUrl.startsWith("//") && !callbackUrl.includes("\\")
    ? callbackUrl
    : DEFAULT_CALLBACK_URL;
}

async function providerLoginAction(formData: FormData) {
  "use server";
  const callbackUrl = localCallbackUrl(formData.get("callbackUrl"));
  const clientId = process.env.HEALTH_CLIENT_ID;
  const redirectUri = process.env.HEALTH_REDIRECT_URI;
  if (!clientId || !redirectUri) redirect("/login?error=provider_config");

  const cookieStore = await cookies();
  cookieStore.set("provider_callback_url", callbackUrl, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  const url = new URL("https://moph.id.th/oauth/redirect");
  url.searchParams.set("client_id", clientId as string);
  url.searchParams.set("redirect_uri", redirectUri as string);
  url.searchParams.set("response_type", "code");
  redirect(url.toString());
}

async function loginAction(formData: FormData) {
  "use server";

  const callbackUrl = localCallbackUrl(formData.get("callbackUrl"));

  try {
    await signIn("credentials", {
      username: formData.get("username"),
      password: formData.get("password"),
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  "1": "ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง",
  provider_not_allowed: "ProviderID นี้ไม่ได้รับอนุญาตให้เข้าสู่ระบบ",
  guest: "บัญชีของคุณยังไม่ได้รับสิทธิ์เข้าใช้งาน กรุณาติดต่อผู้ดูแลระบบ",
  forbidden: "เฉพาะผู้ดูแลระบบ (super/admin) เท่านั้นที่เข้าถึงส่วนนี้ได้",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const callbackUrl = localCallbackUrl(params?.callbackUrl);
  const error = typeof params?.error === "string" ? params.error : "";
  const errorMessage = error
    ? ERROR_MESSAGES[error] || "ไม่สามารถเข้าสู่ระบบด้วย ProviderID ได้ กรุณาลองใหม่อีกครั้ง"
    : "";
  const passwordLoginEnabled = Boolean(process.env.SUPER_USER_PASSWORD);

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <section className={styles.panel}>
        <div className={styles.header}>
          <span className={styles.iconBadge}>
            <LockKeyhole aria-hidden="true" />
          </span>
          <div>
            <p className={styles.eyebrow}>FixPHR — เข้าสู่ระบบ</p>
            <h1>สำหรับเจ้าหน้าที่</h1>
          </div>
        </div>

        {errorMessage ? <div className={styles.error}>{errorMessage}</div> : null}

        <form action={providerLoginAction}>
          <input type="hidden" name="callbackUrl" value={callbackUrl} />
          <button type="submit" className={styles.providerButton}>
            <IdCard aria-hidden="true" />
            เข้าระบบด้วย ProviderID
          </button>
        </form>

        {passwordLoginEnabled ? (
          <>
            <div className={styles.divider} aria-hidden="true">
              <span>หรือ</span>
            </div>

            <form action={loginAction} className={styles.form}>
              <input type="hidden" name="callbackUrl" value={callbackUrl} />
              <label>
                ชื่อผู้ใช้
                <input name="username" type="text" autoComplete="username" required />
              </label>
              <label>
                รหัสผ่าน
                <input name="password" type="password" autoComplete="current-password" required />
              </label>
              <button type="submit" className={styles.primary}>
                <LogIn aria-hidden="true" />
                เข้าสู่ระบบ
              </button>
            </form>
          </>
        ) : null}
      </section>
    </main>
  );
}

import Link from "next/link";
import { Home, TriangleAlert } from "lucide-react";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import styles from "./page.module.css";

const DEFAULT_MESSAGE = "เกิดข้อผิดพลาด";

// hcode-hname ของผู้ใช้ อ่านจากตาราง user_provider (ข้อมูลล่าสุดจากการ login ด้วย ProviderID)
async function getProviderOrganization(providerId: string | undefined) {
  if (!providerId) return "";
  try {
    const row = await getPrisma().userProvider.findUnique({
      where: { provider_id: providerId },
      select: { hoscode: true, hname: true },
    });
    return [row?.hoscode, row?.hname].filter(Boolean).join(" - ");
  } catch {
    return "";
  }
}

export default async function ErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ msg?: string | string[] }>;
}) {
  const { msg } = await searchParams;
  const message = (typeof msg === "string" ? msg.trim() : "").slice(0, 200) || DEFAULT_MESSAGE;

  const session = await auth();
  const user = session?.user;
  const name = user ? user.fullname || user.name || "" : "";
  const initial = user?.avatarInitial || Array.from(name)[0] || "?";
  const organization = await getProviderOrganization(user?.providerId);

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />

      <section className={styles.panel} role="alert">
        <span className={styles.iconBadge}>
          <TriangleAlert aria-hidden="true" />
        </span>

        {user ? (
          <div className={styles.profile}>
            <span className={styles.avatar} aria-hidden="true">{initial}</span>
            <span className={styles.profileName}>{name}</span>
            <span className={styles.organization}>{organization || "ไม่มีข้อมูลหน่วยงาน"}</span>
          </div>
        ) : null}

        <p className={styles.message}>{message}</p>
        <Link href="/" className={styles.back}>
          <Home aria-hidden="true" />
          กลับหน้าแรก
        </Link>
      </section>
    </main>
  );
}

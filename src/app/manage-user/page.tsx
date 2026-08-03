import { redirect } from "next/navigation";
import { UserCog, Users } from "lucide-react";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getProviderOrganizations,
  type ProviderOrganization,
  type ProviderProfile,
} from "@/lib/provider-auth";
import ManageUserTable, { type ManageUserRow } from "./ManageUserTable";
import styles from "./page.module.css";

export const dynamic = "force-dynamic";

const ROLE_OPTIONS = [
  { value: "guest", label: "guest — รออนุมัติ" },
  { value: "user", label: "user — ใช้งานทั่วไป" },
  { value: "admin", label: "admin — ผู้ดูแลระบบ" },
];

function organizationsOf(user: { profile: unknown; hoscode: string | null; hname: string | null }) {
  const fromProfile = user.profile
    ? getProviderOrganizations(user.profile as ProviderProfile)
    : [];
  if (fromProfile.length > 0) return fromProfile;
  if (user.hoscode || user.hname) {
    return [{ hcode: user.hoscode || "", hname: user.hname || "" } satisfies ProviderOrganization];
  }
  return [];
}

function formatDateTime(value: Date | null) {
  if (!value) return "-";
  return value.toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "short",
    timeStyle: "short",
  });
}

export default async function ManageUserPage() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "super" && role !== "admin") {
    redirect("/login?error=forbidden&callbackUrl=%2Fmanage-user");
  }

  const users = await getPrisma().userProvider.findMany({
    orderBy: { id: "asc" },
  });

  /* แปลงเป็นข้อมูลพร้อมใช้ตั้งแต่ฝั่ง server — แกะหน่วยบริการออกจาก profile
     และจัดรูปแบบวันที่ให้เรียบร้อย ฝั่ง client จะได้ไม่ต้องรู้จัก schema
     และไม่เกิด hydration mismatch จากการ format วันที่คนละ timezone */
  const rows: ManageUserRow[] = users.map((user) => ({
    id: user.id,
    fullname: user.fullname || "",
    providerId: user.provider_id,
    organizations: organizationsOf(user).map((organization) => ({
      hcode: organization.hcode || "",
      hname: organization.hname || "",
    })),
    role: user.role,
    loginCount: user.login_count,
    lastActivity: formatDateTime(user.last_activity),
    isActive: user.is_active,
  }));

  const roleFilterOptions = [...new Set(users.map((user) => user.role))]
    .filter(Boolean)
    .sort()
    .map((value) => ({
      value,
      label: ROLE_OPTIONS.find((option) => option.value === value)?.label ?? value,
    }));

  return (
    <main className={styles.page}>
      <div className={styles.grid} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <UserCog aria-hidden="true" />
          <div>
            <h1>จัดการผู้ใช้</h1>
            <p>กำหนดสิทธิ์และสถานะของผู้ใช้ที่เข้าระบบด้วย ProviderID</p>
          </div>
          <span className={styles.count}>
            <Users aria-hidden="true" />
            {users.length} บัญชี
          </span>
        </header>

        <section className={styles.panel}>
          {rows.length === 0 ? (
            <p className={styles.empty}>ยังไม่มีผู้ใช้เข้าระบบด้วย ProviderID</p>
          ) : (
            <ManageUserTable
              roleFilterOptions={roleFilterOptions}
              roleOptions={ROLE_OPTIONS}
              rows={rows}
            />
          )}
          <p className={styles.hint}>
            การเปลี่ยนสิทธิ์จะมีผลเมื่อผู้ใช้เข้าสู่ระบบครั้งถัดไป
          </p>
        </section>
      </div>
    </main>
  );
}

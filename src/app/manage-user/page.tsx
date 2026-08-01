import { redirect } from "next/navigation";
import { UserCog, Users } from "lucide-react";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";
import {
  getProviderOrganizations,
  type ProviderOrganization,
  type ProviderProfile,
} from "@/lib/provider-auth";
import { toggleUserActive, updateUserRole } from "./actions";
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
          {users.length === 0 ? (
            <p className={styles.empty}>ยังไม่มีผู้ใช้เข้าระบบด้วย ProviderID</p>
          ) : (
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>ชื่อ-สกุล</th>
                    <th>ProviderID</th>
                    <th>หน่วยบริการ</th>
                    <th>สิทธิ์</th>
                    <th>เข้าระบบ</th>
                    <th>ล่าสุด</th>
                    <th>สถานะ</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => (
                    <tr key={user.id} className={user.is_active ? undefined : styles.inactive}>
                      <td>{index + 1}</td>
                      <td className={styles.name}>{user.fullname || "-"}</td>
                      <td className={styles.mono}>{user.provider_id}</td>
                      <td>
                        {organizationsOf(user).length === 0 ? (
                          "-"
                        ) : (
                          <ul className={styles.orgList}>
                            {organizationsOf(user).map((organization, orgIndex) => (
                              <li key={`${organization.hcode}-${orgIndex}`}>
                                <span className={styles.mono}>{organization.hcode || "-"}</span>
                                {organization.hname ? (
                                  <span className={styles.hname}> {organization.hname}</span>
                                ) : null}
                              </li>
                            ))}
                          </ul>
                        )}
                      </td>
                      <td>
                        <form action={updateUserRole} className={styles.roleForm}>
                          <input type="hidden" name="id" value={user.id} />
                          <select name="role" defaultValue={user.role}>
                            {ROLE_OPTIONS.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                          <button type="submit">บันทึก</button>
                        </form>
                      </td>
                      <td className={styles.center}>{user.login_count}</td>
                      <td>{formatDateTime(user.last_activity)}</td>
                      <td>
                        <form action={toggleUserActive}>
                          <input type="hidden" name="id" value={user.id} />
                          <button
                            type="submit"
                            className={user.is_active ? styles.activeBtn : styles.inactiveBtn}
                          >
                            {user.is_active ? "ใช้งานได้" : "ถูกระงับ"}
                          </button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <p className={styles.hint}>
            การเปลี่ยนสิทธิ์จะมีผลเมื่อผู้ใช้เข้าสู่ระบบครั้งถัดไป
          </p>
        </section>
      </div>
    </main>
  );
}

"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { getPrisma } from "@/lib/prisma";

const ASSIGNABLE_ROLES = new Set(["guest", "user", "admin"]);

async function requireManager() {
  const session = await auth();
  const role = session?.user?.role;
  if (role !== "super" && role !== "admin") {
    throw new Error("ต้องเป็นผู้ดูแลระบบ (super/admin) เท่านั้น");
  }
  return session;
}

export async function updateUserRole(formData: FormData) {
  await requireManager();
  const id = Number(formData.get("id"));
  const role = String(formData.get("role") || "");
  if (!Number.isInteger(id) || !ASSIGNABLE_ROLES.has(role)) {
    throw new Error("ข้อมูลไม่ถูกต้อง");
  }
  await getPrisma().userProvider.update({ where: { id }, data: { role } });
  revalidatePath("/manage-user");
}

export async function toggleUserActive(formData: FormData) {
  await requireManager();
  const id = Number(formData.get("id"));
  if (!Number.isInteger(id)) throw new Error("ข้อมูลไม่ถูกต้อง");
  const prisma = getPrisma();
  const user = await prisma.userProvider.findUnique({ where: { id }, select: { is_active: true } });
  if (!user) throw new Error("ไม่พบผู้ใช้");
  await prisma.userProvider.update({ where: { id }, data: { is_active: !user.is_active } });
  revalidatePath("/manage-user");
}

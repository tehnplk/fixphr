import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { getPrisma } from "@/lib/prisma";

export type ProviderProfile = Record<string, unknown>;

export type ProviderIdentity = {
  providerId: string;
  fullname: string;
  hoscode: string | null;
  hname: string | null;
  cidHash: string | null;
  avatarInitial: string;
};

export type ProviderUser = ProviderIdentity & {
  role: string;
};

function firstText(...values: unknown[]) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value.trim();
    if (typeof value === "number") return String(value);
  }
  return "";
}

export type ProviderOrganization = {
  hcode: string;
  hname: string;
};

// คืนทุก organization ใน profile (ผู้ใช้บางคนสังกัดมากกว่า 1 หน่วยบริการ)
export function getProviderOrganizations(profile: ProviderProfile): ProviderOrganization[] {
  const raw = Array.isArray(profile?.organizations)
    ? profile.organizations
    : Array.isArray(profile?.organization)
      ? profile.organization
      : [];
  const results: ProviderOrganization[] = [];
  for (const item of raw) {
    try {
      const organization = typeof item === "string" ? JSON.parse(item) : item;
      const hcode = firstText(organization?.hcode);
      const hname = firstText(organization?.hname_th, organization?.hname_eng);
      if (hcode || hname) results.push({ hcode, hname });
    } catch {
      // Ignore malformed organization entries from the upstream profile.
    }
  }
  return results;
}

export function getProviderIdentity(profile: ProviderProfile): ProviderIdentity {
  const providerId = firstText(profile?.provider_id, profile?.account_id);
  const fullname =
    [profile?.title_th, profile?.firstname_th, profile?.lastname_th]
      .filter((value): value is string => typeof value === "string" && Boolean(value.trim()))
      .map((value) => value.trim())
      .join("") || firstText(profile?.name_th, profile?.name);
  // ใช้ organization แรกที่มี hcode เป็นหน่วยหลัก (ดูทุกหน่วยได้จาก getProviderOrganizations)
  const organizations = getProviderOrganizations(profile);
  const primary = organizations.find((organization) => organization.hcode) || organizations[0];
  const hoscode = firstText(primary?.hcode, profile?.hcode);
  const hname = primary?.hname || "";
  const upstreamCidHash = firstText(profile?.hash_cid);
  const cid = firstText(profile?.cid, profile?.citizen_id);
  const cidHash = upstreamCidHash || (cid ? createHash("sha256").update(cid).digest("hex") : null);
  const avatarInitial = Array.from(firstText(profile?.firstname_th))[0] || "";
  return { providerId, fullname, hoscode: hoscode || null, hname: hname || null, cidHash, avatarInitial };
}

function getAuthSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET is required for ProviderID authentication");
  return secret;
}

export function signProviderProfile(serializedProfile: string) {
  return createHmac("sha256", getAuthSecret()).update(serializedProfile).digest("hex");
}

export function verifyProviderProfile(serializedProfile: string, signature: string) {
  if (!serializedProfile || !signature) return false;
  const expected = signProviderProfile(serializedProfile);
  const actualBuffer = Buffer.from(String(signature), "hex");
  const expectedBuffer = Buffer.from(expected, "hex");
  return actualBuffer.length === expectedBuffer.length && timingSafeEqual(actualBuffer, expectedBuffer);
}

export async function registerProviderUser(profile: ProviderProfile): Promise<ProviderUser | null> {
  const identity = getProviderIdentity(profile);
  if (!identity.providerId) throw new Error("ProviderID profile is missing provider_id");
  const prisma = getPrisma();
  const existing = await prisma.userProvider.findUnique({
    where: { provider_id: identity.providerId },
  });

  if (existing) {
    if (!existing.is_active) return null;
    const updated = await prisma.userProvider.update({
      where: { id: existing.id },
      data: {
        cid_hash: identity.cidHash,
        fullname: identity.fullname || null,
        hoscode: identity.hoscode,
        hname: identity.hname,
        login_count: { increment: 1 },
        last_activity: new Date(),
        profile: profile as object,
      },
    });
    return { ...identity, role: updated.role };
  }

  // login ครั้งแรก: ถ้าสังกัดหน่วยบริการที่อยู่ในตาราง hospitals ให้เป็น user ทันที ไม่ต้องรออนุมัติ
  const hcodes = getProviderOrganizations(profile)
    .map((organization) => organization.hcode)
    .filter(Boolean);
  if (identity.hoscode) hcodes.push(identity.hoscode);
  const knownHospital = hcodes.length
    ? await prisma.hospital.findFirst({
        where: { hospcode: { in: hcodes } },
        select: { hospcode: true },
      })
    : null;

  const created = await prisma.userProvider.create({
    data: {
      provider_id: identity.providerId,
      cid_hash: identity.cidHash,
      fullname: identity.fullname || null,
      hoscode: identity.hoscode,
      hname: identity.hname,
      role: knownHospital ? "user" : "guest",
      login_count: 1,
      last_activity: new Date(),
      is_active: true,
      profile: profile as object,
    },
  });
  return { ...identity, role: created.role };
}

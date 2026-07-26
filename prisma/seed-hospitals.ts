import "dotenv/config";
import { readFile } from "node:fs/promises";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";

const sourceHeaders = [
  "hospcode", "hospname", "hospname_short", "hostype", "address", "road",
  "mu", "subdistcode", "distcode", "provcode", "postcode", "hoscodenew",
  "bed", "level_service", "bedhos", "hdc_regist", "dep", "hmain_sent",
  "register_date", "mcode", "status", "m_name", "dep_name", "zone_code",
  "zone_name", "chw_code", "chw_name", "amp_code", "amp_name", "tmb_code",
  "tmb_name", "bed_cmi", "note", "hostype_new", "close_date", "is_active",
] as const;

const fieldMap = {
  hospcode: "hospcode", hospname: "hospname", hospname_short: "hospnameShort",
  hostype: "hostype", address: "address", road: "road", mu: "mu",
  subdistcode: "subdistcode", distcode: "distcode", provcode: "provcode",
  postcode: "postcode", hoscodenew: "hoscodenew", bed: "bed",
  level_service: "levelService", bedhos: "bedhos", hdc_regist: "hdcRegist",
  dep: "dep", hmain_sent: "hmainSent", register_date: "registerDate",
  mcode: "mcode", status: "status", m_name: "mName", dep_name: "depName",
  zone_code: "zoneCode", zone_name: "zoneName", chw_code: "chwCode",
  chw_name: "chwName", amp_code: "ampCode", amp_name: "ampName",
  tmb_code: "tmbCode", tmb_name: "tmbName", bed_cmi: "bedCmi", note: "note",
  hostype_new: "hostypeNew", close_date: "closeDate", is_active: "isActive",
} as const;

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("DATABASE_URL is not configured");
}

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString }),
});

async function main() {
  const file = await readFile("seed/c_hospital.txt", "utf8");
  const rows = file.trim().split(/\r?\n/);
  const header = rows.shift()?.split("|");

  if (header?.join("|") !== sourceHeaders.join("|")) {
    throw new Error("Unexpected c_hospital.txt header");
  }

  for (const row of rows) {
    const values = row.split("|");
    const data: Record<string, string | null> = {};

    sourceHeaders.forEach((sourceHeader, index) => {
      const value = values[index]?.trim() ?? "";
      data[fieldMap[sourceHeader]] = value || null;
    });

    const hospcode = data.hospcode;
    const hospname = data.hospname;

    if (!hospcode || !hospname) {
      throw new Error("Hospital row is missing hospcode or hospname");
    }

    await prisma.hospital.upsert({
      where: { hospcode },
      create: data as never,
      update: Object.fromEntries(
        Object.entries(data).filter(([key]) => key !== "hospcode"),
      ) as never,
    });
  }

  console.log(`Imported ${rows.length} hospitals.`);
}

main()
  .finally(async () => prisma.$disconnect());

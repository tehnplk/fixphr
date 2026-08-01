import { config } from "dotenv";

config({ path: ".env.local" });
config();

async function main() {
  const { encryptHn, isEncryptedHn } = await import("../src/lib/hn-crypto");
  const { getPrisma } = await import("../src/lib/prisma");
  const prisma = getPrisma();

  try {
    const reports = await prisma.report.findMany({
      where: { hn: { not: null } },
      select: { hospital_code: true, item_no: true, hn: true },
    });
    const plaintextReports = reports.filter(
      (report): report is typeof report & { hn: string } =>
        Boolean(report.hn && !isEncryptedHn(report.hn)),
    );

    await prisma.$transaction(
      plaintextReports.map((report) =>
        prisma.report.update({
          where: {
            hospital_code_item_no: {
              hospital_code: report.hospital_code,
              item_no: report.item_no,
            },
          },
          data: { hn: encryptHn(report.hn) },
        }),
      ),
    );

    console.log(`Encrypted ${plaintextReports.length} existing HN value(s).`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Unable to encrypt existing report HN values", error);
  process.exitCode = 1;
});

import "dotenv/config";
import { encryptCid, isEncryptedCid } from "../src/lib/cid-crypto";
import { getPrisma } from "../src/lib/prisma";

async function main() {
  const prisma = getPrisma();
  const complaints = await prisma.complaint.findMany({
    select: {
      id: true,
      cid: true,
    },
  });

  let encrypted = 0;
  let skipped = 0;

  for (const complaint of complaints) {
    if (isEncryptedCid(complaint.cid)) {
      skipped += 1;
      continue;
    }

    await prisma.complaint.update({
      where: {
        id: complaint.id,
      },
      data: {
        cid: encryptCid(complaint.cid),
      },
    });
    encrypted += 1;
  }

  console.log(`Encrypted ${encrypted} row(s), skipped ${skipped} already-encrypted row(s).`);
}

main()
  .catch((error) => {
    console.error("Unable to encrypt existing CIDs", error);
    process.exitCode = 1;
  })
  .finally(() => getPrisma().$disconnect());

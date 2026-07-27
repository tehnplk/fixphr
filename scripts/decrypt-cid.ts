import "dotenv/config";
import { decryptCid, isEncryptedCid } from "../src/lib/cid-crypto";
import { getPrisma } from "../src/lib/prisma";

async function main() {
  const id = Number(process.argv[2]);

  if (!Number.isInteger(id)) {
    console.error("Usage: npm run cid:decrypt -- <complaint-id>");
    process.exitCode = 1;
    return;
  }

  const complaint = await getPrisma().complaint.findUnique({
    where: {
      id,
    },
    select: {
      id: true,
      cid: true,
    },
  });

  if (!complaint) {
    console.error(`Complaint #${id} not found`);
    process.exitCode = 1;
    return;
  }

  const cid = isEncryptedCid(complaint.cid)
    ? decryptCid(complaint.cid)
    : complaint.cid;

  console.log(`Complaint #${complaint.id} CID: ${cid}`);
}

main()
  .catch((error) => {
    console.error("Unable to decrypt CID", error);
    process.exitCode = 1;
  })
  .finally(() => getPrisma().$disconnect());

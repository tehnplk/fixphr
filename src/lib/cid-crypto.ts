import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const ENCRYPTED_PREFIX = "enc1";

function getKey() {
  const passphrase = process.env.CID_ENCRYPTION_KEY;

  if (!passphrase) {
    throw new Error("CID_ENCRYPTION_KEY must be configured");
  }

  return createHash("sha256").update(passphrase).digest();
}

export function isEncryptedCid(value: string) {
  return value.startsWith(`${ENCRYPTED_PREFIX}.`);
}

export function encryptCid(cid: string) {
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(cid, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    ENCRYPTED_PREFIX,
    iv.toString("base64url"),
    ciphertext.toString("base64url"),
    authTag.toString("base64url"),
  ].join(".");
}

export function decryptCid(value: string) {
  const [prefix, ivValue, ciphertextValue, authTagValue, extra] =
    value.split(".");

  if (prefix !== ENCRYPTED_PREFIX || !ivValue || !ciphertextValue || !authTagValue || extra) {
    throw new Error("Invalid encrypted CID format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivValue, "base64url"),
  );
  decipher.setAuthTag(Buffer.from(authTagValue, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(ciphertextValue, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

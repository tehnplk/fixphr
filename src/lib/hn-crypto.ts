import {
  createCipheriv,
  createDecipheriv,
  randomBytes,
  scryptSync,
} from "node:crypto";

const ALGORITHM = "aes-256-gcm";
const PREFIX = "v1";
const AAD = Buffer.from("fixphr:report:hn:v1", "utf8");
const KEY_SALT = "fixphr-report-hn-key-v1";

let derivedKey: Buffer | undefined;

function getKey() {
  if (derivedKey) return derivedKey;

  const secret = process.env.AES_SECRET;
  if (!secret) throw new Error("AES_SECRET is not configured");

  derivedKey = scryptSync(secret, KEY_SALT, 32);
  return derivedKey;
}

export function isEncryptedHn(value: string) {
  return value.startsWith(`${PREFIX}:`);
}

export function encryptHn(value: string | null) {
  if (!value) return null;
  if (isEncryptedHn(value)) return value;

  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGORITHM, getKey(), iv);
  cipher.setAAD(AAD);
  const encrypted = Buffer.concat([
    cipher.update(value, "utf8"),
    cipher.final(),
  ]);

  return [
    PREFIX,
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    encrypted.toString("base64url"),
  ].join(":");
}

export function decryptHn(value: string | null | undefined) {
  if (!value) return "";
  if (!isEncryptedHn(value)) return value;

  const [version, ivText, authTagText, encryptedText] = value.split(":");
  if (version !== PREFIX || !ivText || !authTagText || !encryptedText) {
    throw new Error("Encrypted HN has an invalid format");
  }

  const decipher = createDecipheriv(
    ALGORITHM,
    getKey(),
    Buffer.from(ivText, "base64url"),
  );
  decipher.setAAD(AAD);
  decipher.setAuthTag(Buffer.from(authTagText, "base64url"));

  return Buffer.concat([
    decipher.update(Buffer.from(encryptedText, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}

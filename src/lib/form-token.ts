import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const FORM_TOKEN_TTL_SECONDS = 10 * 60;

function getSecret() {
  const secret = process.env.FORM_TOKEN_SECRET;

  if (!secret) {
    throw new Error("FORM_TOKEN_SECRET must be configured");
  }

  return secret;
}

export function createFormToken(now = Date.now()) {
  const expiresAt = Math.floor(now / 1000) + FORM_TOKEN_TTL_SECONDS;
  const payload = `${expiresAt}.${randomBytes(16).toString("hex")}`;
  const signature = createHmac("sha256", getSecret())
    .update(payload)
    .digest("base64url");

  return `${payload}.${signature}`;
}

export function isValidFormToken(token: string, now = Date.now()) {
  const [expiresAtValue, nonce, signature, extra] = token.split(".");
  const expiresAt = Number(expiresAtValue);

  if (
    extra ||
    !nonce ||
    !signature ||
    !Number.isSafeInteger(expiresAt) ||
    expiresAt < Math.floor(now / 1000)
  ) {
    return false;
  }

  const expected = createHmac("sha256", getSecret())
    .update(`${expiresAtValue}.${nonce}`)
    .digest("base64url");
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);

  return (
    expectedBytes.length === signatureBytes.length &&
    timingSafeEqual(expectedBytes, signatureBytes)
  );
}

import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const FORM_TOKEN_TTL_SECONDS = 10 * 60;
const CONSENT_TOKEN_TTL_SECONDS = 60 * 60;

export const CONSENT_COOKIE = "fixphr_consent";
export const CONSENT_MAX_AGE_SECONDS = CONSENT_TOKEN_TTL_SECONDS;

function getSecret() {
  const secret = process.env.FORM_TOKEN_SECRET;

  if (!secret) {
    throw new Error("FORM_TOKEN_SECRET must be configured");
  }

  return secret;
}

// the purpose is signed into the token so a form token cannot pass as a consent
// token and vice versa, even though both are signed with the same secret
function sign(purpose: string, payload: string) {
  return createHmac("sha256", getSecret())
    .update(`${purpose}.${payload}`)
    .digest("base64url");
}

function createToken(purpose: string, ttlSeconds: number, now: number) {
  const expiresAt = Math.floor(now / 1000) + ttlSeconds;
  const payload = `${expiresAt}.${randomBytes(16).toString("hex")}`;

  return `${payload}.${sign(purpose, payload)}`;
}

function isValidToken(purpose: string, token: string, now: number) {
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

  const expected = sign(purpose, `${expiresAtValue}.${nonce}`);
  const expectedBytes = Buffer.from(expected);
  const signatureBytes = Buffer.from(signature);

  return (
    expectedBytes.length === signatureBytes.length &&
    timingSafeEqual(expectedBytes, signatureBytes)
  );
}

export function createFormToken(now = Date.now()) {
  return createToken("form", FORM_TOKEN_TTL_SECONDS, now);
}

export function isValidFormToken(token: string, now = Date.now()) {
  return isValidToken("form", token, now);
}

export function createConsentToken(now = Date.now()) {
  return createToken("consent", CONSENT_TOKEN_TTL_SECONDS, now);
}

export function isValidConsentToken(token: string, now = Date.now()) {
  return isValidToken("consent", token, now);
}

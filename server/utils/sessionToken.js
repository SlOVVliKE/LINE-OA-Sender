import crypto from "node:crypto";

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000;

function base64Url(input) {
  return Buffer.from(input).toString("base64url");
}

function sign(payload, secret) {
  return crypto
    .createHmac("sha256", secret)
    .update(payload)
    .digest("base64url");
}

export function createSessionToken(secret, session = {}, now = Date.now()) {
  const payload = base64Url(JSON.stringify({ ...session, iat: now }));
  return `${payload}.${sign(payload, secret)}`;
}

export function verifySessionToken(token, secret, now = Date.now()) {
  if (!token || !secret || !token.includes(".")) return false;

  const [payload, signature] = token.split(".");
  const expected = sign(payload, secret);
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);

  if (
    signatureBuffer.length !== expectedBuffer.length ||
    !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)
  ) {
    return false;
  }

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    if (!Number.isFinite(data.iat) || now - data.iat > SESSION_TTL_MS) {
      return false;
    }
    return data;
  } catch {
    return false;
  }
}

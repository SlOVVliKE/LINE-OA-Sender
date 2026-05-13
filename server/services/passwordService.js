import crypto from "node:crypto";

const KEY_LENGTH = 32;

export function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("base64url");
  const hash = crypto.scryptSync(password, salt, KEY_LENGTH).toString("base64url");
  return `scrypt:${salt}:${hash}`;
}

export function verifyPassword(password, storedHash) {
  if (!password || !storedHash) return false;

  const [scheme, salt, hash] = storedHash.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;

  const expected = crypto.scryptSync(password, salt, KEY_LENGTH).toString("base64url");
  const left = Buffer.from(hash);
  const right = Buffer.from(expected);

  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

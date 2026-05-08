import crypto from "node:crypto";

export function createLineSignature(rawBody, channelSecret) {
  return crypto
    .createHmac("sha256", channelSecret)
    .update(rawBody)
    .digest("base64");
}

export function validateLineSignature(rawBody, signature, channelSecret) {
  if (!rawBody || !signature || !channelSecret) return false;

  const expected = createLineSignature(rawBody, channelSecret);
  const expectedBuffer = Buffer.from(expected);
  const signatureBuffer = Buffer.from(signature);

  return (
    expectedBuffer.length === signatureBuffer.length &&
    crypto.timingSafeEqual(expectedBuffer, signatureBuffer)
  );
}

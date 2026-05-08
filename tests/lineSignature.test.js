import { describe, expect, it } from "vitest";
import {
  createLineSignature,
  validateLineSignature
} from "../server/utils/lineSignature.js";

describe("LINE signature validation", () => {
  it("accepts a valid HMAC signature", () => {
    const body = Buffer.from(JSON.stringify({ events: [] }));
    const secret = "channel-secret";
    const signature = createLineSignature(body, secret);

    expect(validateLineSignature(body, signature, secret)).toBe(true);
  });

  it("rejects a changed body", () => {
    const body = Buffer.from(JSON.stringify({ events: [] }));
    const signature = createLineSignature(body, "channel-secret");

    expect(
      validateLineSignature(
        Buffer.from(JSON.stringify({ events: [{ type: "message" }] })),
        signature,
        "channel-secret"
      )
    ).toBe(false);
  });
});

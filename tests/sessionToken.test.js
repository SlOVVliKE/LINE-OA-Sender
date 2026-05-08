import { describe, expect, it } from "vitest";
import {
  createSessionToken,
  verifySessionToken
} from "../server/utils/sessionToken.js";

describe("admin session token", () => {
  it("verifies a fresh signed token", () => {
    const token = createSessionToken("secret", 1000);
    expect(verifySessionToken(token, "secret", 2000)).toBe(true);
  });

  it("rejects tampered tokens", () => {
    const token = createSessionToken("secret", 1000);
    expect(verifySessionToken(`${token}x`, "secret", 2000)).toBe(false);
  });
});

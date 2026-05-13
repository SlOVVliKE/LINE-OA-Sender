import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../server/services/passwordService.js";

describe("password service", () => {
  it("verifies hashed passwords", () => {
    const hash = hashPassword("secret-pass");
    expect(verifyPassword("secret-pass", hash)).toBe(true);
  });

  it("rejects wrong passwords", () => {
    const hash = hashPassword("secret-pass");
    expect(verifyPassword("other-pass", hash)).toBe(false);
  });
});

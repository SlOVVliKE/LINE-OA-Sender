import { describe, expect, it } from "vitest";
import { validateUpload } from "../server/services/imageService.js";

describe("image upload validation", () => {
  it("allows png and jpeg under 10MB", () => {
    expect(validateUpload({ mimetype: "image/png", size: 1024 })).toBe(null);
    expect(validateUpload({ mimetype: "image/jpeg", size: 1024 })).toBe(null);
  });

  it("rejects missing, unsupported, and oversized files", () => {
    expect(validateUpload(null)).toContain("กรุณา");
    expect(validateUpload({ mimetype: "image/gif", size: 1024 })).toContain("JPG");
    expect(
      validateUpload({ mimetype: "image/png", size: 11 * 1024 * 1024 })
    ).toContain("10 MB");
  });
});

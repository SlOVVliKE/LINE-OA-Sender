import { describe, expect, it } from "vitest";
import { buildLineMessages } from "../server/services/messageBuilder.js";

describe("LINE message builder", () => {
  it("builds text and image messages together", () => {
    const messages = buildLineMessages({
      messageText: " สวัสดี ",
      image: {
        original_url: "https://example.com/original.png",
        preview_url: "https://example.com/preview.png"
      }
    });

    expect(messages).toEqual([
      { type: "text", text: "สวัสดี" },
      {
        type: "image",
        originalContentUrl: "https://example.com/original.png",
        previewImageUrl: "https://example.com/preview.png"
      }
    ]);
  });

  it("returns no messages when text and image are empty", () => {
    expect(buildLineMessages({ messageText: "  " })).toEqual([]);
  });
});

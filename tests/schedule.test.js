import { describe, expect, it } from "vitest";
import { isCampaignDue } from "../server/utils/schedule.js";

const baseCampaign = {
  enabled: true,
  send_time: "09:00",
  timezone: "Asia/Bangkok",
  message_text: "Hello",
  image_id: null,
  last_sent_date: null
};

describe("daily campaign schedule", () => {
  it("is due after the configured Bangkok time", () => {
    const result = isCampaignDue(
      baseCampaign,
      new Date("2026-05-08T02:01:00.000Z")
    );

    expect(result).toMatchObject({
      due: true,
      date: "2026-05-08"
    });
  });

  it("does not send before the configured time", () => {
    const result = isCampaignDue(
      baseCampaign,
      new Date("2026-05-08T01:59:00.000Z")
    );

    expect(result).toMatchObject({
      due: false,
      reason: "not-time-yet"
    });
  });

  it("does not send twice on the same local date", () => {
    const result = isCampaignDue(
      { ...baseCampaign, last_sent_date: "2026-05-08" },
      new Date("2026-05-08T06:30:00.000Z")
    );

    expect(result).toMatchObject({
      due: false,
      reason: "already-sent-today"
    });
  });
});

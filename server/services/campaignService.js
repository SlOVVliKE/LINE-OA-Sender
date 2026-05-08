import { query } from "../db/pool.js";
import { config } from "../config/env.js";
import { isCampaignDue, normalizeTime } from "../utils/schedule.js";
import { sendCampaignMessage } from "./deliveryService.js";

export async function getDailyCampaign() {
  const result = await query(
    `
      SELECT
        daily_campaign.*,
        uploaded_images.original_url AS image_original_url,
        uploaded_images.preview_url AS image_preview_url
      FROM daily_campaign
      LEFT JOIN uploaded_images ON uploaded_images.id = daily_campaign.image_id
      WHERE daily_campaign.id = 1
    `
  );

  return result.rows[0];
}

export async function saveDailyCampaign({
  enabled,
  sendTime,
  messageText,
  imageId,
  allRecipients,
  recipientIds
}) {
  const normalizedTime = normalizeTime(sendTime);
  if (!normalizedTime) {
    throw new Error("เวลาส่งไม่ถูกต้อง");
  }

  const ids = Array.isArray(recipientIds)
    ? recipientIds.map((id) => Number(id)).filter(Number.isFinite)
    : [];

  const result = await query(
    `
      UPDATE daily_campaign SET
        enabled = $1,
        send_time = $2,
        timezone = $3,
        message_text = $4,
        image_id = $5,
        all_recipients = $6,
        recipient_ids = $7::jsonb,
        updated_at = NOW()
      WHERE id = 1
      RETURNING *
    `,
    [
      Boolean(enabled),
      normalizedTime,
      config.timezone,
      messageText || "",
      imageId || null,
      Boolean(allRecipients),
      JSON.stringify(ids)
    ]
  );

  return result.rows[0];
}

export async function sendDueDailyCampaign(now = new Date()) {
  const campaign = await getDailyCampaign();
  const due = isCampaignDue(campaign, now);

  if (!due.due) {
    return { sent: false, reason: due.reason, date: due.date || null };
  }

  const result = await sendCampaignMessage({
    mode: "scheduled",
    campaignId: campaign.id,
    messageText: campaign.message_text,
    imageId: campaign.image_id,
    allRecipients: campaign.all_recipients,
    recipientIds: campaign.recipient_ids
  });

  await query(
    `
      UPDATE daily_campaign
      SET last_sent_date = $1, updated_at = NOW()
      WHERE id = 1
    `,
    [due.date]
  );

  return { sent: true, date: due.date, result };
}

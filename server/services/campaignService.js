import { query } from "../db/pool.js";
import { config } from "../config/env.js";
import { listActiveBots } from "./botLineOaService.js";
import { isCampaignDue, normalizeTime } from "../utils/schedule.js";
import { sendCampaignMessage } from "./deliveryService.js";

async function ensureCampaignForBot(botId) {
  await query(
    `
      INSERT INTO daily_campaign (bot_id)
      VALUES ($1)
      ON CONFLICT (bot_id) DO NOTHING
    `,
    [botId]
  );
}

export async function getDailyCampaign(botId) {
  await ensureCampaignForBot(botId);

  const result = await query(
    `
      SELECT
        daily_campaign.*,
        uploaded_images.original_url AS image_original_url,
        uploaded_images.preview_url AS image_preview_url
      FROM daily_campaign
      LEFT JOIN uploaded_images
        ON uploaded_images.id = daily_campaign.image_id
        AND uploaded_images.bot_id = daily_campaign.bot_id
      WHERE daily_campaign.bot_id = $1
    `,
    [botId]
  );

  return result.rows[0];
}

export async function saveDailyCampaign({
  botId,
  enabled,
  sendTime,
  messageText,
  imageId,
  allRecipients,
  recipientIds,
  mentionUserIds = {}
}) {
  await ensureCampaignForBot(botId);
  const normalizedTime = normalizeTime(sendTime);
  if (!normalizedTime) {
    throw new Error("เวลาส่งไม่ถูกต้อง");
  }

  const ids = Array.isArray(recipientIds)
    ? recipientIds.map((id) => Number(id)).filter(Number.isFinite)
    : [];
  const mentions = mentionUserIds && typeof mentionUserIds === "object" && !Array.isArray(mentionUserIds)
    ? Object.fromEntries(
        Object.entries(mentionUserIds).map(([groupId, userIds]) => [
          String(Number(groupId)),
          Array.isArray(userIds) ? [...new Set(userIds.filter((id) => typeof id === "string"))].slice(0, 20) : []
        ])
      )
    : {};

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
        mention_user_ids = $8::jsonb,
        updated_at = NOW()
      WHERE bot_id = $9
      RETURNING *
    `,
    [
      Boolean(enabled),
      normalizedTime,
      config.timezone,
      messageText || "",
      imageId || null,
      Boolean(allRecipients),
      JSON.stringify(ids),
      JSON.stringify(mentions),
      botId
    ]
  );

  return result.rows[0];
}

async function sendDueForBot(bot, now) {
  const campaign = await getDailyCampaign(bot.id);
  const due = isCampaignDue(campaign, now);

  if (!due.due) {
    return { botId: Number(bot.id), botName: bot.name, sent: false, reason: due.reason, date: due.date || null };
  }

  const result = await sendCampaignMessage({
    botId: bot.id,
    mode: "scheduled",
    campaignId: campaign.id,
    messageText: campaign.message_text,
    imageId: campaign.image_id,
    allRecipients: campaign.all_recipients,
    recipientIds: campaign.recipient_ids,
    mentionUserIds: campaign.mention_user_ids
  });

  await query(
    `
      UPDATE daily_campaign
      SET last_sent_date = $1, updated_at = NOW()
      WHERE bot_id = $2
    `,
    [due.date, bot.id]
  );

  return { botId: Number(bot.id), botName: bot.name, sent: true, date: due.date, result };
}

export async function sendDueDailyCampaign(now = new Date()) {
  const bots = await listActiveBots();
  const results = [];

  for (const bot of bots) {
    results.push(await sendDueForBot(bot, now));
  }

  return {
    checked: results.length,
    sent: results.filter((item) => item.sent).length,
    results
  };
}

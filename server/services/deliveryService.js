import { query } from "../db/pool.js";
import { getBotById } from "./botLineOaService.js";
import { buildLineMessages } from "./messageBuilder.js";
import { pushMessage } from "./lineService.js";
import { resolveRecipients } from "./recipientService.js";

export async function getImage(botId, imageId) {
  if (!imageId) return null;

  const result = await query(
    `
      SELECT *
      FROM uploaded_images
      WHERE id = $1
        AND bot_id = $2
    `,
    [imageId, botId]
  );
  return result.rows[0] || null;
}

async function logDelivery({
  botId,
  campaignId,
  mode,
  recipient,
  messageText,
  imageId,
  status,
  errorMessage,
  requestId
}) {
  await query(
    `
      INSERT INTO delivery_logs
        (
          bot_id,
          campaign_id,
          mode,
          recipient_id,
          recipient_line_id,
          recipient_type,
          recipient_display_name,
          message_text,
          image_id,
          status,
          error_message,
          request_id
        )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `,
    [
      botId,
      campaignId || null,
      mode,
      recipient?.id || null,
      recipient?.line_id || "unknown",
      recipient?.type || "unknown",
      recipient?.display_name || "unknown",
      messageText || "",
      imageId || null,
      status,
      errorMessage || null,
      requestId || null
    ]
  );
}

export async function sendCampaignMessage({
  botId,
  mode,
  campaignId = null,
  messageText = "",
  imageId = null,
  allRecipients = false,
  recipientIds = []
}) {
  const bot = await getBotById(botId);
  const image = await getImage(botId, imageId);
  const messages = buildLineMessages({ messageText, image });

  if (!messages.length) {
    throw new Error("ต้องมีข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง");
  }

  const recipients = await resolveRecipients({ botId, allRecipients, recipientIds });

  if (!recipients.length) {
    throw new Error("ยังไม่มีผู้รับที่เลือกได้");
  }

  const results = [];

  for (const recipient of recipients) {
    try {
      const response = await pushMessage(bot, recipient.line_id, messages);
      await logDelivery({
        botId,
        campaignId,
        mode,
        recipient,
        messageText,
        imageId,
        status: "success",
        requestId: response.requestId
      });
      results.push({ recipientId: recipient.id, status: "success" });
    } catch (error) {
      await logDelivery({
        botId,
        campaignId,
        mode,
        recipient,
        messageText,
        imageId,
        status: "failed",
        errorMessage: error.message
      });
      results.push({
        recipientId: recipient.id,
        status: "failed",
        error: error.message
      });
    }
  }

  return {
    total: results.length,
    success: results.filter((result) => result.status === "success").length,
    failed: results.filter((result) => result.status === "failed").length,
    results
  };
}

export async function listDeliveryLogs(botId, limit = 50) {
  const result = await query(
    `
      SELECT
        id,
        mode,
        recipient_display_name,
        recipient_type,
        status,
        error_message,
        sent_at
      FROM delivery_logs
      WHERE bot_id = $1
      ORDER BY sent_at DESC
      LIMIT $2
    `,
    [botId, limit]
  );

  return result.rows;
}

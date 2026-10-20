import { query } from "../db/pool.js";
import { getBotById } from "./botLineOaService.js";
import { buildLineMessages } from "./messageBuilder.js";
import { fetchGroupSummary, pushMessage } from "./lineService.js";
import { deactivateGroup, resolveRecipients } from "./recipientService.js";

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
  recipientIds = [],
  mentionUserIds = {}
}) {
  const bot = await getBotById(botId);
  const image = await getImage(botId, imageId);
  if (!messageText.trim() && !image) {
    throw new Error("ต้องมีข้อความหรือรูปภาพอย่างน้อยหนึ่งอย่าง");
  }
  if (Object.values(mentionUserIds || {}).some((ids) => Array.isArray(ids) && ids.length) && !messageText.trim()) {
    throw new Error("กรุณาใส่ข้อความด้วย เมื่อต้องการแท็กสมาชิก");
  }

  const recipients = await resolveRecipients({ botId, allRecipients, recipientIds });

  if (!recipients.length) {
    throw new Error("ยังไม่มีผู้รับที่เลือกได้");
  }

  const results = [];

  for (const recipient of recipients) {
    try {
      try {
        await fetchGroupSummary(bot, recipient.line_id);
      } catch (error) {
        if (error.status === 404) await deactivateGroup(botId, recipient.line_id);
        throw error;
      }
      const requestedMentions = Array.isArray(mentionUserIds?.[recipient.id])
        ? [...new Set(mentionUserIds[recipient.id])]
        : [];
      if (requestedMentions.length > 20) {
        throw new Error("แท็กสมาชิกได้ไม่เกิน 20 คนต่อกลุ่ม");
      }
      let validMentions = [];
      if (requestedMentions.length) {
        const members = await query(
          `
            SELECT member.line_id
            FROM group_members gm
            INNER JOIN recipients member
              ON member.id = gm.member_recipient_id
              AND member.bot_id = gm.bot_id
              AND member.is_active = TRUE
            WHERE gm.bot_id = $1
              AND gm.group_recipient_id = $2
              AND member.line_id = ANY($3::text[])
          `,
          [botId, recipient.id, requestedMentions]
        );
        validMentions = members.rows.map((row) => row.line_id);
        if (validMentions.length !== requestedMentions.length) {
          throw new Error("มีสมาชิกที่เลือกแท็กซึ่งไม่พบในกลุ่มนี้ กรุณาโหลดรายชื่อใหม่");
        }
      }
      const messages = buildLineMessages({ messageText, image, mentionUserIds: validMentions });
      if (messages.some((message) => message.type === "textV2" && message.text.length > 5000)) {
        throw new Error("ข้อความรวมแท็กยาวเกิน 5,000 ตัวอักษร");
      }
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

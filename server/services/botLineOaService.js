import crypto from "node:crypto";
import { config } from "../config/env.js";
import { query } from "../db/pool.js";
import { badRequest, unauthorized } from "../utils/httpError.js";

function clean(value) {
  return typeof value === "string" ? value.trim() : "";
}

function maskValue(value) {
  if (!value) return "";
  if (value.length <= 12) return "******";
  return `${value.slice(0, 6)}******${value.slice(-4)}`;
}

function makeWebhookKey() {
  return crypto.randomBytes(18).toString("base64url");
}

function webhookUrl(webhookKey) {
  const base = config.appBaseUrl.replace(/\/$/, "");
  return base ? `${base}/webhook/line/${webhookKey}` : `/webhook/line/${webhookKey}`;
}

function publicBot(row) {
  return {
    id: Number(row.id),
    name: row.name,
    webhook_key: row.webhook_key,
    webhook_url: webhookUrl(row.webhook_key),
    is_active: Boolean(row.is_active),
    token_preview: maskValue(row.channel_access_token),
    secret_preview: maskValue(row.channel_secret),
    created_at: row.created_at,
    updated_at: row.updated_at
  };
}

export async function listAdminBots() {
  const result = await query(`
    SELECT *
    FROM bot_line_oas
    ORDER BY created_at DESC, id DESC
  `);
  return result.rows.map(publicBot);
}

export async function listAssignedBots(userId) {
  const result = await query(
    `
      SELECT bots.*
      FROM bot_line_oas bots
      INNER JOIN user_bot_assignments assignments ON assignments.bot_id = bots.id
      WHERE assignments.user_oa_id = $1
        AND bots.is_active = TRUE
      ORDER BY bots.name ASC
    `,
    [userId]
  );
  return result.rows.map(publicBot);
}

export async function createBotLineOa({ name, channelAccessToken, channelSecret, isActive = true }) {
  const botName = clean(name);
  const token = clean(channelAccessToken);
  const secret = clean(channelSecret);

  if (!botName) throw badRequest("กรุณากรอกชื่อ botlineOA");
  if (!token || !secret) {
    throw badRequest("กรุณากรอก Channel access token และ Channel secret");
  }

  const result = await query(
    `
      INSERT INTO bot_line_oas
        (name, channel_access_token, channel_secret, webhook_key, is_active)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `,
    [botName, token, secret, makeWebhookKey(), Boolean(isActive)]
  );

  return publicBot(result.rows[0]);
}

export async function updateBotLineOa(id, { name, channelAccessToken, channelSecret, isActive = true }) {
  const botId = Number(id);
  const botName = clean(name);
  if (!Number.isFinite(botId)) throw badRequest("botlineOA ไม่ถูกต้อง");
  if (!botName) throw badRequest("กรุณากรอกชื่อ botlineOA");

  const current = await getBotById(botId, { includeInactive: true });
  const token = clean(channelAccessToken) || current.channel_access_token;
  const secret = clean(channelSecret) || current.channel_secret;

  const result = await query(
    `
      UPDATE bot_line_oas
      SET
        name = $1,
        channel_access_token = $2,
        channel_secret = $3,
        is_active = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING *
    `,
    [botName, token, secret, Boolean(isActive), botId]
  );

  return publicBot(result.rows[0]);
}

export async function deleteBotLineOa(id) {
  const botId = Number(id);
  if (!Number.isFinite(botId)) throw badRequest("botlineOA ไม่ถูกต้อง");

  await query(
    `
      UPDATE bot_line_oas
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
    [botId]
  );

  return { ok: true };
}

export async function getBotById(id, { includeInactive = false } = {}) {
  const result = await query(
    `
      SELECT *
      FROM bot_line_oas
      WHERE id = $1
        AND ($2::boolean = TRUE OR is_active = TRUE)
    `,
    [id, includeInactive]
  );

  if (!result.rows[0]) throw badRequest("ไม่พบ botlineOA");
  return result.rows[0];
}

export async function getBotByWebhookKey(webhookKey) {
  const result = await query(
    `
      SELECT *
      FROM bot_line_oas
      WHERE webhook_key = $1
        AND is_active = TRUE
    `,
    [webhookKey]
  );

  return result.rows[0] || null;
}

export async function assertUserCanAccessBot(session, botId) {
  if (session?.role !== "user_oa") {
    throw unauthorized("UserOA access required");
  }

  const result = await query(
    `
      SELECT 1
      FROM user_bot_assignments assignments
      INNER JOIN bot_line_oas bots ON bots.id = assignments.bot_id
      WHERE assignments.user_oa_id = $1
        AND assignments.bot_id = $2
        AND bots.is_active = TRUE
    `,
    [session.userId, botId]
  );

  if (!result.rowCount) throw unauthorized("ไม่มีสิทธิ์ใช้ botlineOA นี้");
}

export async function listActiveBots() {
  const result = await query(`
    SELECT *
    FROM bot_line_oas
    WHERE is_active = TRUE
    ORDER BY id ASC
  `);
  return result.rows;
}

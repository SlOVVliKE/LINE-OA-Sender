import { config } from "../config/env.js";
import { query } from "../db/pool.js";
import { badRequest } from "../utils/httpError.js";

function cleanSecret(value) {
  return typeof value === "string" ? value.trim() : "";
}

function maskValue(value) {
  if (!value) return "";
  if (value.length <= 12) return "******";
  return `${value.slice(0, 6)}******${value.slice(-4)}`;
}

async function getStoredSettings() {
  const result = await query(
    `
      SELECT channel_access_token, channel_secret, updated_at
      FROM line_settings
      WHERE id = 1
    `
  );

  return result.rows[0] || {
    channel_access_token: "",
    channel_secret: "",
    updated_at: null
  };
}

export async function getActiveLineConfig() {
  const stored = await getStoredSettings();
  const storedToken = cleanSecret(stored.channel_access_token);
  const storedSecret = cleanSecret(stored.channel_secret);
  const envToken = cleanSecret(config.lineChannelAccessToken);
  const envSecret = cleanSecret(config.lineChannelSecret);

  const channelAccessToken = storedToken || envToken;
  const channelSecret = storedSecret || envSecret;
  const source = storedToken && storedSecret ? "database" : "environment";

  return {
    channelAccessToken,
    channelSecret,
    source: channelAccessToken && channelSecret ? source : "missing",
    hasCredentials: Boolean(channelAccessToken && channelSecret),
    updatedAt: stored.updated_at
  };
}

export async function getLineSettingsForAdmin() {
  const stored = await getStoredSettings();
  const active = await getActiveLineConfig();
  const storedToken = cleanSecret(stored.channel_access_token);
  const storedSecret = cleanSecret(stored.channel_secret);

  return {
    source: active.source,
    hasCredentials: active.hasCredentials,
    hasStoredToken: Boolean(storedToken),
    hasStoredSecret: Boolean(storedSecret),
    tokenPreview: maskValue(storedToken || config.lineChannelAccessToken),
    secretPreview: maskValue(storedSecret || config.lineChannelSecret),
    updatedAt: stored.updated_at
  };
}

export async function saveLineSettings({
  channelAccessToken,
  channelSecret,
  clearRecipientsOnChange = false
}) {
  const current = await getStoredSettings();
  const nextToken =
    cleanSecret(channelAccessToken) ||
    cleanSecret(current.channel_access_token) ||
    cleanSecret(config.lineChannelAccessToken);
  const nextSecret =
    cleanSecret(channelSecret) ||
    cleanSecret(current.channel_secret) ||
    cleanSecret(config.lineChannelSecret);

  if (!nextToken || !nextSecret) {
    throw badRequest("กรุณากรอก LINE_CHANNEL_ACCESS_TOKEN และ LINE_CHANNEL_SECRET ให้ครบ");
  }

  const previousActive = await getActiveLineConfig();
  const changed =
    nextToken !== previousActive.channelAccessToken ||
    nextSecret !== previousActive.channelSecret;

  const result = await query(
    `
      UPDATE line_settings
      SET
        channel_access_token = $1,
        channel_secret = $2,
        updated_at = NOW()
      WHERE id = 1
      RETURNING channel_access_token, channel_secret, updated_at
    `,
    [nextToken, nextSecret]
  );

  let recipientsCleared = false;
  if (changed && clearRecipientsOnChange) {
    await query(`
      UPDATE recipients
      SET is_active = FALSE, updated_at = NOW()
      WHERE is_active = TRUE
    `);
    await query(`
      UPDATE daily_campaign
      SET all_recipients = TRUE, recipient_ids = '[]'::jsonb, updated_at = NOW()
      WHERE id = 1
    `);
    recipientsCleared = true;
  }

  return {
    settings: await getLineSettingsForAdmin(),
    changed,
    recipientsCleared,
    updatedAt: result.rows[0]?.updated_at || null
  };
}

import { query } from "../db/pool.js";
import {
  fetchGroupMemberProfile,
  fetchGroupSummary,
  fetchRoomMemberProfile,
  fetchUserProfile
} from "./lineService.js";

function fallbackName(type, lineId) {
  const tail = lineId?.slice(-8) || "unknown";
  if (type === "group") return `กลุ่ม LINE ${tail}`;
  if (type === "room") return `ห้องแชท ${tail}`;
  return `ผู้ใช้ LINE ${tail}`;
}

async function upsertRecipient({ bot, lineId, type, displayName, pictureUrl, source }) {
  const result = await query(
    `
      INSERT INTO recipients
        (bot_id, line_id, type, display_name, picture_url, last_source, last_seen_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5, $6::jsonb, NOW(), NOW())
      ON CONFLICT (bot_id, line_id) DO UPDATE SET
        type = EXCLUDED.type,
        display_name = EXCLUDED.display_name,
        picture_url = COALESCE(EXCLUDED.picture_url, recipients.picture_url),
        last_source = EXCLUDED.last_source,
        last_seen_at = NOW(),
        updated_at = NOW(),
        is_active = TRUE
      RETURNING *
    `,
    [
      bot.id,
      lineId,
      type,
      displayName || fallbackName(type, lineId),
      pictureUrl || null,
      JSON.stringify(source || {})
    ]
  );

  return result.rows[0];
}

export async function upsertUserFromSource(bot, source) {
  if (!source?.userId) return null;

  let profile;
  try {
    if (source.type === "group" && source.groupId) {
      profile = await fetchGroupMemberProfile(bot, source.groupId, source.userId);
    } else if (source.type === "room" && source.roomId) {
      profile = await fetchRoomMemberProfile(bot, source.roomId, source.userId);
    } else {
      profile = await fetchUserProfile(bot, source.userId);
    }
  } catch {
    profile = {};
  }

  return upsertRecipient({
    bot,
    lineId: source.userId,
    type: "user",
    displayName: profile.displayName || fallbackName("user", source.userId),
    pictureUrl: profile.pictureUrl,
    source
  });
}

export async function upsertChatFromSource(bot, source) {
  if (!source) return null;

  if (source.type === "group" && source.groupId) {
    let summary;
    try {
      summary = await fetchGroupSummary(bot, source.groupId);
    } catch {
      summary = {};
    }

    return upsertRecipient({
      bot,
      lineId: source.groupId,
      type: "group",
      displayName: summary.groupName || fallbackName("group", source.groupId),
      pictureUrl: summary.pictureUrl,
      source
    });
  }

  if (source.type === "room" && source.roomId) {
    return upsertRecipient({
      bot,
      lineId: source.roomId,
      type: "room",
      displayName: fallbackName("room", source.roomId),
      pictureUrl: null,
      source
    });
  }

  return null;
}

export async function captureRecipientsFromEvent(bot, event) {
  const source = event?.source;
  if (!source) return [];

  const captured = [];
  const chat = await upsertChatFromSource(bot, source);
  if (chat) captured.push(chat);

  const user = await upsertUserFromSource(bot, source);
  if (user) captured.push(user);

  return captured;
}

export async function listRecipients(botId) {
  const result = await query(
    `
      SELECT id, line_id, type, display_name, picture_url, last_seen_at, is_active
      FROM recipients
      WHERE is_active = TRUE
        AND bot_id = $1
      ORDER BY type ASC, display_name ASC
    `,
    [botId]
  );
  return result.rows;
}

export async function resolveRecipients({ botId, allRecipients, recipientIds }) {
  if (allRecipients) {
    const result = await query(
      `
        SELECT *
        FROM recipients
        WHERE is_active = TRUE
          AND bot_id = $1
        ORDER BY type ASC, display_name ASC
      `,
      [botId]
    );
    return result.rows;
  }

  const ids = Array.isArray(recipientIds)
    ? recipientIds.map((id) => Number(id)).filter(Number.isFinite)
    : [];

  if (!ids.length) return [];

  const result = await query(
    `
      SELECT *
      FROM recipients
      WHERE is_active = TRUE
        AND bot_id = $1
        AND id = ANY($2::bigint[])
      ORDER BY type ASC, display_name ASC
    `,
    [botId, ids]
  );
  return result.rows;
}

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

  if (source.type === "group" && chat && user) {
    await query(
      `
        INSERT INTO group_members (bot_id, group_recipient_id, member_recipient_id)
        VALUES ($1, $2, $3)
        ON CONFLICT (bot_id, group_recipient_id, member_recipient_id)
        DO UPDATE SET last_seen_at = NOW()
      `,
      [bot.id, chat.id, user.id]
    );
  }

  return captured;
}

export async function listGroupMembers(botId) {
  const result = await query(
    `
      SELECT
        gm.group_recipient_id,
        groups.line_id AS group_line_id,
        groups.display_name AS group_name,
        members.line_id AS user_line_id,
        members.display_name AS user_name,
        members.picture_url,
        gm.last_seen_at
      FROM group_members gm
      INNER JOIN recipients groups
        ON groups.id = gm.group_recipient_id
        AND groups.bot_id = gm.bot_id
        AND groups.type = 'group'
        AND groups.is_active = TRUE
      INNER JOIN recipients members
        ON members.id = gm.member_recipient_id
        AND members.bot_id = gm.bot_id
        AND members.type = 'user'
        AND members.is_active = TRUE
      WHERE gm.bot_id = $1
      ORDER BY groups.display_name, members.display_name
    `,
    [botId]
  );
  return result.rows;
}

export async function deactivateGroup(botId, groupLineId) {
  if (!groupLineId) return;
  await query(
    `
      UPDATE recipients
      SET is_active = FALSE, updated_at = NOW()
      WHERE bot_id = $1 AND line_id = $2 AND type = 'group'
    `,
    [botId, groupLineId]
  );
  await query(
    `
      DELETE FROM group_members gm
      USING recipients groups
      WHERE gm.bot_id = $1
        AND gm.group_recipient_id = groups.id
        AND groups.bot_id = $1
        AND groups.line_id = $2
        AND groups.type = 'group'
    `,
    [botId, groupLineId]
  );
}

export async function removeGroupMembers(botId, groupLineId, memberLineIds = []) {
  if (!groupLineId || !memberLineIds.length) return;
  await query(
    `
      DELETE FROM group_members gm
      USING recipients groups, recipients members
      WHERE gm.bot_id = $1
        AND gm.group_recipient_id = groups.id
        AND groups.bot_id = $1
        AND groups.line_id = $2
        AND groups.type = 'group'
        AND gm.member_recipient_id = members.id
        AND members.bot_id = $1
        AND members.line_id = ANY($3::text[])
    `,
    [botId, groupLineId, memberLineIds]
  );
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
          AND type = 'group'
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
        AND type = 'group'
        AND id = ANY($2::bigint[])
      ORDER BY type ASC, display_name ASC
    `,
    [botId, ids]
  );
  return result.rows;
}

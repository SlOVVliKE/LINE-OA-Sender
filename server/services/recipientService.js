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

async function upsertRecipient({ lineId, type, displayName, pictureUrl, source }) {
  const result = await query(
    `
      INSERT INTO recipients
        (line_id, type, display_name, picture_url, last_source, last_seen_at, updated_at)
      VALUES
        ($1, $2, $3, $4, $5::jsonb, NOW(), NOW())
      ON CONFLICT (line_id) DO UPDATE SET
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
      lineId,
      type,
      displayName || fallbackName(type, lineId),
      pictureUrl || null,
      JSON.stringify(source || {})
    ]
  );

  return result.rows[0];
}

export async function upsertUserFromSource(source) {
  if (!source?.userId) return null;

  let profile;
  try {
    if (source.type === "group" && source.groupId) {
      profile = await fetchGroupMemberProfile(source.groupId, source.userId);
    } else if (source.type === "room" && source.roomId) {
      profile = await fetchRoomMemberProfile(source.roomId, source.userId);
    } else {
      profile = await fetchUserProfile(source.userId);
    }
  } catch {
    profile = {};
  }

  return upsertRecipient({
    lineId: source.userId,
    type: "user",
    displayName: profile.displayName || fallbackName("user", source.userId),
    pictureUrl: profile.pictureUrl,
    source
  });
}

export async function upsertChatFromSource(source) {
  if (!source) return null;

  if (source.type === "group" && source.groupId) {
    let summary;
    try {
      summary = await fetchGroupSummary(source.groupId);
    } catch {
      summary = {};
    }

    return upsertRecipient({
      lineId: source.groupId,
      type: "group",
      displayName: summary.groupName || fallbackName("group", source.groupId),
      pictureUrl: summary.pictureUrl,
      source
    });
  }

  if (source.type === "room" && source.roomId) {
    return upsertRecipient({
      lineId: source.roomId,
      type: "room",
      displayName: fallbackName("room", source.roomId),
      pictureUrl: null,
      source
    });
  }

  return null;
}

export async function captureRecipientsFromEvent(event) {
  const source = event?.source;
  if (!source) return [];

  const captured = [];
  const chat = await upsertChatFromSource(source);
  if (chat) captured.push(chat);

  const user = await upsertUserFromSource(source);
  if (user) captured.push(user);

  return captured;
}

export async function listRecipients() {
  const result = await query(
    `
      SELECT id, line_id, type, display_name, picture_url, last_seen_at, is_active
      FROM recipients
      WHERE is_active = TRUE
      ORDER BY type ASC, display_name ASC
    `
  );
  return result.rows;
}

export async function resolveRecipients({ allRecipients, recipientIds }) {
  if (allRecipients) {
    const result = await query(
      `
        SELECT *
        FROM recipients
        WHERE is_active = TRUE
        ORDER BY type ASC, display_name ASC
      `
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
        AND id = ANY($1::bigint[])
      ORDER BY type ASC, display_name ASC
    `,
    [ids]
  );
  return result.rows;
}

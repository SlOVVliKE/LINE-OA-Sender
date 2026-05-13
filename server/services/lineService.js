import { getActiveLineConfig } from "./lineSettingsService.js";

const LINE_API_BASE = "https://api.line.me";

async function lineHeaders() {
  const lineConfig = await getActiveLineConfig();
  if (!lineConfig.channelAccessToken) {
    throw new Error("ยังไม่ได้ตั้งค่า LINE_CHANNEL_ACCESS_TOKEN");
  }

  return {
    Authorization: `Bearer ${lineConfig.channelAccessToken}`,
    "Content-Type": "application/json"
  };
}

async function parseLineResponse(response) {
  const text = await response.text();
  let body = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text };
    }
  }

  if (!response.ok) {
    const detail = body.message || body.raw || response.statusText;
    throw new Error(`LINE API ${response.status}: ${detail}`);
  }

  return {
    body,
    requestId: response.headers.get("x-line-request-id") || ""
  };
}

export async function fetchUserProfile(userId) {
  const response = await fetch(`${LINE_API_BASE}/v2/bot/profile/${userId}`, {
    headers: await lineHeaders()
  });
  return parseLineResponse(response).then(({ body }) => body);
}

export async function fetchGroupSummary(groupId) {
  const response = await fetch(`${LINE_API_BASE}/v2/bot/group/${groupId}/summary`, {
    headers: await lineHeaders()
  });
  return parseLineResponse(response).then(({ body }) => body);
}

export async function fetchGroupMemberProfile(groupId, userId) {
  const response = await fetch(
    `${LINE_API_BASE}/v2/bot/group/${groupId}/member/${userId}`,
    { headers: await lineHeaders() }
  );
  return parseLineResponse(response).then(({ body }) => body);
}

export async function fetchRoomMemberProfile(roomId, userId) {
  const response = await fetch(
    `${LINE_API_BASE}/v2/bot/room/${roomId}/member/${userId}`,
    { headers: await lineHeaders() }
  );
  return parseLineResponse(response).then(({ body }) => body);
}

export async function pushMessage(to, messages) {
  const response = await fetch(`${LINE_API_BASE}/v2/bot/message/push`, {
    method: "POST",
    headers: await lineHeaders(),
    body: JSON.stringify({ to, messages })
  });
  return parseLineResponse(response);
}

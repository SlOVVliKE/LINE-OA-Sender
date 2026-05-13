const LINE_API_BASE = "https://api.line.me";

function lineHeaders(bot) {
  if (!bot?.channel_access_token) {
    throw new Error("ยังไม่ได้ตั้งค่า Channel access token ของ botlineOA");
  }

  return {
    Authorization: `Bearer ${bot.channel_access_token}`,
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

export async function fetchUserProfile(bot, userId) {
  const response = await fetch(`${LINE_API_BASE}/v2/bot/profile/${userId}`, {
    headers: lineHeaders(bot)
  });
  return parseLineResponse(response).then(({ body }) => body);
}

export async function fetchGroupSummary(bot, groupId) {
  const response = await fetch(`${LINE_API_BASE}/v2/bot/group/${groupId}/summary`, {
    headers: lineHeaders(bot)
  });
  return parseLineResponse(response).then(({ body }) => body);
}

export async function fetchGroupMemberProfile(bot, groupId, userId) {
  const response = await fetch(
    `${LINE_API_BASE}/v2/bot/group/${groupId}/member/${userId}`,
    { headers: lineHeaders(bot) }
  );
  return parseLineResponse(response).then(({ body }) => body);
}

export async function fetchRoomMemberProfile(bot, roomId, userId) {
  const response = await fetch(
    `${LINE_API_BASE}/v2/bot/room/${roomId}/member/${userId}`,
    { headers: lineHeaders(bot) }
  );
  return parseLineResponse(response).then(({ body }) => body);
}

export async function pushMessage(bot, to, messages) {
  const response = await fetch(`${LINE_API_BASE}/v2/bot/message/push`, {
    method: "POST",
    headers: lineHeaders(bot),
    body: JSON.stringify({ to, messages })
  });
  return parseLineResponse(response);
}

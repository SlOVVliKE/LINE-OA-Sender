export function getDateTimeParts(date = new Date(), timezone = "Asia/Bangkok") {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).formatToParts(date);

  const values = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    time: `${values.hour}:${values.minute}`
  };
}

export function isCampaignDue(campaign, now = new Date()) {
  if (!campaign?.enabled) return { due: false, reason: "disabled" };
  if (!campaign.message_text?.trim() && !campaign.image_id) {
    return { due: false, reason: "empty-message" };
  }

  const timezone = campaign.timezone || "Asia/Bangkok";
  const parts = getDateTimeParts(now, timezone);

  if (campaign.last_sent_date === parts.date) {
    return { due: false, reason: "already-sent-today", date: parts.date };
  }

  if (parts.time < campaign.send_time) {
    return { due: false, reason: "not-time-yet", date: parts.date };
  }

  return { due: true, date: parts.date, time: parts.time };
}

export function normalizeTime(value) {
  if (typeof value !== "string" || !/^\d{2}:\d{2}$/.test(value)) {
    return null;
  }

  const [hours, minutes] = value.split(":").map(Number);
  if (hours > 23 || minutes > 59) return null;
  return value;
}

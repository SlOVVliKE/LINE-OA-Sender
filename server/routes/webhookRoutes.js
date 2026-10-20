import express from "express";
import { query } from "../db/pool.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateLineSignature } from "../utils/lineSignature.js";
import { unauthorized } from "../utils/httpError.js";
import {
  captureRecipientsFromEvent,
  deactivateGroup,
  removeGroupMembers
} from "../services/recipientService.js";
import { getBotByWebhookKey } from "../services/botLineOaService.js";

export const webhookRouter = express.Router();

async function rememberWebhookEvent(bot, event) {
  if (!event.webhookEventId) return true;

  const source = event.source || {};
  const sourceId = source.groupId || source.roomId || source.userId || null;
  const result = await query(
    `
      INSERT INTO webhook_events
        (webhook_event_id, bot_id, event_type, source_type, source_id)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (webhook_event_id) DO NOTHING
      RETURNING webhook_event_id
    `,
    [event.webhookEventId, bot.id, event.type || null, source.type || null, sourceId]
  );

  return result.rowCount > 0;
}

webhookRouter.post(
  "/line/:webhookKey",
  asyncHandler(async (req, res) => {
    const bot = await getBotByWebhookKey(req.params.webhookKey);
    if (!bot) {
      throw unauthorized("Unknown botlineOA webhook");
    }

    const signature = req.headers["x-line-signature"];
    const isValid = validateLineSignature(req.rawBody, signature, bot.channel_secret);

    if (!isValid) {
      throw unauthorized("Invalid LINE signature");
    }

    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
      const isNew = await rememberWebhookEvent(bot, event);
      if (!isNew) continue;

      const source = event.source || {};
      const groupId = source.type === "group" ? source.groupId : null;
      if (event.type === "leave" && groupId) {
        await deactivateGroup(bot.id, groupId);
        continue;
      }
      if (event.type === "memberLeft" && groupId) {
        const memberIds = (event.left?.members || [])
          .map((member) => member.userId)
          .filter(Boolean);
        await removeGroupMembers(bot.id, groupId, memberIds);
      }
      await captureRecipientsFromEvent(bot, event);

      if (event.type === "memberJoined" && source.type === "group") {
        for (const member of event.joined?.members || []) {
          if (!member.userId) continue;
          await captureRecipientsFromEvent(bot, {
            ...event,
            source: { ...source, userId: member.userId }
          });
        }
      }
    }

    res.json({ ok: true });
  })
);

import express from "express";
import { config } from "../config/env.js";
import { query } from "../db/pool.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { validateLineSignature } from "../utils/lineSignature.js";
import { unauthorized } from "../utils/httpError.js";
import { captureRecipientsFromEvent } from "../services/recipientService.js";

export const webhookRouter = express.Router();

async function rememberWebhookEvent(event) {
  if (!event.webhookEventId) return true;

  const source = event.source || {};
  const sourceId = source.groupId || source.roomId || source.userId || null;
  const result = await query(
    `
      INSERT INTO webhook_events
        (webhook_event_id, event_type, source_type, source_id)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (webhook_event_id) DO NOTHING
      RETURNING webhook_event_id
    `,
    [event.webhookEventId, event.type || null, source.type || null, sourceId]
  );

  return result.rowCount > 0;
}

webhookRouter.post(
  "/line",
  asyncHandler(async (req, res) => {
    const signature = req.headers["x-line-signature"];
    const isValid = validateLineSignature(
      req.rawBody,
      signature,
      config.lineChannelSecret
    );

    if (!isValid) {
      throw unauthorized("Invalid LINE signature");
    }

    const events = Array.isArray(req.body?.events) ? req.body.events : [];

    for (const event of events) {
      const isNew = await rememberWebhookEvent(event);
      if (!isNew) continue;
      await captureRecipientsFromEvent(event);
    }

    res.json({ ok: true });
  })
);

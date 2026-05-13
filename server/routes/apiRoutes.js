import express from "express";
import multer from "multer";
import { query } from "../db/pool.js";
import { requireAuth } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/httpError.js";
import { listRecipients } from "../services/recipientService.js";
import {
  listDeliveryLogs,
  sendCampaignMessage
} from "../services/deliveryService.js";
import { uploadImageBuffer, validateUpload } from "../services/imageService.js";
import {
  getDailyCampaign,
  saveDailyCampaign,
  sendDueDailyCampaign
} from "../services/campaignService.js";
import {
  getLineSettingsForAdmin,
  saveLineSettings
} from "../services/lineSettingsService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export const apiRouter = express.Router();

apiRouter.use(requireAuth);

apiRouter.get(
  "/line-settings",
  asyncHandler(async (_req, res) => {
    const settings = await getLineSettingsForAdmin();
    res.json({ settings });
  })
);

apiRouter.put(
  "/line-settings",
  asyncHandler(async (req, res) => {
    const result = await saveLineSettings({
      channelAccessToken: req.body?.channelAccessToken,
      channelSecret: req.body?.channelSecret,
      clearRecipientsOnChange: Boolean(req.body?.clearRecipientsOnChange)
    });

    res.json(result);
  })
);

apiRouter.get(
  "/recipients",
  asyncHandler(async (_req, res) => {
    const recipients = await listRecipients();
    res.json({ recipients });
  })
);

apiRouter.post(
  "/upload",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const error = validateUpload(req.file);
    if (error) throw badRequest(error);

    const uploaded = await uploadImageBuffer(req.file);
    const result = await query(
      `
        INSERT INTO uploaded_images
          (public_id, original_url, preview_url, bytes, format, width, height)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *
      `,
      [
        uploaded.publicId,
        uploaded.originalUrl,
        uploaded.previewUrl,
        uploaded.bytes,
        uploaded.format,
        uploaded.width,
        uploaded.height
      ]
    );

    res.json({ image: result.rows[0] });
  })
);

apiRouter.get(
  "/campaign",
  asyncHandler(async (_req, res) => {
    const campaign = await getDailyCampaign();
    res.json({ campaign });
  })
);

apiRouter.put(
  "/campaign",
  asyncHandler(async (req, res) => {
    const campaign = await saveDailyCampaign({
      enabled: req.body?.enabled,
      sendTime: req.body?.sendTime,
      messageText: req.body?.messageText,
      imageId: req.body?.imageId,
      allRecipients: req.body?.allRecipients,
      recipientIds: req.body?.recipientIds
    });

    res.json({ campaign });
  })
);

apiRouter.post(
  "/send",
  asyncHandler(async (req, res) => {
    const result = await sendCampaignMessage({
      mode: "manual",
      messageText: req.body?.messageText || "",
      imageId: req.body?.imageId || null,
      allRecipients: Boolean(req.body?.allRecipients),
      recipientIds: req.body?.recipientIds || []
    });

    res.json(result);
  })
);

apiRouter.get(
  "/history",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const logs = await listDeliveryLogs(limit);
    res.json({ logs });
  })
);

apiRouter.post(
  "/send-due",
  asyncHandler(async (_req, res) => {
    const result = await sendDueDailyCampaign();
    res.json(result);
  })
);

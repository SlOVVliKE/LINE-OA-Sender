import express from "express";
import multer from "multer";
import { query } from "../db/pool.js";
import { requireAdmin, requireAuth, requireUserOa } from "../middleware/auth.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest } from "../utils/httpError.js";
import { listGroupMembers, listRecipients } from "../services/recipientService.js";
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
  assertUserCanAccessBot,
  createBotLineOa,
  deleteBotLineOa,
  listAdminBots,
  listAssignedBots,
  updateBotLineOa
} from "../services/botLineOaService.js";
import {
  createUserOaAccount,
  deleteUserOaAccount,
  listUserOaAccounts,
  updateUserOaAccount
} from "../services/userOaService.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024
  }
});

export const apiRouter = express.Router();

apiRouter.use(requireAuth);

apiRouter.get(
  "/admin/bots",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ bots: await listAdminBots() });
  })
);

apiRouter.post(
  "/admin/bots",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bot = await createBotLineOa(req.body || {});
    res.json({ bot });
  })
);

apiRouter.put(
  "/admin/bots/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const bot = await updateBotLineOa(req.params.id, req.body || {});
    res.json({ bot });
  })
);

apiRouter.delete(
  "/admin/bots/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await deleteBotLineOa(req.params.id));
  })
);

apiRouter.get(
  "/admin/users",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    res.json({ users: await listUserOaAccounts() });
  })
);

apiRouter.post(
  "/admin/users",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await createUserOaAccount(req.body || {});
    res.json({ user });
  })
);

apiRouter.put(
  "/admin/users/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const user = await updateUserOaAccount(req.params.id, req.body || {});
    res.json({ user });
  })
);

apiRouter.delete(
  "/admin/users/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    res.json(await deleteUserOaAccount(req.params.id));
  })
);

apiRouter.get(
  "/bots",
  requireUserOa,
  asyncHandler(async (req, res) => {
    const bots = await listAssignedBots(req.session.userId);
    res.json({ bots });
  })
);

apiRouter.use(
  "/bots/:botId",
  requireUserOa,
  asyncHandler(async (req, _res, next) => {
    const botId = Number(req.params.botId);
    if (!Number.isFinite(botId)) throw badRequest("botlineOA ไม่ถูกต้อง");
    await assertUserCanAccessBot(req.session, botId);
    req.botId = botId;
    next();
  })
);

apiRouter.get(
  "/bots/:botId/recipients",
  asyncHandler(async (req, res) => {
    const recipients = await listRecipients(req.botId);
    res.json({ recipients });
  })
);

apiRouter.get(
  "/bots/:botId/group-members",
  asyncHandler(async (req, res) => {
    const members = await listGroupMembers(req.botId);
    res.json({ members });
  })
);

apiRouter.post(
  "/bots/:botId/upload",
  upload.single("image"),
  asyncHandler(async (req, res) => {
    const error = validateUpload(req.file);
    if (error) throw badRequest(error);

    const uploaded = await uploadImageBuffer(req.file);
    const result = await query(
      `
        INSERT INTO uploaded_images
          (bot_id, public_id, original_url, preview_url, bytes, format, width, height)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `,
      [
        req.botId,
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
  "/bots/:botId/campaign",
  asyncHandler(async (req, res) => {
    const campaign = await getDailyCampaign(req.botId);
    res.json({ campaign });
  })
);

apiRouter.put(
  "/bots/:botId/campaign",
  asyncHandler(async (req, res) => {
    const campaign = await saveDailyCampaign({
      botId: req.botId,
      enabled: req.body?.enabled,
      sendTime: req.body?.sendTime,
      messageText: req.body?.messageText,
      imageId: req.body?.imageId,
      allRecipients: req.body?.allRecipients,
      recipientIds: req.body?.recipientIds,
      mentionUserIds: req.body?.mentionUserIds
    });

    res.json({ campaign });
  })
);

apiRouter.post(
  "/bots/:botId/send",
  asyncHandler(async (req, res) => {
    const result = await sendCampaignMessage({
      botId: req.botId,
      mode: "manual",
      messageText: req.body?.messageText || "",
      imageId: req.body?.imageId || null,
      allRecipients: Boolean(req.body?.allRecipients),
      recipientIds: req.body?.recipientIds || [],
      mentionUserIds: req.body?.mentionUserIds || {}
    });

    res.json(result);
  })
);

apiRouter.get(
  "/bots/:botId/history",
  asyncHandler(async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const logs = await listDeliveryLogs(req.botId, limit);
    res.json({ logs });
  })
);

apiRouter.post(
  "/send-due",
  requireAdmin,
  asyncHandler(async (_req, res) => {
    const result = await sendDueDailyCampaign();
    res.json(result);
  })
);

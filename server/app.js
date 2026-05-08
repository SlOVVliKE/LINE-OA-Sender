import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "./config/env.js";
import { ensureSchema } from "./db/schema.js";
import { authRouter } from "./routes/authRoutes.js";
import { apiRouter } from "./routes/apiRoutes.js";
import { webhookRouter } from "./routes/webhookRoutes.js";
import { sendDueDailyCampaign } from "./services/campaignService.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const distDir = path.join(rootDir, "dist");

export async function createApp() {
  await ensureSchema();

  const app = express();
  app.disable("x-powered-by");

  app.use(
    express.json({
      limit: "2mb",
      verify: (req, _res, buffer) => {
        req.rawBody = buffer;
      }
    })
  );

  app.get("/health", (_req, res) => {
    res.json({ ok: true });
  });

  app.use("/api", authRouter);
  app.use("/api", apiRouter);
  app.use("/webhook", webhookRouter);

  app.post("/internal/send-due", async (req, res, next) => {
    try {
      const header = req.headers.authorization || "";
      const token = header.startsWith("Bearer ") ? header.slice(7) : "";
      if (!config.cronSecret || token !== config.cronSecret) {
        res.status(401).json({ error: "Unauthorized" });
        return;
      }

      const result = await sendDueDailyCampaign();
      res.json(result);
    } catch (error) {
      next(error);
    }
  });

  app.use(express.static(distDir));
  app.get(/.*/, (_req, res) => {
    res.sendFile(path.join(distDir, "index.html"));
  });

  app.use((error, _req, res, _next) => {
    const uploadErrors = {
      LIMIT_FILE_SIZE: "ขนาดรูปต้องไม่เกิน 10 MB",
      LIMIT_UNEXPECTED_FILE: "กรุณาอัปโหลดไฟล์รูปภาพที่ช่องรูปภาพ"
    };
    const status = error.status || (uploadErrors[error.code] ? 400 : 500);
    if (status >= 500) {
      console.error(error);
    }
    res.status(status).json({
      error: uploadErrors[error.code] || error.message || "Server error"
    });
  });

  return app;
}

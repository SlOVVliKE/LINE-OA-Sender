import express from "express";
import crypto from "node:crypto";
import { config } from "../config/env.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import {
  clearSessionCookie,
  isAuthenticated,
  issueSessionCookie
} from "../middleware/auth.js";

export const authRouter = express.Router();

function safeEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  return (
    left.length === right.length &&
    crypto.timingSafeEqual(left, right)
  );
}

authRouter.get("/session", (req, res) => {
  res.json({ authenticated: isAuthenticated(req) });
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const password = req.body?.password;
    if (typeof password !== "string") {
      throw badRequest("กรุณากรอกรหัสผ่าน");
    }

    if (!safeEqual(password, config.adminPassword)) {
      throw unauthorized("รหัสผ่านไม่ถูกต้อง");
    }

    issueSessionCookie(res);
    res.json({ ok: true });
  })
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

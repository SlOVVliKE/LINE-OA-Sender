import express from "express";
import { asyncHandler } from "../utils/asyncHandler.js";
import {
  clearSessionCookie,
  getSession,
  isAuthenticated,
  issueSessionCookie
} from "../middleware/auth.js";
import { authenticatePassword } from "../services/userOaService.js";

export const authRouter = express.Router();

authRouter.get("/session", (req, res) => {
  const session = getSession(req);
  res.json({
    authenticated: isAuthenticated(req),
    role: session?.role || null,
    userId: session?.userId || null,
    displayName: session?.displayName || null
  });
});

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const session = await authenticatePassword(req.body?.password);
    issueSessionCookie(res, session);
    res.json({ ok: true, session });
  })
);

authRouter.post("/logout", (_req, res) => {
  clearSessionCookie(res);
  res.json({ ok: true });
});

import { config } from "../config/env.js";
import { parseCookies, serializeCookie } from "../utils/cookies.js";
import { createSessionToken, verifySessionToken } from "../utils/sessionToken.js";
import { unauthorized } from "../utils/httpError.js";

const COOKIE_NAME = "line_oa_sender_session";

export function issueSessionCookie(res) {
  const token = createSessionToken(config.sessionSecret);
  res.setHeader(
    "Set-Cookie",
    serializeCookie(COOKIE_NAME, token, {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 7 * 24 * 60 * 60
    })
  );
}

export function clearSessionCookie(res) {
  res.setHeader(
    "Set-Cookie",
    serializeCookie(COOKIE_NAME, "", {
      httpOnly: true,
      secure: config.nodeEnv === "production",
      sameSite: "Lax",
      path: "/",
      maxAge: 0
    })
  );
}

export function isAuthenticated(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionToken(cookies[COOKIE_NAME], config.sessionSecret);
}

export function requireAuth(req, _res, next) {
  if (!isAuthenticated(req)) {
    next(unauthorized());
    return;
  }

  next();
}

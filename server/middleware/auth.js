import { config } from "../config/env.js";
import { parseCookies, serializeCookie } from "../utils/cookies.js";
import { createSessionToken, verifySessionToken } from "../utils/sessionToken.js";
import { unauthorized } from "../utils/httpError.js";

const COOKIE_NAME = "line_oa_sender_session";

export function issueSessionCookie(res, session) {
  const token = createSessionToken(config.sessionSecret, session);
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
  return Boolean(getSession(req));
}

export function getSession(req) {
  const cookies = parseCookies(req.headers.cookie || "");
  return verifySessionToken(cookies[COOKIE_NAME], config.sessionSecret);
}

export function requireAuth(req, _res, next) {
  const session = getSession(req);
  if (!session) {
    next(unauthorized());
    return;
  }

  req.session = session;
  next();
}

export function requireAdmin(req, _res, next) {
  if (req.session?.role !== "admin") {
    next(unauthorized("Admin access required"));
    return;
  }

  next();
}

export function requireUserOa(req, _res, next) {
  if (req.session?.role !== "user_oa") {
    next(unauthorized("UserOA access required"));
    return;
  }

  next();
}

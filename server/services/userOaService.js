import crypto from "node:crypto";
import { config } from "../config/env.js";
import { query } from "../db/pool.js";
import { badRequest, unauthorized } from "../utils/httpError.js";
import { hashPassword, verifyPassword } from "./passwordService.js";

function safeEqual(a, b) {
  const left = Buffer.from(a || "");
  const right = Buffer.from(b || "");
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function normalizeIds(ids) {
  return Array.isArray(ids)
    ? ids.map((id) => Number(id)).filter(Number.isFinite)
    : [];
}

async function assertPasswordUnique(password, excludeUserId = null) {
  if (!password) return;
  if (safeEqual(password, config.adminPassword)) {
    throw badRequest("รหัสผ่าน UserOA ต้องไม่ซ้ำกับรหัส Admin");
  }

  const result = await query(
    `
      SELECT id, password_hash
      FROM user_oa_accounts
      WHERE ($1::bigint IS NULL OR id <> $1::bigint)
    `,
    [excludeUserId]
  );

  if (result.rows.some((row) => verifyPassword(password, row.password_hash))) {
    throw badRequest("รหัสผ่านนี้ถูกใช้กับ UserOA อื่นแล้ว");
  }
}

export async function authenticatePassword(password) {
  if (typeof password !== "string" || !password) {
    throw badRequest("กรุณากรอกรหัสผ่าน");
  }

  if (safeEqual(password, config.adminPassword)) {
    return { role: "admin", userId: null, displayName: "Admin" };
  }

  const result = await query(
    `
      SELECT id, display_name, password_hash
      FROM user_oa_accounts
      WHERE is_active = TRUE
      ORDER BY id ASC
    `
  );

  const user = result.rows.find((row) => verifyPassword(password, row.password_hash));
  if (!user) {
    throw unauthorized("รหัสผ่านไม่ถูกต้อง");
  }

  return {
    role: "user_oa",
    userId: Number(user.id),
    displayName: user.display_name
  };
}

async function replaceAssignments(userId, botIds) {
  const ids = normalizeIds(botIds);
  await query("DELETE FROM user_bot_assignments WHERE user_oa_id = $1", [userId]);

  for (const botId of ids) {
    await query(
      `
        INSERT INTO user_bot_assignments (user_oa_id, bot_id)
        VALUES ($1, $2)
        ON CONFLICT DO NOTHING
      `,
      [userId, botId]
    );
  }
}

export async function listUserOaAccounts() {
  const result = await query(`
    SELECT
      users.id,
      users.display_name,
      users.is_active,
      users.created_at,
      users.updated_at,
      COALESCE(
        JSON_AGG(assignments.bot_id ORDER BY assignments.bot_id)
          FILTER (WHERE assignments.bot_id IS NOT NULL),
        '[]'
      ) AS bot_ids
    FROM user_oa_accounts users
    LEFT JOIN user_bot_assignments assignments ON assignments.user_oa_id = users.id
    GROUP BY users.id
    ORDER BY users.created_at DESC, users.id DESC
  `);

  return result.rows.map((row) => ({
    ...row,
    id: Number(row.id),
    bot_ids: row.bot_ids.map(Number)
  }));
}

export async function createUserOaAccount({ displayName, password, botIds, isActive = true }) {
  const name = typeof displayName === "string" ? displayName.trim() : "";
  const passwordText = typeof password === "string" ? password.trim() : "";
  if (!name) throw badRequest("กรุณากรอกชื่อ UserOA");
  if (!passwordText) {
    throw badRequest("กรุณากรอกรหัสผ่าน UserOA");
  }

  await assertPasswordUnique(passwordText);
  const result = await query(
    `
      INSERT INTO user_oa_accounts (display_name, password_hash, is_active)
      VALUES ($1, $2, $3)
      RETURNING id
    `,
    [name, hashPassword(passwordText), Boolean(isActive)]
  );

  const userId = Number(result.rows[0].id);
  await replaceAssignments(userId, botIds);
  return listUserOaAccounts().then((users) => users.find((user) => user.id === userId));
}

export async function updateUserOaAccount(id, { displayName, password, botIds, isActive = true }) {
  const userId = Number(id);
  if (!Number.isFinite(userId)) throw badRequest("UserOA ไม่ถูกต้อง");

  const name = typeof displayName === "string" ? displayName.trim() : "";
  if (!name) throw badRequest("กรุณากรอกชื่อ UserOA");

  const passwordText = typeof password === "string" ? password.trim() : "";
  if (passwordText) {
    await assertPasswordUnique(passwordText, userId);
    await query(
      `
        UPDATE user_oa_accounts
        SET display_name = $1, password_hash = $2, is_active = $3, updated_at = NOW()
        WHERE id = $4
      `,
      [name, hashPassword(passwordText), Boolean(isActive), userId]
    );
  } else {
    await query(
      `
        UPDATE user_oa_accounts
        SET display_name = $1, is_active = $2, updated_at = NOW()
        WHERE id = $3
      `,
      [name, Boolean(isActive), userId]
    );
  }

  await replaceAssignments(userId, botIds);
  return listUserOaAccounts().then((users) => users.find((user) => user.id === userId));
}

export async function deleteUserOaAccount(id) {
  const userId = Number(id);
  if (!Number.isFinite(userId)) throw badRequest("UserOA ไม่ถูกต้อง");

  await query(
    `
      UPDATE user_oa_accounts
      SET is_active = FALSE, updated_at = NOW()
      WHERE id = $1
    `,
    [userId]
  );

  return { ok: true };
}

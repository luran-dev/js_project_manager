import { createHash, randomBytes, randomInt } from "node:crypto";

const resetTtlMs = 1000 * 60 * 5;
const resetAttempts = new Map();
const normalizedEmail = (value) => String(value ?? "").trim().toLowerCase();
const validEmail = (value) => value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

const consumeAttempt = (key, limit, now) => {
  const current = resetAttempts.get(key);
  if (current === undefined || current.resetAt <= now()) {
    if (resetAttempts.size >= 10_000) {
      for (const [attemptKey, attempt] of resetAttempts) {
        if (attempt.resetAt <= now()) resetAttempts.delete(attemptKey);
      }
      while (resetAttempts.size >= 10_000) {
        const oldestKey = resetAttempts.keys().next().value;
        if (typeof oldestKey !== "string") break;
        resetAttempts.delete(oldestKey);
      }
    }
    resetAttempts.set(key, { count: 1, resetAt: now() + resetTtlMs });
    return true;
  }
  if (current.count >= limit) return false;
  resetAttempts.set(key, { ...current, count: current.count + 1 });
  return true;
};

const sendCode = async (email, code) => {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL;
  if (!apiKey || !from) throw new HttpError(503, "Password reset email is not configured");
  const result = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({
      from,
      to: [email],
      subject: "ProjectVibe password reset code",
      text: `Your ProjectVibe password reset code is ${code}. This code expires in 5 minutes and can only be used once.`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!result.ok) throw new Error(`Resend returned ${result.status}`);
};

export const createPasswordResetHandler = ({ sql, selectOneJson, quote, hashPassword, verifyPassword, json, readJson, now }) => {
  const dummyCodeHash = hashPassword("000000");
  const issue = (email, code) => {
    const codeHash = hashPassword(code);
    const user = selectOneJson(`SELECT id FROM users WHERE email = ${quote(email)};`);
    if (!user) return null;
    sql(`
      BEGIN IMMEDIATE;
      DELETE FROM password_reset_grants WHERE user_id = ${quote(user.id)};
      INSERT INTO password_reset_codes (user_id, code_hash, expires_at, attempts_remaining)
      VALUES (${quote(user.id)}, ${quote(codeHash)}, ${now() + resetTtlMs}, 5)
      ON CONFLICT(user_id) DO UPDATE SET code_hash = excluded.code_hash, expires_at = excluded.expires_at, attempts_remaining = 5;
      COMMIT;
    `);
    return codeHash;
  };

  const verify = (email, code) => {
    sql(`DELETE FROM password_reset_codes WHERE expires_at <= ${now()}; DELETE FROM password_reset_grants WHERE expires_at <= ${now()};`);
    const reset = selectOneJson(`SELECT password_reset_codes.user_id, code_hash, attempts_remaining FROM password_reset_codes JOIN users ON users.id = password_reset_codes.user_id WHERE users.email = ${quote(email)};`);
    const codeMatches = verifyPassword(code, String(reset?.code_hash ?? dummyCodeHash));
    if (!reset || !codeMatches) {
      if (reset) {
        sql(Number(reset.attempts_remaining) <= 1
          ? `DELETE FROM password_reset_codes WHERE user_id = ${quote(reset.user_id)};`
          : `UPDATE password_reset_codes SET attempts_remaining = attempts_remaining - 1 WHERE user_id = ${quote(reset.user_id)};`);
      }
      return null;
    }
    const grant = randomBytes(32).toString("hex");
    sql(`
      BEGIN IMMEDIATE;
      DELETE FROM password_reset_codes WHERE user_id = ${quote(reset.user_id)};
      INSERT INTO password_reset_grants (token_hash, user_id, expires_at)
      VALUES (${quote(createHash("sha256").update(grant).digest("hex"))}, ${quote(reset.user_id)}, ${now() + resetTtlMs})
      ON CONFLICT(user_id) DO UPDATE SET token_hash = excluded.token_hash, expires_at = excluded.expires_at;
      COMMIT;
    `);
    return grant;
  };

  const complete = (grant, password) => {
    const tokenHash = createHash("sha256").update(grant).digest("hex");
    const result = selectOneJson(`
      BEGIN IMMEDIATE;
      UPDATE users SET password_hash = ${quote(hashPassword(password))}
      WHERE id = (SELECT user_id FROM password_reset_grants WHERE token_hash = ${quote(tokenHash)} AND expires_at > ${now()});
      SELECT changes() AS changed;
      DELETE FROM sessions WHERE user_id = (SELECT user_id FROM password_reset_grants WHERE token_hash = ${quote(tokenHash)});
      DELETE FROM password_reset_grants WHERE token_hash = ${quote(tokenHash)};
      COMMIT;
    `);
    return Number(result?.changed) === 1;
  };

  return async (request, response, path) => {
    if (path === "/api/auth/password-reset/request") {
      const body = await readJson(request);
      const email = normalizedEmail(body.email);
      if (!validEmail(email)) throw new HttpError(400, "Enter a valid email address");
      if (!consumeAttempt(`ip:${request.socket.remoteAddress ?? "unknown"}`, 10, now) || !consumeAttempt(`email:${email}`, 5, now)) throw new HttpError(429, "Too many requests. Try again in 5 minutes");
      if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) throw new HttpError(503, "Password reset email is not configured");
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const issuedCodeHash = issue(email, code);
      if (issuedCodeHash !== null) {
        void sendCode(email, code).catch((error) => {
          sql(`DELETE FROM password_reset_codes WHERE user_id = (SELECT id FROM users WHERE email = ${quote(email)}) AND code_hash = ${quote(issuedCodeHash)};`);
          console.error(`Password reset email delivery failed: ${error instanceof Error ? error.message : "Unknown error"}`);
        });
      }
      json(response, 202, { ok: true });
      return;
    }

    const body = await readJson(request);
    if (path === "/api/auth/password-reset/verify") {
      const email = normalizedEmail(body.email);
      const code = String(body.code ?? "");
      if (!validEmail(email) || !/^\d{6}$/.test(code)) throw new HttpError(400, "Enter the email and 6-digit verification code");
      const resetToken = verify(email, code);
      if (resetToken === null) throw new HttpError(400, "The verification code is invalid or expired");
      json(response, 200, { resetToken });
      return;
    }

    if (path !== "/api/auth/password-reset/complete") throw new HttpError(404, "Not found");
    const resetToken = String(body.resetToken ?? "");
    const password = String(body.password ?? "");
    if (resetToken.length < 32 || resetToken.length > 128 || password.length < 8 || password.length > 128) throw new HttpError(400, "The new password must be between 8 and 128 characters");
    if (!complete(resetToken, password)) throw new HttpError(400, "The password reset request expired. Start again");
    json(response, 200, { ok: true });
  };
};

import { createHash, randomBytes, scryptSync, timingSafeEqual } from "node:crypto";
import { mkdirSync } from "node:fs";
import { createServer } from "node:http";
import { dirname, resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { currentUser, initialWorkspaces } from "./seed.mjs";

const port = Number(process.env.PORT ?? 8787);
const dbPath = resolve(process.env.DATABASE_URL?.replace(/^file:/, "") ?? ".data/projectvibe.sqlite");
const sessionTtlMs = 1000 * 60 * 60 * 24 * 7;

mkdirSync(dirname(dbPath), { recursive: true });

const quote = (value) => `'${String(value).replaceAll("'", "''")}'`;
const sql = (statement) => execFileSync("sqlite3", ["-batch", dbPath], { encoding: "utf8", input: statement });
const hashPassword = (password, salt = randomBytes(16).toString("hex")) => `${salt}:${scryptSync(password, salt, 32).toString("hex")}`;
const verifyPassword = (password, storedHash) => {
  const [salt, hash] = storedHash.split(":");
  if (!salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  const actual = scryptSync(password, salt, expected.length);
  return timingSafeEqual(expected, actual);
};
const json = (response, status, body, headers = {}) => {
  response.writeHead(status, { "content-type": "application/json", ...headers });
  response.end(JSON.stringify(body));
};
const readJson = (request) => new Promise((resolveRead, reject) => {
  let body = "";
  request.on("data", (chunk) => { body += chunk; });
  request.on("end", () => {
    try {
      resolveRead(body ? JSON.parse(body) : {});
    } catch (error) {
      reject(error);
    }
  });
});
const b64 = (value) => Buffer.from(value, "utf8").toString("base64");
const unb64 = (value) => Buffer.from(value, "base64").toString("utf8");
const now = () => Date.now();
const createUserSnapshot = (user) => {
  const workspaceId = `w-${randomBytes(8).toString("hex")}`;
  return {
    currentUser: {
      id: user.id,
      name: user.name,
      email: user.email,
      defaultCountry: "Korea",
      workspaceMemberships: [{ userId: user.id, workspaceId, role: "OWNER" }],
    },
    workspaces: [{
      id: workspaceId,
      name: `${user.name}'s Workspace`,
      users: [],
      ptos: [],
      projects: [{ id: `project-${randomBytes(8).toString("hex")}`, name: "New Project", defaultCountry: "Korea", tasks: [] }],
    }],
  };
};

const initDb = () => {
  sql(`
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, password_hash TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL, expires_at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS app_snapshots (user_id TEXT PRIMARY KEY, snapshot_json TEXT NOT NULL, updated_at INTEGER NOT NULL);
  `);
  const userCount = Number(sql("SELECT COUNT(*) FROM users;").trim());
  if (userCount === 0) {
    sql(`INSERT INTO users (id, email, name, password_hash) VALUES (${quote(currentUser.id)}, ${quote(currentUser.email)}, ${quote(currentUser.name)}, ${quote(hashPassword("password"))});`);
    sql(`INSERT INTO app_snapshots (user_id, snapshot_json, updated_at) VALUES (${quote(currentUser.id)}, ${quote(b64(JSON.stringify({ currentUser, workspaces: initialWorkspaces })))}, ${now()});`);
  }
};

const selectOneJson = (statement) => {
  const output = sql(`.mode json\n${statement}`).trim();
  return output ? JSON.parse(output)[0] : undefined;
};
const createSession = (userId) => {
  const token = randomBytes(32).toString("hex");
  const tokenHash = createHash("sha256").update(token).digest("hex");
  sql(`INSERT INTO sessions (token_hash, user_id, expires_at) VALUES (${quote(tokenHash)}, ${quote(userId)}, ${now() + sessionTtlMs});`);
  return token;
};
const cookieToken = (request) => request.headers.cookie?.split(";").map((item) => item.trim()).find((item) => item.startsWith("pv_session="))?.slice("pv_session=".length);
const sessionUserId = (request) => {
  const token = cookieToken(request);
  if (!token) return null;
  const tokenHash = createHash("sha256").update(token).digest("hex");
  const session = selectOneJson(`SELECT user_id, expires_at FROM sessions WHERE token_hash = ${quote(tokenHash)};`);
  if (!session || Number(session.expires_at) < now()) return null;
  return String(session.user_id);
};
const loadSnapshot = (userId) => {
  const row = selectOneJson(`SELECT snapshot_json FROM app_snapshots WHERE user_id = ${quote(userId)};`);
  return row ? JSON.parse(unb64(row.snapshot_json)) : { currentUser, workspaces: initialWorkspaces };
};
const saveSnapshot = (userId, snapshot) => {
  sql(`INSERT INTO app_snapshots (user_id, snapshot_json, updated_at) VALUES (${quote(userId)}, ${quote(b64(JSON.stringify(snapshot)))}, ${now()}) ON CONFLICT(user_id) DO UPDATE SET snapshot_json = excluded.snapshot_json, updated_at = excluded.updated_at;`);
};

initDb();

export const handleApiRequest = async (request, response) => {
  try {
    const url = new URL(request.url ?? "/", `http://${request.headers.host}`);

    if (request.method === "GET" && url.pathname === "/api/health") {
      json(response, 200, { ok: true });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/auth/session") {
      const userId = sessionUserId(request);
      json(response, 200, userId ? { authenticated: true, snapshot: loadSnapshot(userId) } : { authenticated: false });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/login") {
      const body = await readJson(request);
      const user = selectOneJson(`SELECT id, email, name, password_hash FROM users WHERE email = ${quote(body.email ?? "")};`);
      if (!user || !verifyPassword(String(body.password ?? ""), String(user.password_hash))) {
        json(response, 401, { error: "Invalid email or password" });
        return;
      }
      const token = createSession(String(user.id));
      json(response, 200, loadSnapshot(String(user.id)), { "set-cookie": `pv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlMs / 1000}` });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/register") {
      const body = await readJson(request);
      const email = String(body.email ?? "").trim().toLowerCase();
      const name = String(body.name ?? "").trim();
      const password = String(body.password ?? "");
      if (!email || !name || password.length < 6) {
        json(response, 400, { error: "Name, email, and a 6+ character password are required" });
        return;
      }
      const existingUser = selectOneJson(`SELECT id FROM users WHERE email = ${quote(email)};`);
      if (existingUser) {
        json(response, 409, { error: "Email is already registered" });
        return;
      }
      const user = { id: `u-${randomBytes(8).toString("hex")}`, email, name };
      const snapshot = createUserSnapshot(user);
      sql(`INSERT INTO users (id, email, name, password_hash) VALUES (${quote(user.id)}, ${quote(user.email)}, ${quote(user.name)}, ${quote(hashPassword(password))});`);
      saveSnapshot(user.id, snapshot);
      const token = createSession(user.id);
      json(response, 201, snapshot, { "set-cookie": `pv_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${sessionTtlMs / 1000}` });
      return;
    }

    if (request.method === "POST" && url.pathname === "/api/auth/logout") {
      const token = cookieToken(request);
      if (token) sql(`DELETE FROM sessions WHERE token_hash = ${quote(createHash("sha256").update(token).digest("hex"))};`);
      json(response, 200, { ok: true }, { "set-cookie": "pv_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0" });
      return;
    }

    const userId = sessionUserId(request);
    if (!userId) {
      json(response, 401, { error: "Authentication required" });
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/snapshot") {
      json(response, 200, loadSnapshot(userId));
      return;
    }

    if (request.method === "PUT" && url.pathname === "/api/snapshot") {
      const snapshot = await readJson(request);
      saveSnapshot(userId, snapshot);
      json(response, 200, { ok: true });
      return;
    }

    json(response, 404, { error: "Not found" });
  } catch (error) {
    json(response, 500, { error: error instanceof Error ? error.message : "Server error" });
  }
};

if (import.meta.url === `file://${process.argv[1]}`) {
  createServer(handleApiRequest).listen(port, () => {
    console.log(`ProjectVibe API listening on http://127.0.0.1:${port}`);
  });
}

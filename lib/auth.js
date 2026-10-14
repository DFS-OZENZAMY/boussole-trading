// Boussole Trading : outils partagés (base de données, mots de passe, sessions)
const enc = new TextEncoder();
const SESSION_DAYS = 30;
export const COOKIE = "bt_session";

let schemaReady = false;
const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS users (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     username TEXT NOT NULL UNIQUE COLLATE NOCASE,
     display_name TEXT,
     pass_hash TEXT NOT NULL,
     role TEXT NOT NULL DEFAULT 'trader',
     active INTEGER NOT NULL DEFAULT 1,
     must_change INTEGER NOT NULL DEFAULT 0,
     created_at INTEGER NOT NULL,
     last_login INTEGER)`,
  `CREATE TABLE IF NOT EXISTS sessions (
     token_hash TEXT PRIMARY KEY,
     user_id INTEGER NOT NULL,
     created_at INTEGER NOT NULL,
     expires_at INTEGER NOT NULL,
     user_agent TEXT)`,
  `CREATE INDEX IF NOT EXISTS idx_sessions_user ON sessions(user_id)`,
  `CREATE TABLE IF NOT EXISTS user_data (
     user_id INTEGER NOT NULL,
     key TEXT NOT NULL,
     value TEXT,
     updated_at INTEGER NOT NULL,
     PRIMARY KEY (user_id, key))`,
  `CREATE TABLE IF NOT EXISTS trades (
     id INTEGER PRIMARY KEY AUTOINCREMENT,
     user_id INTEGER NOT NULL,
     instrument TEXT, dir INTEGER, entry REAL, exit REAL, sl0 REAL, sl REAL, tp REAL,
     r REAL, pnl REAL, tf TEXT, source TEXT,
     opened_at INTEGER, closed_at INTEGER,
     setup TEXT, notes TEXT, emotion TEXT, rules_ok INTEGER)`,
  `CREATE INDEX IF NOT EXISTS idx_trades_user ON trades(user_id, closed_at)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (
     username TEXT, ip TEXT, at INTEGER NOT NULL, ok INTEGER NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_attempts ON login_attempts(username, at)`,
  `CREATE TABLE IF NOT EXISTS app_settings (key TEXT PRIMARY KEY, value TEXT)`,
];
// Colonnes ajoutées après la première version : ajoutées automatiquement si elles manquent
const USER_COLUMNS = { pending: "INTEGER NOT NULL DEFAULT 0", email: "TEXT" };
export async function ensureSchema(env) {
  if (schemaReady) return;
  await env.DB.batch(SCHEMA.map(s => env.DB.prepare(s)));
  const { results } = await env.DB.prepare("PRAGMA table_info(users)").all();
  const have = new Set(results.map(c => c.name));
  for (const [col, def] of Object.entries(USER_COLUMNS))
    if (!have.has(col)) await env.DB.prepare(`ALTER TABLE users ADD COLUMN ${col} ${def}`).run();
  schemaReady = true;
}

/* ---------- utilitaires ---------- */
export const now = () => Date.now();
const b64 = buf => btoa(String.fromCharCode(...new Uint8Array(buf)));
const unb64 = s => Uint8Array.from(atob(s), c => c.charCodeAt(0));
const hex = buf => [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, "0")).join("");
export async function sha256(s) { return hex(await crypto.subtle.digest("SHA-256", enc.encode(s))); }

export function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store", ...headers } });
}
export const fail = (message, status = 400) => json({ error: message }, status);
export async function body(request) { try { return await request.json(); } catch { return {}; } }

/* ---------- mots de passe : PBKDF2-SHA256 ---------- */
const ITER = 100000;
async function derive(password, salt, iter) {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
  return crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations: iter }, key, 256);
}
export async function hashPassword(password) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return `pbkdf2$${ITER}$${b64(salt)}$${b64(await derive(password, salt, ITER))}`;
}
export async function verifyPassword(password, stored) {
  const [alg, iter, salt, hash] = String(stored || "").split("$");
  if (alg !== "pbkdf2") return false;
  const got = new Uint8Array(await derive(password, unb64(salt), Number(iter)));
  const want = unb64(hash);
  if (got.length !== want.length) return false;
  let diff = 0; for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}
export async function getSetting(env, key, def) {
  const r = await env.DB.prepare("SELECT value FROM app_settings WHERE key = ?").bind(key).first();
  return r ? r.value : def;
}
export async function setSetting(env, key, value) {
  await env.DB.prepare("INSERT INTO app_settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, String(value)).run();
}
export function checkUsername(u) { return typeof u === "string" && /^[a-zA-Z0-9._-]{3,32}$/.test(u); }
export function checkPassword(p) { return typeof p === "string" && p.length >= 8 && p.length <= 200; }

/* ---------- sessions ---------- */
function cookieValue(request, name) {
  const c = request.headers.get("Cookie") || "";
  for (const part of c.split(/;\s*/)) { const i = part.indexOf("="); if (i > 0 && part.slice(0, i) === name) return part.slice(i + 1); }
  return null;
}
export function sessionCookie(token, maxAge = SESSION_DAYS * 86400) {
  return `${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${maxAge}`;
}
export async function createSession(env, userId, request) {
  const token = hex(crypto.getRandomValues(new Uint8Array(32)));
  const t = now();
  await env.DB.prepare("INSERT INTO sessions (token_hash, user_id, created_at, expires_at, user_agent) VALUES (?, ?, ?, ?, ?)")
    .bind(await sha256(token), userId, t, t + SESSION_DAYS * 86400000, (request.headers.get("User-Agent") || "").slice(0, 200)).run();
  return token;
}
export async function currentUser(request, env) {
  const token = cookieValue(request, COOKIE);
  if (!token || !/^[0-9a-f]{64}$/.test(token)) return null;
  const th = await sha256(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.username, u.display_name, u.role, u.must_change, s.token_hash
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ? AND s.expires_at > ? AND u.active = 1`).bind(th, now()).first();
  return row || null;
}
export const publicUser = u => ({ id: u.id, username: u.username, displayName: u.display_name || u.username, role: u.role, mustChange: !!u.must_change });

import { json, fail, body, verifyPassword, createSession, sessionCookie, now, publicUser } from "../../../lib/auth.js";
const WINDOW = 15 * 60000, MAX_FAILS = 5;
export async function onRequestPost({ request, env }) {
  const { username, password } = await body(request);
  if (!username || !password) return fail("Saisis ton identifiant et ton mot de passe.");
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const since = now() - WINDOW;
  const f = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE ok = 0 AND at > ? AND (username = ? COLLATE NOCASE OR ip = ?)").bind(since, username, ip).first();
  if (f && f.n >= MAX_FAILS) return fail("Trop de tentatives échouées. Réessaie dans 15 minutes.", 429);
  const u = await env.DB.prepare("SELECT * FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
  const good = !!u && await verifyPassword(password, u.pass_hash);
  await env.DB.prepare("INSERT INTO login_attempts (username, ip, at, ok) VALUES (?, ?, ?, ?)").bind(username, ip, now(), good ? 1 : 0).run();
  if (Math.random() < 0.05) await env.DB.prepare("DELETE FROM login_attempts WHERE at < ? AND username <> '__register__'").bind(now() - 86400000).run();
  if (!good) return fail("Identifiant ou mot de passe incorrect.", 401);
  if (u.pending === 1) return fail("Ton compte est en attente de validation par l'administrateur. Tu pourras te connecter dès qu'il l'aura accepté.", 403);
  if (u.active !== 1) return fail("Ce compte est désactivé. Contacte l'administrateur.", 403);
  await env.DB.prepare("UPDATE users SET last_login = ? WHERE id = ?").bind(now(), u.id).run();
  const token = await createSession(env, u.id, request);
  return json({ ok: true, user: publicUser(u) }, 200, { "Set-Cookie": sessionCookie(token) });
}

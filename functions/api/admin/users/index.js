import { json, fail, body, hashPassword, checkUsername, checkPassword, now } from "../../../../lib/auth.js";
export async function onRequestGet({ env }) {
  const { results } = await env.DB.prepare(`SELECT u.id, u.username, u.display_name, u.email, u.role, u.active, u.pending, u.must_change, u.created_at, u.last_login,
      (SELECT COUNT(*) FROM trades t WHERE t.user_id = u.id) AS trades
    FROM users u ORDER BY u.pending DESC, u.created_at`).all();
  return json(results);
}
export async function onRequestPost({ request, env }) {
  const { username, password, displayName, role } = await body(request);
  if (!checkUsername(username)) return fail("Identifiant invalide : 3 à 32 caractères (lettres, chiffres, point, tiret).");
  if (!checkPassword(password)) return fail("Le mot de passe provisoire doit contenir au moins 8 caractères.");
  const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
  if (exists) return fail("Cet identifiant est déjà utilisé.", 409);
  const res = await env.DB.prepare("INSERT INTO users (username, display_name, pass_hash, role, must_change, created_at) VALUES (?, ?, ?, ?, 1, ?)")
    .bind(username, (displayName || username).slice(0, 60), await hashPassword(password), role === "admin" ? "admin" : "trader", now()).run();
  // un compte créé par l'administrateur est directement actif
  return json({ ok: true, id: res.meta.last_row_id });
}

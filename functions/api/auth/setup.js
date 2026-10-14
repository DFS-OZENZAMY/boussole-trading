import { json, fail, body, hashPassword, checkUsername, checkPassword, createSession, sessionCookie, now, publicUser } from "../../../lib/auth.js";
// Création du premier compte administrateur, possible uniquement tant qu'aucun compte n'existe.
export async function onRequestPost({ request, env }) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (r && r.n > 0) return fail("La plateforme est déjà configurée. Connecte-toi avec ton compte.", 403);
  const { username, password, displayName } = await body(request);
  if (!checkUsername(username)) return fail("Identifiant invalide : 3 à 32 caractères (lettres, chiffres, point, tiret).");
  if (!checkPassword(password)) return fail("Le mot de passe doit contenir au moins 8 caractères.");
  const res = await env.DB.prepare("INSERT INTO users (username, display_name, pass_hash, role, created_at, last_login) VALUES (?, ?, ?, 'admin', ?, ?)")
    .bind(username, (displayName || username).slice(0, 60), await hashPassword(password), now(), now()).run();
  const id = res.meta.last_row_id;
  const token = await createSession(env, id, request);
  return json({ ok: true, user: publicUser({ id, username, display_name: displayName, role: "admin", must_change: 0 }) }, 200, { "Set-Cookie": sessionCookie(token) });
}

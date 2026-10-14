import { json, fail, body, hashPassword, checkUsername, checkPassword, now, getSetting } from "../../../lib/auth.js";
// Demande de compte : le compte est créé en attente, l'administrateur doit l'accepter.
export async function onRequestPost({ request, env }) {
  const count = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  if (!count || count.n === 0) return fail("La plateforme n'est pas encore configurée.", 403);
  if ((await getSetting(env, "registration_open", "1")) !== "1") return fail("Les inscriptions sont fermées pour le moment. Contacte l'administrateur.", 403);
  const ip = request.headers.get("CF-Connecting-IP") || "";
  const recent = await env.DB.prepare("SELECT COUNT(*) AS n FROM login_attempts WHERE username = '__register__' AND ip = ? AND at > ?").bind(ip, now() - 3600000).first();
  if (recent && recent.n >= 5) return fail("Trop de demandes depuis cette connexion. Réessaie dans une heure.", 429);
  const { username, password, displayName, email } = await body(request);
  const name = String(displayName || "").trim();
  if (!name) return fail("Indique ton nom.");
  if (!checkUsername(username)) return fail("Identifiant invalide : 3 à 32 caractères (lettres, chiffres, point, tiret).");
  if (!checkPassword(password)) return fail("Le mot de passe doit contenir au moins 8 caractères.");
  const mail = String(email || "").trim();
  if (mail && (mail.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail))) return fail("Adresse e-mail invalide.");
  const exists = await env.DB.prepare("SELECT id FROM users WHERE username = ? COLLATE NOCASE").bind(username).first();
  if (exists) return fail("Cet identifiant est déjà pris. Choisis-en un autre.", 409);
  await env.DB.batch([
    env.DB.prepare("INSERT INTO users (username, display_name, email, pass_hash, role, active, pending, must_change, created_at) VALUES (?, ?, ?, ?, 'trader', 0, 1, 0, ?)")
      .bind(username, name.slice(0, 60), mail || null, await hashPassword(password), now()),
    env.DB.prepare("INSERT INTO login_attempts (username, ip, at, ok) VALUES ('__register__', ?, ?, 1)").bind(ip, now()),
  ]);
  return json({ ok: true, pending: true });
}

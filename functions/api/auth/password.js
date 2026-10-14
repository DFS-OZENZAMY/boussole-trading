import { json, fail, body, verifyPassword, hashPassword, checkPassword } from "../../../lib/auth.js";
export async function onRequestPost({ request, env, data }) {
  const { current, next } = await body(request);
  const u = await env.DB.prepare("SELECT pass_hash FROM users WHERE id = ?").bind(data.user.id).first();
  if (!u || !await verifyPassword(current || "", u.pass_hash)) return fail("Le mot de passe actuel est incorrect.", 403);
  if (!checkPassword(next)) return fail("Le nouveau mot de passe doit contenir au moins 8 caractères.");
  await env.DB.batch([
    env.DB.prepare("UPDATE users SET pass_hash = ?, must_change = 0 WHERE id = ?").bind(await hashPassword(next), data.user.id),
    env.DB.prepare("DELETE FROM sessions WHERE user_id = ? AND token_hash <> ?").bind(data.user.id, data.user.token_hash),
  ]);
  return json({ ok: true });
}

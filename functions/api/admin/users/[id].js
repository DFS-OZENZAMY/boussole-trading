import { json, fail, body, hashPassword, checkPassword } from "../../../../lib/auth.js";
export async function onRequestPatch({ request, env, data, params }) {
  const id = Number(params.id), t = await body(request), stmts = [];
  if (id === data.user.id && (t.active === false || t.role === "trader")) return fail("Tu ne peux pas désactiver ni rétrograder ton propre compte.");
  if ("password" in t) {
    if (!checkPassword(t.password)) return fail("Le mot de passe provisoire doit contenir au moins 8 caractères.");
    stmts.push(env.DB.prepare("UPDATE users SET pass_hash = ?, must_change = 1 WHERE id = ?").bind(await hashPassword(t.password), id));
    stmts.push(env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
  }
  if ("active" in t) {
    stmts.push(env.DB.prepare("UPDATE users SET active = ? WHERE id = ?").bind(t.active ? 1 : 0, id));
    if (!t.active) stmts.push(env.DB.prepare("DELETE FROM sessions WHERE user_id = ?").bind(id));
  }
  if (t.approve === true) stmts.push(env.DB.prepare("UPDATE users SET active = 1, pending = 0 WHERE id = ? AND pending = 1").bind(id));
  if ("role" in t) stmts.push(env.DB.prepare("UPDATE users SET role = ? WHERE id = ?").bind(t.role === "admin" ? "admin" : "trader", id));
  if ("displayName" in t) stmts.push(env.DB.prepare("UPDATE users SET display_name = ? WHERE id = ?").bind(String(t.displayName || "").slice(0, 60), id));
  if (!stmts.length) return fail("Rien à modifier.");
  await env.DB.batch(stmts);
  return json({ ok: true });
}
export async function onRequestDelete({ env, data, params }) {
  const id = Number(params.id);
  if (id === data.user.id) return fail("Tu ne peux pas supprimer ton propre compte.");
  await env.DB.batch(["DELETE FROM sessions WHERE user_id = ?", "DELETE FROM user_data WHERE user_id = ?", "DELETE FROM trades WHERE user_id = ?", "DELETE FROM users WHERE id = ?"]
    .map(q => env.DB.prepare(q).bind(id)));
  return json({ ok: true });
}

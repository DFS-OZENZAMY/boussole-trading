import { json, fail, now } from "../../../lib/auth.js";
const KEY = /^[a-zA-Z0-9:_.-]{1,80}$/;
export async function onRequestPut({ request, env, data, params }) {
  if (!KEY.test(params.key)) return fail("Clé invalide.");
  const value = await request.text();
  if (value.length > 200000) return fail("Donnée trop volumineuse.", 413);
  await env.DB.prepare(`INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at`)
    .bind(data.user.id, params.key, value, now()).run();
  return json({ ok: true });
}
export async function onRequestDelete({ env, data, params }) {
  if (!KEY.test(params.key)) return fail("Clé invalide.");
  await env.DB.prepare("DELETE FROM user_data WHERE user_id = ? AND key = ?").bind(data.user.id, params.key).run();
  return json({ ok: true });
}

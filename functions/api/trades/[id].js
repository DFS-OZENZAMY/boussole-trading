import { json, fail, body } from "../../../lib/auth.js";
const FIELDS = { setup: 60, notes: 4000, emotion: 30 };
export async function onRequestPatch({ request, env, data, params }) {
  const t = await body(request), sets = [], vals = [];
  for (const [k, n] of Object.entries(FIELDS)) if (k in t) { sets.push(k + " = ?"); vals.push(t[k] == null ? null : String(t[k]).slice(0, n)); }
  if ("rules_ok" in t) { sets.push("rules_ok = ?"); vals.push(t.rules_ok == null ? null : (t.rules_ok ? 1 : 0)); }
  if ("exit" in t && isFinite(Number(t.exit))) { sets.push("exit = ?"); vals.push(Number(t.exit)); }
  if ("r" in t && isFinite(Number(t.r))) { sets.push("r = ?"); vals.push(Number(t.r)); }
  if (!sets.length) return fail("Rien à modifier.");
  const res = await env.DB.prepare(`UPDATE trades SET ${sets.join(", ")} WHERE id = ? AND user_id = ?`).bind(...vals, Number(params.id), data.user.id).run();
  return res.meta.changes ? json({ ok: true }) : fail("Trade introuvable.", 404);
}
export async function onRequestDelete({ env, data, params }) {
  const res = await env.DB.prepare("DELETE FROM trades WHERE id = ? AND user_id = ?").bind(Number(params.id), data.user.id).run();
  return res.meta.changes ? json({ ok: true }) : fail("Trade introuvable.", 404);
}

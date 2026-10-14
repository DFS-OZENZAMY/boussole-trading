import { json, fail, body, now } from "../../../lib/auth.js";
const num = v => (v === null || v === undefined || v === "" || !isFinite(Number(v))) ? null : Number(v);
const str = (v, n) => v == null ? null : String(v).slice(0, n);
export async function onRequestGet({ request, env, data }) {
  const u = new URL(request.url);
  const from = num(u.searchParams.get("from")) || 0, to = num(u.searchParams.get("to")) || 9e15;
  const { results } = await env.DB.prepare("SELECT * FROM trades WHERE user_id = ? AND closed_at BETWEEN ? AND ? ORDER BY closed_at DESC LIMIT 2000")
    .bind(data.user.id, from, to).all();
  return json(results);
}
export async function onRequestPost({ request, env, data }) {
  const t = await body(request);
  if (![1, -1].includes(Number(t.dir)) || num(t.entry) == null) return fail("Trade incomplet : sens et prix d'entrée requis.");
  const res = await env.DB.prepare(`INSERT INTO trades (user_id, instrument, dir, entry, exit, sl0, sl, tp, r, pnl, tf, source, opened_at, closed_at, setup, notes, emotion, rules_ok)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(
    data.user.id, str(t.instrument, 20), Number(t.dir), num(t.entry), num(t.exit), num(t.sl0), num(t.sl), num(t.tp), num(t.r), num(t.pnl),
    str(t.tf, 8), str(t.source, 20), num(t.opened_at), num(t.closed_at) || now(), str(t.setup, 60), str(t.notes, 4000), str(t.emotion, 30),
    t.rules_ok == null ? null : (t.rules_ok ? 1 : 0)).run();
  return json({ ok: true, id: res.meta.last_row_id });
}

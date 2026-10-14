import { json } from "../../../lib/auth.js";
// Toutes les données enregistrées du trader connecté (plan, positions, réglages…)
export async function onRequestGet({ env, data }) {
  const { results } = await env.DB.prepare("SELECT key, value FROM user_data WHERE user_id = ?").bind(data.user.id).all();
  const out = {}; for (const r of results) out[r.key] = r.value;
  return json(out);
}

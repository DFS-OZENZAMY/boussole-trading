import { json } from "../../../lib/auth.js";
export async function onRequestGet({ env, data }) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  return json({ needsSetup: !r || r.n === 0, loggedIn: !!data.user });
}

import { json, getSetting } from "../../../lib/auth.js";
export async function onRequestGet({ env, data }) {
  const r = await env.DB.prepare("SELECT COUNT(*) AS n FROM users").first();
  const needsSetup = !r || r.n === 0;
  return json({ needsSetup, loggedIn: !!data.user, registrationOpen: !needsSetup && (await getSetting(env, "registration_open", "1")) === "1" });
}

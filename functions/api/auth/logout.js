import { json, sessionCookie } from "../../../lib/auth.js";
export async function onRequestPost({ env, data }) {
  if (data.user) await env.DB.prepare("DELETE FROM sessions WHERE token_hash = ?").bind(data.user.token_hash).run();
  return json({ ok: true }, 200, { "Set-Cookie": sessionCookie("", 0) });
}

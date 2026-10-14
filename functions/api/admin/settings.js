import { json, body, getSetting, setSetting } from "../../../lib/auth.js";
export async function onRequestGet({ env }) {
  return json({ registrationOpen: (await getSetting(env, "registration_open", "1")) === "1" });
}
export async function onRequestPut({ request, env }) {
  const t = await body(request);
  if ("registrationOpen" in t) await setSetting(env, "registration_open", t.registrationOpen ? "1" : "0");
  return json({ ok: true });
}

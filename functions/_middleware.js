import { ensureSchema, currentUser, json } from "../lib/auth.js";

// Pages et API accessibles sans être connecté
const OPEN = new Set(["/login", "/login.html", "/api/auth/login", "/api/auth/setup", "/api/auth/status", "/favicon.svg"]);

const SECURITY = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
function withHeaders(res) {
  const r = new Response(res.body, res);
  for (const [k, v] of Object.entries(SECURITY)) r.headers.set(k, v);
  return r;
}
const MISSING_DB = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Configuration requise</title><body style="font-family:system-ui,sans-serif;max-width:640px;margin:60px auto;padding:0 20px;line-height:1.55">
<h1>Base de données non reliée</h1>
<p>Boussole Trading a besoin d'une base de données Cloudflare D1 pour gérer les comptes des traders.</p>
<ol><li>Dans Cloudflare, ouvre <b>Storage &amp; Databases</b>, puis <b>D1</b>, et crée une base (par exemple <code>boussole</code>).</li>
<li>Ouvre ton projet Pages, puis <b>Settings</b>, <b>Bindings</b>, et ajoute une liaison <b>D1 database</b> nommée exactement <code>DB</code> vers cette base.</li>
<li>Relance un déploiement (onglet <b>Deployments</b>, <b>Retry deployment</b>).</li></ol>
<p>Les tables sont créées automatiquement au premier chargement.</p></body></html>`;

export async function onRequest(ctx) {
  const { request, env, next, data } = ctx;
  const url = new URL(request.url);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const isApi = path.startsWith("/api/");

  if (!env.DB) return isApi ? json({ error: "Base de données D1 non reliée (liaison DB manquante)." }, 503)
                            : new Response(MISSING_DB, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
  try { await ensureSchema(env); }
  catch (e) { return json({ error: "Impossible de préparer la base de données : " + e.message }, 500); }

  const user = await currentUser(request, env);
  if (user) {
    data.user = user;
    if (path === "/login" || path === "/login.html") return Response.redirect(url.origin + "/", 302);
    return withHeaders(await next());
  }
  if (OPEN.has(path)) return withHeaders(await next());
  if (isApi) return json({ error: "Non connecté." }, 401);
  return Response.redirect(url.origin + "/login", 302);
}

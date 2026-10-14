// Boussole Trading : point d'entrée Cloudflare Workers
// Protège tout le site par mot de passe, sert l'API et les fichiers du dossier public/.
import { ensureSchema, currentUser, json, fail } from "../lib/auth.js";
import * as status from "../functions/api/auth/status.js";
import * as setup from "../functions/api/auth/setup.js";
import * as register from "../functions/api/auth/register.js";
import * as settings from "../functions/api/admin/settings.js";
import * as login from "../functions/api/auth/login.js";
import * as logout from "../functions/api/auth/logout.js";
import * as me from "../functions/api/auth/me.js";
import * as password from "../functions/api/auth/password.js";
import * as dataAll from "../functions/api/data/index.js";
import * as dataKey from "../functions/api/data/[key].js";
import * as trades from "../functions/api/trades/index.js";
import * as tradeId from "../functions/api/trades/[id].js";
import * as users from "../functions/api/admin/users/index.js";
import * as userId from "../functions/api/admin/users/[id].js";
import * as coach from "../functions/api/coach/index.js";

const ROUTES = [
  [/^\/api\/auth\/status$/, status], [/^\/api\/auth\/setup$/, setup], [/^\/api\/auth\/register$/, register], [/^\/api\/auth\/login$/, login],
  [/^\/api\/auth\/logout$/, logout], [/^\/api\/auth\/me$/, me], [/^\/api\/auth\/password$/, password],
  [/^\/api\/data$/, dataAll], [/^\/api\/data\/(?<key>[^/]+)$/, dataKey],
  [/^\/api\/coach$/, coach], [/^\/api\/trades$/, trades], [/^\/api\/trades\/(?<id>\d+)$/, tradeId],
  [/^\/api\/admin\/users$/, users, true], [/^\/api\/admin\/users\/(?<id>\d+)$/, userId, true], [/^\/api\/admin\/settings$/, settings, true],
];
const OPEN = new Set(["/login", "/login.html", "/api/auth/login", "/api/auth/setup", "/api/auth/register", "/api/auth/status", "/favicon.svg"]);
const SECURITY = {
  "X-Content-Type-Options": "nosniff", "Referrer-Policy": "strict-origin-when-cross-origin",
  "X-Frame-Options": "SAMEORIGIN", "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
};
const secure = res => { const r = new Response(res.body, res); for (const [k, v] of Object.entries(SECURITY)) r.headers.set(k, v); return r; };
const METHOD = { GET: "onRequestGet", POST: "onRequestPost", PUT: "onRequestPut", PATCH: "onRequestPatch", DELETE: "onRequestDelete" };

const MISSING_DB = `<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Configuration requise</title><body style="font-family:system-ui,sans-serif;max-width:660px;margin:60px auto;padding:0 20px;line-height:1.55">
<h1>Base de données non reliée</h1>
<p>Boussole Trading a besoin de sa base de données Cloudflare D1 pour gérer les comptes des traders. L'accès reste fermé tant qu'elle n'est pas reliée.</p>
<ol><li>Dans Cloudflare, ouvre <b>Storage &amp; Databases</b>, puis <b>D1</b>, et clique sur ta base <code>bossole_trading</code>. Copie son <b>Database ID</b>.</li>
<li>Dans le dépôt GitHub, ouvre le fichier <code>wrangler.jsonc</code>. Retire les <code>//</code> devant les trois lignes <code>d1_databases</code> et colle l'identifiant à la place de <code>COLLE_ICI_L_ID_DE_LA_BASE</code>.</li>
<li>Enregistre (commit) : Cloudflare redéploie tout seul en une à deux minutes.</li></ol>
<p>Les tables sont créées automatiquement au premier chargement.</p></body></html>`;

async function route(request, env, ctx, path, user) {
  for (const [re, mod, admin] of ROUTES) {
    const m = path.match(re); if (!m) continue;
    if (admin && (!user || user.role !== "admin")) return fail("Réservé aux administrateurs.", 403);
    const h = mod[METHOD[request.method]];
    if (!h) return fail("Méthode non autorisée.", 405);
    return h({ request, env, data: { user }, params: m.groups || {}, waitUntil: ctx.waitUntil.bind(ctx) });
  }
  return fail("Adresse d'API inconnue.", 404);
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname.replace(/\/+$/, "") || "/";
    const isApi = path.startsWith("/api/");
    if (!env.DB) {
      if (path === "/favicon.svg") return env.ASSETS.fetch(request);
      return isApi ? json({ error: "Base de données D1 non reliée." }, 503)
                   : new Response(MISSING_DB, { status: 503, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }
    try { await ensureSchema(env); }
    catch (e) { return json({ error: "Impossible de préparer la base de données : " + e.message }, 500); }

    const user = await currentUser(request, env);
    if (!user && !OPEN.has(path)) {
      if (isApi) return json({ error: "Non connecté." }, 401);
      return Response.redirect(url.origin + "/login", 302);
    }
    if (user && (path === "/login" || path === "/login.html")) return Response.redirect(url.origin + "/", 302);
    if (isApi) return secure(await route(request, env, ctx, path, user));
    const res = await env.ASSETS.fetch(request);
    const out = secure(res);
    if ((res.headers.get("Content-Type") || "").includes("text/html")) out.headers.set("Cache-Control", "no-store");
    return out;
  },
};

// Coach IA : relit les trades du journal et rédige un bilan avec l'API d'Anthropic.
// Nécessite le secret ANTHROPIC_API_KEY sur le Worker. Variable facultative COACH_MODEL pour changer de modèle.
import { json, fail, body, now } from "../../../lib/auth.js";

const MODEL_DEFAULT = "claude-sonnet-5-5";
const COOLDOWN_MS = 10 * 60 * 1000;
const SYSTEM = `Tu es un coach de trading expérimenté qui accompagne un trader particulier francophone.
Tu analyses uniquement les données de son journal fournies ci-dessous : ne suppose rien qui n'y figure pas.
Ton ton est bienveillant mais direct, concret, sans jargon inutile. Tu tutoies le trader.
Tu ne donnes aucun conseil d'achat ou de vente sur un actif, aucune prévision de marché, aucune promesse de gain.
Tu t'appuies sur les statistiques calculées fournies plutôt que de refaire les calculs, et tu cites des chiffres précis.
Si l'échantillon est petit (moins de 20 trades), dis-le clairement et reste prudent dans tes conclusions.
Structure ta réponse en Markdown simple avec exactement ces titres de niveau 2 :
## En bref
## Ce qui fonctionne
## Ce qui te coûte
## Discipline et émotions
## Trois actions pour la semaine prochaine
Les trois actions sont numérotées, précises et mesurables. Réponse de 350 à 600 mots, en français.`;

const r1 = x => Math.round(x * 100) / 100;
function group(rows, keyFn) {
  const m = new Map();
  for (const t of rows) { const k = keyFn(t) || "Non renseigné"; if (!m.has(k)) m.set(k, []); m.get(k).push(t.r || 0); }
  return [...m.entries()].map(([k, rs]) => ({ k, n: rs.length, win: Math.round(rs.filter(r => r > 0).length / rs.length * 100), avg: r1(rs.reduce((a, b) => a + b, 0) / rs.length), tot: r1(rs.reduce((a, b) => a + b, 0)) }))
    .sort((a, b) => b.n - a.n);
}
const session = t => { const h = new Date(t).getUTCHours(); return h >= 22 || h < 7 ? "Asie" : h < 12 ? "Londres" : h < 16 ? "Londres et New York" : "New York"; };
const DAYS = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];

function summary(rows) {
  const rs = rows.map(t => t.r || 0), wins = rs.filter(r => r > 0), losses = rs.filter(r => r < 0);
  const gp = wins.reduce((a, b) => a + b, 0), gl = -losses.reduce((a, b) => a + b, 0);
  let eq = 0, peak = 0, dd = 0, streak = 0, worst = 0;
  for (const r of rs) { eq += r; peak = Math.max(peak, eq); dd = Math.max(dd, peak - eq); streak = r < 0 ? streak + 1 : 0; worst = Math.max(worst, streak); }
  const perDay = new Map(); const rank = rows.map(t => { const d = new Date(t.closed_at).toISOString().slice(0, 10); perDay.set(d, (perDay.get(d) || 0) + 1); return perDay.get(d); });
  return {
    trades: rows.length, reussite_pct: Math.round(wins.length / Math.max(1, rows.length) * 100), total_R: r1(eq), moyenne_R: r1(eq / Math.max(1, rows.length)),
    gain_moyen_R: r1(gp / Math.max(1, wins.length)), perte_moyenne_R: r1(-gl / Math.max(1, losses.length)), profit_factor: gl ? r1(gp / gl) : null,
    drawdown_max_R: r1(dd), pire_serie_de_pertes: worst,
    par_configuration: group(rows, t => t.setup), par_emotion: group(rows, t => t.emotion), par_session: group(rows, t => session(t.closed_at)),
    par_jour: group(rows, t => DAYS[new Date(t.closed_at).getUTCDay()]), par_marche: group(rows, t => t.instrument),
    regles_respectees: group(rows, t => t.rules_ok == null ? "non noté" : t.rules_ok ? "oui" : "non"),
    rang_du_trade_dans_la_journee: group(rows.map((t, i) => Object.assign({}, t, { _rk: rank[i] >= 3 ? "3e trade et plus" : rank[i] + (rank[i] === 1 ? "er trade" : "e trade") })), t => t._rk),
  };
}

export async function onRequestGet({ env, data }) {
  const row = await env.DB.prepare("SELECT value FROM user_data WHERE user_id = ? AND key = 'coach-report'").bind(data.user.id).first();
  let report = null; try { report = row ? JSON.parse(row.value) : null; } catch {}
  return json({ enabled: !!env.ANTHROPIC_API_KEY, report });
}

export async function onRequestPost({ request, env, data }) {
  if (!env.ANTHROPIC_API_KEY) return fail("Le coach IA n'est pas encore activé : l'administrateur doit ajouter le secret ANTHROPIC_API_KEY au Worker Cloudflare.", 503);
  const uid = data.user.id;
  const last = await env.DB.prepare("SELECT updated_at FROM user_data WHERE user_id = ? AND key = 'coach-report'").bind(uid).first();
  if (last && now() - last.updated_at < COOLDOWN_MS) return fail("Un bilan a été préparé il y a moins de 10 minutes. Réessaie un peu plus tard.", 429);
  const b = await body(request);
  const days = [7, 30, 90, 365].includes(Number(b.days)) ? Number(b.days) : 30;
  const { results } = await env.DB.prepare("SELECT instrument, dir, r, tf, opened_at, closed_at, setup, emotion, rules_ok, notes FROM trades WHERE user_id = ? AND closed_at >= ? ORDER BY closed_at ASC LIMIT 400")
    .bind(uid, now() - days * 864e5).all();
  if (results.length < 3) return fail("Il faut au moins 3 trades clôturés sur la période pour un bilan utile.");
  const rulesRow = await env.DB.prepare("SELECT value FROM user_data WHERE user_id = ? AND key = 'rules'").bind(uid).first();
  const lines = results.map(t => [new Date(t.closed_at).toISOString().slice(0, 16).replace("T", " "), t.instrument || "", t.dir > 0 ? "achat" : "vente",
    t.r == null ? "" : r1(t.r) + " R", t.setup || "", t.emotion || "", t.rules_ok == null ? "" : t.rules_ok ? "règles oui" : "règles non",
    t.opened_at ? Math.round((t.closed_at - t.opened_at) / 60000) + " min" : "", (t.notes || "").replace(/\s+/g, " ").slice(0, 200)].join(" | "));
  const prompt = `Période analysée : ${days} derniers jours.\nRègles que le trader s'est fixées : ${rulesRow ? rulesRow.value : "non renseignées"}.\n\n` +
    `Statistiques calculées (résultats exprimés en R, 1 R = le montant risqué sur un trade) :\n${JSON.stringify(summary(results), null, 1)}\n\n` +
    `Trades, du plus ancien au plus récent (date UTC | marché | sens | résultat | configuration | émotion | règles | durée | notes) :\n${lines.join("\n")}`;
  let res;
  try {
    res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "x-api-key": env.ANTHROPIC_API_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
      body: JSON.stringify({ model: env.COACH_MODEL || MODEL_DEFAULT, max_tokens: 2000, system: SYSTEM, messages: [{ role: "user", content: prompt }] }),
    });
  } catch { return fail("Impossible de joindre le service d'IA. Réessaie dans un instant.", 502); }
  if (!res.ok) {
    const why = res.status === 401 ? "clé API refusée, vérifie le secret ANTHROPIC_API_KEY." : res.status === 404 ? "modèle introuvable, vérifie la variable COACH_MODEL." :
      res.status === 429 ? "limite d'utilisation atteinte, réessaie plus tard." : res.status >= 500 ? "service momentanément indisponible." : "requête refusée.";
    return fail("Le service d'IA a répondu " + res.status + " : " + why, 502);
  }
  const j = await res.json();
  const text = (j.content || []).filter(c => c.type === "text").map(c => c.text).join("\n").trim();
  if (!text) return fail("Le service d'IA n'a pas renvoyé de bilan.", 502);
  const report = { t: now(), days, n: results.length, text };
  await env.DB.prepare("INSERT INTO user_data (user_id, key, value, updated_at) VALUES (?, 'coach-report', ?, ?) ON CONFLICT(user_id, key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at")
    .bind(uid, JSON.stringify(report), now()).run();
  return json(report);
}

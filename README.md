# 🧭 Boussole Trading

Plateforme d'aide au trading pour les équipes de traders, protégée par mot de passe et hébergée sur **Cloudflare Pages**. Elle rassemble tout ce qu'il faut pour une journée de trading sur l'**or (XAU/USD)** et le **Nasdaq 100** : lire le marché, préparer ses entrées, suivre ses positions et tenir son journal.

> ⚠️ **Avertissement.** Boussole Trading est un outil d'aide à la lecture du marché, pas un conseil en investissement. Les signaux sont calculés par des règles mécaniques (moyennes mobiles, ATR, volume) qui ne tiennent pas compte de l'actualité et ne garantissent aucun résultat. Le trading à effet de levier comporte un risque élevé de perte en capital. Teste toujours en compte démo, et garde un stop loss chez ton broker.

## Ce que la plateforme apporte au trader

| Vue | À quoi elle sert |
|---|---|
| **Ma journée** | Rose des sessions (Sydney, Tokyo, Londres, New York) avec l'heure actuelle, biais du marché, résultat du jour, limites de perte et de nombre de trades, checklist avant de trader, plan du jour, calendrier économique |
| **Marché** | Tendance sur 5 min, 15 min, 30 min, 1 h et 4 h, score global, flux de volume en direct, zones acheteurs et vendeurs |
| **Graphique et entrées** | Graphique en temps réel (EMA, volume, profil de volume, zones, signaux), plan de trade, entrées proposées, vue TradingView Pepperstone |
| **Ma position** | Suivi en continu avec verdict (saine, vigilance, sortie conseillée) et propositions pour sécuriser les gains en déplaçant le stop |
| **Journal** | Chaque position clôturée est enregistrée : statistiques, courbe des résultats en R, résultats par configuration, émotions, respect des règles, export CSV |
| **Calcul du risque** | Taille de position en lots selon le capital, le risque par trade et la distance du stop |
| **Réglages** | Source des données (Binance, Twelve Data, cTrader), règles du jour, mot de passe, notifications |
| **Équipe** | Réservée aux administrateurs : créer les comptes des traders, réinitialiser un mot de passe, désactiver ou supprimer un compte |

Chaque trader a son propre compte, ses propres réglages, ses positions et son journal, enregistrés dans la base de données. Ses identifiants cTrader restent uniquement dans son navigateur.

## Déployer sur Cloudflare

La plateforme utilise **Cloudflare Pages** (pages et fonctions serveur) et **Cloudflare D1** (base de données). Les deux sont disponibles dans l'offre gratuite.

1. **Relier le dépôt à Cloudflare Pages.** Dans Cloudflare, ouvre **Workers & Pages**, puis **Create**, onglet **Pages**, **Connect to Git**, et choisis ce dépôt. Si ton projet existant a été créé par envoi direct de fichiers (glisser-déposer), crée un nouveau projet relié à Git : l'envoi direct ne gère pas les fonctions serveur.
2. **Réglages de build** du projet :
   - Framework preset : `None`
   - Build command : *(laisser vide)*
   - Build output directory : `public`
3. **Créer la base de données.** Ouvre **Storage & Databases**, puis **D1 SQL Database**, **Create**, et nomme-la par exemple `boussole`.
4. **Relier la base au projet.** Dans le projet Pages, ouvre **Settings**, puis **Bindings**, **Add**, **D1 database**. Nom de la variable : `DB` (exactement), base : `boussole`. Fais-le pour l'environnement **Production** (et **Preview** si tu l'utilises).
5. **Redéployer.** Onglet **Deployments**, puis **Retry deployment** sur le dernier déploiement.
6. **Créer le compte administrateur.** Ouvre l'adresse de ton site : tant qu'aucun compte n'existe, la page de connexion te propose de créer le compte administrateur. Les tables de la base sont créées automatiquement.
7. **Ajouter les traders.** Dans la vue **Équipe**, crée un compte par trader avec un mot de passe provisoire. Il devra le remplacer à sa première connexion.

Si la base n'est pas reliée, le site affiche une page qui rappelle ces étapes.

## Sécurité

- Mots de passe hachés avec PBKDF2-SHA256 (100 000 itérations) et sel aléatoire ; jamais stockés en clair.
- Sessions par cookie `HttpOnly`, `Secure`, `SameSite=Lax`, valables 30 jours ; seule une empreinte du jeton est stockée en base.
- Blocage de 15 minutes après 5 tentatives de connexion échouées.
- Toutes les pages et les API sont protégées, sauf la page de connexion.
- Changer son mot de passe déconnecte ses autres sessions ; désactiver un compte le déconnecte immédiatement.
- Chaque trader n'accède qu'à ses propres données.

## Sources de données de marché

| Source | Marchés | Temps réel | Volume | Accès |
|---|---|---|---|---|
| Binance (PAXG/USDT) | Or (proxy) | Oui, tick par tick | Réel (marché PAXG) | Sans clé |
| Twelve Data | XAU/USD, QQQ, NDX | Toutes les 10 min | QQQ seulement | Clé gratuite ; NDX payant |
| **cTrader Open API** | Or, Nasdaq (ton broker) | Oui, tick par tick | Volume en ticks | Ton compte cTrader, en lecture seule |

## Script TradingView

[`pine/tendance_entrees.pine`](pine/tendance_entrees.pine) reproduit la tendance multi-unités, les signaux et les entrées proposées directement sur un graphique TradingView (par exemple `PEPPERSTONE:XAUUSD`). Colle-le dans l'Éditeur Pine, puis clique sur **Ajouter au graphique**.

## Développement local

```bash
npm install -g wrangler
wrangler pages dev public --d1 DB=boussole
```

## Structure

```
public/            pages servies (application, connexion, icône)
functions/         API serveur Cloudflare Pages Functions
  _middleware.js   protection par mot de passe de tout le site
  api/auth/        connexion, déconnexion, configuration initiale, mot de passe
  api/data/        réglages et données de chaque trader
  api/trades/      journal de trading
  api/admin/       gestion des comptes (administrateurs)
lib/auth.js        base de données, hachage des mots de passe, sessions
pine/              script TradingView
```

## Licence

[MIT](LICENSE). Graphiques : [Lightweight Charts](https://github.com/tradingview/lightweight-charts) de TradingView (Apache 2.0).

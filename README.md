# 🧭 Boussole Trading

Plateforme d'aide au trading pour les équipes de traders, protégée par mot de passe et hébergée sur **Cloudflare Workers**. Elle rassemble tout ce qu'il faut pour une journée de trading sur l'**or (XAU/USD)** et le **Nasdaq 100** : lire le marché, préparer ses entrées, suivre ses positions et tenir son journal.

> ⚠️ **Avertissement.** Boussole Trading est un outil d'aide à la lecture du marché, pas un conseil en investissement. Les signaux sont calculés par des règles mécaniques (moyennes mobiles, ATR, volume) qui ne tiennent pas compte de l'actualité et ne garantissent aucun résultat. Le trading à effet de levier comporte un risque élevé de perte en capital. Teste toujours en compte démo, et garde un stop loss chez ton broker.

## Ce que la plateforme apporte au trader

| Vue | À quoi elle sert |
|---|---|
| **Ma journée** | Rose des sessions (Sydney, Tokyo, Londres, New York) avec l'heure actuelle, biais du marché, résultat du jour, limites de perte et de nombre de trades, checklist avant de trader, plan du jour, calendrier économique |
| **Marché** | Tendance sur 5 min, 15 min, 30 min, 1 h et 4 h, score global, flux de volume en direct, zones acheteurs et vendeurs |
| **Graphique et entrées** | Graphique en temps réel (EMA, volume, profil de volume, zones, signaux), plan de trade, entrées proposées, vue TradingView Pepperstone |
| **Liquidité** | Carte du carnet d'ordres au fil du temps (style heatmap) : murs d'ordres et depuis quand ils tiennent, transactions au marché, carnet actuel, déséquilibre acheteurs / vendeurs près du prix |
| **Footprint** | Volumes achetés et vendus au marché prix par prix dans chaque bougie (1 min à 1 h) : delta, delta cumulé, POC, déséquilibres en diagonale et empilés, enchères inachevées, signaux d'absorption et de divergence |
| **Scanner** | Tous les marchés suivis classés par qualité de configuration. Tu choisis l'unité de temps dont il suit la tendance (5 min à 4 h, ou globale) et le sens (achat, vente ou les deux) : un achat n'est cherché que dans une tendance haussière, une vente que dans une tendance baissière. Les setups « prêts » (repli ou cassure dans le sens de la tendance) affichent entrée, stop et objectif |
| **Fiabilité des signaux** | Rejeu historique des signaux de l'application : réussite, moyenne en R, profit factor, creux maximal, avec ou sans filtre de tendance |
| **Meilleures stratégies** | Teste les stratégies du robot (cassure de volatilité, range d'ouverture, retour au VWAP, repli ou cassure de tendance) sur le marché affiché et dans les 5 unités de temps, avec réglage choisi sur 70 % de l'historique et vérifié sur les 30 % suivants. Pour les combinaisons validées, calcule les **entrées à venir** (niveau, stop, objectif), traçables sur le graphique ou en script Pine |
| **Simulateur de challenge** | Rejoue ton journal des milliers de fois (Monte Carlo) avec les règles de ta prop firm : chances de réussir le challenge, risque de perdre le compte (perte journalière ou maximale, fixe ou suiveuse), temps nécessaire, creux à prévoir. Compare plusieurs risques par trade et recommande le meilleur compromis, teste la résistance si ton avantage réel est plus faible, et donne la probabilité que ton espérance soit vraiment positive |
| **Robot** | Trading automatique sur cTrader (compte démo d'abord) : quatre stratégies de trading court validées sur l'historique avec le coût réel, garde-fous de risque, suspension automatique d'une stratégie perdante |
| **Ma position** | Suivi en continu avec verdict (saine, vigilance, sortie conseillée) et propositions pour sécuriser les gains en déplaçant le stop |
| **Journal** | Chaque position clôturée est enregistrée : statistiques, courbe des résultats en R, résultats par configuration, émotions, respect des règles, export CSV |
| **Performance** | Analyse détaillée du journal (par configuration, émotion, session, jour, règles, rang dans la journée), enseignements automatiques et coach IA |
| **Calcul du risque** | Taille de position en lots selon le capital, le risque par trade et la distance du stop |
| **Réglages** | Source des données (Binance, Twelve Data, cTrader), règles du jour, mot de passe, notifications |
| **Équipe** | Réservée aux administrateurs : valider ou refuser les demandes de compte, ouvrir ou fermer les inscriptions, créer des comptes, réinitialiser un mot de passe, désactiver ou supprimer un compte |

Chaque trader a son propre compte, ses propres réglages, ses positions et son journal, enregistrés dans la base de données. Ses identifiants cTrader restent uniquement dans son navigateur.

## Déployer sur Cloudflare

La plateforme tourne sur **Cloudflare Workers** (fichier `wrangler.jsonc`, point d'entrée `src/worker.js`) avec une base **Cloudflare D1**. Les deux sont disponibles dans l'offre gratuite. Le Worker passe avant chaque fichier : aucune page n'est accessible sans être connecté.

1. **Créer la base de données.** Dans Cloudflare, ouvre **Storage & Databases**, puis **D1**, **Create**. La base de ce projet s'appelle `bossole_trading`.
2. **Renseigner son identifiant.** Ouvre la base, copie son **Database ID**, puis dans `wrangler.jsonc`, retire les `//` devant le bloc `d1_databases` et colle l'identifiant.
3. **Déployer.** Avec Workers relié à GitHub, chaque commit sur `main` redéploie automatiquement (commande de déploiement : `npx wrangler deploy`). En ligne de commande : `npx wrangler deploy`.
4. **Créer le compte administrateur.** Ouvre l'adresse du site : tant qu'aucun compte n'existe, la page de connexion propose de créer le compte administrateur. Les tables sont créées automatiquement.
5. **Ajouter les traders.** Ils peuvent demander un compte eux-mêmes avec le lien « Créer un compte » de la page de connexion (ou l'adresse `/login#inscription`). Leur compte reste en attente jusqu'à ce qu'un administrateur l'accepte dans la vue **Équipe**, où un badge signale les nouvelles demandes. L'administrateur peut aussi fermer les inscriptions ou créer un compte directement, avec un mot de passe provisoire.

Tant que la base n'est pas reliée, le site affiche une page qui rappelle ces étapes et reste fermé.

Le dossier `functions/` contient les mêmes API au format Cloudflare Pages : la plateforme peut aussi être déployée sur Pages (dossier de sortie `public`, liaison D1 nommée `DB`).

## Sécurité

- Mots de passe hachés avec PBKDF2-SHA256 (100 000 itérations) et sel aléatoire ; jamais stockés en clair.
- Sessions par cookie `HttpOnly`, `Secure`, `SameSite=Lax`, valables 30 jours ; seule une empreinte du jeton est stockée en base.
- Blocage de 15 minutes après 5 tentatives de connexion échouées ; 5 demandes de compte au plus par heure et par connexion.
- Un compte demandé depuis la page de connexion ne peut pas se connecter avant d'être accepté par un administrateur.
- Toutes les pages et les API sont protégées, sauf la page de connexion.
- Changer son mot de passe déconnecte ses autres sessions ; désactiver un compte le déconnecte immédiatement.
- Chaque trader n'accède qu'à ses propres données.

## Sources de données de marché

| Source | Marchés | Temps réel | Volume | Accès |
|---|---|---|---|---|
| Binance (PAXG/USDT) | Or (proxy) | Oui, tick par tick | Réel (marché PAXG) | Sans clé |
| Twelve Data | XAU/USD, QQQ, NDX | Toutes les 10 min | QQQ seulement | Clé gratuite ; NDX payant |
| **cTrader Open API** | Or, Nasdaq (ton broker) | Oui, tick par tick | Volume en ticks | Ton compte cTrader, en lecture seule |

### Coach IA

La page **Performance** propose un bilan rédigé par l'IA à partir du journal. Deux fournisseurs possibles, à configurer comme secrets du Worker Cloudflare (Workers, boussole-trading, Settings, Variables and Secrets) :

| Secret | Fournisseur | Variable du modèle | Modèle par défaut |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | API d'Anthropic en direct | `COACH_MODEL` | `claude-sonnet-5-5` |
| `OPENROUTER_API_KEY` | OpenRouter (des centaines de modèles) | `OPENROUTER_MODEL` | `anthropic/claude-sonnet-5.5` |

En ligne de commande : `npx wrangler secret put OPENROUTER_API_KEY` (ou `ANTHROPIC_API_KEY`). Si les deux clés sont présentes, Anthropic est utilisé, sauf si la variable `COACH_PROVIDER` vaut `openrouter`. Les identifiants de modèles OpenRouter sont listés sur openrouter.ai/models. Un bilan par utilisateur toutes les 10 minutes au maximum.

### Robot de trading

Le robot tourne dans le navigateur (page ouverte) et passe des ordres au marché sur cTrader, avec stop et objectif posés chez le broker. Il nécessite un jeton cTrader avec le droit de trading. Stratégies : cassure de volatilité (d'après Larry Williams), cassure du range d'ouverture de Londres et New York, retour au VWAP, replis et cassures de tendance de l'application. Chaque stratégie est validée par marché : choix du réglage sur 70 % de l'historique, vérification sur les 30 % suivants, coût réel déduit, au moins 10 trades et +0,1 R en vérification. Protections : compte démo obligatoire sauf autorisation écrite, risque 0,25 % par défaut (1 % maximum), trades et perte maximale par jour, positions limitées, mode prop firm, suspension d'une stratégie qui perd en réel, fermeture d'urgence. Les trades fermés sont enregistrés dans le journal (source « robot »).

### Mode prop firm

Dans les réglages : limites de perte journalière et totale (fixe ou suiveuse), objectif, jours minimum, heure de début de journée. Le solde est lu sur le compte cTrader (solde, positions ouvertes, transactions du jour), ou calculé depuis le journal, ou saisi à la main.

Avec des accès cTrader enregistrés, la liste des marchés propose aussi **tous les instruments du compte**, groupés par classe d'actifs (liste mise en cache sur l'appareil et rafraîchie une fois par jour). Les prix s'affichent avec le nombre de décimales du symbole chez le broker.

La vue **Liquidité** utilise le carnet complet de PAXG/USDT sur Binance (instantané de 1 000 niveaux puis mises à jour toutes les 100 ms, avec resynchronisation automatique en cas de trou dans le flux) ou la profondeur de marché de ton broker via cTrader, si celui-ci la diffuse. Twelve Data ne fournit pas de carnet.

La vue **Footprint** utilise les transactions de PAXG/USDT sur Binance, avec le côté de l'agresseur : historique récupéré au démarrage par l'API `aggTrades` (jusqu'à 220 requêtes, en remontant les identifiants de transactions), puis flux en direct, avec récupération automatique des transactions manquées après une coupure. Avec cTrader, qui ne diffuse pas les transactions, c'est un footprint en ticks construit en direct.

## Script TradingView

[`pine/tendance_entrees.pine`](pine/tendance_entrees.pine) reproduit la tendance multi-unités, les signaux et les entrées proposées directement sur un graphique TradingView (par exemple `PEPPERSTONE:XAUUSD`). Colle-le dans l'Éditeur Pine, puis clique sur **Ajouter au graphique**.

## Développement local

```bash
npx wrangler dev
```

## Structure

```
public/            pages servies (application, connexion, icône)
src/worker.js      point d'entrée Cloudflare Workers : protection et routage
wrangler.jsonc     configuration Workers (fichiers, base D1)
functions/         API serveur (aussi utilisables avec Cloudflare Pages)
  _middleware.js   protection par mot de passe (version Pages)
  api/auth/        connexion, inscription, déconnexion, configuration initiale, mot de passe
  api/data/        réglages et données de chaque trader
  api/trades/      journal de trading
  api/admin/       validation et gestion des comptes, ouverture des inscriptions
lib/auth.js        base de données, hachage des mots de passe, sessions
pine/              script TradingView
```

## Licence

[MIT](LICENSE). Graphiques : [Lightweight Charts](https://github.com/tradingview/lightweight-charts) de TradingView (Apache 2.0).

# 🧭 Boussole Trading

Plateforme gratuite d'aide au trading qui tourne entièrement dans le navigateur. Elle aide à comprendre **ce qui se passe sur le marché**, propose des **entrées** et **suit tes positions** jusqu'à la sortie, pour l'**or (XAU/USD)** et le **Nasdaq 100**.

> ⚠️ **Avertissement.** Boussole Trading est un outil d'aide à la lecture du marché, pas un conseil en investissement. Les signaux sont calculés par des règles mécaniques (moyennes mobiles, ATR, volume) qui ne tiennent pas compte des annonces économiques et ne garantissent aucun résultat. Le trading à effet de levier comporte un risque élevé de perte en capital. Teste toujours en compte démo, et garde un stop loss chez ton broker.

## Utiliser la plateforme

- **En ligne** : ouvre la page GitHub Pages du dépôt (lien dans la description du dépôt).
- **En local** : télécharge `index.html` et ouvre-le dans ton navigateur (Chrome, Firefox, Edge, Safari).

Aucune installation, aucun serveur, aucun compte à créer. Tes réglages, ton plan de trade et tes positions sont enregistrés uniquement dans ton navigateur.

## Fonctionnalités

### Lire le marché
- **Tendance multi-unités de temps** (5 min, 15 min, 30 min, 1 h, 4 h) : 5 critères par unité (prix et EMA 200, croisements EMA 20/50/200, pente de l'EMA 50, structure des plus hauts et plus bas), atténués par l'ADX.
- **Score global pondéré** : les grandes unités pèsent davantage, avec un verdict clair (biais acheteur, vendeur ou pas de direction).
- **Axe de confluence** : toutes les unités de temps visibles d'un coup d'œil.

### Graphique
- Bougies en temps réel, EMA 20/50/200, volume, légende OHLC au survol, séparateurs de jours.
- **Zones acheteurs et vendeurs** : niveaux où le prix a réagi plusieurs fois, pondérés par le volume, classés forte, moyenne ou faible.
- **Profil de volume** et prix le plus échangé.
- **Signaux** de repli sur EMA 20 et de cassure, uniquement sur bougies clôturées (pas de repaint).
- Vue **TradingView Pepperstone** intégrée (`PEPPERSTONE:XAUUSD`, `PEPPERSTONE:NAS100`).

### Entrées proposées
- Uniquement dans le sens de la tendance de fond : entrée au marché après un signal récent, ordre limite au repli sur l'EMA 20, ordre stop sur cassure.
- Entrée, stop loss et take profit calculés avec l'ATR et le ratio choisi, tracés sur le graphique.

### Volume
- Détection des **afflux de volume** en direct (3 fois la normale ou plus), avec la part d'acheteurs et de vendeurs.
- Message d'**anticipation** qui croise le volume, les zones et la tendance (cassure possible, rejet probable…).
- Repérage des bougies à volume exceptionnel et des phases d'**absorption**.

### Suivi de position
- Déclare ta position depuis ton plan, ou importe-la depuis **cTrader**.
- Surveillance continue : stop et objectif, retour du marché sur l'entrée, retournement de tendance, clôtures contre l'EMA 50, signal contraire, tendance de fond, zone contraire proche, afflux de volume contre toi.
- Verdict clair : **Position saine**, **Vigilance** ou **Sortie conseillée**, avec alerte sonore et notification.
- **Sécuriser mes gains** : propositions de déplacement du stop (stop à l'entrée, derrière la structure, derrière l'EMA 20, moitié des gains, stop suiveur ATR) avec gain sécurisé et marge restante.
- Historique des positions fermées, avec le résultat en R.

## Sources de données

| Source | Marchés | Temps réel | Volume | Accès |
|---|---|---|---|---|
| Binance (PAXG/USDT) | Or (proxy) | Oui, tick par tick | Réel (marché PAXG) | Sans clé |
| Twelve Data | XAU/USD, QQQ, NDX | Toutes les 10 min | QQQ seulement | Clé gratuite ; NDX payant |
| **cTrader Open API** | Or, Nasdaq (ton broker) | Oui, tick par tick | Volume en ticks | Ton compte cTrader |

**Recommandé : cTrader.** Les prix sont exactement ceux de ton broker, en temps réel. La marche à suivre pour obtenir tes accès (Client ID, Secret, jeton) est décrite dans la plateforme, section « Comment obtenir mes accès cTrader ». La connexion est **en lecture seule** : la plateforme ne passe aucun ordre.

> 🔐 Tes identifiants cTrader et ta clé Twelve Data restent dans le stockage local de ton navigateur. Ils ne sont jamais envoyés ailleurs qu'aux services concernés. Ne les partage pas et n'utilise pas la plateforme sur un ordinateur public.

## Script TradingView

Le fichier [`pine/tendance_entrees.pine`](pine/tendance_entrees.pine) reproduit la tendance multi-unités, les signaux et les entrées proposées directement sur un graphique TradingView, par exemple `PEPPERSTONE:XAUUSD` ou `PEPPERSTONE:NAS100`.

1. Ouvre l'**Éditeur Pine** en bas de TradingView.
2. Colle le script, puis clique sur **Enregistrer** et **Ajouter au graphique**.
3. Optionnel : crée des alertes sur « Achat / Vente dans le sens de la tendance globale ».

## Technique

- Un seul fichier HTML autonome : HTML, CSS et JavaScript, sans étape de compilation.
- Graphiques : [Lightweight Charts](https://github.com/tradingview/lightweight-charts) 4.2.0 de TradingView (licence Apache 2.0).
- Thème clair et sombre automatique, interface adaptée au mobile.

## Contribuer

Les suggestions et corrections sont les bienvenues via les *issues* et les *pull requests*.

## Licence

[MIT](LICENSE)

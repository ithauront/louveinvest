# Marché secondaire des SCPI — Louve Invest

Analyse de **Primopierre** : marché, rendement brut, estimation de confrontation et email d’achat récupérable. Bonus inclus : simulation avec coût fixe hypothétique et graphique de rendement.

## Exécution

Node.js **22.19** et npm (`nvm use` si disponible) :

```sh
npm ci
npm run dev
```

Interface : http://127.0.0.1:5173 · API : http://127.0.0.1:3333/api/health.
Démarrage séparé : `npm run dev:web` ou `npm run dev:api`. Aucune clé ni base de données requise. Configuration optionnelle : [`.env.example`](apps/api/.env.example) ; adapter aussi le proxy Vite si le port API change.

```sh
npm run lint
npm run format:check
npm run typecheck
npm test
npm run build
```

**460 tests** : 267 backend et 193 frontend, dont un parcours HTML capturé → API → React → export. Tests hors ligne, complétés par une vérification navigateur de l’API réelle, du clavier, des contrastes et du mobile.

Après build : `npm run start -w @louveinvest/api` et `npm run preview -w @louveinvest/web`. Le preview/déploiement exige un reverse proxy `/api` ; le proxy Vite fourni sert au développement. Scripts dev en syntaxe POSIX, avec polling des fichiers.

## Choix et hypothèses

- Monorepo npm : React/TypeScript/Vite dans `apps/web`, Node/TypeScript/Fastify dans `apps/api`. Backend DDD/Clean Architecture (domaine, application/ports, infrastructure, composition) ; frontend par pages, composants, hooks et services. Calculs financiers exclusivement au serveur.
- Scraping HTML avec fetch/Cheerio/Zod ; cache par SCPI de **30 minutes**, requêtes mutualisées, fallback signalé `stale` seulement avant **deux heures** d’âge total. Cache local au processus ; collecte récente ne signifie pas publication récente.
- Rendement : dividende brut de l’exercice précédent ÷ prix vendeur augmenté de **4,8 % TTC de commission + 5 % de droits**, hors frais fixes. Référence 2026 : **4,56 € brut pour 2025** ; année/source conservées et erreur 503 sans paramètres annuels adaptés.
- Centimes et rapports BigInt ; arrondi half-up en sortie uniquement : coût au centime, rendement à quatre décimales sur coût non arrondi. Convention applicative, faute de règle d’arrondi officielle identifiée.
- Confrontation : volume maximal, déséquilibre éligible minimal, proximité du dernier prix, puis prix le plus bas. Limites inclusives au centime et exécution partielle supposée. Cinq niveaux publics par côté, priorité individuelle inconnue : aucune exécution garantie.
- Bonus : coût fixe total saisi comme **hypothèse**, zéro explicite accepté ; aucune taxe fixe spécifique à la confrontation n’a été confirmée. Courbe limitée à 200 points, bornes incluses. Même avec prix manuel, une référence de marché utilisable est nécessaire.
- Email local : associé conditionnel, édition, copie et TXT. Aucune donnée personnelle transmise à l’API ni persistée. Authentification, paiement, signature et transmission d’ordre sont hors périmètre.

Le parser doit être adapté si la structure HTML change ; il exige un historique présent. Dividende et frais demandent une maintenance lorsque leurs données évoluent. Ajouter une SCPI nécessite un adaptateur enregistré et ses paramètres annuels. [Contrat API et exemples](docs/api.md).

## Sources

Sources vérifiées pendant le développement, les 21–23 octobre 2026 :

- [Page officielle Primopierre](https://www.praemiareim.fr/fr/scpi-primopierre) : marché, carnet, historique et échéances.
- [Rapport annuel 2025](https://www.praemiareim.fr/documents/14836074/14836290/Primopierre+Rapport+Annuel+2025.pdf/32234cef-d9b6-60b3-9ad5-08bfa8420b37?t=1780564491137), page imprimée 6 : dividende brut 4,56 €, distinct de la distribution de 4,40 €.
- [Note d’information](https://www.praemiareim.fr/documents/14836074/14836293/2026+08+01+PRIMOPIERRE+Note+d+information+v1c.pdf/9f7ca363-89d3-c809-5bda-e0990c3bea00?t=1786105513135), pages 20, 22 et 24 : droits, confrontation et commission.
- [Mandat d’achat personne physique](https://www.praemiareim.fr/documents/14836074/1099398036/PRIMOPIERRE%20-%20Mandat%20d'achat%20-%20Personne%20Physique/dc631e45-bbdd-40fa-23b6-9d52b2160104), pages 3, 4 et 6 : modalités, distinction avec les autres transferts et contact. Le brouillon est une demande d’information, pas un canal d’exécution d’ordre.

Interface inspirée du [site Louve Invest](https://www.louveinvest.com/), dont provient le logo. Space Grotesk et Space Mono sont servies localement ; leurs licences sont conservées dans [public/fonts](apps/web/public/fonts).

## Temps et IA

Temps non chronométré : réalisation en plusieurs séances, sans durée rétrospective inventée.
L’IA a assisté analyse, code, tests et présentation. Exemple de contrôle : retenir **4,56 € brut**, pas **4,40 € distribué**, après vérification du rapport annuel ; année et source sont explicites et une autre année n’est jamais réutilisée silencieusement.

Avec une journée supplémentaire : renforcer les fixtures de scraping et l’alerte de changement HTML. Pour la restitution : adaptation à d’autres sociétés de gestion, réutilisation du domaine et mapping vers un mandat PDF.

# Cyclingstats : documentation technique complète

Ce document explique **comment toute l'application fonctionne**, fichier par fichier, et surtout **comment les fichiers fonctionnent ensemble**. Il couvre l'état du projet après les étapes 1 à 3 du plan (commit `8dcd597`). Il ne parle que des fichiers réellement utilisés par l'application.

Convention : les chemins sont relatifs à la racine du projet (`Cyclingstats/`). Quand un nom de fonction est cité, il est dans le fichier indiqué juste avant.

---

## Table des matières

1. [Vue d'ensemble](#1-vue-densemble)
2. [Historique : ce qui a été fait à chaque étape](#2-historique-ce-qui-a-été-fait-à-chaque-étape)
3. [Arborescence et rôle de chaque fichier](#3-arborescence-et-rôle-de-chaque-fichier)
4. [Outillage et configuration](#4-outillage-et-configuration)
5. [Démarrage de l'application (`main.tsx`)](#5-démarrage-de-lapplication)
6. [La fausse API : données, script et MSW](#6-la-fausse-api--données-script-et-msw)
7. [La couche API du front](#7-la-couche-api-du-front)
8. [TanStack Query : les concepts utilisés](#8-tanstack-query--les-concepts-utilisés)
9. [Les filtres dans l'URL](#9-les-filtres-dans-lurl)
10. [Hooks partagés](#10-hooks-partagés)
11. [Bibliothèque utilitaire (`lib/`)](#11-bibliothèque-utilitaire-lib)
12. [Composants partagés](#12-composants-partagés)
13. [Le store Zustand (état UI persisté)](#13-le-store-zustand)
14. [Les écrans, un par un](#14-les-écrans-un-par-un)
15. [Les graphiques et leur liaison](#15-les-graphiques-et-leur-liaison)
16. [Styles, thème clair/sombre, accessibilité](#16-styles-thème-clairsombre-accessibilité)
17. [Les tests](#17-les-tests)
18. [Scénarios de bout en bout](#18-scénarios-de-bout-en-bout)
19. [Points d'attention et limites connues](#19-points-dattention-et-limites-connues)
20. [Ce qui n'est pas encore utilisé](#20-ce-qui-nest-pas-encore-utilisé)
21. [Commandes utiles](#21-commandes-utiles)

---

## 1. Vue d'ensemble

### Ce que c'est

Une application **100 % front-end** (aucun serveur à toi) qui affiche le Tour de France 2026 : étapes, classement général, coureurs, analyses graphiques, comparateur, favoris. Elle sert de vitrine de portfolio pour trois compétences : **consommation d'API**, **gestion d'état**, **UI complexe**.

### La pile technique

| Rôle | Outil | Version installée |
|---|---|---|
| Interface | React | 19.3 |
| Langage | TypeScript (mode strict) | 7.0 |
| Build / serveur de dev | Vite | 8.3 |
| Navigation | React Router (`react-router-dom`) | 7.18 |
| État serveur (requêtes, cache) | TanStack Query | 5.105 |
| État UI persisté | Zustand | 5.0 |
| Fausse API | MSW (Mock Service Worker) | 3.0 |
| Graphiques | Recharts | 3.10 |
| Tests | Vitest + jsdom + Testing Library | 5.0 / 30 / 16 |
| Lint / format | oxlint / Prettier | 1.89 / 3.9 |

### Les trois sortes d'état (le concept central)

Toute l'application repose sur une séparation nette de **trois endroits** où vit l'information. C'est la chose la plus importante à comprendre.

| Sorte d'état | Où il vit | Exemples | Outil |
|---|---|---|---|
| **État serveur** : données qui viennent de l'API | Cache de TanStack Query, en mémoire | liste des coureurs, classement, étapes | `useQuery` |
| **État d'URL** : ce qui décrit « la vue actuelle » | La query string (`?type=mountain&page=2`) | filtres, tri, page, coureur sélectionné | `useSearchParams` via `useUrlFilters` |
| **État UI persistant** : préférences de l'utilisateur | Zustand + `localStorage` | favoris, coureurs comparés, thème | `usePreferences` |

Règle appliquée partout : **on ne copie jamais** une donnée d'un endroit à l'autre. Les filtres ne sont pas dans Zustand (ils sont dans l'URL, donc partageables). Les données de l'API ne sont pas dans Zustand (elles sont dans le cache de Query). Zustand ne stocke que des **identifiants** (`riderId`), jamais les coureurs complets : les données complètes sont retrouvées via le cache.

### Schéma du flux de données

```
                   ┌──────────────────────────────────────────────┐
 data-prep/        │ build_db.py  (Python, exécuté à la main)      │
 build_db.py ────► │ écrit src/mocks/data/db.json                  │
                   └──────────────────────┬───────────────────────┘
                                          │ importé (bundlé) par Vite
                                          ▼
   Navigateur   ┌──────────────────────────────────────────────────┐
                │ Service Worker MSW (public/mockServiceWorker.js)   │
                │ intercepte les fetch('/api/...')                   │
                │ + handlers.ts : répond depuis db.json              │
                └──────────────────────┬───────────────────────────┘
                                          ▲  fetch('/api/...')
                                          │
        src/api/client.ts  (apiGet / apiGetList, ApiError)
                                          ▲
        src/api/{queries,riders,stages,gc}.ts  (hooks TanStack Query)
                                          ▲  cache partagé (QueryClient)
        ┌─────────────────────────────────┴─────────────────────────┐
        │ Écrans (features/*)  ◄─── URL (useUrlFilters)              │
        │                      ◄─── Zustand (favoris, comparés, thème)│
        └────────────────────────────────────────────────────────────┘
```

**Point clé :** du point de vue du code React, l'API est « vraie » : on fait un `fetch('/api/stages')` et on reçoit du JSON avec des en-têtes. C'est le Service Worker MSW qui répond à la place d'un serveur. Si un jour tu écris un vrai back-end, **seul `src/mocks/` disparaît** ; le reste ne change pas.

---

## 2. Historique : ce qui a été fait à chaque étape

Le plan du brief (`cycling-dashboard-brief.md`) comporte 5 étapes. Voici l'état et les commits.

| Étape du plan | Contenu | Commit |
|---|---|---|
| **1. Mise en place** | Projet Vite + React + TypeScript strict, dépendances, structure de dossiers, ESLint-équivalent (oxlint), Vitest, MSW initialisé, page Étapes minimale | `375ae1d` |
| (réglage) | `.claude/` ajouté à `.gitignore` | `3743765` |
| **1 (suite)** | Intégration du jeu de données `db.json` (Tour 2026) et des types ; handlers MSW qui imitent json-server ; script `build_db.py` rangé dans `data-prep/` | `344169c` |
| **2. Écrans Tour de France** | Liste des étapes, détail d'une étape, classement général ; filtres dans l'URL ; skeletons, erreurs, états vides ; thème sombre ; premiers tests | `283de51` |
| **3. Graphiques, comparateur, favoris** | Page Coureurs (pagination et recherche par l'API), tableau de bord à graphiques liés, comparateur de 2 à 4 coureurs, store Zustand persisté, sélecteur de thème | `8dcd597` |
| 4. GPX, Open-Meteo, carte | **Pas encore fait** | n/a |
| 5. Tests, accessibilité, README, déploiement | **Pas encore fait** (quelques tests existent déjà) | n/a |

Note sur le jeu de données : le brief parlait du Tour **2024** ; le fichier fourni (`datas/`) concerne le Tour **2026**. L'application utilise donc le Tour 2026 partout (titre du header, types, etc.).

---

## 3. Arborescence et rôle de chaque fichier

```
Cyclingstats/
├─ index.html                      Page HTML unique (point d'entrée du navigateur)
├─ package.json                    Dépendances, scripts npm, config MSW
├─ vite.config.ts                  Config Vite + alias "@" + config Vitest
├─ tsconfig.json                   Chef d'orchestre TypeScript (références)
├─ tsconfig.app.json               Config TypeScript du code de src/ (strict)
├─ tsconfig.node.json              Config TypeScript de vite.config.ts
├─ .oxlintrc.json                  Règles du linter
├─ .prettierrc                     Règles de formatage
├─ .gitignore                      Fichiers ignorés par git
├─ public/
│  ├─ favicon.svg                  Icône d'onglet (référencée par index.html)
│  └─ mockServiceWorker.js         Service Worker MSW (généré, ne pas modifier)
├─ data-prep/
│  ├─ build_db.py                  Script Python qui génère db.json
│  └─ README.md                    Documentation du jeu de données et de ses limites
└─ src/
   ├─ main.tsx                     Démarrage : MSW, QueryClient, Router, rendu React
   ├─ App.tsx                      Header, navigation, table des routes
   ├─ index.css                    Tous les styles + variables de thème
   ├─ api/
   │  ├─ types.ts                  Types TypeScript de toutes les réponses d'API
   │  ├─ client.ts                 fetch typé : apiGet, apiGetList, ApiError
   │  ├─ queries.ts                Définitions de requêtes « statiques » partagées
   │  ├─ riders.ts                 Hooks coureurs et équipes
   │  ├─ stages.ts                 Hooks étapes
   │  └─ gc.ts                     Hook classement général
   ├─ mocks/
   │  ├─ browser.ts                Crée le worker MSW
   │  ├─ handlers.ts               Les « routes » de la fausse API
   │  └─ data/db.json              Les données du Tour 2026
   ├─ hooks/
   │  ├─ useUrlFilters.ts          Lit/écrit des filtres dans l'URL
   │  ├─ useDebouncedValue.ts      Retarde une valeur (debounce)
   │  └─ useDebouncedUrlSearch.ts  Champ de recherche → URL avec debounce
   ├─ lib/
   │  ├─ params.ts                 Parsing sûr et sérialisation de query string
   │  └─ format.ts                 Dates, km, durées, normalisation de texte
   ├─ store/
   │  └─ preferences.ts            Store Zustand (favoris, comparés, thème)
   ├─ components/
   │  ├─ QueryState.tsx            ErrorState, EmptyState, TableSkeleton
   │  ├─ Pagination.tsx            Boutons Précédent / Suivant
   │  ├─ ChartCard.tsx             Cadre de graphique + tableau de données
   │  └─ ThemeSelect.tsx           Sélecteur Système / Clair / Sombre
   ├─ routes/
   │  └─ NotFoundPage.tsx          Page 404
   ├─ features/
   │  ├─ stages/    labels.ts · filters.ts · StagesPage.tsx · StageDetailPage.tsx
   │  ├─ gc/        filters.ts · GcPage.tsx
   │  ├─ riders/    filters.ts · stats.ts · useRiderStats.ts · RiderActions.tsx · RidersPage.tsx
   │  ├─ dashboard/ RiderBarChart.tsx · DashboardPage.tsx
   │  ├─ compare/   ComparePage.tsx
   │  └─ favorites/ FavoritesPage.tsx
   └─ test/setup.ts                Initialisation des tests
```

Les fichiers de test (`*.test.ts`) sont à côté du code qu'ils testent (voir §17).

---

## 4. Outillage et configuration

### `package.json`

- `"type": "module"` : tout le projet utilise les modules ES (`import`/`export`).
- Scripts :
  - `npm run dev` : serveur de dev Vite (rechargement à chaud). C'est ce qu'il faut lancer pour utiliser l'app.
  - `npm run build` : `tsc -b && vite build`. D'abord la vérification de types (le build échoue s'il y a une erreur TypeScript), puis la production du dossier `dist/`.
  - `npm run lint` : oxlint.
  - `npm run format` : Prettier sur `src/`.
  - `npm test` : Vitest en mode « watch » (relance à chaque modification). Pour une exécution unique : `npx vitest run`.
  - `npm run typecheck` : `tsc -b` seul.
  - `npm run preview` : sert le dossier `dist/` pour tester le build.
- Section `"msw": { "workerDirectory": ["public"] }` : indique à MSW où est le fichier du Service Worker, pour qu'il le mette à jour lors des montées de version.

### `vite.config.ts`

```ts
import { defineConfig } from 'vitest/config'   // et non 'vite' : permet d'ajouter la clé "test"
export default defineConfig({
  plugins: [react()],                           // transformation JSX + fast refresh
  resolve: { alias: { '@': <chemin absolu de src> } },
  test: { environment: 'jsdom', globals: true, setupFiles: ['./src/test/setup.ts'] },
})
```

- **L'alias `@`** : `import x from '@/api/client'` veut dire `src/api/client`. Il évite les `../../../`. Il est déclaré **deux fois** car deux outils le lisent : Vite (ici, pour le build et les tests) et TypeScript (`paths` dans `tsconfig.app.json`, pour la vérification de types). Si l'un des deux manque, soit l'éditeur se plaint, soit le build échoue.
- **`environment: 'jsdom'`** : les tests s'exécutent dans un faux navigateur (DOM simulé), car Node n'a pas de `document`.
- **`globals: true`** : `describe`, `it`, `expect`, `beforeEach` sont disponibles sans import. C'est pour ça que `tsconfig.app.json` contient `"types": ["vite/client", "vitest/globals"]` : TypeScript doit connaître ces globales.
- **`setupFiles`** : `src/test/setup.ts` est exécuté avant chaque fichier de test.

### `tsconfig.json`, `tsconfig.app.json`, `tsconfig.node.json`

`tsconfig.json` ne contient aucune option : il **référence** les deux autres (`tsc -b` signifie « build mode » : il compile les projets référencés).

`tsconfig.app.json` s'applique à `src/` et active :

| Option | Effet concret |
|---|---|
| `strict: true` | Active toutes les vérifications strictes (null, types implicites…). |
| `noUncheckedIndexedAccess` | `tableau[0]` a le type `T \| undefined`, pas `T`. Oblige à gérer le cas vide. C'est pour ça que tu vois `METRICS[1]!` ou `data[index]` suivi d'un `if`. |
| `noUnusedLocals`, `noUnusedParameters` | Erreur si une variable/paramètre n'est pas utilisé. |
| `verbatimModuleSyntax` | Les imports de types doivent s'écrire `import type { X }`. |
| `erasableSyntaxOnly` | Interdit les syntaxes TypeScript qui produisent du code (`enum`, `namespace`…). Seuls les types sont autorisés : ils disparaissent à la compilation. |
| `resolveJsonModule` | Permet `import db from './data/db.json'`, avec types déduits du JSON. |
| `paths: { "@/*": ["./src/*"] }` | L'alias `@` côté TypeScript. |
| `jsx: react-jsx` | Pas besoin d'écrire `import React` dans chaque fichier. |
| `moduleResolution: bundler` + `allowImportingTsExtensions` | Résolution des imports à la manière de Vite. |
| `noEmit` | TypeScript ne produit pas de JS : il ne fait que vérifier. C'est Vite qui compile. |

`tsconfig.node.json` ne couvre que `vite.config.ts` (qui s'exécute dans Node, pas dans le navigateur).

### `.oxlintrc.json`

Linter oxlint avec les greffons `react`, `typescript`, `oxc`. Deux règles explicites : `react/rules-of-hooks` (erreur : les hooks ne s'appellent jamais dans une condition ni après un `return` anticipé) et `react/only-export-components` (avertissement, utile au rechargement à chaud).

### `.prettierrc`

`{ "semi": false, "singleQuote": true }` : pas de point-virgule, apostrophes simples.

### `.gitignore`

Ignore `node_modules`, `dist`, les logs, les dossiers d'éditeur, et `.claude/` (ajouté au commit `3743765`).

### `index.html`

Seule page HTML. Contient `<div id="root">` (là où React s'insère) et `<script type="module" src="/src/main.tsx">` (lance l'appli). `lang="fr"` aide les lecteurs d'écran à prononcer correctement le texte. `<title>Cyclingstats</title>`.

### `public/`

Tout ce qui est dans `public/` est servi tel quel à la racine du site (`/favicon.svg`, `/mockServiceWorker.js`).

- `favicon.svg` : icône d'onglet.
- `mockServiceWorker.js` : généré par la commande `npx msw init public`. **Ne pas le modifier à la main.** Il s'enregistre dans le navigateur comme Service Worker (un script qui s'exécute à part de la page et peut intercepter les requêtes réseau).

---

## 5. Démarrage de l'application

Fichier : `src/main.tsx`. L'ordre des opérations est important.

```ts
const queryClient = new QueryClient({ defaultOptions: { queries: { retry: ... } } })

async function enableMocking() {
  const { worker } = await import('./mocks/browser')   // import dynamique
  await worker.start()                                  // enregistre le Service Worker
}

enableMocking().then(() => {
  createRoot(document.getElementById('root')!).render(
    <StrictMode><QueryClientProvider client={queryClient}><BrowserRouter><App/></BrowserRouter></QueryClientProvider></StrictMode>
  )
})
```

Étapes à l'exécution :

1. Le navigateur charge `index.html`, puis `main.tsx`.
2. `enableMocking()` charge **dynamiquement** `mocks/browser.ts` (et donc `db.json`, `handlers.ts`) puis démarre le Service Worker. On attend (`await`) qu'il soit prêt.
3. **Seulement ensuite** React est monté. C'est crucial : sans ça, les premières requêtes partiraient avant que le worker soit actif et échoueraient.
4. React est monté avec trois « fournisseurs » imbriqués :
   - `StrictMode` : en développement, React monte/démonte les composants deux fois pour détecter les effets de bord impurs. **C'est pourquoi tu vois parfois chaque requête réseau en double dans les outils de développement** (la 1re est annulée). Cela n'arrive pas en production.
   - `QueryClientProvider` : met le cache de requêtes à disposition de tous les composants.
   - `BrowserRouter` : active le routeur (URL « propres » sans `#`).

### La règle de `retry`

```ts
retry: (failureCount, error) =>
  !(error instanceof ApiError && error.status < 500) && failureCount < 3
```

Par défaut TanStack Query réessaie 3 fois **toute** requête en échec, avec un délai croissant. Pour une erreur 4xx (ex. 404 « étape inexistante »), réessayer ne servirait à rien et l'écran resterait en « Chargement… » plusieurs secondes. Donc : si c'est une `ApiError` de statut < 500, **zéro retry** ; sinon jusqu'à 3.

> `retry` est volontairement dans `main.tsx`, pas dans chaque hook : c'est une politique globale.

Remarque : le mock est actif **aussi en production** (build déployé). C'est voulu : la démo en ligne doit fonctionner sans back-end.

---

## 6. La fausse API : données, script et MSW

### 6.1 `data-prep/build_db.py` : la fabrique de données

Script Python **autonome**, jamais exécuté par l'application. Tu le lances à la main quand tu veux régénérer les données :

```bash
python3 data-prep/build_db.py
```

Il écrit `src/mocks/data/db.json` (chemin calculé relativement au script : `Path(__file__).resolve().parent.parent / "src" / "mocks" / "data" / "db.json"`).

Structure du script (de haut en bas) :

1. **Utilitaires**
   - `slugify(name)` : transforme « Tadej Pogačar » en `tadej-pogacar` (suppression des accents via `unicodedata`, table `SPECIAL` pour `ø`, `æ`, `ł`, `ß`). C'est la fonction qui fabrique **tous les identifiants** de coureurs et d'équipes.
   - `to_seconds("1:02:23")` → `3743`. Convertit un temps en secondes (gère `m:ss`, `h:mm:ss` et plus de 24 h cumulées comme `73:56:26`).
2. **`TEAMS`** : 23 équipes (code court → nom, catégorie). `TEAM_ID` en déduit l'identifiant via `slugify`.
3. **`GC_RAW`** : le classement général final sous forme de texte brut, une ligne par coureur : `rang|nom|nationalité|code équipe|temps ou écart`.
4. **`ABANDONS`** : 5 coureurs ayant abandonné (nom, nationalité, équipe, étape, raison).
5. **Construction des collections** :
   - Pour chaque ligne de `GC_RAW` : crée un coureur (`status: "finished"`) et une entrée de classement. Le 1er porte le temps total ; les suivants portent un **écart** (`gap`, `gapSeconds`) et `totalSeconds = total du 1er + écart`. Une boucle finale recalcule un champ `time` formaté (`h:mm:ss`) pour tous.
   - Les abandons deviennent des coureurs `status: "abandoned"`, `finalRank: null`.
   - `points`, `mountains` (maillots vert et à pois), `youth` (blanc), `teamClassification` : tops 10 écrits à la main, passés par la fonction `classification()` ou construits dans des boucles similaires.
6. **Étapes** : `STAGES_RAW` (21 lignes), plus des dictionnaires d'enrichissement : `YELLOW` (porteur du maillot jaune à l'issue de chaque étape), `TOP` (podiums partiels vérifiés), `NOTES` (résumé texte), `SHORTENED` (étapes raccourcies : distance d'origine), `SPECIAL_TIMES` (temps du vainqueur).
7. **`gc_lead`** : 5 points d'avance du leader sur son dauphin (après les étapes 6, 11, 12, 18, 21).
8. **`meta`** : informations de l'édition, maillots finaux, `sources`, `dataNotes`.
9. **Validation d'intégrité** (`assert`) : identifiants uniques, 23 équipes, 158 rangs consécutifs, chaque `teamId`/`riderId` référencé existe, distance totale cohérente (à 2 km près). **Si une assertion échoue, le fichier n'est pas écrit.**
10. Écriture de `db.json` (UTF-8, `ensure_ascii=False` pour garder les accents, indentation 2).

> Le script a été vérifié : relancé, il reproduit `db.json` **à l'octet près**.

### 6.2 `src/mocks/data/db.json` : le modèle de données

Un seul objet JSON avec 10 clés. Les **relations se font par identifiants** (comme dans une base relationnelle).

| Clé | Type | Contenu | Clé primaire |
|---|---|---|---|
| `meta` | objet | infos de l'édition, maillots, sources | n/a |
| `teams` | 23 objets | `id`, `code`, `name`, `category` | `id` (slug) |
| `riders` | 163 objets | `id`, `name`, `nationality`, `teamId`, `status`, `finalRank`, + `abandonedOnStage`/`abandonReason` | `id` (slug) |
| `stages` | 21 objets | parcours, distance, type, `winnerRiderId`, `winnerTeamId`, `yellowJerseyRiderId`, `topFinishers`, `notes`… | `id` (= numéro d'étape) |
| `gc` | 158 objets | `rank`, `riderId`, `teamId`, `time`, `totalSeconds`, `gapSeconds`, `gap?` | `id` (= rang) |
| `points` | 10 | maillot vert : `rank`, `riderId`, `teamId`, `points` | `id` |
| `mountains` | 10 | maillot à pois, même forme | `id` |
| `youth` | 10 | maillot blanc | `id` |
| `teamClassification` | 10 | classement par équipes | `id` |
| `gcLead` | 5 | `afterStage`, `leaderId`, `secondId`, `leadSeconds` | `id` |

Relations (flèches = « référence ») :

```
riders.teamId ──► teams.id
gc.riderId ─────► riders.id        gc.teamId ──► teams.id
points/mountains/youth.riderId ──► riders.id
stages.winnerRiderId, stages.yellowJerseyRiderId ──► riders.id
stages.winnerTeamId ──► teams.id   (utilisé seulement pour l'étape 1, contre-la-montre par équipes)
stages.topFinishers[].riderId ──► riders.id
gcLead.leaderId, gcLead.secondId ──► riders.id
```

**Pourquoi des identifiants et pas des objets imbriqués ?** Comme une vraie API REST : chaque ressource est servie séparément. Le front fait lui-même la « jointure » (voir §7 et §14). C'est précisément l'exercice de consommation d'API que le projet veut démontrer.

Particularités des données à connaître :
- Les **temps** : seul le 1er du `gc` a un temps absolu dans la source ; les autres ont un écart. `totalSeconds` est calculé pour tous ; `time` est reformaté pour tous.
- **Étape 1** : `winnerRiderId` est `null` (contre-la-montre par équipes) ; le vainqueur est dans `winnerTeamId`.
- `riders` ne contient que 163 coureurs sur 184 partants (158 arrivants + 5 abandons connus).
- **Pas de résultats étape par étape** : `topFinishers` ne contient que les positions vérifiées, souvent un podium partiel ou rien.

### 6.3 `src/mocks/browser.ts`

```ts
import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
export const worker = setupWorker(...handlers)
```

Crée l'objet `worker` à partir des handlers. `main.tsx` appelle `worker.start()`.

### 6.4 `src/mocks/handlers.ts` : le « serveur »

C'est un faux serveur qui **imite json-server 0.17** (l'outil que ton `README` de données mentionnait) pour qu'un vrai remplacement futur soit transparent.

**Trois handlers**, dans cet ordre (l'ordre compte, MSW prend le premier qui correspond) :

| Route | Rôle |
|---|---|
| `GET /api/meta` | renvoie `db.meta` (objet, pas liste) |
| `GET /api/:collection` | liste filtrée/triée/paginée d'une collection |
| `GET /api/:collection/:id` | un élément par id, ou 404 |

`/api/meta` est déclaré avant `/api/:collection` pour ne pas être capturé par la route générique. `isCollection(name)` refuse `meta` et tout nom qui n'est pas un tableau dans `db` (→ réponse 404).

Chaque handler appelle `await delay()` de MSW : un **délai réaliste** (quelques centaines de ms dans le navigateur) pour que les skeletons de chargement soient visibles, comme avec un vrai réseau.

**`queryRows(rows, params)`** applique, dans cet ordre :

1. **Filtres d'égalité** : tout paramètre qui n'est pas réservé (`q`, `_sort`, `_order`, `_page`, `_limit`) filtre par `String(row[key]) === value`. Exemple : `?teamId=lidl-trek&nationality=FRA`.
2. **Recherche plein texte `q`** : la ligne entière est convertie en JSON puis comparée en **minuscules sans accents** (via `normalizeText` de `lib/format.ts`). Donc `q=pogacar` trouve « Pogačar », mais aussi « UAE » si on cherche `uae` (la recherche porte sur tous les champs, y compris `teamId` et `nationality`).
3. **Tri** `_sort` / `_order` : chaînes comparées par `localeCompare(…, 'fr')`, nombres par soustraction. `desc` inverse le sens.
4. **Total** : calculé **avant** la pagination (c'est le nombre total d'éléments correspondant aux filtres).
5. **Pagination** : `_page` (à partir de 1) et `_limit`. Si `_page` est donné sans `_limit`, la taille par défaut est 10. Sans `_page`, `_limit` coupe simplement les premiers éléments.

La réponse est `HttpResponse.json(rows, { headers: { 'X-Total-Count': String(total) } })` : **le corps est un simple tableau** et le total est dans un en-tête HTTP, exactement comme json-server. C'est `apiGetList` (§7) qui lit cet en-tête.

**Limites volontaires** : pas de `_expand` (jointures serveur), pas d'opérateurs `_gte`/`_like`. Les jointures se font côté front.

> **Couplage à noter** : `handlers.ts` importe `normalizeText` depuis `@/lib/format` (du code « front »). Acceptable pour un mock ; un vrai serveur aurait sa propre logique.

---

## 7. La couche API du front

Principe : **aucun composant ne fait de `fetch` directement.** Tout passe par `src/api/`.

### 7.1 `src/api/types.ts`

Types TypeScript de **chaque réponse** : `Team`, `Rider`, `Stage`, `StageFinisher`, `GcEntry`, `PointsEntry`, `YouthEntry`, `TeamClassificationEntry`, `GcLead`, `TourMeta`, et le type union `StageType` (`'team-time-trial' | 'individual-time-trial' | 'flat' | 'hilly' | 'mountain'`). Plus un type utilitaire :

```ts
export interface ListResult<T> { items: T[]; total: number }
```

`ListResult` est ce que renvoie `apiGetList` : la liste + le total (venu de `X-Total-Count`).

**Attention** : ces types **décrivent** le JSON mais ne le **vérifient pas** à l'exécution. `response.json()` renvoie « n'importe quoi » que le code déclare de tel type (`as T`). Si l'API changeait de forme, TypeScript ne le verrait pas. (Un validateur comme Zod règlerait ça ; c'est une amélioration possible.)

### 7.2 `src/api/client.ts`

Quatre éléments :

- **`ApiError`** : classe d'erreur avec un champ `status` (code HTTP). Permet aux composants et à la règle `retry` de distinguer un 404 d'un 500.
- **`buildUrl(path, params)`** : construit `/api/chemin?a=1&b=2`. **Ignore** les paramètres `undefined` ou `''`, ce qui permet d'écrire `{ type: filters.type }` sans se soucier du cas « pas de filtre ».
- **`request(...)`** (interne) : fait le `fetch`, passe le `signal` d'annulation, et si `!response.ok` lève une `ApiError` avec le statut.
- **`apiGet<T>(path, params?, signal?)`** : renvoie le JSON typé (pour une ressource unique).
- **`apiGetList<T>(path, params?, signal?)`** : renvoie `{ items, total }`. `total` = en-tête `X-Total-Count` ; s'il est absent, retombe sur `items.length`.

Le paramètre **`signal`** (un `AbortSignal`) est le mécanisme d'**annulation de requête** : si TanStack Query décide d'abandonner une requête (le filtre a changé avant la réponse), il « déclenche » le signal et le navigateur coupe le `fetch`. C'est le critère du brief « annulation des requêtes quand un filtre change ». On l'a vu dans les outils réseau : `net::ERR_ABORTED`.

### 7.3 `src/api/queries.ts` : requêtes « statiques » partagées

```ts
function staticList<T>(resource: string, params?: Record<string, string>) {
  return queryOptions({
    queryKey: [resource, 'all'],
    queryFn: ({ signal }) => apiGetList<T>(`/${resource}`, params, signal),
    staleTime: Infinity,
  })
}
export const ridersQuery = staticList<Rider>('riders')
export const teamsQuery = staticList<Team>('teams')
export const gcQuery = staticList<GcEntry>('gc', { _sort: 'rank' })
export const pointsQuery / mountainsQuery / youthQuery / gcLeadQuery / allStagesQuery
```

- `queryOptions(...)` est un utilitaire TanStack qui **regroupe clé + fonction + options** dans un objet réutilisable et correctement typé. On peut ensuite l'utiliser dans `useQuery(...)`, dans `useQueries([...])`, ou pour du préchargement.
- **`staleTime: Infinity`** : les données sont figées, donc elles ne deviennent **jamais périmées** : une fois chargées, TanStack Query ne les re-télécharge plus pendant la session (sauf rechargement de page).
- `queryKey: [resource, 'all']` : **identité** de la requête dans le cache (voir §8). `['riders','all']` est la liste complète des coureurs. Comme plusieurs écrans utilisent la **même clé**, la liste n'est téléchargée **qu'une fois**.

### 7.4 `src/api/riders.ts`

- `byId(items)` (interne) : transforme un tableau en `Map` indexée par `id`.
- **`useRidersById()`** et **`useTeamsById()`** : `useQuery({ ...ridersQuery, select: (result) => byId(result.items) })`. Ils réutilisent la requête de `queries.ts` (même clé = même cache) et appliquent `select` pour **transformer le résultat** en `Map<id, Rider>`. C'est ce qui permet la « jointure » côté front : `riders.data.get('tadej-pogacar')`.
- **`useRidersPage(query)`** : requête **paginée et filtrée côté API** pour l'écran Coureurs. Clé : `['riders', 'page', query]` (chaque combinaison de filtres a son entrée de cache). Paramètres envoyés : `q`, `teamId`, `nationality`, `_sort: 'name'`, `_page`, `_limit: 20`. Utilise `placeholderData: keepPreviousData` (voir §8).
- `RIDERS_PAGE_SIZE = 20`, et le type `RidersPageQuery` (`q`, `team?`, `nationality?`, `page`).

### 7.5 `src/api/stages.ts`

- **`useStages(query)`** : liste des étapes, avec filtre `type`, tri `sort`/`order`. Clé `['stages', query]`. `placeholderData: keepPreviousData`.
- **`useStage(id)`** : une étape. Clé `['stages', 'detail', id]`. Appelle `apiGet('/stages/${id}')` : une 404 produit une `ApiError` de statut 404.

### 7.6 `src/api/gc.ts`

`useGc()` = `useQuery(gcQuery)`. Une ligne : c'est juste un nom pratique.

### 7.7 Quelle clé de cache pour quoi ?

| Clé | Utilisée par | Contenu |
|---|---|---|
| `['riders','all']` | `useRidersById`, `useRiderStats` | les 163 coureurs |
| `['teams','all']` | `useTeamsById`, `useRiderStats` | les 23 équipes |
| `['gc','all']` | `useGc`, `useRiderStats` | classement général |
| `['points','all']`, `['mountains','all']`, `['youth','all']` | `useRiderStats` | tops 10 |
| `['gcLead','all']` | `DashboardPage` | 5 points d'avance |
| `['stages','all']` | `useRiderStats` | les 21 étapes (non filtrées) |
| `['stages', {type,sort,order}]` | `StagesPage` | étapes filtrées/triées |
| `['stages','detail',id]` | `StageDetailPage` | une étape |
| `['riders','page',{q,team,nationality,page}]` | `RidersPage` | une page de coureurs |

---

## 8. TanStack Query : les concepts utilisés

Pour bien comprendre le code, voici le vocabulaire.

- **`useQuery`** renvoie un objet d'état : `data`, `isPending` (aucune donnée encore), `isError` / `error`, `isFetching` (une requête est en cours, même si on a déjà des données), `refetch()`.
- **Clé de requête (`queryKey`)** : un tableau qui **identifie** la requête dans le cache. Deux composants qui utilisent la même clé **partagent** les données et ne déclenchent qu'une seule requête. Changer un élément de la clé = autre entrée de cache = nouvelle requête.
- **`staleTime`** : durée pendant laquelle une donnée est considérée « fraîche ». Ici `Infinity` (données figées).
- **`placeholderData: keepPreviousData`** : pendant qu'on charge la page 2, on **continue d'afficher la page 1** au lieu de revenir à un écran de chargement. L'écran signale l'attente via `aria-busy` et une légère transparence (`.table-wrap[aria-busy='true']`).
- **`select`** : transforme la donnée **à la lecture** sans modifier le cache (ici : tableau → `Map`).
- **`useQueries`** : lance **plusieurs requêtes en parallèle** et permet de les combiner (`combine`). Utilisé par `useRiderStats` pour les 7 requêtes simultanées.
- **Annulation** : le `signal` passé à `queryFn` (voir §7.2).
- **Retry** : voir §5.

> Sans TanStack Query il faudrait écrire à la main : le cache, l'état de chargement, l'état d'erreur, l'annulation, le partage entre composants, le re-essai. Ici tout vient du hook.

---

## 9. Les filtres dans l'URL

C'est le mécanisme qui rend chaque vue **partageable par lien** (`/stages?type=mountain&sort=distanceKm&order=desc`).

### 9.1 L'idée : l'URL est la source de vérité

Il n'y a **pas** de `useState` pour les filtres. L'état est **dérivé** de la query string à chaque rendu. Changer un filtre = modifier l'URL ; React Router re-rend ; les filtres sont relus depuis la nouvelle URL. Conséquences positives : lien partageable, bouton « retour » cohérent, rechargement de page qui conserve la vue.

### 9.2 `src/lib/params.ts` : les briques

| Fonction | Rôle |
|---|---|
| `oneOf(value, allowed)` | Renvoie `value` s'il est dans la liste autorisée, sinon `undefined`. **Protège contre les URL fantaisistes** : `?type=cobbles` est ignoré. Le type de retour est la **union des valeurs autorisées** (pas juste `string`). |
| `positiveInt(value, fallback)` | Entier ≥ 1, sinon `fallback`. `?page=-2`, `?page=abc` → 1. |
| `compactParams(values, defaults)` | Construit une `URLSearchParams` en **omettant** les valeurs `undefined`, vides (`''`) ou **égales à leur défaut**. Résultat : une URL courte (`/stages` plutôt que `/stages?sort=number&order=asc`). |

### 9.3 `src/hooks/useUrlFilters.ts` : le hook générique

```ts
export function useUrlFilters<T>(parse: (p: URLSearchParams) => T, serialize: (f: T) => URLSearchParams) {
  const [params, setParams] = useSearchParams()
  const filters = useMemo(() => parse(params), [params, parse])
  const update = useCallback((patch: Partial<T>) => {
    setParams((prev) => serialize({ ...parse(prev), ...patch }), { replace: true })
  }, [setParams, parse, serialize])
  return [filters, update] as const
}
```

Il est **générique** : chaque écran fournit sa paire `parse` / `serialize`.

Déroulé d'un `update({ type: 'mountain' })` :
1. `parse(prev)` relit les filtres actuels depuis l'URL.
2. `{ ...filtresActuels, ...patch }` fusionne le changement. Un `patch` à `undefined` **efface** le filtre (c'est ainsi que « Tous » fonctionne).
3. `serialize(...)` fabrique la nouvelle query string (défauts omis).
4. `setParams(..., { replace: true })` met à jour l'URL **en remplaçant** l'entrée d'historique (sinon chaque frappe/clic créerait une entrée « retour »).

> **Important** : `parse` et `serialize` doivent être des **fonctions stables** (déclarées au niveau du module, pas dans le composant), sinon `useMemo` / `useCallback` se recalculent à chaque rendu. C'est le cas partout ici.
>
> **Effet de bord à connaître** : `serialize` reconstruit toute la query string à partir des seuls filtres connus. Tout autre paramètre présent dans l'URL de **cette page** serait perdu à la première mise à jour. Pour l'instant aucune page filtrable n'a d'autre paramètre.

### 9.4 Les trois paires `parse` / `serialize`

**Étapes** : `src/features/stages/filters.ts`
- Filtres : `type?` (un des 5 `StageType`), `sort` (`number` | `distanceKm`, défaut `number`), `order` (`asc` | `desc`, défaut `asc`).
- `STAGE_SORTS` est un `as const` pour que `StageSort` soit une union littérale.

**Classement général** : `src/features/gc/filters.ts`
- Filtres : `q` (texte), `team?`, `nationality?`, `sort` (`rank` | `name`), `order`, `page`.
- Contient aussi `GcRow` (une ligne du tableau : classement + nom + nationalité + équipe, déjà « joints ») et **`filterGcRows(rows, filters)`** : filtre par équipe, nationalité et nom (via `normalizeText`, donc insensible aux accents et à la casse), puis trie (`rank` ou `name` avec `localeCompare('fr')`, sens selon `order`). **C'est du filtrage côté client** (voir §14.3).

**Coureurs** : `src/features/riders/filters.ts`
- Filtres : `q`, `team?`, `nationality?`, `page`. Ici le filtrage se fait **côté API** (voir §14.4), donc le type de filtre est directement `RidersPageQuery` de `api/riders.ts`.

### 9.5 Le paramètre de la page Analyse

`DashboardPage` n'utilise pas `useUrlFilters` : il lit/écrit simplement un paramètre `?rider=<id>` avec `useSearchParams` (voir §14.5). Ici le changement **ajoute** une entrée d'historique (comportement voulu : on peut revenir au coureur précédent).

---

## 10. Hooks partagés

### `src/hooks/useDebouncedValue.ts`

```ts
export function useDebouncedValue<T>(value: T, delayMs = 300) {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delayMs)
    return () => clearTimeout(id)       // nettoyage : annule le minuteur précédent
  }, [value, delayMs])
  return debounced
}
```

À chaque changement de `value`, un minuteur de 300 ms démarre ; s'il y a un nouveau changement avant la fin, le minuteur est annulé (fonction de nettoyage de l'effet). `debounced` ne change donc **que lorsque l'utilisateur cesse de taper** pendant 300 ms.

### `src/hooks/useDebouncedUrlSearch.ts`

Combine tout pour un champ de recherche :

```ts
export function useDebouncedUrlSearch(urlValue: string, push: (value: string) => void) {
  const [search, setSearch] = useState(urlValue)        // ce que l'utilisateur voit dans le champ
  const debounced = useDebouncedValue(search)           // version retardée
  const lastPushed = useRef(urlValue)                    // dernière valeur envoyée à l'URL
  useEffect(() => {
    if (debounced === lastPushed.current) return        // rien de nouveau : on ne fait rien
    lastPushed.current = debounced
    push(debounced)                                      // met à jour l'URL (et remet page=1)
  }, [debounced, push])
  return [search, setSearch] as const
}
```

Le champ est **réactif** (la saisie s'affiche instantanément via l'état local) mais l'URL (et donc la requête / le filtrage) n'est mise à jour qu'après la pause. Le `useRef` sert à **ne pas re-pousser** une valeur déjà poussée (évite une boucle et un déclenchement inutile au montage).

`push` doit être stable : les pages le créent avec `useCallback`.

---

## 11. Bibliothèque utilitaire (`lib/`)

### `src/lib/format.ts`

| Fonction | Rôle |
|---|---|
| `formatDate(iso)` | `"2026-07-04"` → `"sam. 4 juil."`. Utilise `Intl.DateTimeFormat('fr-FR')`. On ajoute `T12:00:00` à la date avant de créer l'objet `Date` pour éviter qu'un **décalage de fuseau horaire** ne fasse tomber la date sur la veille. |
| `formatKm(km)` | `205.8` → `"205,8 km"` (`Intl.NumberFormat('fr-FR')`, 1 décimale max). |
| `normalizeText(text)` | Minuscules **sans accents** : `normalize('NFKD')` décompose « č » en « c » + accent, puis la regex `/[̀-ͯ]/g` supprime les accents. Utilisé pour la recherche (« pogacar » trouve « Pogačar »), par l'écran Classement **et** par le mock d'API. |
| `formatDuration(totalSeconds)` | `150` → `"2 min 30 s"` ; `3743` → `"1 h 02 min 23 s"`. |

Les `Intl.*` sont instanciés **une fois** au niveau du module (création coûteuse) et réutilisés.

---

## 12. Composants partagés

### `src/components/QueryState.tsx`

Trois composants pour les **états d'une requête** (critère du brief : skeletons, erreurs, états vides) :

- **`ErrorState({ error, onRetry })`** : `role="alert"` (annoncé par les lecteurs d'écran), message + bouton « Réessayer » qui appelle `onRetry` (en pratique `refetch`).
- **`EmptyState({ children })`** : message neutre quand il n'y a aucun résultat.
- **`TableSkeleton({ rows, columns })`** : grille de barres grises animées (`.skeleton`) qui imite un tableau pendant le chargement. `aria-busy="true"` + `aria-label="Chargement"`.

Chaque écran suit le même schéma ternaire : `isPending → squelette`, `isError → ErrorState`, `liste vide → EmptyState`, sinon `tableau`.

### `src/components/Pagination.tsx`

Props : `page`, `pageCount`, `onChange`. Si `pageCount <= 1` il ne rend **rien**. Sinon deux boutons (désactivés aux extrémités) et « Page X sur Y » dans un `aria-live="polite"` (annoncé quand il change).

### `src/components/ChartCard.tsx`

Cadre standard d'un graphique : `<figure>` avec titre (`<h2>`), description optionnelle, le graphique (`children`), et un **`<details>` « Voir les données »** contenant un tableau des **mêmes données**. Raison : l'information ne doit jamais passer **uniquement** par un graphique (accessibilité : lecteurs d'écran, daltoniens). La prop `table` reçoit `{ columns, rows }`.

### `src/components/ThemeSelect.tsx`

Un `<select>` Système / Clair / Sombre branché sur le store (`theme`, `setTheme`). Un `useEffect` applique le choix sur la balise `<html>` :

```ts
if (theme === 'system') delete root.dataset.theme
else root.dataset.theme = theme      // → <html data-theme="dark">
```

Les styles réagissent à cet attribut (voir §16). Le composant est monté dans le header (toujours présent), donc le thème s'applique sur toutes les pages.

### `src/routes/NotFoundPage.tsx`

Une ligne : « Page introuvable. ». Affichée par la route `*`.

---

## 13. Le store Zustand

Fichier : `src/store/preferences.ts`. **Un seul store** pour tout l'état UI persistant.

### Forme de l'état

```ts
interface PreferencesState {
  favorites: string[]                 // identifiants de coureurs
  compared: ComparedRider[]           // { id, slot } , 0 à 4 éléments
  theme: 'system' | 'light' | 'dark'
  toggleFavorite(riderId); toggleCompared(riderId); clearCompared(); setTheme(theme)
}
```

### Persistance

Le store est entouré du middleware `persist` :

```ts
persist(creator, {
  name: 'cyclingstats-preferences',       // clé dans localStorage
  version: 1,
  partialize: ({ favorites, compared, theme }) => ({ favorites, compared, theme }),
})
```

- Chaque modification est **sérialisée en JSON dans `localStorage`** sous la clé `cyclingstats-preferences`.
- Au chargement de l'application, le store est **réhydraté** depuis `localStorage`. Les favoris survivent à un rechargement.
- `partialize` choisit ce qui est sauvegardé : **uniquement les données**, pas les fonctions.
- `version: 1` : si la forme de l'état change un jour, on augmente la version et on ajoute une fonction de migration (non nécessaire pour l'instant).

### Les actions

- **`toggleFavorite(id)`** : ajoute l'id s'il n'y est pas, le retire sinon. Immuable (on crée un nouveau tableau).
- **`toggleCompared(id)`** :
  - s'il est déjà comparé : le retire ;
  - sinon, si 4 coureurs sont déjà comparés (`MAX_COMPARED`) : **ne fait rien** (renvoie le même état) ;
  - sinon l'ajoute avec un **`slot`** : le plus petit numéro libre parmi 0, 1, 2, 3.
- **`clearCompared()`** et **`setTheme()`** : triviaux.

### Pourquoi le `slot` ?

Le `slot` (0 à 3) détermine la **couleur** du coureur dans le comparateur (`--series-1` à `--series-4`). Il est **stocké**, pas déduit de la position dans la liste : si tu as A (bleu), B (orange), C (aqua) et que tu retires A, B et C **gardent leur couleur**. Un nouveau coureur reprend la couleur libérée (bleu). Règle de dataviz : **la couleur suit l'entité, jamais son rang**. Testé dans `preferences.test.ts`.

### Comment les composants l'utilisent

Toujours avec un **sélecteur** :

```ts
const isFavorite = usePreferences((s) => s.favorites.includes(riderId))
```

Le composant ne se re-rend que si **le résultat du sélecteur** change (ici un booléen), pas à chaque modification du store. C'est l'un des atouts de Zustand. Les sélecteurs renvoient des valeurs primitives ou des références stables ; renvoyer un nouvel objet à chaque appel provoquerait des re-rendus en boucle.

---

## 14. Les écrans, un par un

### 14.0 `src/App.tsx` : le squelette

- Un **header** avec le nom, la navigation (`<NavLink>`, qui ajoute `aria-current="page"` au lien actif : c'est ce qui permet de le mettre en évidence en CSS) et le `ThemeSelect`.
- Des **pastilles de compteur** (`Count`) à côté de « Comparateur » et « Favoris », alimentées directement par le store (`compared.length`, `favorites.length`).
- La table des routes (`<Routes>`) :

| Chemin | Écran |
|---|---|
| `/` | redirige vers `/stages` (`<Navigate replace>`) |
| `/stages` | `StagesPage` |
| `/stages/:id` | `StageDetailPage` |
| `/gc` | `GcPage` |
| `/riders` | `RidersPage` |
| `/dashboard` | `DashboardPage` (affiché « Analyse ») |
| `/compare` | `ComparePage` |
| `/favorites` | `FavoritesPage` |
| `*` | `NotFoundPage` |

### 14.1 Étapes : `src/features/stages/StagesPage.tsx`

**Ce qu'il fait** : tableau des 21 étapes avec filtres (type, tri, ordre).

**Fichiers associés** : `filters.ts` (parse/serialize), `labels.ts` (`STAGE_TYPES`, `STAGE_TYPE_LABELS` : traduit `'individual-time-trial'` en « CLM individuel »).

**Fonctionnement** :
1. `useUrlFilters(parseStageFilters, serializeStageFilters)` → `filters` + `setFilters`.
2. `useStages(filters)` : requête `GET /api/stages?_sort=…&_order=…[&type=…]`. **Le filtrage et le tri sont faits par l'API.** Chaque changement de filtre change la clé de requête, donc relance une requête ; l'ancienne, si elle est encore en cours, est annulée.
3. En parallèle `useRidersById()` et `useTeamsById()` pour afficher les **noms** (l'étape ne contient que des identifiants `winnerRiderId`, etc.). Tant qu'ils ne sont pas chargés, on affiche « … » à la place du nom.
4. Colonne « Vainqueur » : si `winnerRiderId` → nom du coureur ; sinon si `winnerTeamId` → nom de l'équipe (cas du contre-la-montre par équipes) ; sinon « — ».
5. Rendu conditionnel : `isPending` → squelette ; `isError` → `ErrorState` ; liste vide → `EmptyState` ; sinon le tableau (avec `aria-busy` pendant un re-chargement et une `<caption>` masquée visuellement pour les lecteurs d'écran).
6. Chaque ligne est un lien vers `/stages/:id`.

### 14.2 Détail d'étape : `src/features/stages/StageDetailPage.tsx`

1. `useParams().id` → `Number(...)`. Un id non numérique donne `NaN` → requête `/stages/NaN` → 404.
2. `useStage(id)` + `useRidersById()` + `useTeamsById()`.
3. **Gestion des erreurs fine** : si l'erreur est une `ApiError` de statut **404** → message « Cette étape n'existe pas. » ; toute autre erreur → `ErrorState` avec « Réessayer ».
4. Affiche : parcours, date, distance (avec « prévue X km » si l'étape a été raccourcie), badge de type, vainqueur, maillot jaune, temps et vitesse si disponibles, **arrivée** (liste ordonnée `<ol>` avec `value={position}` pour que la numérotation corresponde au vrai classement même si seules certaines positions sont connues) et résumé (`notes`).
5. Si `topFinishers` est vide : « Pas de classement individuel vérifié pour cette étape. »

### 14.3 Classement général : `src/features/gc/GcPage.tsx`

**Architecture différente de la page Étapes** : ici le filtrage/tri/pagination est fait **côté client**.

Pourquoi : la ressource `/api/gc` ne contient pas le nom ni la nationalité du coureur (seulement `riderId`), donc l'API ne saurait pas filtrer par nom ou nationalité. On charge donc les 158 lignes **une fois** et on filtre en mémoire.

Déroulé :
1. **Trois requêtes en parallèle** (`useGc`, `useRidersById`, `useTeamsById`).
2. `rows` (`useMemo`) : **jointure côté front**. Pour chaque ligne du `gc`, on retrouve le coureur et l'équipe dans les `Map` et on fabrique un `GcRow` complet. Tant qu'une des trois requêtes n'est pas arrivée, `rows` est vide.
3. Listes d'options : `nationalities` (valeurs distinctes triées, tirées des lignes) et `teamOptions` (équipes triées par nom).
4. `filtered = filterGcRows(rows, filters)` : équipe, nationalité, recherche, tri.
5. **Pagination client** : `PAGE_SIZE = 20`, `pageCount = ceil(filtered.length / 20)`, `page = min(filters.page, pageCount)` (si l'URL demande `page=99`, on retombe sur la dernière page), `pageRows = filtered.slice(...)`.
6. **Recherche** : `useDebouncedUrlSearch(filters.q, pushSearch)`. `pushSearch` = `setFilters({ q, page: 1 })` : une nouvelle recherche **revient à la page 1**. Tous les autres filtres (`team`, `nationality`, `sort`, `order`) font aussi `page: 1`.
7. **États combinés** : `isPending` = l'une des trois est en attente ; `error` = la première erreur trouvée ; `retry` ne relance que celles en erreur.
8. Chaque coureur est un lien vers `/dashboard?rider=<id>`. La colonne « Temps / écart » affiche `+ gap` (ou le temps total pour le 1er).

### 14.4 Coureurs : `src/features/riders/RidersPage.tsx`

**Architecture opposée à la page Classement** : ici **l'API** fait recherche et pagination.

1. `useUrlFilters(parseRiderFilters, serializeRiderFilters)` ; recherche avec debounce comme ci-dessus.
2. `useRidersPage(filters)` : `GET /api/riders?q=…&teamId=…&nationality=…&_sort=name&_page=2&_limit=20`. Le total vient de `X-Total-Count`.
3. `pageCount = ceil(total / 20)` (calculé à partir du **total renvoyé par l'API**, pas de la longueur de la liste).
4. `useTeamsById` fournit les noms d'équipe et les options du menu ; `useRidersById` (la liste complète, requête distincte) fournit l'ensemble des **nationalités** pour le menu déroulant.
5. Colonne « Classement final » : `finalRank`, ou « Abandon (ét. N) ».
6. Chaque ligne a deux boutons (composants de `RiderActions.tsx`) : favori ☆/★ et « Comparer ».

C'est la page qui **démontre** : recherche avec debounce, annulation de requête quand un filtre change, pagination serveur avec total.

### 14.5 Statistiques par coureur : `src/features/riders/stats.ts` et `useRiderStats.ts`

Ces deux fichiers alimentent **Analyse, Comparateur et Favoris**.

**`stats.ts` : `buildRiderStats(sources)`** est une **fonction pure** (pas de React, facile à tester) qui croise 7 ressources en une `Map<riderId, RiderStats>`. `RiderStats` contient :

| Champ | Provenance |
|---|---|
| `rider` | `riders` |
| `teamName` | `teams` (via `rider.teamId`) |
| `gcRank`, `gapSeconds` | `gc` (undefined si le coureur n'est pas classé) |
| `pointsRank`, `points` | `points` (top 10 seulement) |
| `mountainsRank`, `mountainPoints` | `mountains` (top 10) |
| `youthRank` | `youth` (top 10) |
| `stageWins` | **calculé** : nombre d'étapes où `winnerRiderId` = ce coureur |
| `yellowDays` | **calculé** : nombre d'étapes où `yellowJerseyRiderId` = ce coureur |

`countBy(values)` compte les occurrences en ignorant `null` : le contre-la-montre par équipes (`winnerRiderId: null`) ne crédite donc de victoire à **aucun** coureur individuel.

`compareByGc(a, b)` : comparateur de tri (classement général d'abord, les non-classés/abandons ensuite par ordre alphabétique).

**`useRiderStats.ts`** : un hook `useQueries` qui lance **7 requêtes en parallèle** (`ridersQuery`, `teamsQuery`, `gcQuery`, `pointsQuery`, `mountainsQuery`, `youthQuery`, `allStagesQuery`) et un `combine` qui :
- calcule `error` (la première erreur éventuelle) et `retry` (relance celles en erreur) ;
- tant que l'une des 7 n'a pas ses données : renvoie `data: undefined`, `isPending: !error` ;
- sinon appelle `buildRiderStats` et renvoie `{ data, isPending: false, error, retry }`.

Comme toutes ces clés sont partagées avec d'autres écrans, naviguer entre Analyse, Comparateur et Favoris **ne retélécharge rien**.

### 14.6 Boutons favori / comparer : `src/features/riders/RiderActions.tsx`

- **`FavoriteButton`** : `aria-pressed={isFavorite}` (état on/off lu par les lecteurs d'écran), étiquette dynamique « Ajouter Pogačar aux favoris » / « Retirer … des favoris », symbole ☆/★ marqué `aria-hidden` (décoratif).
- **`CompareButton`** : `aria-pressed`, **désactivé** si le comparateur est plein (4) et que ce coureur n'y est pas, avec un `title` explicatif.

Ils sont utilisés par Coureurs, Analyse et Favoris.

### 14.7 Analyse : `src/features/dashboard/DashboardPage.tsx`

**Le coureur sélectionné vit dans l'URL** (`?rider=<id>`). Si le paramètre est absent, le premier du classement (le vainqueur) est choisi. La fonction `select(riderId)` fait `setParams(prev => { prev.set('rider', riderId); return prev })`.

Structure de la page :

1. **Fiche coureur** : menu déroulant (liste de tous les coureurs triés par classement), nom, boutons favori et comparer, équipe et nationalité, 5 chiffres clés (classement et écart, victoires, jours en jaune, rang maillot vert, rang maillot à pois, « Hors top 10 » si absent).
2. **5 graphiques** (voir §15) :

| Graphique | Données | Type |
|---|---|---|
| Écart au vainqueur, top 15 | `gcRank ≤ 15`, `gapSeconds` en minutes | barres horizontales |
| Victoires d'étape | coureurs avec ≥ 1 victoire, triés | barres horizontales |
| Jours en maillot jaune | coureurs avec ≥ 1 jour, triés | barres horizontales |
| Maillot vert, top 10 | points | barres horizontales |
| Avance du leader sur son dauphin | `gcLead` (5 points) | courbe |

3. Si le coureur sélectionné **n'apparaît pas** dans un graphique, une note le dit (« X n'apparaît pas dans ce classement »), pour que l'absence de surbrillance ne soit pas mystérieuse.

`gcLead` est chargé à part (`useQuery(gcLeadQuery)`) et a **son propre état d'erreur**, indépendant du reste : si ce graphique échoue, les autres s'affichent quand même.

Les valeurs des graphiques sont **calculées une fois** (`useMemo`) à partir de `sorted` (la liste des stats triée).

### 14.8 Comparateur : `src/features/compare/ComparePage.tsx`

1. Lit `compared` dans le store (liste de `{id, slot}`) et `useRiderStats()`.
2. `riders` (`useMemo`) : pour chaque comparé, retrouve ses stats et attribue la couleur `var(--series-<slot+1>)`. Un id introuvable est ignoré (`flatMap`).
3. `candidates` : tous les coureurs **pas encore comparés**, triés par classement : alimente le menu « Ajouter un coureur (n/4) ». Le `<select>` a `value=""` en permanence : il sert de **déclencheur** (on choisit, `toggleCompared` est appelé, le menu revient à « Choisir… »). Il est désactivé à 4.
4. **Légende** (liste de pastilles couleur + nom + bouton ×). La couleur n'est **jamais** le seul identifiant : le nom est toujours écrit à côté.
5. Moins de 2 coureurs → `EmptyState` invitant à en ajouter.
6. **Tableau comparatif** : 6 statistiques (`METRICS` : classement, écart, victoires, jours en jaune, points vert, points à pois). La fonction `best(metric, riders)` repère la **meilleure valeur** (la plus petite pour `lowerIsBetter`, sinon la plus grande) et n'en désigne une que s'il y a **au moins 2 valeurs** comparables. La cellule gagnante est en gras et porte un texte masqué « (meilleur) » pour les lecteurs d'écran (pas de signal uniquement visuel). Une valeur absente s'affiche « Hors top 10 » pour les points, « Abandon » sinon.
7. **3 graphiques en barres verticales** (`CHARTS` : écart en minutes, victoires, jours en jaune), chaque barre à la couleur du coureur. `toValue` convertit la valeur brute dans l'unité de l'axe (secondes → minutes) et `unit` formate l'infobulle.

### 14.9 Favoris : `src/features/favorites/FavoritesPage.tsx`

- Aucun favori → message d'invitation (**sans** attendre le chargement des stats : on sait déjà qu'il n'y a rien à charger).
- Sinon : `useRiderStats()`, jointure id → stats (`flatMap` pour ignorer un id inconnu), tri par classement, tableau avec coureur, équipe, classement et écart, victoires, boutons favori et comparer.
- Retirer un favori depuis cette page met à jour le store, donc la ligne disparaît immédiatement.

---

## 15. Les graphiques et leur liaison

### 15.1 Recharts en deux mots

Recharts est une bibliothèque de graphiques en composants React (SVG). On assemble : `ResponsiveContainer` (s'adapte à la largeur disponible) → `BarChart` ou `LineChart` → `XAxis`, `YAxis`, `CartesianGrid`, `Tooltip`, `Bar`/`Line`. Les couleurs sont passées en **variables CSS** (`var(--series-1)`, `var(--chart-grid)`…), ce qui permet au thème clair/sombre de recolorer les graphiques **sans rien refaire en JavaScript**.

### 15.2 `src/features/dashboard/RiderBarChart.tsx` : le graphique « lié »

Composant réutilisé par les 4 graphiques en barres de l'Analyse. Props : `data` (`{ riderId, name, value }[]`), `selectedId`, `onSelect`, `formatValue`, `allowDecimals`.

- **Mode « emphase »** : la barre du coureur sélectionné prend la couleur d'accent (`var(--series-1)`) ; **toutes les autres sont grises** (`var(--chart-deemph)`). Une seule couleur vive + du gris : c'est la forme la plus lisible quand « un élément est le sujet et le reste le contexte ».
- Implémentation : `<Cell>` par barre, `fill` choisi selon `d.riderId === selectedId`.
- **Clic** : `onClick={(_, index) => onSelect(data[index].riderId)}`.
- Hauteur = `data.length × 28 + 40` px : chaque barre garde la même épaisseur quel que soit le nombre de coureurs.
- Les barres ont un arrondi (4 px) du côté de la **valeur** seulement, comme le prescrit la méthode de dataviz.

### 15.3 Comment « cliquer met à jour tous les graphiques »

Il n'y a **aucun** événement entre graphiques. Le mécanisme :

```
clic sur une barre ─► onSelect(riderId) ─► setParams(rider=riderId)  ─► l'URL change
        ▲                                                                   │
        └────── tous les graphiques re-rendus avec selectedId = nouveau ◄───┘
```

La **source de vérité** est l'URL. `selectedId` est relu depuis `useSearchParams`, passé à chaque `RiderBarChart`, et chacun colore sa barre correspondante. Résultat bonus : la sélection est **partageable** (`/dashboard?rider=tim-merlier`) et le bouton « retour » ramène au coureur précédent.

### 15.4 Palette et couleurs

Les 4 couleurs de comparaison (`--series-1` à `--series-4` : bleu, orange, aqua, jaune) viennent d'une palette **validée** pour la distinction des couleurs, y compris pour les daltoniens, avec des variantes distinctes en mode sombre (définies dans `index.css`). Les 4 premiers emplacements sont les seuls utilisés (maximum 4 coureurs comparés).

---

## 16. Styles, thème clair/sombre, accessibilité

Fichier unique : `src/index.css` (pas de framework CSS, du CSS classique avec variables).

### Variables (« design tokens »)

Définies sur `:root` : `--bg`, `--surface`, `--text`, `--muted`, `--border`, `--accent`, `--accent-text`, `--row-hover`, `--skeleton`, `--danger`, `--series-1..4`, `--chart-deemph`, `--chart-grid`, `--chart-axis`. Tout le CSS utilise `var(--...)`, **jamais** de couleur écrite en dur dans les composants.

### Le thème sombre : trois niveaux

```css
:root { ...clair... }
@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { ...sombre... } }
:root[data-theme='dark'] { ...sombre... }
```

- Sans préférence (« Système ») : suit le réglage de l'OS.
- `data-theme="dark"` (posé par `ThemeSelect`) force le sombre, même si l'OS est en clair.
- `data-theme="light"` force le clair : le `:not([data-theme='light'])` empêche le bloc `@media` de s'appliquer.

Les valeurs sombres sont donc écrites **deux fois** (dans le `@media` et dans `[data-theme='dark']`) : c'est volontaire, pour que le choix manuel gagne dans les deux sens.

`color-scheme: light` / `dark` indique au navigateur d'adapter ses contrôles natifs (barres de défilement, menus).

### Sections du fichier

Base (reset, liens, focus) · header et navigation · mise en page · filtres/formulaires · tableaux · badges de type d'étape · cartes de chiffres (`.facts`) · pagination · états (`.state`, `.state-error`) · skeletons + animation `pulse` (désactivée avec `prefers-reduced-motion`) · classe `.visually-hidden` · puis : compteurs, boutons-icônes, fiche coureur, grille de graphiques (`.chart-grid`, colonnes automatiques via `repeat(auto-fit, minmax(...))`, donc **responsive sans media query**), cartes de graphiques, légende, pastilles couleur, cellule « meilleure valeur ».

### Accessibilité mise en place

- **Clavier** : `:focus-visible` donne un contour net aux éléments focalisés ; tout est atteignable (liens, boutons, `<select>`).
- **Structure** : `<main>`, `<nav aria-label>`, `<section aria-labelledby>`, un `<h1>` par page, tableaux avec `<caption>` (masquée visuellement) et `<th scope>`.
- **Lecteurs d'écran** : `aria-pressed` sur favoris/comparer, `aria-live="polite"` sur les compteurs et la pagination, `role="alert"` pour les erreurs, `aria-busy` pendant les chargements, textes `.visually-hidden` (« (meilleur) », « Actions »).
- **Pas de couleur seule** : légende avec noms, « (meilleur) » en texte, données des graphiques disponibles en tableau.
- **Animation réduite** respectée.
- Un audit complet (contrastes mesurés, navigation clavier complète) reste prévu à l'étape 5.

---

## 17. Les tests

Lancer : `npx vitest run` (une exécution) ou `npm test` (mode surveillance). État actuel : **4 fichiers, 15 tests, tous passent.**

| Fichier | Tests | Ce qui est vérifié |
|---|---|---|
| `src/features/stages/filters.test.ts` | 3 | valeurs par défaut sur URL vide ; valeurs inconnues ignorées ; défauts omis lors de la sérialisation |
| `src/features/gc/filters.test.ts` | 5 | lecture/écriture de l'URL ; page invalide → 1 ; recherche insensible aux accents et à la casse ; combinaison équipe + nationalité ; tri par nom décroissant |
| `src/store/preferences.test.ts` | 3 | ajout/retrait d'un favori ; plafond de 4 comparés ; **réutilisation du slot libéré sans recolorer les autres** |
| `src/features/riders/stats.test.ts` | 4 | comptage des victoires et jours en jaune ; contre-la-montre par équipes sans vainqueur individuel ; jointure équipe/classements ; abandons classés en dernier |

- `src/test/setup.ts` : une ligne, `import '@testing-library/jest-dom/vitest'`, qui ajoute des assertions DOM (`toBeInTheDocument`…) pour de futurs tests de composants.
- Les tests actuels testent des **fonctions pures** et le store : rapides, sans navigateur. Pas encore de test de composant (prévu à l'étape 5, avec Testing Library).
- Dans `preferences.test.ts`, un `beforeEach` remet le store à zéro (`usePreferences.setState(...)`), sinon les tests se polluent entre eux.

---

## 18. Scénarios de bout en bout

### A. Ouvrir `/stages?type=mountain&sort=distanceKm&order=desc` directement

1. Le navigateur charge `index.html` → `main.tsx`.
2. MSW démarre ; React monte ; `BrowserRouter` lit l'URL → route `/stages` → `StagesPage`.
3. `useUrlFilters` → `parseStageFilters` lit la query : `{ type: 'mountain', sort: 'distanceKm', order: 'desc' }`.
4. `useStages` envoie `GET /api/stages?type=mountain&_sort=distanceKm&_order=desc`.
5. Le Service Worker intercepte ; `handlers.ts` filtre (8 étapes), trie, renvoie un tableau + `X-Total-Count: 8`, après un petit délai.
6. Pendant le délai : `TableSkeleton`. Puis : tableau de 8 lignes.
7. En parallèle `useRidersById`/`useTeamsById` chargent les noms ; « … » devient « Tadej Pogačar » dès que prêt.

### B. Changer le menu « Type » vers « Plat »

1. `onChange` → `setFilters({ type: 'flat' })`.
2. L'URL devient `?type=flat&sort=distanceKm&order=desc` (remplacement d'historique).
3. `filters` change → la clé de requête change → nouvelle requête ; pendant ce temps le tableau précédent reste affiché (`keepPreviousData`, `aria-busy`).

### C. Taper « vauq » dans la recherche de la page Coureurs

1. Chaque frappe met à jour l'état local (affichage immédiat) ; aucun changement d'URL.
2. 300 ms après la dernière frappe, `useDebouncedValue` met à jour `debounced`.
3. L'effet de `useDebouncedUrlSearch` appelle `setFilters({ q: 'vauq', page: 1 })` → URL `?q=vauq`.
4. `useRidersPage` envoie `GET /api/riders?q=vauq&_sort=name&_page=1&_limit=20`.
5. Le mock filtre sur le texte normalisé, renvoie 1 coureur + `X-Total-Count: 1`. Affichage : « 1 coureur ».

### D. Ajouter un coureur aux favoris, recharger la page

1. Clic sur ☆ → `toggleFavorite(id)` → le store crée un nouveau tableau `favorites`.
2. Le middleware `persist` écrit dans `localStorage['cyclingstats-preferences']`.
3. Les composants qui sélectionnent `favorites` (le bouton, la pastille « Favoris 1 » du header) se re-rendent.
4. Rechargement : le store est **réhydraté** depuis `localStorage`, l'étoile reste ★ et la pastille reste à 1.

### E. Comparer 3 coureurs depuis Coureurs puis ouvrir le Comparateur

1. Trois clics sur « Comparer » → 3 entrées `{id, slot}` (slots 0, 1, 2), la pastille affiche 3.
2. `/compare` : `useRiderStats` charge les 7 requêtes (si elles n'étaient pas déjà en cache) ; `riders` associe chaque id à ses stats et à `--series-<slot+1>`.
3. Le tableau, la légende et les 3 graphiques se construisent ; les couleurs sont stables.

### F. Cliquer sur une barre dans l'Analyse

Voir §15.3.

### G. Que se passe-t-il si une requête échoue ?

1. `apiGet` lève une `ApiError` (statut ≥ 500 ou erreur réseau) → TanStack Query réessaie jusqu'à 3 fois (délai croissant).
2. Après l'échec définitif, `isError` devient vrai → `ErrorState` (`role="alert"`) avec « Réessayer ».
3. Clic → `refetch()` → nouvelle tentative.
4. Pour une 404 : **pas de retry** (règle de `main.tsx`), affichage immédiat.

---

## 19. Points d'attention et limites connues

À connaître, par honnêteté technique.

1. **Re-calculs de `select` / `combine` à chaque rendu.** Dans `useRidersById`, `useTeamsById` et `useRiderStats`, les fonctions `select`/`combine` sont écrites en ligne, donc leur référence change à chaque rendu : TanStack Query les ré-exécute et les `Map` sont recréées. Ce n'est pas un bug (résultat correct) mais cela invalide inutilement des `useMemo` qui en dépendent. Amélioration : extraire ces fonctions au niveau du module (référence stable).
2. **Recherche locale non resynchronisée avec l'URL.** Le champ de recherche garde un état local initialisé depuis l'URL au montage. Si l'URL change **autrement** que par la saisie (bouton « retour », lien externe avec `?q=`), le texte du champ peut ne plus correspondre.
3. **Les filtres Classement vs Coureurs ne se comportent pas pareil** (client vs serveur) : c'est voulu pour **démontrer les deux approches**, mais ce sont deux implémentations à maintenir.
4. **Le clic sur une barre est à la souris/tactile.** Le choix d'un coureur est aussi possible au clavier via le menu déroulant « Coureur sélectionné », mais les barres elles-mêmes ne sont pas focalisables.
5. **Pas de validation d'exécution des réponses d'API** (types TypeScript seulement, voir §7.1).
6. **Thème : léger risque de clignotement.** Le thème choisi est appliqué par un `useEffect` après le premier affichage ; avec un thème forcé « sombre » sur système clair, un éclair de thème clair est possible au chargement. Correctif possible : un petit script dans `index.html` appliquant `data-theme` avant le premier rendu.
7. **Le mock tourne aussi en production** (voulu pour la démo ; à mentionner dans le README du portfolio, comme le demande le brief).
8. **Limites des données** (détaillées dans `data-prep/README.md`) : pas de classement étape par étape ; `topFinishers` partiel ; `gcLead` limité à 5 points ; somme des distances = 3 246 km pour 3 245 annoncés ; le graphique « classement général étape par étape » du brief **n'est donc pas réalisable avec ce jeu de données** sans scraper de nouvelles données.
9. **Bundle volumineux** : le build avertit d'un fichier > 500 kB (surtout Recharts). Solution prévue : chargement à la demande des pages (`React.lazy`) à l'étape 5.
10. **Filtre « plage de dates »** (cité dans le brief) : non implémenté.
11. **Erreur console « Invalid hook call » au tout premier chargement en dev** : provoquée par Vite qui ré-optimise ses dépendances (`recharts`, `zustand`) et recharge la page une fois. N'apparaît pas dans le build de production.

---

## 20. Ce qui n'est pas encore utilisé

Installé mais **pas encore utilisé** dans le code (prévu à l'étape 4 ou 5) :

- `leaflet`, `react-leaflet`, `@types/leaflet` : carte du GPX (étape 4).
- `@testing-library/react`, `@testing-library/user-event` : tests de composants (étape 5). (`@testing-library/jest-dom` est déjà chargé par `src/test/setup.ts`.)

Présents dans le dépôt mais **sans rapport avec le fonctionnement de l'app** (donc non détaillés ci-dessus) : `README.md` à la racine (toujours le texte du modèle Vite, à réécrire à l'étape 5), `cycling-dashboard-brief.md` (le cahier des charges), `public/icons.svg` (resté du modèle Vite, non référencé), le dossier `.claude/` (réglage local de l'outil, ignoré par git), `dist/` et `node_modules/` (produits par les commandes).

---

## 21. Commandes utiles

```bash
npm run dev                          # lancer l'appli (http://localhost:5173)
npx vitest run                       # lancer les tests une fois
npm run typecheck                    # vérifier les types
npm run lint                         # linter
npm run build                        # build de production (dist/)
npm run preview                      # tester le build
python3 data-prep/build_db.py        # régénérer src/mocks/data/db.json
```

Exemples de requêtes à la fausse API, à tester dans la console du navigateur **quand l'appli tourne** (le Service Worker doit être actif) :

```js
await (await fetch('/api/stages?type=mountain&_sort=distanceKm&_order=desc')).json()
await (await fetch('/api/riders?nationality=FRA&_page=2&_limit=5')).headers.get('X-Total-Count')
await (await fetch('/api/riders?q=pogacar')).json()
await (await fetch('/api/gc?_limit=10')).json()
await (await fetch('/api/riders/tadej-pogacar')).json()
```

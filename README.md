# BookIt — réservation de salles de réunion

BookIt est une petite application web réaliste qui sert **uniquement de cible à un framework de test**.
Elle permet de réserver des salles de réunion. L'app contient des règles métier précises, deux rôles,
une API REST documentée et des **bugs injectables** qui permettent de vérifier que les tests les détectent.

> Le dépôt ne contient volontairement aucun test automatisé ni aucune CI.

## Sommaire

- [Démarrage rapide](#démarrage-rapide)
- [Comptes et données de seed](#comptes-et-données-de-seed)
- [Règles métier](#règles-métier)
- [API REST](#api-rest)
- [Testabilité](#testabilité)
- [Bugs injectables](#bugs-injectables)
- [Configuration](#configuration)
- [Développement sans Docker](#développement-sans-docker)
- [Structure du projet](#structure-du-projet)
- [Limites connues](#limites-connues)

---

## Démarrage rapide

Prérequis : Docker et Docker Compose v2. Aucun `.env` n'est nécessaire.

```bash
docker compose up --build
```

| Service | URL                                     |
| ------- | --------------------------------------- |
| Front   | http://localhost:8080                   |
| API     | http://localhost:3000/api (aussi via http://localhost:8080/api) |
| Santé   | http://localhost:3000/api/health        |
| Base    | `postgres://bookit:bookit@localhost:5433/bookit` |

Le premier build prend environ 2 minutes. Pour tout arrêter : `docker compose down`.

> **La base est en mémoire.** Chaque nouveau conteneur `db` repart du seed, et `docker compose down`
> efface toutes les données. Pendant une session, remets l'état initial avec `POST /api/test/reset`.

## Comptes et données de seed

Le seed (`app/db/02_seed.sql`) est reproductible : les IDs sont toujours les mêmes, et les dates sont
calculées par rapport au moment du seed, en UTC.

| ID | Email               | Mot de passe | Rôle  | Nom          |
| -- | ------------------- | ------------ | ----- | ------------ |
| 1  | `admin@bookit.test` | `Admin123!`  | admin | Admin BookIt |
| 2  | `user1@bookit.test` | `User123!`   | user  | Alice Martin |
| 3  | `user2@bookit.test` | `User123!`   | user  | Bruno Petit  |
| 4  | `user3@bookit.test` | `User123!`   | user  | Chloé Durand |

**Salles**

| ID | Nom            | Capacité | Équipements                                | Statut       |
| -- | -------------- | -------- | ------------------------------------------ | ------------ |
| 1  | Cabine Focus   | 2        | screen                                     | active       |
| 2  | Salle Lovelace | 4        | screen, whiteboard                         | active       |
| 3  | Salle Turing   | 8        | projector, whiteboard, videoconference     | active       |
| 4  | Salle Hopper   | 12       | projector, whiteboard, videoconference     | **inactive** |
| 5  | Auditorium     | 20       | projector, microphone, videoconference     | active       |

**Réservations** (J = jour du seed, heures UTC)

| ID | Salle    | Propriétaire | Créneau                  | Pers. | Statut    | Utilité pour les tests                          |
| -- | -------- | ------------ | ------------------------ | ----- | --------- | ----------------------------------------------- |
| 1  | Turing   | user1        | J-2 09:00–10:00          | 6     | completed | passée                                          |
| 2  | Lovelace | user2        | J-1 14:00–15:30          | 3     | completed | passée                                          |
| 3  | Auditorium | user1      | J-3 10:00–12:00          | 18    | cancelled | passée annulée                                  |
| 4  | Focus    | user3        | J-1 09:00–09:30          | 1     | completed | passée                                          |
| 5  | Hopper   | user3        | J-5 09:00–10:00          | 10    | completed | historique sur une salle devenue inactive       |
| 6  | Turing   | user1        | J+1 10:00–11:00          | 5     | confirmed | **cible du chevauchement** (11:00 est libre)    |
| 7  | Lovelace | user1        | J+1 14:00–15:00          | 3     | pending   | à confirmer ou annuler                          |
| 8  | Turing   | user2        | J+1 14:00–16:00          | 8     | pending   | appartient à user2 (règle 6)                    |
| 9  | Auditorium | user2      | J+2 09:00–13:00          | 20    | confirmed | **4 h pile, capacité pleine**                   |
| 10 | Focus    | user3        | J+3 11:00–11:30          | 2     | pending   | **30 min pile**                                 |
| 11 | Lovelace | user3        | J+2 10:00–11:00          | 4     | cancelled | future annulée                                  |
| 12 | Focus    | user1        | seed + 30 min → + 90 min | 2     | confirmed | **annulation < 1 h** (refusée pour un user)     |

Nombre de réservations par compte : user1 en a 5, user2 3, user3 4, et l'admin en voit 12.

> La réservation 12 ne commence dans moins d'1 h que juste après le seed. Fais un reset avant les tests
> qui en dépendent.

## Règles métier

Elles sont toutes implémentées dans [`app/api/src/domain/bookingRules.ts`](app/api/src/domain/bookingRules.ts),
sous forme de fonctions pures.

| # | Règle | Erreur |
| - | ----- | ------ |
| 1 | Pas de chevauchement sur une même salle. Les créneaux sont semi-ouverts `[début, fin[` : une fin à 10:00 et un début à 10:00 ne se chevauchent pas. Seules les réservations `pending` et `confirmed` occupent la salle. | 409 `BOOKING_OVERLAP` |
| 2 | Durée comprise entre 30 min et 4 h incluses. Une fin avant le début est aussi refusée. | 422 `DURATION_OUT_OF_RANGE` |
| 3 | Nombre de participants inférieur ou égal à la capacité de la salle | 422 `CAPACITY_EXCEEDED` |
| 4 | Pas de réservation dans le passé (début avant maintenant) | 422 `BOOKING_IN_PAST` |
| 5 | Annulation impossible moins d'1 h avant le début, sauf pour un admin. Exactement 1 h avant reste autorisé. | 422 `CANCEL_TOO_LATE` |
| 6 | Un user ne voit et ne modifie que ses propres réservations. **Choix : une réservation d'autrui renvoie 404**, pour ne pas révéler qu'elle existe. | 404 `BOOKING_NOT_FOUND` |
| 7 | Une salle inactive n'est pas réservable | 422 `ROOM_INACTIVE` |

**Ordre des contrôles à la création.** Quand une requête viole plusieurs règles, c'est toujours la
première erreur de cette liste qui est renvoyée :
400 validation → 404 `ROOM_NOT_FOUND` → 422 `ROOM_INACTIVE` → 422 `BOOKING_IN_PAST` →
422 `DURATION_OUT_OF_RANGE` → 422 `CAPACITY_EXCEEDED` → 409 `BOOKING_OVERLAP`.

**Machine d'états** ([`bookingStatus.ts`](app/api/src/domain/bookingStatus.ts))

```
pending ──confirm (admin)──▶ confirmed ──complete (admin, après la fin)──▶ completed
   │                            │
   └──────────cancel────────────┴──────────▶ cancelled
```

Une réservation est créée en `pending`. `cancelled` et `completed` sont des états finaux. Une transition
non prévue renvoie 422 `INVALID_STATUS_TRANSITION`, et `complete` avant la fin du créneau renvoie
422 `BOOKING_NOT_ENDED`.

## API REST

La spec complète est dans [`openapi.yaml`](openapi.yaml), au format OpenAPI 3.0, validée avec Redocly.

Conventions :
- Préfixe `/api`, JSON uniquement.
- Authentification : header `Authorization: Bearer <jwt>`. Le token expire après 1 h.
- Dates : ISO 8601 avec fuseau obligatoire (`2030-01-01T10:00:00Z`). Les réponses sont en UTC.
- Corps de requête stricts : un champ inconnu (par exemple `"role": "admin"` à l'inscription) renvoie 400.

| Méthode | Route | Accès | Succès |
| ------- | ----- | ----- | ------ |
| GET | `/health` | public | 200 |
| POST | `/auth/register` | public | 201 (toujours avec le rôle `user`) |
| POST | `/auth/login` | public | 200 `{ token, expiresIn, user }` |
| GET | `/me` | connecté | 200 |
| GET | `/rooms?active=true\|false` | connecté | 200 |
| POST | `/rooms` | admin | 201 |
| GET | `/rooms/:id` | connecté | 200 |
| PATCH | `/rooms/:id` | admin | 200 (désactivation : `{ "isActive": false }`) |
| GET | `/bookings?status=&roomId=&userId=` | connecté | 200 : ses propres réservations pour un user, toutes pour l'admin |
| POST | `/bookings` | connecté | 201 |
| GET | `/bookings/:id` | propriétaire ou admin | 200 |
| POST | `/bookings/:id/cancel` | propriétaire ou admin | 200 |
| POST | `/bookings/:id/confirm` | admin | 200 |
| POST | `/bookings/:id/complete` | admin | 200 |
| POST | `/test/reset` | public, **seulement si `NODE_ENV=test`** (404 sinon) | 204 |

**Format d'erreur unique**

```json
{ "error": { "code": "BOOKING_OVERLAP", "message": "The room is already booked for this time slot" } }
```

Les erreurs 400 ajoutent `details: [{ "path": "attendees", "message": "..." }]`.

| HTTP | Codes |
| ---- | ----- |
| 400 | `VALIDATION_ERROR`, `INVALID_JSON`, `PAYLOAD_TOO_LARGE`. Un ID non numérique dans l'URL renvoie aussi 400. |
| 401 | `UNAUTHORIZED` (pas de token), `INVALID_TOKEN`, `TOKEN_EXPIRED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` (route réservée à l'admin) |
| 404 | `NOT_FOUND` (route inconnue), `ROOM_NOT_FOUND`, `BOOKING_NOT_FOUND` |
| 409 | `BOOKING_OVERLAP`, `EMAIL_ALREADY_USED`, `ROOM_NAME_TAKEN` |
| 422 | `ROOM_INACTIVE`, `BOOKING_IN_PAST`, `DURATION_OUT_OF_RANGE`, `CAPACITY_EXCEEDED`, `CANCEL_TOO_LATE`, `INVALID_STATUS_TRANSITION`, `BOOKING_NOT_ENDED` |
| 500 | `INTERNAL_ERROR` |

`GET /api/health` renvoie `{ status, db, env, bugs }`. Le champ `bugs` liste les bugs API actifs : le
framework peut donc vérifier contre quelle configuration il tourne.

## Testabilité

**Reset** : `POST /api/test/reset` remet la base dans l'état du seed (environ 100 à 150 ms). Les IDs ne changent
pas, donc un token obtenu avant le reset reste valide.

**Front** (http://localhost:8080)

| Route | Écran |
| ----- | ----- |
| `/login`, `/register` | Authentification |
| `/rooms` | Liste des salles, filtre « Active rooms only ». L'admin a en plus « New room » et « Edit ». |
| `/rooms/:id` | Détail de la salle et formulaire de réservation, ou message si la salle est inactive |
| `/rooms/new`, `/rooms/:id/edit` | Formulaire de salle (admin). Un user voit `forbidden-message`. |
| `/bookings` | « My bookings » ou « All bookings » (admin), filtre par statut, compteur |
| `/bookings/:id` | Détail. Annuler pour tous, Confirmer et Terminer pour l'admin. |

**Conventions de sélecteurs**
- Chaque élément interactif a un **label accessible** (`<label>`, nom de bouton ou `aria-label`) **et**
  un `data-testid` stable.
- Les `data-testid` sont en kebab-case, sous la forme `page-élément-type` : `login-email-input`,
  `login-submit-button`, `booking-form-error`, `bookings-status-filter`…
- Lignes de tableau : `room-row-{id}` et `booking-row-{id}`. Les cellules ont des testid génériques à
  cibler à l'intérieur de la ligne (`room-name`, `room-status`, `booking-status`, `booking-start`…).
- Les blocs d'erreur ont `role="alert"` et **`data-error-code`**, qui contient le code renvoyé par l'API.
  Tu peux ainsi vérifier le code sans dépendre du texte. Les messages de succès ont `role="status"`
  (`flash-message`, `booking-action-success`).
- Le compteur `bookings-count` expose aussi un attribut `data-count`.
- Les formulaires ont `noValidate` : un champ vide part à l'API, ce qui permet de tester l'affichage des
  erreurs 400.
- Dates : affichées en `YYYY-MM-DD HH:mm` et saisies via `datetime-local`, **dans le fuseau du
  navigateur**. Fixe le fuseau dans tes tests (par exemple `timezoneId` dans Playwright).
- Le token est stocké dans `localStorage` sous la clé `bookit.token`.

## Bugs injectables

Par défaut, aucun bug n'est actif. On les active par variable d'environnement, et on peut en combiner
plusieurs en les séparant par des virgules (`BUG=OVERLAP,SLOW`). Dans le code, chaque bug est un
`if (isBug('CODE'))` commenté, placé au plus près de la règle qu'il casse.

**API** : variable `BUG`, lue par [`app/api/src/bugs.ts`](app/api/src/bugs.ts)

| Code | Effet | Emplacement |
| ---- | ----- | ----------- |
| `OVERLAP` | Le contrôle de chevauchement est ignoré | `bookingRules.ts` · `assertNoOverlap` |
| `DURATION` | Une durée de 4 h 01 est acceptée (4 h 02 reste refusée) | `bookingRules.ts` · `assertDuration` |
| `CAPACITY` | La capacité n'est pas vérifiée | `bookingRules.ts` · `assertCapacity` |
| `PAST` | Les réservations dans le passé sont acceptées | `bookingRules.ts` · `assertNotInPast` |
| `CANCEL_DELAY` | L'annulation à moins d'1 h est acceptée | `bookingRules.ts` · `assertCanCancel` |
| `AUTH403` | Un user accède aux réservations d'un autre (200 au lieu de 404), en lecture comme en annulation | `bookingRules.ts` · `canAccessBooking` |
| `STATUS_CODE` | La création renvoie 200 au lieu de 201 | `routes/bookings.ts` · `POST /` |
| `SLOW` | 800 ms de latence en plus sur `GET /bookings` | `routes/bookings.ts` · `GET /` |

```bash
BUG=OVERLAP docker compose up -d api      # recrée uniquement l'API, en quelques secondes
```

**Front** : variable `VITE_BUG`, lue par [`app/web/src/bugs.ts`](app/web/src/bugs.ts). Elle est **figée au
build**, d'où le `--build`.

| Code | Effet | Emplacement |
| ---- | ----- | ----------- |
| `A11Y` | Le champ email du login perd son label : il n'a plus de nom accessible, mais garde son `data-testid` | `pages/LoginPage.tsx` |
| `UI_TOTAL` | Le compteur de réservations affiché est faux de 1 | `pages/BookingsPage.tsx` |

```bash
VITE_BUG=A11Y docker compose up -d --build web
```

Pour revenir à l'état sans bug : `docker compose up -d --build`, sans variable. Tu peux aussi les
renseigner dans `.env`.

## Configuration

Copie [`.env.example`](.env.example) en `.env` pour personnaliser. Toutes les variables ont une valeur
par défaut.

| Variable | Défaut | Rôle |
| -------- | ------ | ---- |
| `WEB_PORT` / `API_PORT` / `DB_PORT` | 8080 / 3000 / 5433 | Ports exposés sur l'hôte |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | bookit | Identifiants de la base |
| `NODE_ENV` | `test` | `test` active `POST /api/test/reset`. `development` et `production` ne l'activent pas. |
| `JWT_SECRET` | `bookit-local-secret-change-me` | Secret de signature des JWT (16 caractères minimum) |
| `JWT_EXPIRES_IN_SECONDS` | 3600 | Durée de validité du token. Réduis-la pour tester l'expiration. |
| `BUG` | vide | Bugs API |
| `VITE_BUG` | vide | Bugs front (figés au build) |

## Développement sans Docker

Prérequis : Node 20 ou plus, et Docker uniquement pour la base.

```bash
# 1. Base (port 5433, schéma et seed appliqués au démarrage)
docker run --rm --name bookit-db -p 5433:5432 \
  -e POSTGRES_USER=bookit -e POSTGRES_PASSWORD=bookit -e POSTGRES_DB=bookit \
  -v "$PWD/app/db:/docker-entrypoint-initdb.d:ro" postgres:16-alpine

# 2. API : http://localhost:3000 (sa config par défaut pointe vers localhost:5433)
cd app/api && npm install && NODE_ENV=test npm run dev

# 3. Front : http://localhost:5173 (Vite redirige /api vers localhost:3000)
cd app/web && npm install && npm run dev
```

Avec cette méthode, les bugs se passent directement en ligne de commande :
`BUG=OVERLAP NODE_ENV=test npm run dev` ou `VITE_BUG=A11Y npm run dev`.

**Scripts npm**, identiques dans `app/api` et `app/web` :

| Script | Rôle |
| ------ | ---- |
| `dev` | Serveur de développement avec rechargement à chaud (tsx watch / Vite) |
| `build` | Compilation TypeScript (+ bundle Vite pour le front) |
| `typecheck` | Vérification des types |
| `lint` | ESLint et vérification Prettier |
| `format` | Formatage Prettier |

## Structure du projet

```
.
├── docker-compose.yml
├── .env.example
├── openapi.yaml
├── app/
│   ├── db/
│   │   ├── 01_schema.sql          # tables (sans contraintes métier, volontairement)
│   │   └── 02_seed.sql            # seed rejouable, utilisé aussi par /api/test/reset
│   ├── api/                       # Node 20, Express 5, TypeScript, pg, zod, JWT, bcryptjs
│   │   └── src/
│   │       ├── domain/            # bookingRules.ts (règles 1–7), bookingStatus.ts
│   │       ├── bugs.ts            # bugs injectables API
│   │       ├── services/          # orchestration des cas d'usage
│   │       ├── repositories/      # SQL brut
│   │       ├── routes/            # auth, me, rooms, bookings, health, test
│   │       ├── middleware/auth.ts # JWT + rôles
│   │       ├── schemas.ts         # validation zod
│   │       └── errors.ts          # AppError + format d'erreur unique
│   └── web/                       # React 19, Vite 7, React Router 7, fetch natif, CSS simple
│       ├── nginx.conf             # sert le front et redirige /api vers l'API (Docker)
│       └── src/
│           ├── pages/             # un fichier par écran
│           ├── components/
│           ├── bugs.ts            # bugs injectables front
│           └── api.ts             # client fetch
```

**Choix techniques**
- **`pg` + SQL brut** plutôt que Prisma : le schéma et le seed sont de simples fichiers `.sql`, rejoués
  tels quels par le reset. Il n'y a ni génération de client ni migration.
- **`bcryptjs`** : même algorithme que bcrypt, sans compilation native dans Docker. Les hash du seed sont
  générés par `pgcrypto` et restent compatibles.
- **Les règles métier ne sont pas des contraintes SQL**, sinon les bugs injectables ne pourraient pas
  les contourner.
- Un verrou sur la salle (`SELECT … FOR UPDATE`) empêche deux réservations simultanées de se chevaucher.

## Limites connues

- Rien ne passe automatiquement en `completed` : c'est une action admin.
- Pas de limitation de débit sur le login, pas de pagination sur les listes.
- Le verrou contre les doubles réservations simultanées n'a pas été testé en concurrence réelle.
- Pas de confirmation avant d'annuler une réservation (volontaire, pour simplifier les tests).
- L'expiration du token n'est détectée qu'au prochain appel API, qui renvoie alors vers le login.
- Les messages de l'API et l'interface sont en anglais.

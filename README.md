# Ex Libris — Application de gestion de bibliothèque universitaire

Application complète (back-end API + front-end web) développée pour le projet
de fin d'études, conforme au cahier des charges livré séparément.

- **Back-end** : Node.js, Express, PostgreSQL (accès via `pg`, SQL brut paramétré)
- **Front-end** : React (Vite), Tailwind CSS, composants shadcn/ui (Radix UI)
- **Authentification** : JWT, mots de passe hachés (bcrypt)

Toute la logique métier décrite dans le cahier des charges est implémentée et
testée : quotas d'emprunt différenciés par profil, blocage sur pénalité
impayée, calcul automatique des pénalités de retard, file de réservation
honorée automatiquement au retour, prolongation encadrée, tableau de bord
statistique.

**Fonctionnalités complémentaires (V2)**
- Gestion complète du catalogue côté bibliothécaire (créer / modifier /
  supprimer un ouvrage, ajouter des exemplaires)
- Export des statistiques et de l'activité en PDF et Excel
- Notifications email (confirmation d'emprunt, pénalité de retard,
  disponibilité après réservation, rappels d'échéance programmés)
- Suite de tests automatisés (back-end et front-end)

## 1. Prérequis

- Node.js ≥ 18
- PostgreSQL ≥ 14 (local ou distant)

## 2. Installation du back-end

```bash
cd server
npm install
cp .env.example .env
# éditez .env avec vos identifiants PostgreSQL et un JWT_SECRET
```

Créez la base de données puis appliquez le schéma :

```bash
createdb exlibris
npm run db:migrate
npm run db:seed     # optionnel : jeu de données de démonstration
```

Démarrez l'API :

```bash
npm run dev          # avec rechargement automatique
# ou
npm start
```

L'API est disponible sur `http://localhost:4000`. Vérification rapide :
`curl http://localhost:4000/api/health`.

## 3. Installation du front-end

```bash
cd client
npm install
npm run dev
```

L'application est disponible sur `http://localhost:5173`. Le serveur de
développement Vite proxifie automatiquement `/api/*` vers `http://localhost:4000`
(voir `vite.config.js`).

Pour une build de production :

```bash
npm run build      # génère le dossier dist/
npm run preview    # sert la build localement
```

## 4. Comptes de démonstration

Après `npm run db:seed` (mot de passe pour tous : `password123`) :

| Rôle              | Email                          |
|-------------------|---------------------------------|
| Administrateur    | admin@universite.ci            |
| Bibliothécaire    | bibliothecaire@universite.ci   |
| Adhérent (étudiant)          | etudiant@universite.ci         |
| Adhérent (enseignant-chercheur) | enseignant@universite.ci    |

## 5. Structure du projet

```
exlibris/
├── server/                  # API Express
│   ├── src/
│   │   ├── db/               # pool pg, schema.sql, migrate.js, seed.js
│   │   ├── middleware/        # auth (JWT), validation Zod, erreurs
│   │   ├── routes/            # définition des routes Express
│   │   ├── services/          # logique métier (emprunts, réservations…)
│   │   └── utils/             # ApiError, asyncHandler, schémas Zod
│   ├── prisma/schema.prisma   # schéma ORM de référence (voir note ci-dessous)
│   └── .env.example
│
├── client/                  # Application React
│   └── src/
│       ├── components/ui/     # composants shadcn/ui (Button, Card, Dialog…)
│       ├── context/           # AuthContext (JWT, session)
│       ├── lib/                # client API, thème, utilitaires
│       └── pages/              # Login, Catalogue, MesEmprunts, Admin…
│
└── docs/                    # cahier des charges, annexes UML, schéma SQL
```

## 6. Note sur Prisma vs `pg`

Le schéma `prisma/schema.prisma` est fourni comme référence/documentation du
modèle de données (identique à celui présenté en annexe du cahier des
charges). L'implémentation effective du serveur utilise **node-postgres**
(`pg`) avec des requêtes SQL paramétrées : dans certains environnements
réseau restreints, le téléchargement du moteur binaire Prisma peut être
bloqué. Si votre environnement a un accès réseau complet, vous pouvez migrer
vers Prisma Client en réutilisant ce schéma sans changement de modèle de
données (`npx prisma generate && npx prisma migrate dev`).

## 7. Sécurité

- Mots de passe hachés avec bcrypt (10 rounds)
- Authentification par JWT (expiration configurable via `JWT_EXPIRES_IN`)
- Contrôle des rôles par middleware sur chaque route sensible
- Requêtes SQL paramétrées (protection contre l'injection SQL)
- Verrouillage transactionnel (`FOR UPDATE SKIP LOCKED`) pour éviter les
  doubles emprunts concurrents sur un même exemplaire

## 9. Tests automatisés

### Back-end (Jest + Supertest, contre une vraie base PostgreSQL de test)

```bash
cd server
createdb exlibris_test
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/exlibris_test?schema=public" npm run db:migrate
npm test
```

22 tests couvrant l'authentification, le CRUD catalogue, et surtout la
logique métier critique des emprunts : quota, blocage sur pénalité
impayée, calcul de pénalité de retard, file de réservation honorée
automatiquement au retour, restrictions de prolongation. Les identifiants
de connexion à la base de test sont lus depuis `DATABASE_URL` (voir le
script `test` dans `package.json` pour les valeurs par défaut).

### Front-end (Vitest + React Testing Library)

```bash
cd client
npm test
```

16 tests : composants UI (Button), utilitaires (thème, client API), et un
test d'intégration de la page de connexion (rendu, remplissage, appel API
mocké, gestion d'erreur).

## 10. Pour aller plus loin

- Export PDF/Excel plus riche (graphiques, période personnalisable)
- Notifications SMS en complément de l'email
- Tests end-to-end (Playwright) sur les parcours complets
- CI/CD (GitHub Actions) exécutant les deux suites de tests à chaque push


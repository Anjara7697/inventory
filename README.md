# Inventory — gestion de stock et de production

Application de gestion des produits finis, matières premières, nomenclatures (BOM),
mouvements de stock et production (voir les documents de conception, MCD et MLD).

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 1 — Fondations | Docker, PostgreSQL, Prisma, NestJS, auth JWT + refresh, utilisateurs | ✅ backend |
| 2 — Référentiel | Produits, matières, unités, catégories d'unités, caractéristiques | ✅ backend |
| 3 — Nomenclature | BOM via `/products/:id/bom` | ✅ backend |
| 4-7 — Stock, production, approvisionnement, dashboard | | à faire |

Le schéma Prisma couvre déjà tout le MLD (stocks, mouvements, productions). Le frontend Next.js n'est pas encore initialisé.

## Démarrage

```bash
docker compose up -d postgres
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
SEED_DEMO=true npx prisma db seed   # unités, caractéristiques, admin, exemple « Pantalon Jean »
npm run start:dev                   # http://localhost:3001 — Swagger : /docs
```

Compte seed : `admin@inventory.local` / `ChangeMe123!` (surchargeable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). À changer hors développement.

Tout en Docker : `docker compose up --build`.

## Tests

```bash
npm test            # unitaires
npm run test:e2e    # API + PostgreSQL — DATABASE_URL doit viser une base jetable : les tables sont vidées
```

## Règles métier implémentées

- Le premier compte inscrit via `/auth/register` est `ADMIN`, les suivants `VIEWER`. Rôles : ADMIN > MANAGER > OPERATOR > VIEWER (lecture pour tous, écriture du référentiel pour MANAGER+, gestion des utilisateurs pour ADMIN).
- Une unité appartient à une catégorie (longueur, poids…) ; `conversionFactor` est le facteur vers l'unité de référence. Les conversions entre catégories différentes sont refusées.
- Une ligne de nomenclature doit utiliser une unité de la même catégorie que celle de la matière ; une matière n'apparaît qu'une fois par produit ; quantité > 0.
- L'unité d'une matière ne peut plus changer dès qu'elle est utilisée dans une nomenclature ou a un historique.
- Supprimer une matière/produit référencé le désactive (`active = false`).
- Contraintes SQL `CHECK` (quantités et facteurs > 0, mouvement lié à une matière ou un produit) dans la migration.

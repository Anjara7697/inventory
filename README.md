# Inventory — gestion de stock et de production

Application de gestion des produits finis, matières premières, nomenclatures (BOM),
mouvements de stock et production (voir les documents de conception, MCD et MLD).

## État d'avancement

| Phase | Contenu | État |
|---|---|---|
| 1 — Fondations | Docker, PostgreSQL, Prisma, NestJS, auth JWT + refresh, utilisateurs | ✅ backend |
| 2 — Référentiel | Produits, matières, unités, catégories d'unités, caractéristiques | ✅ backend |
| 3 — Nomenclature | BOM via `/products/:id/bom` | ✅ backend |
| 4 — Stock | Stocks matières/produits, mouvements, seuils et alertes | ✅ backend |
| 5 — Production | Capacité, vérification, besoins, production transactionnelle | ✅ backend |
| 6 — Approvisionnement | Fournisseurs, commandes d'achat (brouillon → commandée → reçue / annulée), réception = entrée en stock, commande pré-remplie depuis les manquants d'un produit | ✅ |
| 7 — Dashboard, rapports | Dashboard et alertes faits ; rapports à faire | partiel |
| Frontend (Next.js + Tailwind) | Connexion, dashboard, produits (capacité, vérification, production), matières, stocks et mouvements, historique de production, création/édition de produits (éditeur de nomenclature) et de matières (caractéristiques), paramètres (unités, caractéristiques, fournisseurs, utilisateurs), achats | ✅ première version |

## Démarrage

```bash
docker compose up -d postgres
cd backend
cp .env.example .env
npm install
npx prisma generate                 # généré aussi par npm install ; à relancer si le schéma change
npx prisma migrate deploy
npm run seed:demo                   # unités, caractéristiques, admin, exemple « Pantalon Jean » (Windows/macOS/Linux)
npm run start:dev                   # http://localhost:3001 — Swagger : /docs
```

Compte seed : `admin@inventory.local` / `ChangeMe123!` (surchargeable via `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`). À changer hors développement.

Frontend :

```bash
cd frontend
cp .env.example .env.local   # NEXT_PUBLIC_API_URL
npm install && npm run dev   # http://localhost:3000
```

**Tout en Docker (le plus simple)** :

```bash
docker compose up --build        # première fois : quelques minutes
```

Interface : http://localhost:3000 · API / Swagger : http://localhost:3001/docs. Le conteneur de l'API applique les migrations et le seed au démarrage (exemple « Pantalon Jean » inclus ; `SEED_DEMO=false docker compose up` pour démarrer vide). `docker compose down -v` efface aussi les données.
Si tu accèdes à l'application depuis une autre machine que celle qui exécute Docker, définis `PUBLIC_API_URL` (ex. `http://192.168.1.20:3001`) avant `docker compose up --build`.

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

### Stock et production

- Le stock courant est une valeur mise à jour **en même temps** qu'un mouvement signé (`ENTRY`/`RETURN` +, `EXIT`/`LOSS` −, `ADJUSTMENT` signé, réservé aux managers). Les quantités sont converties dans l'unité du stock : l'historique somme toujours au stock. Un stock ne devient jamais négatif (409), y compris en cas d'appels concurrents (`UPDATE` gardé).
- `POST /production` (entier > 0) : lit la nomenclature, vérifie, retire les matières, ajoute les produits finis, écrit les mouvements (`reference = PROD-00042`) et la production dans **une seule transaction** ; en cas de manque, 409 avec la liste des matières manquantes et rien n'est modifié.
- `GET /products/:id/production-capacity` : production maximale et matière limitante. `POST /products/:id/check-production` et `/material-requirements` (`{quantity}`) : faisabilité, manquants et quantités à acheter.
- `GET /inventory/alerts` : `LOW_STOCK` (≤ seuil minimum) et `OUT_OF_STOCK`. Les produits finis sont comptés en `PCS` (l'unité `PCS` doit exister, ce que fait le seed).

### Achats

- Une commande suit `DRAFT → ORDERED → RECEIVED` (ou `CANCELLED`). Seul un brouillon est modifiable. La réception crée une entrée de stock par ligne (référence `PO-00001`), dans l'unité du stock, en une transaction ; une double réception ne peut pas ajouter le stock deux fois.
- Sur la fiche d'un produit, si la production est impossible, un bouton crée un brouillon de commande pré-rempli avec les matières manquantes.

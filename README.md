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
| 7 — Dashboard, rapports | Dashboard, alertes (matières et produits finis), coûts et valeur du stock, rapports avec graphiques | ✅ |
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

## Production (VPS)

`docker-compose.prod.yml` + `deploy/Caddyfile` : HTTPS automatique (Caddy / Let's Encrypt), interface sur `https://DOMAIN`, API sur `https://DOMAIN/api`, base et API non exposées. Réglages dans `.env.production` (modèle : `.env.production.example`). Sauvegarde : `deploy/backup.sh` ; mise à jour : `deploy/update.sh`. Guide pas à pas (VPS Contabo, Ubuntu 24.04) : [docs/deploiement.md](docs/deploiement.md).

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

### Annulation, listes et filtres

- `POST /production/:id/cancel` (manager) : inverse tous les mouvements de la production dans une transaction (matières remises en stock, produits fabriqués retirés). Refusé en 409, sans rien modifier, si les produits fabriqués ne sont plus en stock (déjà vendus). Possible même si le produit ou une matière a été désactivé depuis. Les statuts `PENDING` et `IN_PROGRESS` du schéma sont réservés (une production est créée directement terminée).
- Les listes `products`, `materials`, `stock-movements`, `production` et `purchase-orders` acceptent `limit` (1–200) et `offset` ; le total est dans l'en-tête `X-Total-Count`. Filtres : `search` + `includeInactive` (produits, matières), `type`, `from`, `to`, `materialId`, `productId`, `reference` (mouvements), `status` (productions, commandes).
- Interface : recherche, pagination, filtres, affichage des éléments inactifs avec « Réactiver ». La page Stocks gère aussi les mouvements de produits finis (vente, retour, stock initial).

### Édition du référentiel

Unités, catégories d'unités, caractéristiques et fournisseurs sont modifiables dans Paramètres. Garde-fous : le facteur de conversion et la catégorie d'une unité, et le type d'une caractéristique, sont figés dès qu'ils sont utilisés (sinon les quantités déjà enregistrées changeraient de sens) ; nom, symbole et code restent modifiables.

### Profil et accès

- `GET/PATCH /auth/me` et `POST /auth/change-password` : chacun gère son nom et son mot de passe (page « Mon profil »). Un changement de mot de passe déconnecte les autres sessions.
- Un compte n'a qu'**une session rafraîchissable à la fois** : se connecter sur un second appareil invalide le renouvellement automatique du premier (son jeton d'accès reste valable 15 minutes).
- Les pages réservées (création/édition de produits, matières, commandes ; gestion des utilisateurs) affichent « Accès refusé » aux rôles non autorisés. L'API applique les mêmes règles.

### Coûts, valeur du stock et rapports (managers)

- Chaque matière a un **coût unitaire** (par unité de stock). Une ligne de commande peut porter un **prix** (par unité de la ligne, convertie vers l'unité de stock) : à la réception, le coût de la matière devient la **moyenne pondérée** `(stock × coût actuel + reçu × prix) / (stock + reçu)`. Une ligne sans prix ne touche pas au coût. Le coût reste modifiable à la main.
- `GET /reports/stock-value` : matières = quantité × coût moyen ; produits finis = quantité × coût de la nomenclature aux coûts actuels (une **estimation**, pas une valeur comptable).
- `GET /reports/production-monthly?months=12`, `/reports/top-materials`, `/reports/top-products` (filtres `from`/`to`) : les productions annulées sont exclues, les annulations sont déduites de la consommation.
- Un produit fini peut avoir un seuil minimum (`PATCH /inventory/products/:id/threshold`) et apparaît alors dans les alertes.
- La devise s'affiche selon `NEXT_PUBLIC_CURRENCY` dans `frontend/.env.local` (code ISO : `EUR`, `USD`, `MGA`…). Le montant n'est pas converti, seulement formaté.

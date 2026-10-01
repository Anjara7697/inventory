# Cahier des charges — Application de gestion de stock et de production (Inventory)

Oct 1, 2026 · @Anjara

Ce document est la référence unique pour développer, tester et mettre en production l'application Inventory ; il distingue en permanence ce qui est décidé de ce qui reste ouvert.

## 0. Conventions du document

### 0.1 Statuts des exigences

Chaque exigence porte un statut entre crochets. Une exigence sans statut est sans valeur.

| Statut | Signification |
| --- | --- |
| **\[VALIDÉ\]** | Figure dans un document fourni (Introduction, Conception, MCD, MLD) ou a été réalisée et acceptée par le porteur du projet au cours du développement. |
| **\[RETENU\]** | Recommandation de la rédaction acceptée globalement par le porteur le 2026-10-01 (« ok allons y »). Elle n'a pas été confirmée point par point : elle figure aussi dans la section « Points à confirmer ». |
| **\[PROPOSÉ\]** | Proposition de la rédaction, sans décision du porteur. |
| **\[À CONFIRMER\]** | Point ambigu ou contradictoire entre sources ; une décision est attendue. |
| **\[À DÉFINIR\]** | Information manquante qui n'a pas été inventée. |
| **\[HYPOTHÈSE\]** | Valeur de travail retenue en attendant une réponse ; elle ne vaut pas décision. |

### 0.2 Identifiants

| Préfixe | Objet | Exemple |
| --- | --- | --- |
| `F-` | Fonctionnalité (section 6) | F-PRO-03 |
| `RG-` | Règle de gestion (section 8) | RG-14 |
| `NF-` | Exigence non fonctionnelle (section 13) | NF-05 |
| `SEC-` | Exigence de sécurité (section 12) | SEC-04 |
| `TA-` | Test d'acceptation (section 17) | TA-02 |
| `EC-` | Écart entre l'existant et le présent cahier des charges (section 19) | EC-03 |

### 0.3 Termes employés

Les termes suivants sont employés avec un sens unique dans tout le document (définitions complètes en annexe A).

- **Matière** : matière première ou composant (tissu, bouton). Les documents parlent aussi de « Material ».
- **Produit** : produit fini fabriqué à partir de matières.
- **Nomenclature** : liste des matières et quantités nécessaires pour fabriquer **une** unité d'un produit (BOM).
- **Mouvement** : écriture d'historique de stock, signée, non modifiable.
- **Production** : opération qui consomme des matières et crée des produits finis.
- **Désactiver** : rendre un élément non sélectionnable sans le supprimer ; il garde son historique.

### 0.4 Niveau de vérification

Les affirmations « réalisé » de ce document décrivent l'application livrée à la date du document : 36 tests automatiques d'API, 3 tests unitaires et des parcours vérifiés dans un navigateur. Le workflow d'intégration continue, le déploiement Docker complet et le frontend n'ont pas de test automatique ; la section 17 détaille ces limites.

## 1. Informations générales

Ce document est la version 0.1 du cahier des charges d'Inventory, à l'état de brouillon en attente de validation.

| Rubrique | Valeur |
| --- | --- |
| Nom du projet | Inventory — Application de gestion de stock et de production (nom des documents sources ; nom commercial **\[À DÉFINIR\]**) |
| Version du document | 0.1 |
| Date | 2026-10-01 |
| Auteur | Rédaction assistée (Claude) pour le compte du porteur du projet ; nom et fonction de l'auteur officiel **\[À DÉFINIR\]** |
| Porteur du projet | L'auteur des documents de conception (Introduction, Conception, MCD, MLD) ; identité **\[À DÉFINIR\]** |
| Commanditaire / client | **\[À DÉFINIR\]** |
| Destinataires du document | Responsable de projet, client ou encadrant, développeurs, exploitants (liste nominative **\[À DÉFINIR\]**) |
| Statut | Brouillon — en attente de validation |
| Dépôt de code | `Anjara7697/inventory`, branche `claude/new-session-ovdlty` |
| Sources | Introduction (7 p.), Conception (78 p.), MCD (65 p.), MLD (69 p.), application réalisée, décisions prises en session |

### 1.1 Historique des versions

| Version | Date | Auteur | Modification |
| --- | --- | --- | --- |
| 0.1 | 2026-10-01 | Rédaction assistée | Création à partir des quatre documents sources et de l'application réalisée (phases 1 à 7). Les recommandations de l'audit sont retenues par accord global du porteur ; les points non tranchés sont listés en fin de document. |

### 1.2 Cycle de validation

| Passage | Condition |
| --- | --- |
| Brouillon → Relu | Le porteur a relu et répondu aux points de la section « Points à confirmer » |
| Relu → Validé | Plus aucun statut **\[À CONFIRMER\]** ni **\[À DÉFINIR\]** bloquant ; validation écrite du commanditaire **\[À DÉFINIR : qui valide\]** |
| Validé → Révisé | Toute modification ultérieure passe par une nouvelle ligne de l'historique |

## 2. Contexte et présentation du projet

Inventory est une application web qui suit le stock des produits finis **et** des matières premières qui les composent, et qui calcule ce qu'il est possible de produire, ce qui manque et ce qu'il faut acheter.

### 2.1 Origine du projet

Le projet est né d'une idée du porteur : concevoir une application de gestion de stocks « avec une approche plus détaillée », capable de connaître la composition d'un produit, ses matières, leurs caractéristiques et leurs unités de mesure (Introduction). Il a ensuite été formalisé en quatre documents : Introduction, Conception, MCD (modèle conceptuel de données) et MLD (modèle logique de données), puis développé en sept phases. **\[VALIDÉ\]**

Le contexte organisationnel réel (entreprise, atelier, établissement d'enseignement, produit à commercialiser) n'est pas précisé dans les sources : **\[À DÉFINIR\]**.

### 2.2 Problématique

Un outil de stock classique répond à une seule question : « combien de produits ai-je en stock ? ». Il ne relie pas un produit à ce qui sert à le fabriquer. Le porteur le dit ainsi : le but n'est pas « une application CRUD de gestion de stock, mais un véritable système de gestion des matières, des produits et de la production » (Conception, conclusion). **\[VALIDÉ\]**

### 2.3 Besoin identifié

L'application doit permettre de répondre aux questions suivantes (Introduction et Conception) :

1. De quelles matières un produit est-il composé ?
2. Quelle quantité de chaque matière faut-il pour le fabriquer ?
3. Combien de produits puis-je fabriquer avec mon stock actuel ?
4. Quelles matières me manquent pour fabriquer un produit ?
5. Quelle quantité de matières dois-je acheter pour produire une quantité donnée ?
6. Que reste-t-il en stock après une production ?
7. Pourquoi une certaine quantité de matière a-t-elle disparu du stock ?

Ces sept questions structurent le périmètre ; chacune est couverte par au moins une fonctionnalité (matrice de traçabilité, annexe D). **\[VALIDÉ\]**

### 2.4 Domaine d'application

Les exemples des documents sont issus de la confection (pantalon en jean, T-shirt blanc, tissu, fermeture, bouton). Le modèle est toutefois générique : une matière quelconque avec une unité quelconque. Le cahier des charges traite l'application comme un outil **générique de fabrication à partir de nomenclatures**, les exemples textiles servant de jeux d'essai. **\[HYPOTHÈSE\]**

### 2.5 Situation à la date du document

Les phases 1 à 7 de la feuille de route de la Conception sont réalisées (section 20), ainsi que des fonctions ajoutées en cours de projet (annulation de production, pagination et filtres, profil utilisateur, édition du référentiel). Le porteur a testé l'application et confirmé que les règles sont conformes à ses documents. **\[VALIDÉ\]** La mise en production reste à préparer.

## 3. Objectifs du projet

L'objectif principal est de suivre précisément les stocks, de comprendre la composition des produits et de déterminer automatiquement les possibilités de production à partir des matières disponibles (Introduction, « Objectif général »). **\[VALIDÉ\]**

### 3.1 Objectifs secondaires

| Réf. | Objectif | Statut |
| --- | --- | --- |
| OBJ-1 | Gérer simultanément deux niveaux de stock, matières premières et produits finis, liés par la nomenclature | **\[VALIDÉ\]** |
| OBJ-2 | Garantir la fiabilité des quantités : unités compatibles, stock jamais négatif, opérations de production atomiques | **\[VALIDÉ\]** |
| OBJ-3 | Conserver l'historique complet de chaque variation de stock et en expliquer l'origine | **\[VALIDÉ\]** |
| OBJ-4 | Aider à l'approvisionnement : manques, quantités à acheter, seuils, alertes, commandes aux fournisseurs | **\[VALIDÉ\]** |
| OBJ-5 | Piloter l'activité : tableau de bord, rapports de production et de consommation, valeur du stock | **\[VALIDÉ\]** |
| OBJ-6 | Réserver les actions sensibles à des rôles définis (administrateur, manager, opérateur, lecteur) | **\[VALIDÉ\]** |
| OBJ-7 | Livrer un code maintenable : TypeScript strict, tests automatiques, conteneurisation, intégration continue | **\[VALIDÉ\]** (Conception § 40 à 44) |

### 3.2 Résultats attendus

- Un utilisateur obtient en quelques actions la composition d'un produit, sa capacité de production et la liste des matières manquantes.
- Une production se confirme en un seul geste ; stocks, mouvements et production sont mis à jour ensemble ou pas du tout.
- Chaque quantité en stock est explicable par ses mouvements.
- Un manager dispose d'une vue chiffrée de la production, de la consommation et de la valeur du stock.

### 3.3 Indicateurs de réussite

Aucun indicateur chiffré (gain de temps, taux d'erreur, nombre d'utilisateurs actifs) n'est donné dans les sources : **\[À DÉFINIR\]** par le porteur.

En attendant, les critères suivants sont vérifiables sur le produit et servent de base à la recette. **\[PROPOSÉ\]**

| Réf. | Indicateur | Cible |
| --- | --- | --- |
| IND-1 | Scénarios d'acceptation chiffrés de la section 17 | 100 % conformes |
| IND-2 | Stocks négatifs en base | 0 |
| IND-3 | Mouvements dont la somme diffère du stock courant | 0 |
| IND-4 | Opérations de stock sans mouvement associé | 0 |
| IND-5 | Tests automatiques d'API en échec à chaque livraison | 0 |

## 4. Périmètre du projet

La version 1.0 couvre quatorze modules fonctionnels, de la gestion des comptes aux rapports ; tout ce qui concerne plusieurs sites, les lots, les ventes ou les échanges avec des systèmes externes est exclu.

### 4.1 Fonctionnalités incluses

| Module | Contenu | Statut |
| --- | --- | --- |
| AUT — Authentification | Connexion, jetons d'accès et de renouvellement, déconnexion | **\[VALIDÉ\]** |
| UTI — Utilisateurs et rôles | Création, modification, suppression, 4 rôles | **\[VALIDÉ\]** |
| PRF — Profil | Nom, changement de mot de passe | **\[VALIDÉ\]** |
| UNI — Unités | Catégories, unités, facteurs, conversions | **\[VALIDÉ\]** |
| CAR — Caractéristiques | Types, valeurs par matière | **\[VALIDÉ\]** |
| MAT — Matières | Fiches, unité de stock, seuils, coût, caractéristiques | **\[VALIDÉ\]** |
| PRO — Produits et nomenclature | Fiches, nomenclature, activation | **\[VALIDÉ\]** |
| STO — Stocks et mouvements | Stock courant, 6 types de mouvements, historique | **\[VALIDÉ\]** |
| FAB — Production | Production atomique, annulation, historique | **\[VALIDÉ\]** |
| PLA — Planification | Capacité, vérification, besoins, quantités à acheter | **\[VALIDÉ\]** |
| ACH — Achats | Fournisseurs, commandes, réception | **\[VALIDÉ\]** (ajouté en cours de projet) |
| ALE — Alertes et tableau de bord | Seuils, alertes, indicateurs | **\[VALIDÉ\]** |
| RAP — Rapports et valorisation | Coût moyen, valeur du stock, 3 classements | **\[VALIDÉ\]** (ajouté en cours de projet) |
| PAR — Paramètres | Édition du référentiel (unités, caractéristiques, fournisseurs, utilisateurs) | **\[VALIDÉ\]** |

L'intégration des fonctionnalités Achats et Rapports dans la version 1.0 contredit les documents sources, qui les rangent en « évolution future ». Elle est retenue parce que le porteur les a demandées puis acceptées au cours du projet. **\[RETENU\]**

### 4.2 Fonctionnalités explicitement exclues de la version 1.0

Le MCD (§ 27) écarte « volontairement » une partie de ces éléments pour garder le cœur du système compréhensible. **\[RETENU\]**

| Exclusion | Source |
| --- | --- |
| Plusieurs entrepôts ou emplacements de stockage (WAREHOUSE, WAREHOUSE\_STOCK, STOCK\_LOCATION) | MCD § 27 |
| Lots et numéros de lot (BATCH, LOT) | MCD § 27 |
| Variantes de produit (taille, couleur) | MCD § 27 |
| Catégories de produits et de matières | MCD § 27 |
| Ventes, lignes de vente et clients (SALE, SALE\_ITEM, CUSTOMER) | MCD § 27 |
| Import et export de données (CSV, Excel), impression PDF, étiquettes et codes-barres | Audit |
| Notifications par e-mail ou push | Audit |
| Nomenclatures à plusieurs niveaux (un produit utilisé comme composant) | Conception § 18 (« nomenclature plus avancée ») |
| Rendement, chutes prévues et main-d'œuvre dans le coût d'une production | Audit |
| Plusieurs devises | Audit |
| Statuts intermédiaires de production « en attente » et « en cours » (réservés dans la base) | Conception § 20 |

### 4.3 Limites connues du projet

- Une seule session renouvelable par compte (SEC-12).
- Alertes visibles à l'écran uniquement.
- Interface en français uniquement. **\[HYPOTHÈSE\]**
- Valeur des produits finis = estimation au coût actuel des matières, pas une valeur comptable (RG-41).
- Produits finis comptés en pièces entières (RG-13).

### 4.4 Évolutions

Les fonctionnalités prévues après la version 1.0 sont séparées de celles-ci dans la section 22.

## 5. Utilisateurs et parties prenantes

Les documents nomment quatre rôles (ADMIN, MANAGER, OPERATOR, VIEWER) sans leur attribuer de droits ; la matrice ci-dessous est celle de l'application réalisée, retenue par accord global.

### 5.1 Profils d'utilisateurs

| Rôle | Responsabilité | Besoins spécifiques |
| --- | --- | --- |
| **ADMIN** (administrateur) | Gestion des comptes et des rôles ; tous les droits des autres rôles | Créer des comptes, changer un rôle, retirer un accès |
| **MANAGER** (responsable) | Définit le référentiel (produits, nomenclatures, matières, unités, fournisseurs), pilote les achats, corrige et annule, consulte les rapports | Voir manques et quantités à acheter, valeur du stock, historique complet |
| **OPERATOR** (opérateur) | Enregistre les mouvements courants, lance les productions, réceptionne les commandes | Saisie rapide, contrôle immédiat de la faisabilité |
| **VIEWER** (lecteur) | Consulte | Voir stocks, compositions, historiques et alertes sans pouvoir modifier |

### 5.2 Matrice des droits

Chaque ligne est une action ; « oui » signifie autorisée. Le rôle ADMIN possède toujours les droits de MANAGER. **\[RETENU\]**

| Action | VIEWER | OPERATOR | MANAGER | ADMIN |
| --- | --- | --- | --- | --- |
| Consulter produits, nomenclatures, matières, unités, caractéristiques, stocks, mouvements, productions, fournisseurs, commandes, alertes | oui | oui | oui | oui |
| Consulter les coûts et prix (matières, lignes de commande) | non (EC-02) | non (EC-02) | oui | oui |
| Enregistrer entrée, sortie, perte, retour (matières et produits) | non | oui | oui | oui |
| Lancer une production ; réceptionner une commande | non | oui | oui | oui |
| Enregistrer un ajustement de stock | non | non | oui | oui |
| Annuler une production | non | non | oui | oui |
| Créer ou modifier produits, nomenclatures, matières, unités, catégories, caractéristiques, fournisseurs | non | non | oui | oui |
| Régler les seuils de stock | non | non | oui | oui |
| Créer, modifier, passer, annuler une commande d'achat | non | non | oui | oui |
| Consulter les rapports et la valeur du stock | non | non | oui | oui |
| Gérer les utilisateurs et les rôles | non | non | non | oui |
| Modifier son propre profil et son mot de passe | oui | oui | oui | oui |

L'application réalisée applique cette matrice, **sauf la ligne « coûts et prix »** : aujourd'hui tout utilisateur connecté peut les lire (EC-02).

### 5.3 Autres parties prenantes

| Partie prenante | Rôle dans le projet | Statut |
| --- | --- | --- |
| Porteur du projet | Auteur des spécifications, valide le périmètre et la recette | identité **\[À DÉFINIR\]** |
| Commanditaire / client | Valide le cahier des charges | **\[À DÉFINIR\]** |
| Équipe de développement | Réalise et maintient l'application | composition **\[À DÉFINIR\]** |
| Exploitation | Héberge, sauvegarde, surveille | responsable **\[À DÉFINIR\]** |
| Fournisseurs | Apparaîtssent dans les commandes ; **n'utilisent pas** l'application | **\[VALIDÉ\]** |

### 5.4 Nombre d'utilisateurs

Nombre d'utilisateurs, utilisateurs simultanés et nombre de sites : **\[À DÉFINIR\]**. L'application est conçue pour un site unique (section 4.2).

## 6. Description fonctionnelle

L'application offre 39 fonctionnalités réparties en 13 modules ; chaque fiche indique son acteur, son scénario, ses erreurs et ses critères d'acceptation. Le module Paramètres (PAR) n'a pas de fiche propre : ses écrans sont décrits dans les modules UNI, CAR, ACH et UTI.

| Module | Fiches | Nombre |
| --- | --- | --- |
| AUT — Authentification | F-AUT-01 à 04 | 4 |
| UTI — Utilisateurs | F-UTI-01 à 02 | 2 |
| PRF — Profil | F-PRF-01 à 02 | 2 |
| UNI — Unités | F-UNI-01 à 03 | 3 |
| CAR — Caractéristiques | F-CAR-01 | 1 |
| MAT — Matières | F-MAT-01 à 03 | 3 |
| PRO — Produits et nomenclature | F-PRO-01 à 04 | 4 |
| STO — Stocks et mouvements | F-STO-01 à 04 | 4 |
| FAB — Production | F-FAB-01 à 03 | 3 |
| PLA — Planification | F-PLA-01 à 03 | 3 |
| ACH — Achats | F-ACH-01 à 04 | 4 |
| ALE — Alertes et tableau de bord | F-ALE-01 à 02 | 2 |
| RAP — Rapports | F-RAP-01 à 04 | 4 |

Sauf mention contraire, une fiche est **\[VALIDÉ\]** : fonction réalisée et acceptée. Les codes d'erreur HTTP sont ceux de l'API ; l'interface en affiche le message.

### 6.1 Module AUT — Authentification

#### F-AUT-01 — Connexion

| Champ | Contenu |
| --- | --- |
| Objectif | Ouvrir une session sécurisée |
| Acteur | Tout utilisateur possédant un compte |
| Préconditions | Le compte existe |
| Scénario nominal | 1) L'utilisateur saisit son e-mail et son mot de passe. 2) L'API vérifie le mot de passe. 3) Elle renvoie un jeton d'accès (15 min) et un jeton de renouvellement (7 jours). 4) L'interface ouvre le tableau de bord. |
| Cas alternatifs | Jeton d'accès expiré : renouvellement automatique (F-AUT-02) |
| Cas d'erreur | Identifiants invalides : 401 « Invalid credentials » (même message si le compte n'existe pas) ; e-mail mal formé : 400 |
| Résultat attendu | Session ouverte, menu limité aux pages autorisées pour le rôle |
| Règles | RG-53, RG-54 |
| Critères d'acceptation | Un compte valide atteint le tableau de bord ; un mauvais mot de passe est refusé ; le message est identique pour un compte inconnu |

#### F-AUT-02 — Renouvellement de session

| Champ | Contenu |
| --- | --- |
| Objectif | Prolonger la session sans nouvelle saisie |
| Acteur | Interface (au nom de l'utilisateur) |
| Préconditions | Un jeton de renouvellement valide existe |
| Scénario nominal | 1) Une requête reçoit 401. 2) L'interface envoie le jeton de renouvellement. 3) L'API renvoie une nouvelle paire de jetons et invalide l'ancien jeton. 4) La requête est rejouée. |
| Cas d'erreur | Jeton expiré, déjà utilisé, ou remplacé par une connexion plus récente : 401, retour à l'écran de connexion |
| Résultat attendu | L'utilisateur n'est pas déconnecté pendant 7 jours d'activité |
| Règles | RG-54 |
| Critères d'acceptation | Un jeton de renouvellement ne sert qu'une fois ; un jeton ancien est refusé |

#### F-AUT-03 — Déconnexion

| Champ | Contenu |
| --- | --- |
| Objectif | Terminer la session |
| Acteur | Utilisateur connecté |
| Scénario nominal | 1) L'utilisateur choisit « Se déconnecter ». 2) L'API supprime le jeton de renouvellement côté serveur. 3) L'interface efface la session locale et revient à la connexion. |
| Cas d'erreur | API injoignable : la session locale est quand même effacée |
| Résultat attendu | Le jeton de renouvellement ne peut plus servir |
| Critères d'acceptation | Après déconnexion, le renouvellement avec l'ancien jeton est refusé |

#### F-AUT-04 — Création d'un compte par inscription

| Champ | Contenu |
| --- | --- |
| Objectif | Amorcer le premier compte administrateur |
| Acteur | Visiteur (appel d'API ; l'interface ne propose pas d'écran d'inscription) |
| Scénario nominal | 1) Le visiteur envoie prénom, nom, e-mail, mot de passe (8 caractères minimum). 2) Le compte est créé : **ADMIN** s'il est le premier du système, **VIEWER** sinon. 3) Une session est ouverte. |
| Cas d'erreur | E-mail déjà pris : 409 ; mot de passe trop court : 400 |
| Statut | Comportement actuel **\[VALIDÉ\]** ; fermeture de l'inscription publique **\[RETENU\]** : seul un ADMIN crée les comptes (F-UTI-01), le premier ADMIN étant créé par le jeu de données initial. Écart : EC-01 |
| Règles | RG-50, RG-53 |
| Critères d'acceptation (cible) | Sans compte administrateur, un visiteur ne peut pas créer de compte VIEWER ; le premier ADMIN existe après initialisation |

### 6.2 Module UTI — Utilisateurs

#### F-UTI-01 — Lister et créer des utilisateurs

| Champ | Contenu |
| --- | --- |
| Objectif | Donner un accès à une personne |
| Acteur | ADMIN |
| Scénario nominal | 1) L'admin ouvre Paramètres › Utilisateurs. 2) Il voit nom, e-mail, rôle. 3) Il saisit prénom, nom, e-mail, mot de passe, rôle (VIEWER par défaut). 4) Le compte apparaît dans la liste. |
| Cas d'erreur | Non-admin : 403 ; e-mail déjà utilisé : 409 ; mot de passe < 8 caractères : 400 |
| Règles | RG-50, RG-53 |
| Critères d'acceptation | Un OPERATOR ne voit pas la page ; un compte créé peut se connecter avec le rôle attribué |

#### F-UTI-02 — Modifier le rôle, réinitialiser le mot de passe, supprimer

| Champ | Contenu |
| --- | --- |
| Objectif | Maintenir les accès |
| Acteur | ADMIN |
| Scénario nominal | 1) L'admin change le rôle dans la liste ; l'effet est immédiat. 2) Il peut définir un nouveau mot de passe (la session de la personne est alors invalidée). 3) Il peut supprimer un compte. |
| Cas alternatifs | Compte ayant des mouvements, productions ou commandes : la suppression est refusée (409) |
| Cas d'erreur | Modifier son propre rôle ou se supprimer : 400 |
| Règles | RG-51 |
| Critères d'acceptation | Un admin ne peut ni se rétrograder ni se supprimer ; un compte avec historique n'est pas supprimable |

### 6.3 Module PRF — Profil

#### F-PRF-01 — Modifier son profil

| Champ | Contenu |
| --- | --- |
| Objectif | Corriger son nom |
| Acteur | Tout utilisateur connecté |
| Scénario nominal | Page « Mon profil » : modification du prénom et du nom ; e-mail et rôle affichés sans modification possible |
| Cas d'erreur | Tentative d'envoyer un rôle : 400 (champ refusé) |
| Critères d'acceptation | Le nom modifié apparaît immédiatement dans le menu ; un utilisateur ne peut pas se promouvoir |

#### F-PRF-02 — Changer son mot de passe

| Champ | Contenu |
| --- | --- |
| Objectif | Renouveler son secret |
| Acteur | Tout utilisateur connecté |
| Scénario nominal | 1) L'utilisateur saisit l'ancien mot de passe, le nouveau (8 caractères minimum) et sa confirmation. 2) Les autres sessions sont invalidées. 3) Sa session reste ouverte. |
| Cas d'erreur | Ancien mot de passe faux : 400 ; nouveau identique à l'ancien : 400 ; confirmation différente : message à l'écran |
| Règles | RG-52, RG-53 |
| Critères d'acceptation | L'ancien mot de passe ne permet plus de se connecter ; le nouveau fonctionne ; les sessions antérieures sont refusées |

## 7. Parcours utilisateurs

Six parcours couvrent l'usage de bout en bout, de la mise en route au pilotage ; chaque étape renvoie à sa fiche fonctionnelle.

### 7.1 Parcours 1 — Mise en route (ADMIN puis MANAGER)

1. L'administrateur initial se connecte (F-AUT-01) puis crée les comptes de l'équipe avec leur rôle (F-UTI-01).
2. Le manager contrôle les catégories et unités fournies et ajoute celles qui manquent (F-UNI-01, F-UNI-02).
3. Il définit les caractéristiques utiles (F-CAR-01).
4. Il crée les matières avec unité, seuils, coût et caractéristiques (F-MAT-01).
5. Il crée les produits et leur nomenclature (F-PRO-01, F-PRO-02).
6. Un opérateur enregistre le stock initial par des entrées (F-STO-02).
7. Le manager règle les seuils d'alerte (F-STO-04).

### 7.2 Parcours 2 — Produire

1. L'opérateur ouvre la fiche du produit et lit la capacité (F-PLA-01).
2. Il saisit la quantité voulue et lance la vérification (F-PLA-02).
3. Si tout est disponible, il confirme : matières retirées, produits ajoutés, mouvements et production enregistrés en une transaction (F-FAB-01).
4. L'historique de production affiche la ligne ; le stock des produits a augmenté.
5. Si des matières manquent, la confirmation est refusée et le parcours 3 commence.

### 7.3 Parcours 3 — Approvisionner

1. Le manager constate une production impossible ou une alerte de stock (F-ALE-01).
2. Il crée un brouillon de commande prérempli avec les manques (F-PLA-03) et choisit le fournisseur (F-ACH-02).
3. Il renseigne les prix s'ils sont connus, puis passe la commande (F-ACH-03).
4. À la livraison, un opérateur ou un manager réceptionne la commande (F-ACH-04) : les entrées de stock sont créées et le coût moyen est mis à jour (F-RAP-01).
5. L'opérateur peut alors relancer la production (parcours 2).

### 7.4 Parcours 4 — Corriger une erreur

1. Stock faux après inventaire : le manager enregistre un ajustement avec un motif (F-STO-02) ; l'historique conserve la trace (F-STO-03).
2. Production saisie par erreur : le manager l'annule (F-FAB-02), ce qui remet les matières en stock, à condition que les produits fabriqués soient encore en stock.
3. Matière ou produit abandonné : le manager le supprime, ce qui le désactive s'il a un historique (F-MAT-02, F-PRO-03).

### 7.5 Parcours 5 — Piloter (MANAGER)

1. À la connexion, le tableau de bord montre les alertes et le stock des produits (F-ALE-02).
2. Le manager ouvre les rapports : valeur du stock (F-RAP-02), production mensuelle (F-RAP-03), classements (F-RAP-04).
3. Il en déduit les seuils à ajuster (F-STO-04) et les achats à prévoir.

### 7.6 Parcours 6 — Consulter (VIEWER)

1. Le lecteur se connecte et voit le tableau de bord.
2. Il consulte produits, nomenclatures, stocks, historiques de mouvements et de productions, commandes (F-PRO-04, F-STO-01, F-STO-03, F-FAB-03).
3. Il ne voit ni les boutons de modification ni, une fois EC-02 corrigé, les coûts.

## 8. Règles métier

Les 35 règles ci-dessous sont la seule source des règles de gestion ; les fiches de la section 6 y renvoient par leur identifiant. Le statut vaut pour toute la ligne.

### 8.1 Référentiel

| ID | Règle | Statut |
| --- | --- | --- |
| RG-01 | Le SKU d'un produit et celui d'une matière sont uniques dans leur catalogue ; format : lettres, chiffres, point, tiret, souligné, 100 caractères maximum. | **\[VALIDÉ\]** |
| RG-02 | Toute matière a une unité de stock ; toute unité appartient à une catégorie et porte un facteur strictement positif vers l'unité de référence de la catégorie (m = 1, cm = 0,01). Les codes d'unité, de catégorie et de caractéristique sont uniques. | **\[VALIDÉ\]** |
| RG-03 | Une conversion n'est possible qu'entre unités de la même catégorie ; sinon l'opération est refusée (2 m + 5 kg est interdit). | **\[VALIDÉ\]** |
| RG-04 | Le facteur et la catégorie d'une unité sont figés dès que l'unité est utilisée (matière, ligne de nomenclature, mouvement, ligne de commande). Nom, symbole et code restent modifiables. | **\[VALIDÉ\]** |
| RG-05 | Une caractéristique est de type Texte, Nombre ou Oui/Non ; la valeur est contrôlée selon le type. Une matière porte **au plus une valeur** par caractéristique. Le type est figé tant qu'une matière utilise la caractéristique ; la caractéristique utilisée ne peut pas être supprimée. | **\[VALIDÉ\]** pour le contrôle ; « une valeur » **\[RETENU\]** (Q3) |
| RG-06 | Une nomenclature contient au plus une ligne par matière ; quantité strictement positive ; unité de la même catégorie que celle de la matière ; matière active. Un produit sans nomenclature est autorisé mais non productible. | **\[VALIDÉ\]** ; produit sans nomenclature **\[RETENU\]** |
| RG-07 | L'unité de stock d'une matière ne change plus dès qu'elle figure dans une nomenclature, a des mouvements ou un stock non nul. | **\[VALIDÉ\]** |
| RG-08 | Supprimer un produit, une matière ou un fournisseur référencé le désactive ; un élément inactif n'est plus proposé pour une nouvelle nomenclature, un nouveau mouvement, une nouvelle commande ou une nouvelle production ; il est réactivable. Une unité, une catégorie ou une caractéristique référencée ne peut pas être supprimée (409). | **\[VALIDÉ\]** |

### 8.2 Stocks et mouvements

| ID | Règle | Statut |
| --- | --- | --- |
| RG-10 | Le stock courant de chaque matière et de chaque produit est une valeur enregistrée, modifiée dans la même transaction que le mouvement qui l'explique ; pour les données créées par l'application, la somme des mouvements d'un élément égale son stock. Les données de démonstration font exception (elles sont injectées sans mouvements : EC-13). | **\[VALIDÉ\]** (MCD § 24) |
| RG-11 | Un mouvement est signé (négatif pour une sortie), horodaté, attribué à un utilisateur, et ne peut ni être modifié ni supprimé ; une correction est un nouveau mouvement. | **\[VALIDÉ\]** (MCD règle 7) ; signe **\[RETENU\]** (I1) |
| RG-12 | Sens par type : ENTRY et RETURN ajoutent ; EXIT et LOSS retirent ; ADJUSTMENT est signé et non nul ; PRODUCTION n'est créé que par une production ou son annulation, jamais en saisie manuelle. | **\[VALIDÉ\]** |
| RG-13 | La quantité d'un mouvement est convertie dans l'unité de stock de l'élément avant enregistrement. Les produits finis sont comptés en pièces (unité PCS) et les productions portent sur des quantités entières. | **\[VALIDÉ\]** pour la conversion ; pièces entières **\[RETENU\]** (Q6) |
| RG-14 | Un stock ne devient jamais négatif : l'opération est refusée (409), même si deux opérations arrivent en même temps. | **\[VALIDÉ\]** (MCD § 26) |
| RG-15 | Un mouvement concerne une matière ou un produit, jamais les deux. | **\[RETENU\]** (I7) |
| RG-16 | Seuils : pour une matière, minimum ≥ 0 (0 par défaut) et maximum facultatif ≥ minimum ; pour un produit fini, minimum ≥ 0 (0 = aucune alerte). | **\[VALIDÉ\]** pour les matières ; produits **\[VALIDÉ\]** (ajout en cours de projet) |
| RG-17 | Alerte « rupture » si le stock d'une matière est 0 ; alerte « stock faible » si 0 < stock ≤ seuil minimum (seuil > 0). Pour un produit, alerte seulement si le seuil est > 0 et le stock ≤ seuil. | **\[VALIDÉ\]** |

### 8.3 Production et planification

| ID | Règle | Statut |
| --- | --- | --- |
| RG-20 | Une production porte sur un produit actif ayant une nomenclature, pour une quantité entière strictement positive. | **\[VALIDÉ\]** ; quantité entière **\[RETENU\]** |
| RG-21 | Besoin d'une matière = quantité produite × quantité de nomenclature, convertie dans l'unité de stock. Une production est refusée si un stock est inférieur au besoin, avec la liste des manques. | **\[VALIDÉ\]** (MCD règle 5) |
| RG-22 | Une production est atomique : vérification, retrait des matières, ajout des produits, mouvements et enregistrement réussissent ensemble ou ne changent rien. Les mouvements portent la référence PROD-nnnnn. | **\[VALIDÉ\]** (Conception § 22) |
| RG-23 | Capacité = minimum, sur les matières de la nomenclature, de la partie entière de (stock ÷ besoin unitaire). Les matières qui atteignent ce minimum sont dites limitantes. | **\[VALIDÉ\]** (MCD § 22) |
| RG-24 | Quantité à acheter d'une matière = max(besoin − stock ; 0). | **\[VALIDÉ\]** (MCD § 23) |
| RG-25 | Seule une production terminée peut être annulée, une fois. L'annulation inverse tous ses mouvements en une transaction ; elle est refusée si les produits fabriqués ne sont plus en stock ; elle reste possible si un élément a été désactivé depuis. | **\[VALIDÉ\]** (ajout en cours de projet) |
| RG-26 | Les statuts de production « en attente » et « en cours » sont réservés ; une production créée est immédiatement terminée. | **\[RETENU\]** (Q5) |

### 8.4 Achats

| ID | Règle | Statut |
| --- | --- | --- |
| RG-30 | Cycle d'une commande : brouillon → commandée → reçue ; annulation possible depuis brouillon ou commandée ; toute autre transition est refusée (409). Seul un brouillon est modifiable. | **\[VALIDÉ\]** |
| RG-31 | Une commande a au moins une ligne, un fournisseur actif, au plus une ligne par matière, une quantité > 0 et une unité de la même catégorie que la matière. | **\[VALIDÉ\]** |
| RG-32 | La réception se fait une seule fois, intégralement, et crée une entrée de stock par ligne (référence PO-nnnnn). | **\[VALIDÉ\]** ; réception partielle **\[À CONFIRMER\]** |
| RG-33 | Le prix d'une ligne est facultatif, ≥ 0, exprimé par unité de la ligne. | **\[VALIDÉ\]** |

### 8.5 Coûts et rapports

| ID | Règle | Statut |
| --- | --- | --- |
| RG-40 | Le coût unitaire d'une matière (par unité de stock, ≥ 0) est la moyenne pondérée des réceptions avec prix ; une ligne sans prix ne le change pas ; il est modifiable à la main. | **\[VALIDÉ\]** |
| RG-41 | Valeur d'une matière = stock × coût ; valeur d'un produit fini = stock × coût de sa nomenclature aux coûts actuels. C'est une estimation, non une valeur comptable. | **\[VALIDÉ\]** |
| RG-42 | La production mensuelle exclut les productions annulées ; la consommation d'une matière est nette des annulations ; les pertes sont comptées à part. | **\[VALIDÉ\]** |

### 8.6 Comptes et sessions

| ID | Règle | Statut |
| --- | --- | --- |
| RG-50 | Premier compte du système créé par inscription = ADMIN, les suivants = VIEWER. Cible : plus d'inscription publique ; seul un ADMIN crée les comptes. | comportement actuel **\[VALIDÉ\]** ; cible **\[RETENU\]** (EC-01) |
| RG-51 | Un administrateur ne peut ni changer son propre rôle ni supprimer son compte ; un compte ayant un historique n'est pas supprimable. | **\[VALIDÉ\]** |
| RG-52 | Changer son mot de passe exige l'ancien et invalide les autres sessions. | **\[VALIDÉ\]** |
| RG-53 | L'e-mail est unique ; le mot de passe fait 8 caractères minimum. Politique plus stricte : **\[À DÉFINIR\]**. | **\[VALIDÉ\]** |
| RG-54 | Jeton d'accès valable 15 minutes ; jeton de renouvellement valable 7 jours, à usage unique ; un compte n'a qu'une session renouvelable à la fois. | **\[VALIDÉ\]** |

## 9. Données et gestion des données

Le modèle comporte 15 tables PostgreSQL ; le MLD (69 p.) reste le document de référence des colonnes et le schéma Prisma du dépôt en est la traduction exécutable, complétée par des contraintes SQL.

### 9.1 Données manipulées

« Obl. » = champs obligatoires ; « Fac. » = facultatifs. Chaque table a un identifiant entier généré sauf indication.

| Table | Contenu | Obl. | Fac. | Source |
| --- | --- | --- | --- | --- |
| users | Comptes | prénom, nom, e-mail unique, mot de passe chiffré, rôle, dates | jeton de renouvellement chiffré | MCD/MLD |
| products | Produits finis | nom (150), SKU unique (100), actif, dates | description | MCD/MLD |
| materials | Matières | nom (150), SKU unique (100), unité, coût unitaire (≥ 0, 0 par défaut), actif, dates | description | MCD/MLD ; coût ajouté |
| unit\_categories | Catégories d'unités | nom (100), code unique (50) | — | MCD/MLD |
| units | Unités | nom (100), symbole (20), code unique (50), catégorie, facteur > 0, date | — | MCD/MLD |
| characteristics | Types de caractéristiques | nom (100), code unique (50), type | — | MCD/MLD |
| material\_characteristics | Valeur d'une caractéristique pour une matière ; clé = (matière, caractéristique) | valeur (255) | — | MCD/MLD |
| product\_materials | Lignes de nomenclature ; unique (produit, matière) | quantité > 0, unité | — | MCD/MLD |
| material\_stocks | Stock courant d'une matière (1 par matière) | quantité ≥ 0, minimum ≥ 0 | maximum | MCD/MLD |
| product\_stocks | Stock courant d'un produit (1 par produit) | quantité ≥ 0, minimum ≥ 0 | — | MCD/MLD ; minimum ajouté |
| stock\_movements | Historique des mouvements | type, quantité signée, unité, auteur, date, matière ou produit | motif (255), référence (100) | MCD/MLD |
| productions | Opérations de fabrication | produit, quantité > 0, statut, auteur, date | date de fin | MCD/MLD |
| suppliers | Fournisseurs | nom (150), actif, date | contact, e-mail, téléphone | Conception § 38 |
| purchase\_orders | Commandes d'achat | fournisseur, statut, auteur, date | notes (500), dates de commande et de réception | Conception § 38 |
| purchase\_order\_lines | Lignes de commande ; unique (commande, matière) | matière, quantité > 0, unité | prix unitaire (≥ 0) | ajout en cours de projet |

Toutes les quantités, coûts et facteurs sont en décimal exact à 20 chiffres dont 8 après la virgule (jamais en virgule flottante) : MLD § 24. **\[VALIDÉ\]**

### 9.2 Relations importantes

| Relation | Cardinalité | Suppression |
| --- | --- | --- |
| Catégorie → unités | 1 — N | refusée si la catégorie a des unités |
| Unité → matières, nomenclatures, mouvements, lignes de commande | 1 — N | refusée si l'unité est utilisée |
| Produit → nomenclature → matière | N — N via product\_materials | nomenclature supprimée avec le produit ; matière utilisée non supprimable |
| Matière → caractéristiques | N — N via material\_characteristics | valeurs supprimées avec la matière ; caractéristique utilisée non supprimable |
| Matière / produit → stock courant | 1 — 1 | supprimé avec l'élément |
| Matière / produit → mouvements | 1 — N | élément non supprimable s'il a des mouvements (il est désactivé) |
| Produit → productions | 1 — N | idem |
| Utilisateur → mouvements, productions, commandes | 1 — N | utilisateur non supprimable s'il a un historique |
| Fournisseur → commandes → lignes | 1 — N — N | fournisseur avec commandes désactivé ; lignes supprimées avec leur commande |

### 9.3 Cycle de vie et conservation

- **Création** : toute matière ou tout produit créé reçoit immédiatement sa ligne de stock à 0.
- **Vie** : actif → désactivé → réactivable ; la suppression physique n'a lieu que pour un élément sans historique.
- **Mouvements et productions** : conservés sans limite, jamais modifiés ni supprimés par l'application (RG-11).
- **Durée de conservation, archivage et purge** : **\[À DÉFINIR\]**.
- **Données personnelles** : nom, prénom et e-mail des utilisateurs ; mot de passe et jeton stockés sous forme chiffrée (hachage). Un utilisateur ayant un historique ne peut pas être supprimé ; la réglementation applicable et le droit à l'effacement sont **\[À DÉFINIR\]**.
- **Volumétrie** (références, mouvements par an) : **\[À DÉFINIR\]**. Des index existent sur les SKU, les e-mails, les mouvements (par matière ou produit et date, par référence) et les productions (par produit).

### 9.4 Contraintes portées par la base

La base interdit elle-même les incohérences, en plus des contrôles de l'API. **\[VALIDÉ\]** (Conception § 27, MCD § 26)

- unicité : e-mail, SKU produit, SKU matière, code d'unité, de catégorie et de caractéristique, (produit, matière) en nomenclature, (commande, matière) en commande ;
- quantités de stock ≥ 0 ; quantité de nomenclature, de production et de ligne de commande > 0 ; facteur d'unité > 0 ; coût, prix et seuil minimum ≥ 0 ;
- un mouvement renvoie à une matière ou à un produit (au moins l'un des deux).

### 9.5 Données initiales

Un jeu d'initialisation crée les catégories et unités (m, cm, mm, kg, g, L, ml, pcs, m²), cinq caractéristiques et le compte administrateur. Un jeu de démonstration facultatif ajoute l'exemple Pantalon Jean ; il est injecté sans mouvements, donc **inutilisable en production** (EC-13). Les identifiants du compte administrateur initial doivent être changés à la mise en production (SEC-09). **\[VALIDÉ\]**

## 10. Interfaces et expérience utilisateur

L'interface est une application web à 21 pages, organisée autour d'un menu latéral filtré par rôle ; elle suit l'arborescence de la Conception § 33 à quelques regroupements près.

### 10.1 Écrans

| Adresse | Écran | Rôles | Fiches |
| --- | --- | --- | --- |
| `/login` | Connexion | public | F-AUT-01 |
| `/` | Tableau de bord | tous | F-ALE-02 |
| `/products` | Liste des produits (recherche, inactifs, pagination) | tous | F-PRO-04 |
| `/products/new`, `/products/{id}/edit` | Création et modification (avec éditeur de nomenclature) | MANAGER+ | F-PRO-01, 02 |
| `/products/{id}` | Fiche produit : stock, capacité, nomenclature, vérification et production | tous (production : OPERATOR+) | F-PRO-04, F-PLA-01 à 03, F-FAB-01 |
| `/materials` | Liste des matières | tous | F-MAT-03 |
| `/materials/new`, `/materials/{id}` | Création et modification d'une matière | MANAGER+ | F-MAT-01, 02 |
| `/stock` | Stocks, saisie d'un mouvement, historique filtrable | tous (saisie : OPERATOR+) | F-STO-01 à 03 |
| `/production` | Historique des productions, annulation | tous (annulation : MANAGER+) | F-FAB-02, 03 |
| `/purchases`, `/purchases/{id}` | Liste et détail des commandes, passage, réception | tous (actions : voir F-ACH) | F-ACH-03, 04 |
| `/purchases/new`, `/purchases/{id}/edit` | Création et modification d'un brouillon | MANAGER+ | F-ACH-02 |
| `/reports` | Rapports et valeur du stock | MANAGER+ | F-RAP-01 à 04 |
| `/settings/units` | Catégories et unités | lecture tous, édition MANAGER+ | F-UNI-01, 02 |
| `/settings/characteristics` | Caractéristiques | idem | F-CAR-01 |
| `/settings/suppliers` | Fournisseurs | idem | F-ACH-01 |
| `/settings/users` | Utilisateurs | ADMIN | F-UTI-01, 02 |
| `/profile` | Mon profil | tous | F-PRF-01, 02 |

### 10.2 Navigation

Le menu latéral contient Dashboard, Produits, Matières, Stocks, Production, Achats, Rapports (managers), Paramètres, puis le nom de l'utilisateur (lien vers le profil) et la déconnexion. Une page réservée à un rôle supérieur affiche « Accès refusé » ; l'API applique de toute façon les mêmes droits.

Par rapport à la Conception § 33, trois regroupements diffèrent : « Stocks › Matières / Produits / Mouvements » tient sur une seule page ; « Production › Nouvelle production / Calcul de capacité » se fait depuis la fiche produit ; « Paramètres » gagne un onglet Fournisseurs. **\[PROPOSÉ\]**

### 10.3 Composants principaux

- Tableaux avec pagination, recherche et filtres ; pastilles d'état (actif, inactif, stock faible, statut de commande ou de production).
- Formulaires à lignes dynamiques : nomenclature, caractéristiques, lignes de commande ; listes d'unités limitées à la catégorie de la matière.
- Édition en ligne dans les paramètres ; confirmation avant toute suppression, annulation ou réception.
- Graphique en barres (production mensuelle), barres horizontales (classements), compteurs, avec un tableau de données repliable sous chaque graphique.

### 10.4 États de l'interface

| État | Comportement attendu |
| --- | --- |
| Chargement | Zone vide ou message bref ; pas de blocage de la page |
| Liste vide | Message « Aucun résultat » |
| Erreur de saisie ou de règle | Message rouge en clair sous le formulaire (texte de l'API) |
| Succès | Redirection vers la fiche ou la liste ; message vert pour les mouvements et le profil |
| Opération refusée par le stock | Liste des matières manquantes avec quantités |
| Session expirée | Renouvellement silencieux, sinon retour à la connexion |
| Droit insuffisant | Boutons absents, ou « Accès refusé » sur adresse directe |

Les messages d'erreur de l'API sont aujourd'hui en anglais et affichés tels quels dans une interface en français : traduction **\[À CONFIRMER\]**.

### 10.5 Responsive et accessibilité

- **Responsive** : mise en page flexible (menu en colonne puis latéral, tableaux défilants, formulaires en grille). Aucune recette sur téléphone ou tablette n'a été faite : appareils cibles **\[À DÉFINIR\]**.
- **Accessibilité** : champs étiquetés, erreurs annoncées (rôle alerte), thème clair/sombre selon le système, couleurs de graphique validées pour le contraste et le daltonisme, information jamais portée par la couleur seule (texte et tableau de données). Aucun audit n'a été réalisé ; niveau visé (par exemple WCAG 2.1 AA) **\[À DÉFINIR\]**.
- **Langue** : interface en français, devise paramétrable (EUR par défaut) **\[HYPOTHÈSE\]**.

### 10.6 Principes UX/UI déjà définis

- Le frontend ne contient pas de logique métier critique : il affiche et appelle l'API (Conception § 44). **\[VALIDÉ\]**
- Prévisualiser avant de confirmer une production : nécessaire, disponible, manquant par matière (Conception § 36). **\[VALIDÉ\]**
- Tableau de bord d'abord : compteurs, alertes, matières bientôt épuisées (Conception § 34). **\[VALIDÉ\]**
- Fiche produit centrale : SKU, stock, nomenclature, capacité, bouton Produire (Conception § 35). **\[VALIDÉ\]**
- Bibliothèque de composants : la Conception évoque shadcn/ui ; l'application utilise des composants Tailwind maison. Maintien ou migration **\[À CONFIRMER\]** (EC-14).

## 11. Architecture et exigences techniques

L'application est un frontend web, une API REST et une base PostgreSQL ; la pile retenue est celle recommandée par la Conception § 23 et mise en œuvre. **\[VALIDÉ\]**

### 11.1 Vue d'ensemble

Trois couches séparées, avec une responsabilité chacune (Conception § 44) : l'interface affiche, l'API applique toutes les règles, la base garantit l'intégrité.

&#91;embedded content: architecture en trois couches · 4 niveaux\]

Le navigateur ne parle qu'à l'API ; seule l'API parle à la base, à travers Prisma.

### 11.2 Technologies

| Couche | Technologie | Version réelle | Statut |
| --- | --- | --- | --- |
| Frontend | Next.js, React, TypeScript strict, Tailwind CSS | Next.js 16, React 19, TypeScript 5.9, Tailwind 4 | **\[VALIDÉ\]** |
| Bibliothèque de composants | shadcn/ui (citée en Conception) | composants Tailwind maison | **\[À CONFIRMER\]** (EC-14) |
| Backend | NestJS, TypeScript, REST, Swagger/OpenAPI | NestJS 11 | **\[VALIDÉ\]** |
| Validation | class-validator ; Zod (cité en Conception) | class-validator seul | **\[À CONFIRMER\]** (EC-14) |
| Base de données | PostgreSQL, Prisma | PostgreSQL 16, Prisma 6 | **\[VALIDÉ\]** |
| Authentification | JWT et jetons de renouvellement | mots de passe hachés (bcrypt) | **\[VALIDÉ\]** |
| Tests | Jest, Supertest | Jest 30 | **\[VALIDÉ\]** |
| Infrastructure | Docker, Docker Compose, Git, GitHub, GitHub Actions | Node 22, PostgreSQL 16 en conteneur | **\[VALIDÉ\]** |

Deux versions plus récentes ont été écartées car elles cassent la chaîne d'outils : NestJS 12 (modules ES uniquement) et TypeScript 7 (sans l'interface attendue par ts-node et ts-jest). Les versions sont bornées dans les fichiers `package.json`. **\[VALIDÉ\]**

### 11.3 API

- REST en JSON ; documentation interactive Swagger/OpenAPI sur `/docs` ; liste des routes en annexe B.
- Entrées validées strictement : les champs inconnus sont refusés (400).
- Codes utilisés : 200, 201, 204, 400 (données invalides), 401 (non authentifié), 403 (rôle insuffisant), 404, 409 (conflit : doublon, référence existante, stock insuffisant). Corps d'erreur : `statusCode` et `message`.
- Les listes paginées acceptent `limit` (1 à 200) et `offset` et renvoient le total dans l'en-tête `X-Total-Count`.
- Versionnement de l'API (préfixe `/v1`) : absent. **\[À CONFIRMER\]**

### 11.4 Base de données

- PostgreSQL 16 ; schéma Prisma ; migrations versionnées dans le dépôt (initiale, achats, coûts et seuil produit), contraintes CHECK incluses.
- Les opérations de stock et de production passent par des transactions ; la mise à jour d'un stock est une écriture unique conditionnelle, qui interdit le stock négatif même avec deux opérations simultanées ; la réception d'une commande verrouille la ligne de stock pour calculer le coût moyen.

### 11.5 Stockage et services externes

Aucun stockage de fichiers (pas de pièces jointes ni d'images) et aucun service externe (section 14). Les données sont uniquement dans PostgreSQL ; la session est conservée dans le navigateur.

### 11.6 Infrastructure

- Docker Compose décrit trois services (base, API, frontend). Son fonctionnement complet n'a pas été testé par la rédaction : seuls la base et les deux applications lancées séparément l'ont été (EC-11).
- Intégration continue GitHub Actions : API (installation, génération du client, vérification des types, migrations, tests unitaires et d'API, compilation) et frontend (installation, compilation, vérification des types). Le workflow n'a jamais été exécuté (EC-11). L'étape de déploiement de la Conception § 43 n'existe pas.
- Hébergement cible, domaine, certificat, ressources : **\[À DÉFINIR\]** (section 18).

### 11.7 Contraintes techniques

- Node 22 ; PostgreSQL 16 ; développement possible sous Windows, macOS et Linux (commandes npm portables).
- Quantités en décimal exact ; aucun calcul de quantité en virgule flottante côté API.
- Mono-dépôt avec deux dossiers, `backend` et `frontend` (la structure `apps/` du MLD § 30 n'a pas été retenue). **\[PROPOSÉ\]**

## 12. Sécurité

Sur 19 exigences de sécurité, 8 sont satisfaites par l'application actuelle et 11 sont soit des correctifs à faire avant la mise en production, soit des points à décider. Aucun élément de la Conception ne traite la sécurité au-delà de « JWT + Refresh Tokens » et de la validation côté API (§ 44) : les exigences ci-dessous sont donc **\[PROPOSÉ\]** sauf mention.

### 12.1 Exigences

« État » décrit l'application à la date du document.

| ID | Thème | Exigence | Statut | État |
| --- | --- | --- | --- | --- |
| SEC-01 | Authentification | Connexion par e-mail et mot de passe ; jetons JWT signés avec des secrets configurables ; accès 15 min, renouvellement 7 jours | **\[VALIDÉ\]** | réalisé |
| SEC-02 | Authentification | Mots de passe jamais stockés en clair (hachage bcrypt) ; jeton de renouvellement stocké haché | **\[VALIDÉ\]** | réalisé |
| SEC-03 | Authentification | Renouvellement à usage unique, révocation à la déconnexion et au changement de mot de passe | **\[VALIDÉ\]** | réalisé |
| SEC-04 | Autorisation | Chaque route vérifie le rôle côté API ; l'interface ne fait que masquer (Conception § 44) | **\[VALIDÉ\]** | réalisé |
| SEC-05 | Sécurité de l'API | Entrées validées, champs inconnus refusés, identifiants et paramètres contrôlés | **\[VALIDÉ\]** | réalisé |
| SEC-06 | Sécurité de l'API | Accès à la base par l'ORM et requêtes paramétrées (pas d'injection SQL) | **\[VALIDÉ\]** | réalisé |
| SEC-07 | Protection des données | Coûts, prix et valeur du stock visibles des seuls MANAGER et ADMIN | **\[RETENU\]** | **non réalisé** (EC-02) |
| SEC-08 | Authentification | Pas d'inscription publique ; comptes créés par un ADMIN | **\[RETENU\]** | **non réalisé** (EC-01) |
| SEC-09 | Secrets | Secrets JWT, mot de passe administrateur et base fournis par variables d'environnement propres à chaque environnement ; aucune valeur par défaut en production ; données de démonstration désactivées | **\[PROPOSÉ\]** | **non réalisé** (EC-06, EC-13) |
| SEC-10 | Sécurité de l'API | Origines autorisées (CORS) limitées au domaine du frontend | **\[PROPOSÉ\]** | **non réalisé** (EC-03) |
| SEC-11 | Authentification | Limitation des tentatives de connexion (blocage temporaire après échecs répétés) | **\[PROPOSÉ\]** | **non réalisé** (EC-04) |
| SEC-12 | Authentification | Une seule session renouvelable par compte ; une nouvelle connexion interrompt le renouvellement de la précédente | **\[VALIDÉ\]** (limite connue) | réalisé ; autre choix à décider |
| SEC-13 | Sécurité de l'API | HTTPS obligatoire en production ; en-têtes de sécurité HTTP | **\[PROPOSÉ\]** | **non réalisé** (EC-05) |
| SEC-14 | Protection des données | Stockage des jetons côté navigateur : voir options 12.2 | **\[À CONFIRMER\]** | localStorage |
| SEC-15 | Journalisation | Tout mouvement de stock, toute production et toute commande portent l'auteur et la date ; journal d'audit des modifications du référentiel et des comptes | mouvements **\[VALIDÉ\]** ; reste **\[À DÉFINIR\]** | partiel (EC-12) |
| SEC-16 | Sauvegardes | Sauvegarde régulière de la base, test de restauration, chiffrement des copies | **\[À DÉFINIR\]** | non réalisé (EC-07) |
| SEC-17 | Sécurité de l'API | Les erreurs ne divulguent ni trace interne ni détail d'infrastructure | **\[PROPOSÉ\]** | réalisé pour les cas courants, à vérifier en recette |
| SEC-18 | Maintenance | Audit régulier des dépendances (vulnérabilités connues) et mise à jour des correctifs | **\[PROPOSÉ\]** | non réalisé |
| SEC-19 | Sécurité de l'API | Documentation Swagger désactivée ou protégée en production | **\[PROPOSÉ\]** | **non réalisé** (accessible sans connexion) |

### 12.2 Décisions à prendre : trois choix qui ont plusieurs options

| Sujet | Option A | Option B | Implication |
| --- | --- | --- | --- |
| Stockage des jetons (SEC-14) | Navigateur (localStorage) : situation actuelle, simple | Cookies sécurisés non lisibles par le script (HttpOnly, SameSite) | B réduit l'effet d'une faille d'injection de script, mais exige que frontend et API partagent un domaine ou une configuration CORS avec cookies, et des changements dans l'API et l'interface |
| Sessions par compte (SEC-12) | Une session renouvelable (actuel) | Plusieurs sessions (une par appareil) | B convient si un même compte sert sur plusieurs postes ; il demande de stocker plusieurs jetons par utilisateur |
| Authentification renforcée | Mot de passe seul (actuel) | Deuxième facteur (application ou e-mail) | B améliore la sécurité ; l'e-mail suppose un service d'envoi (section 14) |

La rédaction recommande A pour les trois sujets en version 1.0, à réexaminer selon l'hébergement et le public (internet ou réseau interne) qui sont **\[À DÉFINIR\]**. **\[PROPOSÉ\]**

### 12.3 Politique de mot de passe

Aujourd'hui : 8 caractères minimum (RG-53). Complexité, durée de vie, historique et réinitialisation par e-mail (absente : un ADMIN définit un nouveau mot de passe) : **\[À DÉFINIR\]**.

## 13. Exigences non fonctionnelles

Aucune volumétrie, aucun SLA ni aucune contrainte d'hébergement n'ont été fournis. Les cibles chiffrées sont donc **\[À DÉFINIR\]** ; seuls les faits constatés dans l'implémentation sont notés **\[VALIDÉ\]**.

| ID | Domaine | Exigence | Statut |
| --- | --- | --- | --- |
| NF-01 | Intégrité | Toute opération de stock (mouvement, production, annulation, réception de commande) s'exécute dans une transaction unique : tout réussit ou rien n'est enregistré. | VALIDÉ |
| NF-02 | Intégrité | Le stock n'est jamais négatif (mise à jour conditionnelle en base). | VALIDÉ |
| NF-03 | Précision | Quantités, coûts et prix sont stockés en type décimal (pas de flottants binaires). | VALIDÉ |
| NF-04 | Traçabilité | Les mouvements de stock sont immuables ; toute correction passe par un mouvement inverse. | VALIDÉ |
| NF-05 | Performance | Temps de réponse des écrans de consultation : cible chiffrée (ex. 95 % sous X s) pour un volume de N produits / matières. | À DÉFINIR |
| NF-06 | Performance | Les listes sont paginées (limite 1 à 200, en-tête X-Total-Count). | VALIDÉ |
| NF-07 | Volumétrie | Nombre d'utilisateurs simultanés, de produits, de matières et de mouvements par an à supporter. | À DÉFINIR |
| NF-08 | Disponibilité | Taux de disponibilité attendu et plage de maintenance. | À DÉFINIR |
| NF-09 | Sauvegarde | Fréquence, rétention et test de restauration de la base PostgreSQL. | À DÉFINIR |
| NF-10 | Évolutivité | API sans état (JWT) : plusieurs instances possibles derrière un répartiteur ; la base reste le point unique. | VALIDÉ |
| NF-11 | Maintenabilité | Code TypeScript typé, modules séparés, migrations Prisma versionnées, validation des entrées par DTO. | VALIDÉ |
| NF-12 | Testabilité | Tests automatisés backend (Jest/Supertest) sur les règles métier ; aucun test frontend automatisé à ce jour. | VALIDÉ (écart : tests frontend absents) |
| NF-13 | Portabilité | Exécution via Docker Compose ; Node 22 ; PostgreSQL 16. | VALIDÉ |
| NF-14 | Compatibilité | Navigateurs supportés (liste et versions minimales). | À DÉFINIR |
| NF-15 | Accessibilité | Niveau visé (ex. RGAA / WCAG AA) ; actuellement : libellés, focus et contrastes soignés sans audit. | À DÉFINIR |
| NF-16 | Observabilité | Journalisation applicative, route de santé (health), métriques, alertes d'exploitation. | À DÉFINIR (route de santé et journaux structurés absents : EC) |
| NF-17 | Langue | Interface en français ; API et code en anglais (vocabulaire du domaine). | VALIDÉ |
| NF-18 | Internationalisation | Autres langues, formats de devise et de date. | À DÉFINIR |
| NF-19 | Conformité | Données personnelles limitées aux comptes utilisateurs (nom, e-mail) ; exigences RGPD (durée de conservation, droit à l'effacement). | À CONFIRMER |
| NF-20 | Intégration continue | Pipeline de build, lint et tests à chaque modification ; le workflow existe mais n'a jamais été exécuté. | VALIDÉ (non vérifié) |

### 13.1 Points d'attention

- NF-05, NF-07, NF-08 et NF-09 conditionnent le dimensionnement et le choix d'hébergement (section 18).
- NF-16 et NF-19 sont liés à la sécurité (section 12) et à l'exploitation.

## 14. Intégrations et interfaces externes

Aucune intégration externe n'est implémentée ni exigée par les documents sources. Les pistes ci-dessous sont des **options** à trancher.

| ID | Interface | Description | Statut |
| --- | --- | --- | --- |
| INT-01 | API REST interne | Contrat entre le frontend et le backend, documenté par Swagger (/docs), format JSON, authentification Bearer JWT. | VALIDÉ |
| INT-02 | Base de données | PostgreSQL 16 via Prisma ; seul le backend y accède. | VALIDÉ |
| INT-03 | Export de données (CSV / Excel) des rapports et listes | Non implémenté ; utile pour la comptabilité et l'inventaire papier. | À CONFIRMER |
| INT-04 | Import de données initiales (matières, produits, stocks) | Aujourd'hui : seed technique uniquement. Import par fichier à envisager pour la mise en service. | À CONFIRMER |
| INT-05 | Logiciel de comptabilité / ERP | Hors périmètre v1 ; aucune information fournie. | À DÉFINIR |
| INT-06 | Fournisseurs (envoi des commandes par e-mail ou EDI) | Non implémenté ; la commande est suivie en interne seulement. | À DÉFINIR |
| INT-07 | Lecteur de codes-barres / QR | Non implémenté ; hors périmètre déclaré. | À DÉFINIR |
| INT-08 | Annuaire d'entreprise (SSO / LDAP) | Non implémenté ; l'authentification est locale (e-mail + mot de passe). | À DÉFINIR |

**Options pour INT-03 / INT-04** : (A) ne rien faire en v1 \[recommandé si le volume de départ est faible\] ; (B) export CSV des listes et rapports ; (C) import CSV des matières et stocks initiaux. Impact : développement supplémentaire en B et C, aucun sur le modèle de données existant.

## 15. Notifications et alertes

| ID | Notification | Canal | Déclencheur | Statut |
| --- | --- | --- | --- | --- |
| NOT-01 | Alerte de stock bas d'une matière | Affichage dans l'application (tableau de bord, page Alertes) | Stock inférieur ou égal au seuil de la matière | VALIDÉ |
| NOT-02 | Alerte de stock bas d'un produit | Idem | Seuil du produit strictement positif et stock inférieur ou égal au seuil | VALIDÉ |
| NOT-03 | Messages de confirmation et d'erreur après une action | Bandeaux dans l'interface | Toute action utilisateur | VALIDÉ |
| NOT-04 | Alerte par e-mail | E-mail | Stock bas, commande à recevoir | À CONFIRMER (non implémenté) |
| NOT-05 | Notification push / SMS | Mobile | — | À DÉFINIR |

Les alertes sont **calculées à la consultation** : aucun envoi automatique n'existe en v1. Si NOT-04 est retenu, il faut un serveur d'e-mail (SMTP), les destinataires par rôle et une fréquence (à définir).

## 16. Gestion des erreurs et cas limites

Format d'erreur de l'API : code HTTP + message lisible (JSON). L'interface affiche le message sans exposer de détail technique. Les cas limites portent l'identifiant CL-xx (les écarts de conformité EC-xx figurent en 19.4).

| ID | Situation | Comportement attendu | Statut |
| --- | --- | --- | --- |
| CL-01 | Sortie supérieure au stock disponible | Refus (409), aucun mouvement enregistré | VALIDÉ |
| CL-02 | Production demandant plus de matières que disponible | Refus de toute la production, message indiquant les matières manquantes | VALIDÉ |
| CL-03 | Deux opérations simultanées sur la même matière | Sérialisation par verrou de ligne ; la seconde peut être refusée si le stock est insuffisant | VALIDÉ |
| CL-04 | Annulation d'une production dont une matière ou le produit est désactivé | Autorisée | VALIDÉ |
| CL-05 | Annulation d'une production déjà annulée | Refus | VALIDÉ |
| CL-06 | Réception d'une commande déjà reçue ou annulée | Refus ; réception une seule fois | VALIDÉ |
| CL-07 | Modification du facteur de conversion d'une unité déjà utilisée | Refus | VALIDÉ |
| CL-08 | Suppression d'un élément référencé | Désactivation au lieu de suppression | VALIDÉ |
| CL-09 | Produit sans nomenclature | Production impossible (400, aucune matière) ; création sans nomenclature autorisée | RETENU (avertissement à prévoir, voir EC-10) |
| CL-10 | Identifiants invalides / jeton expiré | 401 ; renouvellement automatique par le jeton de rafraîchissement, sinon retour à la connexion | VALIDÉ |
| CL-11 | Droits insuffisants | 403 ; boutons et pages masqués côté interface | VALIDÉ |
| CL-12 | Quantité de production non entière ou ≤ 0 | Refus de validation | VALIDÉ |
| CL-13 | Coût moyen avec stock nul | Le coût est conservé jusqu'à la prochaine réception | À CONFIRMER |
| CL-14 | Perte de connexion réseau pendant une action | Message d'erreur ; l'action n'est pas rejouée automatiquement | À CONFIRMER |

Le détail des écarts entre les documents sources et l'implémentation figure en annexe (section 23).

## 17. Tests et recette

### 17.1 Stratégie

| Niveau | Contenu | État |
| --- | --- | --- |
| Unitaire / API (automatisé) | Tests Jest + Supertest du backend sur les règles métier (stock, production, annulation, commandes, coûts, rôles) | VALIDÉ (existant) |
| Interface (automatisé) | Tests de bout en bout du frontend | À CONFIRMER (absents) |
| Recette fonctionnelle (manuelle) | Scénarios TA-01 à TA-09 ci-dessous, exécutés par le client sur données de démonstration | PROPOSÉ |
| Sécurité | Revue des exigences SEC-xx avant mise en production | PROPOSÉ |
| Charge | Selon NF-05 / NF-07 une fois définis | À DÉFINIR |

La recette a déjà été effectuée en partie par le client sur l'application locale (règles métier jugées conformes) : ce constat n'est pas un procès-verbal de recette formel.

### 17.2 Scénarios d'acceptation

| ID | Scénario | Résultat attendu |
| --- | --- | --- |
| TA-01 | Connexion avec un compte valide puis invalide | Accès au tableau de bord ; message d'identifiants incorrects sans préciser le champ fautif |
| TA-02 | Créer une unité, une matière, un produit et sa nomenclature | Les éléments apparaissent dans les listes ; capacité calculée |
| TA-03 | Entrée puis sortie de stock d'une matière ; sortie supérieure au stock | Stock mis à jour ; la sortie excessive est refusée sans mouvement créé |
| TA-04 | Produire N unités d'un produit avec stock suffisant | Matières déduites, produit augmenté, référence PROD-nnnnn, mouvements liés |
| TA-05 | Produire avec une matière insuffisante | Refus total ; aucun stock modifié ; matières manquantes listées |
| TA-06 | Annuler une production | Mouvements inverses créés ; stocks restaurés ; statut annulé ; seconde annulation refusée |
| TA-07 | Créer, commander et recevoir une commande d'achat | Statuts DRAFT, ORDERED, RECEIVED ; stock et coût moyen mis à jour ; seconde réception refusée |
| TA-08 | Se connecter avec chaque rôle | Droits conformes à la matrice de la section 5 ; boutons masqués et API refusant (403) |
| TA-09 | Consulter alertes, besoins à acheter, valorisation et rapports | Chiffres cohérents avec les stocks, seuils et coûts saisis |

### 17.3 Critères d'entrée et de sortie de la recette

- **Entrée** : environnement de recette installé, données de démonstration chargées, comptes de test par rôle **\[PROPOSÉ\]**.
- **Sortie** : TA-01 à TA-09 passés, aucune anomalie bloquante ouverte, anomalies mineures listées et acceptées par le client **\[PROPOSÉ\]**.
- Qui rédige et signe le procès-verbal de recette : **\[À DÉFINIR\]**.

## 18. Déploiement et exploitation

| ID | Sujet | Constat / exigence | Statut |
| --- | --- | --- | --- |
| DEP-01 | Packaging | Docker Compose (base, API, frontend) fourni pour le développement | VALIDÉ |
| DEP-02 | Environnements | Développement existant ; recette et production à définir | À DÉFINIR |
| DEP-03 | Hébergement | Serveur dédié, cloud, ou local chez le client ; domaine et certificat HTTPS | À DÉFINIR |
| DEP-04 | Configuration | Variables d'environnement (URL base, secrets JWT, CORS) ; aucun secret par défaut en production | PROPOSÉ (SEC) |
| DEP-05 | Données initiales | Pas de données de démonstration en production (SEED\_DEMO=false) ; création du premier ADMIN à définir | PROPOSÉ |
| DEP-06 | Migrations | Migrations Prisma appliquées au déploiement ; sauvegarde préalable | PROPOSÉ |
| DEP-07 | Intégration continue | Workflow GitHub Actions présent, jamais exécuté : à vérifier | VALIDÉ (non vérifié) |
| DEP-08 | Sauvegarde / restauration | Voir NF-09 | À DÉFINIR |
| DEP-09 | Supervision | Voir NF-16 | À DÉFINIR |
| DEP-10 | Mises à jour | Procédure de déploiement, retour arrière, dépendances (correctifs de sécurité) | À DÉFINIR |
| DEP-11 | Formation et documentation | Guide utilisateur par rôle, guide d'exploitation | À CONFIRMER |

**Options d'hébergement** (à trancher) : (A) hébergeur cloud avec base gérée — sauvegardes intégrées, coût récurrent ; (B) serveur virtuel unique avec Docker Compose — simple, exploitation à la charge du client ; (C) installation sur site — données locales, maintenance matérielle. Recommandation : A ou B selon la volumétrie et la compétence d'exploitation disponible **\[PROPOSÉ\]**.

## 19. Contraintes, hypothèses et risques

### 19.1 Contraintes

| ID | Contrainte | Statut |
| --- | --- | --- |
| CTR-01 | Pile technique fixée : Next.js 16, NestJS 11, Prisma 6, PostgreSQL 16 (Nest 12 et TypeScript 7 écartés car incompatibles) | VALIDÉ |
| CTR-02 | Branche de développement unique désignée ; pas de demande de fusion sans accord | VALIDÉ |
| CTR-03 | Budget, équipe, date butoir | À DÉFINIR |
| CTR-04 | Contraintes légales (comptabilité des stocks, conservation) | À CONFIRMER |

### 19.2 Hypothèses

Les hypothèses H1 à H8 formulées lors de l'audit (étape 1) restent en vigueur tant qu'elles ne sont pas confirmées ; elles sont reprises dans la section 24. Elles ne sont pas réécrites ici pour éviter toute divergence de formulation.

### 19.3 Risques

| ID | Risque | Probabilité | Impact | Traitement proposé |
| --- | --- | --- | --- | --- |
| RSK-01 | Inscription publique ouverte permettant de créer un compte sans contrôle | Constaté | Élevé | Fermer l'inscription, création des comptes par ADMIN (SEC) |
| RSK-02 | Coûts et valorisation visibles par tous les rôles | Constaté | Moyen | Restreindre aux MANAGER et ADMIN |
| RSK-03 | Secrets et CORS par défaut non adaptés à la production | Constaté | Élevé | Configuration obligatoire au déploiement |
| RSK-04 | Aucune limitation de tentatives de connexion | Constaté | Moyen | Limiteur de débit |
| RSK-05 | Pipeline CI et Docker non vérifiés | Constaté | Moyen | Exécuter et corriger avant mise en production |
| RSK-06 | Absence de tests d'interface | Constaté | Moyen | Ajouter des parcours de bout en bout |
| RSK-07 | Coût d'un produit estimé (non issu de ventes ni d'une comptabilité) pris pour une valeur comptable | Possible | Moyen | Libellé « estimation » et validation par la comptabilité |
| RSK-08 | Volumétrie ou exigences de disponibilité sous-estimées | Possible | Moyen | Fixer NF-05 à NF-09 |
| RSK-09 | Perte de données faute de sauvegarde planifiée | Possible | Élevé | NF-09 |
| RSK-10 | Écarts non arbitrés entre documents sources et logiciel (annexe 23.2) | Possible | Moyen | Résolution lors de la validation |

### 19.4 Écarts de conformité (EC)

Écarts entre l'application actuelle et le présent cahier des charges. Aucune correction n'a été faite pendant la rédaction ; elles sont planifiées en phase P9 après validation.

| ID | Écart | Exigence liée | Statut de la correction |
| --- | --- | --- | --- |
| EC-01 | L'inscription publique (POST /auth/register) est ouverte | SEC-08 | RETENU |
| EC-02 | Coûts, prix et valorisation lisibles par tous les rôles ; routes de rapports non restreintes à MANAGER | SEC-07 | RETENU |
| EC-03 | CORS ouvert à toutes les origines | SEC-10 | PROPOSÉ |
| EC-04 | Pas de limitation des tentatives de connexion | SEC-11 | PROPOSÉ |
| EC-05 | Pas d'en-têtes de sécurité HTTP ; HTTPS non configuré | SEC-13 | PROPOSÉ |
| EC-06 | Secrets par défaut (change-me) dans docker-compose.yml | SEC-09 | PROPOSÉ |
| EC-07 | Aucune sauvegarde de la base | SEC-16, NF-09 | À DÉFINIR |
| EC-08 | Le déploiement complet par Docker Compose n'a pas été testé | DEP-01 | PROPOSÉ |
| EC-09 | Alerte « matière nécessaire à une production » et bloc graphique « État des stocks » du tableau de bord (Conception) non réalisés | Q17 | RETENU : hors v1 |
| EC-10 | Pas d'avertissement pour un produit sans nomenclature | CL-09, Q4 | RETENU |
| EC-11 | Le workflow d'intégration continue n'a jamais été exécuté | DEP-07 | PROPOSÉ |
| EC-12 | Seuls les mouvements sont tracés ; pas de journal d'audit du référentiel | SEC-15 | À DÉFINIR |
| EC-13 | Le jeu de démonstration (SEED\_DEMO) est actif dans docker-compose.yml et crée des produits sans mouvements | DEP-05 | PROPOSÉ |
| EC-14 | shadcn/ui et Zod cités en Conception, non utilisés (composants Tailwind maison, class-validator) | section 11 | À CONFIRMER |
| EC-15 | Aucun test automatisé du frontend | NF-12 | À CONFIRMER |
| EC-16 | Documentation Swagger accessible sans connexion | SEC-19 | PROPOSÉ |
| EC-17 | Pas de route de santé (health) ni de journaux structurés | NF-16 | À DÉFINIR |

## 20. Planning et jalons

Aucune durée ni date n'est avancée : elles dépendent de décisions et de ressources **\[À DÉFINIR\]**. Le planning est exprimé en phases ordonnées avec leurs dépendances.

| Phase | Contenu | Dépend de | État |
| --- | --- | --- | --- |
| P1–P2 | Socle technique, authentification, référentiel (unités, caractéristiques, matières, produits, nomenclature) | — | Réalisé |
| P3 | Mouvements de stock | P2 | Réalisé |
| P4 | Production et annulation | P3 | Réalisé |
| P5 | Planification (capacité, besoins), fournisseurs et commandes | P4 | Réalisé |
| P6 | Alertes, profil, gardes de page | P3 | Réalisé |
| P7 | Coûts, valorisation, rapports | P5 | Réalisé |
| P8 | Validation du cahier des charges (section 24) | Réponses du client | À faire |
| P9 | Corrections issues des écarts et exigences de sécurité retenues | P8 | À faire |
| P10 | Recette (TA-01 à TA-09) | P9 | À faire |
| P11 | Préparation et mise en production | P10, DEP-02 à DEP-10 | À faire |

**Jalons** : J1 cahier des charges validé ; J2 corrections livrées ; J3 recette signée ; J4 mise en production.

**Chemin critique** : les réponses de la section 24 conditionnent P9, qui conditionne la recette et la mise en production.

## 21. Critères de validation finale

Le projet est réputé livré lorsque toutes les conditions suivantes sont réunies **\[PROPOSÉ\]** :

1. Toutes les fiches fonctionnelles de statut VALIDÉ ou RETENU (section 6) sont présentes et leurs critères d'acceptation vérifiés.
2. Les scénarios TA-01 à TA-09 sont passés sans anomalie bloquante.
3. Les règles de gestion de la section 8 sont toutes couvertes par un test automatisé ou un scénario de recette.
4. Les exigences de sécurité SEC retenues par le client sont implémentées et revues.
5. Les cas CL-13 et CL-14, les écarts EC-xx retenus (section 19.4) et les écarts de l'annexe 23.2 sont arbitrés et traités ou explicitement reportés.
6. Le pipeline d'intégration continue s'exécute avec succès et le déploiement par Docker est vérifié de bout en bout.
7. Les cibles NF-05 à NF-09 sont fixées et, si chiffrées, mesurées.
8. Toutes les questions de la section 24 marquées « bloquant » ont une réponse.
9. La documentation d'exploitation et le guide utilisateur (DEP-11) sont remis, si retenus.
10. Le procès-verbal de recette est signé par le représentant du client (identité à définir).

## 22. Évolutions futures

Les éléments suivants sont hors périmètre de la v1 (section 4). Aucun n'est planifié ; ils sont listés pour mémoire **\[À CONFIRMER\]**.

| ID | Évolution | Remarque |
| --- | --- | --- |
| EVO-01 | Plusieurs entrepôts ou emplacements | Impact fort sur le modèle de stock |
| EVO-02 | Lots, dates de péremption, numéros de série | Écart avec le modèle actuel (stock agrégé) |
| EVO-03 | Nomenclatures multi-niveaux | Aujourd'hui un seul niveau |
| EVO-04 | Ventes, commandes clients, sorties de produits finis | Exclu du périmètre (MCD §27) |
| EVO-05 | Export CSV / Excel, import de données | Voir INT-03, INT-04 |
| EVO-06 | Notifications par e-mail | Voir NOT-04 |
| EVO-07 | Authentification forte (MFA) ou SSO | Voir 12.2 et INT-08 |
| EVO-08 | Application mobile / lecteur de codes-barres | Voir INT-07 |
| EVO-09 | Multi-devises | Une seule devise en v1 |
| EVO-10 | Journal d'audit des modifications du référentiel | Seuls les mouvements sont traçables |
| EVO-11 | Tableaux de bord personnalisables, rapports planifiés | — |
| EVO-12 | Interface multilingue | Voir NF-18 |

## 23. Annexes

### 23.1 Routes de l'API (résumé)

Rôle minimal requis (avant la mention « tous », toute personne connectée). Source : contrôleurs du backend.

| Ressource | Routes | Droits |
| --- | --- | --- |
| Authentification | POST /auth/register, /auth/login, /auth/refresh (publics) ; GET et PATCH /auth/me ; POST /auth/change-password, /auth/logout | publics / tous |
| Utilisateurs | GET, POST /users ; GET, PATCH, DELETE /users/:id | ADMIN |
| Catégories d'unités et unités | GET /unit-categories, /units, /units/:id, /units/convert ; POST, PATCH, DELETE | lecture : tous ; écriture : MANAGER |
| Caractéristiques | GET /characteristics ; POST, PATCH, DELETE | lecture : tous ; écriture : MANAGER |
| Matières | GET /materials, /materials/:id ; POST, PATCH, DELETE ; PUT /materials/:id/characteristics | lecture : tous ; écriture : MANAGER |
| Produits et nomenclature | GET /products, /products/:id, /products/:id/bom ; POST, PATCH, DELETE ; PUT /products/:id/bom | lecture : tous ; écriture : MANAGER |
| Stocks et alertes | GET /inventory, /inventory/materials, /inventory/products, /inventory/alerts ; PATCH /inventory/materials/:id/thresholds, /inventory/products/:id/threshold | lecture : tous ; seuils : MANAGER |
| Mouvements | GET /stock-movements ; POST /stock-movements | lecture : tous ; création : OPERATOR et plus (ajustement : MANAGER, règle à vérifier dans le service) |
| Production | GET /production, /production/:id ; POST /production ; POST /production/:id/cancel | lecture : tous ; produire : OPERATOR et plus ; annuler : MANAGER |
| Planification | GET /products/:id/production-capacity ; POST /products/:id/check-production, /products/:id/material-requirements | tous |
| Fournisseurs | GET /suppliers ; POST, PATCH, DELETE | lecture : tous ; écriture : MANAGER |
| Commandes d'achat | GET /purchase-orders, /purchase-orders/:id ; POST, PATCH ; POST .../order, .../cancel ; POST .../receive | lecture : tous ; gestion : MANAGER ; réception : OPERATOR et plus |
| Rapports | GET /reports/stock-value, /production-monthly, /top-materials, /top-products | tous (écart avec la matrice retenue, voir EC) |

**Constat** : les routes de rapports et de planification ne sont pas restreintes à MANAGER côté API, alors que la matrice retenue (section 5) réserve les rapports à MANAGER et plus. À corriger ou à confirmer (voir Q8).

### 23.2 Écarts entre documents sources et implémentation

| # | Écart | Traitement retenu | Statut |
| --- | --- | --- | --- |
| I1 | Signe des mouvements : MCD +25, conception et MLD −25 | Stockage signé (sorties négatives) ; exemple du MCD à corriger | RETENU |
| I2 | Caractéristique multi-valeur (exemple) vs clé composite du MLD | Une valeur par caractéristique et matière | RETENU (Q3) |
| I3 | « Un produit doit avoir une nomenclature » vs création sans nomenclature possible | Autorisé mais non productible, avertissement à prévoir | RETENU (Q4) |
| I4 | Statuts PENDING / IN\_PROGRESS non décrits | Hors v1 ; production directement terminée ou annulée | RETENU (Q5) |
| I5 | Quantité produite décimale (MLD) vs entière (exemples, code) | Entière | RETENU (Q6) |
| I6 | Produit sans unité vs mouvement exigeant une unité | Unité fixée à PCS | RETENU (Q6) |
| I7 | Mouvement : « au moins un » vs « l'un ou l'autre » (matière / produit) | Exactement un des deux | RETENU |
| I8 | Seuils dans Material (conception) vs MATERIAL\_STOCK (MLD) | MLD | RETENU |
| I9 | Suppression d'une caractéristique : cascade (MLD) vs refus si utilisée (code) | Refus si utilisée | RETENU (H5) |
| I10 | Vocabulaire français (conception) vs anglais (MCD / MLD) | Anglais en base et API ; libellés français à l'écran | RETENU |
| I11 | Fournisseurs, commandes, utilisateurs, rapports classés « évolution future » mais réalisés | Intégrés au périmètre v1 | RETENU (Q9) |
| I12 | Exemples numériques divergents (2 m vs 2,5 m par pantalon) | Exemples de la conception servant de jeux d'acceptation (H6) | RETENU |

### 23.3 Jeu d'acceptation de référence (H6)

Avec un stock de 125 m de tissu, 40 fermetures et 200 boutons, et une nomenclature de 2,5 m, 1 fermeture et 2 boutons par pantalon, la capacité est de 40 pantalons (limitée par les fermetures). Pour 100 pantalons : besoin de 250 m, 100 fermetures, 200 boutons ; à acheter : 125 m et 60 fermetures. **\[RETENU\]**

### 23.4 Glossaire

- **Matière** : élément acheté ou consommé par la production (tissu, fermeture, bouton).
- **Produit** : article fabriqué, défini par une nomenclature.
- **Nomenclature (BOM)** : liste des matières et quantités nécessaires pour une unité de produit.
- **Mouvement de stock** : enregistrement signé et immuable d'une variation de stock.
- **Capacité de production** : nombre maximal d'unités productibles avec les stocks actuels, égal au minimum, sur les matières, de la partie entière du stock divisé par le besoin unitaire.
- **Coût moyen pondéré** : coût unitaire d'une matière recalculé à chaque réception.
- **Seuil** : niveau de stock déclenchant une alerte.
- **Désactivation** : retrait d'un élément de l'usage courant sans le supprimer, pour conserver l'historique.

### 23.5 Traçabilité

Chaque fiche de la section 6 mentionne sa source (document source, décision de session ou implémentation) et son statut ; les scénarios TA-01 à TA-09 couvrent les modules AUT, UTI, PRF, MAT, PRO, STO, FAB, PLA, ACH, ALE et RAP. Une matrice fiche × test détaillée reste à établir lors de la validation **\[À DÉFINIR\]**.

## 24. Points à confirmer avant validation du cahier des charges

Les questions Q1 à Q19 ont été posées à l'étape 3. Le commanditaire a donné son accord global (« ok allons y ») : les recommandations sont **\[RETENU\]** par défaut ; les données factuelles qu'il n'a pas fournies restent **\[À DÉFINIR\]**. « Bloquant » = le document ne peut pas être validé sans réponse explicite.

### 24.1 Questions groupées

**Groupe A — Cadre du projet (bloquant)**

| # | Question | Pourquoi | Impact | État |
| --- | --- | --- | --- | --- |
| Q1 | Nom officiel, commanditaire, rédacteur, destinataires, nature du projet (entreprise, académique, produit) | Section 1 et niveau d'exigence | Disponibilité, conformité, caractère contractuel | À DÉFINIR |
| Q2 | Activité visée (confection ou multi-métiers), nombre d'utilisateurs, de sites, de références, de mouvements par mois | Performance, vocabulaire | Un multi-sites ou une forte volumétrie changent l'architecture | À DÉFINIR (hypothèse : mono-site, petite structure) |
| Q18 | Indicateurs de réussite chiffrés, budget, équipe, jalons | Section 3 et planning | Dates et critères de réussite | À DÉFINIR |

**Groupe B — Règles métier interdépendantes (bloquant)** — à trancher ensemble car elles touchent le modèle de données.

| # | Question | Pourquoi | Impact | État |
| --- | --- | --- | --- | --- |
| Q3 | Caractéristique à plusieurs valeurs : texte libre, valeurs multiples ou composition structurée | Écart I2 | Base et écrans si multiple ou structurée | RETENU : texte libre / une valeur |
| Q4 | Produit sans nomenclature : autorisé non productible, interdit, ou inactif seulement | Écart I3 | Règle de création | RETENU : autorisé + avertissement |
| Q5 | Statuts de production en attente / en cours | Écart I4 | Réservation de stock, écrans, règles | RETENU : hors v1 |
| Q6 | Quantités produites entières et unité PCS, ou décimales et unité propre au produit | Écarts I5 et I6 | Modèle de données | RETENU : pièces entières |

**Groupe C — Droits et sécurité (bloquant)** — interdépendantes : la matrice de droits détermine la visibilité des coûts, l'accès aux rapports et le circuit de création des comptes.

| # | Question | Pourquoi | Impact | État |
| --- | --- | --- | --- | --- |
| Q7 | Valider la matrice de droits de la section 5 | Les documents ne donnent aucun droit | Référentiel des droits et des tests | RETENU (validation explicite attendue) |
| Q8 | Masquer coûts et prix aux VIEWER et OPERATOR ; restreindre les routes de rapports (23.1) | Coûts visibles de tous aujourd'hui | Correction du code | RETENU : réservés à MANAGER et ADMIN |
| Q9 | Fermer l'inscription publique (comptes créés par un administrateur) ; confirmer que fournisseurs, achats, coûts, rôles et rapports sont dans la v1 | Sécurité ; écart I11 | Correction du code, périmètre | RETENU : fermer ; périmètre v1 |
| Q10 | Session unique par compte, double authentification, politique de mot de passe, journal d'audit | Section 12 | Développements associés | RETENU : état actuel + corrections ; le reste À DÉFINIR |

**Groupe D — Exploitation et conformité (important, peut rester À DÉFINIR)** — interdépendantes : l'hébergement conditionne sauvegardes, disponibilité et supervision.

| # | Question | Pourquoi | Impact | État |
| --- | --- | --- | --- | --- |
| Q11 | Hébergement cible, Docker disponible, domaine, HTTPS, exploitant | Sections 11, 18, 19 | Architecture de déploiement | À DÉFINIR |
| Q12 | Horaires, tolérance à l'arrêt, perte de données admissible, durée de reprise, conservation des historiques | NF-08, NF-09 | Sauvegardes, redondance | À DÉFINIR |
| Q13 | Réglementation applicable aux données personnelles ; accepter qu'un utilisateur ayant des mouvements ne soit pas supprimable | NF-19 | Conservation, anonymisation | À DÉFINIR |
| Q14 | Langue, devise, fuseau horaire | NF-17, NF-18 | Formats, affichage | À DÉFINIR (hypothèse : français, une devise) |
| Q15 | Appareils cibles (bureau, tablette, téléphone) et niveau d'accessibilité | NF-14, NF-15 | Conception de l'interface, tests | À DÉFINIR |

**Groupe E — Périmètre**

| # | Question | Pourquoi | Impact | État |
| --- | --- | --- | --- | --- |
| Q16 | Confirmer les exclusions de la v1 (section 22) : entrepôts multiples, lots, variantes, ventes, import / export, impression et codes-barres, e-mails, sous-ensembles de nomenclature, rendement et pertes, main-d'œuvre | Limiter le périmètre | Chaque élément ajouté allonge la livraison | RETENU : exclus |
| Q17 | Alertes à l'écran seulement ou e-mail ; alerte « matière nécessaire à une production » et bloc graphique « État des stocks » obligatoires en v1 | Sections 15 et 10 | Développements, serveur d'e-mail | RETENU : à l'écran seulement ; les deux autres hors v1 |

**Groupe F — Livraison du document**

| # | Question | Pourquoi | Impact | État |
| --- | --- | --- | --- | --- |
| Q19 | Format : document partagé, Word ou Markdown dans le dépôt | Diffusion et versionnement | Aucun sur le logiciel | RETENU : document partagé + copie Markdown (docs/) |

### 24.2 Hypothèses H1 à H8 à confirmer

| ID | Hypothèse |
| --- | --- |
| H1 | Les mouvements sont stockés signés ; l'exemple du MCD sera corrigé. |
| H2 | Le MLD prime sur la conception quand ils divergent. |
| H3 | Un élément déjà référencé est désactivé et non supprimé. |
| H4 | Le facteur de conversion et la catégorie d'une unité sont figés dès qu'elle est utilisée. |
| H5 | Une caractéristique utilisée ne peut pas être supprimée (au lieu de la cascade du MLD). |
| H6 | Les exemples numériques de la conception servent de jeux d'acceptation (125 m, 40 fermetures, 200 boutons → 40 pantalons ; 100 pantalons → 250 m, 100 fermetures, 200 boutons ; à acheter 125 m et 60 fermetures). |
| H7 | Le coût d'une matière est une moyenne pondérée ; la valeur des produits finis est une estimation. |
| H8 | Les SKU et valeurs du seed ne sont pas normatifs. |

### 24.3 Prochaine étape

Au retour des réponses (même partielles), les statuts RETENU deviennent VALIDÉ, les éléments À DÉFINIR renseignés sont intégrés, la version passe à v0.2 et l'historique des versions (section 1) est mis à jour. Les corrections de code découlant des réponses (Q4, Q8, Q9, Q10) sont alors planifiées en phase P9.

### 6.4 Module UNI — Unités

#### F-UNI-01 — Gérer les catégories d'unités

| Champ | Contenu |
| --- | --- |
| Objectif | Regrouper les unités compatibles (longueur, poids, volume, quantité, surface) |
| Acteur | MANAGER, ADMIN (lecture : tous) |
| Scénario nominal | Paramètres › Unités : ajout d'une catégorie (nom, code), modification du nom ou du code, suppression d'une catégorie vide |
| Cas d'erreur | Code déjà utilisé : 409 ; code contenant minuscules ou caractères spéciaux : 400 ; catégorie contenant des unités : suppression refusée (409) |
| Règles | RG-02 |
| Critères d'acceptation | Les catégories Longueur, Poids, Volume, Quantité et Surface existent après initialisation ; un code en double est refusé |

#### F-UNI-02 — Gérer les unités de mesure

| Champ | Contenu |
| --- | --- |
| Objectif | Définir les unités et leur facteur de conversion vers l'unité de référence de leur catégorie |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | 1) Saisie du nom, du symbole, du code, de la catégorie et du facteur (m = 1, cm = 0,01, mm = 0,001). 2) Modification en ligne. 3) Suppression. |
| Cas alternatifs | Unité déjà utilisée : nom, symbole et code restent modifiables ; **facteur et catégorie sont figés** |
| Cas d'erreur | Facteur ≤ 0 : 400 ; code en double : 409 ; modification du facteur d'une unité utilisée : 409 ; suppression d'une unité utilisée : 409 |
| Règles | RG-02, RG-03, RG-04 |
| Critères d'acceptation | Une unité inutilisée accepte un nouveau facteur ; une unité utilisée le refuse avec un message explicite |

#### F-UNI-03 — Convertir une quantité

| Champ | Contenu |
| --- | --- |
| Objectif | Convertir une valeur d'une unité à une autre de la même catégorie |
| Acteur | Tout utilisateur (API) et le système (nomenclatures, mouvements, commandes, calculs) |
| Scénario nominal | 100 cm vers m donne 1 m ; 2,5 m vers cm donne 250 cm |
| Cas d'erreur | Unités de catégories différentes (ex. m vers kg) : 400 « Incompatible units » ; aucune conversion n'est jamais tentée |
| Règles | RG-03 |
| Remarque | Aucun écran dédié : la conversion sert aux autres fonctions et reste accessible par l'API |
| Critères d'acceptation | 2 m + 5 kg est impossible ; 100 cm = 1 m |

### 6.5 Module CAR — Caractéristiques

#### F-CAR-01 — Gérer les caractéristiques

| Champ | Contenu |
| --- | --- |
| Objectif | Définir les propriétés qui décrivent les matières (couleur, texture, composition, épaisseur, largeur) |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Paramètres › Caractéristiques : ajout (nom, code unique, type Texte, Nombre ou Oui/Non), modification, suppression |
| Cas alternatifs | Caractéristique déjà utilisée par une matière : nom et code modifiables, type figé |
| Cas d'erreur | Code en double : 409 ; changement de type d'une caractéristique utilisée : 409 ; suppression d'une caractéristique utilisée : 409 |
| Règles | RG-05 |
| Critères d'acceptation | Les 5 caractéristiques d'exemple existent après initialisation ; un type ne change pas s'il est utilisé |
| Écart avec les sources | Le MLD prévoit la suppression en cascade des valeurs ; la suppression est ici refusée **\[RETENU\]** (annexe C, I9) |

### 6.6 Module MAT — Matières

#### F-MAT-01 — Créer une matière

| Champ | Contenu |
| --- | --- |
| Objectif | Enregistrer une matière première ou un composant avec son unité de stock |
| Acteur | MANAGER, ADMIN |
| Préconditions | Au moins une unité existe |
| Scénario nominal | 1) Saisie du nom (150 car. max), du SKU unique (lettres, chiffres, point, tiret, souligné), de la description, de l'unité de stock, du coût unitaire (0 par défaut), des seuils minimum et maximum, de l'état actif et des caractéristiques. 2) La matière est créée avec un stock à 0. |
| Cas d'erreur | SKU en double : 409 ; unité inexistante : 400 ; maximum < minimum : 400 ; valeur Nombre non numérique ou valeur Oui/Non différente de true/false : 400 ; même caractéristique deux fois : 400 |
| Résultat attendu | Matière listable, sélectionnable dans les nomenclatures et mouvements |
| Règles | RG-01, RG-02, RG-05, RG-16, RG-40 |
| Critères d'acceptation | Une matière créée a un stock 0 ; un SKU existant est refusé ; une valeur invalide est refusée |

#### F-MAT-02 — Modifier, désactiver, réactiver, supprimer une matière

| Champ | Contenu |
| --- | --- |
| Objectif | Maintenir la fiche sans casser l'historique |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | 1) Modification de tous les champs depuis la fiche. 2) Suppression : si la matière est référencée (nomenclature, mouvement), elle est **désactivée** ; sinon elle est supprimée. 3) Réactivation par « Réactiver » dans la liste ou par la case « Active ». |
| Cas alternatifs | Une matière désactivée disparaît des listes par défaut (case « Afficher les inactives ») |
| Cas d'erreur | Changement d'unité d'une matière utilisée en nomenclature, ayant des mouvements ou un stock non nul : 400 ; production dont la nomenclature contient une matière désactivée : refusée (400) |
| Règles | RG-07, RG-08 |
| Critères d'acceptation | Supprimer une matière utilisée la désactive ; ses mouvements restent consultables |

#### F-MAT-03 — Consulter et rechercher les matières

| Champ | Contenu |
| --- | --- |
| Objectif | Retrouver une matière et voir son état |
| Acteur | Tous les rôles |
| Scénario nominal | Liste de 20 lignes par page avec SKU, nom, caractéristiques, stock, seuil minimum et coût ; recherche par nom ou SKU (sans tenir compte de la casse) ; stock ≤ seuil signalé visuellement |
| Cas d'erreur | Paramètres de pagination invalides : 400 |
| Règles | RG-16 |
| Remarque | La colonne coût est visible par tous les rôles (écart EC-02) |
| Critères d'acceptation | Avec 29 matières, la page 1 en montre 20 et la page 2 en montre 9 ; une recherche renvoie les seules lignes correspondantes |

### 6.7 Module PRO — Produits et nomenclature

#### F-PRO-01 — Créer et modifier un produit

| Champ | Contenu |
| --- | --- |
| Objectif | Enregistrer un produit fini |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | 1) Saisie du nom (150 car. max), du SKU unique, de la description, de l'état actif, du seuil minimum de stock (0 = aucune alerte) et, à la création, de la nomenclature. 2) Le produit est créé avec un stock à 0. 3) La fiche s'ouvre. |
| Cas d'erreur | SKU en double : 409 ; matière de nomenclature inexistante ou inactive : 400 |
| Règles | RG-01, RG-06, RG-16 |
| Critères d'acceptation | Un produit créé avec nomenclature affiche ses composants et un stock 0 ; un SKU existant est refusé |

#### F-PRO-02 — Définir la nomenclature d'un produit

| Champ | Contenu |
| --- | --- |
| Objectif | Dire quelle quantité de quelle matière sert à fabriquer **une** unité |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | 1) L'utilisateur ajoute des lignes : matière, quantité, unité. 2) Les unités proposées sont celles de la catégorie de la matière (m, cm, mm pour un tissu en m). 3) L'enregistrement remplace l'ensemble de la nomenclature. |
| Cas alternatifs | 250 cm de tissu en m est accepté et converti dans les calculs |
| Cas d'erreur | Unité d'une autre catégorie (ex. kg pour un tissu en m) : 400 ; même matière deux fois : 400 ; quantité ≤ 0 : 400 ; matière inactive : 400. En cas d'erreur l'ancienne nomenclature est conservée. |
| Produit sans nomenclature | Autorisé, mais non productible : la capacité et la production sont refusées (400 « Product has no bill of materials »). **\[RETENU\]** Écart : un avertissement visible à la création manque (EC-08). |
| Règles | RG-06 |
| Critères d'acceptation | Pantalon Jean = 2,5 m de tissu, 1 fermeture, 2 boutons ; une unité incompatible est refusée ; deux lignes pour la même matière sont refusées |

#### F-PRO-03 — Désactiver, réactiver, supprimer un produit

| Champ | Contenu |
| --- | --- |
| Objectif | Retirer un produit des listes sans perdre l'historique |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Supprimer un produit ayant des productions ou des mouvements le **désactive** ; un produit sans historique est supprimé avec sa nomenclature. La réactivation passe par « Réactiver ». |
| Cas d'erreur | Production d'un produit inactif : 400 |
| Règles | RG-08 |
| Critères d'acceptation | Un produit avec historique supprimé reste visible avec « Afficher les inactifs » et peut être réactivé |

#### F-PRO-04 — Consulter et rechercher les produits

| Champ | Contenu |
| --- | --- |
| Objectif | Voir un produit, sa composition et sa situation |
| Acteur | Tous les rôles |
| Scénario nominal | Liste paginée (SKU, nom, nombre de composants, stock) avec recherche ; fiche produit : stock actuel, capacité de production et matière limitante, nomenclature avec disponible et production possible par matière |
| Règles | RG-23 |
| Critères d'acceptation | La fiche de Pantalon Jean avec 125 m, 40 fermetures, 200 boutons affiche capacité 40, limitante : fermeture |

### 6.8 Module STO — Stocks et mouvements

#### F-STO-01 — Consulter les stocks

| Champ | Contenu |
| --- | --- |
| Objectif | Connaître les quantités disponibles |
| Acteur | Tous les rôles |
| Scénario nominal | La page Stocks affiche le stock de chaque matière (quantité, unité, seuil minimum) et de chaque produit fini ; le tableau de bord en donne la synthèse |
| Règles | RG-10 |
| Critères d'acceptation | Les quantités affichées sont égales à la somme des mouvements de chaque élément |

#### F-STO-02 — Enregistrer un mouvement de stock

| Champ | Contenu |
| --- | --- |
| Objectif | Modifier un stock en laissant une trace |
| Acteur | OPERATOR, MANAGER, ADMIN (ajustement : MANAGER, ADMIN) |
| Préconditions | L'élément (matière ou produit) existe et est actif |
| Scénario nominal | 1) L'utilisateur choisit « Matière première » ou « Produit fini », le type (entrée, sortie, perte, retour, ajustement), l'élément, la quantité et un motif facultatif. 2) Le système convertit la quantité dans l'unité de stock, met à jour le stock et enregistre le mouvement dans la même transaction. 3) L'historique affiche la ligne. |
| Cas alternatifs | Via l'API : unité différente de la même catégorie (2 500 cm pour une matière en m = 25 m) ; référence libre |
| Cas d'erreur | Quantité ≤ 0 hors ajustement : 400 ; ajustement de 0 : 400 ; type PRODUCTION : 400 ; sortie supérieure au stock : 409 ; unité incompatible : 400 ; élément inactif : 400 ; ni matière ni produit, ou les deux : 400 ; ajustement par un OPERATOR : 403 ; rôle VIEWER : 403 |
| Résultat attendu | Stock modifié et un mouvement signé créé |
| Règles | RG-10 à RG-15 |
| Critères d'acceptation | Une sortie de 201 sur un stock de 200 est refusée et ne change rien ; une entrée de 100 puis une perte de 5 laissent 95 et deux mouvements |

#### F-STO-03 — Consulter l'historique des mouvements

| Champ | Contenu |
| --- | --- |
| Objectif | Expliquer pourquoi un stock a cette valeur (question 7 du besoin) |
| Acteur | Tous les rôles |
| Scénario nominal | Liste des mouvements, plus récents d'abord, 20 par page, avec date, type, élément, quantité signée et unité, référence, auteur ; filtres par type et par période (API : élément, référence) |
| Cas d'erreur | Type, date ou paramètre de pagination invalide : 400 |
| Règles | RG-11 |
| Critères d'acceptation | Aucun mouvement ne peut être modifié ni supprimé ; une correction apparaît comme un mouvement d'ajustement |

#### F-STO-04 — Régler les seuils de stock

| Champ | Contenu |
| --- | --- |
| Objectif | Déclencher les alertes au bon niveau |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Matière : seuil minimum et seuil maximum facultatif dans la fiche matière. Produit fini : seuil minimum dans la fiche produit (0 = aucune alerte). |
| Cas d'erreur | Seuil négatif : 400 ; maximum inférieur au minimum : 400 |
| Règles | RG-16, RG-17 |
| Critères d'acceptation | Avec un seuil de 100 et un stock de 82, le produit apparaît en « stock faible » |

### 6.9 Module FAB — Production

#### F-FAB-01 — Lancer une production

| Champ | Contenu |
| --- | --- |
| Objectif | Fabriquer une quantité de produits en consommant les matières |
| Acteur | OPERATOR, MANAGER, ADMIN |
| Préconditions | Le produit est actif et sa nomenclature n'est pas vide |
| Scénario nominal | 1) Sur la fiche du produit, l'utilisateur saisit une quantité entière et choisit « Vérifier les matières ». 2) Le tableau montre, par matière, le nécessaire, le disponible et le manquant. 3) Si tout est disponible, il confirme. 4) En une seule transaction : retrait de chaque matière (mouvements PRODUCTION négatifs, référence PROD-nnnnn), ajout des produits finis (mouvement positif), enregistrement de la production au statut « terminée ». 5) L'historique de production s'ouvre. |
| Cas alternatifs | Matières insuffisantes : le système liste les manques et propose de préparer une commande (F-PLA-03) |
| Cas d'erreur | Stock insuffisant : 409 avec la liste des matières manquantes, **aucune modification** ; quantité 0, négative ou décimale : 400 ; produit inconnu : 404 ; produit sans nomenclature ou inactif : 400 ; matière désactivée dans la nomenclature : 400 ; deux productions simultanées dont le stock ne suffit que pour une : une réussit, l'autre reçoit 409 |
| Résultat attendu | Matières diminuées, produits augmentés, quatre mouvements pour 3 matières + 1 produit, une production |
| Règles | RG-20 à RG-22 |
| Critères d'acceptation | TA-03 et TA-04 (section 17) |

#### F-FAB-02 — Annuler une production

| Champ | Contenu |
| --- | --- |
| Objectif | Corriger une production saisie par erreur |
| Acteur | MANAGER, ADMIN |
| Préconditions | La production est au statut « terminée » |
| Scénario nominal | 1) Depuis l'historique, l'utilisateur choisit « Annuler » et confirme. 2) Chaque mouvement de la production est inversé (matières remises en stock, produits fabriqués retirés), avec la même référence. 3) Le statut devient « annulée ». |
| Cas alternatifs | L'annulation reste possible si le produit ou une matière a été désactivé depuis |
| Cas d'erreur | Production déjà annulée : 409 ; production inconnue : 404 ; produits finis déjà sortis du stock (vendus) : 409 « Cannot cancel », aucune modification ; rôle OPERATOR : 403 |
| Règles | RG-25 |
| Critères d'acceptation | TA-05 |
| Source | Fonction ajoutée en cours de projet **\[VALIDÉ\]** |

#### F-FAB-03 — Consulter les productions

| Champ | Contenu |
| --- | --- |
| Objectif | Retrouver ce qui a été fabriqué, quand et par qui |
| Acteur | Tous les rôles |
| Scénario nominal | Liste paginée (numéro PROD-nnnnn, date, produit, quantité, statut Terminée ou Annulée, auteur) filtrable par statut ; le détail (API) donne les mouvements liés |
| Cas d'erreur | Statut invalide : 400 |
| Critères d'acceptation | Une production annulée reste listée au statut « Annulée » |

### 6.10 Module PLA — Planification

#### F-PLA-01 — Calculer la capacité de production

| Champ | Contenu |
| --- | --- |
| Objectif | Répondre à « combien de produits puis-je fabriquer avec mon stock ? » |
| Acteur | Tous les rôles |
| Scénario nominal | Pour chaque matière : capacité = stock disponible ÷ quantité nécessaire par produit, arrondie à l'entier inférieur. La capacité maximale est le minimum de ces valeurs ; la ou les matières qui la limitent sont indiquées. |
| Cas d'erreur | Produit sans nomenclature : 400 |
| Règles | RG-23 |
| Critères d'acceptation | TA-01 (125 m, 40 fermetures, 200 boutons : capacité 40, limitante : fermeture) |
| Écart avec les sources | L'Introduction affiche aussi la « matière restante » (10 m, 3 m par pantalon : 3 pantalons, 1 m restant) ; cet indicateur n'est pas affiché (EC-09) |

#### F-PLA-02 — Vérifier une production et calculer les besoins

| Champ | Contenu |
| --- | --- |
| Objectif | Savoir si N produits sont faisables, de quelles matières il faut disposer et ce qui manque |
| Acteur | Tous les rôles |
| Scénario nominal | Pour une quantité N : nécessaire = N × quantité de nomenclature (convertie dans l'unité de stock) ; manquant = max(nécessaire − disponible ; 0). Le résultat indique si la production est faisable et la liste « à acheter ». |
| Cas d'erreur | Quantité invalide : 400 ; produit sans nomenclature : 400 |
| Règles | RG-21, RG-24 |
| Critères d'acceptation | TA-02 (100 pantalons : 250 m, 100 fermetures, 200 boutons nécessaires ; à acheter : 125 m, 60 fermetures, 0 bouton) |

#### F-PLA-03 — Préparer une commande à partir des manquants

| Champ | Contenu |
| --- | --- |
| Objectif | Passer du manque à la commande en un geste |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Si la production est impossible, le bouton « Créer une commande pour les matières manquantes » ouvre un brouillon prérempli (matières et quantités manquantes dans l'unité de stock) à compléter par le fournisseur |
| Critères d'acceptation | Le brouillon de TA-02 contient 125 m de tissu et 60 fermetures |
| Source | Fonction ajoutée en cours de projet **\[VALIDÉ\]** |

### 6.11 Module ACH — Achats

#### F-ACH-01 — Gérer les fournisseurs

| Champ | Contenu |
| --- | --- |
| Objectif | Savoir où acheter (Conception § 38) |
| Acteur | MANAGER, ADMIN (lecture : tous) |
| Scénario nominal | Paramètres › Fournisseurs : ajout (nom, contact, e-mail, téléphone), modification en ligne, suppression |
| Cas alternatifs | Fournisseur ayant des commandes : la suppression le **désactive** |
| Cas d'erreur | E-mail mal formé : 400 ; commande pour un fournisseur inactif : 400 |
| Limite | L'e-mail d'un fournisseur peut être remplacé mais pas effacé |
| Règles | RG-08, RG-31 |
| Critères d'acceptation | Un fournisseur désactivé n'apparaît plus dans le choix d'une nouvelle commande |

#### F-ACH-02 — Créer et modifier un brouillon de commande

| Champ | Contenu |
| --- | --- |
| Objectif | Préparer un achat de matières |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | 1) Choix d'un fournisseur actif, notes facultatives. 2) Lignes : matière, quantité, unité (même catégorie que la matière), prix unitaire facultatif. 3) La commande reçoit le numéro PO-nnnnn au statut « brouillon ». 4) Elle reste modifiable tant qu'elle est en brouillon. |
| Cas d'erreur | Aucune ligne : 400 ; matière en double : 400 ; quantité ≤ 0 ou prix négatif : 400 ; unité incompatible : 400 ; modification d'une commande non brouillon : 409 |
| Règles | RG-30, RG-31, RG-33 |
| Critères d'acceptation | Une commande avec 12 500 cm de tissu pour une matière en m est acceptée ; une unité en kg est refusée |

#### F-ACH-03 — Passer ou annuler une commande

| Champ | Contenu |
| --- | --- |
| Objectif | Faire avancer le cycle de la commande |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | « Passer la commande » : brouillon vers commandée. « Annuler » (avec confirmation) : brouillon ou commandée vers annulée |
| Cas d'erreur | Passer une commande qui n'est pas en brouillon : 409 ; annuler une commande reçue : 409 |
| Règles | RG-30 |
| Critères d'acceptation | Une commande annulée ne peut plus être réceptionnée et ne change aucun stock |

#### F-ACH-04 — Réceptionner une commande

| Champ | Contenu |
| --- | --- |
| Objectif | Entrer en stock ce qui a été livré |
| Acteur | OPERATOR, MANAGER, ADMIN |
| Préconditions | La commande est au statut « commandée » |
| Scénario nominal | 1) L'utilisateur choisit « Marquer comme reçue » et confirme. 2) Pour chaque ligne, une entrée de stock est créée dans l'unité de stock de la matière (référence PO-nnnnn). 3) Si la ligne a un prix, le coût moyen de la matière est recalculé (F-RAP-01). 4) Le statut devient « reçue ». Tout se fait en une transaction. |
| Cas alternatifs | Une matière désactivée depuis la commande est quand même réceptionnée |
| Cas d'erreur | Commande non commandée : 409 ; double réception (clic répété ou appels parallèles) : une seule réussit, l'autre reçoit 409, le stock n'est ajouté qu'une fois |
| Limite | Réception **intégrale uniquement** ; pas de réception partielle **\[À CONFIRMER\]** |
| Règles | RG-32, RG-40 |
| Critères d'acceptation | TA-06 |

### 6.12 Module ALE — Alertes et tableau de bord

#### F-ALE-01 — Alertes de stock

| Champ | Contenu |
| --- | --- |
| Objectif | Signaler les stocks bas ou épuisés avant qu'ils bloquent la production |
| Acteur | Tous les rôles (lecture) |
| Scénario nominal | Une matière à 0 est en « rupture » ; une matière dont le stock est inférieur ou égal à un seuil minimum positif est en « stock faible ». Un produit fini n'alerte que si un seuil minimum positif est défini. Les alertes s'affichent sur le tableau de bord ; la liste des matières met en évidence le stock bas. |
| Règles | RG-16, RG-17 |
| Remarques | Alertes à l'écran uniquement, sans e-mail **\[RETENU\]**. Une matière neuve à 0 est immédiatement en rupture (comportement conforme à la Conception § 37). |
| Écart avec les sources | L'alerte « matière nécessaire à une production » (Conception § 37) n'existe pas (EC-09) **\[À CONFIRMER\]** |
| Critères d'acceptation | Avec un seuil de 100 sur un produit à 82 : alerte « stock faible » ; une matière à 0 : « rupture » ; un seuil à 0 sur un produit : aucune alerte |

#### F-ALE-02 — Tableau de bord

| Champ | Contenu |
| --- | --- |
| Objectif | Donner la situation dès la connexion |
| Acteur | Tous les rôles |
| Scénario nominal | Trois compteurs (produits, matières, alertes), le tableau des alertes (nom, stock, seuil, état, mention « produit fini »), le stock des produits finis avec lien vers leur fiche |
| Écart avec les sources | Le bloc « État des stocks » du schéma de la Conception § 34 n'est pas réalisé (EC-09) **\[À CONFIRMER\]** |
| Critères d'acceptation | Le nombre d'alertes affiché est égal au nombre de lignes du tableau d'alertes |

### 6.13 Module RAP — Rapports et valorisation

#### F-RAP-01 — Coût moyen pondéré d'une matière

| Champ | Contenu |
| --- | --- |
| Objectif | Connaître le coût d'une unité de stock de chaque matière |
| Acteur | Système (à la réception) ; MANAGER pour correction manuelle |
| Scénario nominal | À la réception d'une ligne avec prix : nouveau coût = (stock × coût actuel + quantité reçue × prix ramené à l'unité de stock) ÷ (stock + quantité reçue). Le prix d'une ligne est donné par unité de la ligne ; il est converti. |
| Cas alternatifs | Ligne sans prix : le coût ne change pas ; stock nul avant réception : le coût devient le prix reçu |
| Cas d'erreur | Coût négatif saisi à la main : 400 |
| Règles | RG-40 |
| Critères d'acceptation | TA-07 |
| Source | Valorisation ajoutée en cours de projet (la Conception cite « Valeur du stock » en évolution future) **\[VALIDÉ\]** |

#### F-RAP-02 — Valeur du stock

| Champ | Contenu |
| --- | --- |
| Objectif | Chiffrer le stock |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Matières : quantité × coût moyen. Produits finis : quantité × coût de la nomenclature aux coûts actuels des matières (estimation). Trois totaux (matières, produits, général) et un détail par élément. |
| Cas alternatifs | Produit sans nomenclature : valeur 0 |
| Règles | RG-41 |
| Critères d'acceptation | TA-08 |

#### F-RAP-03 — Production mensuelle

| Champ | Contenu |
| --- | --- |
| Objectif | Suivre l'activité de fabrication dans le temps |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Graphique en barres des pièces fabriquées par mois sur 6, 12 ou 24 mois, avec nombre de productions et détail par produit en infobulle et en tableau |
| Cas alternatifs | Les mois sans production valent 0 ; les productions annulées sont exclues |
| Cas d'erreur | Nombre de mois hors de 1 à 60 : 400 |
| Règles | RG-42 |
| Critères d'acceptation | Une production de 10 puis une production de 3 annulée donnent 10 pour le mois courant |

#### F-RAP-04 — Matières les plus consommées et produits les plus fabriqués

| Champ | Contenu |
| --- | --- |
| Objectif | Identifier ce qui pèse le plus dans l'activité |
| Acteur | MANAGER, ADMIN |
| Scénario nominal | Classements (10 premiers) sur une période au choix. Matières : quantité consommée par la production (annulations déduites), quantité perdue (mouvements de perte, à part) et coût consommé. Produits : pièces fabriquées et nombre de productions. |
| Cas d'erreur | Date invalide : 400 |
| Règles | RG-42 |
| Critères d'acceptation | TA-09 |

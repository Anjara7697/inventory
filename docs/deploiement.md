# Mettre Inventory en production sur un VPS Contabo

Ce guide met l'application en ligne sur un VPS **Contabo sous Ubuntu 24.04**, avec ton **nom de domaine** et le **HTTPS automatique**. Les étapes sont dans l'ordre : suis-les une par une.

> Dans ce guide, remplace :
> - `inventory.mondomaine.com` par **ton domaine** (ou sous-domaine) ;
> - `203.0.113.10` par **l'adresse IP de ton VPS** (visible dans le panneau Contabo) ;
> - `admin@mondomaine.com` par **ton email**.
>
> Les blocs marqués **PC (PowerShell)** se lancent sur ton ordinateur Windows. Les blocs marqués **VPS** se lancent sur le serveur, après connexion SSH.

---

## Ce qu'on va obtenir

```
Internet ──► https://inventory.mondomaine.com ──► Caddy (HTTPS, ports 80/443)
                                                   ├─ /api/*  ──► API NestJS ──► PostgreSQL
                                                   └─ le reste ─► Interface Next.js
```

- **Caddy** obtient et renouvelle tout seul le certificat HTTPS (Let's Encrypt).
- L'**interface** est sur `https://inventory.mondomaine.com`, l'**API** sur `https://inventory.mondomaine.com/api`.
- **PostgreSQL et l'API ne sont pas exposés** sur Internet : seul Caddy l'est.
- Tout est décrit dans `docker-compose.prod.yml` et `deploy/Caddyfile`, déjà présents dans le dépôt.

Durée : environ **45 minutes** la première fois.

---

## Sommaire

1. [Pointer le domaine vers le VPS](#1-pointer-le-domaine-vers-le-vps)
2. [Première connexion au VPS](#2-première-connexion-au-vps)
3. [Créer un utilisateur et sécuriser SSH](#3-créer-un-utilisateur-et-sécuriser-ssh)
4. [Activer le pare-feu](#4-activer-le-pare-feu)
5. [Installer Docker](#5-installer-docker)
6. [Récupérer le code](#6-récupérer-le-code)
7. [Configurer les secrets](#7-configurer-les-secrets)
8. [Lancer l'application](#8-lancer-lapplication)
9. [Premiers pas dans l'application](#9-premiers-pas-dans-lapplication)
10. [Sauvegardes automatiques](#10-sauvegardes-automatiques)
11. [Mettre à jour l'application](#11-mettre-à-jour-lapplication)
12. [Déploiement automatique](#12-déploiement-automatique)
13. [Commandes utiles au quotidien](#13-commandes-utiles-au-quotidien)
14. [Dépannage](#14-dépannage)
15. [Checklist de sécurité](#15-checklist-de-sécurité)

---

## 1. Pointer le domaine vers le VPS

Chez ton **registrar** (l'endroit où tu as acheté le domaine : OVH, Namecheap, Cloudflare, Contabo…), ouvre la gestion DNS et ajoute :

| Type | Nom (hôte) | Valeur | TTL |
|---|---|---|---|
| `A` | `inventory` (ou `@` pour le domaine principal) | `203.0.113.10` | 3600 (ou « auto ») |

- Si Contabo t'a donné une adresse **IPv6** et que tu veux l'utiliser, ajoute aussi un enregistrement `AAAA`. Sinon, ne mets **pas** de `AAAA` : un `AAAA` faux empêche le HTTPS.
- Si ton DNS est chez **Cloudflare**, mets le nuage en **gris (DNS only)**, au moins pour la première mise en route.

**Vérifier (PC, PowerShell)** — peut prendre de quelques minutes à quelques heures :

```powershell
nslookup inventory.mondomaine.com
```

La réponse doit afficher l'IP de ton VPS. **Ne passe pas à l'étape 8 avant que ce soit le cas**, sinon Caddy ne pourra pas obtenir le certificat.

---

## 2. Première connexion au VPS

Contabo t'a envoyé par email l'**IP** et le **mot de passe root**. Windows 10/11 inclut SSH.

**PC (PowerShell) :**

```powershell
ssh root@203.0.113.10
```

Réponds `yes` à la question sur l'empreinte, puis saisis le mot de passe (rien ne s'affiche quand tu tapes, c'est normal).

**VPS — mettre le système à jour et régler l'heure :**

```bash
apt update && apt upgrade -y
timedatectl set-timezone Indian/Antananarivo
reboot
```

Le serveur redémarre : attends une minute, puis reconnecte-toi avec `ssh root@203.0.113.10`.

| Commande | Rôle |
|---|---|
| `apt update` | met à jour la liste des logiciels disponibles |
| `apt upgrade -y` | installe les mises à jour (`-y` répond oui automatiquement) |
| `timedatectl set-timezone …` | met l'heure de Madagascar (utile pour les dates des sauvegardes et des logs) |

---

## 3. Créer un utilisateur et sécuriser SSH

Travailler en `root` est risqué. On crée un utilisateur `deploy`, puis on remplace le mot de passe SSH par une **clé**.

**VPS — créer l'utilisateur :**

```bash
adduser deploy
usermod -aG sudo deploy
```

`adduser` demande un mot de passe (garde-le, il sert pour `sudo`) ; les autres questions peuvent rester vides.

**PC (PowerShell) — créer ta clé SSH** (une seule fois par ordinateur) :

```powershell
ssh-keygen -t ed25519 -C "anjara-pc"
```

Appuie sur Entrée pour l'emplacement par défaut. Une phrase de passe est recommandée.

**PC (PowerShell) — copier la clé sur le VPS :**

```powershell
type $env:USERPROFILE\.ssh\id_ed25519.pub | ssh root@203.0.113.10 "mkdir -p /home/deploy/.ssh && cat >> /home/deploy/.ssh/authorized_keys && chown -R deploy:deploy /home/deploy/.ssh && chmod 700 /home/deploy/.ssh && chmod 600 /home/deploy/.ssh/authorized_keys"
```

**PC — tester la connexion avec la clé** (dans une **nouvelle** fenêtre, sans fermer l'autre) :

```powershell
ssh deploy@203.0.113.10
```

Elle ne doit **pas** demander le mot de passe du serveur (seulement la phrase de passe de ta clé, si tu en as mis une).

**VPS — interdire root et les mots de passe en SSH** (une fois que la connexion par clé fonctionne) :

```bash
sudo tee /etc/ssh/sshd_config.d/99-hardening.conf > /dev/null <<'EOF'
PermitRootLogin no
PasswordAuthentication no
KbdInteractiveAuthentication no
EOF
sudo systemctl restart ssh
```

> ⚠️ Garde une session ouverte pendant ce changement et teste `ssh deploy@203.0.113.10` dans une autre fenêtre avant de tout fermer. En cas de blocage, le panneau Contabo propose une **console VNC** pour reprendre la main.

À partir d'ici, connecte-toi toujours avec `ssh deploy@203.0.113.10`.

---

## 4. Activer le pare-feu

**VPS :**

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 443/udp
sudo ufw enable
sudo ufw status
```

| Port | Pour quoi |
|---|---|
| 22 (OpenSSH) | ta connexion SSH. **Toujours l'autoriser avant `enable`** |
| 80 | HTTP : Let's Encrypt et la redirection vers HTTPS |
| 443 tcp/udp | HTTPS (udp = HTTP/3, plus rapide sur mobile) |

PostgreSQL (5432) et l'API (3001) ne sont **pas** ouverts : ils ne sont accessibles qu'à l'intérieur de Docker.

**Optionnel — fichier d'échange (swap)**, recommandé si ton VPS a 4 Go de RAM ou moins (la construction des images est gourmande) :

```bash
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile
sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
free -h
```

---

## 5. Installer Docker

**VPS :**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker deploy
exit
```

Reconnecte-toi (`ssh deploy@203.0.113.10`) pour que le groupe `docker` soit pris en compte, puis vérifie :

```bash
docker --version
docker compose version
docker run --rm hello-world
```

| Commande | Rôle |
|---|---|
| `curl … get.docker.com \| sudo sh` | script officiel qui installe Docker Engine et le plugin Compose |
| `usermod -aG docker deploy` | permet à `deploy` d'utiliser Docker sans `sudo` |
| `docker run --rm hello-world` | test : doit afficher « Hello from Docker! » |

---

## 6. Récupérer le code

**VPS :**

```bash
sudo apt install -y git
cd ~
git clone https://github.com/Anjara7697/inventory.git
cd inventory
```

**Si le dépôt est privé**, GitHub refusera ce `git clone`. Dans ce cas, crée une **clé de déploiement** (accès en lecture seule à ce seul dépôt) :

```bash
ssh-keygen -t ed25519 -C "vps-inventory" -f ~/.ssh/github_inventory -N ""
cat ~/.ssh/github_inventory.pub
```

1. Copie la ligne affichée.
2. Sur GitHub : dépôt **inventory** → **Settings** → **Deploy keys** → **Add deploy key**. Colle la clé, laisse « Allow write access » **décoché**, puis **Add key**.
3. Clone avec cette clé :

```bash
cat >> ~/.ssh/config <<'EOF'
Host github-inventory
  HostName github.com
  User git
  IdentityFile ~/.ssh/github_inventory
EOF
git clone git@github-inventory:Anjara7697/inventory.git
cd inventory
```

---

## 7. Configurer les secrets

Tous les réglages de production sont dans un fichier `.env.production`. Ce fichier **reste sur le serveur** et n'est jamais envoyé sur GitHub (il est dans `.gitignore`).

**VPS :**

```bash
cp .env.production.example .env.production
openssl rand -hex 32   # lance-la 4 fois : une valeur par secret
nano .env.production
```

Remplis chaque ligne :

| Variable | Valeur |
|---|---|
| `DOMAIN` | ton domaine, **sans** `https://` (ex. `inventory.mondomaine.com`) |
| `POSTGRES_PASSWORD` | une valeur `openssl rand -hex 32` |
| `JWT_ACCESS_SECRET` | une autre valeur `openssl rand -hex 32` |
| `JWT_REFRESH_SECRET` | encore une autre, **différente** de la précédente |
| `SEED_ADMIN_EMAIL` | ton email : ce sera l'identifiant du premier administrateur |
| `SEED_ADMIN_PASSWORD` | un mot de passe fort pour ce compte (tu pourras le changer dans « Mon profil ») |
| `SEED_DEMO` | `false` : base vide, sans l'exemple « Pantalon Jean » |
| `CURRENCY` | `MGA` (Ariary) |

Dans `nano` : `Ctrl + O` puis Entrée pour enregistrer, `Ctrl + X` pour quitter.

**Protéger le fichier :**

```bash
chmod 600 .env.production
```

> 🔒 Conserve une copie de `.env.production` dans un gestionnaire de mots de passe. Sans `POSTGRES_PASSWORD`, une sauvegarde reste restaurable, mais la base actuelle devient inaccessible.
> Ne change **pas** `POSTGRES_PASSWORD` après le premier démarrage : PostgreSQL l'enregistre à la création de la base.

---

## 8. Lancer l'application

**VPS :**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

- La **première fois prend 5 à 10 minutes** (construction de l'API et de l'interface).
- Au démarrage, l'API applique les migrations, puis crée les unités, les caractéristiques et ton compte administrateur.
- Caddy demande ensuite le certificat HTTPS, en quelques secondes.

**Suivre le démarrage :**

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production ps
docker compose -f docker-compose.prod.yml --env-file .env.production logs -f backend caddy
```

`Ctrl + C` arrête l'affichage des logs (l'application continue de tourner). Tout va bien quand :
- les 4 services (`postgres`, `backend`, `frontend`, `caddy`) sont `running` ou `healthy` ;
- les logs du backend affichent `Seed done` puis `Nest application successfully started` ;
- les logs de Caddy affichent `certificate obtained successfully`.

**Tester :** ouvre `https://inventory.mondomaine.com` dans ton navigateur. Tu dois voir la page de connexion, avec le cadenas.

> **Raccourci.** Pour ne pas retaper la longue commande, crée un alias :
> ```bash
> echo "alias dc='docker compose -f ~/inventory/docker-compose.prod.yml --env-file ~/inventory/.env.production'" >> ~/.bashrc
> source ~/.bashrc
> ```
> Ensuite : `dc ps`, `dc logs -f backend`, `dc restart frontend`…

---

## 9. Premiers pas dans l'application

1. Connecte-toi avec `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
2. **Mon profil** → change le mot de passe si celui du fichier `.env.production` a circulé.
3. **Paramètres** :
   - **Unités** : vérifie les unités, ajoute celles de ton atelier ;
   - **Caractéristiques** : couleur, composition… ;
   - **Fournisseurs** : tes fournisseurs ;
   - **Utilisateurs** : un compte pour chaque personne, avec le bon rôle.
4. **Matières**, puis **Produits** avec leur nomenclature.
5. **Stocks** → « Nouveau mouvement » → **Entrée** pour saisir le stock initial.

---

## 10. Sauvegardes automatiques

Le script `deploy/backup.sh` exporte la base dans `~/backups`, compressée, et garde les **14 derniers jours**.

**VPS — tester une sauvegarde :**

```bash
~/inventory/deploy/backup.sh
ls -lh ~/backups
```

**VPS — programmer une sauvegarde chaque nuit à 2 h 30 :**

```bash
crontab -e
```

Choisis `nano` si on te le demande, puis ajoute la ligne suivante à la fin du fichier :

```
30 2 * * * /home/deploy/inventory/deploy/backup.sh >> /home/deploy/backups/backup.log 2>&1
```

**PC (PowerShell) — rapatrier les sauvegardes sur ton ordinateur** (à faire régulièrement : une sauvegarde qui reste sur le même serveur ne protège pas contre la perte du serveur) :

```powershell
mkdir $env:USERPROFILE\Documents\Inventory\backups -Force
scp "deploy@203.0.113.10:~/backups/*.sql.gz" $env:USERPROFILE\Documents\Inventory\backups\
```

**Restaurer une sauvegarde (VPS)** — ⚠️ cela **remplace** les données actuelles :

```bash
cd ~/inventory
gunzip -c ~/backups/inventory-2026-10-02_0230.sql.gz | \
  docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres psql -U inventory inventory
```

> Contabo propose aussi des **snapshots** du VPS entier dans son panneau : c'est un bon complément avant une grosse mise à jour.

---

## 11. Mettre à jour l'application

> Une fois l'étape 12 en place, cette mise à jour se fait **toute seule** à chaque modification de `main`. La commande ci-dessous reste utile pour mettre à jour à la main.

Après avoir fusionné de nouvelles modifications dans `main` sur GitHub :

**VPS :**

```bash
cd ~/inventory
./deploy/update.sh
```

Le script :
1. fait une **sauvegarde** de la base ;
2. récupère le nouveau code et avance `main`, sans jamais écraser de modification locale ;
3. reconstruit et redémarre les conteneurs. Les migrations s'appliquent automatiquement au démarrage de l'API ;
4. nettoie les anciennes images Docker.

Pendant la reconstruction, l'application reste en ligne. La coupure ne dure que quelques secondes, au redémarrage des conteneurs.

**Revenir à la version précédente** si une mise à jour pose problème :

```bash
cd ~/inventory
git log --oneline -5             # repérer le commit d'avant
git checkout <id-du-commit>
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

Puis, une fois le problème corrigé sur GitHub : `git checkout main && ./deploy/update.sh`.

> Si la mise à jour contenait une migration, restaure aussi la sauvegarde faite juste avant (voir l'étape 10).

## 12. Déploiement automatique

Avec cette étape, **chaque modification de `main` part en production toute seule**. Tu n'as plus besoin de te connecter au VPS.

```
push / fusion sur main ──► CI (compilation + tests) ──► vert ? ──► Deploy ──► SSH ──► VPS : update.sh <commit>
                                                       rouge ? ──► rien n'est déployé       └─► vérifie que le site répond
```

- Le workflow **Deploy** (`.github/workflows/deploy.yml`) ne démarre **que si la CI est verte**. Un code qui ne compile pas n'arrive jamais en production.
- Il déploie **exactement le commit testé**, et les déploiements passent l'un après l'autre, jamais en même temps.
- À la fin, il vérifie que l'interface et l'API répondent. Sinon, le run passe en rouge et GitHub t'envoie un email.
- **Sécurité** : GitHub a sa propre clé SSH, qui ne peut **rien faire d'autre** que lancer `update.sh`. Même si quelqu'un la volait, il ne pourrait pas ouvrir de terminal sur le VPS. Le script refuse aussi tout ce qui n'est pas un commit de `main`.

> Fais les points 1 à 5 **avant** de fusionner la Pull Request qui ajoute ce workflow : le tout premier déploiement automatique se lance dès la fusion.

**1. GitHub — vérifier que la CI est verte.** Onglet **Actions** du dépôt → workflow **CI** → le dernier run sur `main` doit avoir une coche verte. Si ce n'est pas le cas, corrige-le d'abord, sinon Deploy ne se lancera jamais.

**2. VPS — créer la clé de déploiement et la limiter à `update.sh` :**

```bash
ssh-keygen -t ed25519 -N "" -C "github-actions-deploy" -f ~/gh_deploy
echo "command=\"$HOME/inventory/deploy/update.sh\",restrict $(cat ~/gh_deploy.pub)" >> ~/.ssh/authorized_keys
cat ~/gh_deploy
```

La dernière commande affiche la **clé privée**. Copie-la **en entier**, de la ligne `-----BEGIN OPENSSH PRIVATE KEY-----` à la ligne `-----END OPENSSH PRIVATE KEY-----` incluses.

**3. VPS — afficher l'empreinte du serveur** (elle permet à GitHub de vérifier qu'il parle bien à ton VPS) :

```bash
echo "203.0.113.10 $(cut -d' ' -f1,2 /etc/ssh/ssh_host_ed25519_key.pub)"
```

**4. GitHub — enregistrer les secrets et les variables.** Dans le dépôt : **Settings → Secrets and variables → Actions**.

Onglet **Secrets** → **New repository secret** :

| Nom | Valeur |
|---|---|
| `VPS_SSH_KEY` | la clé privée copiée au point 2 |
| `VPS_KNOWN_HOSTS` | la ligne affichée au point 3 |

Onglet **Variables** → **New repository variable** :

| Nom | Valeur |
|---|---|
| `VPS_HOST` | `203.0.113.10` (l'IP du VPS) |
| `DOMAIN` | `inventory.mondomaine.com` |
| `VPS_USER` | `deploy` (facultatif : c'est la valeur par défaut) |

**5. VPS — supprimer la clé privée.** Elle est maintenant dans GitHub et n'a plus rien à faire sur le serveur :

```bash
rm ~/gh_deploy ~/gh_deploy.pub
```

**6. Tester.** Une fois la Pull Request fusionnée : onglet **Actions** → **Deploy** → **Run workflow** (branche `main`). Les étapes s'affichent en direct. Le run dure le temps de la reconstruction, en général quelques minutes.

**Au quotidien :**

- Tu fusionnes une Pull Request dans `main`, et c'est tout. Tu suis le déploiement dans l'onglet **Actions**. La page d'accueil du dépôt affiche aussi l'environnement **production** avec la dernière version déployée.
- **Redéployer** sans changement de code : **Actions → Deploy → Run workflow**.
- **Revenir en arrière** : sur GitHub, ouvre la Pull Request fautive et clique sur **Revert**, puis fusionne la PR créée. Le retour en arrière se déploie automatiquement, comme n'importe quel changement. Si la version annulée contenait une migration, restaure aussi la sauvegarde faite juste avant (étape 10) : `update.sh` en fait une avant chaque déploiement.
- **Valider chaque déploiement à la main** (facultatif) : **Settings → Environments → production → Required reviewers**, puis ajoute-toi. GitHub attendra ton clic sur **Approve** avant chaque mise en production.
- `./deploy/update.sh` reste utilisable à la main sur le VPS, comme à l'étape 11.

---

## 13. Commandes utiles au quotidien

Avec l'alias `dc` de l'étape 8 (sinon, remplace `dc` par `docker compose -f docker-compose.prod.yml --env-file .env.production`) :

| Commande | Effet |
|---|---|
| `dc ps` | état des 4 services |
| `dc logs -f backend` | messages de l'API en direct (`Ctrl + C` pour quitter) |
| `dc logs --tail 100 caddy` | 100 dernières lignes de Caddy (HTTPS, accès) |
| `dc restart backend` | redémarre l'API |
| `dc up -d --build frontend` | reconstruit seulement l'interface (ex. après un changement de `CURRENCY`) |
| `dc down` | arrête tout. **Les données restent** dans le volume `pgdata` |
| `dc up -d` | redémarre tout sans reconstruire |
| `dc exec postgres psql -U inventory inventory` | console SQL (`\dt` liste les tables, `\q` pour quitter) |
| `docker stats` | utilisation CPU et mémoire de chaque conteneur |
| `df -h` | espace disque libre |
| `sudo apt update && sudo apt upgrade -y` | mises à jour de sécurité du système (une fois par mois) |

> ⚠️ N'utilise **jamais** `dc down -v` en production : `-v` **efface la base de données**.
> Les conteneurs redémarrent seuls après un redémarrage du VPS (`restart: unless-stopped`).

---

## 14. Dépannage

| Symptôme | Cause probable | Solution |
|---|---|---|
| Le navigateur affiche une erreur de certificat, ou Caddy écrit `challenge failed` dans ses logs | le DNS ne pointe pas encore vers le VPS, ou les ports 80/443 sont fermés | `nslookup ton-domaine` doit donner l'IP du VPS ; vérifier `sudo ufw status` ; puis `dc restart caddy` |
| `required variable … is missing a value` | une ligne de `.env.production` est vide | compléter le fichier, puis relancer |
| Page blanche, ou « Le serveur ne répond pas » à la connexion | l'API ne tourne pas | `dc logs backend` : chercher l'erreur (souvent `DATABASE_URL` ou un secret manquant) |
| `502 Bad Gateway` | un conteneur redémarre en boucle | `dc ps` puis `dc logs <service>` |
| La construction s'arrête avec `Killed` ou `exit code 137` | mémoire insuffisante | ajouter le swap (étape 4) puis relancer |
| `password authentication failed for user "inventory"` | `POSTGRES_PASSWORD` modifié après le premier démarrage | remettre l'ancienne valeur (voir la copie de `.env.production`) |
| La devise ou le domaine ne change pas dans l'interface | ces valeurs sont intégrées au moment de la construction | `dc up -d --build frontend` |
| `Permission denied` en lançant `./deploy/backup.sh` ou `update.sh` | le fichier a perdu son droit d'exécution | `chmod +x ~/inventory/deploy/*.sh` |
| GitHub Actions : `Permission denied (publickey)` | clé privée mal copiée dans `VPS_SSH_KEY`, ou ligne absente de `authorized_keys` | refaire l'étape 12 (points 2 à 5) |
| GitHub Actions : `Host key verification failed` | le VPS a été réinstallé, son empreinte a changé | refaire le point 3 de l'étape 12 et mettre à jour `VPS_KNOWN_HOSTS` |
| Le workflow **Deploy** ne se lance pas après une fusion | la **CI** a échoué : on ne déploie jamais un code cassé | onglet **Actions** → ouvrir le run CI en rouge et corriger |
| Plus d'accès SSH | mauvaise clé, ou règle de pare-feu | console **VNC** dans le panneau Contabo |

---

## 15. Checklist de sécurité

- [ ] Connexion SSH par clé uniquement, `root` interdit (étape 3)
- [ ] Pare-feu actif avec seulement 22, 80 et 443 (étape 4)
- [ ] Secrets générés avec `openssl rand -hex 32`, tous différents, `.env.production` en `chmod 600` (étape 7)
- [ ] Mot de passe administrateur changé après la première connexion (étape 9)
- [ ] Un compte par personne, avec le rôle le plus bas suffisant (Paramètres → Utilisateurs)
- [ ] Sauvegarde nocturne programmée **et** copiée régulièrement hors du serveur (étape 10)
- [ ] Mises à jour du système une fois par mois (étape 13)
- [ ] Clé de déploiement GitHub limitée à `update.sh` (`restrict`) et clé privée supprimée du VPS (étape 12)

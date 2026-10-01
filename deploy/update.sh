#!/bin/sh
# Update production: backup, fetch, fast-forward main, rebuild, restart.
#   ./deploy/update.sh          -> latest commit of origin/main
#   ./deploy/update.sh <sha>    -> that commit (it must be on main)
# GitHub Actions calls this through a restricted SSH key (forced command, see docs/deploiement.md):
# the commit to deploy then arrives in SSH_ORIGINAL_COMMAND.
set -eu
cd "$(dirname "$0")/.."

REF="${1:-${SSH_ORIGINAL_COMMAND:-}}"
case "$REF" in
  "") REF=origin/main ;;
  *[!0-9a-f]*) echo "Refusé : « $REF » n'est pas un identifiant de commit." >&2; exit 2 ;;
esac

# One deployment at a time: a second one waits for the first to finish.
exec 9>"${TMPDIR:-/tmp}/inventory-deploy.lock"
flock -w 1800 9

echo "==> Récupération du code"
git fetch --quiet origin main
if ! git merge-base --is-ancestor "$REF" origin/main 2>/dev/null; then
  echo "Refusé : $REF n'est pas un commit de main." >&2
  exit 2
fi

echo "==> Sauvegarde de la base"
./deploy/backup.sh

echo "==> Passage à $(git rev-parse --short "$REF")"
git checkout --quiet main
git merge --quiet --ff-only "$REF"

echo "==> Reconstruction et redémarrage"
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f > /dev/null
docker compose -f docker-compose.prod.yml --env-file .env.production ps

echo "==> Déployé : $(git log -1 --format='%h %s')"

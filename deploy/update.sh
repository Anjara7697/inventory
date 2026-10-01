#!/bin/sh
# Update the production server to the latest main: backup, pull, rebuild, restart.
set -eu
cd "$(dirname "$0")/.."
./deploy/backup.sh
git pull --ff-only
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
docker image prune -f
docker compose -f docker-compose.prod.yml --env-file .env.production ps

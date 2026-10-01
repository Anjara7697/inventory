#!/bin/sh
# Daily PostgreSQL backup, keeps the last 14 days.
# Install (as the deploy user):  crontab -e   then add:
#   30 2 * * * /home/deploy/inventory/deploy/backup.sh >> /home/deploy/backups/backup.log 2>&1
set -eu
cd "$(dirname "$0")/.."
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
mkdir -p "$BACKUP_DIR"
FILE="$BACKUP_DIR/inventory-$(date +%Y-%m-%d_%H%M).sql.gz"
docker compose -f docker-compose.prod.yml --env-file .env.production exec -T postgres \
  pg_dump -U inventory --clean --if-exists inventory | gzip > "$FILE"
find "$BACKUP_DIR" -name 'inventory-*.sql.gz' -mtime +14 -delete
echo "$(date '+%F %T') backup ok: $FILE ($(du -h "$FILE" | cut -f1))"

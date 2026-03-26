#!/bin/bash
set -euo pipefail

# ---------------------------------------------------------------------------
# Backup Auctorum Systems PostgreSQL database
#
# Run daily via cron:
#   0 3 * * * /opt/auctorum-systems/repo/scripts/backup.sh >> /var/log/auctorum/backup.log 2>&1
#
# Requires DATABASE_URL in the environment (or sourced from .env).
# ---------------------------------------------------------------------------

BACKUP_DIR="/var/backups/auctorum"
DATE=$(date +%Y-%m-%d_%H%M)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR"

echo "[$(date -Iseconds)] Starting backup..."

# Ensure DATABASE_URL is set
if [ -z "${DATABASE_URL:-}" ]; then
  # Try loading from .env
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(dirname "$SCRIPT_DIR")"
  if [ -f "$REPO_ROOT/.env" ]; then
    # shellcheck disable=SC1091
    source "$REPO_ROOT/.env"
  fi
fi

if [ -z "${DATABASE_URL:-}" ]; then
  echo "ERROR: DATABASE_URL not set and no .env found"
  exit 1
fi

BACKUP_FILE="$BACKUP_DIR/auctorum_${DATE}.sql.gz"

pg_dump "$DATABASE_URL" \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  | gzip > "$BACKUP_FILE"

BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "[$(date -Iseconds)] Backup created: auctorum_${DATE}.sql.gz ($BACKUP_SIZE)"

# Clean old backups
DELETED=$(find "$BACKUP_DIR" -name "auctorum_*.sql.gz" -mtime +${RETENTION_DAYS} -delete -print | wc -l)
echo "[$(date -Iseconds)] Cleaned $DELETED backup(s) older than ${RETENTION_DAYS} days"

echo "[$(date -Iseconds)] Backup complete."

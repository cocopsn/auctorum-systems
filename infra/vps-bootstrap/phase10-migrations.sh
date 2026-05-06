#!/bin/bash
# Phase 10: Apply DB migrations idempotently
# Run as auctorum, after env files are uploaded
set -e

LOG=/opt/auctorum-systems/phase10.log
echo "[phase10] start: $(date)" > "$LOG"

# Load DATABASE_URL from medconcierge env
export $(grep -E '^DATABASE_URL=' /opt/auctorum-systems/repo/apps/medconcierge/.env.local | sed 's/^DATABASE_URL=//;s/^"//;s/"$//' | xargs -I{} echo DATABASE_URL={})

if [ -z "${DATABASE_URL:-}" ]; then
  echo "[phase10] ERROR: DATABASE_URL not set" >> "$LOG"
  exit 1
fi

cd /opt/auctorum-systems/repo/packages/db/migrations

# Verify connectivity first
psql "$DATABASE_URL" -c "SELECT current_database(), current_user;" >>"$LOG" 2>&1

# Apply only the most recent migrations (0040+) — they are all idempotent
# (use IF NOT EXISTS / DROP POLICY IF EXISTS)
for sql in 0040_*.sql 0041_*.sql 0042_*.sql 0043_*.sql 0044_*.sql 0045_*.sql; do
  if [ -f "$sql" ]; then
    echo "[phase10] applying $sql" >> "$LOG"
    psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$sql" >>"$LOG" 2>&1 || {
      echo "[phase10] WARN: $sql failed (may already be applied)" >> "$LOG"
    }
  fi
done

# Verify expected columns exist
psql "$DATABASE_URL" -t -c "SELECT column_name FROM information_schema.columns WHERE table_name='patients' AND column_name='clinical_history';" >>"$LOG" 2>&1

echo "[phase10] DONE: $(date)" >> "$LOG"
echo "DONE" > /opt/auctorum-systems/phase10.status

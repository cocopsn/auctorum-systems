#!/bin/bash
set -euo pipefail

# ============================================================
# deploy.sh — Deploy Auctorum Systems Quote Engine to VPS
# Usage: ./scripts/deploy.sh [user@host]
# ============================================================

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-${1:-YOUR_VPS_IP}}"
APP_DIR="/opt/quote-engine"
LOG_DIR="/var/log/auctorum"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Auctorum Systems — Deploy"
echo "  Target: ${VPS_USER}@${VPS_HOST}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# 1. Build locally first
echo "[1/5] Building locally..."
pnpm run build

# 2. Sync files to VPS (excluding node_modules, .next, .git)
echo "[2/5] Syncing files to VPS..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.env.local' \
  ./ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/"

# 3. Remote setup and build
echo "[3/5] Installing deps & building on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" << REMOTE
set -euo pipefail

# Create log directory
mkdir -p ${LOG_DIR}

cd ${APP_DIR}

# Install dependencies
pnpm install --frozen-lockfile --prod

# Build
pnpm run build

# Run migrations
pnpm db:migrate 2>/dev/null || echo "Migration skipped (run manually if first deploy)"

echo "Build complete on VPS"
REMOTE

# 4. Restart PM2
echo "[4/5] Restarting PM2..."
ssh "${VPS_USER}@${VPS_HOST}" << REMOTE
set -euo pipefail
cd ${APP_DIR}

if pm2 list 2>/dev/null | grep -q "auctorum-quote-engine"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
  pm2 startup 2>/dev/null || true
fi

# Setup cron for reminders (every 4 hours)
(crontab -l 2>/dev/null | grep -v "cron-reminders" ; echo "0 */4 * * * cd ${APP_DIR} && npx tsx scripts/cron-reminders.ts >> ${LOG_DIR}/cron.log 2>&1") | crontab -

echo "PM2 status:"
pm2 status
REMOTE

# 5. Verify
echo "[5/5] Verifying deployment..."
sleep 3
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "https://auctorum.com.mx" 2>/dev/null || echo "000")

if [ "$HTTP_CODE" = "200" ]; then
  echo "━━━ Deploy SUCCESS — https://auctorum.com.mx responded 200 ━━━"
else
  echo "━━━ Deploy complete but site returned HTTP ${HTTP_CODE}. Check logs: ssh ${VPS_USER}@${VPS_HOST} 'pm2 logs' ━━━"
fi

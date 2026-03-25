#!/bin/bash
set -euo pipefail

# ============================================================
# deploy.sh — Deploy to VPS
# Run from local: ./scripts/deploy.sh
# ============================================================

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-YOUR_VPS_IP}"
APP_DIR="/opt/quote-engine"
REPO_URL="${REPO_URL:-git@github.com:YOUR_USER/quote-engine.git}"

echo "━━━ Deploying to ${VPS_HOST} ━━━"

ssh "${VPS_USER}@${VPS_HOST}" << 'REMOTE'
set -euo pipefail
APP_DIR="/opt/quote-engine"

# Pull latest
if [ -d "${APP_DIR}" ]; then
  cd "${APP_DIR}"
  git pull origin main
else
  git clone "${REPO_URL}" "${APP_DIR}"
  cd "${APP_DIR}"
fi

# Install deps
pnpm install --frozen-lockfile

# Build
pnpm build

# Run migrations
pnpm db:migrate

# Restart with PM2
if pm2 list | grep -q "quote-engine"; then
  pm2 restart quote-engine
else
  pm2 start pnpm --name "quote-engine" -- start
  pm2 save
fi

echo "✅ Deploy complete"
REMOTE

echo "━━━ Deploy finished ━━━"

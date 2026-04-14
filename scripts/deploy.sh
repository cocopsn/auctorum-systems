#!/bin/bash
set -euo pipefail

VPS_USER="${VPS_USER:-root}"
VPS_HOST="${VPS_HOST:-${1:-YOUR_VPS_IP}}"
APP_DIR="/opt/auctorum-systems/repo"
LOG_DIR="/var/log/auctorum"
MED_BUILD_NODE_OPTIONS="${MED_BUILD_NODE_OPTIONS:---max-old-space-size=3072}"

echo "============================================"
echo " Auctorum Systems deploy"
echo " Target: ${VPS_USER}@${VPS_HOST}"
echo "============================================"

echo "[1/5] Building locally..."
pnpm --filter web build
NODE_OPTIONS="${MED_BUILD_NODE_OPTIONS}" pnpm --filter medconcierge build

echo "[2/5] Syncing files to VPS..."
rsync -avz --delete \
  --exclude='node_modules' \
  --exclude='.next' \
  --exclude='.git' \
  --exclude='.env.local' \
  ./ "${VPS_USER}@${VPS_HOST}:${APP_DIR}/"

echo "[3/5] Installing dependencies, building and migrating on VPS..."
ssh "${VPS_USER}@${VPS_HOST}" << REMOTE
set -euo pipefail
mkdir -p ${LOG_DIR}
cd ${APP_DIR}
CI=true pnpm install --frozen-lockfile
pnpm --filter web build
NODE_OPTIONS="${MED_BUILD_NODE_OPTIONS}" pnpm --filter medconcierge build
pnpm db:migrate || true
REMOTE

echo "[4/5] Reloading PM2..."
ssh "${VPS_USER}@${VPS_HOST}" << REMOTE
set -euo pipefail
cd ${APP_DIR}
if pm2 list 2>/dev/null | grep -q "auctorum-quote-engine"; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
  pm2 save
fi
pm2 status
REMOTE

echo "[5/5] Verifying root, portal and medical seed..."
sleep 3
for url in "https://auctorum.com.mx" "https://portal.auctorum.com.mx" "https://dr-test.auctorum.com.mx"; do
  code=$(curl -s -o /dev/null -w "%{http_code}" "${url}" 2>/dev/null || echo "000")
  echo "${url} -> ${code}"
done

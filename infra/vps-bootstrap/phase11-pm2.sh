#!/bin/bash
# Phase 11: PM2 startup with ecosystem.config.js
# Run as auctorum
set -euo pipefail

LOG=/opt/auctorum-systems/phase11.log
echo "[phase11] start: $(date)" > "$LOG"

cd /opt/auctorum-systems/repo

# Make sure log dir exists with right perms
mkdir -p /var/log/auctorum 2>/dev/null || sudo mkdir -p /var/log/auctorum
sudo chown auctorum:auctorum /var/log/auctorum 2>/dev/null || true

# Stop any existing
pm2 delete all 2>/dev/null || true

# Start ecosystem
pm2 start ecosystem.config.js >>"$LOG" 2>&1
pm2 save >>"$LOG" 2>&1

# List
pm2 list >>"$LOG" 2>&1

echo "[phase11] DONE: $(date)" >> "$LOG"
echo "DONE" > /opt/auctorum-systems/phase11.status

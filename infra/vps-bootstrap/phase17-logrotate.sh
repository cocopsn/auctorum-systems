#!/bin/bash
# Phase 17: PM2 logrotate
set -euo pipefail

LOG=/opt/auctorum-systems/phase17.log
echo "[phase17] start: $(date)" > "$LOG"

if ! pm2 list 2>/dev/null | grep -q pm2-logrotate; then
  pm2 install pm2-logrotate >>"$LOG" 2>&1
fi

pm2 set pm2-logrotate:max_size 50M >>"$LOG" 2>&1
pm2 set pm2-logrotate:retain 14 >>"$LOG" 2>&1
pm2 set pm2-logrotate:compress true >>"$LOG" 2>&1

pm2 save >>"$LOG" 2>&1

echo "[phase17] DONE: $(date)" >> "$LOG"
echo "DONE" > /opt/auctorum-systems/phase17.status

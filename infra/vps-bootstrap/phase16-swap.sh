#!/bin/bash
# Phase 16: 2GB swap for build pressure
set -euo pipefail

LOG=/root/phase16.log
echo "[phase16] start: $(date)" > "$LOG"

if [ ! -f /swapfile ]; then
  fallocate -l 2G /swapfile
  chmod 600 /swapfile
  mkswap /swapfile >>"$LOG" 2>&1
fi

swapon --show | grep -q /swapfile || swapon /swapfile

if ! grep -q "^/swapfile" /etc/fstab; then
  echo "/swapfile none swap sw 0 0" >> /etc/fstab
fi

free -m >> "$LOG"
swapon --show >> "$LOG"

echo "[phase16] DONE: $(date)" >> "$LOG"
echo "DONE" > /root/phase16.status

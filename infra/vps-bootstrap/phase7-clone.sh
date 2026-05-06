#!/bin/bash
# Phase 7: Clone repo from GitHub branch local-dev
# Run as auctorum user
set -euo pipefail

LOG=/opt/auctorum-systems/phase7.log
echo "[phase7] start: $(date)" > "$LOG"

cd /opt/auctorum-systems
if [ ! -d repo/.git ]; then
  git clone -b local-dev https://github.com/cocopsn/auctorum-systems.git repo >>"$LOG" 2>&1
else
  cd repo
  git fetch origin >>"$LOG" 2>&1
  git checkout local-dev >>"$LOG" 2>&1
  git pull origin local-dev >>"$LOG" 2>&1
fi

cd /opt/auctorum-systems/repo
echo "--- HEAD commit ---" >> "$LOG"
git log --oneline -5 >> "$LOG"

echo "[phase7] DONE: $(date)" >> "$LOG"
echo "DONE" > /opt/auctorum-systems/phase7.status

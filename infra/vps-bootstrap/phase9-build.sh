#!/bin/bash
# Phase 9: pnpm install + build (med + web)
# Run as auctorum user from /opt/auctorum-systems/repo
set -euo pipefail

LOG=/opt/auctorum-systems/phase9.log
echo "[phase9] start: $(date)" > "$LOG"

cd /opt/auctorum-systems/repo

# Install
echo "[phase9] pnpm install" >> "$LOG"
pnpm install >>"$LOG" 2>&1

# Build medconcierge first (heavier)
echo "[phase9] build medconcierge" >> "$LOG"
NODE_OPTIONS='--max-old-space-size=4096' pnpm --filter medconcierge build >>"$LOG" 2>&1

# Build web
echo "[phase9] build web" >> "$LOG"
NODE_OPTIONS='--max-old-space-size=4096' pnpm --filter web build >>"$LOG" 2>&1

echo "[phase9] DONE: $(date)" >> "$LOG"
echo "DONE" > /opt/auctorum-systems/phase9.status

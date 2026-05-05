#!/bin/bash
# Phase 5-6: Node.js 20 + pnpm + PM2, then Redis hardening
set -euo pipefail

LOG=/root/phase5-6.log
echo "[phase5-6] start: $(date)" > "$LOG"

# ---------- PHASE 5: Node.js + pnpm + PM2 ----------
echo "[phase5] Node.js" >> "$LOG"
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | bash - >>"$LOG" 2>&1
  DEBIAN_FRONTEND=noninteractive apt-get install -y -qq nodejs >>"$LOG" 2>&1
fi

# Enable corepack and pnpm
corepack enable >>"$LOG" 2>&1 || true
corepack prepare pnpm@latest --activate >>"$LOG" 2>&1 || true

# PM2 global
if ! command -v pm2 >/dev/null 2>&1; then
  npm install -g pm2 >>"$LOG" 2>&1
fi

node -v >>"$LOG"
pnpm -v >>"$LOG" 2>&1 || echo "pnpm via corepack" >>"$LOG"
pm2 -v >>"$LOG"

# ---------- PHASE 6: Redis hardening ----------
echo "[phase6] Redis hardening" >> "$LOG"

# Generate password if not already set
if ! grep -q "^# Auctorum-hardening$" /etc/redis/redis.conf; then
  REDIS_PASS=$(openssl rand -hex 24)
  cat >> /etc/redis/redis.conf << REDISEOF

# Auctorum-hardening
requirepass $REDIS_PASS
bind 127.0.0.1
maxmemory 256mb
maxmemory-policy noeviction
rename-command FLUSHALL ""
rename-command FLUSHDB ""
rename-command DEBUG ""
REDISEOF

  # Save password to a file readable only by root + auctorum
  echo "$REDIS_PASS" > /root/redis_password
  chmod 600 /root/redis_password
fi

systemctl restart redis-server
systemctl enable redis-server >>"$LOG" 2>&1

# Verify
PASS=$(cat /root/redis_password)
redis-cli -a "$PASS" ping >>"$LOG" 2>&1

# ---------- Create logs dir for PM2 ----------
mkdir -p /var/log/auctorum
chown auctorum:auctorum /var/log/auctorum

# ---------- Create project dir ----------
mkdir -p /opt/auctorum-systems
chown auctorum:auctorum /opt/auctorum-systems

echo "[phase5-6] DONE: $(date)" >> "$LOG"
echo "DONE" > /root/phase5-6.status

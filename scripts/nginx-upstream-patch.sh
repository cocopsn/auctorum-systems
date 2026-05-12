#!/bin/bash
# nginx-upstream-patch.sh
#
# Adds upstream pools for the new PM2 fork-mode setup (web-1/web-2 on
# 3000/3010, med-1/med-2 on 3001/3011) and rewrites every proxy_pass
# to use them. Idempotent — running twice is a no-op.
#
# Pre-2026-05-12 Nginx pointed at single ports because PM2 cluster
# mode was supposed to share the listener. Cluster mode crashed in a
# loop, so we moved to fork mode + Nginx round-robin.
#
# Usage on VPS:
#   bash /opt/auctorum-systems/repo/scripts/nginx-upstream-patch.sh

set -euo pipefail

CONF=/etc/nginx/sites-available/auctorum
[ -f "$CONF" ] || { echo "Missing $CONF"; exit 1; }

# Backup first
BACKUP="${CONF}.bak.$(date +%Y%m%d-%H%M%S)"
cp "$CONF" "$BACKUP"
echo "[patch] backup → $BACKUP"

# 1. Prepend upstream blocks (idempotent)
if grep -q "upstream auctorum_web_backend" "$CONF"; then
  echo "[patch] upstream blocks already present"
else
  TMP=$(mktemp)
  cat > "$TMP" <<'UPSTREAMS'
# ─── Upstream pools — 2026-05-12 ────────────────────────────────────
# PM2 fork mode runs each Next app twice on separate ports. Nginx
# round-robins between them. keepalive=8 reuses connections so we
# don't pay TCP handshake per request.
upstream auctorum_web_backend {
    server 127.0.0.1:3000;
    server 127.0.0.1:3010;
    keepalive 8;
}

upstream auctorum_med_backend {
    server 127.0.0.1:3001;
    server 127.0.0.1:3011;
    keepalive 8;
}

UPSTREAMS
  cat "$CONF" >> "$TMP"
  mv "$TMP" "$CONF"
  echo "[patch] upstream blocks prepended"
fi

# 2. Rewrite proxy_pass values
sed -i 's|proxy_pass http://127.0.0.1:3000;|proxy_pass http://auctorum_web_backend;|g' "$CONF"
sed -i 's|proxy_pass http://127.0.0.1:3001;|proxy_pass http://auctorum_med_backend;|g' "$CONF"
sed -i 's|proxy_pass http://localhost:3000;|proxy_pass http://auctorum_web_backend;|g' "$CONF"
sed -i 's|proxy_pass http://localhost:3001;|proxy_pass http://auctorum_med_backend;|g' "$CONF"
echo "[patch] proxy_pass values rewritten"

# 3. Inject keepalive headers if missing
if grep -q "proxy_http_version 1.1" "$CONF"; then
  echo "[patch] keepalive headers already present"
else
  # Insert after every proxy_pass to an auctorum upstream
  awk '
    {
      print
      if ($0 ~ /proxy_pass http:\/\/auctorum_(web|med)_backend;/) {
        # Find the indent of the current line
        match($0, /^[[:space:]]*/)
        indent = substr($0, RSTART, RLENGTH)
        print indent "proxy_http_version 1.1;"
        print indent "proxy_set_header Connection \"\";"
      }
    }
  ' "$CONF" > "${CONF}.new"
  mv "${CONF}.new" "$CONF"
  echo "[patch] keepalive headers injected"
fi

echo
echo "=== Validating ==="
nginx -t

echo
echo "=== Preview ==="
grep -nE "upstream|proxy_pass http://auctorum_|proxy_http_version" "$CONF" | head -30

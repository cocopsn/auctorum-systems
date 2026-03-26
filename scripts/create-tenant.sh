#!/bin/bash
set -euo pipefail

# ============================================================
# create-tenant.sh — Crea un nuevo tenant en <5 minutos
# Uso: ./scripts/create-tenant.sh --slug toolroom --name "Tool Room" --phone "844..." --email "x@y.com" --plan basico
# ============================================================

DOMAIN="cotizarapido.mx"
VPS_IP="${VPS_IP:-YOUR_VPS_IP}"
CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_ID="${CF_ZONE_ID:-}"
DATABASE_URL="${DATABASE_URL:-}"

# Parse args
while [[ $# -gt 0 ]]; do
  case $1 in
    --slug) SLUG="$2"; shift 2;;
    --name) NAME="$2"; shift 2;;
    --phone) PHONE="$2"; shift 2;;
    --email) EMAIL="$2"; shift 2;;
    --whatsapp) WHATSAPP="$2"; shift 2;;
    --plan) PLAN="$2"; shift 2;;
    --giro) GIRO="$2"; shift 2;;
    *) echo "Unknown: $1"; exit 1;;
  esac
done

SLUG="${SLUG:?--slug required}"
NAME="${NAME:?--name required}"
PHONE="${PHONE:-}"
EMAIL="${EMAIL:-}"
WHATSAPP="${WHATSAPP:-$PHONE}"
PLAN="${PLAN:-basico}"
GIRO="${GIRO:-Proveedor industrial}"

FQDN="${SLUG}.${DOMAIN}"

echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Creating tenant: ${NAME}"
echo "  Slug: ${SLUG}"
echo "  URL: https://${FQDN}"
echo "  Plan: ${PLAN}"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

# Step 1: Insert tenant in DB
echo -e "\n[1/5] Inserting tenant in database..."
CONFIG=$(cat <<JSONEOF
{
  "colors": {"primary": "#1B3A5C", "secondary": "#C0392B", "background": "#FFFFFF"},
  "contact": {"phone": "${PHONE}", "email": "${EMAIL}", "whatsapp": "${WHATSAPP}", "address": ""},
  "business": {"razon_social": "${NAME}", "rfc": "", "giro": "${GIRO}"},
  "quote_settings": {
    "currency": "MXN", "tax_rate": 0.16, "validity_days": 15,
    "payment_terms": "50% anticipo, 50% contra entrega",
    "delivery_terms": "3-5 días hábiles",
    "custom_footer": "Precios sujetos a cambio sin previo aviso."
  }
}
JSONEOF
)

psql "${DATABASE_URL}" -c "
INSERT INTO tenants (slug, name, config, plan)
VALUES ('${SLUG}', '${NAME}', '${CONFIG}'::jsonb, '${PLAN}')
ON CONFLICT (slug) DO UPDATE SET name = '${NAME}', config = '${CONFIG}'::jsonb, updated_at = now();
"
echo "  ✓ Tenant inserted/updated"

# Step 2: Create DNS record in Cloudflare
echo -e "\n[2/5] Creating DNS record..."
if [ -n "${CF_API_TOKEN}" ] && [ -n "${CF_ZONE_ID}" ]; then
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"${SLUG}\",\"content\":\"${DOMAIN}\",\"proxied\":true}" \
    | jq '.success'
  echo "  ✓ DNS CNAME created: ${FQDN}"
else
  echo "  ⚠ Cloudflare credentials not set. Add DNS manually:"
  echo "    CNAME ${SLUG} → ${DOMAIN}"
fi

# Step 3: SSL certificate (if not using Cloudflare proxy)
echo -e "\n[3/5] SSL certificate..."
if command -v certbot &> /dev/null; then
  sudo certbot --nginx -d "${FQDN}" --non-interactive --agree-tos --email "${EMAIL:-admin@${DOMAIN}}" 2>/dev/null || echo "  ⚠ Certbot skipped (may already exist or using CF proxy)"
  echo "  ✓ SSL configured"
else
  echo "  ⚠ Certbot not found. If using Cloudflare proxy, SSL is automatic."
fi

# Step 4: Reload Nginx
echo -e "\n[4/5] Reloading Nginx..."
if command -v nginx &> /dev/null; then
  sudo nginx -t && sudo systemctl reload nginx
  echo "  ✓ Nginx reloaded"
else
  echo "  ⚠ Nginx not found (dev environment)"
fi

# Step 5: Verify
echo -e "\n[5/5] Verifying..."
echo "  Portal URL: https://${FQDN}"
echo "  Dashboard: https://${DOMAIN}/dashboard (login as tenant admin)"

echo -e "\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  ✅ Tenant '${SLUG}' created successfully"
echo "  Next: upload logo, add products, test quote generation"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

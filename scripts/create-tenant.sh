#!/bin/bash
set -euo pipefail

# ============================================================
# create-tenant.sh - Bootstrap a tenant for Auctorum V2
# Usage:
# ./scripts/create-tenant.sh --slug martinez --name "Clinica Martinez" \
#   --email "hola@clinica.com" --plan pro --tenant-type medical --public-prefix dra
# ============================================================

DOMAIN="auctorum.com.mx"
CF_API_TOKEN="${CF_API_TOKEN:-}"
CF_ZONE_ID="${CF_ZONE_ID:-}"
DATABASE_URL="${DATABASE_URL:-}"

while [[ $# -gt 0 ]]; do
  case $1 in
    --slug) SLUG="$2"; shift 2 ;;
    --name) NAME="$2"; shift 2 ;;
    --phone) PHONE="$2"; shift 2 ;;
    --email) EMAIL="$2"; shift 2 ;;
    --whatsapp) WHATSAPP="$2"; shift 2 ;;
    --plan) PLAN="$2"; shift 2 ;;
    --giro) GIRO="$2"; shift 2 ;;
    --tenant-type) TENANT_TYPE="$2"; shift 2 ;;
    --public-prefix) PUBLIC_PREFIX="$2"; shift 2 ;;
    *) echo "Unknown argument: $1"; exit 1 ;;
  esac
done

SLUG="${SLUG:?--slug required}"
NAME="${NAME:?--name required}"
PHONE="${PHONE:-}"
EMAIL="${EMAIL:-}"
WHATSAPP="${WHATSAPP:-$PHONE}"
PLAN="${PLAN:-pro}"
GIRO="${GIRO:-Proveedor industrial}"
TENANT_TYPE="${TENANT_TYPE:-industrial}"
PUBLIC_PREFIX="${PUBLIC_PREFIX:-dr}"

if [[ "${TENANT_TYPE}" == "medical" ]]; then
  TENANT_SLUG="${PUBLIC_PREFIX}-${SLUG}"
  FQDN="${TENANT_SLUG}.${DOMAIN}"
else
  TENANT_SLUG="${SLUG}"
  FQDN="${TENANT_SLUG}.${DOMAIN}"
fi

echo "============================================"
echo " Creating tenant: ${NAME}"
echo " Internal slug: ${TENANT_SLUG}"
echo " Public URL: https://${FQDN}"
echo " Portal URL: https://portal.${DOMAIN}/dashboard"
echo " Type: ${TENANT_TYPE}"
echo " Plan: ${PLAN}"
echo "============================================"

ACCOUNT_JSON=$(cat <<JSONEOF
{
  "type": "${TENANT_TYPE}",
  "plan": "${PLAN}",
  "portalHost": "portal.${DOMAIN}",
  "publicHost": "${FQDN}"
}
JSONEOF
)

CONFIG=$(cat <<JSONEOF
{
  "colors": {"primary": "#1B3A5C", "secondary": "#C0392B", "background": "#FFFFFF"},
  "contact": {"phone": "${PHONE}", "email": "${EMAIL}", "whatsapp": "${WHATSAPP}", "address": ""},
  "business": {"razon_social": "${NAME}", "rfc": "", "giro": "${GIRO}"},
  "account": ${ACCOUNT_JSON},
  "quote_settings": {
    "currency": "MXN", "tax_rate": 0.16, "validity_days": 15,
    "payment_terms": "50% anticipo, 50% contra entrega",
    "delivery_terms": "3-5 dias habiles",
    "custom_footer": "Precios sujetos a cambio sin previo aviso."
  }
}
JSONEOF
)

if [[ -z "${DATABASE_URL}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

echo
echo "[1/4] Inserting tenant in database..."
PUBLIC_SUBDOMAIN_SQL="NULL"
PUBLIC_PREFIX_SQL="NULL"
if [[ "${TENANT_TYPE}" == "medical" ]]; then
  PUBLIC_SUBDOMAIN_SQL="'${TENANT_SLUG}'"
  PUBLIC_PREFIX_SQL="'${PUBLIC_PREFIX}'"
fi

psql "${DATABASE_URL}" -c "
INSERT INTO tenants (
  slug, name, tenant_type, public_subdomain, public_subdomain_prefix,
  provisioning_status, provisioned_at, config, plan
)
VALUES (
  '${TENANT_SLUG}', '${NAME}', '${TENANT_TYPE}', ${PUBLIC_SUBDOMAIN_SQL}, ${PUBLIC_PREFIX_SQL},
  'active', now(), '${CONFIG}'::jsonb, '${PLAN}'
)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  tenant_type = EXCLUDED.tenant_type,
  public_subdomain = EXCLUDED.public_subdomain,
  public_subdomain_prefix = EXCLUDED.public_subdomain_prefix,
  provisioning_status = 'active',
  provisioned_at = now(),
  config = EXCLUDED.config,
  plan = EXCLUDED.plan,
  updated_at = now();
"

echo "[2/4] Creating DNS record if Cloudflare credentials are available..."
if [[ -n "${CF_API_TOKEN}" && -n "${CF_ZONE_ID}" ]]; then
  curl -s -X POST "https://api.cloudflare.com/client/v4/zones/${CF_ZONE_ID}/dns_records" \
    -H "Authorization: Bearer ${CF_API_TOKEN}" \
    -H "Content-Type: application/json" \
    --data "{\"type\":\"CNAME\",\"name\":\"${TENANT_SLUG}\",\"content\":\"${DOMAIN}\",\"proxied\":true}" \
    | jq '.success'
else
  echo "Add this DNS record manually if needed:"
  echo "CNAME ${TENANT_SLUG} -> ${DOMAIN}"
fi

echo "[3/4] Nginx reminder"
echo "Ensure dr-*, dra-* and doc-* point to apps/medconcierge and portal.${DOMAIN} points to apps/web."

echo "[4/4] Summary"
echo "Portal dashboard: https://portal.${DOMAIN}/dashboard"
echo "Public landing: https://${FQDN}"

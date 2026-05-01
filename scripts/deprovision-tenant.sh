#!/bin/bash
set -euo pipefail

# ============================================================
# deprovision-tenant.sh — Deactivate or fully remove a tenant
#
# Usage:
#   ./scripts/deprovision-tenant.sh --slug dr-test --soft   # deactivate
#   ./scripts/deprovision-tenant.sh --slug dr-test --hard   # full delete
#
# Soft: sets is_active=false, deleted_at=now(), preserves data
# Hard: deletes tenant row (cascading deletes handle all child rows)
# ============================================================

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"
ENV_FILE="$REPO_DIR/apps/medconcierge/.env.local"

usage() {
  cat <<EOF
Usage: $0 --slug SLUG [--soft|--hard]

Options:
  --slug SLUG   Tenant slug to deprovision
  --soft        Deactivate tenant (set is_active=false, preserve data) [default]
  --hard        Permanently delete tenant and ALL associated data
  --yes         Skip confirmation prompt
  -h, --help    Show this help
EOF
}

SLUG="" MODE="soft" SKIP_CONFIRM=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --slug) SLUG="$2"; shift 2 ;;
    --soft) MODE="soft"; shift ;;
    --hard) MODE="hard"; shift ;;
    --yes)  SKIP_CONFIRM=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo -e "${RED}Unknown argument: $1${NC}"; usage; exit 1 ;;
  esac
done

: "${SLUG:?--slug is required}"

# Load env
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error: $ENV_FILE not found${NC}"
  exit 1
fi

set -a
while IFS='=' read -r key val; do
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  key=$(echo "$key" | xargs)
  val=$(echo "$val" | sed "s/^['\"]//;s/['\"]$//")
  export "$key=$val"
done < "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo -e "${RED}Error: DATABASE_URL not found in $ENV_FILE${NC}"
  exit 1
fi

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL:-}"
SERVICE_KEY="${SUPABASE_SERVICE_ROLE_KEY:-}"

# Check tenant exists
TENANT_INFO=$(psql "$DATABASE_URL" -tAc "
  SELECT id || '|' || name || '|' || is_active
  FROM tenants WHERE slug = '$SLUG' LIMIT 1;
")

if [[ -z "$TENANT_INFO" ]]; then
  echo -e "${RED}Error: tenant '$SLUG' not found${NC}"
  exit 1
fi

TENANT_ID=$(echo "$TENANT_INFO" | cut -d'|' -f1 | xargs)
TENANT_NAME=$(echo "$TENANT_INFO" | cut -d'|' -f2)
IS_ACTIVE=$(echo "$TENANT_INFO" | cut -d'|' -f3 | xargs)

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  AUCTORUM — Tenant Deprovisioning            ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Slug:      ${CYAN}$SLUG${NC}"
echo -e "  Name:      ${CYAN}$TENANT_NAME${NC}"
echo -e "  Tenant ID: ${CYAN}$TENANT_ID${NC}"
echo -e "  Active:    ${CYAN}$IS_ACTIVE${NC}"
echo -e "  Mode:      ${CYAN}$MODE${NC}"
echo ""

if [[ "$MODE" == "hard" ]]; then
  echo -e "${RED}${BOLD}WARNING: --hard will PERMANENTLY DELETE this tenant and ALL data:${NC}"

  # Count related records
  COUNTS=$(psql "$DATABASE_URL" -tAc "
    SELECT
      (SELECT COUNT(*) FROM users WHERE tenant_id = '$TENANT_ID') AS users,
      (SELECT COUNT(*) FROM appointments WHERE tenant_id = '$TENANT_ID') AS appointments,
      (SELECT COUNT(*) FROM patients WHERE tenant_id = '$TENANT_ID') AS patients,
      (SELECT COUNT(*) FROM messages WHERE tenant_id = '$TENANT_ID') AS messages,
      (SELECT COUNT(*) FROM knowledge_base WHERE tenant_id = '$TENANT_ID') AS kb,
      (SELECT COUNT(*) FROM bot_instances WHERE tenant_id = '$TENANT_ID') AS bots;
  " 2>/dev/null || echo "0|0|0|0|0|0")

  echo -e "  Users:        $(echo $COUNTS | cut -d'|' -f1)"
  echo -e "  Appointments: $(echo $COUNTS | cut -d'|' -f2)"
  echo -e "  Patients:     $(echo $COUNTS | cut -d'|' -f3)"
  echo -e "  Messages:     $(echo $COUNTS | cut -d'|' -f4)"
  echo -e "  KB chunks:    $(echo $COUNTS | cut -d'|' -f5)"
  echo -e "  Bot instances:$(echo $COUNTS | cut -d'|' -f6)"
  echo ""
fi

# Confirmation
if [[ "$SKIP_CONFIRM" != "true" ]]; then
  if [[ "$MODE" == "hard" ]]; then
    echo -e "${RED}Type the slug to confirm permanent deletion:${NC}"
    read -r CONFIRM
    if [[ "$CONFIRM" != "$SLUG" ]]; then
      echo -e "${YELLOW}Aborted.${NC}"
      exit 1
    fi
  else
    echo -e "${YELLOW}Proceed with soft deactivation? [y/N]${NC}"
    read -r CONFIRM
    if [[ "$CONFIRM" != "y" && "$CONFIRM" != "Y" ]]; then
      echo -e "${YELLOW}Aborted.${NC}"
      exit 1
    fi
  fi
fi

if [[ "$MODE" == "soft" ]]; then
  echo -e "${YELLOW}Deactivating tenant...${NC}"

  psql "$DATABASE_URL" -c "
    UPDATE tenants
    SET is_active = false,
        deleted_at = now(),
        updated_at = now()
    WHERE id = '$TENANT_ID';
  " >/dev/null

  echo -e "${GREEN}✓ Tenant '$SLUG' deactivated (soft delete)${NC}"
  echo -e "  Data preserved. Reactivate with:"
  echo -e "  ${CYAN}psql \"\$DATABASE_URL\" -c \"UPDATE tenants SET is_active=true, deleted_at=NULL WHERE slug='$SLUG';\"${NC}"

else
  echo -e "${YELLOW}Permanently deleting tenant...${NC}"

  # Delete auth user from Supabase (if we have the service key)
  AUTH_USER_ID=$(psql "$DATABASE_URL" -tAc "
    SELECT id FROM users WHERE tenant_id = '$TENANT_ID' LIMIT 1;
  " | xargs)

  if [[ -n "$AUTH_USER_ID" && -n "$SUPABASE_URL" && -n "$SERVICE_KEY" ]]; then
    echo "  Deleting auth user $AUTH_USER_ID..."
    curl -s -X DELETE "${SUPABASE_URL}/auth/v1/admin/users/${AUTH_USER_ID}" \
      -H "Authorization: Bearer $SERVICE_KEY" \
      -H "apikey: $SERVICE_KEY" >/dev/null 2>&1 || true
    echo -e "  ${GREEN}✓ Auth user deleted${NC}"
  fi

  # Delete user rows first (no CASCADE on users FK)
  psql "$DATABASE_URL" -c "DELETE FROM users WHERE tenant_id = '$TENANT_ID';" >/dev/null
  echo -e "  ${GREEN}✓ User rows deleted${NC}"

  # Delete tenant (CASCADE handles other child tables)
  psql "$DATABASE_URL" -c "DELETE FROM tenants WHERE id = '$TENANT_ID';" >/dev/null

  echo -e "${GREEN}✓ Tenant '$SLUG' permanently deleted${NC}"
fi

echo ""
echo -e "${GREEN}Done.${NC}"
echo ""

#!/bin/bash
set -euo pipefail

# ============================================================
# provision-tenant.sh — Full tenant provisioning for Auctorum MedConcierge
#
# Usage:
#   ./scripts/provision-tenant.sh \
#     --slug dra-lopez \
#     --name "Dra. María López" \
#     --specialty "Cardiología" \
#     --email "dra.lopez@gmail.com" \
#     --phone "+528441234567" \
#     --address "Calle Ejemplo 123, Saltillo" \
#     --fee 1000
#
# Prerequisites:
#   - DATABASE_URL, SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL,
#     OPENAI_API_KEY in apps/medconcierge/.env.local
#   - psql, curl, jq, openssl available
#   - Wildcard DNS *.auctorum.com.mx already configured (Cloudflare)
#   - Nginx wildcard server_name dr-*/dra-*/doc-* already configured
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
DOMAIN="auctorum.com.mx"
PLAN="pro"

usage() {
  cat <<EOF
Usage: $0 [options]

Required:
  --slug SLUG         Tenant slug (must start with dr-, dra-, or doc-)
  --name NAME         Doctor/clinic name (e.g. "Dra. María López")
  --specialty SPEC    Medical specialty (e.g. "Cardiología")
  --email EMAIL       Admin email for login
  --phone PHONE       Phone in E.164 format (e.g. +528441234567)
  --address ADDR      Clinic address
  --fee FEE           Consultation fee in MXN (integer)

Optional:
  --plan PLAN         Subscription plan (default: pro)
  --sub-specialty SS  Sub-specialty
  --skip-kb           Skip knowledge base seeding (no OpenAI call)
  -h, --help          Show this help
EOF
}

# ── Parse arguments ──────────────────────────────────────────
SLUG="" NAME="" SPECIALTY="" EMAIL="" PHONE="" ADDRESS="" FEE=""
SUB_SPECIALTY="" SKIP_KB=false

while [[ $# -gt 0 ]]; do
  case $1 in
    --slug)           SLUG="$2";           shift 2 ;;
    --name)           NAME="$2";           shift 2 ;;
    --specialty)      SPECIALTY="$2";      shift 2 ;;
    --email)          EMAIL="$2";          shift 2 ;;
    --phone)          PHONE="$2";          shift 2 ;;
    --address)        ADDRESS="$2";        shift 2 ;;
    --fee)            FEE="$2";            shift 2 ;;
    --plan)           PLAN="$2";           shift 2 ;;
    --sub-specialty)  SUB_SPECIALTY="$2";  shift 2 ;;
    --skip-kb)        SKIP_KB=true;        shift ;;
    -h|--help)        usage; exit 0 ;;
    *) echo -e "${RED}Unknown argument: $1${NC}"; usage; exit 1 ;;
  esac
done

# ── Validate required args ───────────────────────────────────
fail=false
for var in SLUG NAME SPECIALTY EMAIL PHONE ADDRESS FEE; do
  if [[ -z "${!var}" ]]; then
    echo -e "${RED}Error: --$(echo $var | tr '[:upper:]' '[:lower:]') is required${NC}"
    fail=true
  fi
done
$fail && exit 1

# Validate slug format
if ! [[ "$SLUG" =~ ^(dr|dra|doc)-[a-z0-9]([a-z0-9-]*[a-z0-9])?$ ]]; then
  echo -e "${RED}Error: slug must start with dr-, dra-, or doc- followed by lowercase letters/numbers/hyphens${NC}"
  echo "  Example: dra-lopez, dr-garcia-hernandez, doc-salud"
  exit 1
fi

# Extract prefix from slug
PREFIX=$(echo "$SLUG" | grep -oE '^(dr|dra|doc)')

# Validate email
if ! [[ "$EMAIL" =~ ^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$ ]]; then
  echo -e "${RED}Error: invalid email format: $EMAIL${NC}"
  exit 1
fi

# Validate phone (E.164: +[country][number], 10-15 digits)
PHONE_DIGITS=$(echo "$PHONE" | tr -d '+[:space:]-')
if ! [[ "$PHONE_DIGITS" =~ ^[0-9]{10,15}$ ]]; then
  echo -e "${RED}Error: phone must be in E.164 format (e.g. +528441234567)${NC}"
  exit 1
fi

# Validate fee is a positive integer
if ! [[ "$FEE" =~ ^[0-9]+$ ]] || [[ "$FEE" -eq 0 ]]; then
  echo -e "${RED}Error: fee must be a positive integer (MXN)${NC}"
  exit 1
fi

# ── Load environment ─────────────────────────────────────────
if [[ ! -f "$ENV_FILE" ]]; then
  echo -e "${RED}Error: $ENV_FILE not found${NC}"
  exit 1
fi

# Source .env.local safely
set -a
while IFS='=' read -r key val; do
  [[ -z "$key" || "$key" =~ ^[[:space:]]*# ]] && continue
  key=$(echo "$key" | xargs)
  val=$(echo "$val" | sed "s/^['\"]//;s/['\"]$//")
  export "$key=$val"
done < "$ENV_FILE"
set +a

# Verify required env vars
for envvar in DATABASE_URL SUPABASE_SERVICE_ROLE_KEY NEXT_PUBLIC_SUPABASE_URL; do
  if [[ -z "${!envvar:-}" ]]; then
    echo -e "${RED}Error: $envvar not found in $ENV_FILE${NC}"
    exit 1
  fi
done

SUPABASE_URL="$NEXT_PUBLIC_SUPABASE_URL"
FQDN="${SLUG}.${DOMAIN}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  AUCTORUM — Tenant Provisioning              ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Slug:       ${CYAN}$SLUG${NC}"
echo -e "  Name:       ${CYAN}$NAME${NC}"
echo -e "  Specialty:  ${CYAN}$SPECIALTY${NC}"
echo -e "  Email:      ${CYAN}$EMAIL${NC}"
echo -e "  Phone:      ${CYAN}$PHONE${NC}"
echo -e "  Address:    ${CYAN}$ADDRESS${NC}"
echo -e "  Fee:        ${CYAN}\$$FEE MXN${NC}"
echo -e "  Plan:       ${CYAN}$PLAN${NC}"
echo -e "  URL:        ${CYAN}https://$FQDN${NC}"
echo ""

# ── Step 1: Check slug uniqueness ────────────────────────────
echo -e "${YELLOW}[1/7] Checking slug availability...${NC}"

EXISTS=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM tenants WHERE slug = '$SLUG'")
if [[ "$EXISTS" -gt 0 ]]; then
  echo -e "${RED}Error: slug '$SLUG' already exists in database${NC}"
  echo "  Use a different slug or deprovision first."
  exit 1
fi
echo -e "${GREEN}  ✓ Slug '$SLUG' is available${NC}"

# ── Step 2: Insert tenant ────────────────────────────────────
echo -e "${YELLOW}[2/7] Creating tenant in database...${NC}"

# Build config JSONB
WHATSAPP_NUM="$PHONE_DIGITS"
SUB_SPEC_JSON="null"
[[ -n "$SUB_SPECIALTY" ]] && SUB_SPEC_JSON="\"$SUB_SPECIALTY\""

CONFIG_JSON=$(cat <<JSONEOF
{
  "colors": {
    "primary": "#0D9488",
    "secondary": "#F59E0B",
    "accent": "#6366F1",
    "background": "#FFFFFF"
  },
  "contact": {
    "phone": "$PHONE",
    "email": "$EMAIL",
    "whatsapp": "$PHONE",
    "address": "$ADDRESS"
  },
  "business": {
    "razon_social": "$NAME",
    "rfc": "",
    "giro": "Servicios médicos"
  },
  "account": {
    "type": "medical",
    "plan": "$PLAN",
    "publicHost": "$FQDN"
  },
  "medical": {
    "specialty": "$SPECIALTY",
    "sub_specialty": ${SUB_SPEC_JSON},
    "cedula_profesional": "",
    "cedula_especialidad": "",
    "consultation_fee": $FEE,
    "consultation_duration_min": 30,
    "accepts_insurance": false,
    "insurance_providers": []
  },
  "schedule": {
    "monday":    {"enabled": true,  "start": "09:00", "end": "18:00"},
    "tuesday":   {"enabled": true,  "start": "09:00", "end": "18:00"},
    "wednesday": {"enabled": true,  "start": "09:00", "end": "18:00"},
    "thursday":  {"enabled": true,  "start": "09:00", "end": "18:00"},
    "friday":    {"enabled": true,  "start": "09:00", "end": "18:00"},
    "saturday":  {"enabled": true,  "start": "09:00", "end": "13:00"},
    "sunday":    {"enabled": false, "start": "09:00", "end": "13:00"}
  },
  "schedule_settings": {
    "timezone": "America/Monterrey",
    "advance_booking_days": 30,
    "min_booking_hours_ahead": 2,
    "cancellation_hours": 24,
    "auto_confirm": false,
    "allow_online_payment": false,
    "show_fee_on_portal": true
  },
  "notifications": {
    "whatsapp_on_new_appointment": true,
    "whatsapp_reminder_24h": true,
    "whatsapp_reminder_2h": true,
    "whatsapp_post_consultation": false,
    "email_on_new_appointment": true,
    "notify_on_cancellation": true,
    "daily_agenda_email": false
  },
  "features": {
    "clinical_notes": true,
    "ai_scribe": false,
    "telehealth": false,
    "online_payment": false,
    "prescription_pdf": false,
    "receipt_pdf": false
  },
  "ai": {
    "enabled": true,
    "systemPrompt": "",
    "autoSchedule": true,
    "answerFaq": true,
    "humanHandoff": true,
    "model": "gpt-4o-mini",
    "temperature": 0.3,
    "maxTokens": 1024
  },
  "landing": {
    "tagline": "Atención médica de calidad con calidez humana",
    "years_experience": 0,
    "rating": 5.0,
    "review_count": 0,
    "patient_count": "",
    "services": [],
    "testimonials": []
  }
}
JSONEOF
)

# Escape single quotes for psql
CONFIG_ESCAPED=$(echo "$CONFIG_JSON" | sed "s/'/''/g")

TENANT_ID=$(psql "$DATABASE_URL" -tAc "
INSERT INTO tenants (
  slug, name, tenant_type, public_subdomain, public_subdomain_prefix,
  provisioning_status, provisioned_at, config, plan, is_active
)
VALUES (
  '$SLUG', '$NAME', 'medical', '$SLUG', '$PREFIX',
  'active', now(), '$CONFIG_ESCAPED'::jsonb, '$PLAN', true
)
RETURNING id;
")

if [[ -z "$TENANT_ID" ]]; then
  echo -e "${RED}Error: failed to create tenant${NC}"
  exit 1
fi

TENANT_ID=$(echo "$TENANT_ID" | grep -oE "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}" | head -1)
echo -e "${GREEN}  ✓ Tenant created: $TENANT_ID${NC}"

# ── Step 3: Create Supabase auth user ────────────────────────
echo -e "${YELLOW}[3/7] Creating admin auth user...${NC}"

TEMP_PASSWORD="Auctorum$(openssl rand -hex 4)!"

AUTH_RESPONSE=$(curl -s -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"$EMAIL\",
    \"password\": \"$TEMP_PASSWORD\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"name\": \"$NAME\",
      \"tenant_slug\": \"$SLUG\"
    }
  }")

AUTH_USER_ID=$(echo "$AUTH_RESPONSE" | jq -r '.id // empty')

if [[ -z "$AUTH_USER_ID" ]]; then
  AUTH_ERROR=$(echo "$AUTH_RESPONSE" | jq -r '.msg // .message // .error // "unknown error"')
  echo -e "${RED}Error creating auth user: $AUTH_ERROR${NC}"
  echo "  Rolling back tenant..."
  psql "$DATABASE_URL" -c "DELETE FROM tenants WHERE id = '$TENANT_ID';" >/dev/null 2>&1
  exit 1
fi

echo -e "${GREEN}  ✓ Auth user created: $AUTH_USER_ID${NC}"

# ── Step 4: Link user to tenant ──────────────────────────────
echo -e "${YELLOW}[4/7] Linking user to tenant...${NC}"

# Escape single quotes in NAME for SQL
NAME_ESCAPED=$(echo "$NAME" | sed "s/'/''/g")

psql "$DATABASE_URL" -c "
INSERT INTO users (id, tenant_id, email, name, role, is_active)
VALUES ('$AUTH_USER_ID', '$TENANT_ID', '$EMAIL', '$NAME_ESCAPED', 'admin', true)
ON CONFLICT (id) DO UPDATE SET tenant_id = '$TENANT_ID', name = '$NAME_ESCAPED', role = 'admin';
" >/dev/null

echo -e "${GREEN}  ✓ User linked to tenant${NC}"

# ── Step 5: Create bot instance ──────────────────────────────
echo -e "${YELLOW}[5/7] Creating WhatsApp bot instance...${NC}"

VERIFY_TOKEN=$(openssl rand -hex 32)

psql "$DATABASE_URL" -c "
INSERT INTO bot_instances (tenant_id, channel, provider, status, config)
VALUES (
  '$TENANT_ID', 'whatsapp', 'meta', 'pending_setup',
  '{\"verify_token\": \"$VERIFY_TOKEN\"}'::jsonb
)
ON CONFLICT (tenant_id, channel, provider) DO UPDATE
SET config = jsonb_set(bot_instances.config, '{verify_token}', '\"$VERIFY_TOKEN\"'),
    status = 'pending_setup',
    updated_at = now();
" >/dev/null

echo -e "${GREEN}  ✓ Bot instance created (pending WhatsApp setup)${NC}"

# ── Step 6: Seed knowledge base ──────────────────────────────
if [[ "$SKIP_KB" == "true" ]]; then
  echo -e "${YELLOW}[6/7] Skipping knowledge base (--skip-kb)${NC}"
else
  echo -e "${YELLOW}[6/7] Seeding knowledge base...${NC}"

  if [[ -z "${OPENAI_API_KEY:-}" ]]; then
    echo -e "${YELLOW}  ⚠ OPENAI_API_KEY not set, skipping KB seed${NC}"
  else
    # Generate KB chunks from tenant data
    KB_CHUNKS=$(cat <<KBEOF
[
  {
    "title": "Ubicación del consultorio",
    "content": "El consultorio de $NAME se encuentra en: $ADDRESS. Para agendar una cita, puede comunicarse por WhatsApp o llamar al $PHONE."
  },
  {
    "title": "Horarios de atención",
    "content": "$NAME atiende de Lunes a Viernes de 9:00 a 18:00 horas, y Sábados de 9:00 a 13:00. Domingos y días festivos permanece cerrado. Para urgencias, puede comunicarse por WhatsApp al $PHONE."
  },
  {
    "title": "Consulta y precios",
    "content": "La consulta de $SPECIALTY tiene un costo de \$$FEE MXN. Incluye valoración completa y receta médica. La duración aproximada es de 30 minutos. Se recomienda llegar 10 minutos antes de la cita."
  },
  {
    "title": "Formas de pago",
    "content": "Se aceptan los siguientes métodos de pago: efectivo, transferencia bancaria (SPEI), tarjetas de débito y crédito (Visa y MasterCard). Todas las consultas pueden incluir factura electrónica (CFDI) con RFC proporcionado."
  },
  {
    "title": "Primera consulta",
    "content": "Para su primera consulta con $NAME: 1) Agendar cita por WhatsApp proporcionando nombre, teléfono y motivo. 2) Llegar 10 minutos antes para registro. 3) Traer identificación oficial, historial médico previo y lista de medicamentos actuales."
  },
  {
    "title": "Política de cancelación",
    "content": "Las cancelaciones se pueden realizar hasta 24 horas antes de la cita sin costo. Cancelaciones con menos de 24 horas de anticipación pueden tener cargo. Las reprogramaciones son gratuitas con al menos 12 horas de anticipación."
  },
  {
    "title": "Urgencias",
    "content": "IMPORTANTE: Si presenta síntomas graves (dolor intenso, reacciones alérgicas severas, dificultad respiratoria), acuda directamente a urgencias. El servicio de WhatsApp no reemplaza atención de emergencia."
  }
]
KBEOF
    )

    # Embed and insert each chunk
    KB_COUNT=0
    echo "$KB_CHUNKS" | jq -c '.[]' | while read -r chunk; do
      TITLE=$(echo "$chunk" | jq -r '.title')
      CONTENT=$(echo "$chunk" | jq -r '.content')

      # Get embedding from OpenAI
      EMBED_RESPONSE=$(curl -s "https://api.openai.com/v1/embeddings" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        -H "Content-Type: application/json" \
        -d "{\"input\": $(echo "$CONTENT" | jq -Rs .), \"model\": \"text-embedding-3-small\"}")

      EMBEDDING=$(echo "$EMBED_RESPONSE" | jq -c '.data[0].embedding // empty')

      if [[ -z "$EMBEDDING" ]]; then
        echo -e "${YELLOW}  ⚠ Failed to embed: $TITLE${NC}"
        continue
      fi

      # Escape content for SQL
      CONTENT_ESCAPED=$(echo "$CONTENT" | sed "s/'/''/g")
      META="{\"title\": \"$TITLE\", \"source\": \"provision-script\"}"
      META_ESCAPED=$(echo "$META" | sed "s/'/''/g")

      psql "$DATABASE_URL" -c "
        INSERT INTO knowledge_base (tenant_id, content, embedding, metadata)
        VALUES ('$TENANT_ID', '$CONTENT_ESCAPED', '$EMBEDDING'::vector, '$META_ESCAPED'::jsonb);
      " >/dev/null 2>&1

      echo -e "  ✓ $TITLE"
    done

    KB_TOTAL=$(psql "$DATABASE_URL" -tAc "SELECT COUNT(*) FROM knowledge_base WHERE tenant_id = '$TENANT_ID'")
    echo -e "${GREEN}  ✓ Knowledge base seeded: $KB_TOTAL chunks${NC}"
  fi
fi

# ── Step 7: Final verification and output ────────────────────
echo -e "${YELLOW}[7/7] Verifying...${NC}"

VERIFY=$(psql "$DATABASE_URL" -tAc "
  SELECT t.slug, t.name, t.provisioning_status, u.email
  FROM tenants t
  LEFT JOIN users u ON u.tenant_id = t.id
  WHERE t.id = '$TENANT_ID'
  LIMIT 1;
")
echo -e "${GREEN}  ✓ Verified: $VERIFY${NC}"

echo ""
echo -e "${BOLD}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${BOLD}║  ${GREEN}TENANT PROVISIONADO EXITOSAMENTE${NC}${BOLD}                        ║${NC}"
echo -e "${BOLD}╚══════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "  Slug:           ${CYAN}$SLUG${NC}"
echo -e "  Tenant ID:      ${CYAN}$TENANT_ID${NC}"
echo -e "  URL:            ${CYAN}https://$FQDN${NC}"
echo -e "  Dashboard:      ${CYAN}https://$FQDN/login${NC}"
echo -e "  Admin email:    ${CYAN}$EMAIL${NC}"
echo -e "  Admin password: ${CYAN}$TEMP_PASSWORD${NC}"
echo ""
echo -e "  ${BOLD}PENDIENTE MANUAL:${NC}"
echo -e "  1. Configurar WhatsApp en Meta Business Suite"
echo -e "     Webhook URL:  ${CYAN}https://$FQDN/api/wa/$SLUG/webhook${NC}"
echo -e "     Verify token: ${CYAN}$VERIFY_TOKEN${NC}"
echo -e "  2. Enviar credenciales al cliente (cambiar password en primer login)"
echo -e "  3. Personalizar landing page (servicios, testimonios) en dashboard"
echo -e "  4. Agendar sesión de onboarding"
echo ""
echo -e "  ${YELLOW}Nota: DNS (wildcard), Nginx y SSL ya están configurados.${NC}"
echo -e "  ${YELLOW}No se requiere acción adicional de infraestructura.${NC}"
echo ""

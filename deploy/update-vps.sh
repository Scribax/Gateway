#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="${PROJECT_DIR:-/opt/gateway}"
BRANCH="${BRANCH:-main}"
PUBLIC_GATEWAY_URL_DEFAULT="${PUBLIC_GATEWAY_URL_DEFAULT:-https://orbiqen.com/v1}"
PUBLIC_PORTAL_URL_DEFAULT="${PUBLIC_PORTAL_URL_DEFAULT:-https://orbiqen.com}"
UPSTREAM_BASE_URL="${UPSTREAM_BASE_URL:-https://api.wluvyh.cloud}"
UPSTREAM_SITE_URL="${UPSTREAM_SITE_URL:-https://www.wluvyh.cloud/}"
BUILD_NEW_API="${BUILD_NEW_API:-false}"
USE_PREBUILT_NEW_API="${USE_PREBUILT_NEW_API:-false}"
PREBUILT_NEW_API_IMAGE="${PREBUILT_NEW_API_IMAGE:-ghcr.io/scribax/gateway-new-api:latest}"

log() {
  printf '\n[%s] %s\n' "$(date '+%Y-%m-%d %H:%M:%S')" "$*"
}

need_command() {
  if ! command -v "$1" >/dev/null 2>&1; then
    printf 'Falta el comando requerido: %s\n' "$1" >&2
    exit 1
  fi
}

ensure_env_value() {
  local key="$1"
  local value="$2"
  local file="$3"

  if grep -q "^${key}=" "$file"; then
    sed -i "s|^${key}=.*|${key}=${value}|" "$file"
  else
    printf '%s=%s\n' "$key" "$value" >>"$file"
  fi
}

need_command git
need_command docker

if ! docker compose version >/dev/null 2>&1; then
  printf 'Docker Compose plugin no esta disponible. Instale docker compose.\n' >&2
  exit 1
fi

if [ ! -d "$PROJECT_DIR/.git" ]; then
  printf 'No encontre un repo git en %s\n' "$PROJECT_DIR" >&2
  printf 'Clone primero: git clone https://github.com/Scribax/Gateway.git %s\n' "$PROJECT_DIR" >&2
  exit 1
fi

cd "$PROJECT_DIR"

log "Actualizando repo en $PROJECT_DIR ($BRANCH)"
git fetch origin
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

if [ ! -f .env ]; then
  log "Creando .env desde .env.example"
  cp .env.example .env
  chmod 600 .env
fi

backup_dir="$PROJECT_DIR/backups/deploy-$(date '+%Y%m%d-%H%M%S')"
mkdir -p "$backup_dir"
cp .env "$backup_dir/.env"
docker compose config >"$backup_dir/docker-compose.resolved.yml"
log "Backup de configuracion guardado en $backup_dir"

log "Ajustando variables recomendadas de produccion"
ensure_env_value "PUBLIC_GATEWAY_URL" "$PUBLIC_GATEWAY_URL_DEFAULT" ".env"
ensure_env_value "PUBLIC_PORTAL_URL" "$PUBLIC_PORTAL_URL_DEFAULT" ".env"
ensure_env_value "PORTAL_COOKIE_SECURE" "true" ".env"
ensure_env_value "GIN_MODE" "release" ".env"
ensure_env_value "DEBUG" "false" ".env"
if [ "$USE_PREBUILT_NEW_API" = "true" ]; then
  ensure_env_value "NEW_API_IMAGE" "$PREBUILT_NEW_API_IMAGE" ".env"
else
  ensure_env_value "NEW_API_IMAGE" "orbiqen/new-api:v1.0.0-rc.24-2" ".env"
fi
ensure_env_value "NEW_API_VERSION" "v1.0.0-rc.24" ".env"

log "Validando compose"
docker compose config --quiet

if [ -z "${MERCADOPAGO_ACCESS_TOKEN:-}" ] && ! grep -q '^MERCADOPAGO_ACCESS_TOKEN=[^[:space:]]' .env; then
  log "Aviso: MERCADOPAGO_ACCESS_TOKEN no esta configurado; el checkout permanecera deshabilitado"
fi
if [ -z "${NEW_API_ADMIN_TOKEN:-}" ] && ! grep -q '^NEW_API_ADMIN_TOKEN=[^[:space:]]' .env; then
  log "Aviso: NEW_API_ADMIN_TOKEN no esta configurado; el webhook no podra acreditar saldo"
fi
if [ -z "${MERCADOPAGO_WEBHOOK_SECRET:-}" ] && ! grep -q '^MERCADOPAGO_WEBHOOK_SECRET=[^[:space:]]' .env; then
  log "Aviso: MERCADOPAGO_WEBHOOK_SECRET no esta configurado; produccion rechazara webhooks"
fi

if [ "$BUILD_NEW_API" = "true" ]; then
  log "Construyendo New API y portal"
  docker compose up -d --build
else
  if [ "$USE_PREBUILT_NEW_API" = "true" ]; then
    log "Descargando imagen precompilada de New API"
    docker compose pull new-api
  fi
  log "Construyendo solo portal y reutilizando/descargando la imagen de New API"
  docker compose build portal
  docker compose up -d --no-build
fi

log "Estado de contenedores"
docker compose ps

log "Healthchecks locales"
if command -v curl >/dev/null 2>&1; then
  curl -fsS http://127.0.0.1:3000/api/status >/dev/null && printf 'New API: OK\n' || printf 'New API: revisar logs\n'
  curl -fsS http://127.0.0.1:3100 >/dev/null && printf 'Portal: OK\n' || printf 'Portal: revisar logs\n'
else
  printf 'curl no esta instalado; salteo healthchecks HTTP.\n'
fi

cat <<EOF

Deploy terminado.

Ahora cambie el canal madre dentro de New API:

1. Abra un tunel SSH desde su PC:
   ssh -L 3300:127.0.0.1:3000 root@<IP_DEL_VPS>

2. Entre a:
   http://127.0.0.1:3300

3. En Channels / Canales, edite o cree el canal:
   Tipo: OpenAI
   Nombre: Wluvyh Madre
   Base URL: ${UPSTREAM_BASE_URL}
   Key: pegue la clave madre de Wluvyh solo en el panel

4. Modelos recomendados para habilitar:
   codex-auto-review
   gpt-4o-audio-preview
   gpt-4o-realtime-preview
   gpt-5.2
   gpt-5.2-2025-12-11
   gpt-5.2-chat-latest
   gpt-5.2-pro
   gpt-5.2-pro-2025-12-11
   gpt-5.3-codex-spark
   gpt-5.4
   gpt-5.4-2026-03-05
   gpt-5.4-mini
   gpt-5.5
   gpt-5.6
   gpt-5.6-sol
   gpt-5.6-terra
   gpt-image-1
   gpt-image-1.5
   gpt-image-2

5. Quite de canales, grupos y tokens:
   gpt-5.6-luna

6. Ejecute Test en el canal. Si /v1/models responde pero chat/completions da 502,
   el problema esta del lado del gateway upstream/modelo y hay que validarlo con Wluvyh.

Nota: este deploy no recompila New API por defecto para evitar errores 137/OOM en VPS chicos.
Si necesita recompilar la imagen custom de New API, ejecute:
   BUILD_NEW_API=true ./deploy/update-vps.sh

Sitio Wluvyh: ${UPSTREAM_SITE_URL}
API Wluvyh: ${UPSTREAM_BASE_URL}

EOF

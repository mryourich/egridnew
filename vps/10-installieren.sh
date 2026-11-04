#!/usr/bin/env bash
# Schritt 1 – eigene Supabase für VYSNER neben eGrid installieren.
#
# eGrid wird dabei nicht verändert, nicht neu gestartet und nicht umkonfiguriert:
#   – eigener Ordner (/opt/vysner-supabase), eigenes Docker-Projekt "vysner", eigenes Netzwerk
#   – eigene Container (vysner-db, vysner-auth …), eigene Daten, eigene Schlüssel
#   – nur ein Port, und der nur lokal (127.0.0.1) – nach außen geht es über deinen Webserver
#   – Speichergrenzen je Dienst, damit VYSNER eGrid nie den Arbeitsspeicher wegnimmt
# Vom eGrid-Ordner werden nur die Vorlagen (Compose-Dateien, Konfiguration) kopiert – keine Daten, keine .env.
#
#   sudo VYSNER_API_URL=https://api.vysner.com bash vps/10-installieren.sh
#
# Einstellungen (optional, als Umgebungsvariablen):
#   VYSNER_API_URL  öffentliche Adresse der VYSNER-API (Standard: http://localhost:<Port>)
#   VYSNER_PORT     lokaler Port (Standard: erster freier ab 8100)
#   VYSNER_MEM_DB   Speichergrenze der Datenbank (Standard 1g), VYSNER_MEM_OTHER für die übrigen (Standard 512m)

source "$(dirname "$0")/lib.sh"
need_root
need_tools python3 openssl rsync
init_egrid

say "Vorab-Prüfung"
[ -e "$VYSNER_DIR/docker-compose.yml" ] && die "$VYSNER_DIR ist schon eingerichtet. Starten/Stoppen mit: sudo bash vps/vysner.sh start|stop|status"
EG_DIR="$(egrid_dir)"
EG_PROJECT="$(egrid_project)"
[ "$EG_PROJECT" != "$PROJECT" ] || die "eGrid läuft selbst unter dem Projektnamen \"$PROJECT\" – bitte melden."
ok "eGrid gefunden: Projekt \"$EG_PROJECT\" in $EG_DIR"
BEFORE="$(egrid_fingerprint)"

avail=$(awk '/MemAvailable/ {print int($2/1024)}' /proc/meminfo)
if [ "$avail" -lt 2500 ] && [ -z "${TROTZDEM:-}" ]; then
  die "Nur ${avail} MB Arbeitsspeicher frei – VYSNER braucht ca. 2,5 GB. (Erzwingen mit TROTZDEM=1, auf eigenes Risiko für eGrid.)"
fi
ok "Arbeitsspeicher frei: ${avail} MB"
disk=$(df -Pm / | awk 'NR==2 {print $4}')
[ "$disk" -gt 5000 ] || die "Nur ${disk} MB Festplatte frei."
ok "Festplatte frei: ${disk} MB"

PORT="${VYSNER_PORT:-}"
if [ -z "$PORT" ]; then
  for p in $(seq 8100 8199); do port_busy "$p" || { PORT=$p; break; }; done
fi
if port_busy "$PORT"; then die "Port $PORT ist belegt."; fi
ok "Port: 127.0.0.1:$PORT"
API_URL="${VYSNER_API_URL:-http://localhost:$PORT}"
API_URL="${API_URL%/}"

say "Vorlage kopieren (ohne Daten und ohne eGrid-Schlüssel)"
mkdir -p "$VYSNER_DIR/template"
chmod 700 "$VYSNER_DIR"
if [ -f "$EG_DIR/docker-compose.yml" ] && [ -f "$EG_DIR/.env.example" ] && [ -d "$EG_DIR/volumes" ]; then
  SRC="$EG_DIR"
  ok "Gleiche Supabase-Version wie eGrid ($EG_DIR) – die Images sind schon da"
else
  warn "Im eGrid-Ordner fehlt die Vorlage – lade die aktuelle von GitHub"
  command -v git >/dev/null || die "git fehlt – installieren mit: apt install git"
  SRC="$(mktemp -d)/supabase"
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/supabase/supabase.git "$SRC"
  git -C "$SRC" sparse-checkout set docker
  SRC="$SRC/docker"
fi
cp "$SRC"/docker-compose*.yml "$SRC/.env.example" "$VYSNER_DIR/template/"
rsync -a --exclude 'db/data' --exclude 'db/data/**' --exclude 'storage/**' --exclude 'functions/**' --exclude '*.bak' "$SRC/volumes/" "$VYSNER_DIR/volumes/"
mkdir -p "$VYSNER_DIR/volumes/storage" "$VYSNER_DIR/volumes/functions/main" "$VYSNER_DIR/volumes/db/data"
[ -z "$(ls -A "$VYSNER_DIR/volumes/db/data")" ] || die "Datenordner nicht leer – Abbruch zur Sicherheit."
ok "Vorlage in $VYSNER_DIR"

say "Eigene Schlüssel und Einstellungen"
ENV="$VYSNER_DIR/.env"
cp "$VYSNER_DIR/template/.env.example" "$ENV"
chmod 600 "$ENV"
set_env() {
  local k="$1" v="$2"
  if grep -q "^$k=" "$ENV"; then
    python3 - "$ENV" "$k" "$v" <<'PY'
import sys
path, key, val = sys.argv[1:]
lines = open(path).read().split("\n")
lines = [f"{key}={val}" if l.startswith(key + "=") else l for l in lines]
open(path, "w").write("\n".join(lines))
PY
  else
    printf '%s=%s\n' "$k" "$v" >> "$ENV"
  fi
}
b64url() { openssl base64 -A | tr '+/' '-_' | tr -d '='; }
jwt() {
  local h p s
  h=$(printf '%s' '{"alg":"HS256","typ":"JWT"}' | b64url)
  p=$(printf '%s' "$1" | b64url)
  s=$(printf '%s' "$h.$p" | openssl dgst -binary -sha256 -hmac "$JWT_SECRET" | b64url)
  printf '%s.%s.%s' "$h" "$p" "$s"
}
JWT_SECRET="$(openssl rand -hex 32)"
iat=$(date +%s); exp=$((iat + 10 * 365 * 24 * 3600))
set_env JWT_SECRET "$JWT_SECRET"
set_env ANON_KEY "$(jwt "{\"role\":\"anon\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")"
set_env SERVICE_ROLE_KEY "$(jwt "{\"role\":\"service_role\",\"iss\":\"supabase\",\"iat\":$iat,\"exp\":$exp}")"
set_env POSTGRES_PASSWORD "$(openssl rand -hex 24)"
set_env DASHBOARD_USERNAME "vysner"
set_env DASHBOARD_PASSWORD "$(openssl rand -hex 16)"
has_env() { grep -q "^$1=" "$ENV"; }
if has_env SECRET_KEY_BASE; then set_env SECRET_KEY_BASE "$(openssl rand -hex 48)"; fi
for k in VAULT_ENC_KEY PG_META_CRYPTO_KEY LOGFLARE_PUBLIC_ACCESS_TOKEN LOGFLARE_PRIVATE_ACCESS_TOKEN LOGFLARE_API_KEY LOGFLARE_LOGGER_BACKEND_API_KEY S3_PROTOCOL_ACCESS_KEY_SECRET MINIO_ROOT_PASSWORD; do
  if has_env "$k"; then set_env "$k" "$(openssl rand -hex 16)"; fi
done
if has_env REALTIME_DB_ENC_KEY; then set_env REALTIME_DB_ENC_KEY "$(openssl rand -hex 8)"; fi
if has_env S3_PROTOCOL_ACCESS_KEY_ID; then set_env S3_PROTOCOL_ACCESS_KEY_ID "$(openssl rand -hex 16)"; fi
set_env POOLER_TENANT_ID "vysner"
set_env SITE_URL "https://vysner.com"
set_env ADDITIONAL_REDIRECT_URLS "https://vysner.com/**,https://www.vysner.com/**"
# neuere Supabase-Versionen erwarten hier den Pfad /auth/v1, ältere nicht – wie in der Vorlage
if grep -q '^API_EXTERNAL_URL=.*/auth/v1' "$ENV"; then set_env API_EXTERNAL_URL "$API_URL/auth/v1"; else set_env API_EXTERNAL_URL "$API_URL"; fi
set_env SUPABASE_PUBLIC_URL "$API_URL"
set_env STUDIO_DEFAULT_ORGANIZATION "VYSNER"
set_env STUDIO_DEFAULT_PROJECT "VYSNER"
set_env DISABLE_SIGNUP "true"
set_env ENABLE_PHONE_SIGNUP "false"
set_env ENABLE_ANONYMOUS_USERS "false"
set_env KONG_HTTP_PORT "$PORT"
set_env API_GW_HTTP_PORT "$PORT"
TEMPLATE_FILES="$(sed -n 's/^COMPOSE_FILE=//p' "$EG_DIR/.env" 2>/dev/null | head -1)"
TEMPLATE_FILES="${TEMPLATE_FILES:-$(sed -n 's/^COMPOSE_FILE=//p' "$ENV" | head -1)}"
TEMPLATE_FILES="${TEMPLATE_FILES:-docker-compose.yml}"
set_env VYSNER_TEMPLATE_FILES "$TEMPLATE_FILES"
set_env COMPOSE_FILE "docker-compose.yml"
left="$(grep -E '^[A-Z_]+=.*(your-super-secret|your-32-character|your-encryption-key|this_password_is_insecure)' "$ENV" | cut -d= -f1 || true)"
[ -z "$left" ] || die "Noch Platzhalter in .env: $left"
ok "Neue Schlüssel erzeugt (nur in $ENV, nicht in eGrid)"
if grep -q '^SMTP_HOST=supabase-mail' "$ENV"; then warn "E-Mail-Versand (Einladungen) noch nicht eingerichtet: SMTP_* in $ENV eintragen, dann: sudo bash vps/vysner.sh neu-laden"; fi

say "Docker-Konfiguration erzeugen"
ARGS=()
IFS=':' read -ra FILES <<<"$TEMPLATE_FILES"
for f in "${FILES[@]}"; do ARGS+=(-f "$VYSNER_DIR/template/$f"); done
docker compose -p "$PROJECT" --project-directory "$VYSNER_DIR" --env-file "$ENV" "${ARGS[@]}" config --format json >"$VYSNER_DIR/rendered.json"
VYSNER_DIR="$VYSNER_DIR" EG_DIR="$EG_DIR" EG_PROJECT="$EG_PROJECT" PORT="$PORT" \
  MEM_DB="${VYSNER_MEM_DB:-1g}" MEM_OTHER="${VYSNER_MEM_OTHER:-512m}" python3 "$HERE/compose-vysner.py"
rm -f "$VYSNER_DIR/rendered.json"
chmod 600 "$VYSNER_DIR/docker-compose.yml"
ok "$VYSNER_DIR/docker-compose.yml"

say "VYSNER starten"
vysner_compose up -d
for i in $(seq 1 60); do
  bad="$(vysner_compose ps --format '{{.Name}} {{.Health}}' | awk '$2 != "" && $2 != "healthy"' || true)"
  [ -z "$bad" ] && break
  sleep 5
done
vysner_compose ps --format 'table {{.Name}}\t{{.Status}}' | sed 's/^/  /'
[ -z "$bad" ] || warn "Noch nicht alle bereit: $bad – Status prüfen mit: sudo bash vps/vysner.sh status"

say "eGrid unverändert?"
egrid_compare "$BEFORE"

say "Fertig"
cat <<TXT
  API (nur lokal):      http://127.0.0.1:$PORT
  Öffentliche Adresse:  $API_URL   (über deinen Webserver, siehe vps/README.md)
  Anon-Key (öffentlich): $(vysner_env ANON_KEY)
  Dashboard:  per SSH-Tunnel:  ssh -L $PORT:127.0.0.1:$PORT <dein-server>  →  http://localhost:$PORT
              Benutzer: vysner, Passwort: steht in $ENV (DASHBOARD_PASSWORD)

  Weiter mit:  sudo bash vps/20-struktur.sh
TXT

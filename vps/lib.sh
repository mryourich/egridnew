#!/usr/bin/env bash
# Gemeinsame Hilfen für die VYSNER-Skripte. Wird von den anderen Skripten geladen.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO="$(cd "$HERE/.." && pwd)"
VYSNER_DIR="${VYSNER_DIR:-/opt/vysner-supabase}"
PROJECT="vysner"

say() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok() { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die() { printf '\n\033[31mAbbruch:\033[0m %s\n' "$*" >&2; exit 1; }

need_root() { [ "$(id -u)" = 0 ] || die "Bitte mit sudo ausführen: sudo bash $0 $*"; }

need_tools() {
  command -v docker >/dev/null || die "docker fehlt."
  docker compose version >/dev/null 2>&1 || die "docker compose (v2) fehlt."
  local t
  for t in "$@"; do command -v "$t" >/dev/null || die "$t fehlt – installieren mit: apt install $t"; done
}

# ------------------------------------------------------------------ eGrid finden (nur lesen)

# Datenbank-Container von eGrid: ein supabase/postgres-Container, der nicht zu VYSNER gehört.
egrid_db() {
  if [ -n "${EGRID_DB:-}" ]; then echo "$EGRID_DB"; return; fi
  local found
  found="$(docker ps --format '{{.Names}}\t{{.Image}}' | awk -F'\t' '$2 ~ /(^|\/)supabase\/postgres(:|@|$)/ && $1 !~ /^vysner-/ {print $1}')"
  [ -n "$found" ] || die "Keinen laufenden eGrid-Datenbank-Container gefunden (Image supabase/postgres)."
  [ "$(printf '%s\n' "$found" | wc -l)" = 1 ] || die "Mehrere Datenbank-Container gefunden: $(echo $found). Bitte angeben, z. B.: EGRID_DB=supabase-db sudo -E bash $0"
  echo "$found"
}

# Einmal am Anfang jedes Skripts: eGrid festlegen (bricht sauber ab, wenn nicht eindeutig).
init_egrid() {
  EGRID_DB="$(egrid_db)"
  export EGRID_DB
  [ -n "$(egrid_project)" ] || die "Container $EGRID_DB gehört zu keinem Docker-Compose-Projekt."
}

# Lauscht schon etwas auf dem Port?
port_busy() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

label() { docker inspect -f "{{ index .Config.Labels \"$2\" }}" "$1" 2>/dev/null || true; }

egrid_project() { label "$(egrid_db)" com.docker.compose.project; }
egrid_dir() { label "$(egrid_db)" com.docker.compose.project.working_dir; }

# Ein Dienst des eGrid-Stacks (storage, auth …)
egrid_service() {
  docker ps --filter "label=com.docker.compose.project=$(egrid_project)" --filter "label=com.docker.compose.service=$1" --format '{{.Names}}' | head -1
}

# Ein einzelner Wert aus der Umgebung eines Containers – nie das Ganze ausgeben (enthält Passwörter).
env_of() { docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$1" | sed -n "s/^$2=//p" | head -1; }

mount_of() { docker inspect -f "{{range .Mounts}}{{if eq .Destination \"$2\"}}{{.Source}}{{end}}{{end}}" "$1"; }

# Abfrage in der eGrid-Datenbank – erzwungen nur lesend.
EGRID_DB_USER="${EGRID_DB_USER:-}"
egrid_sql() {
  local db user
  db="$(egrid_db)"
  if [ -z "$EGRID_DB_USER" ]; then
    for user in postgres supabase_admin; do
      if docker exec "$db" psql -X -qAt -U "$user" -d postgres -c 'select 1' >/dev/null 2>&1; then EGRID_DB_USER="$user"; break; fi
    done
    [ -n "$EGRID_DB_USER" ] || die "Kein Zugang zur eGrid-Datenbank im Container $db."
  fi
  docker exec -i -e PGOPTIONS='-c default_transaction_read_only=on' "$db" \
    psql -X -q -v ON_ERROR_STOP=1 -U "$EGRID_DB_USER" -d postgres "$@"
}

# Zustand der eGrid-Container: Name, Id und Konfiguration. Wird einer neu erstellt, umkonfiguriert oder
# von außen neu gestartet, ändert sich das. Startet ein Dienst von selbst neu (Absturz), steht das extra dabei.
egrid_fingerprint() {
  docker ps -a --filter "label=com.docker.compose.project=$(egrid_project)" --format '{{.Names}}' | sort | while read -r c; do
    if [ "$(docker inspect -f '{{.RestartCount}}' "$c")" = 0 ]; then
      docker inspect -f '{{.Name}} {{.Id}} {{ index .Config.Labels "com.docker.compose.config-hash" }} {{.State.StartedAt}}' "$c"
    else
      docker inspect -f '{{.Name}} {{.Id}} {{ index .Config.Labels "com.docker.compose.config-hash" }} (startet von selbst neu)' "$c"
    fi
  done
}

egrid_compare() {
  local after
  after="$(egrid_fingerprint)"
  if [ "$1" = "$after" ]; then
    ok "Ja – kein eGrid-Container wurde neu erstellt, umkonfiguriert oder neu gestartet"
  else
    warn "Bei eGrid hat sich etwas verändert – bitte prüfen:"
    diff <(echo "$1") <(echo "$after") | sed 's/^/    /' || true
  fi
  if grep -q "startet von selbst neu" <<<"$after"; then
    warn "Diese eGrid-Dienste starten von selbst neu (unabhängig von VYSNER): $(grep "startet von selbst neu" <<<"$after" | cut -d' ' -f1 | tr -d / | tr '\n' ' ')"
  fi
}

# ------------------------------------------------------------------ VYSNER

vysner_env() { sed -n "s/^$1=//p" "$VYSNER_DIR/.env" | head -1; }

vysner_compose() { docker compose -p "$PROJECT" --project-directory "$VYSNER_DIR" -f "$VYSNER_DIR/docker-compose.yml" "$@"; }

vysner_sql() {
  docker exec -i -e PGPASSWORD="$(vysner_env POSTGRES_PASSWORD)" -e PGOPTIONS="-c client_min_messages=warning" vysner-db \
    psql -X -q -v ON_ERROR_STOP=1 -h 127.0.0.1 -U supabase_admin -d postgres "$@"
}

human() { numfmt --to=iec --suffix=B "${1:-0}" 2>/dev/null || echo "${1:-0} Bytes"; }

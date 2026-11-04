#!/usr/bin/env bash
# VYSNER-Supabase bedienen – betrifft nur VYSNER, nie eGrid.
#
#   sudo bash vps/vysner.sh status | start | stop | logs [dienst] | neu-laden

source "$(dirname "$0")/lib.sh"
need_root
[ -f "$VYSNER_DIR/docker-compose.yml" ] || die "VYSNER ist noch nicht installiert (vps/10-installieren.sh)."

# nach einem Neu-Erstellen hängt der Gateway wieder am Netz von Caddy (vps/50-https.sh)
caddy_link() {
  local net gw
  [ -f "$VYSNER_DIR/caddy-network" ] || return 0
  net="$(cat "$VYSNER_DIR/caddy-network")"
  gw="$(vysner_compose ps --format '{{.Name}} {{.Ports}}' | awk '/->8000\/tcp/ {print $1; exit}')"
  [ -n "$gw" ] || return 0
  docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$gw" | grep -qw "$net" ||
    docker network connect --alias vysner-gateway "$net" "$gw"
}

case "${1:-status}" in
  status) vysner_compose ps --format 'table {{.Name}}\t{{.Status}}' ;;
  start) vysner_compose up -d && caddy_link ;;
  stop) vysner_compose stop ;;
  logs) vysner_compose logs --tail 200 -f ${2:+"$2"} ;;
  neu-laden)
    init_egrid
    # nach Änderungen in .env (z. B. SMTP): Konfiguration neu erzeugen und Dienste neu starten
    ARGS=()
    IFS=':' read -ra FILES <<<"$(vysner_env VYSNER_TEMPLATE_FILES)"
    for f in "${FILES[@]}"; do ARGS+=(-f "$VYSNER_DIR/template/$f"); done
    docker compose -p "$PROJECT" --project-directory "$VYSNER_DIR" --env-file "$VYSNER_DIR/.env" "${ARGS[@]}" config --format json >"$VYSNER_DIR/rendered.json"
    VYSNER_DIR="$VYSNER_DIR" EG_DIR="$(egrid_dir)" EG_PROJECT="$(egrid_project)" PORT="$(vysner_env KONG_HTTP_PORT)" \
      MEM_DB="${VYSNER_MEM_DB:-1g}" MEM_OTHER="${VYSNER_MEM_OTHER:-512m}" python3 "$HERE/compose-vysner.py"
    rm -f "$VYSNER_DIR/rendered.json"
    vysner_compose up -d
    caddy_link
    ;;
  *) die "Unbekannt: $1 (status | start | stop | logs | neu-laden)" ;;
esac

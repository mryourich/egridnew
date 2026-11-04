#!/usr/bin/env bash
# Schritt 5 – VYSNER von außen per HTTPS erreichbar machen (api.vysner.com).
#
# Für Server, auf denen eGrid hinter einem Caddy-Container läuft (Ports 80/443).
# Was passiert:
#   – eine eigene Datei vysner.caddy neben dem eGrid-Caddyfile; im Caddyfile kommt nur eine Zeile dazu:
#     "import vysner.caddy" (vorher wird eine Sicherungskopie angelegt)
#   – Caddy prüft die neue Konfiguration zuerst; ist sie nicht in Ordnung, wird alles zurückgesetzt
#   – Caddy lädt die Konfiguration im laufenden Betrieb neu – kein Neustart, eGrid läuft ohne Unterbrechung
#   – der VYSNER-Gateway-Container bekommt zusätzlich Zugang zum Netz von Caddy (unter dem Namen
#     vysner-gateway); an eGrid-Containern ändert sich nichts
#
#   sudo bash vps/50-https.sh
#   sudo VYSNER_DOMAIN=api.vysner.com bash vps/50-https.sh

source "$(dirname "$0")/lib.sh"
need_root
need_tools
init_egrid
[ -f "$VYSNER_DIR/.env" ] || die "VYSNER ist noch nicht installiert."
DOMAIN="${VYSNER_DOMAIN:-api.vysner.com}"
BEFORE="$(egrid_fingerprint)"

say "Caddy von eGrid finden"
CADDY="$(egrid_service caddy)"
[ -n "$CADDY" ] || CADDY="$(docker ps --format '{{.Names}} {{.Ports}}' | awk '/:443->/ && $1 !~ /^vysner-/ {print $1; exit}')"
[ -n "$CADDY" ] || die "Kein Caddy-Container auf Port 443 gefunden – bitte melden."
docker inspect -f '{{.Config.Image}}' "$CADDY" | grep -q caddy || die "$CADDY ist kein Caddy – bitte melden."
CDIR="$(mount_of "$CADDY" /etc/caddy)"
[ -f "$CDIR/Caddyfile" ] || die "Caddyfile von $CADDY nicht gefunden – bitte melden."
NET="$(docker inspect -f '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$CADDY" | awk '{print $1}')"
ok "$CADDY, Konfiguration in $CDIR, Netz $NET"

# eGrid startet Caddy mit einem verschlüsselten Dashboard-Passwort – beim Prüfen und Neuladen genauso
caddy_run() {
  docker exec "$CADDY" sh -c '
    if [ -n "$PROXY_AUTH_PASSWORD" ]; then PROXY_AUTH_PASSWORD=$(caddy hash-password --plaintext "$PROXY_AUTH_PASSWORD"); export PROXY_AUTH_PASSWORD; fi
    caddy '"$1"' --config /etc/caddy/Caddyfile --adapter caddyfile'
}

if [ "${1:-}" = "--entfernen" ]; then
  say "VYSNER aus Caddy entfernen"
  sed -i '/^# VYSNER (vps\/50-https.sh)/d; /^import vysner.caddy$/d' "$CDIR/Caddyfile"
  rm -f "$CDIR/vysner.caddy"
  caddy_run validate >/dev/null 2>&1 && caddy_run reload >/dev/null 2>&1 && ok "Caddy ohne VYSNER neu geladen"
  for c in $(docker ps --format '{{.Names}}' | grep '^vysner-'); do docker network disconnect "$NET" "$c" 2>/dev/null || true; done
  rm -f "$VYSNER_DIR/caddy-network"
  egrid_compare "$BEFORE"
  exit 0
fi

say "VYSNER-Adresse"
if [ "$(vysner_env SUPABASE_PUBLIC_URL)" != "https://$DOMAIN" ]; then
  python3 - "$VYSNER_DIR/.env" "$DOMAIN" <<'PY'
import sys
path, domain = sys.argv[1:]
lines = open(path).read().split("\n")
out = []
for l in lines:
    if l.startswith("SUPABASE_PUBLIC_URL="):
        l = f"SUPABASE_PUBLIC_URL=https://{domain}"
    elif l.startswith("API_EXTERNAL_URL="):
        l = f"API_EXTERNAL_URL=https://{domain}" + ("/auth/v1" if l.rstrip("/").endswith("/auth/v1") else "")
    out.append(l)
open(path, "w").write("\n".join(out))
PY
  ok "auf https://$DOMAIN umgestellt – VYSNER lädt neu"
  bash "$HERE/vysner.sh" neu-laden >/dev/null 2>&1
else
  ok "https://$DOMAIN"
fi

say "VYSNER mit Caddy verbinden"
GW="$(vysner_compose ps --format '{{.Name}} {{.Ports}}' | awk '/->8000\/tcp/ {print $1; exit}')"
[ -n "$GW" ] || die "VYSNER-Gateway nicht gefunden – läuft VYSNER? (sudo bash vps/vysner.sh status)"
if docker inspect -f "{{range \$k, \$v := .NetworkSettings.Networks}}{{\$k}} {{end}}" "$GW" | grep -qw "$NET"; then
  ok "$GW ist schon im Netz $NET"
else
  docker network connect --alias vysner-gateway "$NET" "$GW"
  ok "$GW im Netz $NET als vysner-gateway"
fi
printf '%s\n' "$NET" >"$VYSNER_DIR/caddy-network"

say "Caddy-Konfiguration ergänzen"
cat >"$CDIR/vysner.caddy" <<CADDY
# VYSNER – angelegt von vps/50-https.sh. Nur die API, kein Dashboard.
$DOMAIN {
    request_body {
        max_size 50MB
    }
    @vysner path /auth/v1/* /rest/v1/* /storage/v1/*
    handle @vysner {
        reverse_proxy vysner-gateway:8000
    }
    handle {
        respond 404
    }
    header -server
}
CADDY
BACKUP=""
if ! grep -q '^import vysner.caddy' "$CDIR/Caddyfile"; then
  BACKUP="$CDIR/Caddyfile.vor-vysner-$(date +%F-%H%M%S)"
  cp -p "$CDIR/Caddyfile" "$BACKUP"
  printf '\n# VYSNER (vps/50-https.sh) – zum Entfernen diese Zeile löschen\nimport vysner.caddy\n' >>"$CDIR/Caddyfile"
  ok "Zeile ergänzt, Sicherung: $BACKUP"
else
  ok "Zeile ist schon da"
fi

if ! caddy_run validate >/tmp/vysner-caddy.log 2>&1; then
  tail -5 /tmp/vysner-caddy.log
  if [ -n "$BACKUP" ]; then cp -p "$BACKUP" "$CDIR/Caddyfile"; fi
  rm -f "$CDIR/vysner.caddy"
  die "Caddy hat die neue Konfiguration abgelehnt – alles zurückgesetzt, eGrid unverändert."
fi
ok "Konfiguration geprüft"
caddy_run reload >/tmp/vysner-caddy.log 2>&1 || { tail -5 /tmp/vysner-caddy.log; die "Neuladen fehlgeschlagen – Caddy läuft mit der alten Konfiguration weiter."; }
ok "Caddy im laufenden Betrieb neu geladen"

say "Test"
code=""
for i in $(seq 1 24); do
  code="$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "https://$DOMAIN/auth/v1/health" || true)"
  case "$code" in 200 | 401) break ;; esac
  sleep 5
done
case "$code" in
  200 | 401) ok "https://$DOMAIN erreichbar (HTTP $code)" ;;
  *) warn "https://$DOMAIN antwortet noch nicht (HTTP ${code:-keine Antwort}) – das Zertifikat kann ein paar Minuten dauern. Später prüfen: curl -I https://$DOMAIN/auth/v1/health" ;;
esac

say "eGrid unverändert?"
egrid_compare "$BEFORE"
echo
echo "  Rückgängig machen: sudo bash vps/50-https.sh --entfernen"

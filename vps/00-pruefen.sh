#!/usr/bin/env bash
# Schritt 0 – Bestandsaufnahme. Liest nur, ändert nichts – weder am Server noch an eGrid.
# Ergebnis steht danach in vysner-pruefung.txt (ohne Passwörter) – diese Datei an Claude schicken.
#
#   sudo bash vps/00-pruefen.sh

source "$(dirname "$0")/lib.sh"
need_root
need_tools
init_egrid

OUT="${OUT:-$PWD/vysner-pruefung.txt}"
exec > >(tee "$OUT") 2>&1

say "System"
echo "  $(. /etc/os-release && echo "$PRETTY_NAME"), Kernel $(uname -r)"
echo "  CPU-Kerne: $(nproc)"
free -h | sed 's/^/  /'
df -h / | sed 's/^/  /'
echo "  Docker $(docker version -f '{{.Server.Version}}'), $(docker compose version --short 2>/dev/null | sed 's/^/Compose /')"

say "Laufende Container"
docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}' | sed 's/^/  /'
say "Speicherverbrauch"
docker stats --no-stream --format 'table {{.Name}}\t{{.MemUsage}}\t{{.CPUPerc}}' | sed 's/^/  /'

say "eGrid-Supabase"
DB="$(egrid_db)"
ok "Datenbank-Container: $DB ($(docker inspect -f '{{.Config.Image}}' "$DB"))"
ok "Projekt: $(egrid_project), Ordner: $(egrid_dir)"
if [ -f "$(egrid_dir)/.env.example" ]; then ok "Vorlage .env.example vorhanden"; else warn "Keine .env.example im eGrid-Ordner – Vorlage kommt dann von GitHub"; fi
grep -h '^COMPOSE_FILE=' "$(egrid_dir)/.env" 2>/dev/null | sed 's/^/  /' || true
ST="$(egrid_service storage)"
if [ -n "$ST" ]; then
  ok "Storage-Container: $ST"
  echo "  STORAGE_BACKEND=$(env_of "$ST" STORAGE_BACKEND)  TENANT_ID=$(env_of "$ST" TENANT_ID)  GLOBAL_S3_BUCKET=$(env_of "$ST" GLOBAL_S3_BUCKET)"
  SRC="$(mount_of "$ST" /var/lib/storage)"
  if [ -n "$SRC" ]; then
    ok "Dateien liegen in $SRC – Größe: $(du -sh "$SRC" 2>/dev/null | cut -f1), Anzahl: $(find "$SRC" -type f 2>/dev/null | wc -l)"
  else
    warn "Kein Datei-Ordner gefunden (Speicher evtl. S3)"
  fi
else
  warn "Kein Storage-Container gefunden"
fi

say "eGrid-Tabellen (Anzahl Zeilen)"
for t in $(egrid_sql -At -c "select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE' order by 1"); do
  printf '  %-32s %s\n' "$t" "$(egrid_sql -At -c "select count(*) from public.\"$t\"")"
done

say "Spalten der eGrid-Tabellen"
egrid_sql -At -F $'\t' <<'SQL' | sed 's/^/  /'
select table_name, string_agg(column_name || ':' || data_type, ', ' order by ordinal_position)
from information_schema.columns where table_schema = 'public' group by 1 order by 1;
SQL

say "Buckets"
egrid_sql -At -F $'\t' -c "select b.id, count(o.id), coalesce(sum((o.metadata->>'size')::bigint), 0) from storage.buckets b left join storage.objects o on o.bucket_id = b.id group by 1 order by 1" \
  | while IFS=$'\t' read -r b n s; do echo "  $b: $n Dateien, $(human "$s")"; done

say "Freie Ports für VYSNER"
for p in 8100 8101 8102 8200 8300; do
  if port_busy "$p"; then warn "$p belegt"; else ok "$p frei"; fi
done

say "Webserver/Proxy"
for s in nginx caddy apache2 traefik; do
  if systemctl is-active --quiet "$s" 2>/dev/null; then ok "$s läuft (System)"; fi
  docker ps --format '{{.Names}} {{.Image}}' | grep -i "$s" | sed "s/^/  ✓ Container: /" || true
done

echo
echo "Fertig. Ergebnis: $OUT"

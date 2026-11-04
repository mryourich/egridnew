#!/usr/bin/env bash
# Schritt 3 – eGrid-Daten und -Dateien nach VYSNER kopieren.
#
# eGrid wird nur gelesen:
#   – Daten: eine einzige Lese-Transaktion (default_transaction_read_only), Momentstand, keine Sperren für eGrid-Nutzer
#   – Dateien: rsync liest aus dem eGrid-Dateiordner, mit niedriger Priorität und gebremst (VYSNER_BWLIMIT, KB/s)
# Beliebig oft wiederholbar – bis zum Umstieg z. B. jede Nacht. Danach liegen nur neue/geänderte Dateien an.
#
#   sudo bash vps/30-import.sh                 Daten und Dateien
#   sudo bash vps/30-import.sh --nur-daten
#   sudo bash vps/30-import.sh --nur-dateien

source "$(dirname "$0")/lib.sh"
need_root
need_tools rsync
init_egrid
[ -f "$VYSNER_DIR/.env" ] || die "Zuerst vps/10-installieren.sh und vps/20-struktur.sh ausführen."
MODE="${1:-alles}"
BEFORE="$(egrid_fingerprint)"

# Buckets von eGrid, die übernommen werden (Standard: alle)
BUCKETS="${EGRID_BUCKETS:-$(egrid_sql -At -c 'select id from storage.buckets order by id' | tr '\n' ' ')}"

if [ "$MODE" != "--nur-dateien" ]; then
  say "Daten aus eGrid lesen (nur lesend)"
  vysner_sql -c "select 1 from public.companies limit 1" >/dev/null 2>&1 || die "VYSNER-Struktur fehlt – zuerst vps/20-struktur.sh."

  TABLES="workspaces workspace_members people site_projects site_project_members open_points open_point_assignees site_defects site_tasks site_notes site_documents site_reports attachments"
  EXIST="$(egrid_sql -At -c "select table_name from information_schema.tables where table_schema = 'public'")"
  SCRIPT="begin transaction isolation level repeatable read read only;"$'\n'
  for t in $TABLES; do
    if grep -qx "$t" <<<"$EXIST"; then
      SCRIPT+="copy (select '$t', row_to_json(t)::text from public.$t t) to stdout;"$'\n'
    else
      warn "Tabelle $t gibt es in eGrid nicht – übersprungen"
    fi
  done
  SCRIPT+="copy (select 'auth.users', json_build_object('id', id, 'email', email)::text from auth.users) to stdout;"$'\n'
  BL="$(for b in $BUCKETS; do printf "'%s'," "$b"; done)"
  [ -n "$BL" ] && SCRIPT+="copy (select 'storage.objects', row_to_json(o)::text from storage.objects o where bucket_id in (${BL%,})) to stdout;"$'\n'
  SCRIPT+="commit;"

  vysner_sql >/dev/null <<SQL
create schema if not exists import_egrid;
revoke all on schema import_egrid from public, anon, authenticated;
drop table if exists import_egrid.raw;
create table import_egrid.raw (tbl text not null, row jsonb not null);
drop table if exists import_egrid.buckets;
create table import_egrid.buckets (bucket text primary key);
$(for b in $BUCKETS; do echo "insert into import_egrid.buckets values ('$b');"; done)
SQL
  # Strom von eGrid direkt in die VYSNER-Datenbank – keine Zwischendatei mit Daten auf der Platte
  egrid_sql -At <<<"$SCRIPT" | vysner_sql -c "copy import_egrid.raw (tbl, row) from stdin"
  vysner_sql -At -F $'\t' -c "create index on import_egrid.raw (tbl); analyze import_egrid.raw; select tbl, count(*) from import_egrid.raw group by 1 order by 1" \
    | while IFS=$'\t' read -r t n; do ok "$t: $n"; done

  say "In VYSNER-Struktur umrechnen"
  vysner_sql -P footer=off <"$REPO/supabase-vysner/import/egrid-import.sql" | sed 's/^/  /'
fi

if [ "$MODE" != "--nur-daten" ]; then
  say "Dateien kopieren (eGrid nur lesend, gebremst)"
  ST="$(egrid_service storage)"
  [ -n "$ST" ] || die "eGrid-Storage-Container nicht gefunden."
  [ "$(env_of "$ST" STORAGE_BACKEND)" = "file" ] || die "eGrid speichert Dateien nicht im Dateisystem (STORAGE_BACKEND=$(env_of "$ST" STORAGE_BACKEND)) – bitte melden."
  SRC="$(mount_of "$ST" /var/lib/storage)"
  DST="$(mount_of vysner-storage /var/lib/storage)"
  [ -d "$SRC" ] && [ -d "$DST" ] || die "Dateiordner nicht gefunden (eGrid: $SRC, VYSNER: $DST)."
  DTENANT="$(env_of vysner-storage TENANT_ID)/$(env_of vysner-storage GLOBAL_S3_BUCKET)"
  for b in $BUCKETS; do
    from="$SRC/$(env_of "$ST" TENANT_ID)/$(env_of "$ST" GLOBAL_S3_BUCKET)/$b"
    [ -d "$from" ] || { warn "Bucket $b hat keinen Ordner – übersprungen"; continue; }
    need=$(du -sb "$from" | cut -f1)
    free=$(($(df -PB1 "$DST" | awk 'NR==2 {print $4}')))
    [ "$need" -lt $((free - 2 * 1024 * 1024 * 1024)) ] || die "Zu wenig Platz: Bucket $b braucht $(human "$need"), frei $(human "$free")."
    mkdir -p "$DST/$DTENANT/vysner-files"
    ok "$b → vysner-files ($(human "$need"))"
    ionice -c3 nice -n 19 rsync -aX --info=progress2 --bwlimit="${VYSNER_BWLIMIT:-40000}" "$from/" "$DST/$DTENANT/vysner-files/"
  done
fi

say "eGrid unverändert?"
egrid_compare "$BEFORE"
echo
echo "  Fertig. Wiederholen jederzeit mit: sudo bash vps/30-import.sh"

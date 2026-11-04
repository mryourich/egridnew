#!/usr/bin/env bash
# Sicherung von VYSNER: Datenbank und Dateien nach /var/backups/vysner/<Datum>. Hält die letzten 14 Tage.
# Jede Nacht automatisch (als root):  crontab -e  →  30 2 * * * bash /pfad/zu/vps/40-sicherung.sh >/var/log/vysner-sicherung.log 2>&1
#
#   sudo bash vps/40-sicherung.sh

source "$(dirname "$0")/lib.sh"
need_root
BACKUP="${VYSNER_BACKUP:-/var/backups/vysner}"
KEEP="${VYSNER_KEEP_DAYS:-14}"
DAY="$BACKUP/$(date +%F_%H%M)"
mkdir -p "$DAY"
chmod 700 "$BACKUP"

say "Datenbank"
docker exec -e PGPASSWORD="$(vysner_env POSTGRES_PASSWORD)" vysner-db \
  pg_dump -h 127.0.0.1 -U supabase_admin -d postgres -Fc -n public -n storage -n auth >"$DAY/datenbank.dump"
ok "$(human "$(stat -c %s "$DAY/datenbank.dump")")"

say "Dateien"
DST="$(mount_of vysner-storage /var/lib/storage)"
ionice -c3 nice -n 19 tar --xattrs -C "$DST" -cf "$DAY/dateien.tar" .
ok "$(human "$(stat -c %s "$DAY/dateien.tar")")"
cp "$VYSNER_DIR/.env" "$DAY/env" && chmod 600 "$DAY/env"

find "$BACKUP" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP" -exec rm -rf {} +
ok "Gesichert in $DAY (älter als $KEEP Tage gelöscht)"

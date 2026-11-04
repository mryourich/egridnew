#!/usr/bin/env bash
# Schritt 2 – VYSNER-Datenbankstruktur einspielen (Tabellen, Rechte, Dateiablage).
# Nur in der VYSNER-Datenbank. Mehrfach ausführbar.
#
#   sudo bash vps/20-struktur.sh

source "$(dirname "$0")/lib.sh"
need_root
[ -f "$VYSNER_DIR/.env" ] || die "Zuerst vps/10-installieren.sh ausführen."

say "Struktur einspielen"
for f in "$REPO"/supabase-vysner/migrations/*.sql; do
  vysner_sql <"$f" >/dev/null
  ok "$(basename "$f")"
done
vysner_sql -At -c "select count(*) from information_schema.tables where table_schema = 'public'" | sed 's/^/  Tabellen: /'
echo
echo "  Weiter mit:  sudo bash vps/30-import.sh"

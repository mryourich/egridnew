# VYSNER-Supabase auf dem eigenen Server – neben eGrid

VYSNER bekommt eine **eigene, getrennte Supabase** auf demselben VPS, auf dem eGrid läuft.
eGrid wird dabei **nicht verändert, nicht neu gestartet und nicht umkonfiguriert**.

| | eGrid | VYSNER |
|---|---|---|
| Ordner | wie bisher | `/opt/vysner-supabase` |
| Docker-Projekt | wie bisher (z. B. `supabase`) | `vysner` |
| Container | `supabase-…` | `vysner-…` |
| Netzwerk, Daten, Dateien, Logins, Schlüssel | eigene | eigene |
| Port | wie bisher | einer, nur lokal (`127.0.0.1:8100`) |

Was VYSNER nicht braucht, läuft gar nicht erst (Realtime, Edge Functions, Log-Analyse, Bildumrechnung,
Connection-Pooler). Jeder VYSNER-Dienst hat eine Speichergrenze (Datenbank 1 GB, Rest je 512 MB), damit
VYSNER eGrid nie den Arbeitsspeicher wegnimmt. Im Leerlauf braucht VYSNER etwa 0,5–1 GB.

Aus eGrid wird **nur gelesen**: die Daten in einer erzwungenen Nur-Lese-Verbindung, die Dateien per
`rsync` mit niedriger Priorität und gebremst. Jedes Skript prüft am Ende, ob ein eGrid-Container neu
erstellt, umkonfiguriert oder neu gestartet wurde.

---

## 0. Skripte auf den Server holen

Auf dem Server (als Benutzer mit sudo):

```bash
sudo apt install -y git rsync python3 openssl
git clone https://github.com/mryourich/egridnew.git ~/vysner-setup
cd ~/vysner-setup
```

(Das Repo ist privat: GitHub fragt nach Benutzername und einem Token. Alternativ die Ordner `vps/` und
`supabase-vysner/` per `scp` hochladen.)

## 1. Bestandsaufnahme – liest nur

```bash
sudo bash vps/00-pruefen.sh
```

Zeigt RAM, Festplatte, laufende Container, die eGrid-Supabase, ihre Tabellen und wie viele Dateien es
gibt. Ergebnis steht in `vysner-pruefung.txt` – **ohne Passwörter**. Diese Datei an Claude schicken,
wenn etwas unklar ist.

Findet das Skript mehrere Datenbanken, eGrid ausdrücklich nennen:
`sudo EGRID_DB=supabase-db bash vps/00-pruefen.sh` (gilt genauso für die anderen Skripte).

## 2. VYSNER-Supabase installieren

```bash
sudo VYSNER_API_URL=https://api.vysner.com bash vps/10-installieren.sh
```

- nimmt die Supabase-Vorlage aus dem eGrid-Ordner (gleiche Version, Images sind schon da) – **ohne**
  eGrid-Daten und **ohne** eGrid-`.env`
- erzeugt eigene Schlüssel und Passwörter in `/opt/vysner-supabase/.env`
- startet VYSNER und prüft, dass eGrid unverändert ist

Bricht ab, wenn weniger als ca. 2,5 GB RAM frei sind – zum Schutz von eGrid.

`VYSNER_API_URL` ist die Adresse, unter der die App VYSNER erreicht (siehe Schritt 5). Weglassen geht
auch; dann später in `.env` eintragen und `sudo bash vps/vysner.sh neu-laden`.

## 3. VYSNER-Struktur einspielen

```bash
sudo bash vps/20-struktur.sh
```

Legt die VYSNER-Tabellen an (Firma, Mitarbeiter, Baustellen, Checkliste, Mängel, Aufgaben, Notizen,
Planner, Material, Kunden, Service, Berichte, Dokumente), die Rechte und die private Dateiablage
`vysner-files`. Die Rechte entsprechen der App: Leitung sieht alles, alle anderen nur ihre Baustellen.

## 4. Daten und Dateien aus eGrid übernehmen

```bash
sudo bash vps/30-import.sh               # Daten und Dateien
sudo bash vps/30-import.sh --nur-daten   # nur Daten (schnell)
sudo bash vps/30-import.sh --nur-dateien # nur Dateien
```

Beliebig oft wiederholbar – bis zum Umstieg z. B. jede Nacht:

- in eGrid geänderte Datensätze werden aktualisiert, gelöschte entfernt
- in VYSNER selbst angelegte Datensätze und Dateien bleiben unberührt
- beim Dateikopieren werden nur neue oder geänderte Dateien übertragen

Übernommen wird:

| eGrid | VYSNER |
|---|---|
| workspaces | Firma |
| people, workspace_members | Mitarbeiter, Zugänge (Inhaber/Admin = Leitung) |
| site_projects, site_project_members | Baustellen mit Team |
| open_points, open_point_assignees | Checkliste (Bereich › Abschnitt › Unterabschnitt › Punkt) |
| site_defects | Mängel |
| site_tasks, site_notes | Aufgaben, Notizen |
| site_documents, site_reports, attachments | Dokumente bzw. Fotos an Punkten und Mängeln |
| Dateien im Bucket | Bucket `vysner-files`, gleicher Pfad |

Dateien kopieren bremst auf 40 MB/s. Schneller oder langsamer: `sudo VYSNER_BWLIMIT=10000 bash vps/30-import.sh` (KB/s).

## 5. Von außen erreichbar machen (HTTPS)

VYSNER lauscht nur auf `127.0.0.1:8100`. Nach außen geht es über den Webserver, der schon auf dem VPS
läuft. Bei deinem Domain-Anbieter einen DNS-Eintrag `api.vysner.com` → IP des VPS anlegen.

Nur die API wird freigegeben, **nicht** das Dashboard.

**nginx** (`/etc/nginx/sites-available/vysner-api`, dann verlinken, `nginx -t`, `systemctl reload nginx`,
Zertifikat mit `certbot --nginx -d api.vysner.com`):

```nginx
server {
    server_name api.vysner.com;
    client_max_body_size 50m;

    location ~ ^/(rest|auth|storage)/v1/ {
        proxy_pass http://127.0.0.1:8100;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    location / { return 404; }
}
```

**Caddy** (`/etc/caddy/Caddyfile` ergänzen, `systemctl reload caddy` – HTTPS kommt automatisch):

```
api.vysner.com {
    request_body { max_size 50MB }
    @api path /rest/v1/* /auth/v1/* /storage/v1/*
    handle @api { reverse_proxy 127.0.0.1:8100 }
    handle { respond 404 }
}
```

Ein Neuladen des Webservers unterbricht laufende eGrid-Anfragen nicht.

## 6. Dashboard (Supabase Studio)

Nur über einen SSH-Tunnel, von deinem Computer aus:

```bash
ssh -L 8100:127.0.0.1:8100 benutzer@dein-server
```

Dann im Browser `http://localhost:8100` – Benutzer `vysner`, Passwort steht in
`/opt/vysner-supabase/.env` unter `DASHBOARD_PASSWORD`.

## 7. Logins und E-Mail

Neue Registrierungen sind abgeschaltet – es kommt nur rein, wer eingeladen wird. Wer sich mit der
E-Mail anmeldet, die bei seinem Zugang steht, wird automatisch seiner Firma und seinem
Mitarbeiter-Eintrag zugeordnet.

Für Einladungs-Mails ein SMTP-Postfach in `/opt/vysner-supabase/.env` eintragen (`SMTP_HOST`,
`SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_ADMIN_EMAIL`, `SMTP_SENDER_NAME`), dann:

```bash
sudo bash vps/vysner.sh neu-laden
```

## 8. Sicherung

```bash
sudo bash vps/40-sicherung.sh
```

Datenbank, Dateien und `.env` nach `/var/backups/vysner/<Datum>`, die letzten 14 Tage bleiben.
Jede Nacht automatisch: `sudo crontab -e` und diese Zeile ergänzen (Pfad anpassen):

```
30 2 * * * bash /home/BENUTZER/vysner-setup/vps/40-sicherung.sh >/var/log/vysner-sicherung.log 2>&1
```

Die Sicherung liegt auf demselben Server – zusätzlich ab und zu woanders hin kopieren.

## Bedienung

```bash
sudo bash vps/vysner.sh status      # läuft alles?
sudo bash vps/vysner.sh logs auth   # Protokoll eines Dienstes
sudo bash vps/vysner.sh stop        # VYSNER anhalten (eGrid läuft weiter)
sudo bash vps/vysner.sh start
sudo bash vps/vysner.sh neu-laden   # nach Änderungen in .env
```

Wichtig: im Ordner `/opt/vysner-supabase` nie `docker compose down -v` ausführen (löscht die
VYSNER-Daten). Im eGrid-Ordner nichts ändern – das ist für VYSNER nie nötig.

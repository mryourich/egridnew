# VYSNpro

Die Firmenzentrale (Hub) für Unternehmen: Mitarbeiter/HR (People), Fuhrpark (Fleet),
Baustellen & Projekte (SiteManager, Open Points, Mängel, Aufgaben, Dokumentation),
Dateien, Rollen & Rechte, Mandanten (mehrere Firmen) und Einstellungen – in einer App.

Technik: Next.js 16 (App Router), React 19, TypeScript, optional Supabase als Datenbank.
Ohne Supabase-Variablen läuft die App mit Demo-Daten.

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Veröffentlichen auf Hostinger (vysnpro.com)

Die App braucht einen **Node.js-Server** (sie hat API-Routen und dynamische Seiten wie
`/client/[clientId]`). Ein reines „Website/Dateimanager“-Hosting zeigt deshalb nichts an.

1. hPanel → **Websites** → **Website hinzufügen** → **Node.js Web App**
   (verfügbar ab Business-Webhosting oder Cloud-Hosting).
2. **Mit GitHub verbinden** → Repository `mryourich/egridnew` und den Branch wählen
   (`main`, sobald dieser Code gemergt ist).
3. Build-Einstellungen:
   - Framework: **Next.js**
   - Node-Version: **20** oder **22**
   - Root-Verzeichnis: `/` (leer lassen)
   - Build-Befehl: `npm run build`
   - Startbefehl: `npm start`
   - Paketmanager: `npm`
4. Umgebungsvariablen (optional, für echte Daten statt Demo-Daten):
   ```text
   NEXT_PUBLIC_SUPABASE_URL=https://YOUR-PROJECT.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=...
   SUPABASE_SERVICE_ROLE_KEY=...
   NEXT_PUBLIC_EGRID_DEFAULT_CLIENT_ID=eww-test
   ```
5. Domain **vysnpro.com** der Node.js-App zuweisen. Liegt die Domain bei einem anderen
   Anbieter, die Nameserver auf `ns1.dns-parking.com` / `ns2.dns-parking.com` setzen
   (oder A-Record auf die IP aus dem hPanel). DNS kann bis zu 24 h brauchen.
6. **Deploy** klicken. Test: `https://vysnpro.com/api/health` liefert `{"status":"ok",...}`.

Weitere Doku: [`docs/`](docs) und [`supabase/README.md`](supabase/README.md).

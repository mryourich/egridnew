# VYSNpro

Die Unternehmenszentrale für Firmen mit Projekt- und Baustellengeschäft: Ressourcen planen,
Projekte steuern, Mängel erfassen und das Team im Blick behalten – in einer App.

## Aufbau

Eine Plattform, mehrere Mandanten (jede Firma bekommt ihren eigenen Bereich), Bedienung angelehnt an
Microsoft Dynamics Business Central / Navision: Menüleiste oben, Kacheln auf der Startseite, Listen mit
Aktionsleiste und Detailkarten. Später sehen Benutzer je nach Rolle (Bauleiter, Projektleiter,
Fuhrpark, HR, Monteur) nur ihre Bereiche.

| Modul | Rolle | Inhalt |
| --- | --- | --- |
| **Projekte** | Projektleitung | Projektliste; je Projekt Übersicht, **Einsatzplanung** (Personen einplanen), Terminplan, Mängel, Tagesberichte, Dokumente. **Ressourcenplanung** über alle Projekte |
| **TeamGrid** | Bauleitung | Nur zugeteilte Baustellen. Je Baustelle **Struktur** (Bereiche → Unterbereiche → Punkte), **Zeitplan** (wer ist wann vor Ort, nur lesen), **Fotodokumentation**, **Mängel**, **Tagesberichte** |
| **Ressourcen** | Verwaltung | Mitarbeiter, Fahrzeuge, Geräte, Abwesenheiten |
| **Start** | alle | Kennzahlen, Auslastung, Fristen |

Mängel gibt es nur innerhalb eines Projekts; Projekte sind voneinander getrennt.
Der Planer (`src/components/planner.tsx`) ist im Stil klassischer Plantafeln aufgebaut: nummerierte
Baumstruktur Abteilung → Team → Person, Kalenderwochen, Wochenenden, österreichische Feiertage,
Urlaub/Krankenstand als eigene Balken, Drag & Drop.

Zum Testen der Rollen kann oben rechts der angemeldete Benutzer gewechselt werden (Demo).

Geplant: Fleet (Poolfahrzeuge buchen), People (HR, Urlaubsanträge), Zeiterfassung, Rollen und Login.

Die Daten liegen im Moment im Browser (localStorage) und sind mit Demo-Daten vorbefüllt.
Supabase (Login, Mandanten, Datenbank und Foto-Speicher) ist der nächste Schritt.

Technik: Next.js 16 (App Router), React 19, TypeScript, lucide-react, eigenes CSS (`src/app/globals.css`).

| Pfad | Inhalt |
| --- | --- |
| `src/app/(app)/*` | Seiten: dashboard, projekte, projekte/[id], ressourcenplanung, teamgrid, teamgrid/[id], ressourcen, einstellungen |
| `src/components/planner.tsx` | Ressourcenplaner (Plantafel) |
| `src/components/site.tsx` | SiteManager: Struktur-Baum, Detailbereich, Fotos, Lightbox |
| `src/components/gantt.tsx` | Gantt für den Terminplan |
| `src/components/editors.tsx` | Formulare für alle Datensätze |
| `src/lib/site.ts` | Baum-Hilfen (Pfad, Fortschritt, Ebenen) |
| `src/lib/store.tsx` | Datenspeicher |
| `src/lib/seed.ts` | Demo-Daten (relativ zum heutigen Datum) |

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Veröffentlichen auf Hostinger (vysnpro.com)

Die App braucht einen **Node.js-Server** (API-Route und dynamische Seiten wie `/projekte/[id]`).
Ein reines „Website/Dateimanager“-Hosting zeigt deshalb nichts an. Nach jedem Merge in `main`
baut Hostinger automatisch neu.

1. hPanel → **Websites** → **Website hinzufügen** → **Node.js Web App**
   (verfügbar ab Business-Webhosting oder Cloud-Hosting).
2. **Mit GitHub verbinden** → Repository `mryourich/egridnew`, Branch `main`.
3. Build-Einstellungen:
   - Framework: **Next.js**
   - Node-Version: **20** oder **22**
   - Root-Verzeichnis: `/` (leer lassen)
   - Build-Befehl: `npm run build`
   - Startbefehl: `npm start`
   - Paketmanager: `npm`
4. Domain **vysnpro.com** der Node.js-App zuweisen. Liegt die Domain bei einem anderen
   Anbieter, die Nameserver auf `ns1.dns-parking.com` / `ns2.dns-parking.com` setzen
   (oder A-Record auf die IP aus dem hPanel). DNS kann bis zu 24 h brauchen.
5. **Deploy** klicken. Test: `https://vysnpro.com/api/health` liefert `{"status":"ok",...}`.

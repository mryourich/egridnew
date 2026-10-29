# VYSNER

- **Website** `/` (`src/app/page.tsx`, `src/app/landing.css`)
- **Baustellen-App** auf eGrid-Basis: `/uebersicht`, `/openpoints`, `/aufgaben`, `/kalender`, `/notizen`, `/material`
  – Beispielbetrieb über `/demo`, leer starten über `/demo?start=leer`.

Next.js 16 (App Router), React 19, TypeScript, lucide-react, zxing (Barcode-Scan).

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/app/(app)` | Routen der App, gemeinsamer Rahmen in `layout.tsx` |
| `src/components/ui` | Komponentenbibliothek aus eGrid (Button, Dialog, Tabelle, Tabs, …) |
| `src/components/app/kit.tsx` | App-Bausteine: Dialog, Seitenpanel, Bestätigung, Felder, Leerzustand, Dateianhänge |
| `src/components/shell` | Seitenleiste, Kopfleiste, globale Suche, Baustellen- und Benutzerauswahl, Einstellungen |
| `src/modules/*` | die sechs Module, jedes für sich lauffähig |
| `src/lib/store` | Datenmodell (`types.ts`), Speicher (`store.tsx`, localStorage), Dateien (`files.ts`, IndexedDB), Beispieldaten (`seed.ts`) |
| `src/design` | Design-System, siehe [`src/design/DESIGN.md`](src/design/DESIGN.md) |
| `supabase/` | Schema aus eGrid für die spätere Anbindung (siehe `docs/VERCEL_SUPABASE_SETUP.md`) |

## Module

- **Übersicht** – Startseite: Kennzahlen, Baustellenliste (anlegen, bearbeiten, archivieren, löschen), Detailseite je Baustelle.
- **OpenPoints** – zwei Ansichten: *Checkliste* (Bereich › Abschnitt › Unterabschnitt › Punkt, abhaken, Fotos) und
  *Mängelliste* (Nummer M-001 je Baustelle, Status, Priorität, Zuständigkeit, Frist). Mangel direkt aus einem Punkt.
- **Aufgaben** – Meine / Zugewiesen / Alle, Filter nach Status und Fälligkeit, Schnellerfassung.
- **Kalender** – VYSNER-Planungstafel: Tag/Woche/Monat, Halbtage, Ziehen und Größe ändern, Abwesenheiten,
  Symbole, Kommentare, Verknüpfungen, Heute-Markierung, Zeitraum wächst beim Scrollen.
- **Notizen** – Haftnotizen je Baustelle oder persönlich, Farben, per Griff sortierbar.
- **Material** – Bestand je Baustelle, Barcode Code 128 (Etikett drucken / SVG), Scannen mit Kamera (iPhone, iPad,
  Android) oder Handscanner, bestellt / nicht bestellt, Warnung unter Mindestbestand.

Die Baustellenauswahl in der Kopfleiste filtert alle Module („Alle Baustellen" zeigt alles). „Angemeldet als" wählt
die Person auf diesem Gerät, bis die Anmeldung über Supabase kommt.

## Daten

Alles liegt im Browser: Datensätze in `localStorage` (`vysner:baustelle`), Fotos und Dateien in IndexedDB
(`vysner-files`). Sicherung und Wiederherstellung als JSON unter *Einstellungen › Daten*. Die Datentypen folgen den
Tabellen in `supabase/migrations`; für die Anbindung wird nur die Speicherschicht in `store.tsx` ersetzt.

## Entwicklung

```bash
npm install
npm run dev        # http://localhost:3000
npm run typecheck
npm run build
```

Frühere App-Adressen (`/projekte`, `/start`, `/dashboard`, …) leiten auf `/uebersicht` um, eGrid-Links
`/client/<id>/<modul>` öffnen dasselbe Modul.

# VYSNER

- **Website** `/` (`src/app/page.tsx`, `src/app/landing.css`)
- **Baustellen-App** auf eGrid-Basis: `/uebersicht`, `/openpoints`, `/aufgaben`, `/kalender`, `/notizen`, `/material`,
  `/planner`, `/stammdaten`, `/berichte`, `/service` (Service nur wenn unter Einstellungen › Funktionen eingeschaltet)
  – Beispielbetrieb über `/demo`, leer starten über `/demo?start=leer`.

Next.js 16 (App Router), React 19, TypeScript, lucide-react, zxing (Barcode-Scan).

## Aufbau

| Ordner | Inhalt |
| --- | --- |
| `src/app/(app)` | Routen der App, gemeinsamer Rahmen in `layout.tsx` |
| `src/components/ui` | Komponentenbibliothek aus eGrid (Button, Dialog, Tabelle, Tabs, …) |
| `src/components/app/kit.tsx` | App-Bausteine: Dialog, Seitenpanel, Bestätigung, Felder, Leerzustand, Dateianhänge |
| `src/components/shell` | Seitenleiste, Kopfleiste, globale Suche, Baustellen- und Benutzerauswahl, Einstellungen |
| `src/modules/*` | die Module, jedes für sich lauffähig |
| `src/lib/pdf` | PDF-Erstellung (pdf-lib) für Bautagesbericht, Regieschein, Arbeitsbericht |
| `src/lib/store` | Datenmodell (`types.ts`), Speicher (`store.tsx`, localStorage), Dateien (`files.ts`, IndexedDB), Beispieldaten (`seed.ts`) |
| `src/design` | Design-System, siehe [`src/design/DESIGN.md`](src/design/DESIGN.md) |
| `supabase/` | Schema aus eGrid für die spätere Anbindung (siehe `docs/VERCEL_SUPABASE_SETUP.md`) |

## Module

- **Übersicht** – Startseite: Kennzahlen, Baustellenliste (anlegen, bearbeiten, archivieren, löschen), Detailseite je Baustelle.
- **OpenPoints** – zwei Ansichten: *Checkliste* (Bereich › Abschnitt › Unterabschnitt › Punkt, abhaken, Fotos) und
  *Mängelliste* (Nummer M-001 je Baustelle, Status, Priorität, Zuständigkeit, Frist, Fotos Mangel und Fotos Behebung).
  Kamera in der App: mehrere Fotos hintereinander aufnehmen, dann alle hochladen. Fotodoku als ZIP mit Ordnern wie die
  Struktur (Checkliste) bzw. `M-001 …/Mangel` und `/Behebung` (Mängel), jeweils mit Liste als CSV.
- **Aufgaben** – Meine / Zugewiesen / Alle, Filter nach Status und Fälligkeit, Schnellerfassung.
- **Kalender** – VYSNER-Planungstafel: Tag/Woche/Monat, Halbtage, Ziehen und Größe ändern, Abwesenheiten,
  Symbole, Kommentare, Verknüpfungen, Heute-Markierung, Zeitraum wächst beim Scrollen, leere Zeilen bis unten.
- **Planner** – Ressourcenplanung der ganzen Firma auf der VYSNER-Planungstafel, unabhängig von der
  Baustellenauswahl: wer arbeitet wann auf welcher Baustelle, Abwesenheiten, Leiste „Heute“ (eingeplant, abwesend, frei).
  Der **Kalender** zeigt dagegen den Bauzeitplan der oben gewählten Baustelle.
- **Stammdaten** – Mitarbeiter mit Personalnummer (eindeutig), Vor-/Nachname, Geburtsdatum, SV-Nummer (Prüfziffer
  AT), Adresse, Kontakt, Notfallkontakt, Firma (eigener Betrieb, Leiharbeit, Subunternehmer), Beschäftigung,
  Wochenstunden, Ein-/Austritt, Gewerk, Qualifikationen, Führerschein. Export als CSV.
- **Berichte** – Bautagesbericht (Witterung, Personal aus dem Planner, Arbeiten, Lieferungen, Behinderungen,
  Anordnungen, Besuche, Fotos) und Regieschein (angeordnet von, Grund, Arbeitskräfte von–bis, Material, Geräte,
  optional mit Preisen) je Baustelle – auch direkt aus Übersicht und Baustellenseite. Unterschrift am Gerät
  (Auftraggeber, Auftragnehmer) → PDF wird erstellt → Freigabe durch Team-/Bauleitung („Darf Berichte freigeben“)
  oder Zurückgeben mit Kommentar.
- **Service** (Modul, pro Firma einschaltbar) – Kunden, Serviceaufträge, Disposition (Woche × Techniker, Aufträge
  per Drag & Drop, Richtwert je Tag), „Mein Tag“ am Tablet mit Google-Maps-Navigation und Tagesroute,
  Arbeitszeit Start/Stopp, Material, Fotos, Regieschein zum Auftrag, Übernahmebestätigung mit Unterschrift des Kunden
  (ohne / mit Vorbehalt) → Arbeitsbericht als PDF → Freigabe.
- **PDFs (Österreich)** – Firmenangaben nach § 14 UGB (Firmenwortlaut, Rechtsform, Sitz, FN, Firmenbuchgericht) und
  UID aus *Einstellungen › Firmendaten*, fortlaufende Nummern (BTB-/RS-/SB-Jahr-Nr.), Bezug, Unterschriften mit Name in
  Blockbuchstaben, Ort und Zeit, Freigabevermerk, Prüfsumme (SHA-256) und Seitenzahl in der Fußzeile.
- **Notizen** – Haftnotizen je Baustelle oder persönlich, Farben, per Griff sortierbar.
- **Material** – oben *Nachbestellen* (unter Mindestbestand, mit Bestellmenge, Bestellhistorie, Bestellliste als CSV),
  dann *Bestellt – Lieferung offen* („Geliefert" bucht den Zugang), darunter alle Artikel. „Scannen & buchen": Barcode
  mit der Handykamera oder dem Handscanner erfassen, Menge eingeben – die Entnahme wird vom Bestand abgebucht und mit
  Person und Zeit protokolliert. `/material?scan=1` öffnet direkt die Kamera (Lesezeichen am Homescreen).
  Barcode Code 128 als Etikett (drucken / SVG).

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

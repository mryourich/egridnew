# VYSNER

Baustellenmanagement für Bauleitung und Monteure: Aufgaben planen, Mängel erfassen und beheben,
Fotos dokumentieren und Tagesberichte als PDF – im Büro und am Handy.

## Aufbau

Mehrere Firmen (Mandanten). **Projekte sind privat**: nur wer ein Projekt anlegt und wer eingeladen wird, sieht es.

| Rolle | Darf |
| --- | --- |
| **Projektleitung / Bauleitung / Montagekoordination** | Projekte anlegen, Leute einladen, Team verwalten, alles bearbeiten und löschen |
| **Monteur** | erfassen, abhaken, Mängel als behoben melden – aber nichts löschen |

Menü: **Start** (wer ist auf welchem Projekt, wer nicht zugeordnet), **Projekte**, **Notizen** (private Sticky Notes),
**Dokumente** (allgemeine Ablage: Anleitungen, Montagevorgaben, Messprotokolle), **Team** (Mitarbeiter mit Profilbild, Rechten, Abwesenheiten).

Je Projekt:
- **Plan** – Gruppen, Tag/Woche/Monat/Quartal, Suche/Filter, Überlastungs-Warnung; Bedienung wie Windows:
  Klick = auswählen, Doppelklick = umbenennen bzw. neuer Balken, Rechtsklick = Menü, Entf, F2, Strg+C/V/D, Pfeiltasten
- **Struktur** – Open Points: Bereichsbaum links, Punkte rechts, Foto und Mangel je Punkt, erledigte unten
- **Fotos** – automatisch benannt (Bereich - Unterpunkt - 001), ZIP mit Ordnerstruktur, PDF
- **Mängel** – Kamera zuerst, Behebung mit Nachher-Foto, Mängelbericht als PDF
- **Material** – Offen / Bestellt / Angekommen, Artikel per Art.-Nr. gemerkt
- **Berichte** – Tagesberichte mit Fotos, Regiescheine mit Unterschrift des Auftraggebers (PDF)
- **Dokumente** – Ordner (Pläne, LV, Protokolle …)
- **Team** – Mitarbeiter-Pool: Klick auf das Profilbild lädt ein

`/demo` lädt eine Demo-Firma, `/demo?start=leer` startet leer. Die Daten liegen im Moment im Browser (localStorage);
Supabase (Login, Mandanten, Datenbank, Datei-Speicher) ist der nächste Schritt.

Technik: Next.js 16 (App Router), React 19, TypeScript, lucide-react, eigenes CSS (`src/app/globals.css`, Website: `src/app/landing.css`).

| Pfad | Inhalt |
| --- | --- |
| `src/app/page.tsx` | Website (vysner.com) |
| `src/app/(app)/*` | App: dashboard, projekte, projekte/[id]/[abschnitt], notizen, dokumente, team, einstellungen, demo |
| `src/app/(print)/*` | PDFs: Tagesbericht, Regieschein, Fotobericht, Mängelbericht |
| `src/components/site-gantt.tsx` · `planner.tsx` | Plan |
| `src/components/structure.tsx` | Struktur (Open Points) |
| `src/components/site.tsx` | Fotos, Galerie, Lightbox |
| `src/components/site-sections.tsx` | Mängel, Berichte, Team je Projekt |
| `src/components/regie.tsx` · `report-sheet.tsx` | Regieschein, Tagesbericht |
| `src/components/material.tsx` · `documents.tsx` | Material, Dokumentenablage |
| `src/components/start-board.tsx` · `my-work.tsx` | Start (Büro) und „Heute“ (Monteur) |
| `src/lib/store.tsx` · `seed.ts` · `site.ts` | Datenspeicher, Demo-Daten, Baum-Hilfen |

## Lokal starten

```bash
npm install
npm run dev          # http://localhost:3000
npm run build && npm start
```

## Veröffentlichen auf Hostinger (vysner.com)

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
4. Domain **vysner.com** der Node.js-App zuweisen. Liegt die Domain bei einem anderen
   Anbieter, die Nameserver auf `ns1.dns-parking.com` / `ns2.dns-parking.com` setzen
   (oder A-Record auf die IP aus dem hPanel). DNS kann bis zu 24 h brauchen.
5. **Deploy** klicken. Test: `https://vysner.com/api/health` liefert `{"status":"ok",...}`.

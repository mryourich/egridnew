# VYSNER

Unternehmens-Hub für Bau-, Service- und Projektteams. Erstes Modul: **TeamGrid** – Projekte, Offene Punkte, Mängel,
Aufgaben, Notizen, Dokumente und Berichte. Aufgebaut auf dem eGrid-Prototyp (Codex), aufgeräumt und als VYSNER neu umgesetzt.

## Aufbau des Codes

| Ordner | Inhalt |
| --- | --- |
| `src/core` | Hub: Datenmodell (`types.ts`), lokaler Speicher (`store.tsx`), Rollen und Sichtbarkeit (`roles.ts`), Rahmen mit Seitenleiste (`shell.tsx`), Bausteine (`ui.tsx`), Firma & Benutzer (`company.tsx`), Demo-Firma (`seed.ts`) |
| `src/teamgrid` | Modul TeamGrid: Projektliste, Übersicht, Offene Punkte, Mängel, Aufgaben, Notizen, Dokumente, Berichte, Projekt-Einstellungen, Druckansichten |
| `src/app` | Routen: `/` Website, `/projekte`, `/projekte/[id]/[tab]`, `/einstellungen`, `/demo`, `/druck/[art]/[id]` |
| `supabase/migrations` | Datenbankschema für den nächsten Schritt (Login, Mandanten, Server) |

Weitere Hub-Module (People, Fleet, Datei-Zentrale) kommen als eigene Ordner neben `src/teamgrid` und nutzen `src/core`.

## Sichtbarkeit

Ein Projekt sehen nur: wer es angelegt hat, die Projektleitung, eingeladene Leute, deren Vorgesetzte im Organigramm
und der Admin. Ein neu angelegtes Projekt bleibt also privat, bis Leute eingeladen werden.

Rollen: Admin, Geschäftsführung (nur Ansicht), Bereichsleiter, Teamleiter, Projektleiter, Koordinator, Bauleiter,
Monteur, Lehrling, Extern – Rechte in `src/core/roles.ts`.

## Daten

Im Moment im Browser (localStorage, Schlüssel `vysner:data`). Die Felder entsprechen den Supabase-Tabellen,
damit der Umzug auf den Server nur die Speicherschicht (`store.tsx`) betrifft.

`/demo` lädt die Demo-Firma, `/demo?start=leer` startet leer.

## Entwickeln

```bash
npm install
npm run dev
npm run typecheck
npm run build
```

# VYSNpro

Die Unternehmenszentrale für Firmen mit Projekt- und Baustellengeschäft: Ressourcen planen,
Projekte steuern, Mängel erfassen und das Team im Blick behalten – in einer App.

## Aufbau

Eine Plattform für mehrere Mandanten (jede Firma bekommt ihren eigenen Bereich). Jede Rolle sieht nur,
was sie braucht – und alles ist verknüpft:

```
HR (Personal, Abwesenheiten)
  → Projektleitung (plant, wer auf welcher Baustelle ist)
    → Bauleitung (verteilt Aufgaben an das Team im Baustellen-Plan)
      → Monteure (sehen „Heute zu tun“, haken ab, machen Fotos)
```

| Rolle | Startseite | Module |
| --- | --- | --- |
| **Projektleitung** | Kennzahlen, Auslastung, Fristen | Projekte (Einsatzplanung je Projekt, Ressourcenplanung), TeamGrid, Personal |
| **Bauleitung** | Meine Baustellen (Karten) | TeamGrid-Menü je Baustelle: **Plan** (Aufgaben per Klick/Rechtsklick, Farbpalette, duplizieren), **Struktur** (Bereiche → Punkte, Klick öffnet), **Fotos** (Galerie je Bereich, Export ZIP/PDF), **Mängel** (Kamera zuerst), **Tagesberichte** (PDF mit KW, Aufgaben, Struktur-Fortschritt, Fotos), Team |
| **Monteur** | Heute zu tun, die nächsten Tage | Meine Baustellen (Struktur, Fotos, Mängel) |
| **HR** | Kennzahlen | Personal (Mitarbeiter, Abwesenheiten) |
| **Fuhrpark** | Übersicht: fällige Services/Pickerl, Meldungen, Werkstatttermine, heute unterwegs | Buchungen (Wochenplan), Fahrzeuge (Akte mit Service-Historie), Werkstatt (Termine ausmachen, Historie mit Kosten) |
| **Alle** | – | **Fahrzeug buchen**: freies Poolfahrzeug finden, buchen, zurückgeben (Kilometer, Schaden melden) |

**Start:** Die App beginnt leer mit einem HR-Zugang („Personalabteilung“). HR legt Mitarbeiter an und vergibt
ihre **Rechte** (Projektleitung, Bauleitung, HR, Fuhrpark, Monteur). Danach oben rechts auf den Namen klicken und in die
jeweilige Rolle wechseln (Demo bis zum echten Login). Unter *Einstellungen* lässt sich eine Demo-Firma laden
oder wieder alles löschen.

**Rechte:** Monteure dürfen erfassen und abhaken, aber nichts löschen (keine Aufgaben, Fotos, Mängel, Punkte).

Die Daten liegen im Moment im Browser (localStorage) und sind mit Demo-Daten vorbefüllt.
Supabase (Login, Mandanten, Datenbank und Foto-Speicher) ist der nächste Schritt.

Technik: Next.js 16 (App Router), React 19, TypeScript, lucide-react, eigenes CSS (`src/app/globals.css`).

| Pfad | Inhalt |
| --- | --- |
| `src/app/(app)/*` | Seiten: dashboard, projekte, projekte/[id], ressourcenplanung, teamgrid, teamgrid/[id], ressourcen, fuhrpark (buchen, fahrzeuge, fahrzeuge/[id], werkstatt), einstellungen |
| `src/components/planner.tsx` | Ressourcenplaner (Plantafel) |
| `src/components/site.tsx` | SiteManager: Struktur-Baum, Seitenfenster, Fotos, Lightbox |
| `src/components/site-gantt.tsx` | Baustellen-Plan mit Aufgaben und Farbpalette |
| `src/components/my-work.tsx` | Startseite Monteur |
| `src/components/issue-sheet.tsx` | Mängel-Karte (Kamera zuerst am Handy) |
| `src/app/(print)/*` | Druck-/PDF-Ansichten: Tagesbericht, Fotobericht |
| `src/components/sites-overview.tsx` | Baustellen-Karten Bauleitung |
| `src/components/gantt.tsx` | Gantt für den Terminplan |
| `src/components/editors.tsx` | Formulare für alle Datensätze |
| `src/components/fleet.tsx` | Fuhrpark: Buchungs- und Werkstattkarte, Wochenplan, Fahrzeugsuche |
| `src/components/fleet-pages.tsx` | Fuhrpark-Übersicht und Buchungsseite |
| `src/lib/fleet.ts` | Verfügbarkeit, Fahrzeugstatus, Fälligkeiten |
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

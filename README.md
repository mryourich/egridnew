# VYSNpro

Baustellenmanagement für Bauleitung und Monteure: Aufgaben planen, Mängel erfassen und beheben,
Fotos dokumentieren und Tagesberichte als PDF – im Büro und am Handy.

## Aufbau

Mehrere Firmen (Mandanten), jede mit eigenen Daten. Zwei Rollen:

| Rolle | Start | Darf |
| --- | --- | --- |
| **Bauleitung** | Baustellen (Karten) | Baustellen anlegen, Team verwalten und einteilen, alles bearbeiten und löschen |
| **Monteur** | „Heute“: Aufgaben, eigene Mängel, nächste Tage | erfassen, abhaken, Mängel als behoben melden – aber nichts löschen |

Je Baustelle: **Plan** (Aufgaben per Klick/Rechtsklick in halben Tagen, Farbpalette, Symbole, Urlaub verschiebbar),
**Struktur** (Bereiche → Punkte zum Abhaken), **Fotos** (Galerie je Bereich, ZIP/PDF), **Mängel** (Kamera zuerst,
Frist, Zuständigkeit, Behebung mit Nachher-Foto, Mängelbericht als PDF), **Tagesberichte** (PDF mit KW) und **Team**.

Die Projektleitung (mehrere Baustellen und Bauleiter planen) folgt als nächster Schritt.

**Start:** Die App beginnt leer mit einem Bauleitungs-Zugang. Unter *Team* Mitarbeiter mit Rechten anlegen,
unter *Baustellen* die erste Baustelle anlegen und Leute einteilen. Oben rechts auf den Namen klicken, um in eine
andere Rolle zu wechseln (Demo bis zum echten Login). `/demo` lädt eine Demo-Firma, `/demo?start=leer` startet leer.

Die Daten liegen im Moment im Browser (localStorage). Supabase (Login, Mandanten, Datenbank, Foto-Speicher) ist der nächste Schritt.

Technik: Next.js 16 (App Router), React 19, TypeScript, lucide-react, eigenes CSS (`src/app/globals.css`, Website: `src/app/landing.css`).

| Pfad | Inhalt |
| --- | --- |
| `src/app/page.tsx` | Website (vysnpro.com) |
| `src/app/(app)/*` | App: dashboard, baustellen, baustellen/[id]/[abschnitt], team, einstellungen, demo |
| `src/app/(print)/*` | PDF-Ansichten: Tagesbericht, Fotobericht, Mängelbericht |
| `src/components/site-gantt.tsx` | Baustellenplan |
| `src/components/site.tsx` | Struktur, Fotos, Lightbox |
| `src/components/site-sections.tsx` | Mängel, Tagesberichte, Team je Baustelle |
| `src/components/issue-sheet.tsx` | Mängel-Karte mit Behebung |
| `src/components/my-work.tsx` | „Heute“ für Monteure |
| `src/components/sites-overview.tsx` | Baustellen-Karten |
| `src/components/editors.tsx` | Formulare |
| `src/lib/store.tsx` · `seed.ts` · `site.ts` | Datenspeicher, Demo-Daten, Baum-Hilfen |

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

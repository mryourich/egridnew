# VYSNpro

Die Unternehmenszentrale für Firmen mit Projekt- und Baustellengeschäft: Ressourcen planen,
Projekte steuern, Mängel erfassen und das Team im Blick behalten – in einer App.

## Module

| Bereich | Funktionen |
| --- | --- |
| **Dashboard** | Kennzahlen, Auslastung der nächsten 10 Arbeitstage, freie/abwesende Mitarbeiter, Fristen (Qualifikationen, Pickerl, Prüfungen, Lieferungen, Meilensteine), dringende Meldungen, Aktivitäten |
| **Plantafel** | Kompakter Ressourcen-Gantt für Mitarbeiter, Fahrzeuge und Geräte. Drag & Drop zum Verschieben und Umbuchen, Dauer über die Balkenränder, neue Einplanung durch Ziehen auf freier Fläche, Zoom Woche/2 Wochen/Monat/Quartal, Konflikterkennung (Doppelbuchung, Abwesenheit), Auslastung je Team und Tag, Filter |
| **Projekte** | Liste und Portfolio-Zeitplan. Je Projekt: Übersicht, Terminplan-Gantt mit Phasen, Meilensteinen, Abhängigkeiten und automatischem Verschieben der Nachfolger, Vorgänge, Mängel & Meldungen, Material (geplant/geliefert/verbaut, Kosten), Tagesberichte (druckbar), Team & Geräte, Dokumente |
| **Mängel & Meldungen** | Mängel, Abweichungen und Behinderungen über alle Projekte, mit Foto (Handykamera), Priorität, Frist und Status per Klick |
| **Ressourcen** | Mitarbeiter mit Qualifikationen und Ablaufdaten, Fahrzeuge, Geräte, Abwesenheiten, aktuelle Auslastung |
| **Einstellungen** | Firmendaten, Sicherung exportieren/einspielen, Demo-Daten zurücksetzen |

Die Daten liegen im Moment im Browser (localStorage) und sind mit Demo-Daten vorbefüllt.
Supabase als gemeinsame Datenbank mit Login ist der nächste Schritt (Schema-Entwurf in `supabase/`).

Technik: Next.js 16 (App Router), React 19, TypeScript, lucide-react, eigenes CSS (`src/app/globals.css`).

| Pfad | Inhalt |
| --- | --- |
| `src/app/(app)/*` | Seiten: dashboard, planung, projekte, projekte/[id], meldungen, ressourcen, einstellungen |
| `src/components/gantt.tsx` | Gantt-Komponente für Plantafel, Terminplan und Portfolio |
| `src/components/editors.tsx` | Formulare für alle Datensätze |
| `src/components/project-tabs.tsx` | Tabs der Projektseite |
| `src/lib/store.tsx` | Datenspeicher, Konflikterkennung, Hilfsfunktionen |
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

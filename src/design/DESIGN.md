# VYSNER Baustelle – Design-System

Ernst, industriell, aufgeräumt. Hohe Informationsdichte, Grautöne, **eine Arbeitsfarbe (Petrol)** und **eine
Signalfarbe (Orange)**. Keine verspielten Elemente, keine Animationen außer kurzen Zustandswechseln (≤ 150 ms,
bei `prefers-reduced-motion` aus). Desktop zuerst, Tablet voll bedienbar (Touch-Ziele ≥ 40 px), Smartphone nutzbar.

## Dateien

| Datei | Inhalt |
| --- | --- |
| `tokens.css` | alle Farben, Schriftgrößen, Abstände, Radien, Schatten als CSS-Variablen |
| `base.css` | Grundtypografie der App (nur innerhalb `.app`, die Website bleibt unberührt) |
| `components.css` | Stil der Komponentenbibliothek `components/ui` (eGrid) und der App-Bausteine `components/app/kit.tsx` |
| `shell.css` | Rahmen: Seitenleiste, Kopfleiste, Suche, Baustellen- und Benutzerauswahl |
| `modules.css` | Layout der Module (Übersicht, OpenPoints, Notizen, Material, Planner, Stammdaten) |
| `src/app/landing.css` | Website – gleiche Farben und Formen wie die App |
| `modules/kalender/gantt.css` | Planungstafel (VYSNER-Gantt) |

## Farben

| Token | Wert | Verwendung |
| --- | --- | --- |
| `--bg` | `#f2f3f5` | Seitenhintergrund |
| `--surface` / `--surface-2` / `--surface-3` | `#fff` / `#f7f8fa` / `#eceef1` | Flächen, Tabellenkopf, Hover, Segment-Hintergrund |
| `--border` / `--border-strong` | `#d7dbe1` / `#b9bfc8` | Linien, Hover-Rahmen |
| `--text` / `--text-2` / `--muted` / `--faint` | `#16191d` / `#3c434c` / `#6b7380` / `#9aa1ab` | Text in vier Stufen |
| `--accent` | `#0e5a7a` (Petrol) | Primäraktion, Auswahl, aktive Navigation, Fortschritt |
| `--signal` | `#c2620a` (Orange) | Warnungen: überfällig, hohe Priorität, unter Mindestbestand, Heute im Kalender |
| `--ok` / `--danger` / `--info` | Grün / Rot / Blaugrau | Status erledigt, Löschen, „in Arbeit" |
| `--nav-bg` | `#1c2127` (Graphit) | Seitenleiste |

Regel: Orange nur für Dinge, die Handlung brauchen. Rot nur für Zerstörendes (Löschen) und Krankenstand.

## Typografie

Inter (variabel). Grundgröße 13 px, Zeilenhöhe 1,45. Stufen `--fs-xs` 11 · `--fs-sm` 12 · `--fs` 13 · `--fs-md` 14 ·
`--fs-lg` 16 · `--fs-xl` 20. Tabellenköpfe 11 px, Versalien, Laufweite 0,04 em. Zahlen in Spalten, Kennzahlen
und Fristen mit `tabular-nums`.

## Raster und Form

4-px-Raster (`--s1` 4 … `--s8` 32). Radien 2–4 px (`--radius-sm`, `--radius`, `--radius-lg`). Controls 32 px hoch,
kompakt 26 px, Touch 40 px. Schatten nur für schwebende Ebenen (Menüs, Dialoge, Seitenpanel).

## Bausteine

- **Button** (`ui-button`): `default` (Petrol, eine Hauptaktion je Bereich), `secondary`, `ghost`, `destructive`;
  Größen `sm`, `default`, `lg`, `icon`.
- **Seg** – Umschalter für Ansichten und Filter (Checkliste/Mängelliste, Meine/Zugewiesen/Alle, Tag/Woche/Monat).
- **Tabelle** – sortierbare Spaltenköpfe (`SortHead`), Zeile anklicken öffnet das Seitenpanel, Status direkt in der
  Zeile per Auswahlfeld, Warnzeilen mit orangem Balken links.
- **Seitenpanel** (`SidePanel`) – Bearbeiten eines Datensatzes; Textfelder speichern beim Verlassen (Blur),
  Auswahlfelder sofort. „Fertig" schließt.
- **Dialog** (`Modal`) – Anlegen mit Pflichtfeld-Prüfung; Enter bestätigt, Esc bricht ab.
- **Bestätigung** (`useConfirm`) – vor jedem Löschen; danach Meldung mit „Rückgängig".
- **Leerzustand** (`Empty`) – erklärt, was hier entsteht, und bietet die passende Aktion.
- **Kennzahl** (`.kpi`) – Zahl mit Kontext, Rand links: Petrol neutral, Orange bei Handlungsbedarf; anklickbar.
- **Status** – `StatusBadge` (Töne blue/green/amber/red/neutral), Priorität als Strich (`Prio`), Fristen mit
  „Heute/Morgen/Gestern" und Orange wenn überfällig (`Due`).

## Formate (de-AT)

Datum `TT.MM.JJJJ`, Datum mit Zeit `TT.MM.JJJJ HH:MM`, Beträge `€ 1.234,50` (`fmtEuro`), Mengen mit Komma.
Feiertage Österreich im Kalender markiert. Wortwahl österreichisch: Krankenstand, Zeitausgleich, Erdgeschoß.

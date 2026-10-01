# VYSNER für iPhone und iPad

Native App in SwiftUI (iOS 17+). Gebaut wird in der Cloud über GitHub Actions auf einem Mac,
ein eigener Mac ist nicht nötig.

## Was die App kann

- Anmelden als Person der Firma (Demo, bis der Server-Login kommt)
- **Start**: Meine Aufgaben, Kennzahlen, Projekte, letzte Aktivität
- **Aufgaben**: zugewiesene Punkte und Mängel, mit einem Tipp erledigt
- **Projekte**: Suche, Fortschritt, offene Mängel
  - Übersicht mit Team und Anruf-Knopf zur Bauleitung
  - Struktur: Bereiche und Punkte als Baum, Status antippen, wischen für „Erledigt“ oder „Mangel“
  - Mängel: erfassen mit Kamera-Foto, Schwere, Zuständig, Frist, Nachher-Foto beim Beheben
  - Fotos: Kamera oder Mediathek, Vollbild, Teilen
- Rollen wie im Web: Admin, Projektleitung, Bauleitung, Montagekoordination, Büro, Monteur

Die Daten liegen vorerst auf dem Gerät (`LocalRepository`). Für den Abgleich mit vysner.com wird
das Repository später gegen den Server getauscht, die Ansichten bleiben gleich.

## Bauen

Jeder Push mit Änderungen in `ios/` startet den Workflow **iOS-App**:

1. `xcodegen generate` erzeugt das Xcode-Projekt aus `project.yml`
2. Build für den Simulator und Screenshots aller Hauptansichten (Artefakt `screenshots`)
3. Unsignierte IPA (Artefakt `VYSNER-unsigned-ipa`)

## Aufs iPhone bringen

- **Ohne Apple-Konto zum Testen**: die unsignierte IPA mit Sideloadly (Windows) und einer
  kostenlosen Apple-ID aufs eigene iPhone laden. Läuft 7 Tage, dann neu laden.
- **TestFlight und App Store**: Apple Developer Program (99 € pro Jahr). Danach werden im Workflow
  Zertifikat und Profil als Secrets hinterlegt und die App automatisch zu TestFlight hochgeladen.

## Ordner

```
project.yml           XcodeGen-Projektbeschreibung
VYSNER/App            Einstieg, Tabs
VYSNER/Model          Datenmodelle (wie im Web)
VYSNER/Store          AppStore, lokaler Speicher, Demo-Daten
VYSNER/Views          Bildschirme
VYSNER/Components     Farben, Avatar, Fortschritt, Kamera/Fotos
VYSNER/Resources      App-Icon und Bilder
```

# VYSNpro Next.js MVP Migration

## Ziel

Die alte PHP/Vanilla-JS-Plattform bleibt als fachliche Referenz erhalten. Die neue Next.js-App bildet die SaaS-Struktur ab und kann schrittweise mit produktiver Auth, API und Datenbank verbunden werden.

## Uebernommene Domaenen

- Core: Workspace, Navigation, Health API
- People: Mitarbeiter, Rollen, Dokumentstatus
- Fleet: Fahrzeuge, Buchungen, Wartung
- Site: Projekte, Fortschritt, Maengel
- Roles: Rechte, Modulfreigaben, Mandantenlogik
- Settings: Plan, Integrationen, Sicherheit

## Naechste technische Schritte

1. Auth Provider festlegen: NextAuth/Auth.js, Clerk oder eigener B2B-Login.
2. Datenmodell in Prisma oder Drizzle erstellen.
3. Legacy-API Endpunkte fachlich in Next.js Route Handler ueberfuehren.
4. Datei-Uploads in S3-kompatiblen Storage oder Azure Blob auslagern.
5. Mandantenrechte serverseitig erzwingen.
6. Landing/Pricing erst danach mit echten Conversion-Flows verbinden.

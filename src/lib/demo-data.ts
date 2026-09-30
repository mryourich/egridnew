export type ModuleKey = "people" | "fleet" | "site" | "documents" | "booking" | "analytics";
export type RiskLevel = "low" | "medium" | "high";
export type PageKey = "dashboard" | "site" | "people" | "fleet" | "documents" | "settings";

export const workspace = {
  name: "eww Anlagentechnik",
  plan: "Professional",
  region: "EU Cloud",
  members: 46,
  tenantSlug: "eww-demo",
  trialEnds: "14 Tage"
};

export const platformModules = [
  {
    key: "people" as ModuleKey,
    title: "People",
    summary: "Mitarbeiter, Dokumente und Rollen",
    health: 94,
    status: "Aktiv",
    metric: "46 Profile",
    risk: "low" as RiskLevel
  },
  {
    key: "fleet" as ModuleKey,
    title: "Fleet",
    summary: "Fahrzeuge, Buchungen und Wartung",
    health: 88,
    status: "Aktiv",
    metric: "18 Fahrzeuge",
    risk: "medium" as RiskLevel
  },
  {
    key: "site" as ModuleKey,
    title: "Sitemanager",
    summary: "Projekte, Fortschritt und Mängel",
    health: 76,
    status: "Pilot",
    metric: "7 Projekte",
    risk: "medium" as RiskLevel
  },
  {
    key: "documents" as ModuleKey,
    title: "Dokumente",
    summary: "Freigaben, Fristen und Ablage",
    health: 91,
    status: "Aktiv",
    metric: "128 Dateien",
    risk: "low" as RiskLevel
  },
  {
    key: "booking" as ModuleKey,
    title: "Buchungen",
    summary: "Ressourcen, Räume und Geräte",
    health: 69,
    status: "Beta",
    metric: "24 Termine",
    risk: "high" as RiskLevel
  },
  {
    key: "analytics" as ModuleKey,
    title: "Analyse",
    summary: "KPIs, Reports und Export",
    health: 81,
    status: "Aktiv",
    metric: "12 Reports",
    risk: "medium" as RiskLevel
  }
];

export const people = [
  {
    id: 1,
    name: "Mario Juric",
    role: "Platform Owner",
    team: "Operations",
    status: "Aktiv",
    location: "Vöcklabruck",
    avatar: "/demo/employee-1.jpeg",
    documents: 9,
    documentsDue: 1,
    score: 96,
    lastSeen: "Heute"
  },
  {
    id: 2,
    name: "Ivan Kovac",
    role: "Site Lead",
    team: "Baustelle",
    status: "Aktiv",
    location: "Wels",
    avatar: "/demo/employee-2.jpg",
    documents: 7,
    documentsDue: 0,
    score: 91,
    lastSeen: "Heute"
  },
  {
    id: 3,
    name: "Lea Berger",
    role: "HR & Office",
    team: "People",
    status: "Onboarding",
    location: "Linz",
    avatar: "",
    documents: 4,
    documentsDue: 2,
    score: 78,
    lastSeen: "Gestern"
  },
  {
    id: 4,
    name: "Marko Petrovic",
    role: "Monteur",
    team: "Montage",
    status: "Aktiv",
    location: "Gmunden",
    avatar: "",
    documents: 8,
    documentsDue: 0,
    score: 84,
    lastSeen: "Heute"
  },
  {
    id: 5,
    name: "Anna Hofer",
    role: "Controlling",
    team: "Finance",
    status: "Aktiv",
    location: "Salzburg",
    avatar: "",
    documents: 6,
    documentsDue: 1,
    score: 89,
    lastSeen: "Montag"
  }
];

export const vehicles = [
  {
    id: "W-482EG",
    name: "VW ID. Buzz",
    group: "Montage",
    driver: "Ivan Kovac",
    status: "Verfügbar",
    utilization: 72,
    serviceDue: "18 Tage",
    range: "310 km"
  },
  {
    id: "W-117FT",
    name: "Ford Transit",
    group: "Baustelle",
    driver: "Marko Petrovic",
    status: "Gebucht",
    utilization: 86,
    serviceDue: "6 Tage",
    range: "690 km"
  },
  {
    id: "W-930EE",
    name: "Skoda Enyaq",
    group: "Office",
    driver: "Anna Hofer",
    status: "Verfügbar",
    utilization: 54,
    serviceDue: "42 Tage",
    range: "420 km"
  },
  {
    id: "W-332SA",
    name: "MAN TGE",
    group: "Service",
    driver: "Unbesetzt",
    status: "Wartung",
    utilization: 33,
    serviceDue: "Heute",
    range: "520 km"
  }
];

export const fleetReservations = [
  { vehicle: "Ford Transit", person: "Marko Petrovic", date: "Heute", slot: "07:30-16:00" },
  { vehicle: "VW ID. Buzz", person: "Ivan Kovac", date: "Morgen", slot: "08:00-12:30" },
  { vehicle: "Skoda Enyaq", person: "Anna Hofer", date: "Fr, 03.07.", slot: "13:00-17:00" }
];

export const projects = [
  {
    id: 1,
    name: "PV Umruestung Werk 2",
    client: "Industriepark Wels",
    status: "In Arbeit",
    progress: 68,
    budget: "128.400 EUR",
    openDefects: 4,
    team: 8,
    image: "/demo/site-progress.jpg"
  },
  {
    id: 2,
    name: "Ladeinfrastruktur Zentrale",
    client: "eww Gruppe",
    status: "Planung",
    progress: 42,
    budget: "74.900 EUR",
    openDefects: 1,
    team: 5,
    image: ""
  },
  {
    id: 3,
    name: "Smart Meter Rollout",
    client: "Gemeinde Attnang",
    status: "Abnahme",
    progress: 91,
    budget: "211.000 EUR",
    openDefects: 2,
    team: 12,
    image: ""
  }
];

export const defects = [
  {
    id: "M-1042",
    title: "Kabeltrasse Abschnitt B dokumentieren",
    project: "PV Umruestung Werk 2",
    owner: "Ivan Kovac",
    priority: "Hoch",
    status: "Offen"
  },
  {
    id: "M-1038",
    title: "Foto der finalen Montage fehlt",
    project: "Smart Meter Rollout",
    owner: "Marko Petrovic",
    priority: "Mittel",
    status: "In Prüfung"
  },
  {
    id: "M-1027",
    title: "Abnahmeprotokoll unterschreiben",
    project: "Ladeinfrastruktur Zentrale",
    owner: "Anna Hofer",
    priority: "Mittel",
    status: "Offen"
  }
];

export const activities = [
  { title: "Projektstatus aktualisiert", body: "PV Umruestung Werk 2 liegt bei 68 %.", time: "vor 12 Min." },
  { title: "Fahrzeug gebucht", body: "Ford Transit ist für Marko reserviert.", time: "vor 41 Min." },
  { title: "Dokument fällig", body: "Eine Schulungsbestätigung läuft bald ab.", time: "vor 2 Std." },
  { title: "Neue Einladung", body: "Lea Berger wurde dem Workspace hinzugefügt.", time: "Gestern" }
];

export const roleMatrix = [
  { role: "Owner", users: 1, scope: "Mandant, Abrechnung, Module", risk: "Niedrig" },
  { role: "Admin", users: 4, scope: "Benutzer, Projekte, Fleet", risk: "Mittel" },
  { role: "Mitarbeiter", users: 38, scope: "Eigene Daten und freigegebene Module", risk: "Niedrig" },
  { role: "Nur Lesen", users: 3, scope: "Reports und Projektansicht", risk: "Niedrig" }
];

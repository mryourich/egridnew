/* Server-side sample data for the API routes while Supabase is not connected. */

export const workspace = {
  name: "eww Anlagentechnik",
  plan: "Professional",
  region: "EU Cloud",
  members: 46,
  tenantSlug: "eww-demo",
  trialEnds: "14 Tage"
};

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
    image: ""
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

import type { Data, Employee } from "./types";

/** Roles along the organisation chart, from the top down. */
export const ROLLEN = ["admin", "gf", "bereichsleiter", "teamleiter", "koordinator", "bauleiter", "monteur", "lehrling", "extern"] as const;
export type Rolle = (typeof ROLLEN)[number];

export const ROLLE_LABEL: Record<Rolle, string> = {
  admin: "Admin",
  gf: "Geschäftsführung",
  bereichsleiter: "Bereichsleiter",
  teamleiter: "Teamleiter",
  koordinator: "Koordinator",
  bauleiter: "Bauleiter",
  monteur: "Monteur",
  lehrling: "Lehrling",
  extern: "Extern"
};

export const ROLLE_INFO: Record<Rolle, string> = {
  admin: "Darf alles und richtet VYSNER ein – Firma, Rollen, Lizenz.",
  gf: "Sieht alles wie der Admin, ändert aber nichts – der Überblick.",
  bereichsleiter: "Legt Baustellen an, plant, bearbeitet Baustellen und Mitarbeiter.",
  teamleiter: "Bearbeitet alles rund um Baustellen und Mitarbeiter, plant sein Team.",
  koordinator: "Ändert Team und Planung, Baustellen nur ansehen.",
  bauleiter: "Darf in seinen Baustellen alles; Planung und Team nur ansehen.",
  monteur: "Sieht seine Baustellen und die Planung, macht Fotos, meldet Mängel, Regie.",
  lehrling: "Wie Monteur: Baustellen und Planung sehen, Fotos und Mängel.",
  extern: "Subunternehmer, Leasing: Baustellen und Planung sehen, Fotos und Mängel."
};

type Rights = {
  /** sees every site (otherwise only those they are invited to or planned on) */
  allSites: boolean;
  createSites: boolean;
  /** changes everything inside the sites they see */
  editSites: boolean;
  /** changes the planning boards */
  plan: boolean;
  /** sees the team menu */
  teamView: boolean;
  /** changes people, roles and absences */
  team: boolean;
  /** company settings, licence, demo */
  settings: boolean;
  /** photos, defects, Regie on their sites */
  field: boolean;
  /** sees everybody in planning and team (otherwise their part of the organisation chart) */
  allPeople: boolean;
};

const R = (allSites: boolean, createSites: boolean, editSites: boolean, plan: boolean, teamView: boolean, team: boolean, settings: boolean, field: boolean, allPeople: boolean): Rights => ({
  allSites,
  createSites,
  editSites,
  plan,
  teamView,
  team,
  settings,
  field,
  allPeople
});

//                                    allSites create edit  plan  teamV team  sett  field allPeople
export const RIGHTS: Record<Rolle, Rights> = {
  admin: /*          */ R(true, true, true, true, true, true, true, true, true),
  gf: /*             */ R(true, false, false, false, true, false, false, false, true),
  bereichsleiter: /* */ R(true, true, true, true, true, true, false, true, false),
  teamleiter: /*     */ R(true, true, true, true, true, true, false, true, false),
  koordinator: /*    */ R(true, false, false, true, true, true, false, true, true),
  bauleiter: /*      */ R(false, false, true, false, true, false, false, true, false),
  monteur: /*        */ R(false, false, false, false, false, false, false, true, false),
  lehrling: /*       */ R(false, false, false, false, false, false, false, true, false),
  extern: /*         */ R(false, false, false, false, false, false, false, true, false)
};

/** Workers on site: no office tabs, simple start page. */
export const FIELD_ROLES: Rolle[] = ["monteur", "lehrling", "extern"];

/** Role of a person; older data without one is mapped from its access level and job title. */
export function rolleOf(e: Pick<Employee, "role" | "access" | "rolle"> | undefined): Rolle {
  if (!e) return "monteur";
  if (e.rolle && ROLLEN.includes(e.rolle)) return e.rolle;
  const t = (e.role ?? "").toLowerCase();
  if (e.access === "admin") return t.includes("geschäftsf") ? "gf" : "admin";
  if (e.access === "buero") return "koordinator";
  if (e.access === "pl") return "bereichsleiter";
  if (e.access === "mk") return "koordinator";
  if (e.access === "bl") return "bauleiter";
  if (t.includes("geschäftsf")) return "gf";
  if (t.includes("bereichsleit") || t.includes("projektleit")) return "bereichsleiter";
  if (t.includes("teamleit")) return "teamleiter";
  if (t.includes("koordinat") || t.includes("büro")) return "koordinator";
  if (t.includes("bauleit")) return "bauleiter";
  if (t.includes("lehrling")) return "lehrling";
  if (t.includes("subunternehm") || t.includes("extern") || t.includes("leasing")) return "extern";
  return "monteur";
}

export function rightsOf(data: Data, id = data.currentUserId) {
  return RIGHTS[rolleOf(data.employees.find((e) => e.id === id) ?? data.employees[0])];
}

export const isField = (data: Data) => FIELD_ROLES.includes(rolleOf(data.employees.find((e) => e.id === data.currentUserId) ?? data.employees[0]));

/** A person and everybody below them in the organisation chart. */
export function subtree(data: Data, id: string) {
  const out = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const e of data.employees) if (e.managerId && out.has(e.managerId) && !out.has(e.id)) (out.add(e.id), (grew = true));
  }
  return out;
}

/** Whom someone sees in planning and team: everybody, or their branch of the organisation chart. */
export function peopleScope(data: Data): Set<string> | null {
  const me = data.employees.find((e) => e.id === data.currentUserId);
  if (!me) return null;
  const r = rolleOf(me);
  if (RIGHTS[r].allPeople) return null;
  // workers see their crew: their leader and everybody under that leader
  const root = FIELD_ROLES.includes(r) && me.managerId ? me.managerId : me.id;
  const ids = subtree(data, root);
  // nothing set up yet in the organisation chart: show everybody rather than an empty board
  return ids.size > 1 ? ids : null;
}

/** Roles someone may hand out: the admin all, others only below the management. */
export function assignableRoles(data: Data): Rolle[] {
  const r = rolleOf(data.employees.find((e) => e.id === data.currentUserId));
  if (r === "admin") return [...ROLLEN];
  return ROLLEN.filter((x) => x !== "admin" && x !== "gf" && (r !== "teamleiter" || x !== "bereichsleiter"));
}

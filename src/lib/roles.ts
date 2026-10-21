import type { Data, Employee } from "./types";

/** Roles along the organisation chart, from the top down. */
export const ROLLEN = ["admin", "gf", "bereichsleiter", "teamleiter", "projektleiter", "koordinator", "bauleiter", "monteur", "lehrling", "extern"] as const;
export type Rolle = (typeof ROLLEN)[number];

export const ROLLE_LABEL: Record<Rolle, string> = {
  admin: "Admin",
  gf: "Geschäftsführung",
  bereichsleiter: "Bereichsleiter",
  teamleiter: "Teamleiter",
  projektleiter: "Projektleiter",
  koordinator: "Koordinator",
  bauleiter: "Bauleiter",
  monteur: "Monteur",
  lehrling: "Lehrling",
  extern: "Extern"
};

export const ROLLE_INFO: Record<Rolle, string> = {
  admin: "Darf alles und richtet VYSNER ein – Firma, Rollen, Lizenz.",
  gf: "Sieht seine Ebene im Detail und darunter die Zahlen – ändert nichts.",
  bereichsleiter: "Legt Baustellen an, plant, bearbeitet Baustellen und Mitarbeiter.",
  teamleiter: "Bearbeitet alles rund um Baustellen und Mitarbeiter, plant sein Team.",
  projektleiter: "Führt seine Projekte: legt Baustellen an, lädt Leute ein, sieht deren Einsätze dort.",
  koordinator: "Auf Ebene von Team- und Projektleiter: ändert Team und Planung seiner Leute, Baustellen nur ansehen.",
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
  gf: /*             */ R(true, false, false, false, true, false, false, false, false),
  bereichsleiter: /* */ R(true, true, true, true, true, true, false, true, false),
  teamleiter: /*     */ R(true, true, true, true, true, true, false, true, false),
  projektleiter: /*  */ R(false, true, true, false, true, false, false, true, false),
  koordinator: /*    */ R(true, false, false, true, true, true, false, true, false),
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
  if (e.access === "pl") return t.includes("bereichsleit") ? "bereichsleiter" : "projektleiter";
  if (e.access === "mk") return "koordinator";
  if (e.access === "bl") return "bauleiter";
  if (t.includes("geschäftsf")) return "gf";
  if (t.includes("bereichsleit")) return "bereichsleiter";
  if (t.includes("projektleit")) return "projektleiter";
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

/** Sites someone leads as Projektleitung or Bauleitung. */
export function ledSites(data: Data, id = data.currentUserId) {
  return data.projects.filter((p) => p.status !== "abgeschlossen" && (p.managerId === id || p.siteManagerId === id || p.createdBy === id));
}

/** People working on the sites someone leads, outside their own branch – they see only those assignments. */
export function projectPeople(data: Data, id = data.currentUserId) {
  const mine = subtree(data, id);
  const sites = new Set(ledSites(data, id).map((p) => p.id));
  const out = new Set<string>();
  for (const p of data.projects) if (sites.has(p.id)) for (const m of p.members) if (!mine.has(m)) out.add(m);
  for (const j of data.jobs) if (sites.has(j.projectId) && !mine.has(j.employeeId)) out.add(j.employeeId);
  return out;
}

/**
 * Step by step: a leader sees the people directly below in detail and every branch further down
 * as one summarised line (which can be opened). Null for roles that see everybody or only their crew.
 */
export function levelView(data: Data) {
  const me = data.employees.find((e) => e.id === data.currentUserId);
  if (!me) return null;
  const r = rolleOf(me);
  if (RIGHTS[r].allPeople || FIELD_ROLES.includes(r)) return null;
  const active = data.employees.filter((e) => e.active);
  const direct = active.filter((e) => e.managerId === me.id);
  const extra = [...projectPeople(data, me.id)].filter((id) => active.some((e) => e.id === id));
  if (!direct.length && !extra.length) return null;
  const branches = direct
    .map((head) => ({ head, members: [...subtree(data, head.id)].filter((id) => id !== head.id && active.some((e) => e.id === id)) }))
    .filter((b) => b.members.length > 0);
  return { me: me.id, direct: direct.map((e) => e.id), branches, extra };
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
  if (!FIELD_ROLES.includes(r)) for (const id of projectPeople(data, me.id)) ids.add(id);
  // nothing set up yet in the organisation chart: show everybody rather than an empty board
  return data.employees.some((e) => e.managerId) ? ids : null;
}

/** Roles someone may hand out: the admin all, others only below the management. */
export function assignableRoles(data: Data): Rolle[] {
  const r = rolleOf(data.employees.find((e) => e.id === data.currentUserId));
  if (r === "admin") return [...ROLLEN];
  return ROLLEN.filter((x) => x !== "admin" && x !== "gf" && ((r !== "teamleiter" && r !== "projektleiter") || x !== "bereichsleiter"));
}

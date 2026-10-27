import type { Data, Person, Project } from "./types";

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
  admin: "Richtet VYSNER ein und darf alles – Firma, Benutzer, alle Projekte.",
  gf: "Sieht die Projekte seiner Leute, ändert nichts.",
  bereichsleiter: "Legt Projekte an und führt sie; sieht die Projekte seines Bereichs.",
  teamleiter: "Legt Projekte an und führt sie; sieht die Projekte seines Teams.",
  projektleiter: "Legt Projekte an, lädt Leute ein und führt seine Projekte.",
  koordinator: "Sieht die Projekte seiner Leute, pflegt Punkte und Aufgaben.",
  bauleiter: "Führt die Projekte, in die er eingeladen ist.",
  monteur: "Arbeitet in den Projekten, in die er eingeladen ist: Punkte, Fotos, Mängel.",
  lehrling: "Wie Monteur: Punkte abhaken, Fotos, Mängel melden.",
  extern: "Subunternehmer oder Leasing: nur eingeladene Projekte, Fotos und Mängel."
};

type Rights = {
  /** sees every project of the company */
  allProjects: boolean;
  /** creates projects */
  create: boolean;
  /** manages the projects they see: data, team, structure, delete */
  manage: boolean;
  /** works in a project: points, tasks, notes, documents */
  work: boolean;
  /** company settings and people */
  admin: boolean;
  /** looks only, changes nothing */
  readOnly: boolean;
};

const R = (allProjects: boolean, create: boolean, manage: boolean, work: boolean, admin: boolean, readOnly = false): Rights => ({ allProjects, create, manage, work, admin, readOnly });

//                                    all    create manage work   admin
export const RIGHTS: Record<Rolle, Rights> = {
  admin: /*          */ R(true, true, true, true, true),
  gf: /*             */ R(false, false, false, false, false, true),
  bereichsleiter: /* */ R(false, true, true, true, false),
  teamleiter: /*     */ R(false, true, true, true, false),
  projektleiter: /*  */ R(false, true, true, true, false),
  koordinator: /*    */ R(false, false, false, true, false),
  bauleiter: /*      */ R(false, false, true, true, false),
  monteur: /*        */ R(false, false, false, true, false),
  lehrling: /*       */ R(false, false, false, true, false),
  extern: /*         */ R(false, false, false, true, false)
};

/** Workers on site: Monteur, Lehrling, Extern. */
export const FIELD: Rolle[] = ["monteur", "lehrling", "extern"];

export const me = (data: Data) => data.people.find((p) => p.id === data.meId) ?? data.people[0];
export const rightsOf = (data: Data) => RIGHTS[me(data)?.rolle ?? "monteur"];
export const isField = (data: Data) => FIELD.includes(me(data)?.rolle ?? "monteur");

/** A person and everybody below them in the organisation chart. */
export function subtree(data: Data, id: string) {
  const out = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of data.people) if (p.managerId && out.has(p.managerId) && !out.has(p.id)) (out.add(p.id), (grew = true));
  }
  return out;
}

/** The project team: creator, project management and invited people. */
export function teamOf(p: Project) {
  return [...new Set([p.createdBy, p.managerId, ...p.memberIds].filter(Boolean))];
}

/**
 * Who sees a project: everybody on its team, the admin – and the leaders above
 * someone on the team (a leader sees what their people work on). Nobody else:
 * a project somebody creates stays theirs until they invite people.
 */
export function canSee(data: Data, p: Project, id = data.meId) {
  const person = data.people.find((x) => x.id === id);
  if (!person) return false;
  if (RIGHTS[person.rolle].allProjects) return true;
  const team = teamOf(p);
  if (team.includes(id)) return true;
  if (FIELD.includes(person.rolle)) return false;
  const mine = subtree(data, id);
  return team.some((t) => mine.has(t));
}

/** Manages a project: data, team, structure, removing things. */
export function canManage(data: Data, p: Project) {
  const r = rightsOf(data);
  if (r.readOnly || !canSee(data, p)) return false;
  if (r.allProjects) return true;
  return r.manage || p.createdBy === data.meId || p.managerId === data.meId;
}

/** Works in a project: tick points, add photos, report defects, write notes. */
export function canWork(data: Data, p: Project) {
  const r = rightsOf(data);
  return !r.readOnly && r.work && canSee(data, p);
}

/** Roles someone may hand out: the admin all, others only below the management. */
export function assignableRoles(data: Data): Rolle[] {
  const r = me(data)?.rolle;
  if (r === "admin") return [...ROLLEN];
  return ROLLEN.filter((x) => x !== "admin" && x !== "gf");
}

export const byRole = (a: Person, b: Person) => ROLLEN.indexOf(a.rolle) - ROLLEN.indexOf(b.rolle) || a.name.localeCompare(b.name, "de");

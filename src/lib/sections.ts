import type { Data, ModuleKey } from "./types";
import type { Role } from "./store";

export type SiteSection = "uebersicht" | "zeiten" | "plaene" | "plan" | "struktur" | "fotos" | "maengel" | "material" | "berichte" | "dokumente";

const ALL: Role[] = ["admin", "pl", "bl", "mk", "buero", "monteur"];
const MANAGERS: Role[] = ["admin", "pl", "bl", "mk"];
const OFFICE: Role[] = [...MANAGERS, "buero"];

export const siteSections: { key: SiteSection; label: string; roles: Role[] }[] = [
  { key: "uebersicht", label: "Übersicht", roles: ALL },
  { key: "plan", label: "Plan", roles: OFFICE },
  { key: "struktur", label: "Struktur", roles: ALL },
  { key: "fotos", label: "Fotos", roles: ALL },
  { key: "maengel", label: "Mängel", roles: ALL },
  { key: "plaene", label: "Pläne", roles: ALL },
  { key: "material", label: "Material", roles: ALL },
  // Zeiterfassung is parked for now (code stays in components/times.tsx) – no role sees it
  { key: "zeiten", label: "Zeiten", roles: [] },
  { key: "berichte", label: "Berichte", roles: OFFICE },
  { key: "dokumente", label: "Dokumente", roles: ALL }
];

/** Modules a company can license (VYSNER plan): TECH is the base and always on. */
export const MODULES: { key: ModuleKey | "tech"; name: string; text: string; ready: boolean }[] = [
  { key: "tech", name: "VYSNER TECH", text: "Baustelle: Struktur, Fotos, Mängel, Pläne, Material, Berichte, Dokumente", ready: true },
  { key: "grid", name: "VYSNER GRID", text: "Einsatzplanung: Plan (Gantt), Wochenplan, Abwesenheiten", ready: true },
  { key: "projects", name: "VYSNER PROJECTS", text: "Budget, Meilensteine, Soll-Ist", ready: false },
  { key: "ai", name: "VYSNER AI", text: "Erinnerungen, Fragen an die Firmendaten, Normen mit Fundstelle", ready: false }
];

export function hasModule(data: Data, key: ModuleKey) {
  return (data.company.modules ?? ["grid"]).includes(key);
}

/** Sections that belong to a module that is switched off are hidden. */
export const SECTION_MODULE: Partial<Record<SiteSection, ModuleKey>> = { plan: "grid" };

export function sectionsFor(data: Data, role: Role) {
  return siteSections.filter((s) => s.roles.includes(role) && (!SECTION_MODULE[s.key] || hasModule(data, SECTION_MODULE[s.key]!)));
}

export function defaultSection(role: Role): SiteSection {
  return role === "monteur" ? "struktur" : "uebersicht";
}

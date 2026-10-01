import type { Role } from "./store";

export type SiteSection = "plan" | "struktur" | "fotos" | "maengel" | "material" | "berichte" | "dokumente" | "team";

const ALL: Role[] = ["pl", "bl", "mk", "monteur"];
const MANAGERS: Role[] = ["pl", "bl", "mk"];

export const siteSections: { key: SiteSection; label: string; roles: Role[] }[] = [
  { key: "plan", label: "Plan", roles: MANAGERS },
  { key: "struktur", label: "Struktur", roles: ALL },
  { key: "fotos", label: "Fotos", roles: ALL },
  { key: "maengel", label: "Mängel", roles: ALL },
  { key: "material", label: "Material", roles: ALL },
  { key: "berichte", label: "Berichte", roles: MANAGERS },
  { key: "dokumente", label: "Dokumente", roles: ALL },
  { key: "team", label: "Team", roles: ALL }
];

export function defaultSection(role: Role): SiteSection {
  return role === "monteur" ? "struktur" : "plan";
}

import { ArrowUpFromLine, Ban, Check, Clock, FileText, Flag, Info, KeyRound, Lock, Phone, Search, Star, TriangleAlert, Truck, Users, Wrench, Zap, type LucideIcon } from "lucide-react";
import type { AbsenceType, Data } from "@/lib/store/types";

export const ABSENCE: Record<AbsenceType, { label: string; short: string; color: string }> = {
  urlaub: { label: "Urlaub", short: "U", color: "#3a7ca5" },
  krank: { label: "Krankenstand", short: "K", color: "#a3252f" },
  za: { label: "Zeitausgleich", short: "ZA", color: "#3d6b45" },
  schulung: { label: "Schulung", short: "S", color: "#5a3d7a" }
};
export const ABS_TYPES: AbsenceType[] = ["urlaub", "za", "krank", "schulung"];

/** Whoever is planned on a site becomes part of its team: returns the site with the person added, or null. */
export function withMember(data: Data, siteId: string, personId: string) {
  const s = data.sites.find((x) => x.id === siteId);
  if (!s || !data.people.some((e) => e.id === personId) || s.managerId === personId || s.memberIds.includes(personId)) return null;
  return { ...s, memberIds: [...s.memberIds, personId] };
}

/** Readable text colour on a given background. */
export function textOn(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255) > 160 ? "#1f2937" : "#ffffff";
}

/** Bar colours: muted tones in the layout of classic planning boards, 5 rows × 5 columns. */
export const PALETTE = [
  ["#0e5a7a", "#2f4f6f", "#3a7ca5", "#5f8fae", "#9bb8cc"],
  ["#3d6b45", "#56805d", "#7a9a6a", "#a3b98f", "#c9d6b8"],
  ["#7a4e0e", "#a0661a", "#c2620a", "#d9934a", "#ecc9a3"],
  ["#7a1f2b", "#a3252f", "#b5545c", "#5a3d7a", "#8a75a3"],
  ["#1c2127", "#3c434c", "#6b7380", "#9aa1ab", "#c9ced5"]
];

/** Symbols for milestones and notes on the board – plain line icons. */
const SYMBOLS: Record<string, { icon: LucideIcon; label: string }> = {
  flag: { icon: Flag, label: "Meilenstein" },
  check: { icon: Check, label: "Abnahme / erledigt" },
  alert: { icon: TriangleAlert, label: "Achtung" },
  info: { icon: Info, label: "Info" },
  truck: { icon: Truck, label: "Lieferung" },
  lift: { icon: ArrowUpFromLine, label: "Kran / Hub" },
  clock: { icon: Clock, label: "Termin" },
  users: { icon: Users, label: "Besprechung" },
  phone: { icon: Phone, label: "Anruf" },
  wrench: { icon: Wrench, label: "Wartung" },
  zap: { icon: Zap, label: "Strom / Inbetriebnahme" },
  key: { icon: KeyRound, label: "Schlüssel / Übergabe" },
  lock: { icon: Lock, label: "Gesperrt" },
  ban: { icon: Ban, label: "Kein Zutritt" },
  search: { icon: Search, label: "Prüfung" },
  file: { icon: FileText, label: "Unterlagen" }
};
export const SYMBOL_NAMES = Object.keys(SYMBOLS);
export const symbolLabel = (name?: string) => SYMBOLS[name ?? ""]?.label ?? "Symbol";

export function Sym({ name, size = 13 }: { name?: string; size?: number }) {
  const I = SYMBOLS[name ?? ""]?.icon ?? Star;
  return <I size={size} strokeWidth={2.2} aria-label={symbolLabel(name)} />;
}

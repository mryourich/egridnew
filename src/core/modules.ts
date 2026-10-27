import {
  Activity,
  AlertTriangle,
  BarChart3,
  Building2,
  CalendarDays,
  Camera,
  Car,
  CheckCircle2,
  ClipboardCheck,
  Contact2,
  FileDown,
  KanbanSquare,
  Receipt,
  Timer,
  UserCheck,
  ClipboardList,
  Euro,
  FileCheck2,
  FileText,
  FolderKanban,
  FolderOpen,
  GanttChart,
  HardHat,
  LayoutDashboard,
  LockKeyhole,
  MessageSquareText,
  Network,
  Package,
  PenLine,
  Settings,
  ShieldCheck,
  StickyNote,
  UsersRound,
  Wrench
} from "lucide-react";

export type NavIcon = typeof LayoutDashboard;
export type ModuleKey = "dashboard" | "site" | "planning" | "time" | "people" | "crm" | "billing" | "fleet" | "documents" | "settings";

export type SubNavItem = {
  key: string;
  label: string;
  description: string;
  icon: NavIcon;
  /** project pages of the SiteManager that only the office sees */
  office?: boolean;
};

export type ModuleNavItem = {
  key: ModuleKey;
  label: string;
  /** short line in the platform menu */
  summary: string;
  /** sentence under the title */
  kicker: string;
  icon: NavIcon;
  /** first part of the address */
  path: string;
  color: string;
  /** not built yet: shows the roadmap */
  soon?: boolean;
  subItems: SubNavItem[];
};

/** The platform: every module with its sub menu – the menu on the left and the app launcher. */
export const MODULES: ModuleNavItem[] = [
  {
    key: "dashboard",
    label: "Dashboard",
    summary: "Zentrale Übersicht",
    kicker: "Was heute wichtig ist – Aufgaben, Mängel, Notizen.",
    icon: LayoutDashboard,
    path: "/dashboard",
    color: "#1769ff",
    subItems: [
      { key: "", label: "Dashboard", description: "Zentrale Übersicht", icon: LayoutDashboard },
      { key: "aufgaben", label: "Aufgaben", description: "Board über alle Projekte", icon: KanbanSquare },
      { key: "notizen", label: "Notizen", description: "Meine Sticky Notes", icon: StickyNote },
      { key: "aktivitaeten", label: "Aktivitäten", description: "Feed und Änderungen", icon: Activity }
    ]
  },
  {
    key: "site",
    label: "SiteManager",
    summary: "Projekte & Baustellen",
    kicker: "Projekte, Open Points, Mängel, Fotos, Regie und Material.",
    icon: HardHat,
    path: "/projekte",
    color: "#f08a24",
    subItems: [
      { key: "", label: "Site Dashboard", description: "Projekt-Cockpit", icon: LayoutDashboard },
      { key: "punkte", label: "Open Points", description: "Bereiche und Status", icon: BarChart3 },
      { key: "plan", label: "Plan", description: "Wer arbeitet wann", icon: GanttChart, office: true },
      { key: "maengel", label: "Mängel", description: "Melden und beheben", icon: AlertTriangle },
      { key: "fotos", label: "Fotos", description: "Dokumentation und Download", icon: Camera },
      { key: "regie", label: "Regie", description: "Zusatzarbeit mit Unterschrift", icon: PenLine },
      { key: "material", label: "Material", description: "Bestellen und Lieferung", icon: Package },
      { key: "aufgaben", label: "Aufgaben", description: "Zuweisungen vor Ort", icon: ClipboardList },
      { key: "notizen", label: "Notizen", description: "Baustellen-Journal", icon: MessageSquareText },
      { key: "formulare", label: "Prüfprotokolle", description: "Formulare und Checklisten", icon: ClipboardCheck },
      { key: "dokumente", label: "Dokumentation", description: "Pläne und Protokolle", icon: FileCheck2 },
      { key: "berichte", label: "Berichte", description: "Tagesberichte und PDF", icon: FileText, office: true },
      { key: "einstellungen", label: "Einstellungen", description: "Projekt-Setup", icon: Settings }
    ]
  },
  {
    key: "planning",
    label: "Planung",
    summary: "Einsatzplanung",
    kicker: "Wer arbeitet wann wo – die ganze Firma auf einer Plantafel.",
    icon: CalendarDays,
    path: "/planung",
    color: "#7c3aed",
    subItems: [
      { key: "", label: "Plantafel", description: "Gantt der Firma", icon: GanttChart },
      { key: "abwesenheiten", label: "Abwesenheiten", description: "Urlaub, ZA, Krankenstand", icon: CalendarDays }
    ]
  },
  {
    key: "time",
    label: "Zeiterfassung",
    summary: "Stempeluhr & Stunden",
    kicker: "Ein- und ausstempeln, Stunden auf Projekte buchen, Überstunden und Anwesenheit.",
    icon: Timer,
    path: "/zeiten",
    color: "#0f766e",
    subItems: [
      { key: "", label: "Meine Zeiten", description: "Woche und Stempeluhr", icon: Timer },
      { key: "anwesenheit", label: "Anwesenheit", description: "Wer ist heute da", icon: UserCheck },
      { key: "auswertung", label: "Auswertung", description: "Stunden je Projekt", icon: BarChart3 },
      { key: "export", label: "Export", description: "Stundenliste als CSV", icon: FileDown }
    ]
  },
  {
    key: "people",
    label: "People",
    summary: "Team & Organigramm",
    kicker: "Mitarbeiter, Rollen, Organigramm und Abwesenheiten.",
    icon: UsersRound,
    path: "/team",
    color: "#16a34a",
    subItems: [
      { key: "", label: "Mitarbeiter", description: "Profile und Rollen", icon: UsersRound },
      { key: "organigramm", label: "Organigramm", description: "Wer führt wen", icon: Network },
      { key: "abwesenheiten", label: "Abwesenheiten", description: "Urlaub und Krankenstand", icon: CalendarDays }
    ]
  },
  {
    key: "crm",
    label: "Kunden",
    summary: "Kontakte & Anfragen",
    kicker: "Kunden, Lieferanten, Partner – und jede Anfrage bis zum Auftrag.",
    icon: Contact2,
    path: "/kunden",
    color: "#db2777",
    subItems: [
      { key: "", label: "Kontakte", description: "Kunden und Lieferanten", icon: Contact2 },
      { key: "anfragen", label: "Anfragen", description: "Pipeline bis zum Auftrag", icon: KanbanSquare }
    ]
  },
  {
    key: "billing",
    label: "Abrechnung",
    summary: "Angebote & Rechnungen",
    kicker: "Angebote, Rechnungen, Gutschriften und Mahnungen – aus Stunden, Material und Regie.",
    icon: Receipt,
    path: "/abrechnung",
    color: "#ca8a04",
    subItems: [
      { key: "", label: "Übersicht", description: "Offene Posten und Umsatz", icon: LayoutDashboard },
      { key: "angebote", label: "Angebote", description: "Kalkulieren und versenden", icon: FileText },
      { key: "rechnungen", label: "Rechnungen", description: "Stellen und verfolgen", icon: Receipt },
      { key: "mahnungen", label: "Mahnungen", description: "Überfällige Rechnungen", icon: AlertTriangle }
    ]
  },
  {
    key: "fleet",
    label: "Fleet",
    summary: "Fuhrpark & Buchungen",
    kicker: "Fahrzeuge, Reservierungen, Wartung, Schäden und Kosten.",
    icon: Car,
    path: "/fuhrpark",
    color: "#0891b2",
    soon: true,
    subItems: [
      { key: "", label: "Fleet Dashboard", description: "Fuhrpark-Übersicht", icon: LayoutDashboard },
      { key: "fahrzeuge", label: "Fahrzeuge", description: "Stamm- und Statusdaten", icon: Car },
      { key: "reservierungen", label: "Reservierungen", description: "Buchungen und Kalender", icon: CalendarDays },
      { key: "wartung", label: "Wartung", description: "Service und Fristen", icon: Wrench },
      { key: "schaeden", label: "Schäden", description: "Meldungen und Verlauf", icon: AlertTriangle },
      { key: "kosten", label: "Kosten", description: "Budget und Auswertung", icon: Euro }
    ]
  },
  {
    key: "documents",
    label: "Datei-Zentrale",
    summary: "Dokumente & Freigaben",
    kicker: "Unternehmensdateien, Freigaben, Fristen und Vorlagen.",
    icon: FolderOpen,
    path: "/dateien",
    color: "#475569",
    soon: true,
    subItems: [
      { key: "", label: "Datei Dashboard", description: "Dokumenten-Übersicht", icon: LayoutDashboard },
      { key: "alle", label: "Alle Dateien", description: "Zentrale Ablage", icon: FileCheck2 },
      { key: "freigaben", label: "Freigaben", description: "Prüfungen und Signaturen", icon: CheckCircle2 },
      { key: "fristen", label: "Fristen", description: "Ablauf und Erinnerung", icon: CalendarDays },
      { key: "vorlagen", label: "Vorlagen", description: "Standards und Formulare", icon: FolderKanban },
      { key: "archiv", label: "Archiv", description: "Abgelegte Dateien", icon: LockKeyhole }
    ]
  },
  {
    key: "settings",
    label: "Einstellungen",
    summary: "Workspace & Admin",
    kicker: "Firma, Benutzer, Rollen und Daten.",
    icon: Settings,
    path: "/einstellungen",
    color: "#0b1d49",
    subItems: [
      { key: "", label: "Benutzer & Rollen", description: "Einladungen und Rechte", icon: ShieldCheck },
      { key: "firma", label: "Firmendaten", description: "Stammdaten und Adresse", icon: Building2 },
      { key: "formulare", label: "Formular-Vorlagen", description: "Prüfprotokolle bauen", icon: ClipboardCheck },
      { key: "daten", label: "Daten", description: "Sicherung und Demo", icon: FolderKanban }
    ]
  }
];

/** Module and sub page of an address. */
export function locate(path: string) {
  const parts = path.split("/").filter(Boolean);
  const module = MODULES.find((m) => m.path === `/${parts[0] ?? ""}`);
  if (!module) return { module: undefined, sub: "", projectId: "" };
  if (module.key === "site") return { module, projectId: parts[1] ?? "", sub: parts[2] ?? "" };
  return { module, projectId: "", sub: parts[1] ?? "" };
}

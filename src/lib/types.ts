/** ISO date string, YYYY-MM-DD */
export type ISODate = string;

export type ProjectStatus = "planung" | "aktiv" | "pausiert" | "abgeschlossen";

export type Project = {
  id: string;
  code: string;
  name: string;
  client: string;
  location: string;
  status: ProjectStatus;
  color: string;
  start: ISODate;
  end: ISODate;
  /** Projektleitung – plans the project and its team. */
  managerId: string;
  /** Bauleitung – runs the site in TeamGrid. */
  siteManagerId: string;
  budget: number;
  description: string;
};

export type Qualification = {
  name: string;
  validUntil: ISODate;
};

/** What a user may see and do: project manager, site manager, HR or worker. */
export type AccessRole = "pl" | "bl" | "hr" | "monteur";

export type Employee = {
  id: string;
  name: string;
  role: string;
  /** Access rights; derived from the job title when missing. */
  access?: AccessRole;
  department: string;
  team: string;
  phone: string;
  email: string;
  hourlyRate: number;
  qualifications: Qualification[];
  active: boolean;
};

export type Vehicle = {
  id: string;
  plate: string;
  name: string;
  type: string;
  seats: number;
  nextService: ISODate;
  status: "verfuegbar" | "werkstatt" | "ausser_betrieb";
};

export type Equipment = {
  id: string;
  name: string;
  category: string;
  serial: string;
  nextInspection: ISODate;
  status: "verfuegbar" | "defekt" | "ausser_betrieb";
};

export type ResourceType = "employee" | "vehicle" | "equipment";

export type Assignment = {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  /** Empty for a free entry (e.g. "Büro", "Schulung") that belongs to no project. */
  projectId: string;
  start: ISODate;
  end: ISODate;
  note: string;
  /** Text of a free entry. */
  label?: string;
  /** Colour of a free entry. */
  color?: string;
};

export type AbsenceType = "urlaub" | "krank" | "schulung" | "sonstiges";

export type Absence = {
  id: string;
  employeeId: string;
  type: AbsenceType;
  start: ISODate;
  end: ISODate;
  note: string;
};

export type TaskStatus = "offen" | "in_arbeit" | "erledigt" | "blockiert";

export type Task = {
  id: string;
  projectId: string;
  title: string;
  phase: string;
  start: ISODate;
  end: ISODate;
  progress: number;
  status: TaskStatus;
  assigneeId: string;
  dependsOn: string;
  milestone: boolean;
};

/** Work the site manager hands to a worker on the site schedule (Tom's-Planner style bar). */
export type Job = {
  id: string;
  projectId: string;
  employeeId: string;
  title: string;
  color: string;
  start: ISODate;
  end: ISODate;
  /** Optional link to a point of the site structure. */
  nodeId: string;
  note: string;
  done: boolean;
  /** Starts at noon (half-day precision). */
  startPm?: boolean;
  /** Ends at noon (half-day precision). */
  endAm?: boolean;
  /** Rendered as a symbol (milestone) instead of a bar. */
  symbol?: boolean;
  /** Emoji shown for a symbol. */
  icon?: string;
};

export type NodeStatus = "offen" | "in_arbeit" | "erledigt";

/** Structure of a construction site: areas, sub-areas and single points (any depth). */
export type SiteNode = {
  id: string;
  projectId: string;
  /** Empty string for top-level areas. */
  parentId: string;
  title: string;
  description: string;
  status: NodeStatus;
  assigneeId: string;
  due: ISODate;
  order: number;
};

export type Photo = {
  id: string;
  projectId: string;
  nodeId: string;
  dataUrl: string;
  caption: string;
  /** ISO date-time YYYY-MM-DDTHH:mm */
  takenAt: string;
  authorId: string;
};

export type IssueKind = "mangel" | "abweichung" | "behinderung";
export type IssueStatus = "offen" | "in_arbeit" | "erledigt";
export type Severity = "niedrig" | "mittel" | "hoch" | "kritisch";

export type Issue = {
  id: string;
  projectId: string;
  kind: IssueKind;
  title: string;
  description: string;
  location: string;
  severity: Severity;
  status: IssueStatus;
  assigneeId: string;
  due: ISODate;
  createdAt: ISODate;
  photo: string;
  nodeId?: string;
};

export type MaterialStatus = "geplant" | "bestellt" | "teilgeliefert" | "geliefert";

export type Material = {
  id: string;
  projectId: string;
  name: string;
  unit: string;
  planned: number;
  delivered: number;
  used: number;
  unitPrice: number;
  supplier: string;
  deliveryDate: ISODate;
  status: MaterialStatus;
};

export type Weather = "sonnig" | "bewoelkt" | "regen" | "schnee" | "frost";

export type DailyReport = {
  id: string;
  projectId: string;
  date: ISODate;
  weather: Weather;
  temperature: number;
  crew: number;
  hours: number;
  work: string;
  incidents: string;
  authorId: string;
};

export type DocumentFile = {
  id: string;
  projectId: string;
  name: string;
  category: string;
  size: number;
  addedAt: ISODate;
  dataUrl: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  text: string;
  projectId: string;
};

export type Company = {
  /** Tenant id – every company that buys VYSNpro gets its own. */
  tenantId: string;
  name: string;
  address: string;
  workdays: number[];
};

export type Data = {
  version: number;
  company: Company;
  /** Signed-in user (demo: switchable in the header). */
  currentUserId: string;
  projects: Project[];
  employees: Employee[];
  vehicles: Vehicle[];
  equipment: Equipment[];
  assignments: Assignment[];
  absences: Absence[];
  tasks: Task[];
  issues: Issue[];
  siteNodes: SiteNode[];
  jobs: Job[];
  photos: Photo[];
  materials: Material[];
  reports: DailyReport[];
  documents: DocumentFile[];
  activity: ActivityEntry[];
};

export type CollectionKey = Exclude<keyof Data, "version" | "company" | "currentUserId">;

export type Item<K extends CollectionKey> = Data[K][number];

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
  /** Projektleitung (shown on reports). */
  managerId: string;
  /** Bauleitung (shown on reports). */
  siteManagerId: string;
  description: string;
  /** Who created the project – it is private to them and the invited members. */
  createdBy: string;
  /** Invited people; only they (and the creator) see the project. */
  members: string[];
  /** Picture of the client or the site (data URL). */
  image?: string;
  /** Plan groups (e.g. "Takt 1") and which member sits in which group. */
  groups?: { id: string; name: string }[];
  memberGroup?: Record<string, string>;
};

export type Qualification = {
  name: string;
  validUntil: ISODate;
};

/** What a user may do: project management, site management, assembly coordination or worker. */
export type AccessRole = "pl" | "bl" | "mk" | "monteur";

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
  /** Profile picture (data URL). */
  photo?: string;
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
  /** "area" groups points (left tree), "point" is a checkable item. Derived from children when missing. */
  kind?: "area" | "point";
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
  /** Proof of the fix. */
  fixPhoto?: string;
  fixNote?: string;
  fixedAt?: ISODate;
  fixedBy?: string;
};

export type DailyReport = {
  id: string;
  projectId: string;
  date: ISODate;
  crew: number;
  hours: number;
  work: string;
  incidents: string;
  authorId: string;
  /** Photos of the day (data URLs). */
  photos: string[];
};

/** Extra work billed separately ("Regieschein"), signed by the client. */
export type RegieReport = {
  id: string;
  projectId: string;
  no: number;
  date: ISODate;
  /** Who ordered the extra work on the client side. */
  orderedBy: string;
  description: string;
  workers: { employeeId: string; hours: number }[];
  materials: { artNo: string; name: string; qty: number; unit: string }[];
  authorId: string;
  /** Client signature (data URL) and name. */
  signature: string;
  signedBy: string;
};

export type MaterialStatus = "offen" | "bestellt" | "angekommen";

export type Material = {
  id: string;
  projectId: string;
  artNo: string;
  name: string;
  qty: number;
  unit: string;
  status: MaterialStatus;
  createdAt: ISODate;
};

/** Remembered article (from any entry with an article number). */
export type Article = {
  id: string;
  artNo: string;
  name: string;
  unit: string;
};

/** Private sticky note on the notes board. */
export type Note = {
  id: string;
  ownerId: string;
  title: string;
  text: string;
  color: string;
  x: number;
  y: number;
  w: number;
  h: number;
  createdAt: ISODate;
};

/** Folder of a project's document store; projectId "" = general company documents. */
export type DocFolder = {
  id: string;
  projectId: string;
  parentId: string;
  name: string;
};

export type DocFile = {
  id: string;
  projectId: string;
  folderId: string;
  name: string;
  size: number;
  type: string;
  dataUrl: string;
  addedAt: ISODate;
  addedBy: string;
};

export type ActivityEntry = {
  id: string;
  at: string;
  text: string;
  projectId: string;
};

export type Company = {
  /** Tenant id – every company that buys VYSNERTECH gets its own. */
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
  absences: Absence[];
  issues: Issue[];
  siteNodes: SiteNode[];
  jobs: Job[];
  photos: Photo[];
  reports: DailyReport[];
  regie: RegieReport[];
  materials: Material[];
  articles: Article[];
  notes: Note[];
  folders: DocFolder[];
  files: DocFile[];
  activity: ActivityEntry[];
};

export type CollectionKey = Exclude<keyof Data, "version" | "company" | "currentUserId">;

export type Item<K extends CollectionKey> = Data[K][number];

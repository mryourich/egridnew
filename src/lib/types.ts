/** ISO date string, YYYY-MM-DD */
export type ISODate = string;

/** Local date-time YYYY-MM-DDTHH:mm:ss */
export type Stamp = string;

/** Who created / changed an entry and when – filled in automatically by the store. */
export type Tracked = {
  createdBy?: string;
  createdTs?: Stamp;
  updatedBy?: string;
  updatedTs?: Stamp;
  /** Every status change: new status, who, when. */
  history?: { status: string; by: string; ts: Stamp }[];
};

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
  /** Picture of the site (data URL). */
  image?: string;
  /** Picture or logo of the client (data URL). */
  clientImage?: string;
  /** Plan groups (e.g. "Takt 1") and which member sits in which group. */
  groups?: { id: string; name: string }[];
  memberGroup?: Record<string, string>;
  /** Free plan rows (people without an account, subcontractors, crane, deliveries …). */
  planRows?: { id: string; name: string }[];
  /** Order of the plan rows (employee ids and free row ids). */
  rowOrder?: string[];
};

export type Qualification = {
  name: string;
  validUntil: ISODate;
};

/** What a user may do: project management, site management, assembly coordination or worker. */
/** admin: everything of the company · pl/bl/mk: project, site and assembly management · buero: reads all sites, releases reports · monteur: works on site */
export type AccessRole = "admin" | "pl" | "bl" | "mk" | "buero" | "monteur";

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
  /** Own staff or leased from a staffing agency. */
  employment?: "eigen" | "leasing";
  /** Staffing agency of a leased worker. */
  leasingCompany?: string;
  /** Personnel number for time sheets. */
  staffNo?: string;
};

export type AbsenceType = "urlaub" | "krank" | "za" | "schulung" | "sonstiges";

export type Absence = {
  id: string;
  employeeId: string;
  type: AbsenceType;
  start: ISODate;
  end: ISODate;
  note: string;
  /** Zeitausgleich of only part of a day (hours); empty = whole day. */
  hours?: number;
};

/** Work the site manager hands to a worker on the site schedule (Tom's-Planner style bar). */
export type Job = Tracked & {
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
export type SiteNode = Tracked & {
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

export type Photo = Tracked & {
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

export type Issue = Tracked & {
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
  /** Position on a plan (0…1 of width / height). */
  plan?: { planId: string; x: number; y: number };
  /** Proof of the fix. */
  fixPhoto?: string;
  fixNote?: string;
  fixedAt?: ISODate;
  fixedBy?: string;
};

/** A drawing of the site (floor plan, section …) – PDF pages are stored as pictures. */
export type SitePlan = Tracked & {
  id: string;
  projectId: string;
  name: string;
  dataUrl: string;
  width: number;
  height: number;
  addedAt: ISODate;
  addedBy: string;
};

export type DailyReport = Tracked & {
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
export type RegieReport = Tracked & {
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
  /** Photos of the extra work (data URLs). */
  photos?: string[];
  /** Released by the office / project management. */
  approvedBy?: string;
  approvedAt?: string;
  /** Client signature (data URL) and name. */
  signature: string;
  signedBy: string;
};

export type MaterialStatus = "offen" | "bestellt" | "angekommen";

export type Material = Tracked & {
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

export type DocFile = Tracked & {
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
  /** Who did it. */
  by?: string;
  text: string;
  projectId: string;
};

/** One working day of one person on one project. */
export type TimeEntry = Tracked & {
  id: string;
  projectId: string;
  employeeId: string;
  date: ISODate;
  /** "07:00" */
  start: string;
  end: string;
  /** Break in minutes. */
  pause: number;
  activity: string;
};

/** Where the values go in a customer's Excel time sheet. */
export type TemplateMapping = {
  sheet: string;
  /** Header values → cell address, e.g. { mitarbeiter: "C4" }. */
  header: Partial<Record<TemplateHeaderField, string>>;
  /** First row of the day table (1-based). */
  rowStart: number;
  /** How many day rows the form has (fixed forms); empty = insert as many rows as needed. */
  rowCount?: number;
  /** Day values → column letter, e.g. { datum: "A" }. */
  columns: Partial<Record<TemplateColumnField, string>>;
  /** Placeholder templates insert rows; fixed forms are only filled. */
  insertRows?: boolean;
  /** Short explanation (from the AI) of what was recognised. */
  note?: string;
};

export type TemplateHeaderField = "mitarbeiter" | "personalnummer" | "firma" | "verleiher" | "projekt" | "projektnummer" | "kunde" | "ort" | "kw" | "zeitraum" | "von" | "bis" | "summe" | "datum_heute" | "bauleitung";
export type TemplateColumnField = "datum" | "wochentag" | "beginn" | "ende" | "pause" | "stunden" | "taetigkeit";

export type TimesheetSettings = {
  /** Default working day. */
  dayStart: string;
  dayEnd: string;
  pause: number;
  /** Own PDF layout. */
  title: string;
  showPause: boolean;
  showActivity: boolean;
  signatures: string[];
  note: string;
  /** Company logo on the PDF (data URL), otherwise the VYSNER logo. */
  logo?: string;
  /** Customer Excel template. */
  template?: { name: string; dataUrl: string; mapping?: TemplateMapping };
  /** PDF from the own design or from the uploaded Excel form. */
  pdfSource?: "design" | "excel";
  /** Designer: colour, header style, which header facts and columns (order + labels). */
  accent?: string;
  headStyle?: "linie" | "balken" | "kasten";
  fontSize?: "klein" | "normal" | "gross";
  orientation?: "hoch" | "quer";
  facts?: DesignItem<TimesheetFact>[];
  columns?: DesignItem<TemplateColumnField>[];
  showSummary?: boolean;
};

export type TimesheetFact = "mitarbeiter" | "personalnummer" | "firma" | "projekt" | "kunde" | "ort" | "bauleitung" | "zeitraum";
export type DesignItem<K extends string> = { key: K; label: string; on: boolean };

export type ModuleKey = "grid" | "projects" | "ai";

export type Company = {
  /** Tenant id – every company that buys VYSNER gets its own. */
  tenantId: string;
  name: string;
  address: string;
  workdays: number[];
  timesheet?: TimesheetSettings;
  /** Licensed modules besides TECH (always on), e.g. ["grid"]. Empty/missing = default set. */
  modules?: ModuleKey[];
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
  times: TimeEntry[];
  plans: SitePlan[];
  articles: Article[];
  notes: Note[];
  folders: DocFolder[];
  files: DocFile[];
  activity: ActivityEntry[];
};

export type CollectionKey = Exclude<keyof Data, "version" | "company" | "currentUserId">;

export type Item<K extends CollectionKey> = Data[K][number];

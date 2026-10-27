import type { ISODate } from "./date";
import type { Rolle } from "./roles";

/*
 * Data of one company (workspace). The shapes follow the Supabase tables in supabase/migrations,
 * so the switch from this device to the server later only changes where the data lives.
 */

export type { ISODate };

/** Every record knows who created and last changed it. */
export type Stamped = {
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  address: string;
  /** Layout of the company-wide planning board. */
  plan?: PlanLayout;
};

/** Rows, groups and order of a planning board (company planning or a project plan). */
export type PlanLayout = {
  groups?: { id: string; name: string }[];
  memberGroup?: Record<string, string>;
  /** Free rows: crane, delivery, subcontractor without account … */
  planRows?: { id: string; name: string }[];
  rowOrder?: string[];
  /** Free status text per row, e.g. "FERTIG". */
  rowStatus?: Record<string, string>;
};

export type Person = {
  id: string;
  name: string;
  /** Job title as people say it, e.g. "Elektrotechniker". */
  title: string;
  rolle: Rolle;
  /** Superior in the organisation chart. */
  managerId: string;
  email: string;
  phone: string;
  active: boolean;
  /** Crew, e.g. "Montage A" – groups the project plan. */
  team?: string;
};

export type ProjectStatus = "planning" | "active" | "handover" | "paused" | "archived";

export type Project = Stamped & {
  id: string;
  name: string;
  number: string;
  client: string;
  location: string;
  status: ProjectStatus;
  start: ISODate | "";
  due: ISODate | "";
  /** Projektleitung */
  managerId: string;
  /** Invited people; together with the creator they are the project team. */
  memberIds: string[];
  budget: number | null;
  description: string;
  color: string;
  /** Picture of the site (data URL or file in /public) – shown on the project card. */
  image?: string;
  settings: ProjectSettings;
} & PlanLayout;

export type ProjectSettings = {
  /** A point can only be closed with at least one photo. */
  photoRequired: boolean;
  /** Defects are closed by the project management, not by the person fixing them. */
  defectApproval: boolean;
};

export type WorkStatus = "open" | "in_progress" | "done";

/** Open points: area › section › subsection › point – a tree per project. */
export type PointType = "area" | "section" | "subsection" | "task";

export type Attachment = {
  id: string;
  name: string;
  kind: "photo" | "file";
  mime: string;
  size: number;
  /** data URL while the data lives on this device */
  url: string;
  addedBy: string;
  addedAt: string;
};

export type OpenPoint = Stamped & {
  id: string;
  projectId: string;
  parentId: string;
  type: PointType;
  title: string;
  description: string;
  status: WorkStatus;
  assigneeIds: string[];
  due: ISODate | "";
  order: number;
  attachments: Attachment[];
  /** who closed it and when */
  doneBy?: string;
  doneAt?: string;
};

export type Priority = "high" | "medium" | "low";

export type Defect = Stamped & {
  id: string;
  projectId: string;
  /** Running number per project, e.g. 7 → "M-007". */
  no: number;
  openPointId: string;
  title: string;
  description: string;
  location: string;
  ownerId: string;
  priority: Priority;
  status: WorkStatus;
  due: ISODate | "";
  attachments: Attachment[];
  /** Proof of the fix: photos after and a short note. */
  fixPhotos?: Attachment[];
  fixNote?: string;
  closedBy?: string;
  closedAt?: string;
};

export type Task = Stamped & {
  id: string;
  projectId: string;
  title: string;
  ownerId: string;
  due: ISODate | "";
  done: boolean;
  doneAt?: string;
};

/** Sticky note: of a project (everyone on it sees it) or personal (projectId ""), shown on the dashboard. */
export type Note = Stamped & {
  id: string;
  projectId: string;
  text: string;
  pinned: boolean;
  color: string;
};

export type AbsenceType = "urlaub" | "krank" | "za" | "schulung";

export type Absence = {
  id: string;
  employeeId: string;
  type: AbsenceType;
  start: ISODate;
  end: ISODate;
  note: string;
};

/** A bar (or symbol) on a planning board, in half days. */
export type Job = Stamped & {
  id: string;
  projectId: string;
  /** Row: a person or a free plan row. */
  employeeId: string;
  title: string;
  color: string;
  start: ISODate;
  end: ISODate;
  startPm?: boolean;
  endAm?: boolean;
  note: string;
  done: boolean;
  symbol?: boolean;
  icon?: string;
  comment?: string;
  links?: string[];
};

/** Photo of the project documentation that does not belong to a point or defect. */
export type Photo = Stamped & {
  id: string;
  projectId: string;
  pointId: string;
  caption: string;
  file: Attachment;
};

export type MaterialStatus = "open" | "ordered" | "arrived";

export type Material = Stamped & {
  id: string;
  projectId: string;
  artNo: string;
  name: string;
  qty: number;
  unit: string;
  status: MaterialStatus;
  note: string;
};

/** Remembered article – suggested when entering material again. */
export type Article = { id: string; artNo: string; name: string; unit: string };

/** Extra work billed separately, signed by the client on site. */
export type Regie = Stamped & {
  id: string;
  projectId: string;
  no: number;
  date: ISODate;
  orderedBy: string;
  description: string;
  workers: { employeeId: string; hours: number }[];
  materials: { artNo: string; name: string; qty: number; unit: string }[];
  photos: Attachment[];
  signature: string;
  signedBy: string;
  signedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
};

/** Daily site report. */
export type DailyReport = Stamped & {
  id: string;
  projectId: string;
  date: ISODate;
  weather: string;
  crew: { employeeId: string; hours: number }[];
  work: string;
  incidents: string;
  photos: Attachment[];
};

export type DocumentKind = "photo" | "protocol" | "plan" | "report" | "file";
export type DocumentStatus = "draft" | "review" | "approved";

export type ProjectDocument = Stamped & {
  id: string;
  projectId: string;
  name: string;
  kind: DocumentKind;
  status: DocumentStatus;
  file: Attachment;
};

export type ReportKind = "status" | "defects" | "points" | "photos";

export type Report = Stamped & {
  id: string;
  projectId: string;
  kind: ReportKind;
  name: string;
  target: string;
  status: "draft" | "ready" | "sent";
};

export type Activity = {
  id: string;
  projectId: string;
  at: string;
  by: string;
  text: string;
};

export type Data = {
  version: number;
  /** demo content version – the demo company is refreshed when it changes */
  demo?: number;
  workspace: Workspace;
  /** signed-in person (demo: switchable in the user menu) */
  meId: string;
  people: Person[];
  projects: Project[];
  points: OpenPoint[];
  defects: Defect[];
  tasks: Task[];
  notes: Note[];
  documents: ProjectDocument[];
  reports: Report[];
  absences: Absence[];
  jobs: Job[];
  photos: Photo[];
  materials: Material[];
  articles: Article[];
  regie: Regie[];
  dailies: DailyReport[];
  activity: Activity[];
};

/** The lists that hold records with an id. */
export type Collection = "people" | "projects" | "points" | "defects" | "tasks" | "notes" | "documents" | "reports" | "absences" | "jobs" | "photos" | "materials" | "articles" | "regie" | "dailies";
export type Item<K extends Collection> = Data[K][number];

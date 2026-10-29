import type { ISODate } from "../date";

/*
 * Data of one company. The shapes follow the tables in supabase/migrations (site_projects, open_points,
 * site_defects, site_tasks, site_notes …), so connecting Supabase later only replaces the storage in store.tsx.
 */

export type { ISODate };

/** Every record knows who created and last changed it. */
export type Stamped = {
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
};

export type Person = {
  id: string;
  name: string;
  /** e.g. Bauleiter, Monteur, Lehrling */
  role: string;
  phone: string;
  active: boolean;
};

export type SiteStatus = "geplant" | "aktiv" | "abnahme" | "pausiert" | "archiviert";

/** A construction site (Baustelle). */
export type Site = Stamped & {
  id: string;
  number: string;
  name: string;
  client: string;
  address: string;
  status: SiteStatus;
  start: ISODate | "";
  end: ISODate | "";
  managerId: string;
  memberIds: string[];
  color: string;
  note: string;
};

/** Photo or file; the content lives in IndexedDB under the same id. */
export type FileRef = {
  id: string;
  name: string;
  mime: string;
  size: number;
  addedBy: string;
  addedAt: string;
};

export type WorkStatus = "offen" | "in_arbeit" | "erledigt";

/** Checklist: area › section › subsection › point. */
export type PointType = "bereich" | "abschnitt" | "unterabschnitt" | "punkt";

export type OpenPoint = Stamped & {
  id: string;
  siteId: string;
  parentId: string;
  type: PointType;
  title: string;
  note: string;
  status: WorkStatus;
  assigneeIds: string[];
  due: ISODate | "";
  order: number;
  files: FileRef[];
  doneBy?: string;
  doneAt?: string;
};

export type Priority = "hoch" | "mittel" | "niedrig";
export type DefectStatus = "offen" | "in_arbeit" | "behoben" | "abgenommen";

export type Defect = Stamped & {
  id: string;
  siteId: string;
  /** running number per site: M-001 */
  no: number;
  /** checklist point it came from */
  pointId: string;
  title: string;
  description: string;
  location: string;
  status: DefectStatus;
  priority: Priority;
  ownerId: string;
  due: ISODate | "";
  files: FileRef[];
  fixedBy?: string;
  fixedAt?: string;
};

export type Task = Stamped & {
  id: string;
  /** "" = not tied to a site */
  siteId: string;
  title: string;
  note: string;
  /** who does it */
  ownerId: string;
  status: WorkStatus;
  priority: Priority;
  due: ISODate | "";
  doneAt?: string;
};

/** A bar or a symbol in the calendar (Gantt), in half days. */
export type CalendarEntry = Stamped & {
  id: string;
  siteId: string;
  /** row: a person or a free row */
  rowId: string;
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

export type AbsenceType = "urlaub" | "krank" | "za" | "schulung";
export type Absence = { id: string; personId: string; type: AbsenceType; start: ISODate; end: ISODate; note: string };

/** Rows, groups and order of the calendar board. */
export type CalendarLayout = {
  groups?: { id: string; name: string }[];
  memberGroup?: Record<string, string>;
  /** free rows: crane, delivery, subcontractor without account */
  rows?: { id: string; name: string }[];
  rowOrder?: string[];
  rowStatus?: Record<string, string>;
};

export type Note = Stamped & {
  id: string;
  /** "" = personal note */
  siteId: string;
  text: string;
  color: string;
  order: number;
};

export type MaterialItem = Stamped & {
  id: string;
  siteId: string;
  name: string;
  artNo: string;
  /** printed as Code128; scanning finds the item */
  barcode: string;
  qty: number;
  unit: string;
  minQty: number;
  supplier: string;
  ordered: boolean;
  orderedAt?: string;
  note: string;
};

export type Workspace = { id: string; name: string; address: string };

export type Data = {
  version: number;
  /** content version of the sample company – refreshed when it changes */
  demo?: number;
  workspace: Workspace;
  meId: string;
  people: Person[];
  sites: Site[];
  points: OpenPoint[];
  defects: Defect[];
  tasks: Task[];
  entries: CalendarEntry[];
  absences: Absence[];
  calendar: CalendarLayout;
  notes: Note[];
  materials: MaterialItem[];
};

export type Collection = "people" | "sites" | "points" | "defects" | "tasks" | "entries" | "absences" | "notes" | "materials";
export type Item<K extends Collection> = Data[K][number];

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

export type Employment = "vollzeit" | "teilzeit" | "lehrling" | "geringfuegig" | "leiharbeiter" | "subunternehmer";

export type Person = {
  id: string;
  /** shown everywhere: "Vorname Nachname" */
  name: string;
  /** e.g. Bauleiter, Monteur, Lehrling */
  role: string;
  phone: string;
  active: boolean;
  /* master data (Stammdaten) – all optional so older data keeps working */
  personnelNo?: string;
  firstName?: string;
  lastName?: string;
  /** own company or the subcontractor / temp agency */
  company?: string;
  email?: string;
  birthDate?: ISODate | "";
  /** Sozialversicherungsnummer (AT: 10 digits) */
  svNo?: string;
  street?: string;
  zip?: string;
  city?: string;
  entryDate?: ISODate | "";
  exitDate?: ISODate | "";
  employment?: Employment;
  weeklyHours?: number;
  trade?: string;
  qualifications?: string[];
  licenses?: string;
  emergencyName?: string;
  emergencyPhone?: string;
  note?: string;
  /** may approve reports (Teamleitung, Bauleitung) */
  lead?: boolean;
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
  /** photos of the defect */
  files: FileRef[];
  /** photos of the repair */
  fixFiles?: FileRef[];
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

/** One booking on an item: withdrawal, receipt, order, correction. */
export type StockMove = { id: string; at: string; by: string; kind: "entnahme" | "zugang" | "bestellung" | "korrektur"; qty: number; note?: string };

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
  /** quantity of the open order */
  orderedQty?: number;
  note: string;
  /** bookings, newest last */
  log?: StockMove[];
};

/** Company data for documents (§ 14 UGB: Firma, Rechtsform, Sitz, Firmenbuchnummer, Firmenbuchgericht). */
export type Workspace = {
  id: string;
  name: string;
  address: string;
  legalForm?: string;
  seat?: string;
  fbNo?: string;
  fbCourt?: string;
  uid?: string;
  phone?: string;
  email?: string;
  web?: string;
  /** optional modules switched on for this company */
  modules?: { service?: boolean };
  /** service orders per technician and day */
  maxPerDay?: number;
};

/* ------------------------------------------------------------------ Service */

export type Customer = Stamped & {
  id: string;
  no: string;
  name: string;
  contact: string;
  street: string;
  zip: string;
  city: string;
  phone: string;
  email: string;
  uid: string;
  note: string;
};

export type OrderStatus = "offen" | "geplant" | "in_arbeit" | "erledigt" | "freigegeben";

export type MaterialLine = { id: string; name: string; qty: number; unit: string; price?: number };
export type WorkLine = { id: string; personId: string; name: string; date: ISODate; from: string; to: string; pause: number; rate?: number };
export type DeviceLine = { id: string; name: string; hours: number; rate?: number };

/** A service order: customer, address, what to do, who does it on which day. */
export type ServiceOrder = Stamped & {
  id: string;
  no: string;
  customerId: string;
  /** where the work is – empty = customer address */
  street: string;
  zip: string;
  city: string;
  title: string;
  description: string;
  priority: Priority;
  techId: string;
  date: ISODate | "";
  /** order within the day */
  seq: number;
  status: OrderStatus;
  /** start/stop stamps of the technician */
  times: { from: string; to?: string }[];
  workDone: string;
  materials: MaterialLine[];
  files: FileRef[];
};

/* ------------------------------------------------------------------ Reports (Bautagesbericht, Regieschein, Servicebericht) */

export type ReportKind = "bautagesbericht" | "regie" | "service";
export type ReportStatus = "entwurf" | "unterschrieben" | "freigegeben" | "zurueck";

export type Signature = { name: string; png: string; at: string; place: string };

export type Report = Stamped & {
  id: string;
  kind: ReportKind;
  /** BTB-2026-001, RS-2026-001, SB-2026-001 */
  no: string;
  status: ReportStatus;
  /** a site report or a service report */
  siteId: string;
  orderId: string;
  customerId: string;
  date: ISODate;
  /** Regie: who ordered the extra work, and why */
  orderedBy: string;
  reason: string;
  /** what was done */
  text: string;
  workers: WorkLine[];
  materials: MaterialLine[];
  devices: DeviceLine[];
  withPrices: boolean;
  /* Bautagesbericht */
  weather: string;
  tempAm: string;
  tempPm: string;
  hindrances: string;
  instructions: string;
  visitors: string;
  deliveries: string;
  /* Übernahme (service) */
  accepted: "ohne" | "vorbehalt";
  reservation: string;
  files: FileRef[];
  signClient?: Signature;
  signContractor?: Signature;
  /** the frozen PDF (IndexedDB) */
  pdf?: FileRef;
  hash?: string;
  approvedBy?: string;
  approvedAt?: string;
  returnNote?: string;
};

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
  customers: Customer[];
  orders: ServiceOrder[];
  reports: Report[];
};

export type Collection = "people" | "sites" | "points" | "defects" | "tasks" | "entries" | "absences" | "notes" | "materials" | "customers" | "orders" | "reports";
export type Item<K extends Collection> = Data[K][number];

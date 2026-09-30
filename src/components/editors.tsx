"use client";

import { addDays, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { uid, useStore } from "@/lib/store";
import { levelName, nodeOptions, nodeStatus } from "@/lib/site";
import type { CollectionKey, Data, Item } from "@/lib/types";
import { EntityForm, Modal, type Field } from "./ui";

type EditorKind = "node" | "project" | "assignment" | "task" | "issue" | "material" | "report" | "employee" | "vehicle" | "equipment" | "absence";

export type EditorTarget = { kind: EditorKind; item?: Record<string, unknown> };

type Def = {
  collection: CollectionKey;
  noun: string;
  fields: (data: Data, values: Record<string, unknown>) => Field[];
  defaults: (data: Data) => Record<string, unknown>;
  validate?: (values: Record<string, unknown>) => string | null;
  describe: (values: Record<string, unknown>) => string;
};

const projectOptions = (data: Data) => data.projects.filter((p) => p.status !== "abgeschlossen").map((p) => ({ value: p.id, label: `${p.code} · ${p.name}` }));
const employeeOptions = (data: Data) => data.employees.filter((e) => e.active).map((e) => ({ value: e.id, label: e.name }));

const dateRange = (v: Record<string, unknown>) => (String(v.end) < String(v.start) ? "Das Ende darf nicht vor dem Start liegen." : null);

const defs: Record<EditorKind, Def> = {
  node: {
    collection: "siteNodes",
    noun: "Bereich / Punkt",
    fields: (data, v) => [
      { key: "title", label: "Bezeichnung", required: true, full: true },
      { key: "parentId", label: "Gehört zu", type: "select", options: nodeOptions(data.siteNodes, String(v.projectId), v.id ? String(v.id) : undefined), full: true },
      { key: "status", label: "Status", type: "select", options: L.options(nodeStatus), required: true },
      { key: "assigneeId", label: "Zuständig", type: "select", options: employeeOptions(data) },
      { key: "due", label: "Fällig am", type: "date" },
      { key: "description", label: "Beschreibung", type: "textarea" }
    ],
    defaults: (data) => ({ projectId: data.projects[0]?.id ?? "", parentId: "", title: "", description: "", status: "offen", assigneeId: "", due: "", order: Date.now() }),
    describe: (v) => `${v.parentId ? "Punkt" : levelName(0)} ${v.title}`
  },
  project: {
    collection: "projects",
    noun: "Projekt",
    fields: (data) => [
      { key: "code", label: "Projektnummer", required: true },
      { key: "name", label: "Bezeichnung", required: true },
      { key: "client", label: "Auftraggeber" },
      { key: "location", label: "Ort" },
      { key: "status", label: "Status", type: "select", options: L.options(L.projectStatus), required: true },
      { key: "managerId", label: "Projektleitung", type: "select", options: employeeOptions(data) },
      { key: "siteManagerId", label: "Bauleitung", type: "select", options: employeeOptions(data) },
      { key: "start", label: "Start", type: "date", required: true },
      { key: "end", label: "Ende", type: "date", required: true },
      { key: "budget", label: "Budget (€)", type: "number", min: 0 },
      { key: "color", label: "Farbe", type: "color", options: L.projectColors.map((c) => ({ value: c, label: c })) },
      { key: "description", label: "Beschreibung", type: "textarea" }
    ],
    defaults: (data) => ({
      code: `P-${new Date().getFullYear().toString().slice(2)}${String(data.projects.length + 1).padStart(2, "0")}`,
      name: "",
      client: "",
      location: "",
      status: "planung",
      managerId: data.currentUserId,
      siteManagerId: "",
      start: today(),
      end: addDays(today(), 30),
      budget: 0,
      color: L.projectColors[data.projects.length % L.projectColors.length],
      description: ""
    }),
    validate: dateRange,
    describe: (v) => `Projekt ${v.name}`
  },
  assignment: {
    collection: "assignments",
    noun: "Einplanung",
    fields: (data, v) => {
      const resources =
        v.resourceType === "vehicle"
          ? data.vehicles.map((x) => ({ value: x.id, label: `${x.name} · ${x.plate}` }))
          : v.resourceType === "equipment"
            ? data.equipment.map((x) => ({ value: x.id, label: x.name }))
            : employeeOptions(data);
      return [
        { key: "resourceType", label: "Art", type: "select", options: L.options(L.resourceType), required: true },
        { key: "resourceId", label: "Ressource", type: "select", options: resources, required: true },
        { key: "projectId", label: "Projekt", type: "select", options: projectOptions(data), required: true, full: true },
        { key: "start", label: "Von", type: "date", required: true },
        { key: "end", label: "Bis", type: "date", required: true },
        { key: "note", label: "Notiz", full: true }
      ];
    },
    defaults: (data) => ({ resourceType: "employee", resourceId: data.employees[0]?.id ?? "", projectId: data.projects[0]?.id ?? "", start: today(), end: addDays(today(), 4), note: "" }),
    validate: dateRange,
    describe: () => "Einplanung"
  },
  task: {
    collection: "tasks",
    noun: "Vorgang",
    fields: (data, v) => [
      { key: "title", label: "Bezeichnung", required: true, full: true },
      { key: "projectId", label: "Projekt", type: "select", options: projectOptions(data), required: true },
      { key: "phase", label: "Phase / Gewerk" },
      { key: "start", label: "Start", type: "date", required: true },
      { key: "end", label: "Ende", type: "date", required: true },
      { key: "status", label: "Status", type: "select", options: L.options(L.taskStatus), required: true },
      { key: "assigneeId", label: "Verantwortlich", type: "select", options: employeeOptions(data) },
      {
        key: "dependsOn",
        label: "Nachfolger von",
        type: "select",
        options: data.tasks.filter((t) => t.projectId === v.projectId && t.id !== v.id).map((t) => ({ value: t.id, label: t.title }))
      },
      { key: "milestone", label: "Meilenstein", type: "checkbox", placeholder: "Als Meilenstein anzeigen" },
      { key: "progress", label: "Fortschritt", type: "range", full: true }
    ],
    defaults: (data) => ({ title: "", projectId: data.projects[0]?.id ?? "", phase: "", start: today(), end: addDays(today(), 5), progress: 0, status: "offen", assigneeId: "", dependsOn: "", milestone: false }),
    validate: dateRange,
    describe: (v) => `Vorgang ${v.title}`
  },
  issue: {
    collection: "issues",
    noun: "Mangel",
    fields: (data, v) => [
      { key: "kind", label: "Art", type: "select", options: L.options(L.issueKind), required: true },
      { key: "severity", label: "Priorität", type: "select", options: L.options(L.severity), required: true },
      { key: "title", label: "Titel", required: true, full: true },
      { key: "projectId", label: "Projekt", type: "select", options: projectOptions(data), required: true },
      { key: "nodeId", label: "Bereich", type: "select", options: nodeOptions(data.siteNodes, String(v.projectId)) },
      { key: "location", label: "Ort / Bauteil" },
      { key: "assigneeId", label: "Zuständig", type: "select", options: employeeOptions(data) },
      { key: "due", label: "Frist", type: "date" },
      { key: "status", label: "Status", type: "select", options: L.options(L.issueStatus), required: true },
      { key: "description", label: "Beschreibung", type: "textarea" },
      { key: "photo", label: "Foto", type: "image" }
    ],
    defaults: (data) => ({ kind: "mangel", severity: "mittel", title: "", projectId: data.projects[0]?.id ?? "", nodeId: "", location: "", assigneeId: "", due: addDays(today(), 3), status: "offen", description: "", photo: "", createdAt: today() }),
    describe: (v) => `${L.issueKind[v.kind as keyof typeof L.issueKind]?.label ?? "Meldung"} ${v.title}`
  },
  material: {
    collection: "materials",
    noun: "Material",
    fields: (data) => [
      { key: "name", label: "Material", required: true, full: true },
      { key: "projectId", label: "Projekt", type: "select", options: projectOptions(data), required: true },
      { key: "unit", label: "Einheit", required: true },
      { key: "planned", label: "Menge geplant", type: "number", min: 0 },
      { key: "delivered", label: "Geliefert", type: "number", min: 0 },
      { key: "used", label: "Verbaut", type: "number", min: 0 },
      { key: "unitPrice", label: "Einzelpreis (€)", type: "number", min: 0 },
      { key: "supplier", label: "Lieferant" },
      { key: "deliveryDate", label: "Liefertermin", type: "date" },
      { key: "status", label: "Status", type: "select", options: L.options(L.materialStatus), required: true }
    ],
    defaults: (data) => ({ name: "", projectId: data.projects[0]?.id ?? "", unit: "Stk", planned: 0, delivered: 0, used: 0, unitPrice: 0, supplier: "", deliveryDate: addDays(today(), 7), status: "geplant" }),
    validate: (v) => (Number(v.used) > Number(v.delivered) ? "Es kann nicht mehr verbaut als geliefert sein." : null),
    describe: (v) => `Material ${v.name}`
  },
  report: {
    collection: "reports",
    noun: "Tagesbericht",
    fields: (data) => [
      { key: "projectId", label: "Projekt", type: "select", options: projectOptions(data), required: true },
      { key: "date", label: "Datum", type: "date", required: true },
      { key: "weather", label: "Wetter", type: "select", options: L.options(L.weather), required: true },
      { key: "temperature", label: "Temperatur (°C)", type: "number" },
      { key: "crew", label: "Personal vor Ort", type: "number", min: 0 },
      { key: "hours", label: "Arbeitsstunden gesamt", type: "number", min: 0 },
      { key: "authorId", label: "Erstellt von", type: "select", options: employeeOptions(data) },
      { key: "work", label: "Ausgeführte Arbeiten", type: "textarea", required: true },
      { key: "incidents", label: "Besondere Vorkommnisse / Behinderungen", type: "textarea" }
    ],
    defaults: (data) => ({ projectId: data.projects[0]?.id ?? "", date: today(), weather: "sonnig", temperature: 15, crew: 0, hours: 0, authorId: data.employees[0]?.id ?? "", work: "", incidents: "" }),
    describe: () => "Tagesbericht"
  },
  employee: {
    collection: "employees",
    noun: "Mitarbeiter",
    fields: () => [
      { key: "name", label: "Name", required: true },
      { key: "role", label: "Funktion" },
      { key: "department", label: "Abteilung" },
      { key: "team", label: "Team / Partie" },
      { key: "hourlyRate", label: "Stundensatz (€)", type: "number", min: 0 },
      { key: "phone", label: "Telefon", type: "tel" },
      { key: "email", label: "E-Mail", type: "email" },
      { key: "qualificationsText", label: "Qualifikationen (je Zeile: Name; gültig bis JJJJ-MM-TT)", type: "textarea", placeholder: "SCC**; 2027-05-31" },
      { key: "active", label: "Status", type: "checkbox", placeholder: "Aktiv (planbar)" }
    ],
    defaults: () => ({ name: "", role: "", department: "", team: "", hourlyRate: 0, phone: "", email: "", qualificationsText: "", qualifications: [], active: true }),
    describe: (v) => `Mitarbeiter ${v.name}`
  },
  vehicle: {
    collection: "vehicles",
    noun: "Fahrzeug",
    fields: () => [
      { key: "name", label: "Modell", required: true },
      { key: "plate", label: "Kennzeichen", required: true },
      { key: "type", label: "Typ" },
      { key: "seats", label: "Sitzplätze", type: "number", min: 1 },
      { key: "nextService", label: "Nächstes Service / Pickerl", type: "date" },
      { key: "status", label: "Status", type: "select", options: L.options(L.vehicleStatus), required: true }
    ],
    defaults: () => ({ name: "", plate: "", type: "Transporter", seats: 3, nextService: addDays(today(), 180), status: "verfuegbar" }),
    describe: (v) => `Fahrzeug ${v.plate}`
  },
  equipment: {
    collection: "equipment",
    noun: "Gerät",
    fields: () => [
      { key: "name", label: "Bezeichnung", required: true },
      { key: "category", label: "Kategorie" },
      { key: "serial", label: "Inventar-/Seriennummer" },
      { key: "nextInspection", label: "Nächste Prüfung", type: "date" },
      { key: "status", label: "Status", type: "select", options: L.options(L.equipmentStatus), required: true }
    ],
    defaults: () => ({ name: "", category: "", serial: "", nextInspection: addDays(today(), 365), status: "verfuegbar" }),
    describe: (v) => `Gerät ${v.name}`
  },
  absence: {
    collection: "absences",
    noun: "Abwesenheit",
    fields: (data) => [
      { key: "employeeId", label: "Mitarbeiter", type: "select", options: employeeOptions(data), required: true },
      { key: "type", label: "Art", type: "select", options: L.options(L.absenceType), required: true },
      { key: "start", label: "Von", type: "date", required: true },
      { key: "end", label: "Bis", type: "date", required: true },
      { key: "note", label: "Notiz", full: true }
    ],
    defaults: (data) => ({ employeeId: data.employees[0]?.id ?? "", type: "urlaub", start: today(), end: addDays(today(), 4), note: "" }),
    validate: dateRange,
    describe: () => "Abwesenheit"
  }
};

function toQualText(v: Record<string, unknown>) {
  const q = (v.qualifications as { name: string; validUntil: string }[] | undefined) ?? [];
  return q.map((x) => `${x.name}; ${x.validUntil}`).join("\n");
}

function fromQualText(text: string) {
  return text
    .split("\n")
    .map((line) => line.split(";").map((s) => s.trim()))
    .filter(([name]) => name)
    .map(([name, validUntil]) => ({ name, validUntil: /^\d{4}-\d{2}-\d{2}$/.test(validUntil ?? "") ? validUntil : "" }));
}

export function Editor({ target, onClose }: { target: EditorTarget; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const def = defs[target.kind];
  const isNew = !target.item?.id;
  let initial = { ...def.defaults(data), ...target.item };
  if (target.kind === "employee") initial = { ...initial, qualificationsText: toQualText(initial) };

  return (
    <Modal title={`${def.noun} ${isNew ? "anlegen" : "bearbeiten"}`} onClose={onClose}>
      <EntityForm
        fields={(values) => def.fields(data, values)}
        initial={initial}
        validate={def.validate}
        onCancel={onClose}
        onDelete={
          isNew
            ? undefined
            : () => {
                remove(def.collection, String(target.item?.id), `${def.describe(initial)} gelöscht`);
                notify(`${def.noun} gelöscht`);
                onClose();
              }
        }
        onSubmit={(values) => {
          let item: Record<string, unknown> = { ...values, id: values.id ?? uid(def.collection.slice(0, 2)) };
          if (target.kind === "employee") {
            item.qualifications = fromQualText(String(values.qualificationsText ?? ""));
            delete item.qualificationsText;
          }
          if (target.kind === "task" && values.status === "erledigt") item = { ...item, progress: 100 };
          save(def.collection, item as Item<typeof def.collection>, `${def.describe(values)} ${isNew ? "angelegt" : "aktualisiert"}`);
          notify(`${def.noun} gespeichert`);
          onClose();
        }}
      />
    </Modal>
  );
}

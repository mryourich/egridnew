"use client";

import { addDays, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { canDelete, plannable, roleOf, uid, useStore, type Role } from "@/lib/store";
import { levelName, nodeOptions, nodeStatus } from "@/lib/site";
import type { CollectionKey, Data, Issue, Item } from "@/lib/types";
import { IssueSheet } from "./issue-sheet";
import { EntityForm, Modal, type Field } from "./ui";

type EditorKind = "node" | "project" | "assignment" | "issue" | "report" | "employee" | "absence";

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
/** People who can be put on a site. */
const employeeOptions = (data: Data) => plannable(data).map((e) => ({ value: e.id, label: e.name }));
const roleOptions = (data: Data, roles: Role[]) => data.employees.filter((e) => e.active && roles.includes(roleOf(e))).map((e) => ({ value: e.id, label: e.name }));

const dateRange = (v: Record<string, unknown>) => (String(v.end) < String(v.start) ? "Das Ende darf nicht vor dem Start liegen." : null);

const defs: Record<Exclude<EditorKind, "issue">, Def> = {
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
    noun: "Baustelle",
    fields: (data) => [
      { key: "name", label: "Bezeichnung", required: true, full: true, placeholder: "z. B. Tunnel Nord – Elektroinstallation" },
      { key: "code", label: "Baustellen-Nr.", required: true },
      { key: "status", label: "Status", type: "select", options: L.options(L.projectStatus), required: true },
      { key: "client", label: "Auftraggeber" },
      { key: "location", label: "Ort / Adresse" },
      { key: "siteManagerId", label: "Bauleitung", type: "select", options: roleOptions(data, ["bl", "pl"]), required: true },
      { key: "color", label: "Farbe", type: "color", options: L.projectColors.map((c) => ({ value: c, label: c })) },
      { key: "start", label: "Beginn", type: "date", required: true },
      { key: "end", label: "Ende", type: "date", required: true },
      { key: "description", label: "Beschreibung", type: "textarea" }
    ],
    defaults: (data) => ({
      code: `B-${new Date().getFullYear().toString().slice(2)}${String(data.projects.length + 1).padStart(2, "0")}`,
      name: "",
      client: "",
      location: "",
      status: "aktiv",
      managerId: "",
      siteManagerId: data.currentUserId,
      start: today(),
      end: addDays(today(), 60),
      budget: 0,
      color: L.projectColors[data.projects.length % L.projectColors.length],
      description: ""
    }),
    validate: dateRange,
    describe: (v) => `Baustelle ${v.name}`
  },
  assignment: {
    collection: "assignments",
    noun: "Einteilung",
    fields: (data) => [
      { key: "resourceId", label: "Mitarbeiter", type: "select", options: employeeOptions(data), required: true, full: true },
      { key: "projectId", label: "Baustelle", type: "select", options: projectOptions(data), required: true, full: true },
      { key: "start", label: "Von", type: "date", required: true },
      { key: "end", label: "Bis", type: "date", required: true },
      { key: "note", label: "Notiz", full: true }
    ],
    defaults: (data) => ({ resourceType: "employee", resourceId: plannable(data)[0]?.id ?? "", projectId: data.projects.find((p) => p.status !== "abgeschlossen")?.id ?? "", start: today(), end: addDays(today(), 4), note: "" }),
    validate: dateRange,
    describe: () => "Einteilung"
  },
  report: {
    collection: "reports",
    noun: "Tagesbericht",
    fields: (data) => [
      { key: "projectId", label: "Projekt", type: "select", options: projectOptions(data), required: true, full: true },
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
      {
        key: "access",
        label: "Rechte in VYSNpro",
        type: "select",
        required: true,
        options: [
          { value: "monteur", label: "Monteur – erfassen und abhaken, nichts löschen" },
          { value: "bl", label: "Bauleitung – alles verwalten" }
        ]
      },
      { key: "role", label: "Funktion (Text)", placeholder: "z. B. Elektrotechniker" },
      { key: "department", label: "Abteilung", placeholder: "z. B. Montage" },
      { key: "team", label: "Partie", placeholder: "z. B. Partie A" },
      { key: "phone", label: "Telefon", type: "tel" },
      { key: "email", label: "E-Mail", type: "email" },
      { key: "qualificationsText", label: "Qualifikationen (je Zeile: Name; gültig bis JJJJ-MM-TT)", type: "textarea", placeholder: "SCC**; 2027-05-31" },
      { key: "active", label: "Status", type: "checkbox", placeholder: "Aktiv (kann eingeteilt werden)" }
    ],
    defaults: () => ({ name: "", access: "monteur", role: "", department: "", team: "", hourlyRate: 0, phone: "", email: "", qualificationsText: "", qualifications: [], active: true }),
    describe: (v) => `Mitarbeiter ${v.name}`
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
  if (target.kind === "issue") return <IssueSheet issue={(target.item ?? {}) as Partial<Issue>} onClose={onClose} />;
  return <GenericEditor target={target as EditorTarget & { kind: keyof typeof defs }} onClose={onClose} />;
}

function GenericEditor({ target, onClose }: { target: EditorTarget & { kind: keyof typeof defs }; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const def = defs[target.kind];
  const isNew = !target.item?.id;
  let initial = { ...def.defaults(data), ...target.item };
  if (target.kind === "employee") initial = { ...initial, qualificationsText: toQualText(initial), access: target.item?.id ? roleOf(target.item as { role: string; access?: Role }) : initial.access };

  return (
    <Modal title={`${def.noun} ${isNew ? "anlegen" : "bearbeiten"}`} onClose={onClose}>
      <EntityForm
        fields={(values) => def.fields(data, values)}
        initial={initial}
        validate={def.validate}
        onCancel={onClose}
        onDelete={
          isNew || !canDelete(data)
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
          save(def.collection, item as Item<typeof def.collection>, `${def.describe(values)} ${isNew ? "angelegt" : "aktualisiert"}`);
          notify(`${def.noun} gespeichert`);
          onClose();
        }}
      />
    </Modal>
  );
}

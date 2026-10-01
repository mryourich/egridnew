"use client";

import { addDays, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { canDelete, plannable, roleOf, uid, useStore, type Role } from "@/lib/store";
import { levelName, nodeOptions, nodeStatus } from "@/lib/site";
import type { CollectionKey, DailyReport, Data, Issue, Item } from "@/lib/types";
import { projectFolders } from "@/lib/seed";
import { IssueSheet } from "./issue-sheet";
import { ReportSheet } from "./report-sheet";
import { EntityForm, Modal, type Field } from "./ui";

type EditorKind = "node" | "project" | "issue" | "report" | "employee" | "absence";

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

const defs: Record<Exclude<EditorKind, "issue" | "report">, Def> = {
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
      { key: "name", label: "Bezeichnung", required: true, full: true, placeholder: "z. B. Tunnel Nord – Elektroinstallation" },
      { key: "code", label: "Projekt-Nr.", required: true },
      { key: "status", label: "Status", type: "select", options: L.options(L.projectStatus), required: true },
      { key: "client", label: "Auftraggeber" },
      { key: "location", label: "Ort / Adresse" },
      { key: "managerId", label: "Projektleitung", type: "select", options: roleOptions(data, ["pl"]) },
      { key: "siteManagerId", label: "Bauleitung", type: "select", options: roleOptions(data, ["bl", "pl"]) },
      { key: "start", label: "Beginn", type: "date", required: true },
      { key: "end", label: "Ende", type: "date", required: true },
      { key: "color", label: "Farbe", type: "color", options: L.projectColors.map((c) => ({ value: c, label: c })), full: true },
      { key: "image", label: "Bild (z. B. Logo des Kunden)", type: "image", full: true },
      { key: "description", label: "Beschreibung", type: "textarea" }
    ],
    defaults: (data) => {
      const me = data.employees.find((e) => e.id === data.currentUserId);
      const role = me ? roleOf(me) : "bl";
      return {
        code: `P-${new Date().getFullYear().toString().slice(2)}${String(data.projects.length + 1).padStart(2, "0")}`,
        name: "",
        client: "",
        location: "",
        status: "aktiv",
        managerId: role === "pl" ? data.currentUserId : "",
        siteManagerId: role === "bl" ? data.currentUserId : "",
        start: today(),
        end: addDays(today(), 60),
        color: L.projectColors[data.projects.length % L.projectColors.length],
        image: "",
        description: "",
        createdBy: data.currentUserId,
        members: []
      };
    },
    validate: dateRange,
    describe: (v) => `Projekt ${v.name}`
  },
  employee: {
    collection: "employees",
    noun: "Mitarbeiter",
    fields: () => [
      { key: "name", label: "Name", required: true },
      {
        key: "access",
        label: "Rechte in VYSNERTECH",
        type: "select",
        required: true,
        options: [
          { value: "monteur", label: "Monteur – erfassen und abhaken, nichts löschen" },
          { value: "mk", label: "Montagekoordination – Projekte anlegen und verwalten" },
          { value: "bl", label: "Bauleitung – Projekte anlegen und verwalten" },
          { value: "pl", label: "Projektleitung – Projekte anlegen und verwalten" }
        ]
      },
      { key: "role", label: "Funktion (Text)", placeholder: "z. B. Elektrotechniker" },
      { key: "department", label: "Abteilung", placeholder: "z. B. Montage" },
      { key: "team", label: "Partie", placeholder: "z. B. Partie A" },
      { key: "phone", label: "Telefon", type: "tel" },
      { key: "email", label: "E-Mail", type: "email" },
      { key: "qualificationsText", label: "Qualifikationen (je Zeile: Name; gültig bis JJJJ-MM-TT)", type: "textarea", placeholder: "SCC**; 2027-05-31" },
      { key: "active", label: "Status", type: "checkbox", placeholder: "Aktiv (kann eingeladen werden)" },
      { key: "photo", label: "Profilbild", type: "image", full: true }
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
  if (target.kind === "report") return <ReportSheet report={(target.item ?? {}) as Partial<DailyReport>} onClose={onClose} />;
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
          // a new project gets its document folders right away
          if (target.kind === "project" && isNew) for (const f of projectFolders(String(item.id))) save("folders", f);
          notify(`${def.noun} gespeichert`);
          onClose();
        }}
      />
    </Modal>
  );
}

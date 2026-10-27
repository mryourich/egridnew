"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, today } from "@/core/date";
import { fmtDate, fmtMoney, PROJECT_STATUS } from "@/core/format";
import { byRole, FIELD, rightsOf } from "@/core/roles";
import { uid, useStore } from "@/core/store";
import type { Project, ProjectStatus } from "@/core/types";
import { Avatar, Bar, Button, Empty, Field, Modal, PageHead, SearchBox, Seg, Tag } from "@/core/ui";
import { PROJECT_COLORS, projectFacts, visibleProjects } from "./model";

type Filter = "alle" | ProjectStatus;

/** TeamGrid start: every project the person sees, one line each. */
export function ProjectList() {
  const { data } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const all = visibleProjects(data, archived);
  const term = q.trim().toLowerCase();
  const list = all.filter((p) => (filter === "alle" || p.status === filter) && (!term || `${p.name} ${p.number} ${p.client} ${p.location}`.toLowerCase().includes(term)));
  const count = (s: Filter) => (s === "alle" ? all.length : all.filter((p) => p.status === s).length);
  const create = rightsOf(data).create;
  const t = today();

  return (
    <div className="page">
      <PageHead kicker="TeamGrid" title="Projekte" sub={`${all.length} ${archived ? "archivierte" : "laufende"} ${all.length === 1 ? "Projekt" : "Projekte"}`}>
        {create && (
          <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>
            Neues Projekt
          </Button>
        )}
      </PageHead>

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Projekt, Nummer, Auftraggeber…" />
        {!archived && (
          <Seg<Filter>
            value={filter}
            onChange={setFilter}
            options={(["alle", "active", "planning", "handover", "paused"] as Filter[]).map((s) => ({ value: s, label: <>{s === "alle" ? "Alle" : PROJECT_STATUS[s].label} <small>{count(s)}</small></> }))}
          />
        )}
        <span className="grow" />
        <button type="button" className="link" onClick={() => (setArchived((a) => !a), setFilter("alle"))}>
          {archived ? "Laufende Projekte" : "Archiv"}
        </button>
      </div>

      {list.length === 0 ? (
        <Empty
          title={all.length ? "Kein Projekt passt zur Suche." : archived ? "Nichts im Archiv." : "Noch keine Projekte."}
          action={create && !all.length && !archived ? <Button variant="primary" icon={<Plus size={16} />} onClick={() => setCreating(true)}>Erstes Projekt anlegen</Button> : undefined}
        >
          {!all.length && !archived && !create ? "Sobald dich jemand in ein Projekt einlädt, erscheint es hier." : undefined}
        </Empty>
      ) : (
        <div className="panel">
          <table className="table rows-click">
            <thead>
              <tr>
                <th>Projekt</th>
                <th className="hide-md">Ort</th>
                <th>Status</th>
                <th className="w-progress">Fortschritt</th>
                <th className="num">Offene Punkte</th>
                <th className="num">Mängel</th>
                <th className="hide-sm">Fertig bis</th>
                <th className="hide-md">Projektleitung</th>
              </tr>
            </thead>
            <tbody>
              {list.map((p) => {
                const f = projectFacts(data, p);
                return (
                  <tr key={p.id} onClick={() => router.push(`/projekte/${p.id}`)} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && router.push(`/projekte/${p.id}`)}>
                    <td>
                      <span className="proj-cell">
                        <i style={{ background: p.color }} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>{[p.number, p.client].filter(Boolean).join(" · ") || "–"}</small>
                        </span>
                      </span>
                    </td>
                    <td className="hide-md">{p.location || "–"}</td>
                    <td>
                      <Tag tone={PROJECT_STATUS[p.status].tone} dot>
                        {PROJECT_STATUS[p.status].label}
                      </Tag>
                    </td>
                    <td className="w-progress">
                      <span className="progress-cell">
                        <Bar value={f.progress} />
                        <b>{f.progress} %</b>
                      </span>
                    </td>
                    <td className="num">
                      {f.open.length}
                      {f.late.length > 0 && <small className="bad"> · {f.late.length} überfällig</small>}
                    </td>
                    <td className="num">
                      <span className={f.urgent.length ? "bad strong" : ""}>{f.openDefects.length || "–"}</span>
                    </td>
                    <td className={`hide-sm ${p.due && p.due < t && p.status !== "archived" ? "bad" : ""}`}>{fmtDate(p.due) || "–"}</td>
                    <td className="hide-md">
                      {p.managerId ? (
                        <span className="who">
                          <Avatar id={p.managerId} size={22} />
                          {data.people.find((x) => x.id === p.managerId)?.name}
                        </span>
                      ) : (
                        "–"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {creating && <ProjectForm onClose={() => setCreating(false)} onSaved={(p) => router.push(`/projekte/${p.id}`)} />}
    </div>
  );
}

/** Project data – for a new project and in the project settings. */
export function ProjectForm({ project, onClose, onSaved }: { project?: Project; onClose: () => void; onSaved?: (p: Project) => void }) {
  const { data, save, notify } = useStore();
  const isNew = !project;
  const t = today();
  const [v, setV] = useState({
    name: project?.name ?? "",
    number: project?.number ?? nextNumber(data.projects),
    client: project?.client ?? "",
    location: project?.location ?? "",
    status: project?.status ?? ("planning" as ProjectStatus),
    start: project?.start ?? t,
    due: project?.due ?? addDays(t, 60),
    managerId: project?.managerId ?? data.meId,
    budget: project?.budget == null ? "" : String(project.budget),
    description: project?.description ?? "",
    color: project?.color ?? PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length]
  });
  const set = <K extends keyof typeof v>(k: K, value: (typeof v)[K]) => setV((x) => ({ ...x, [k]: value }));
  const leads = data.people.filter((p) => p.active && !FIELD.includes(p.rolle) && p.rolle !== "gf").sort(byRole);

  const submit = () => {
    if (!v.name.trim()) return;
    const item: Project = {
      ...(project ?? { id: uid(), memberIds: [], settings: { photoRequired: false, defectApproval: true }, createdBy: data.meId, createdAt: new Date().toISOString() }),
      name: v.name.trim(),
      number: v.number.trim(),
      client: v.client.trim(),
      location: v.location.trim(),
      status: v.status,
      start: v.start,
      due: v.due < v.start ? v.start : v.due,
      managerId: v.managerId,
      budget: v.budget.trim() ? Number(v.budget.replace(/[^\d,.-]/g, "").replace(",", ".")) || null : null,
      description: v.description.trim(),
      color: v.color
    };
    save("projects", item, isNew ? `Projekt „${item.name}“ angelegt` : "Projektdaten geändert");
    notify(isNew ? "Projekt angelegt – nur du und die Projektleitung sehen es, bis du Leute einlädst." : "Gespeichert");
    onClose();
    onSaved?.(item);
  };

  return (
    <Modal
      kicker={isNew ? "TeamGrid" : "Projekt"}
      title={isNew ? "Neues Projekt" : "Projektdaten"}
      onClose={onClose}
      wide
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={submit} disabled={!v.name.trim()}>
            {isNew ? "Projekt anlegen" : "Speichern"}
          </Button>
        </>
      }
    >
      <form className="form-grid" onSubmit={(e) => (e.preventDefault(), submit())}>
        <Field label="Projektname *" className="span-2">
          <input autoFocus value={v.name} onChange={(e) => set("name", e.target.value)} placeholder="z. B. Wohnanlage Linz Süd – Elektro" />
        </Field>
        <Field label="Projektnummer">
          <input value={v.number} onChange={(e) => set("number", e.target.value)} />
        </Field>
        <Field label="Status">
          <select value={v.status} onChange={(e) => set("status", e.target.value as ProjectStatus)}>
            {(Object.keys(PROJECT_STATUS) as ProjectStatus[]).map((s) => (
              <option key={s} value={s}>
                {PROJECT_STATUS[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Auftraggeber">
          <input value={v.client} onChange={(e) => set("client", e.target.value)} placeholder="Firma oder Name" />
        </Field>
        <Field label="Ort / Adresse">
          <input value={v.location} onChange={(e) => set("location", e.target.value)} placeholder="Straße, Ort" />
        </Field>
        <Field label="Start">
          <input type="date" value={v.start} onChange={(e) => set("start", e.target.value)} />
        </Field>
        <Field label="Fertig bis">
          <input type="date" value={v.due} min={v.start} onChange={(e) => set("due", e.target.value)} />
        </Field>
        <Field label="Projektleitung">
          <select value={v.managerId} onChange={(e) => set("managerId", e.target.value)}>
            <option value="">– noch offen –</option>
            {leads.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} · {p.title}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Budget (€)" hint={v.budget && fmtMoney(Number(v.budget.replace(",", ".")) || 0)}>
          <input inputMode="decimal" value={v.budget} onChange={(e) => set("budget", e.target.value)} placeholder="optional" />
        </Field>
        <Field label="Beschreibung" className="span-2">
          <textarea rows={3} value={v.description} onChange={(e) => set("description", e.target.value)} placeholder="Umfang, Besonderheiten, Zugang …" />
        </Field>
        <div className="b-field span-2">
          <span className="b-label">Farbe</span>
          <div className="swatches">
            {PROJECT_COLORS.map((c) => (
              <button key={c} type="button" style={{ background: c }} className={v.color === c ? "on" : ""} onClick={() => set("color", c)} aria-label={`Farbe ${c}`} />
            ))}
          </div>
        </div>
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}

function nextNumber(projects: Project[]) {
  const y = String(new Date().getFullYear()).slice(2);
  const n = projects.filter((p) => p.number.startsWith(`P-${y}`)).length + 1;
  return `P-${y}${String(n).padStart(2, "0")}`;
}

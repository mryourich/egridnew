"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, today } from "@/core/date";
import { readAttachment } from "@/core/files";
import { fmtMoney, fmtShort, PROJECT_STATUS } from "@/core/format";
import { byRole, FIELD, rightsOf } from "@/core/roles";
import { uid, useStore } from "@/core/store";
import type { Data, Project, ProjectStatus } from "@/core/types";
import { Bar, Button, Empty, Field, Modal, PageHead, People, SearchBox, Seg, Tag } from "@/core/ui";
import { PROJECT_COLORS, projectFacts, visibleProjects } from "./model";
import { slotOf } from "./plan-kit";

/** Planned on the project that day (morning or afternoon). */
const plannedHere = (data: Data, id: string, projectId: string, day: string) =>
  [false, true].some((pm) => {
    const s = slotOf(data, id, day, pm);
    return s.kind === "job" && s.job.projectId === projectId;
  });

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
        <div className="proj-grid">
          {list.map((p) => {
            const f = projectFacts(data, p);
            const here = f.team.filter((id) => plannedHere(data, id, p.id, t));
            return (
              <Link key={p.id} href={`/projekte/${p.id}`} className="proj-card" style={{ "--c": p.color } as React.CSSProperties}>
                <div className="pc-top">
                  <span className="pc-title">
                    <strong>{p.name}</strong>
                    <small>{[p.client, p.location].filter(Boolean).join(" · ") || "–"}</small>
                  </span>
                  <Tag tone={PROJECT_STATUS[p.status].tone}>{PROJECT_STATUS[p.status].label}</Tag>
                </div>
                <div className="pc-progress">
                  <span>
                    Fortschritt <b>{f.progress} %</b>
                  </span>
                  <Bar value={f.progress} />
                </div>
                <div className="pc-facts">
                  <div className={f.openDefects.length ? "bad" : ""}>
                    <b>{f.openDefects.length}</b>
                    <span>{f.openDefects.length === 1 ? "offener Mangel" : "offene Mängel"}</span>
                    {f.urgent.length > 0 && <em>{f.urgent.length} dringend</em>}
                  </div>
                  <div>
                    <b>{f.open.length}</b>
                    <span>offene Punkte</span>
                    {f.late.length > 0 && <em>{f.late.length} überfällig</em>}
                  </div>
                  <div className={f.overdue ? "bad" : ""}>
                    <b>{p.due ? fmtShort(p.due) : "–"}</b>
                    <span>{f.overdue ? "Termin überschritten" : "fertig bis"}</span>
                  </div>
                </div>
                <div className="pc-foot">
                  <People ids={here.length ? here : p.managerId ? [p.managerId] : []} max={5} />
                  <small>{here.length ? `${here.length} heute vor Ort` : p.managerId ? "Projektleitung" : ""}</small>
                  <span className="pc-no">{p.number}</span>
                </div>
              </Link>
            );
          })}
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
    color: project?.color ?? PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length],
    image: project?.image ?? "",
    contactId: project?.contactId ?? ""
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
      color: v.color,
      image: v.image || undefined,
      contactId: v.contactId || undefined
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
        <Field label="Auftraggeber" hint={data.contacts.length ? "Aus den Kunden wählen oder frei eintippen" : undefined}>
          <input
            list="project-clients"
            value={v.client}
            onChange={(e) => {
              const c = data.contacts.find((x) => x.name === e.target.value);
              setV((x) => ({ ...x, client: e.target.value, contactId: c?.id ?? "", location: x.location || (c ? c.address : "") }));
            }}
            placeholder="Firma oder Name"
          />
          <datalist id="project-clients">
            {data.contacts
              .filter((c) => c.status !== "lieferant")
              .map((c) => (
                <option key={c.id} value={c.name} />
              ))}
          </datalist>
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
        <div className="b-field span-2">
          <span className="b-label">Projektbild</span>
          <div className="proj-image-pick">
            {v.image ? <img src={v.image} alt="" /> : <span>Kein Bild</span>}
            <label className="b-btn default sm">
              Bild auswählen
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  e.target.value = "";
                  if (!f) return;
                  try {
                    set("image", (await readAttachment(f, data.meId)).url);
                  } catch (err) {
                    notify(err instanceof Error ? err.message : "Bild konnte nicht gelesen werden.");
                  }
                }}
              />
            </label>
            {v.image && (
              <button type="button" className="link" onClick={() => set("image", "")}>
                Entfernen
              </button>
            )}
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

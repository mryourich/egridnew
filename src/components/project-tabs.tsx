"use client";

import { AlertTriangle, CalendarDays, Camera, CheckCircle2, Clock, Download, FileText, Package, Plus, Printer, Trash2, TrendingUp, Upload, Users } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { addDays, diffDays, fmt, fmtShort, inRange, startOfWeek, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { employeeName, projectProgress, resourceName, uid, useStore } from "@/lib/store";
import type { Data, IssueKind, IssueStatus, Project, Task } from "@/lib/types";
import { Gantt } from "./gantt";
import { useEditor } from "./shell";
import { Avatar, Badge, Card, Dot, Empty, Kpi, Progress, SearchInput, Segmented } from "./ui";

type TabKey = "overview" | "schedule" | "tasks" | "issues" | "material" | "reports" | "team" | "documents";

const of = <T extends { projectId: string }>(list: T[], id: string) => list.filter((x) => x.projectId === id);

/* ---------------------------------------------------------------- Übersicht */

export function OverviewTab({ project, goTo }: { project: Project; goTo: (t: TabKey) => void }) {
  const { data } = useStore();
  const t = today();
  const progress = projectProgress(data, project.id);
  const elapsed = Math.max(0, Math.min(100, Math.round((diffDays(project.start, t) / Math.max(1, diffDays(project.start, project.end))) * 100)));
  const daysLeft = diffDays(t, project.end);
  const issues = of(data.issues, project.id);
  const open = issues.filter((i) => i.status !== "erledigt");
  const materials = of(data.materials, project.id);
  const materialCost = materials.reduce((s, m) => s + m.planned * m.unitPrice, 0);
  const reports = of(data.reports, project.id).sort((a, b) => b.date.localeCompare(a.date));
  const hours = reports.reduce((s, r) => s + r.hours, 0);
  const tasks = of(data.tasks, project.id);
  const milestones = tasks.filter((x) => x.milestone && x.status !== "erledigt").sort((a, b) => a.start.localeCompare(b.start));
  const late = tasks.filter((x) => !x.milestone && x.status !== "erledigt" && x.end < t);
  const onSiteToday = of(data.assignments, project.id).filter((a) => inRange(t, a.start, a.end));
  const activity = data.activity.filter((a) => a.projectId === project.id).slice(0, 8);
  const behind = progress + 10 < elapsed;

  return (
    <div className="stack">
      <div className="kpi-grid">
        <Kpi icon={TrendingUp} label="Fortschritt" value={`${progress} %`} hint={<span className={behind ? "text-red" : ""}>Zeit verstrichen: {elapsed} %</span>} tone={behind ? "red" : "green"} />
        <Kpi icon={CalendarDays} label="Restlaufzeit" value={daysLeft >= 0 ? `${daysLeft} Tage` : `${-daysLeft} Tage über`} hint={`Ende ${fmt(project.end)}`} tone={daysLeft < 0 ? "red" : daysLeft < 14 ? "amber" : "blue"} />
        <Kpi icon={AlertTriangle} label="Offene Meldungen" value={open.length} hint={`${open.filter((i) => i.severity === "kritisch" || i.severity === "hoch").length} mit hoher Priorität`} tone={open.length ? "amber" : "green"} />
        <Kpi icon={Clock} label="Stunden laut Tagesberichten" value={L.num(hours)} hint={`${reports.length} Berichte`} tone="violet" />
        <Kpi icon={Package} label="Materialkosten geplant" value={L.eur(materialCost)} hint={project.budget ? `${Math.round((materialCost / project.budget) * 100)} % vom Budget ${L.eur(project.budget)}` : "kein Budget"} tone="cyan" />
      </div>

      <div className="grid-2">
        <Card title="Heute vor Ort" actions={<button className="link-btn" onClick={() => goTo("team")} type="button">Team & Geräte</button>}>
          {onSiteToday.length ? (
            <ul className="compact-list">
              {onSiteToday.map((a) => (
                <li key={a.id}>
                  <span className="row-inline">
                    {a.resourceType === "employee" ? <Avatar name={resourceName(data, a.resourceType, a.resourceId)} size={22} /> : <Badge tone="gray">{L.resourceType[a.resourceType].label}</Badge>}
                    <strong>{resourceName(data, a.resourceType, a.resourceId)}</strong>
                    <span className="muted">bis {fmtShort(a.end)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Heute niemand eingeplant.</Empty>
          )}
        </Card>
        <Card title="Termine & Meilensteine" actions={<button className="link-btn" onClick={() => goTo("schedule")} type="button">Terminplan</button>}>
          <ul className="compact-list">
            {late.map((x) => (
              <li key={x.id}>
                <span className="row-inline">
                  <Badge tone="red">Verzug</Badge>
                  <strong>{x.title}</strong>
                  <span className="muted">fällig {fmt(x.end)}</span>
                </span>
              </li>
            ))}
            {milestones.map((m) => (
              <li key={m.id}>
                <span className="row-inline">
                  <span className="diamond" style={{ background: project.color }} />
                  <strong>{m.title}</strong>
                  <span className="muted">
                    {fmt(m.start)} · in {diffDays(t, m.start)} Tagen
                  </span>
                </span>
              </li>
            ))}
            {!late.length && !milestones.length && <Empty>Keine offenen Termine.</Empty>}
          </ul>
        </Card>
        <Card title="Offene Mängel & Meldungen" actions={<button className="link-btn" onClick={() => goTo("issues")} type="button">Alle</button>}>
          {open.length ? (
            <ul className="compact-list">
              {open.slice(0, 6).map((i) => (
                <li key={i.id}>
                  <span className="row-inline">
                    <Badge tone={L.issueKind[i.kind].tone}>{L.issueKind[i.kind].label}</Badge>
                    <strong>{i.title}</strong>
                    <span className={i.due && i.due < t ? "text-red" : "muted"}>{fmtShort(i.due)}</span>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Keine offenen Meldungen.</Empty>
          )}
        </Card>
        <Card title="Letzte Aktivitäten">
          {activity.length ? (
            <ul className="timeline">
              {activity.map((a) => (
                <li key={a.id}>
                  <span>{a.text}</span>
                  <small>
                    {fmt(a.at.slice(0, 10))} {a.at.slice(11, 16)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <Empty>Noch keine Aktivitäten.</Empty>
          )}
        </Card>
      </div>
      {project.description && (
        <Card title="Beschreibung">
          <p className="prose">{project.description}</p>
        </Card>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Terminplan */

/** Moves successors so they never start before their predecessor ends. */
function cascade(tasks: Task[], changed: Task): Task[] {
  const map = new Map(tasks.map((t) => [t.id, t]));
  map.set(changed.id, changed);
  const queue = [changed];
  while (queue.length) {
    const pre = queue.shift()!;
    for (const succ of [...map.values()].filter((t) => t.dependsOn === pre.id)) {
      const minStart = addDays(pre.end, pre.milestone ? 0 : 1);
      if (succ.start < minStart) {
        const shift = diffDays(succ.start, minStart);
        const moved = { ...succ, start: addDays(succ.start, shift), end: addDays(succ.end, shift) };
        map.set(moved.id, moved);
        queue.push(moved);
      }
    }
  }
  return [...map.values()].filter((t) => t.projectId === changed.projectId);
}

export function ScheduleTab({ project }: { project: Project }) {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const [zoom, setZoom] = useState<"week" | "month">("month");
  const tasks = of(data.tasks, project.id).sort((a, b) => a.start.localeCompare(b.start));

  const first = tasks.reduce((m, t) => (t.start < m ? t.start : m), project.start);
  const last = tasks.reduce((m, t) => (t.end > m ? t.end : m), project.end);
  const from = startOfWeek(addDays(first, -3));
  const days = diffDays(from, last) + 10;
  const dw = zoom === "month" ? 12 : 28;

  return (
    <div className="stack">
      <div className="toolbar">
        <Segmented
          options={[
            { value: "month", label: "Gesamt" },
            { value: "week", label: "Tage" }
          ]}
          value={zoom}
          onChange={setZoom}
        />
        <span className="spacer" />
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "task", item: { projectId: project.id } })}>
          <Plus size={16} /> Vorgang
        </button>
      </div>
      <div className="card card-flush">
        <Gantt
          rows={tasks.map((t) => ({ id: t.id, label: t.title }))}
          bars={tasks.map((t) => ({
            id: t.id,
            rowId: t.id,
            start: t.start,
            end: t.end,
            label: t.milestone ? t.title : `${t.progress} %`,
            color: t.status === "erledigt" ? "#10b981" : t.status === "blockiert" ? "#ef4444" : project.color,
            progress: t.milestone ? undefined : t.progress,
            milestone: t.milestone,
            title: `${t.title}\n${fmt(t.start)} – ${fmt(t.end)} · ${L.taskStatus[t.status].label}${t.assigneeId ? ` · ${employeeName(data, t.assigneeId)}` : ""}`
          }))}
          from={from}
          days={days}
          dayWidth={dw}
          labelWidth={220}
          emptyText="Noch keine Vorgänge – lege den ersten an."
          onBarClick={(id) => {
            const t = data.tasks.find((x) => x.id === id);
            if (t) openEditor({ kind: "task", item: t });
          }}
          onChange={(id, start, end) => {
            const t = data.tasks.find((x) => x.id === id);
            if (!t) return;
            const changed = { ...t, start, end: t.milestone ? start : end };
            // Successors move along so the order stays intact.
            const shifted = cascade(data.tasks, changed).filter((x) => {
              const orig = data.tasks.find((o) => o.id === x.id);
              return orig && (orig.start !== x.start || orig.end !== x.end);
            });
            shifted.forEach((x) => save("tasks", x));
            notify(shifted.length > 1 ? `${shifted.length} Vorgänge verschoben` : `${t.title}: ${fmt(changed.start)} – ${fmt(changed.end)}`);
          }}
          onCreate={(_, start, end) => openEditor({ kind: "task", item: { projectId: project.id, start, end } })}
        />
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------- Vorgänge */

export function TasksTab({ project }: { project: Project }) {
  const { data, save } = useStore();
  const openEditor = useEditor();
  const [filter, setFilter] = useState<"open" | "all">("open");
  const tasks = of(data.tasks, project.id)
    .filter((t) => filter === "all" || t.status !== "erledigt")
    .sort((a, b) => a.end.localeCompare(b.end));

  return (
    <div className="stack">
      <div className="toolbar">
        <Segmented
          options={[
            { value: "open", label: "Offen" },
            { value: "all", label: "Alle" }
          ]}
          value={filter}
          onChange={setFilter}
        />
        <span className="spacer" />
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "task", item: { projectId: project.id } })}>
          <Plus size={16} /> Vorgang
        </button>
      </div>
      {tasks.length === 0 ? (
        <Empty>Keine Vorgänge.</Empty>
      ) : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th className="w-check" />
                <th>Vorgang</th>
                <th>Phase</th>
                <th>Verantwortlich</th>
                <th>Zeitraum</th>
                <th>Status</th>
                <th className="w-progress">Fortschritt</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map((t) => (
                <tr key={t.id} className="clickable" onClick={() => openEditor({ kind: "task", item: t })}>
                  <td onClick={(e) => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      aria-label="Erledigt"
                      checked={t.status === "erledigt"}
                      onChange={(e) => save("tasks", { ...t, status: e.target.checked ? "erledigt" : "in_arbeit", progress: e.target.checked ? 100 : Math.min(t.progress, 90) }, `Vorgang ${t.title} ${e.target.checked ? "erledigt" : "wieder geöffnet"}`)}
                    />
                  </td>
                  <td>
                    <strong>{t.milestone ? "◆ " : ""}{t.title}</strong>
                  </td>
                  <td>{t.phase}</td>
                  <td>{t.assigneeId ? employeeName(data, t.assigneeId) : "–"}</td>
                  <td className={`nowrap ${t.status !== "erledigt" && t.end < today() ? "text-red" : ""}`}>
                    {fmtShort(t.start)} – {fmt(t.end)}
                  </td>
                  <td>
                    <Badge tone={L.taskStatus[t.status].tone}>{L.taskStatus[t.status].label}</Badge>
                  </td>
                  <td>
                    <span className="cell-progress">
                      <Progress value={t.progress} color={project.color} /> {t.progress} %
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Mängel & Meldungen */

export function IssuesTab({ projectId }: { projectId?: string }) {
  const { data, save } = useStore();
  const openEditor = useEditor();
  const [kind, setKind] = useState<IssueKind | "all">("all");
  const [status, setStatus] = useState<IssueStatus | "open" | "all">("open");
  const [query, setQuery] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const t = today();

  const list = useMemo(() => {
    const q = query.toLowerCase();
    const rank = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };
    return data.issues
      .filter((i) => !projectId || i.projectId === projectId)
      .filter((i) => kind === "all" || i.kind === kind)
      .filter((i) => (status === "all" ? true : status === "open" ? i.status !== "erledigt" : i.status === status))
      .filter((i) => !q || `${i.title} ${i.location} ${i.description}`.toLowerCase().includes(q))
      .sort((a, b) => rank[a.severity] - rank[b.severity] || (a.due || "9").localeCompare(b.due || "9"));
  }, [data.issues, projectId, kind, status, query]);

  const nextStatus: Record<IssueStatus, IssueStatus> = { offen: "in_arbeit", in_arbeit: "erledigt", erledigt: "offen" };

  return (
    <div className="stack">
      <div className="toolbar">
        <Segmented
          options={[
            { value: "open", label: "Offen" },
            { value: "erledigt", label: "Erledigt" },
            { value: "all", label: "Alle" }
          ]}
          value={status as "open" | "erledigt" | "all"}
          onChange={setStatus}
        />
        <div className="chip-group">
          <button type="button" className={`chip ${kind === "all" ? "on" : ""}`} onClick={() => setKind("all")}>
            Alle Arten
          </button>
          {(Object.keys(L.issueKind) as IssueKind[]).map((k) => (
            <button key={k} type="button" className={`chip ${kind === k ? "on" : ""}`} onClick={() => setKind(k)}>
              {L.issueKind[k].label}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} />
        <span className="spacer" />
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "issue", item: projectId ? { projectId } : undefined })}>
          <Camera size={15} /> Melden
        </button>
      </div>
      {list.length === 0 ? (
        <Empty>
          <CheckCircle2 size={18} /> Keine Einträge.
        </Empty>
      ) : (
        <div className="issue-list">
          {list.map((i) => {
            const p = data.projects.find((x) => x.id === i.projectId);
            const overdue = i.status !== "erledigt" && i.due && i.due < t;
            return (
              <article key={i.id} className={`issue sev-${i.severity}`} onClick={() => openEditor({ kind: "issue", item: i })}>
                {i.photo ? (
                  <button
                    type="button"
                    className="issue-photo"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPhoto(i.photo);
                    }}
                  >
                    <img src={i.photo} alt="" />
                  </button>
                ) : (
                  <span className="issue-photo placeholder">
                    <Camera size={16} />
                  </span>
                )}
                <div className="issue-main">
                  <div className="row-inline">
                    <Badge tone={L.issueKind[i.kind].tone}>{L.issueKind[i.kind].label}</Badge>
                    <Badge tone={L.severity[i.severity].tone}>{L.severity[i.severity].label}</Badge>
                    <strong>{i.title}</strong>
                  </div>
                  <small className="muted">
                    {!projectId && p ? (
                      <>
                        <Dot color={p.color} /> {p.name} ·{" "}
                      </>
                    ) : null}
                    {i.location || "ohne Ort"} · {i.assigneeId ? employeeName(data, i.assigneeId) : "nicht zugewiesen"} ·{" "}
                    <span className={overdue ? "text-red" : ""}>Frist {fmt(i.due)}</span>
                  </small>
                  {i.description && <p>{i.description}</p>}
                </div>
                <button
                  type="button"
                  className={`status-btn tone-${L.issueStatus[i.status].tone}`}
                  title="Status weiterschalten"
                  onClick={(e) => {
                    e.stopPropagation();
                    const s = nextStatus[i.status];
                    save("issues", { ...i, status: s }, `${L.issueKind[i.kind].label} „${i.title}“: ${L.issueStatus[s].label}`);
                  }}
                >
                  {L.issueStatus[i.status].label}
                </button>
              </article>
            );
          })}
        </div>
      )}
      {photo && (
        <div className="modal-backdrop" onClick={() => setPhoto(null)}>
          <img className="lightbox" src={photo} alt="" />
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Material */

export function MaterialTab({ project }: { project: Project }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const list = of(data.materials, project.id).sort((a, b) => a.deliveryDate.localeCompare(b.deliveryDate));
  const planned = list.reduce((s, m) => s + m.planned * m.unitPrice, 0);
  const delivered = list.reduce((s, m) => s + m.delivered * m.unitPrice, 0);
  const used = list.reduce((s, m) => s + m.used * m.unitPrice, 0);
  const t = today();
  const upcoming = list.filter((m) => m.status !== "geliefert" && m.deliveryDate >= t && m.deliveryDate <= addDays(t, 14));
  const late = list.filter((m) => m.status !== "geliefert" && m.deliveryDate < t);

  return (
    <div className="stack">
      <div className="kpi-grid">
        <Kpi icon={Package} label="Geplant" value={L.eur(planned)} hint={`${list.length} Positionen`} />
        <Kpi icon={Download} label="Geliefert" value={L.eur(delivered)} hint={planned ? `${Math.round((delivered / planned) * 100)} %` : "–"} tone="cyan" />
        <Kpi icon={CheckCircle2} label="Verbaut" value={L.eur(used)} hint={planned ? `${Math.round((used / planned) * 100)} %` : "–"} tone="green" />
        <Kpi icon={CalendarDays} label="Lieferungen 14 Tage" value={upcoming.length} hint={late.length ? <span className="text-red">{late.length} überfällig</span> : "keine überfällig"} tone={late.length ? "red" : "amber"} />
      </div>
      <div className="toolbar">
        <span className="spacer" />
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "material", item: { projectId: project.id } })}>
          <Plus size={16} /> Material
        </button>
      </div>
      {list.length === 0 ? (
        <Empty>Noch kein Material erfasst.</Empty>
      ) : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Material</th>
                <th>Lieferant</th>
                <th>Liefertermin</th>
                <th>Status</th>
                <th className="num">Geplant</th>
                <th className="w-progress">Geliefert / Verbaut</th>
                <th className="num">Wert</th>
              </tr>
            </thead>
            <tbody>
              {list.map((m) => (
                <tr key={m.id} className="clickable" onClick={() => openEditor({ kind: "material", item: m })}>
                  <td>
                    <strong>{m.name}</strong>
                  </td>
                  <td>{m.supplier}</td>
                  <td className={m.status !== "geliefert" && m.deliveryDate < t ? "text-red nowrap" : "nowrap"}>{fmt(m.deliveryDate)}</td>
                  <td>
                    <Badge tone={L.materialStatus[m.status].tone}>{L.materialStatus[m.status].label}</Badge>
                  </td>
                  <td className="num nowrap">
                    {L.num(m.planned, 2)} {m.unit}
                  </td>
                  <td>
                    <div className="dual-progress" title={`Geliefert ${m.delivered} · Verbaut ${m.used}`}>
                      <span className="d" style={{ width: `${m.planned ? Math.min(100, (m.delivered / m.planned) * 100) : 0}%` }} />
                      <span className="u" style={{ width: `${m.planned ? Math.min(100, (m.used / m.planned) * 100) : 0}%` }} />
                    </div>
                    <small className="muted">
                      {L.num(m.delivered, 2)} / {L.num(m.used, 2)} {m.unit}
                    </small>
                  </td>
                  <td className="num">{L.eur(m.planned * m.unitPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Tagesberichte */

export function ReportsTab({ project }: { project: Project }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const list = of(data.reports, project.id).sort((a, b) => b.date.localeCompare(a.date));
  const [printId, setPrintId] = useState<string | null>(null);

  const print = (id: string) => {
    setPrintId(id);
    setTimeout(() => {
      window.print();
      setPrintId(null);
    }, 50);
  };

  return (
    <div className="stack">
      <div className="toolbar">
        <span className="muted">
          {list.length} Berichte · {L.num(list.reduce((s, r) => s + r.hours, 0))} Stunden gesamt
        </span>
        <span className="spacer" />
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "report", item: { projectId: project.id } })}>
          <Plus size={16} /> Tagesbericht
        </button>
      </div>
      {list.length === 0 ? (
        <Empty>Noch keine Tagesberichte.</Empty>
      ) : (
        <div className="report-list">
          {list.map((r) => (
            <article key={r.id} className={`card report ${printId === r.id ? "print-only-this" : ""}`}>
              <header className="report-head">
                <div>
                  <strong>{fmt(r.date)}</strong>
                  <span className="muted">
                    {" "}
                    · {L.weather[r.weather].label}, {r.temperature} °C · {r.crew} Personen · {r.hours} h · {employeeName(data, r.authorId)}
                  </span>
                  <span className="print-title">
                    Tagesbericht {project.code} {project.name}
                  </span>
                </div>
                <div className="row-inline no-print">
                  <button className="btn btn-sm btn-ghost" type="button" onClick={() => print(r.id)}>
                    <Printer size={14} /> Drucken
                  </button>
                  <button className="btn btn-sm" type="button" onClick={() => openEditor({ kind: "report", item: r })}>
                    Bearbeiten
                  </button>
                </div>
              </header>
              <p className="prose">{r.work}</p>
              {r.incidents && (
                <p className="report-incident">
                  <AlertTriangle size={14} /> {r.incidents}
                </p>
              )}
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Team & Geräte */

export function TeamTab({ project }: { project: Project }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const t = today();
  const list = of(data.assignments, project.id).sort((a, b) => a.start.localeCompare(b.start));
  const current = list.filter((a) => a.end >= t);
  const past = list.filter((a) => a.end < t);
  const days = (d: Data["assignments"][number]) => diffDays(d.start, d.end) + 1;

  const Row = ({ a }: { a: (typeof list)[number] }) => (
    <tr className="clickable" onClick={() => openEditor({ kind: "assignment", item: a })}>
      <td>
        <span className="cell-person">
          {a.resourceType === "employee" ? <Avatar name={resourceName(data, a.resourceType, a.resourceId)} size={22} /> : <Users size={16} className="muted" />}
          <strong>{resourceName(data, a.resourceType, a.resourceId)}</strong>
        </span>
      </td>
      <td>{L.resourceType[a.resourceType].label}</td>
      <td className="nowrap">
        {fmt(a.start)} – {fmt(a.end)}
      </td>
      <td className="num">{days(a)}</td>
      <td>{inRange(t, a.start, a.end) ? <Badge tone="green">Vor Ort</Badge> : a.start > t ? <Badge tone="blue">Geplant</Badge> : <Badge tone="gray">Beendet</Badge>}</td>
      <td className="muted">{a.note}</td>
    </tr>
  );

  return (
    <div className="stack">
      <div className="toolbar">
        <span className="muted">
          {current.length} aktuelle/geplante Einplanungen · {L.num(list.filter((a) => a.resourceType === "employee").reduce((s, a) => s + days(a), 0))} Personentage gesamt
        </span>
        <span className="spacer" />
        <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "assignment", item: { projectId: project.id } })}>
          <Plus size={16} /> Einplanen
        </button>
      </div>
      {list.length === 0 ? (
        <Empty>Noch niemand eingeplant.</Empty>
      ) : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Ressource</th>
                <th>Art</th>
                <th>Zeitraum</th>
                <th className="num">Tage</th>
                <th>Status</th>
                <th>Notiz</th>
              </tr>
            </thead>
            <tbody>
              {current.map((a) => (
                <Row key={a.id} a={a} />
              ))}
              {past.length > 0 && (
                <tr className="table-section">
                  <td colSpan={6}>Vergangen</td>
                </tr>
              )}
              {past.map((a) => (
                <Row key={a.id} a={a} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- Dokumente */

const MAX_STORED = 1_500_000;

export function DocumentsTab({ project }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [category, setCategory] = useState("Allgemein");
  const list = of(data.documents, project.id).sort((a, b) => b.addedAt.localeCompare(a.addedAt));
  const categories = [...new Set(["Allgemein", "Pläne", "Verträge", "Protokolle", "Datenblätter", "Fotos", ...list.map((d) => d.category)])];

  const upload = async (files: FileList | null) => {
    if (!files) return;
    for (const file of Array.from(files)) {
      const dataUrl =
        file.size <= MAX_STORED
          ? await new Promise<string>((resolve) => {
              const r = new FileReader();
              r.onload = () => resolve(String(r.result));
              r.readAsDataURL(file);
            })
          : "";
      save("documents", { id: uid("d"), projectId: project.id, name: file.name, category, size: file.size, addedAt: today(), dataUrl }, `Dokument ${file.name} hochgeladen`);
      if (!dataUrl) notify(`${file.name}: zu groß für den Browser-Speicher, nur Eintrag gespeichert`);
    }
    if (input.current) input.current.value = "";
  };

  return (
    <div className="stack">
      <div
        className="dropzone"
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          upload(e.dataTransfer.files);
        }}
      >
        <Upload size={18} />
        <span>Dateien hierher ziehen oder</span>
        <select className="select-sm" value={category} onChange={(e) => setCategory(e.target.value)}>
          {categories.map((c) => (
            <option key={c}>{c}</option>
          ))}
        </select>
        <button className="btn btn-sm" type="button" onClick={() => input.current?.click()}>
          Datei wählen
        </button>
        <input ref={input} type="file" multiple hidden onChange={(e) => upload(e.target.files)} />
        <small className="muted">Im Demo-Modus werden Dateien bis 1,5 MB im Browser gespeichert.</small>
      </div>
      {list.length === 0 ? (
        <Empty>Noch keine Dokumente.</Empty>
      ) : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Datei</th>
                <th>Kategorie</th>
                <th>Hinzugefügt</th>
                <th className="num">Größe</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>
                    <span className="cell-person">
                      <FileText size={16} className="muted" /> <strong>{d.name}</strong>
                    </span>
                  </td>
                  <td>
                    <Badge>{d.category}</Badge>
                  </td>
                  <td>{fmt(d.addedAt)}</td>
                  <td className="num">{d.size > 1e6 ? `${(d.size / 1e6).toFixed(1)} MB` : `${Math.ceil(d.size / 1e3)} KB`}</td>
                  <td className="num nowrap">
                    {d.dataUrl ? (
                      <a className="icon-btn" href={d.dataUrl} download={d.name} title="Herunterladen">
                        <Download size={15} />
                      </a>
                    ) : null}
                    <button
                      className="icon-btn"
                      type="button"
                      title="Löschen"
                      onClick={() => window.confirm(`${d.name} löschen?`) && remove("documents", d.id, `Dokument ${d.name} gelöscht`)}
                    >
                      <Trash2 size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

"use client";

import { AlertTriangle, ArrowUpRight, BarChart3, CalendarDays, Camera, ClipboardList, FileText, Filter, FolderKanban, HardHat, MapPinned, Pencil, PenLine, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, type MouseEvent as ReactMouseEvent, type ReactNode } from "react";
import { addDays, diffDays, startOfWeek, today } from "@/core/date";
import { fmtDate, PROJECT_STATUS } from "@/core/format";
import { rightsOf } from "@/core/roles";
import { personName, useStore } from "@/core/store";
import type { Data, Project } from "@/core/types";
import { PageHead } from "@/core/ui";
import { access, childrenOf, projectFacts, tasksUnder, visibleProjects } from "./model";
import { billingOf, eur0, hoursOf, totals } from "./money";
import { ProjectForm } from "./projects";

export type Tone = "blue" | "green" | "amber" | "red";

export function ProgressBar({ tone, value }: { tone: Tone; value: number }) {
  return (
    <span className={`progress ${tone}`} aria-label={`${value} Prozent`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export function WidgetHeader({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="widget-header">
      <h2>{title}</h2>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ project selection */

/** SiteManager start: pick a project – every card with picture, progress and the key facts. */
export function ProjectSelection() {
  const { data, remove, notify } = useStore();
  const router = useRouter();
  const params = useSearchParams();
  const [archived, setArchived] = useState(false);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Project | null>(null);
  const [menu, setMenu] = useState<{ project: Project; x: number; y: number } | null>(null);
  const [status, setStatus] = useState("");
  const create = rightsOf(data).create;
  const list = visibleProjects(data, archived).filter((p) => !status || p.status === status);

  useEffect(() => {
    if (params.get("neu") && create) setCreating(true);
  }, [params, create]);

  const openMenu = (p: Project, e: ReactMouseEvent) => {
    e.preventDefault();
    setMenu({ project: p, x: Math.max(8, Math.min(e.clientX, window.innerWidth - 242)), y: Math.max(8, Math.min(e.clientY, window.innerHeight - 214)) });
  };
  const del = (p: Project) => {
    if (window.prompt(`Zum Löschen den Projektnamen eingeben:\n${p.name}`)?.trim() !== p.name) return;
    remove("projects", p.id);
    notify(`Projekt „${p.name}“ gelöscht`);
  };

  return (
    <>
      <PageHead kicker="Projektauswahl" title="SiteManager" sub="Projekte, Open Points, Mängel, Fotos, Regie und Material.">
        <button className="secondary-action" type="button" onClick={() => (setArchived((a) => !a), setStatus(""))}>
          <FolderKanban size={16} />
          {archived ? "Laufende Projekte" : "Archiv"}
        </button>
        {create && (
          <button className="primary-action" type="button" onClick={() => setCreating(true)}>
            <Plus size={16} />
            Projekt anlegen
          </button>
        )}
      </PageHead>
      <div className="site-workspace">
        <div className="site-grid">
          <section className="dashboard-card site-feature full project-selection-panel">
            <div className="project-selection-head">
              <div>
                <span>SiteManager</span>
                <h2>{archived ? "Archivierte Projekte" : "Projekt auswählen"}</h2>
                <p>Wähle zuerst ein Projekt. Danach erscheinen Dashboard, Open Points, Mängel, Fotos, Regie, Material, Aufgaben, Notizen, Dokumentation und Berichte für genau dieses Projekt. Rechtsklick auf eine Karte = bearbeiten oder löschen.</p>
              </div>
            </div>
            {!archived && (
              <div className="site-toolbar">
                <span className="site-filter-label">
                  <Filter size={15} /> Status
                </span>
                {["", "active", "planning", "handover", "paused"].map((s) => (
                  <button key={s} type="button" className={status === s ? "on" : ""} onClick={() => setStatus(s)}>
                    {s ? PROJECT_STATUS[s as Project["status"]].label : "Alle"}
                  </button>
                ))}
              </div>
            )}
            <div className="project-board project-selection-board">
              {list.map((p) => {
                const f = projectFacts(data, p);
                return (
                  <article
                    className="site-project-card"
                    key={p.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => router.push(`/projekte/${p.id}`)}
                    onContextMenu={(e) => openMenu(p, e)}
                    onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), router.push(`/projekte/${p.id}`))}
                  >
                    <div className="project-card-cover">
                      {p.image ? (
                        <img src={p.image} alt={p.name} />
                      ) : (
                        <span style={{ color: p.color }}>
                          <HardHat size={22} />
                        </span>
                      )}
                    </div>
                    <div>
                      <strong>{p.name}</strong>
                      <small>{[p.client, p.location].filter(Boolean).join(" · ") || "–"}</small>
                    </div>
                    <ProgressBar value={f.progress} tone={f.progress > 70 ? "green" : "blue"} />
                    <div className="project-card-meta">
                      <span>{PROJECT_STATUS[p.status].label}</span>
                      <span>{f.progress} %</span>
                      <span className={f.openDefects.length ? "warn" : ""}>{f.openDefects.length} Mängel</span>
                      <span>{f.team.length} Personen</span>
                      <span className={f.overdue ? "warn" : ""}>{p.due ? fmtDate(p.due) : "ohne Termin"}</span>
                    </div>
                  </article>
                );
              })}
              {create && !archived && (
                <button className="site-project-card project-create-card" type="button" onClick={() => setCreating(true)}>
                  <span className="project-create-icon">
                    <Plus size={22} />
                  </span>
                  <strong>Projekt anlegen</strong>
                  <small>Neues SiteManager-Projekt erstellen</small>
                </button>
              )}
              {!list.length && !create && <p className="site-empty">{archived ? "Nichts im Archiv." : "Sobald dich jemand in ein Projekt einlädt, erscheint es hier."}</p>}
            </div>
            {menu && (
              <>
                <div className="progress-context-backdrop" onClick={() => setMenu(null)} onContextMenu={(e) => (e.preventDefault(), setMenu(null))} />
                <div className="progress-context-menu project-context-menu" style={{ left: menu.x, top: menu.y }}>
                  <button type="button" onClick={() => (setMenu(null), router.push(`/projekte/${menu.project.id}`))}>
                    <FolderKanban size={14} />
                    Öffnen
                  </button>
                  {access(data, menu.project).manage && (
                    <>
                      <button type="button" onClick={() => (setEditing(menu.project), setMenu(null))}>
                        <Pencil size={14} />
                        Bearbeiten
                      </button>
                      <button className="danger" type="button" onClick={() => (del(menu.project), setMenu(null))}>
                        <Trash2 size={14} />
                        Löschen
                      </button>
                    </>
                  )}
                </div>
              </>
            )}
          </section>
        </div>
      </div>
      {creating && <ProjectForm onClose={() => (setCreating(false), params.get("neu") && router.replace("/projekte"))} onSaved={(p) => router.push(`/projekte/${p.id}`)} />}
      {editing && <ProjectForm project={editing} onClose={() => setEditing(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ site dashboard */

/** Done in a week (Monday to Sunday) – from who-closed-what-when. */
function doneIn(data: Data, p: Project, from: string) {
  const to = addDays(from, 7);
  const inWeek = (ts?: string) => !!ts && ts.slice(0, 10) >= from && ts.slice(0, 10) < to;
  return {
    points: data.points.filter((x) => x.projectId === p.id && x.type === "task" && x.status === "done" && inWeek(x.doneAt)).length,
    defects: data.defects.filter((x) => x.projectId === p.id && x.status === "done" && inWeek(x.closedAt)).length
  };
}

/** eGrid "Site Dashboard": the cockpit of one project. */
export function SiteDashboard({ project: p }: { project: Project }) {
  const { data } = useStore();
  const [editing, setEditing] = useState(false);
  const f = projectFacts(data, p);
  const { manage, work } = access(data, p);
  const t = today();
  const base = `/projekte/${p.id}`;
  const days = p.due ? diffDays(t, p.due) : null;
  const done = f.tasks.filter((x) => x.status === "done");
  const inWork = f.open.filter((x) => x.status === "in_progress");
  const todos = f.todos;
  const todosDone = todos.filter((x) => x.done).length;
  const thisWeek = doneIn(data, p, startOfWeek(t));
  const lastWeek = doneIn(data, p, addDays(startOfWeek(t), -7));
  const areas = childrenOf(f.points, "");
  const portfolio = visibleProjects(data).filter((x) => x.id !== p.id);

  return (
    <div className="site-workspace">
      <div className="site-dashboard">
        <section className="site-dashboard-hero">
          <div>
            <span>Projekt Dashboard</span>
            <h2>{p.name}</h2>
            <p>{[p.client, p.location, p.managerId && `Projektleitung ${personName(data, p.managerId)}`].filter(Boolean).join(" · ")}</p>
          </div>
          <div className="site-dashboard-actions">
            <Link href="/projekte">
              <FolderKanban size={15} /> Projekt wechseln
            </Link>
            {manage && (
              <button type="button" onClick={() => setEditing(true)}>
                <Pencil size={15} /> Bearbeiten
              </button>
            )}
            <Link href={`${base}/berichte`}>
              <FileText size={15} /> Bericht erstellen
            </Link>
          </div>
        </section>

        <div className="site-analytics-grid">
          <Analytics href={`${base}/punkte`} icon={BarChart3} label="Open Points" tone="blue" value={String(f.open.length)} detail={`${done.length} von ${f.tasks.length} erledigt`} progress={f.progress} />
          <Analytics href={`${base}/maengel`} icon={AlertTriangle} label="Offene Mängel" tone="red" value={String(f.openDefects.length)} detail={f.urgent.length ? `${f.urgent.length} dringend` : `${f.defects.length - f.openDefects.length} behoben`} progress={f.defects.length ? Math.round(((f.defects.length - f.openDefects.length) / f.defects.length) * 100) : 0} />
          <Analytics icon={CalendarDays} label="Deadline" tone={days != null && days < 14 ? "amber" : "green"} value={days == null ? "–" : String(Math.max(0, days))} suffix={days == null ? "" : " Tage"} detail={days == null ? "kein Termin" : days >= 0 ? `fällig am ${fmtDate(p.due)}` : `seit ${-days} Tagen überfällig`} progress={days == null ? 0 : Math.max(0, Math.min(100, 100 - Math.max(0, days)))} />
          <Analytics href={`${base}/aufgaben`} icon={ClipboardList} label="Aufgaben" tone="green" value={String(todos.length - todosDone)} detail={`${todosDone} von ${todos.length} erledigt`} progress={todos.length ? Math.round((todosDone / todos.length) * 100) : 0} />
        </div>

        <div className="site-grid">
          <section className="dashboard-card site-feature wide site-analytics-panel">
            <WidgetHeader title="Wochenvergleich" />
            <div className="analytics-bars">
              <Compare current={thisWeek.points} previous={lastWeek.points} label="Open Points erledigt" tone="blue" />
              <Compare current={thisWeek.defects} previous={lastWeek.defects} label="Mängel behoben" tone="red" />
            </div>
          </section>

          <section className="dashboard-card site-feature site-dashboard-status">
            <WidgetHeader title="Status" />
            <div className="status-stack">
              <div>
                <span>Offen</span>
                <strong>{f.open.length - inWork.length}</strong>
              </div>
              <div>
                <span>In Arbeit</span>
                <strong>{inWork.length}</strong>
              </div>
              <div>
                <span>Mit Mangel</span>
                <strong>{f.openDefects.length}</strong>
              </div>
              <div>
                <span>Erledigt</span>
                <strong>{done.length}</strong>
              </div>
            </div>
          </section>

          <section className="dashboard-card site-feature">
            <WidgetHeader title="Aktionen" />
            <div className="quick-actions">
              {work && (
                <Link href={`${base}/maengel?neu=1`}>
                  <AlertTriangle size={16} /> Mangel aufnehmen
                </Link>
              )}
              {work && (
                <Link href={`${base}/fotos`}>
                  <Camera size={16} /> Foto hinzufügen
                </Link>
              )}
              {work && (
                <Link href={`${base}/regie?neu=1`}>
                  <PenLine size={16} /> Regieschein
                </Link>
              )}
              <Link href={`${base}/berichte`}>
                <FileText size={16} /> Bericht erstellen
              </Link>
            </div>
          </section>

          <BudgetCard project={p} />

          <section className="dashboard-card site-feature wide">
            <WidgetHeader title="Aktueller Baufortschritt" />
            <div className="progress-board">
              {areas.length === 0 && <p className="site-empty">Noch keine Bereiche – unter Open Points anlegen.</p>}
              {areas.map((a) => {
                const list = tasksUnder(f.points, a.id);
                const pct = list.length ? Math.round((list.filter((x) => x.status === "done").length / list.length) * 100) : 0;
                return (
                  <Link className="progress-line" key={a.id} href={`${base}/punkte?bereich=${a.id}`}>
                    <div>
                      <strong>{a.title}</strong>
                      <small>
                        {list.filter((x) => x.status !== "done").length} offen · {list.length} Punkte
                      </small>
                    </div>
                    <ProgressBar value={pct} tone={pct > 70 ? "green" : "blue"} />
                    <span>{pct}%</span>
                  </Link>
                );
              })}
            </div>
          </section>

          <section className="dashboard-card site-feature">
            <WidgetHeader title="Projektportfolio" />
            <div className="site-list">
              {portfolio.map((x) => (
                <Link className="project-summary" key={x.id} href={`/projekte/${x.id}`}>
                  <span>
                    <MapPinned size={15} />
                  </span>
                  <div>
                    <strong>{x.name}</strong>
                    <small>
                      {x.location} · {projectFacts(data, x).progress}%
                    </small>
                  </div>
                  <ArrowUpRight size={14} />
                </Link>
              ))}
              {!portfolio.length && <p className="site-empty">Keine weiteren Projekte.</p>}
            </div>
          </section>
        </div>
      </div>
      {editing && <ProjectForm project={p} onClose={() => setEditing(false)} />}
    </div>
  );
}

function Analytics({ href, icon: Icon, label, tone, value, suffix = "", detail, progress }: { href?: string; icon: typeof BarChart3; label: string; tone: Tone; value: string; suffix?: string; detail: string; progress: number }) {
  const body = (
    <>
      <div className="site-analytics-icon">
        <Icon size={19} />
      </div>
      <div>
        <span>{label}</span>
        <strong>
          {value}
          <small>{suffix}</small>
        </strong>
        <p>{detail}</p>
      </div>
      <ProgressBar tone={tone} value={progress} />
    </>
  );
  return href ? (
    <Link href={href} className={`site-analytics-card ${tone}`}>
      {body}
    </Link>
  ) : (
    <article className={`site-analytics-card ${tone}`}>{body}</article>
  );
}

function Compare({ current, previous, label, tone }: { current: number; previous: number; label: string; tone: Tone }) {
  const max = Math.max(current, previous, 1);
  const diff = current - previous;
  return (
    <div className="analytics-bar-row">
      <div className="analytics-bar-head">
        <span>{label}</span>
        <strong>{current}</strong>
      </div>
      <div className="analytics-bar-track">
        <span className={`current ${tone}`} style={{ width: `${Math.max(4, (current / max) * 100)}%` }} />
      </div>
      <div className="analytics-bar-track muted">
        <span style={{ width: `${Math.max(4, (previous / max) * 100)}%` }} />
      </div>
      <p>
        <span>Diese Woche</span>
        <span>Vorwoche {previous}</span>
        <em className={diff >= 0 ? "positive" : "negative"}>
          {diff >= 0 ? "+" : ""}
          {diff}
        </em>
      </p>
    </div>
  );
}

/** eGrid status bar above the other project pages. */
export function SiteStatusBar({ project: p }: { project: Project }) {
  const { data, toast } = useStore();
  const f = projectFacts(data, p);
  return (
    <section className="site-status-bar">
      <div>
        <span>Aktives Projekt</span>
        <strong>{p.name}</strong>
        <small>{[p.client, p.location].filter(Boolean).join(" · ")}</small>
      </div>
      <div>
        <span>Fortschritt</span>
        <strong>{f.progress} %</strong>
        <small>{f.open.length} Punkte offen</small>
      </div>
      <div>
        <span>Offene Mängel</span>
        <strong>{f.openDefects.length}</strong>
        <small>zu prüfen</small>
      </div>
      <div>
        <span>Aufgaben</span>
        <strong>{f.todos.filter((x) => !x.done).length}</strong>
        <small>offen</small>
      </div>
      {toast && <p>{toast}</p>}
    </section>
  );
}

/** Hours booked on the project, their value and the budget used – live from the time tracking. */
function BudgetCard({ project: p }: { project: Project }) {
  const { data } = useStore();
  const times = data.times.filter((x) => x.projectId === p.id);
  const hours = times.reduce((s, x) => s + hoursOf(x), 0);
  const billable = times.filter((x) => x.billable).reduce((s, x) => s + hoursOf(x), 0);
  const open = times.filter((x) => x.billable && !x.billedIn).reduce((s, x) => s + hoursOf(x), 0);
  const rate = billingOf(data).rate;
  const value = billable * rate;
  const invoiced = data.billing.filter((b) => b.projectId === p.id && b.kind === "rechnung" && b.status !== "entwurf" && b.status !== "storniert").reduce((s, b) => s + totals(b).net, 0);
  const used = p.budget ? Math.round((value / p.budget) * 100) : 0;
  return (
    <section className="dashboard-card site-feature">
      <WidgetHeader title="Stunden & Budget" action={rightsOf(data).sales && open ? <Link className="link" href={`/abrechnung/rechnungen?neu=1&projekt=${p.id}`}>abrechnen</Link> : undefined} />
      <div className="status-stack">
        <div>
          <span>Gebucht</span>
          <strong>{Math.round(hours)} h</strong>
        </div>
        <div>
          <span>Wert ({rate} €/h)</span>
          <strong>{eur0(value)}</strong>
        </div>
        <div>
          <span>Verrechnet</span>
          <strong>{eur0(invoiced)}</strong>
        </div>
        <div>
          <span>Noch offen</span>
          <strong>{Math.round(open)} h</strong>
        </div>
      </div>
      {p.budget ? (
        <div className="budget-line">
          <span>
            Budget {eur0(p.budget)} · {used} % verbraucht
          </span>
          <ProgressBar value={used} tone={used > 90 ? "red" : used > 70 ? "amber" : "green"} />
        </div>
      ) : (
        <p className="site-empty">Kein Budget hinterlegt – unter „Bearbeiten“ eintragen.</p>
      )}
    </section>
  );
}

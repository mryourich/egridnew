"use client";

import { Activity, AlertTriangle, ArrowRight, CalendarClock, Camera, CheckCircle2, ChevronLeft, ChevronRight, ClipboardList, FileText, Image as ImageIcon, ListChecks, Package, Plus, ShoppingCart, TrendingUp, UserPlus, Users } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { addDays, fmt, fmtShort, inRange, startOfWeek, today, weekdayLong, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { ago, projectStats } from "@/lib/overview";
import { siteSections } from "@/lib/sections";
import { currentUser, employeeName, isManager, myProjects, projectTeam, roleOf, useStore } from "@/lib/store";
import { myTasks } from "@/lib/tasks";
import type { Data, Project } from "@/lib/types";
import { InviteDialog } from "./invite";
import { TaskList } from "./my-tasks";
import { EmpAvatar } from "./person";
import { useEditor } from "./shell";

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

/** Name of a plan row: an employee or a free row of the project. */
export function rowName(data: Data, p: Project | undefined, id: string) {
  return data.employees.find((e) => e.id === id)?.name ?? p?.planRows?.find((r) => r.id === id)?.name ?? "–";
}

/** Tiny bar chart for a KPI tile (one bar per project). */
function MiniBars({ values, color }: { values: number[]; color: string }) {
  const max = Math.max(1, ...values);
  const v = values.length ? values : [0];
  return (
    <svg className="kpi-chart" viewBox={`0 0 ${v.length * 9} 40`} preserveAspectRatio="none" aria-hidden>
      {v.map((x, i) => {
        const h = Math.max(3, (x / max) * 38);
        return <rect key={i} x={i * 9 + 1} y={40 - h} width={5} height={h} rx={1.5} fill={color} opacity={0.35 + (0.65 * (i + 1)) / v.length} />;
      })}
    </svg>
  );
}

/** Soft area line for the progress tile. */
function MiniArea({ values, color }: { values: number[]; color: string }) {
  const v = values.length > 1 ? values : [0, ...(values.length ? values : [0])];
  const w = 120;
  const pts = v.map((x, i) => [(i / (v.length - 1)) * w, 36 - (x / 100) * 30] as const);
  const d = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  return (
    <svg className="kpi-area" viewBox={`0 0 ${w} 40`} preserveAspectRatio="none" aria-hidden>
      <defs>
        <linearGradient id="kpiArea" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={color} stopOpacity="0.28" />
          <stop offset="1" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${d} L${w},40 L0,40 Z`} fill="url(#kpiArea)" />
      <path d={d} fill="none" stroke={color} strokeWidth="2" />
    </svg>
  );
}

function Kpi2({ icon, tone, label, value, hint, chart, href }: { icon: ReactNode; tone: string; label: string; value: ReactNode; hint: string; chart: ReactNode; href?: string }) {
  const body = (
    <>
      <span className={`k2-icon t-${tone}`}>{icon}</span>
      <span className="k2-text">
        <small>{label}</small>
        <strong>{value}</strong>
        <em>{hint}</em>
      </span>
      {chart}
    </>
  );
  return href ? (
    <Link href={href} className="k2">
      {body}
    </Link>
  ) : (
    <div className="k2">{body}</div>
  );
}

function activityIcon(text: string) {
  const t = text.toLowerCase();
  if (t.includes("foto")) return { icon: <ImageIcon size={16} />, tone: "blue" };
  if (t.includes("mangel") || t.includes("abweichung") || t.includes("behinderung")) return { icon: <AlertTriangle size={16} />, tone: "red" };
  if (t.includes("bestell") || t.includes("material")) return { icon: <ShoppingCart size={16} />, tone: "violet" };
  if (t.includes("erledigt") || t.includes("behoben")) return { icon: <CheckCircle2 size={16} />, tone: "green" };
  if (t.includes("dokument") || t.includes("bericht") || t.includes("regieschein")) return { icon: <FileText size={16} />, tone: "blue" };
  return { icon: <Activity size={16} />, tone: "gray" };
}

const FEATURED_KEY = "vysner:dashboard-projekt";

/** Start: all my projects at a glance, one project in focus, my tasks, defects, photos and what happened. */
export function Dashboard() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const manager = isManager(data);
  const me = currentUser(data);
  const t = today();
  const projects = myProjects(data);
  const rows = projects.map((p) => ({ p, s: projectStats(data, p) }));
  const byId = new Map(projects.map((p) => [p.id, p]));
  const sum = (f: (s: (typeof rows)[number]["s"]) => number) => rows.reduce((n, r) => n + f(r.s), 0);
  const avg = rows.length ? Math.round(sum((s) => s.progress) / rows.length) : 0;
  const [featuredId, setFeaturedId] = useState("");
  const [invite, setInvite] = useState(false);
  useEffect(() => {
    try {
      setFeaturedId(window.localStorage.getItem(FEATURED_KEY) ?? "");
    } catch {
      setFeaturedId("");
    }
  }, []);
  // saved choice, otherwise the busiest project
  const busiest = rows.reduce((best, r, i) => (r.s.crewToday * 3 + r.s.openPoints.length > rows[best].s.crewToday * 3 + rows[best].s.openPoints.length ? i : best), 0);
  const saved = rows.findIndex((r) => r.p.id === featuredId);
  const fi = saved >= 0 ? saved : rows.length ? busiest : 0;
  const featured = rows[fi];
  const pick = (dir: number) => {
    const next = rows[(fi + dir + rows.length) % rows.length];
    if (!next) return;
    setFeaturedId(next.p.id);
    try {
      window.localStorage.setItem(FEATURED_KEY, next.p.id);
    } catch {
      // private mode
    }
  };

  const crew = new Set(rows.flatMap((r) => r.s.jobsToday.map((j) => j.employeeId))).size;
  const tasks = myTasks(data);
  const defects = rows.flatMap(({ p, s }) => s.openIssues.map((i) => ({ p, i }))).slice(0, 4);
  const photos = rows.flatMap(({ p, s }) => s.photos.map((ph) => ({ p, ph }))).sort((a, b) => b.ph.takenAt.localeCompare(a.ph.takenAt));
  const activity = data.activity.filter((a) => byId.has(a.projectId)).slice(0, 6);
  const role = roleOf(me);

  return (
    <div className="page page-wide dash2">
      <header className="dash-hero">
        <div>
          <h1>
            {greeting()}, {me?.name.split(" ")[0]} <span aria-hidden>👋</span>
          </h1>
          <p>
            {weekdayLong(t)}, {fmt(t)} <i>•</i> {projects.length} {projects.length === 1 ? "Projekt" : "Projekte"} <i>•</i> {data.company.name}
          </p>
        </div>
        {manager && (
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "project" })}>
            <Plus size={15} /> Neues Projekt
          </button>
        )}
      </header>

      <div className="k2-row">
        <Kpi2 icon={<TrendingUp size={18} />} tone="blue" label="Fortschritt" value={`${avg} %`} hint="über alle Projekte" chart={<MiniArea values={rows.map((r) => r.s.progress)} color="#1a5cff" />} href="/projekte" />
        <Kpi2 icon={<ClipboardList size={18} />} tone="green" label="Offene Punkte" value={sum((s) => s.openPoints.length)} hint={`${sum((s) => s.inWork.length)} in Arbeit`} chart={<MiniBars values={rows.map((r) => r.s.openPoints.length)} color="#10b981" />} />
        <Kpi2 icon={<AlertTriangle size={18} />} tone="red" label="Offene Mängel" value={sum((s) => s.openIssues.length)} hint={`${sum((s) => s.criticalIssues.length)} kritisch / hoch`} chart={<MiniBars values={rows.map((r) => r.s.openIssues.length)} color="#ef4444" />} />
        <Kpi2 icon={<CalendarClock size={18} />} tone="amber" label="Überfällig" value={sum((s) => s.overduePoints.length + s.overdueIssues.length)} hint="Punkte und Mängel" chart={<MiniBars values={rows.map((r) => r.s.overduePoints.length + r.s.overdueIssues.length)} color="#ef4444" />} />
        <Kpi2 icon={<Package size={18} />} tone="violet" label="Material" value={sum((s) => s.materialOpen.length + s.materialOrdered.length)} hint={`${sum((s) => s.materialOrdered.length)} bestellt`} chart={<MiniBars values={rows.map((r) => r.s.materialOpen.length + r.s.materialOrdered.length)} color="#8b5cf6" />} />
        <Kpi2 icon={<Users size={18} />} tone="blue" label="Heute im Einsatz" value={crew} hint="Mitarbeiter" chart={<MiniBars values={rows.map((r) => r.s.crewToday)} color="#1a5cff" />} />
      </div>

      {rows.length === 0 ? (
        <section className="card">
          <p className="dl-empty">
            Noch kein Projekt.{" "}
            {manager && (
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "project" })}>
                Projekt anlegen
              </button>
            )}
          </p>
        </section>
      ) : (
        <div className="dash-grid2">
          {featured && (
            <section className="card fp" style={{ "--c": featured.p.color } as CSSProperties}>
              <header className="fp-head">
                <div>
                  <span className="fp-code">{featured.p.code}</span>
                  <h2>{featured.p.name}</h2>
                  <p>{[featured.p.client, featured.p.location, featured.p.siteManagerId ? `Bauleitung ${employeeName(data, featured.p.siteManagerId)}` : ""].filter(Boolean).join(" · ")}</p>
                </div>
                <span className="fp-actions">
                  <span className={`status-pill s-${featured.p.status}`}>{L.projectStatus[featured.p.status].label}</span>
                  {rows.length > 1 && (
                    <>
                      <button type="button" className="icon-btn" onClick={() => pick(-1)} aria-label="Vorheriges Projekt">
                        <ChevronLeft size={16} />
                      </button>
                      <span className="fp-count">
                        {fi + 1}/{rows.length}
                      </span>
                      <button type="button" className="icon-btn" onClick={() => pick(1)} aria-label="Nächstes Projekt">
                        <ChevronRight size={16} />
                      </button>
                    </>
                  )}
                </span>
              </header>
              <nav className="fp-tabs">
                {siteSections
                  .filter((s) => s.roles.includes(role))
                  .slice(0, 7)
                  .map((s) => (
                    <Link key={s.key} href={`/projekte/${featured.p.id}/${s.key}`} className={s.key === "uebersicht" ? "on" : ""}>
                      {s.label}
                    </Link>
                  ))}
              </nav>
              <div className="fp-body">
                <Link href={`/projekte/${featured.p.id}/fotos`} className="fp-img">
                  {featured.p.image ? <img src={featured.p.image} alt="" /> : <span className="fp-noimg">{featured.p.name.slice(0, 1)}</span>}
                  <span className="fp-imgbtn">
                    <Camera size={14} /> Bilder ansehen
                  </span>
                </Link>
                <div className="fp-info">
                  <div className="fp-prog">
                    <span>Projektfortschritt</span>
                    <strong>{featured.s.progress} %</strong>
                  </div>
                  <span className="bar">
                    <i style={{ width: `${featured.s.progress}%` }} />
                  </span>
                  <dl className="fp-facts">
                    <div>
                      <dt>
                        <CalendarClock size={14} />
                      </dt>
                      <dd>
                        <b>
                          {fmt(featured.p.start)} – {fmt(featured.p.end)}
                        </b>
                        <small>{featured.s.daysLeft !== null && (featured.s.daysLeft < 0 ? `${-featured.s.daysLeft} Tage drüber` : `noch ${featured.s.daysLeft} Tage`)}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <Users size={14} />
                      </dt>
                      <dd>
                        <b>Projektleitung</b>
                        <small>{featured.p.managerId ? employeeName(data, featured.p.managerId) : "–"}</small>
                      </dd>
                    </div>
                    <div>
                      <dt>
                        <FileText size={14} />
                      </dt>
                      <dd>
                        <b>Kunde</b>
                        <small>{featured.p.client || "–"}</small>
                      </dd>
                    </div>
                  </dl>
                  {featured.p.description && <p className="fp-desc">{featured.p.description}</p>}
                  <div className="fp-btns">
                    <Link href={`/projekte/${featured.p.id}`} className="btn btn-primary">
                      Zum Projekt <ArrowRight size={15} />
                    </Link>
                    {manager && featured.p.status !== "abgeschlossen" && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          if (!window.confirm(`„${featured.p.name}“ abschließen?`)) return;
                          save("projects", { ...featured.p, status: "abgeschlossen" }, `${featured.p.name} abgeschlossen`);
                          notify("Projekt abgeschlossen");
                        }}
                      >
                        <CheckCircle2 size={15} /> Projekt abschließen
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </section>
          )}

          {featured && (
            <section className="card d-over">
              <header className="card-header">
                <h2>Projektübersicht</h2>
                <Link href={`/projekte/${featured.p.id}/struktur`} className="link-btn">
                  Details <ArrowRight size={13} />
                </Link>
              </header>
              <div className="ov4">
                <span>
                  <b className="t-blue">{featured.s.areas.length}</b>
                  <small>Bereiche</small>
                </span>
                <span>
                  <b className="t-blue">{featured.s.inWork.length}</b>
                  <small>in Arbeit</small>
                </span>
                <span>
                  <b className="t-red">{featured.s.overduePoints.length}</b>
                  <small>Überfällig</small>
                </span>
                <span>
                  <b>{featured.s.duePoints.length}</b>
                  <small>bald fällig</small>
                </span>
              </div>
              <ul className="ov-bars">
                {featured.s.areas.slice(0, 4).map(({ node, progress }) => (
                  <li key={node.id}>
                    <span title={node.title}>{node.title}</span>
                    <span className="bar">
                      <i style={{ width: `${progress}%` }} />
                    </span>
                    <b>{progress} %</b>
                  </li>
                ))}
                {featured.s.areas.length === 0 && <li className="dl-empty">Noch keine Bereiche.</li>}
              </ul>
            </section>
          )}

          {featured && <WeekPlan project={featured.p} />}

          {featured && (
            <section className="card d-team">
              <header className="card-header">
                <h2>Team auf der Baustelle</h2>
                <Link href={`/projekte/${featured.p.id}/plan`} className="link-btn">
                  Plan <ArrowRight size={13} />
                </Link>
              </header>
              <div className="team-grid">
                {projectTeam(data, featured.p)
                  .slice(0, 9)
                  .map((e) => (
                    <span key={e.id} className="tg-m" title={`${e.name} · ${e.role}`}>
                      <EmpAvatar id={e.id} size={40} />
                      <small>{e.name.split(" ")[0]}</small>
                    </span>
                  ))}
                {manager && (
                  <button type="button" className="tg-m tg-add" onClick={() => setInvite(true)}>
                    <span>
                      <UserPlus size={16} />
                    </span>
                    <small>Einladen</small>
                  </button>
                )}
              </div>
            </section>
          )}

          <section className="card d-act">
            <header className="card-header">
              <h2>Letzte Aktivitäten</h2>
            </header>
            {activity.length === 0 && <p className="dl-empty">Noch nichts passiert.</p>}
            <ul className="act-list">
              {activity.map((a) => {
                const ic = activityIcon(a.text);
                return (
                  <li key={a.id}>
                    <span className={`act-ic t-${ic.tone}`}>{ic.icon}</span>
                    <Link href={`/projekte/${a.projectId}`}>
                      <strong>{a.text}</strong>
                      <small>
                        {a.by ? `${employeeName(data, a.by)} · ` : ""}
                        {byId.get(a.projectId)?.name}
                      </small>
                    </Link>
                    <time>{ago(a.at)}</time>
                  </li>
                );
              })}
            </ul>
          </section>

          <section className="card d-tasks">
            <header className="card-header">
              <h2>
                <ListChecks size={16} /> Meine Aufgaben
              </h2>
              <Link href="/aufgaben" className="link-btn">
                Alle <ArrowRight size={13} />
              </Link>
            </header>
            <TaskList tasks={tasks} limit={5} />
          </section>

          <section className="card d-def">
            <header className="card-header">
              <h2>
                <AlertTriangle size={16} /> Offene Mängel
              </h2>
            </header>
            {defects.length === 0 && (
              <p className="dl-empty">
                <CheckCircle2 size={15} /> Keine offenen Mängel.
              </p>
            )}
            <ul className="def-list">
              {defects.map(({ p, i }) => (
                <li key={i.id}>
                  <Link href={`/projekte/${p.id}/maengel`}>
                    {i.photo ? <img src={i.photo} alt="" /> : <span className="def-noimg" />}
                    <span>
                      <strong>{i.title}</strong>
                      <small>
                        {L.severity[i.severity].label} · {i.location || p.name}
                        {i.due ? ` · bis ${fmtShort(i.due)}` : ""}
                      </small>
                    </span>
                    <span className={`pill pill-${i.severity === "kritisch" || i.severity === "hoch" ? "red" : i.severity === "mittel" ? "amber" : "blue"}`}>{L.severity[i.severity].label}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          <section className="card d-photos">
            <header className="card-header">
              <h2>
                <Camera size={16} /> Neueste Fotos
              </h2>
              {featured && (
                <Link href={`/projekte/${featured.p.id}/fotos`} className="link-btn">
                  Alle <ArrowRight size={13} />
                </Link>
              )}
            </header>
            {photos.length === 0 && <p className="dl-empty">Noch keine Fotos.</p>}
            <div className="ph-grid">
              {photos.slice(0, 6).map(({ p, ph }, i) => (
                <Link key={ph.id} href={`/projekte/${p.id}/fotos`} title={ph.caption}>
                  <img src={ph.dataUrl} alt={ph.caption} />
                  {i === 5 && photos.length > 6 && <span>+{photos.length - 6}</span>}
                </Link>
              ))}
            </div>
          </section>
        </div>
      )}
      {invite && featured && <InviteDialog project={featured.p} onClose={() => setInvite(false)} />}
    </div>
  );
}

/** This week of a project: who works when (from the plan). */
function WeekPlan({ project }: { project: Project }) {
  const { data } = useStore();
  const mon = startOfWeek(today());
  const days = [0, 1, 2, 3, 4].map((i) => addDays(mon, i));
  const t = today();
  const jobs = data.jobs.filter((j) => j.projectId === project.id && !j.symbol && j.end >= mon && j.start <= days[4]);
  const people = [...new Set(jobs.map((j) => j.employeeId))].slice(0, 6);
  return (
    <section className="card d-plan">
      <header className="card-header">
        <h2>Wochenplan</h2>
        <Link href={`/projekte/${project.id}/plan`} className="link-btn">
          Plan öffnen <ArrowRight size={13} />
        </Link>
      </header>
      <div className="wp">
        <div className="wp-head">
          <span />
          {days.map((d) => (
            <span key={d} className={d === t ? "now" : ""}>
              {weekdayShort(d)}
            </span>
          ))}
        </div>
        {people.length === 0 && <p className="dl-empty">Diese Woche ist nichts eingeplant.</p>}
        {people.map((id) => (
          <div key={id} className="wp-row">
            <span className="wp-name">{rowName(data, project, id).split(" ")[0]}</span>
            {days.map((d) => {
              const j = jobs.find((x) => x.employeeId === id && inRange(d, x.start, x.end));
              return <span key={d} className={`wp-cell ${d === t ? "now" : ""}`}>{j && <i style={{ background: j.color }} title={j.title} />}</span>;
            })}
          </div>
        ))}
      </div>
    </section>
  );
}

export function Panel({ title, icon, empty, wide, children, action }: { title: string; icon: ReactNode; empty: ReactNode; wide?: boolean; children: ReactNode[] | ReactNode; action?: ReactNode }) {
  const list = Array.isArray(children) ? children.flat().filter(Boolean) : children ? [children] : [];
  return (
    <section className={`card dash-panel ${wide ? "wide" : ""}`}>
      <header className="card-header">
        <h2>
          {icon} {title}
        </h2>
        {action}
      </header>
      {list.length ? <div className="dl-list">{list}</div> : <p className="dl-empty">{empty}</p>}
    </section>
  );
}

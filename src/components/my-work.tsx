"use client";

import { AlertTriangle, CalendarDays, Camera, CheckCircle2, MapPin } from "lucide-react";
import Link from "next/link";
import { addDays, fmt, inRange, isWeekend, today, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { pathLabel, shortPath } from "@/lib/site";
import { currentUser, myProjects, useStore } from "@/lib/store";
import type { Job } from "@/lib/types";
import { useEditor } from "./shell";
import { PhotoAddButton } from "./site";
import { Badge, Dot, Empty } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend";
}

/** Home of a worker: today's jobs, the week ahead and the sites they are on. */
export function MyWork() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const me = currentUser(data);
  const t = today();
  const mine = data.jobs.filter((j) => j.employeeId === me?.id);
  const todayJobs = mine.filter((j) => inRange(t, j.start, j.end)).sort((a, b) => Number(a.done) - Number(b.done));
  const where = data.projects.filter((p) => todayJobs.some((j) => j.projectId === p.id));
  const absence = data.absences.find((a) => a.employeeId === me?.id && inRange(t, a.start, a.end));
  const sites = myProjects(data);
  const rank = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };
  const defects = data.issues
    .filter((i) => i.assigneeId === me?.id && i.status !== "erledigt")
    .sort((a, b) => rank[a.severity] - rank[b.severity] || (a.due || "9").localeCompare(b.due || "9"));

  const week: { date: string; jobs: Job[] }[] = [];
  for (let d = addDays(t, 1); week.length < 5; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;
    week.push({ date: d, jobs: mine.filter((j) => inRange(d, j.start, j.end)) });
  }

  const toggle = (j: Job) => {
    save("jobs", { ...j, done: !j.done }, `${me?.name}: „${j.title}“ ${!j.done ? "erledigt" : "wieder offen"}`);
    notify(!j.done ? "Erledigt ✓" : "Wieder offen");
  };

  return (
    <div className="page mywork">
      <header className="hero">
        <div>
          <h1>
            {greeting()}, {me?.name.split(" ")[0]}
          </h1>
          <p>
            {weekdayShort(t)}, {fmt(t)}
            {where.length > 0 && (
              <>
                {" "}
                · heute auf{" "}
                {where.map((p) => (
                  <Link key={p.id} href={`/projekte/${p.id}`} className="hero-site">
                    <MapPin size={13} /> {p.name}
                  </Link>
                ))}
              </>
            )}
          </p>
        </div>
        {absence && <Badge tone="red">Heute: {absence.type === "urlaub" ? "Urlaub" : absence.type === "krank" ? "Krankenstand" : "Abwesend"}</Badge>}
      </header>

      <section className="card">
        <header className="card-header">
          <h2>Heute zu tun</h2>
          <span className="muted small">
            {todayJobs.filter((j) => j.done).length} von {todayJobs.length} erledigt
          </span>
        </header>
        {todayJobs.length === 0 ? (
          <Empty>Für heute sind keine Aufgaben eingetragen.</Empty>
        ) : (
          <ul className="job-list">
            {todayJobs.map((j) => {
              const p = data.projects.find((x) => x.id === j.projectId);
              return (
                <li key={j.id} className={j.done ? "done" : ""} style={{ "--c": j.color } as React.CSSProperties}>
                  <button type="button" className="job-check" onClick={() => toggle(j)} aria-label={j.done ? "Wieder öffnen" : "Erledigt"}>
                    {j.done ? "✓" : ""}
                  </button>
                  <div className="job-main">
                    <strong>{j.title}</strong>
                    <small>
                      {p && (
                        <Link href={`/projekte/${p.id}`}>
                          <Dot color={p.color} /> {p.name}
                        </Link>
                      )}
                      {j.nodeId && <span> · {pathLabel(data.siteNodes, j.nodeId)}</span>}
                      {j.end !== j.start && <span> · bis {fmt(j.end)}</span>}
                    </small>
                    {j.note && <p>{j.note}</p>}
                  </div>
                  {p && <PhotoAddButton projectId={p.id} nodeId={j.nodeId} className="btn btn-sm" label="Foto" />}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {defects.length > 0 && (
        <section className="card">
          <header className="card-header">
            <h2>
              <AlertTriangle size={15} /> Meine Mängel
            </h2>
            <span className="muted small">{defects.length} offen</span>
          </header>
          <ul className="defect-list">
            {defects.map((i) => {
              const p = data.projects.find((x) => x.id === i.projectId);
              const late = i.due && i.due < t;
              return (
                <li key={i.id}>
                  <button type="button" className="defect-open" onClick={() => openEditor({ kind: "issue", item: i })}>
                    {i.photo ? <img src={i.photo} alt="" /> : <span className={`defect-dot sev-${i.severity}`} />}
                    <span>
                      <strong>{i.title}</strong>
                      <small>
                        {p?.name}
                        {i.nodeId ? ` · ${shortPath(data.siteNodes, i.nodeId)}` : ""} · <span className={late ? "text-red" : ""}>bis {fmt(i.due)}</span> · {L.severity[i.severity].label}
                      </small>
                    </span>
                  </button>
                  <button type="button" className="btn btn-sm btn-primary" onClick={() => openEditor({ kind: "issue", item: { ...i, status: "erledigt" } })}>
                    <CheckCircle2 size={14} /> Behoben
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <header className="card-header">
          <h2>
            <CalendarDays size={15} /> Die nächsten Tage
          </h2>
        </header>
        <div className="week-strip">
          {week.map((d) => (
            <div key={d.date} className="week-day">
              <span>
                {weekdayShort(d.date)} <small>{fmt(d.date).slice(0, 6)}</small>
              </span>
              {d.jobs.length ? (
                d.jobs.map((j) => (
                  <span key={j.id} className="week-job" style={{ background: j.color }} title={j.title}>
                    {j.title}
                  </span>
                ))
              ) : (
                <small className="muted">–</small>
              )}
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <header className="card-header">
          <h2>Meine Projekte</h2>
        </header>
        {sites.length ? (
          <ul className="compact-list">
            {sites.map((p) => (
              <li key={p.id}>
                <Link href={`/projekte/${p.id}`}>
                  <Dot color={p.color} />
                  <strong>{p.name}</strong>
                  <span className="muted">{p.location}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>Du bist noch in keinem Projekt.</Empty>
        )}
        <p className="hint">
          <Camera size={12} /> Fotos und Mängel erfasst du im Projekt unter „Struktur“ direkt beim Punkt.
        </p>
      </section>
    </div>
  );
}

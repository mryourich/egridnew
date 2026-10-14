"use client";

import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { fmt, inRange, today, weekdayLong } from "@/lib/date";
import { pathLabel, siteProgress } from "@/lib/site";
import { currentUser, employeeName, fmtStamp, isManager, myProjects, useStore } from "@/lib/store";
import { myTasks } from "@/lib/tasks";
import type { Data, Job, Project } from "@/lib/types";
import { TaskList } from "./my-tasks";
import { useEditor } from "./shell";

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend";
}

/** Start for everybody: what is mine today, my projects, what happened. Nothing else. */
export function Home() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const me = currentUser(data);
  const t = today();
  const tasks = myTasks(data);
  const late = tasks.filter((x) => x.overdue).length;
  const projects = myProjects(data);
  const todayJobs = data.jobs.filter((j) => j.employeeId === me?.id && !j.symbol && inRange(t, j.start, j.end));
  const absence = data.absences.find((a) => a.employeeId === me?.id && inRange(t, a.start, a.end));
  const mine = new Set(projects.map((p) => p.id));
  const activity = data.activity.filter((a) => mine.has(a.projectId)).slice(0, 6);

  const toggle = (j: Job) => {
    save("jobs", { ...j, done: !j.done }, `${me?.name}: „${j.title}“ ${!j.done ? "erledigt" : "wieder offen"}`);
    notify(!j.done ? "Erledigt ✓" : "Wieder offen");
  };

  return (
    <div className="page home">
      <header className="home-head">
        <div>
          <p className="home-date">
            {weekdayLong(t)}, {fmt(t)}
          </p>
          <h1>
            {greeting()}, {me?.name.split(" ")[0]}
          </h1>
          <p className="home-sum">
            {tasks.length === 0 ? "Dir ist gerade nichts zugewiesen." : `${tasks.length} ${tasks.length === 1 ? "Aufgabe" : "Aufgaben"} offen`}
            {late > 0 && <span className="late"> · {late} überfällig</span>}
            {absence && <span> · heute {absence.type === "urlaub" ? "Urlaub" : absence.type === "krank" ? "Krankenstand" : "abwesend"}</span>}
          </p>
        </div>
        {isManager(data) && (
          <button type="button" className="btn" onClick={() => openEditor({ kind: "project" })}>
            <Plus size={15} /> Neues Projekt
          </button>
        )}
      </header>

      <div className="home-grid">
        <div className="home-col">
          {todayJobs.length > 0 && (
            <section className="box">
              <h2>Heute eingeplant</h2>
              <ul className="rows">
                {todayJobs.map((j) => (
                  <li key={j.id} className={j.done ? "done" : ""}>
                    <input type="checkbox" className="tree-check" checked={j.done} onChange={() => toggle(j)} aria-label={`${j.title} erledigt`} />
                    <span className="row-main">
                      <strong>{j.title}</strong>
                      <small>
                        {data.projects.find((p) => p.id === j.projectId)?.name}
                        {j.nodeId ? ` · ${pathLabel(data.siteNodes, j.nodeId)}` : ""}
                      </small>
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="box">
            <h2>
              Meine Aufgaben
              {tasks.length > 0 && (
                <Link href="/aufgaben" className="box-link">
                  Alle {tasks.length}
                </Link>
              )}
            </h2>
            <TaskList tasks={tasks} limit={7} compact />
          </section>
        </div>

        <div className="home-col">
          <section className="box">
            <h2>
              Projekte
              <Link href="/projekte" className="box-link">
                Alle
              </Link>
            </h2>
            {projects.length === 0 ? (
              <p className="box-empty">Noch kein Projekt.</p>
            ) : (
              <ul className="rows">
                {projects.map((p) => (
                  <li key={p.id}>
                    <ProjectRow data={data} project={p} />
                  </li>
                ))}
              </ul>
            )}
          </section>

          {activity.length > 0 && (
            <section className="box">
              <h2>Zuletzt</h2>
              <ul className="feed">
                {activity.map((a) => (
                  <li key={a.id}>
                    <span>{a.text}</span>
                    <small>
                      {a.by ? `${employeeName(data, a.by)} · ` : ""}
                      {fmtStamp(a.at)}
                    </small>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}

/** One line per project: name, where, progress, open defects. */
export function ProjectRow({ data, project: p }: { data: Data; project: Project }) {
  const progress = siteProgress(data, p.id);
  const issues = data.issues.filter((i) => i.projectId === p.id && i.status !== "erledigt").length;
  return (
    <Link href={`/projekte/${p.id}`} className="prow">
      {p.clientImage ? <img className="prow-logo" src={p.clientImage} alt={p.client} /> : <i className="prow-dot" style={{ background: p.color }} />}
      <span className="row-main">
        <strong>{p.name}</strong>
        <small>{[p.code, p.client, p.location].filter(Boolean).join(" · ")}</small>
      </span>
      {issues > 0 && <span className="prow-issues">{issues} {issues === 1 ? "Mangel" : "Mängel"}</span>}
      <span className="prow-progress" title={`${progress} % erledigt`}>
        <span className="bar">
          <span style={{ width: `${progress}%` }} />
        </span>
        <b>{progress} %</b>
      </span>
      <ChevronRight size={16} className="prow-go" />
    </Link>
  );
}

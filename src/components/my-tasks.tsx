"use client";

import { AlertTriangle, CheckCircle2, ListChecks } from "lucide-react";
import Link from "next/link";
import { fmtShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { currentUser, useStore } from "@/lib/store";
import { myTasks, taskHref, type MyTask } from "@/lib/tasks";
import { EmpAvatar } from "./person";

const SEV_PILL: Record<string, string> = { kritisch: "red", hoch: "red", mittel: "amber", niedrig: "blue" };

/** Assigned points and defects – tick a point off right here. */
export function TaskList({ tasks, limit, compact }: { tasks: MyTask[]; limit?: number; compact?: boolean }) {
  const { data, save, notify } = useStore();
  const me = currentUser(data);
  const shown = limit ? tasks.slice(0, limit) : tasks;
  const done = (t: MyTask) => {
    if (t.kind !== "punkt") return;
    save("siteNodes", { ...t.node, status: "erledigt" }, `${me?.name}: „${t.title}“ erledigt`);
    notify(`„${t.title}“ erledigt ✓`);
  };
  if (!tasks.length)
    return (
      <p className="dl-empty">
        <CheckCircle2 size={15} /> Nichts offen – dir ist gerade nichts zugewiesen.
      </p>
    );
  return (
    <ul className={`task-list ${compact ? "compact" : ""}`}>
      {shown.map((t) => (
        <li key={`${t.kind}-${t.id}`}>
          {t.kind === "punkt" ? (
            <input type="checkbox" className="tree-check" onChange={() => done(t)} aria-label={`${t.title} erledigt`} />
          ) : (
            <span className="task-ic">
              <AlertTriangle size={14} />
            </span>
          )}
          <span className={`pill pill-${t.kind === "mangel" ? SEV_PILL[t.severity] : t.overdue ? "red" : t.status === "in_arbeit" ? "blue" : "gray"}`}>
            {t.kind === "mangel" ? L.severity[t.severity].label : t.overdue ? "Überfällig" : t.status === "in_arbeit" ? "In Arbeit" : "Offen"}
          </span>
          <Link href={taskHref(t)} className="task-main">
            <strong>{t.title}</strong>
            <small>
              {t.kind === "mangel" ? "Mangel · " : ""}
              {t.project.name}
              {t.where ? ` · ${t.where}` : ""}
            </small>
          </Link>
          <span className={`task-due ${t.overdue ? "late" : ""}`}>{t.due ? fmtShort(t.due) : ""}</span>
          {!compact && me && <EmpAvatar id={me.id} size={26} />}
        </li>
      ))}
      {limit && tasks.length > limit && (
        <li className="task-more">
          <Link href="/aufgaben">+ {tasks.length - limit} weitere</Link>
        </li>
      )}
    </ul>
  );
}

export function MyTasksPage() {
  const { data } = useStore();
  const tasks = myTasks(data);
  const points = tasks.filter((t) => t.kind === "punkt");
  const defects = tasks.filter((t) => t.kind === "mangel");
  return (
    <div className="page">
      <header className="page-header">
        <div>
          <h1>Meine Aufgaben</h1>
          <p>Alles, was dir in deinen Projekten zugewiesen ist. Abhaken = erledigt.</p>
        </div>
      </header>
      <div className="stack">
        <section className="card">
          <header className="card-header">
            <h2>
              <ListChecks size={16} /> Punkte <span className="tab-count">{points.length}</span>
            </h2>
          </header>
          <TaskList tasks={points} />
        </section>
        <section className="card">
          <header className="card-header">
            <h2>
              <AlertTriangle size={16} /> Mängel <span className="tab-count">{defects.length}</span>
            </h2>
          </header>
          <TaskList tasks={defects} />
        </section>
      </div>
    </div>
  );
}

"use client";

import { AlertTriangle, Archive, Camera, ClipboardList, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { addDays, fmt, inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { currentUser, employeeName, isManager, myProjects, useStore } from "@/lib/store";
import { useEditor } from "./shell";
import { Avatar, Badge, Empty } from "./ui";

/** Site management home: one card per site with what matters today. */
export function SitesOverview() {
  const { data } = useStore();
  const openEditor = useEditor();
  const manager = isManager(data);
  const me = currentUser(data);
  const t = today();
  const sites = myProjects(data);
  const done = myProjects(data, data.currentUserId, true).filter((p) => p.status === "abgeschlossen");
  const fresh = manager && (sites.length === 0 || data.employees.length < 3);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1>{manager ? "Baustellen" : "Meine Baustellen"}</h1>
          <p>
            {me?.name} · {sites.length} {sites.length === 1 ? "Baustelle" : "Baustellen"} · {fmt(t)}
          </p>
        </div>
        {manager && (
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "project" })}>
              <Plus size={15} /> Neue Baustelle
            </button>
          </div>
        )}
      </header>
      {fresh && (
        <section className="card steps">
          <h2>So startest du</h2>
          <ol>
            <li className={data.employees.length > 1 ? "done" : ""}>
              <strong>Team anlegen</strong> – Monteure und weitere Bauleiter unter <Link href="/team">Team</Link>, jeweils mit ihren Rechten.
            </li>
            <li className={sites.length ? "done" : ""}>
              <strong>Baustelle anlegen</strong> – Name, Ort, Zeitraum.{" "}
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "project" })}>
                Jetzt anlegen
              </button>
            </li>
            <li>
              <strong>Leute einteilen</strong> – auf der Baustelle unter „Team“ oder direkt im Plan.
            </li>
            <li>
              <strong>Plan und Struktur füllen</strong> – Aufgaben per Rechtsklick, Bereiche und Punkte zum Abhaken. Oben rechts auf deinen Namen klicken und als Monteur ansehen.
            </li>
          </ol>
        </section>
      )}
      {sites.length === 0 ? (
        !manager && <Empty>Dir ist derzeit keine Baustelle zugeteilt. Die Bauleitung teilt dich ein.</Empty>
      ) : (
        <div className="site-cards">
          {sites.map((p) => {
            const progress = siteProgress(data, p.id);
            const leaves = data.siteNodes.filter((n) => n.projectId === p.id && !data.siteNodes.some((k) => k.parentId === n.id));
            const open = leaves.filter((n) => n.status !== "erledigt");
            const overdue = open.filter((n) => n.due && n.due < t).length;
            const issues = data.issues.filter((i) => i.projectId === p.id && i.status !== "erledigt").length;
            const photos = data.photos.filter((f) => f.projectId === p.id && f.takenAt.slice(0, 10) >= addDays(t, -6)).length;
            const teamToday = [...new Set(data.assignments.filter((a) => a.projectId === p.id && a.resourceType === "employee" && inRange(t, a.start, a.end)).map((a) => a.resourceId))];
            const jobsToday = data.jobs.filter((j) => j.projectId === p.id && inRange(t, j.start, j.end));
            const report = data.reports.some((r) => r.projectId === p.id && r.date === t);
            return (
              <Link key={p.id} href={`/baustellen/${p.id}`} className="site-card" style={{ "--c": p.color } as CSSProperties}>
                <div className="sc-top">
                  <span className="sc-code">{p.code}</span>
                  {p.status === "aktiv" && !report && <span className="sc-flag">Tagesbericht fehlt</span>}
                </div>
                <h2>{p.name}</h2>
                <p className="muted">
                  {p.location} · {p.client}
                </p>
                <div className="sc-progress">
                  <div>
                    <span style={{ width: `${progress}%` }} />
                  </div>
                  <strong>{progress} %</strong>
                </div>
                <div className="sc-stats">
                  <span title="Offene Punkte">
                    <ListChecks size={14} /> {open.length}
                    {overdue > 0 && <em>{overdue} überfällig</em>}
                  </span>
                  <span title="Offene Mängel" className={issues ? "warn" : ""}>
                    <AlertTriangle size={14} /> {issues}
                  </span>
                  <span title="Fotos der letzten 7 Tage">
                    <Camera size={14} /> {photos}
                  </span>
                  <span title="Aufgaben heute">
                    <ClipboardList size={14} /> {jobsToday.length}
                  </span>
                </div>
                <div className="sc-team">
                  <span className="avatar-stack">
                    {teamToday.slice(0, 7).map((id) => (
                      <Avatar key={id} name={employeeName(data, id)} size={26} />
                    ))}
                  </span>
                  <small className="muted">{teamToday.length ? `${teamToday.length} heute vor Ort` : "heute niemand vor Ort"}</small>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {manager && done.length > 0 && (
        <details className="done-sites">
          <summary>
            <Archive size={14} /> Abgeschlossene Baustellen ({done.length})
          </summary>
          <ul className="compact-list">
            {done.map((p) => (
              <li key={p.id}>
                <Link href={`/baustellen/${p.id}`}>
                  <Badge>{p.code}</Badge>
                  <strong>{p.name}</strong>
                  <span className="muted">{p.location}</span>
                </Link>
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

"use client";

import { AlertTriangle, Camera, ClipboardList, ListChecks } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { addDays, fmt, inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { currentUser, employeeName, myProjects, useStore } from "@/lib/store";
import { Avatar, Empty } from "./ui";

/** Site manager home: one card per assigned site with what matters today. */
export function SitesOverview() {
  const { data } = useStore();
  const me = currentUser(data);
  const t = today();
  const sites = myProjects(data);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1>Meine Baustellen</h1>
          <p>
            {me?.name} · {sites.length} {sites.length === 1 ? "Baustelle" : "Baustellen"} · {fmt(t)}
          </p>
        </div>
      </header>
      {sites.length === 0 ? (
        <Empty>Dir ist derzeit keine Baustelle zugeteilt. Die Projektleitung teilt Baustellen im Projekt zu.</Empty>
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
              <Link key={p.id} href={`/teamgrid/${p.id}`} className="site-card" style={{ "--c": p.color } as CSSProperties}>
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
    </div>
  );
}

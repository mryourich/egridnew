"use client";

import { AlertTriangle, Archive, Camera, ClipboardList, ListChecks, Plus } from "lucide-react";
import Link from "next/link";
import type { CSSProperties } from "react";
import { addDays, fmt, inRange, today } from "@/lib/date";
import { siteProgress } from "@/lib/site";
import { currentUser, isManager, myProjects, projectTeam, useStore } from "@/lib/store";
import { useEditor } from "./shell";
import { EmpAvatar } from "./person";
import { Badge, Empty } from "./ui";

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
          <h1>Projekte</h1>
          <p>
            {me?.name} · {sites.length} {sites.length === 1 ? "Projekt" : "Projekte"} · {fmt(t)}
          </p>
        </div>
        {manager && (
          <div className="page-actions">
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "project" })}>
              <Plus size={15} /> Neues Projekt
            </button>
          </div>
        )}
      </header>
      {fresh && (
        <section className="card steps">
          <h2>So startest du</h2>
          <ol>
            <li className={data.employees.length > 1 ? "done" : ""}>
              <strong>Mitarbeiter anlegen</strong> – unter <Link href="/team">Mitarbeiter verwalten</Link> (Menü unten links), mit Profilbild und Rechten.
            </li>
            <li className={sites.length ? "done" : ""}>
              <strong>Projekt anlegen</strong> – es ist privat, bis du jemanden einlädst.{" "}
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "project" })}>
                Jetzt anlegen
              </button>
            </li>
            <li>
              <strong>Leute einladen</strong> – im Projekt unter „Team“ einfach auf die Profilbilder klicken.
            </li>
            <li>
              <strong>Plan und Struktur füllen</strong> – Aufgaben per Rechtsklick, Bereiche und Punkte zum Abhaken. Oben rechts auf deinen Namen klicken und als Monteur ansehen.
            </li>
          </ol>
        </section>
      )}
      {sites.length === 0 ? (
        !manager && <Empty>Du bist noch in keinem Projekt. Sobald dich jemand einlädt, erscheint es hier.</Empty>
      ) : (
        <div className="site-cards">
          {sites.map((p) => {
            const progress = siteProgress(data, p.id);
            const leaves = data.siteNodes.filter((n) => n.projectId === p.id && !data.siteNodes.some((k) => k.parentId === n.id));
            const open = leaves.filter((n) => n.status !== "erledigt");
            const overdue = open.filter((n) => n.due && n.due < t).length;
            const issues = data.issues.filter((i) => i.projectId === p.id && i.status !== "erledigt").length;
            const photos = data.photos.filter((f) => f.projectId === p.id && f.takenAt.slice(0, 10) >= addDays(t, -6)).length;
            const team = projectTeam(data, p);
            const jobsToday = data.jobs.filter((j) => j.projectId === p.id && inRange(t, j.start, j.end));
            const report = data.reports.some((r) => r.projectId === p.id && r.date === t);
            return (
              <Link key={p.id} href={`/projekte/${p.id}`} className="site-card" style={{ "--c": p.color } as CSSProperties}>
                <div className={`sc-banner ${p.clientImage ? "has" : ""}`}>
                  {p.clientImage ? <img src={p.clientImage} alt={p.client} /> : <span>{p.client || "Kein Kundenbild"}</span>}
                </div>
                <div className="sc-top">
                  {p.image && <img className="sc-image" src={p.image} alt="" />}
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
                    {team.slice(0, 7).map((e) => (
                      <EmpAvatar key={e.id} id={e.id} size={26} />
                    ))}
                  </span>
                  <small className="muted">{team.length} im Team</small>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      {manager && done.length > 0 && (
        <details className="done-sites">
          <summary>
            <Archive size={14} /> Abgeschlossene Projekte ({done.length})
          </summary>
          <ul className="compact-list">
            {done.map((p) => (
              <li key={p.id}>
                <Link href={`/projekte/${p.id}`}>
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

"use client";

import { AlertTriangle, CalendarOff, FolderKanban, Plus, UserCheck, UserX } from "lucide-react";
import Link from "next/link";
import { useState, type CSSProperties } from "react";
import { fmt, inRange, today, weekdayLong } from "@/lib/date";
import * as L from "@/lib/labels";
import { currentUser, isManager, myProjects, projectTeam, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { EmpAvatar } from "./person";
import { useEditor } from "./shell";
import { Kpi } from "./ui";

function greeting() {
  const h = new Date().getHours();
  return h < 11 ? "Guten Morgen" : h < 18 ? "Guten Tag" : "Guten Abend";
}

/** Start for the office: who is on which project today – and who is not on any. */
export function StartBoard() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const manager = isManager(data);
  const me = currentUser(data);
  const t = today();
  const projects = myProjects(data);
  const [dragId, setDragId] = useState("");
  const [over, setOver] = useState("");

  const inAny = new Set(projects.flatMap((p) => projectTeam(data, p).map((e) => e.id)));
  const unassigned = data.employees.filter((e) => e.active && !inAny.has(e.id));
  const absentToday = data.absences.filter((a) => inRange(t, a.start, a.end));
  const absence = (id: string) => absentToday.find((a) => a.employeeId === id);
  const jobToday = (projectId: string, id: string) => data.jobs.find((j) => j.projectId === projectId && j.employeeId === id && !j.symbol && inRange(t, j.start, j.end));
  const busy = new Set(data.jobs.filter((j) => !j.symbol && inRange(t, j.start, j.end) && projects.some((p) => p.id === j.projectId)).map((j) => j.employeeId));
  const openIssues = data.issues.filter((i) => i.status !== "erledigt" && projects.some((p) => p.id === i.projectId)).length;

  const invite = (p: Project, id: string) => {
    if (projectTeam(data, p).some((e) => e.id === id)) return;
    const e = data.employees.find((x) => x.id === id);
    save("projects", { ...p, members: [...p.members, id] }, `${e?.name} zu ${p.name} eingeladen`);
    notify(`${e?.name} → ${p.name}`);
  };

  return (
    <div className="page page-wide">
      <header className="hero">
        <div>
          <h1>
            {greeting()}, {me?.name.split(" ")[0]}
          </h1>
          <p>
            {weekdayLong(t)}, {fmt(t)} · {data.company.name}
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

      <div className="kpi-grid">
        <Kpi icon={FolderKanban} label="Meine Projekte" value={projects.length} />
        <Kpi icon={UserCheck} label="Heute eingeplant" value={busy.size} hint={`von ${inAny.size} im Team`} tone="green" />
        <Kpi icon={UserX} label="Nicht zugeordnet" value={unassigned.length} hint="in keinem deiner Projekte" tone={unassigned.length ? "amber" : "green"} />
        <Kpi icon={CalendarOff} label="Heute abwesend" value={absentToday.length} tone="red" />
        <Kpi icon={AlertTriangle} label="Offene Mängel" value={openIssues} tone={openIssues ? "red" : "green"} />
      </div>

      <div className="start-board">
        {projects.map((p) => {
          const team = projectTeam(data, p);
          return (
            <section
              key={p.id}
              className={`sb-col ${over === p.id ? "over" : ""}`}
              style={{ "--c": p.color } as CSSProperties}
              onDragOver={(e) => {
                if (!manager || !dragId) return;
                e.preventDefault();
                setOver(p.id);
              }}
              onDragLeave={() => setOver("")}
              onDrop={(e) => {
                e.preventDefault();
                setOver("");
                if (dragId) invite(p, dragId);
                setDragId("");
              }}
            >
              <Link href={`/projekte/${p.id}`} className="sb-head">
                {p.image ? <img src={p.image} alt="" /> : <i className="sb-dot" />}
                <span>
                  <small>{p.code}</small>
                  <strong>{p.name}</strong>
                </span>
                <em>{team.length}</em>
              </Link>
              <ul>
                {team.map((e) => {
                  const ab = absence(e.id);
                  const job = jobToday(p.id, e.id);
                  return (
                    <li key={e.id} draggable={manager} onDragStart={() => setDragId(e.id)} onDragEnd={() => setDragId("")}>
                      <EmpAvatar id={e.id} size={30} />
                      <span>
                        <strong>{e.name}</strong>
                        {ab ? <small className="text-red">{L.absenceType[ab.type].label}</small> : job ? <small>{job.title}</small> : <small className="muted">heute keine Aufgabe</small>}
                      </span>
                      {job && !ab && <i className="sb-job" style={{ background: job.color }} />}
                    </li>
                  );
                })}
              </ul>
              {manager && <p className="sb-drop">Person hierher ziehen = einladen</p>}
            </section>
          );
        })}

        <section className="sb-col sb-free">
          <div className="sb-head">
            <i className="sb-dot" />
            <span>
              <small>ohne Projekt</small>
              <strong>Nicht zugeordnet</strong>
            </span>
            <em>{unassigned.length}</em>
          </div>
          <ul>
            {unassigned.map((e) => {
              const ab = absence(e.id);
              return (
                <li key={e.id} draggable={manager} onDragStart={() => setDragId(e.id)} onDragEnd={() => setDragId("")}>
                  <EmpAvatar id={e.id} size={30} />
                  <span>
                    <strong>{e.name}</strong>
                    {ab ? <small className="text-red">{L.absenceType[ab.type].label}</small> : <small className="muted">{e.role}</small>}
                  </span>
                  {manager && projects.length > 0 && (
                    <select
                      className="sb-invite"
                      value=""
                      aria-label={`${e.name} einladen`}
                      onChange={(ev) => {
                        const p = projects.find((x) => x.id === ev.target.value);
                        if (p) invite(p, e.id);
                      }}
                    >
                      <option value="">+ einladen</option>
                      {projects.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.code} · {p.name}
                        </option>
                      ))}
                    </select>
                  )}
                </li>
              );
            })}
            {unassigned.length === 0 && <li className="sb-empty">Alle sind in einem Projekt.</li>}
          </ul>
        </section>
      </div>
      {projects.length === 0 && manager && (
        <p className="muted">
          Noch kein Projekt. <button className="link-btn" type="button" onClick={() => openEditor({ kind: "project" })}>Projekt anlegen</button>, dann Leute aus „Nicht zugeordnet“ hineinziehen.
        </p>
      )}
    </div>
  );
}

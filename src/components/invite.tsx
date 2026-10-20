"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { inRange, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { isManager, projectTeam, roleLabel, roleOf, useStore } from "@/lib/store";
import type { Project } from "@/lib/types";
import { EmpAvatar } from "./person";
import { Empty, Modal, Portal, SearchInput } from "./ui";

/** Who is on the project, plus the pool to invite from – one click on the picture invites or removes. */
export function InviteDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const { data, save, notify } = useStore();
  const manager = isManager(data);
  const [query, setQuery] = useState("");
  const t = today();
  const q = query.toLowerCase();
  const team = projectTeam(data, project);
  const pool = data.employees.filter((e) => e.active && !team.some((m) => m.id === e.id) && (!q || `${e.name} ${e.role} ${e.team} ${e.department}`.toLowerCase().includes(q)));
  const absent = (id: string) => data.absences.find((a) => a.employeeId === id && inRange(t, a.start, a.end));
  const jobToday = (id: string) => data.jobs.find((j) => j.projectId === project.id && j.employeeId === id && !j.symbol && inRange(t, j.start, j.end));

  const invite = (id: string) => {
    const e = data.employees.find((x) => x.id === id);
    save("projects", { ...project, members: [...project.members, id] }, `${e?.name} zu ${project.name} eingeladen`);
    notify(`${e?.name} ist jetzt im Projekt`);
  };
  const removeMember = (id: string) => {
    const e = data.employees.find((x) => x.id === id);
    if (!window.confirm(`${e?.name} aus dem Projekt nehmen? Die Person sieht das Projekt dann nicht mehr.`)) return;
    save("projects", { ...project, members: project.members.filter((m) => m !== id) }, `${e?.name} aus ${project.name} entfernt`);
  };

  const card = (id: string, inProject: boolean) => {
    const e = data.employees.find((x) => x.id === id)!;
    const ab = absent(id);
    const job = jobToday(id);
    const owner = id === project.createdBy;
    return (
      <button
        key={id}
        type="button"
        className={`pool-card ${inProject ? "in" : ""}`}
        disabled={!manager || owner}
        title={owner ? "Hat das Projekt angelegt" : inProject ? "Klicken = aus dem Projekt nehmen" : "Klicken = ins Projekt einladen"}
        onClick={() => (inProject ? removeMember(id) : invite(id))}
      >
        <EmpAvatar id={id} size={48} />
        <strong>{e.name}</strong>
        <small>{e.role || roleLabel[roleOf(e)]}</small>
        {inProject && (ab ? <em className="pc-tag red">{L.absenceType[ab.type].label}</em> : job ? <em className="pc-tag">{job.title}</em> : null)}
        {owner && <em className="pc-owner">Ersteller</em>}
        {manager && !owner && <i className="pc-action">{inProject ? <Minus size={14} /> : <Plus size={14} />}</i>}
      </button>
    );
  };

  return (
    <Portal>
      <Modal title={`Team · ${project.name}`} onClose={onClose} wide>
        <div className="invite-body">
          <section>
            <header className="card-header">
              <h3>
                Im Projekt <span className="tab-count">{team.length}</span>
              </h3>
              <span className="muted small">Nur diese Personen sehen das Projekt.</span>
            </header>
            <div className="pool-grid">{team.map((e) => card(e.id, true))}</div>
          </section>
          {manager && (
            <section>
              <header className="card-header">
                <h3>
                  Einladen <span className="tab-count">{pool.length}</span>
                </h3>
                <SearchInput value={query} onChange={setQuery} placeholder="Name, Funktion, Abteilung…" />
              </header>
              {pool.length ? <div className="pool-grid">{pool.map((e) => card(e.id, false))}</div> : <Empty>{q ? "Niemand gefunden." : "Alle Mitarbeiter sind schon im Projekt."}</Empty>}
            </section>
          )}
        </div>
      </Modal>
    </Portal>
  );
}

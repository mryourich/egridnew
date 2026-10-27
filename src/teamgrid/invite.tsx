"use client";

import { Minus, Plus } from "lucide-react";
import { useState } from "react";
import { inRange, today } from "@/core/date";
import { byRole, canManage, ROLLE_LABEL, teamOf } from "@/core/roles";
import { useStore } from "@/core/store";
import type { Project } from "@/core/types";
import { Avatar, Modal, SearchBox } from "@/core/ui";
import { ABSENCE } from "./plan-kit";

/** Who is on the project, plus everybody to invite from – one click invites or removes. */
export function InviteDialog({ project, onClose }: { project: Project; onClose: () => void }) {
  const { data, save, notify } = useStore();
  const p = data.projects.find((x) => x.id === project.id) ?? project;
  const manage = canManage(data, p);
  const [query, setQuery] = useState("");
  const t = today();
  const q = query.trim().toLowerCase();
  const team = teamOf(p);
  const pool = data.people.filter((e) => e.active && !team.includes(e.id) && (!q || `${e.name} ${e.title} ${ROLLE_LABEL[e.rolle]} ${e.team ?? ""}`.toLowerCase().includes(q))).sort(byRole);
  const absent = (id: string) => data.absences.find((a) => a.employeeId === id && inRange(t, a.start, a.end));
  const jobToday = (id: string) => data.jobs.find((j) => j.projectId === p.id && j.employeeId === id && !j.symbol && inRange(t, j.start, j.end));
  const name = (id: string) => data.people.find((x) => x.id === id)?.name ?? "";

  const invite = (id: string) => {
    save("projects", { ...p, memberIds: [...p.memberIds, id] }, `${name(id)} eingeladen`);
    notify(`${name(id)} sieht das Projekt jetzt`);
  };
  const drop = (id: string) => {
    if (!window.confirm(`${name(id)} aus dem Projekt nehmen? Die Person sieht das Projekt dann nicht mehr.`)) return;
    save("projects", { ...p, memberIds: p.memberIds.filter((m) => m !== id) }, `${name(id)} aus dem Projekt genommen`);
  };

  const card = (id: string, inProject: boolean) => {
    const e = data.people.find((x) => x.id === id);
    if (!e) return null;
    const ab = absent(id);
    const job = jobToday(id);
    const fixed = id === p.createdBy || id === p.managerId;
    return (
      <button key={id} type="button" className={`pool-card ${inProject ? "in" : ""}`} disabled={!manage || fixed} title={fixed ? (id === p.managerId ? "Projektleitung" : "Hat das Projekt angelegt") : inProject ? "Klicken = aus dem Projekt nehmen" : "Klicken = ins Projekt einladen"} onClick={() => (inProject ? drop(id) : invite(id))}>
        <Avatar id={id} size={40} />
        <strong>{e.name}</strong>
        <small>{e.title || ROLLE_LABEL[e.rolle]}</small>
        {inProject && (ab ? <em className="pc-tag red">{ABSENCE[ab.type].label}</em> : job ? <em className="pc-tag">{job.title || "eingeteilt"}</em> : null)}
        {fixed && <em className="pc-owner">{id === p.managerId ? "Leitung" : "Ersteller"}</em>}
        {manage && !fixed && <i className="pc-action">{inProject ? <Minus size={13} /> : <Plus size={13} />}</i>}
      </button>
    );
  };

  return (
    <Modal kicker="Projektteam" title={p.name} onClose={onClose} wide>
      <section className="invite-sec">
        <header>
          <h3>
            Im Projekt <small>{team.length}</small>
          </h3>
          <span className="muted">Nur diese Leute (und ihre Vorgesetzten) sehen das Projekt.</span>
        </header>
        <div className="pool-grid">{team.map((id) => card(id, true))}</div>
      </section>
      {manage && (
        <section className="invite-sec">
          <header>
            <h3>
              Einladen <small>{pool.length}</small>
            </h3>
            <SearchBox value={query} onChange={setQuery} placeholder="Name, Funktion, Rolle…" />
          </header>
          {pool.length ? <div className="pool-grid">{pool.map((e) => card(e.id, false))}</div> : <p className="panel-empty">{q ? "Niemand gefunden." : "Alle sind schon im Projekt."}</p>}
        </section>
      )}
    </Modal>
  );
}

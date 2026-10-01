"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/components/shell";
import { Avatar, Badge, Dot, Empty, PageHeader, Progress, SearchInput, Tabs } from "@/components/ui";
import { addDays, diffDays, fmt, inRange, isWeekend, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { myProjects, useStore, roleOf, roleLabel } from "@/lib/store";
import { EmpAvatar } from "@/components/person";
import type { Data } from "@/lib/types";

type Tab = "employees" | "absences";

function dueTone(date: string): L.Tone {
  const d = diffDays(today(), date);
  return d < 0 ? "red" : d <= 30 ? "amber" : "gray";
}

/** What the person does today – only from projects the viewer can see. */
function todayOf(data: Data, id: string) {
  const t = today();
  const mine = new Set(myProjects(data).map((p) => p.id));
  return data.jobs.find((j) => j.employeeId === id && mine.has(j.projectId) && !j.symbol && inRange(t, j.start, j.end));
}

/** Share of the next 10 working days with planned work. */
function load(data: Data, id: string) {
  let days = 0;
  let booked = 0;
  for (let d = today(); days < 10; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;
    days++;
    if (data.jobs.some((j) => j.employeeId === id && !j.symbol && inRange(d, j.start, j.end))) booked++;
  }
  return Math.round((booked / days) * 100);
}

export default function TeamPage() {
  const { data } = useStore();
  const openEditor = useEditor();
  const [tab, setTab] = useState<Tab>("employees");
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const t = today();

  const kind = { employees: "employee", absences: "absence" } as const;

  return (
    <div className="page">
      <PageHeader
        title="Team"
        subtitle="Alle Mitarbeiter mit Profilbild, Rechten, Urlaub und Krankenstand – eingeladen wird im Projekt unter „Team“"
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: kind[tab] })}>
            <Plus size={16} /> {tab === "employees" ? "Mitarbeiter" : "Abwesenheit"}
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "employees", label: "Mitarbeiter", count: data.employees.length },
          { value: "absences", label: "Abwesenheiten", count: data.absences.filter((a) => a.end >= t).length }
        ]}
      />
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} />
      </div>

      {tab === "employees" && (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Partie · Rechte</th>
                <th>Kontakt</th>
                <th>Qualifikationen</th>
                <th>Heute</th>
                <th className="w-progress">Verplant 2 Wo.</th>
              </tr>
            </thead>
            <tbody>
              {data.employees
                .filter((e) => match(`${e.name} ${e.role} ${e.team}`))
                .map((e) => {
                  const job = todayOf(data, e.id);
                  const p = job ? data.projects.find((x) => x.id === job.projectId) : undefined;
                  const absent = data.absences.find((a) => a.employeeId === e.id && inRange(t, a.start, a.end));
                  const l = load(data, e.id);
                  return (
                    <tr key={e.id} className={`clickable ${e.active ? "" : "inactive"}`} onClick={() => openEditor({ kind: "employee", item: e })}>
                      <td>
                        <span className="cell-person">
                          <EmpAvatar id={e.id} size={30} />
                          <span>
                            <strong>{e.name}</strong>
                            <small>{e.role}</small>
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className="cell-title-stack">
                          {e.team}
                          <Badge tone={roleOf(e) === "monteur" ? "gray" : "blue"}>{roleLabel[roleOf(e)]}</Badge>
                        </span>
                      </td>
                      <td>
                        <small>
                          {e.phone}
                          <br />
                          {e.email}
                        </small>
                      </td>
                      <td>
                        <span className="badge-wrap">
                          {e.qualifications.map((qq) => (
                            <Badge key={qq.name} tone={qq.validUntil ? dueTone(qq.validUntil) : "gray"}>
                              <span title={qq.validUntil ? `gültig bis ${fmt(qq.validUntil)}` : ""}>{qq.name}</span>
                            </Badge>
                          ))}
                        </span>
                      </td>
                      <td>
                        {!e.active ? (
                          <Badge>inaktiv</Badge>
                        ) : absent ? (
                          <Badge tone={L.absenceType[absent.type].tone}>{L.absenceType[absent.type].label}</Badge>
                        ) : p ? (
                          <span className="cell-person" title={job?.title}>
                            <Dot color={p.color} /> {p.code} · {job?.title}
                          </span>
                        ) : (
                          <Badge tone="green">frei</Badge>
                        )}
                      </td>
                      <td>
                        <span className="cell-progress">
                          <Progress value={l} color={l > 90 ? "#ef4444" : undefined} /> {l} %
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "absences" &&
        (data.absences.length === 0 ? (
          <Empty>Keine Abwesenheiten erfasst.</Empty>
        ) : (
          <div className="table-wrap card card-flush">
            <table className="table">
              <thead>
                <tr>
                  <th>Mitarbeiter</th>
                  <th>Art</th>
                  <th>Zeitraum</th>
                  <th className="num">Arbeitstage</th>
                  <th>Notiz</th>
                </tr>
              </thead>
              <tbody>
                {[...data.absences]
                  .sort((a, b) => b.start.localeCompare(a.start))
                  .filter((a) => match(data.employees.find((e) => e.id === a.employeeId)?.name ?? ""))
                  .map((a) => {
                    let wd = 0;
                    for (let d = a.start; d <= a.end; d = addDays(d, 1)) if (!isWeekend(d)) wd++;
                    const name = data.employees.find((e) => e.id === a.employeeId)?.name ?? "–";
                    return (
                      <tr key={a.id} className={`clickable ${a.end < t ? "inactive" : ""}`} onClick={() => openEditor({ kind: "absence", item: a })}>
                        <td>
                          <span className="cell-person">
                            <Avatar name={name} size={22} /> {name}
                          </span>
                        </td>
                        <td>
                          <Badge tone={L.absenceType[a.type].tone}>{L.absenceType[a.type].label}</Badge>
                        </td>
                        <td className="nowrap">
                          {fmt(a.start)} – {fmt(a.end)}
                        </td>
                        <td className="num">{wd}</td>
                        <td className="muted">{a.note}</td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        ))}
    </div>
  );
}

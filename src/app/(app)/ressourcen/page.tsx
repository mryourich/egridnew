"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { useEditor } from "@/components/shell";
import { Avatar, Badge, Dot, Empty, PageHeader, Progress, SearchInput, Tabs } from "@/components/ui";
import { addDays, diffDays, fmt, inRange, isWeekend, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { useStore } from "@/lib/store";
import type { Data, ResourceType } from "@/lib/types";

type Tab = "employees" | "vehicles" | "equipment" | "absences";

function dueTone(date: string): L.Tone {
  const d = diffDays(today(), date);
  return d < 0 ? "red" : d <= 30 ? "amber" : "gray";
}

function currentProject(data: Data, type: ResourceType, id: string) {
  const t = today();
  const a = data.assignments.find((x) => x.resourceType === type && x.resourceId === id && inRange(t, x.start, x.end));
  return a ? data.projects.find((p) => p.id === a.projectId) : undefined;
}

/** Share of the next 10 working days on which the resource is booked. */
function load(data: Data, type: ResourceType, id: string) {
  let days = 0;
  let booked = 0;
  for (let d = today(); days < 10; d = addDays(d, 1)) {
    if (isWeekend(d)) continue;
    days++;
    if (data.assignments.some((a) => a.resourceType === type && a.resourceId === id && inRange(d, a.start, a.end))) booked++;
  }
  return Math.round((booked / days) * 100);
}

export default function ResourcesPage() {
  const { data } = useStore();
  const openEditor = useEditor();
  const [tab, setTab] = useState<Tab>("employees");
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const match = (s: string) => !q || s.toLowerCase().includes(q);
  const t = today();

  const kind = { employees: "employee", vehicles: "vehicle", equipment: "equipment", absences: "absence" } as const;

  return (
    <div className="page">
      <PageHeader
        title="Ressourcen"
        subtitle="Mitarbeiter, Fuhrpark, Geräte und Abwesenheiten"
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: kind[tab] })}>
            <Plus size={16} /> {tab === "employees" ? "Mitarbeiter" : tab === "vehicles" ? "Fahrzeug" : tab === "equipment" ? "Gerät" : "Abwesenheit"}
          </button>
        }
      />
      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "employees", label: "Mitarbeiter", count: data.employees.length },
          { value: "vehicles", label: "Fahrzeuge", count: data.vehicles.length },
          { value: "equipment", label: "Geräte", count: data.equipment.length },
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
                <th>Team</th>
                <th>Kontakt</th>
                <th>Qualifikationen</th>
                <th>Heute</th>
                <th className="w-progress">Auslastung 2 Wo.</th>
              </tr>
            </thead>
            <tbody>
              {data.employees
                .filter((e) => match(`${e.name} ${e.role} ${e.team}`))
                .map((e) => {
                  const p = currentProject(data, "employee", e.id);
                  const absent = data.absences.find((a) => a.employeeId === e.id && inRange(t, a.start, a.end));
                  const l = load(data, "employee", e.id);
                  return (
                    <tr key={e.id} className={`clickable ${e.active ? "" : "inactive"}`} onClick={() => openEditor({ kind: "employee", item: e })}>
                      <td>
                        <span className="cell-person">
                          <Avatar name={e.name} size={26} />
                          <span>
                            <strong>{e.name}</strong>
                            <small>{e.role}</small>
                          </span>
                        </span>
                      </td>
                      <td>{e.team}</td>
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
                          <span className="cell-person">
                            <Dot color={p.color} /> {p.code}
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

      {tab === "vehicles" && (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Fahrzeug</th>
                <th>Typ</th>
                <th className="num">Sitze</th>
                <th>Service / Pickerl</th>
                <th>Status</th>
                <th>Heute</th>
                <th className="w-progress">Auslastung 2 Wo.</th>
              </tr>
            </thead>
            <tbody>
              {data.vehicles
                .filter((v) => match(`${v.name} ${v.plate} ${v.type}`))
                .map((v) => {
                  const p = currentProject(data, "vehicle", v.id);
                  const l = load(data, "vehicle", v.id);
                  return (
                    <tr key={v.id} className="clickable" onClick={() => openEditor({ kind: "vehicle", item: v })}>
                      <td>
                        <strong>{v.name}</strong>
                        <br />
                        <span className="plate">{v.plate}</span>
                      </td>
                      <td>{v.type}</td>
                      <td className="num">{v.seats}</td>
                      <td>
                        <Badge tone={dueTone(v.nextService)}>{fmt(v.nextService)}</Badge>
                      </td>
                      <td>
                        <Badge tone={L.vehicleStatus[v.status].tone}>{L.vehicleStatus[v.status].label}</Badge>
                      </td>
                      <td>{p ? <span className="cell-person"><Dot color={p.color} /> {p.code}</span> : <span className="muted">–</span>}</td>
                      <td>
                        <span className="cell-progress">
                          <Progress value={l} /> {l} %
                        </span>
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </div>
      )}

      {tab === "equipment" && (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Gerät</th>
                <th>Kategorie</th>
                <th>Inventar-Nr.</th>
                <th>Nächste Prüfung</th>
                <th>Status</th>
                <th>Heute</th>
              </tr>
            </thead>
            <tbody>
              {data.equipment
                .filter((x) => match(`${x.name} ${x.category} ${x.serial}`))
                .map((x) => {
                  const p = currentProject(data, "equipment", x.id);
                  return (
                    <tr key={x.id} className="clickable" onClick={() => openEditor({ kind: "equipment", item: x })}>
                      <td>
                        <strong>{x.name}</strong>
                      </td>
                      <td>{x.category}</td>
                      <td className="mono">{x.serial}</td>
                      <td>
                        <Badge tone={dueTone(x.nextInspection)}>{fmt(x.nextInspection)}</Badge>
                      </td>
                      <td>
                        <Badge tone={L.equipmentStatus[x.status].tone}>{L.equipmentStatus[x.status].label}</Badge>
                      </td>
                      <td>{p ? <span className="cell-person"><Dot color={p.color} /> {p.code}</span> : <span className="muted">–</span>}</td>
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

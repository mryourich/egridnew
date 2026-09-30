"use client";

import { Wrench } from "lucide-react";
import { useState } from "react";
import { ServiceList } from "@/components/fleet";
import { DueCard, FleetOnly } from "@/components/fleet-pages";
import { useEditor } from "@/components/shell";
import { Card, Empty, PageHeader } from "@/components/ui";
import { fmt, today } from "@/lib/date";
import { dueList } from "@/lib/fleet";
import * as L from "@/lib/labels";
import { useStore } from "@/lib/store";

export default function WorkshopPage() {
  return (
    <FleetOnly>
      <Workshop />
    </FleetOnly>
  );
}

function Workshop() {
  const { data } = useStore();
  const openEditor = useEditor();
  const [vehicle, setVehicle] = useState("");
  const [year, setYear] = useState(today().slice(0, 4));
  const reported = data.services.filter((s) => s.status === "offen");
  const planned = data.services.filter((s) => s.status === "geplant").sort((a, b) => a.date.localeCompare(b.date));
  const done = data.services.filter((s) => s.status === "erledigt");
  const years = [...new Set([today().slice(0, 4), ...done.map((s) => s.date.slice(0, 4))])].sort().reverse();
  const history = done.filter((s) => (!vehicle || s.vehicleId === vehicle) && (!year || s.date.startsWith(year))).sort((a, b) => b.date.localeCompare(a.date));
  const sum = history.reduce((s, x) => s + x.cost, 0);
  const car = (id: string) => data.vehicles.find((v) => v.id === id);

  return (
    <div className="page">
      <PageHeader
        title="Werkstatt"
        subtitle="Termine ausmachen, Meldungen abarbeiten, Service-Historie"
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "service", item: { status: "geplant" } })}>
            <Wrench size={15} /> Werkstatttermin
          </button>
        }
      />
      <div className="grid-2">
        <DueCard items={dueList(data)} />
        <Card title={`Gemeldet – Termin fehlt (${reported.length})`}>
          <ServiceList entries={reported} empty="Keine offenen Meldungen." />
        </Card>
      </div>
      <Card title={`Geplante Termine (${planned.length})`}>
        <ServiceList entries={planned} empty="Keine Termine geplant." />
      </Card>

      <Card
        title="Service-Historie"
        flush
        actions={
          <span className="history-filter">
            <select value={vehicle} onChange={(e) => setVehicle(e.target.value)} aria-label="Fahrzeug">
              <option value="">Alle Fahrzeuge</option>
              {data.vehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.name} · {v.plate}
                </option>
              ))}
            </select>
            <select value={year} onChange={(e) => setYear(e.target.value)} aria-label="Jahr">
              <option value="">Alle Jahre</option>
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </span>
        }
      >
        {history.length ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Datum</th>
                  <th>Fahrzeug</th>
                  <th>Art</th>
                  <th>Werkstatt</th>
                  <th className="num">km</th>
                  <th className="num">Kosten</th>
                </tr>
              </thead>
              <tbody>
                {history.map((s) => (
                  <tr key={s.id} className="clickable" onClick={() => openEditor({ kind: "service", item: s })}>
                    <td className="nowrap">{fmt(s.date)}</td>
                    <td>
                      <span className="cell-title-stack">
                        <strong>{car(s.vehicleId)?.name ?? "–"}</strong>
                        <small className="muted">{car(s.vehicleId)?.plate}</small>
                      </span>
                    </td>
                    <td>
                      {L.serviceKind[s.kind].icon} {L.serviceKind[s.kind].label}
                      {s.description && <small className="muted block">{s.description}</small>}
                    </td>
                    <td>{s.workshop || "–"}</td>
                    <td className="num">{s.km ? L.num(s.km) : "–"}</td>
                    <td className="num">{s.cost ? L.eur(s.cost) : "–"}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={5}>
                    <strong>Summe</strong> <span className="muted">{history.length} Einträge</span>
                  </td>
                  <td className="num">
                    <strong>{L.eur(sum)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <Empty>Keine erledigten Werkstattbesuche im gewählten Zeitraum.</Empty>
        )}
      </Card>
    </div>
  );
}

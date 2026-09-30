"use client";

import { ArrowLeft, CarFront, Pencil, Wrench } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";
import { BookingList, DueBadge, ServiceList, StateBadge } from "@/components/fleet";
import { FleetOnly } from "@/components/fleet-pages";
import { useEditor } from "@/components/shell";
import { Badge, Empty, Tabs } from "@/components/ui";
import { fmt, fmtShort, today } from "@/lib/date";
import { nowLocal } from "@/lib/fleet";
import * as L from "@/lib/labels";
import { useStore } from "@/lib/store";

type Tab = "historie" | "termine" | "buchungen" | "baustellen";

export default function VehiclePage() {
  return (
    <FleetOnly>
      <Vehicle />
    </FleetOnly>
  );
}

function Vehicle() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const openEditor = useEditor();
  const [tab, setTab] = useState<Tab>("historie");
  const v = data.vehicles.find((x) => x.id === id);
  if (!v) {
    return (
      <div className="page">
        <Empty>
          Fahrzeug nicht gefunden. <Link href="/fuhrpark/fahrzeuge">Zur Fahrzeugliste</Link>
        </Empty>
      </div>
    );
  }
  const now = nowLocal();
  const year = today().slice(0, 4);
  const services = data.services.filter((s) => s.vehicleId === v.id);
  const history = services.filter((s) => s.status === "erledigt").sort((a, b) => b.date.localeCompare(a.date));
  const open = services.filter((s) => s.status !== "erledigt").sort((a, b) => (a.date || "9").localeCompare(b.date || "9"));
  const bookings = data.bookings.filter((b) => b.vehicleId === v.id);
  const upcoming = bookings.filter((b) => !b.returned && b.end >= now).sort((a, b) => a.start.localeCompare(b.start));
  const past = bookings.filter((b) => b.returned || b.end < now).sort((a, b) => b.start.localeCompare(a.start)).slice(0, 20);
  const sites = data.assignments.filter((a) => a.resourceType === "vehicle" && a.resourceId === v.id).sort((a, b) => b.start.localeCompare(a.start));
  const costYear = history.filter((s) => s.date.startsWith(year)).reduce((s, x) => s + x.cost, 0);
  const costAll = history.reduce((s, x) => s + x.cost, 0);
  const driver = data.employees.find((e) => e.id === v.driverId);

  return (
    <div className="page">
      <Link href="/fuhrpark/fahrzeuge" className="back-link">
        <ArrowLeft size={14} /> Fahrzeuge
      </Link>
      <header className="vehicle-head card">
        <span className="vehicle-icon">
          <CarFront size={26} />
        </span>
        <div className="vehicle-title">
          <h1>{v.name}</h1>
          <span>
            <span className="plate">{v.plate}</span> <StateBadge vehicle={v} />
          </span>
        </div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => openEditor({ kind: "vehicle", item: v })}>
            <Pencil size={14} /> Bearbeiten
          </button>
          <button className="btn" type="button" onClick={() => openEditor({ kind: "booking", item: { vehicleId: v.id } })}>
            Buchen
          </button>
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "service", item: { vehicleId: v.id, status: "geplant" } })}>
            <Wrench size={14} /> Werkstatttermin
          </button>
        </div>
        <dl className="facts">
          <div>
            <dt>Art</dt>
            <dd>
              {v.type || "–"} · {v.seats} Sitze
            </dd>
          </div>
          <div>
            <dt>Antrieb</dt>
            <dd>{v.fuel ? L.fuel[v.fuel].label : "–"}</dd>
          </div>
          <div>
            <dt>Kilometer</dt>
            <dd>{v.km ? `${L.num(v.km)} km` : "–"}</dd>
          </div>
          <div>
            <dt>Nutzung</dt>
            <dd>{v.pool ? "Poolfahrzeug" : driver ? `Dienstwagen ${driver.name}` : "–"}</dd>
          </div>
          <div>
            <dt>Service</dt>
            <dd>
              <DueBadge date={v.nextService} />
            </dd>
          </div>
          <div>
            <dt>Pickerl §57a</dt>
            <dd>
              <DueBadge date={v.nextInspection} />
            </dd>
          </div>
          <div>
            <dt>Standort</dt>
            <dd>{v.location || "–"}</dd>
          </div>
          <div>
            <dt>Kosten {year}</dt>
            <dd>
              {L.eur(costYear)} <small className="muted">gesamt {L.eur(costAll)}</small>
            </dd>
          </div>
          {v.vin && (
            <div>
              <dt>Fahrgestellnr.</dt>
              <dd className="mono">{v.vin}</dd>
            </div>
          )}
          {v.note && (
            <div className="wide">
              <dt>Hinweis</dt>
              <dd>{v.note}</dd>
            </div>
          )}
        </dl>
      </header>

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "historie", label: "Service-Historie", count: history.length },
          { value: "termine", label: "Termine & Meldungen", count: open.length },
          { value: "buchungen", label: "Buchungen", count: upcoming.length },
          { value: "baustellen", label: "Baustellen", count: sites.length }
        ]}
      />
      <div className="tab-panel">
        {tab === "historie" &&
          (history.length ? (
            <ol className="svc-timeline">
              {history.map((s) => (
                <li key={s.id}>
                  <button type="button" onClick={() => openEditor({ kind: "service", item: s })}>
                    <span className="tl-icon">{L.serviceKind[s.kind].icon}</span>
                    <span className="tl-body">
                      <strong>{L.serviceKind[s.kind].label}</strong>
                      <span className="muted">
                        {fmt(s.date)}
                        {s.workshop ? ` · ${s.workshop}` : ""}
                        {s.km ? ` · ${L.num(s.km)} km` : ""}
                      </span>
                      {s.description && <span>{s.description}</span>}
                    </span>
                    <span className="tl-cost">{s.cost ? L.eur(s.cost) : ""}</span>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <Empty>Noch keine Werkstattbesuche erfasst. Ein erledigter Termin landet automatisch hier.</Empty>
          ))}
        {tab === "termine" && (
          <div className="card">
            <ServiceList entries={open} empty="Keine offenen Termine oder Meldungen." />
          </div>
        )}
        {tab === "buchungen" && (
          <div className="grid-2">
            <div className="card">
              <h2 className="card-title-sm">Kommend</h2>
              <BookingList bookings={upcoming} empty="Keine Buchungen." showDriver />
            </div>
            <div className="card">
              <h2 className="card-title-sm">Zuletzt</h2>
              <BookingList bookings={past} empty="Noch keine Fahrten." showDriver />
            </div>
          </div>
        )}
        {tab === "baustellen" &&
          (sites.length ? (
            <div className="card">
              <ul className="compact-list">
                {sites.map((a) => {
                  const p = data.projects.find((x) => x.id === a.projectId);
                  return (
                    <li key={a.id}>
                      <Link href={p ? `/projekte/${p.id}` : "#"}>
                        <Badge tone="violet">{p?.code ?? a.label ?? "–"}</Badge>
                        <strong>{p?.name ?? a.label}</strong>
                        <span className="muted">
                          {fmtShort(a.start)} – {fmtShort(a.end)}
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <Empty>Nicht auf einer Baustelle eingeplant. Das macht die Projektleitung in der Ressourcenplanung.</Empty>
          ))}
      </div>
    </div>
  );
}

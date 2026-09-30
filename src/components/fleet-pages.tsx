"use client";

import { AlertTriangle, CalendarClock, CarFront, KeyRound, Plus, Truck, Wrench } from "lucide-react";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { addDays, fmt, fmtShort, isWeekend, startOfWeek, today } from "@/lib/date";
import { dayEnd, dayStart, dueList, myBookings, nowLocal, vehicleState, type Due } from "@/lib/fleet";
import * as L from "@/lib/labels";
import { canManageFleet, currentUser, useStore } from "@/lib/store";
import { BookingFinder, BookingList, FleetBoard, ReportDamageButton, ServiceList } from "./fleet";
import { useEditor } from "./shell";
import { Badge, Card, Empty, Kpi, PageHeader } from "./ui";

/** Fleet pages beyond booking are for the fleet manager only. */
export function FleetOnly({ children }: { children: ReactNode }) {
  const { data } = useStore();
  if (canManageFleet(data)) return <>{children}</>;
  return (
    <div className="page">
      <Empty>
        Dieser Bereich gehört dem Fuhrpark. <Link href="/fuhrpark">Fahrzeug buchen</Link>
      </Empty>
    </div>
  );
}

/** Suggested workshop day: the due date, but never in the past or on a weekend. */
function suggestDay(due: string) {
  let d = due > today() ? due : addDays(today(), 1);
  while (isWeekend(d)) d = addDays(d, 1);
  return d;
}

export function DueCard({ items }: { items: Due[] }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const t = today();
  return (
    <Card title={`Fällig in 30 Tagen (${items.length})`}>
      {items.length ? (
        <ul className="compact-list due-list">
          {items.map((d) => (
            <li key={d.vehicle.id + d.kind}>
              <div className="row-inline">
                <Badge tone={d.date < t ? "red" : "amber"}>{d.date < t ? "überfällig" : fmtShort(d.date)}</Badge>
                <strong>
                  {d.kind === "service" ? "🔧" : "📋"} {d.vehicle.name}
                </strong>
                <span className="muted">
                  {d.kind === "service" ? "Service" : "Pickerl §57a"} · {d.vehicle.plate}
                </span>
                <span className="spacer" />
                {d.open ? (
                  <button type="button" className="btn btn-sm btn-ghost" onClick={() => openEditor({ kind: "service", item: d.open })}>
                    <CalendarClock size={13} /> {d.open.date ? `Termin ${fmtShort(d.open.date)}` : "gemeldet"}
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-sm"
                    onClick={() => {
                      const day = suggestDay(d.date);
                      const last = data.services.filter((s) => s.vehicleId === d.vehicle.id && s.kind === d.kind && s.workshop).sort((a, b) => b.date.localeCompare(a.date))[0];
                      openEditor({ kind: "service", item: { vehicleId: d.vehicle.id, kind: d.kind, status: "geplant", date: day, until: day, workshop: last?.workshop ?? "" } });
                    }}
                  >
                    Termin ausmachen
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="empty">Alles im grünen Bereich – nichts fällig.</p>
      )}
    </Card>
  );
}

/** Start page of the fleet manager. */
export function FleetHome() {
  const { data } = useStore();
  const openEditor = useEditor();
  const me = currentUser(data);
  const t = today();
  const now = nowLocal();
  const states = data.vehicles.map((v) => vehicleState(data, v).key);
  const due = dueList(data);
  const reported = data.services.filter((s) => s.status === "offen");
  const planned = data.services.filter((s) => s.status === "geplant").sort((a, b) => a.date.localeCompare(b.date));
  const todayTrips = data.bookings.filter((b) => !b.returned && b.start <= dayEnd(t) && b.end >= dayStart(t)).sort((a, b) => a.start.localeCompare(b.start));
  const late = data.bookings.filter((b) => !b.returned && b.end < now);

  return (
    <div className="page">
      <header className="hero">
        <div>
          <h1>Fuhrpark</h1>
          <p>
            {me?.name} · {data.vehicles.length} Fahrzeuge · {fmt(t)}
          </p>
        </div>
        <div className="page-actions">
          <button className="btn" type="button" onClick={() => openEditor({ kind: "service", item: { status: "geplant" } })}>
            <Wrench size={15} /> Werkstatttermin
          </button>
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "vehicle" })}>
            <Plus size={15} /> Fahrzeug anlegen
          </button>
        </div>
      </header>

      {data.vehicles.length === 0 && (
        <section className="card steps">
          <h2>So startest du</h2>
          <ol>
            <li>
              <strong>Fahrzeuge anlegen</strong> – Kennzeichen, Service- und Pickerl-Termin. Poolfahrzeuge darf jeder buchen, Dienstwagen gehören einer Person.{" "}
              <button className="link-btn" type="button" onClick={() => openEditor({ kind: "vehicle" })}>
                Jetzt anlegen
              </button>
            </li>
            <li>
              <strong>Werkstatttermine ausmachen</strong> – VYSNpro erinnert dich 30 Tage vorher an Service und Pickerl.
            </li>
            <li>
              <strong>Alle Mitarbeiter buchen selbst</strong> unter „Fahrzeug buchen“ und melden Schäden bei der Rückgabe.
            </li>
          </ol>
        </section>
      )}

      <div className="kpi-grid">
        <Kpi icon={Truck} label="Fahrzeuge" value={data.vehicles.length} hint={`${data.vehicles.filter((v) => v.pool).length} Poolfahrzeuge`} />
        <Kpi icon={KeyRound} label="Heute unterwegs" value={states.filter((s) => s === "unterwegs").length} hint={`${todayTrips.length} Buchungen heute`} tone="cyan" />
        <Kpi icon={Wrench} label="In der Werkstatt" value={states.filter((s) => s === "werkstatt").length} hint={`${planned.length} Termine geplant`} tone="amber" />
        <Kpi icon={AlertTriangle} label="Zu erledigen" value={due.filter((d) => !d.open).length + reported.length} hint={`${reported.length} Meldungen · ${late.length} Rückgaben offen`} tone={due.some((d) => !d.open && d.date < t) || reported.length ? "red" : "green"} />
      </div>

      <div className="grid-2">
        <DueCard items={due} />
        <Card title={`Gemeldete Schäden (${reported.length})`}>
          <ServiceList entries={reported} empty="Keine offenen Meldungen." />
        </Card>
        <Card
          title="Werkstatttermine"
          actions={
            <Link className="btn btn-sm btn-ghost" href="/fuhrpark/werkstatt">
              Alle
            </Link>
          }
        >
          <ServiceList entries={planned.slice(0, 8)} empty="Keine Termine geplant." />
        </Card>
        <Card
          title="Heute unterwegs"
          actions={
            <Link className="btn btn-sm btn-ghost" href="/fuhrpark/buchen">
              Wochenplan
            </Link>
          }
        >
          <BookingList bookings={[...late.filter((b) => !todayTrips.includes(b)), ...todayTrips]} empty="Heute ist kein Fahrzeug gebucht." showDriver />
        </Card>
      </div>
    </div>
  );
}

/** Booking page for everybody: find a free car, own bookings, week board. */
export function BookingPage() {
  const { data } = useStore();
  const openEditor = useEditor();
  const manager = canManageFleet(data);
  const me = currentUser(data);
  const [from, setFrom] = useState(startOfWeek(today()));
  const mine = myBookings(data);
  const myCar = data.vehicles.find((v) => v.driverId === me?.id);
  const vehicles = manager ? data.vehicles : data.vehicles.filter((v) => v.pool || v.driverId === me?.id);

  return (
    <div className="page">
      <PageHeader
        title="Fahrzeug buchen"
        subtitle="Poolfahrzeug reservieren, abholen und zurückgeben"
        actions={
          <>
            <ReportDamageButton />
            <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "booking" })} disabled={!vehicles.length}>
              <CarFront size={15} /> Buchen
            </button>
          </>
        }
      />
      <div className="booking-top">
        <BookingFinder />
        <div className="stack">
          <Card title={`Meine Buchungen (${mine.length})`}>
            <BookingList bookings={mine} empty="Du hast gerade nichts gebucht." />
          </Card>
          {myCar && (
            <Card title="Mein Dienstwagen">
              <div className="my-car">
                <CarFront size={22} />
                <span>
                  <strong>{myCar.name}</strong> <span className="plate">{myCar.plate}</span>
                  <small className="muted">
                    {myCar.km ? `${L.num(myCar.km)} km · ` : ""}Service {fmt(myCar.nextService)}
                    {myCar.nextInspection ? ` · Pickerl ${fmt(myCar.nextInspection)}` : ""}
                  </small>
                </span>
                <ReportDamageButton vehicleId={myCar.id} className="btn btn-sm" />
              </div>
            </Card>
          )}
        </div>
      </div>
      {vehicles.length > 0 && <FleetBoard vehicles={vehicles} from={from} onFrom={setFrom} />}
    </div>
  );
}

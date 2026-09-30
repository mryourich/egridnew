"use client";

import { AlertTriangle, CarFront, ChevronLeft, ChevronRight, KeyRound, Plus, Trash2, Wrench, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from "react";
import { addDays, fmt, fmtShort, isoWeek, isWeekend, holidayName, startOfWeek, today, weekdayShort } from "@/lib/date";
import { bookableVehicles, dayEnd, dayStart, fmtSpan, knownWorkshops, nowLocal, vehicleBusy, vehicleLabel, vehicleState } from "@/lib/fleet";
import * as L from "@/lib/labels";
import { canDelete, canManageFleet, currentUser, uid, useStore } from "@/lib/store";
import type { Booking, ServiceEntry, ServiceKind, ServiceStatus, Vehicle } from "@/lib/types";
import { useEditor } from "./shell";
import { Badge } from "./ui";

const BOOKING_COLOR = "#1463ff";
const SERVICE_COLOR = "#d97706";

function useEscape(onClose: () => void) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
}

function Sheet({ color, title, sub, onClose, children }: { color: string; title: string; sub?: string; onClose: () => void; children: ReactNode }) {
  useEscape(onClose);
  return (
    <div className="sheet-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className="job-pop issue-sheet" style={{ "--c": color } as CSSProperties} role="dialog" aria-label={title}>
        <header>
          <span>
            {title}
            {sub && <small> · {sub}</small>}
          </span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

/** Date + time pair for a local "YYYY-MM-DDTHH:mm" value. */
function DateTime({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [d, t] = value.split("T");
  return (
    <label>
      <span>{label}</span>
      <span className="dt-pair">
        <input type="date" value={d} onChange={(e) => e.target.value && onChange(`${e.target.value}T${t}`)} />
        <input type="time" value={t} step={900} onChange={(e) => e.target.value && onChange(`${d}T${e.target.value}`)} />
      </span>
    </label>
  );
}

const SLOTS = [
  { label: "Vormittag", from: "07:00", to: "12:00" },
  { label: "Nachmittag", from: "12:00", to: "17:00" },
  { label: "Ganzer Tag", from: "07:00", to: "17:00" }
];

/* ------------------------------------------------------------------ booking */

export function BookingSheet({ booking, onClose }: { booking: Partial<Booking>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const manager = canManageFleet(data);
  const me = currentUser(data);
  const isNew = !booking.id;
  const vehicles = bookableVehicles(data, manager);
  const [v, setV] = useState<Booking>({
    id: booking.id ?? uid("b"),
    vehicleId: booking.vehicleId ?? vehicles[0]?.id ?? "",
    employeeId: booking.employeeId ?? me?.id ?? "",
    start: booking.start ?? `${today()}T07:00`,
    end: booking.end ?? `${today()}T17:00`,
    purpose: booking.purpose ?? "",
    projectId: booking.projectId ?? "",
    returned: booking.returned,
    kmEnd: booking.kmEnd,
    returnNote: booking.returnNote ?? ""
  });
  const vehicle = data.vehicles.find((x) => x.id === v.vehicleId);
  const [km, setKm] = useState<number>(booking.kmEnd ?? vehicle?.km ?? 0);
  const [note, setNote] = useState("");
  const set = (patch: Partial<Booking>) => setV((o) => ({ ...o, ...patch }));
  const mine = v.employeeId === me?.id;
  const editable = manager || mine;
  const started = !isNew && v.start <= nowLocal();
  const invalid = v.end <= v.start;
  const busy = vehicle ? vehicleBusy(data, v.vehicleId, v.start, v.end, v.id) : [];
  const options = vehicle && !vehicles.includes(vehicle) ? [vehicle, ...vehicles] : vehicles;
  const projects = data.projects.filter((p) => p.status !== "abgeschlossen");

  const submit = () => {
    if (invalid || busy.length || !v.vehicleId) return;
    save("bookings", { ...v, purpose: v.purpose.trim() }, `${vehicle?.name ?? "Fahrzeug"} ${isNew ? "gebucht" : "Buchung geändert"}`);
    notify(isNew ? `${vehicle?.name} gebucht` : "Buchung gespeichert");
    onClose();
  };

  const giveBack = () => {
    save("bookings", { ...v, returned: true, kmEnd: km, returnNote: note.trim(), end: v.end > nowLocal() ? nowLocal() : v.end }, `${vehicle?.name} zurückgegeben`);
    if (vehicle && km > (vehicle.km ?? 0)) save("vehicles", { ...vehicle, km });
    if (vehicle && note.trim())
      save("services", { id: uid("s"), vehicleId: vehicle.id, kind: "schaden", status: "offen", date: "", until: "", time: "", workshop: "", description: note.trim(), km, cost: 0, reportedBy: me?.id ?? "" }, `Schaden gemeldet: ${vehicle.name}`);
    notify(note.trim() ? "Zurückgegeben – Meldung geht an den Fuhrpark" : "Fahrzeug zurückgegeben");
    onClose();
  };

  return (
    <Sheet color={BOOKING_COLOR} title={isNew ? "Fahrzeug buchen" : "Buchung"} sub={vehicle?.plate} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        <input className="job-title" value={v.purpose} disabled={!editable} onChange={(e) => set({ purpose: e.target.value })} placeholder="Wofür? z. B. Baustelle, Kundentermin" aria-label="Zweck" autoFocus={isNew} />

        <div className="job-grid">
          <label className="full">
            <span>Fahrzeug</span>
            <select value={v.vehicleId} disabled={!editable} onChange={(e) => set({ vehicleId: e.target.value })}>
              {options.map((x) => (
                <option key={x.id} value={x.id}>
                  {vehicleLabel(x)} · {x.seats} Sitze
                </option>
              ))}
            </select>
          </label>
          <DateTime label="Abholung" value={v.start} onChange={(start) => set({ start, end: v.end <= start ? `${start.slice(0, 10)}T${v.end.slice(11)}` : v.end })} />
          <DateTime label="Rückgabe" value={v.end} onChange={(end) => set({ end })} />
          {editable && !started && (
            <div className="slot-chips full">
              {SLOTS.map((s) => (
                <button key={s.label} type="button" className={v.start.endsWith(s.from) && v.end.endsWith(s.to) && v.start.slice(0, 10) === v.end.slice(0, 10) ? "on" : ""} onClick={() => set({ start: `${v.start.slice(0, 10)}T${s.from}`, end: `${v.start.slice(0, 10)}T${s.to}` })}>
                  {s.label}
                </button>
              ))}
            </div>
          )}
          <label>
            <span>Fahrer</span>
            <select value={v.employeeId} disabled={!manager} onChange={(e) => set({ employeeId: e.target.value })}>
              {data.employees
                .filter((e) => e.active || e.id === v.employeeId)
                .map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
            </select>
          </label>
          <label>
            <span>Projekt</span>
            <select value={v.projectId} disabled={!editable} onChange={(e) => set({ projectId: e.target.value })}>
              <option value="">– keines –</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code} · {p.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {invalid && <p className="job-warn">Die Rückgabe muss nach der Abholung liegen.</p>}
        {!invalid && busy.length > 0 && (
          <p className="job-warn">
            <AlertTriangle size={14} /> Nicht frei: {busy.map((b) => b.label).join(" · ")}
          </p>
        )}
        {vehicle?.note && <p className="muted small">ℹ️ {vehicle.note}</p>}

        {!isNew && started && !v.returned && editable && (
          <div className="return-box">
            <strong>
              <KeyRound size={14} /> Rückgabe
            </strong>
            <div className="job-grid">
              <label>
                <span>Kilometerstand</span>
                <input type="number" min={0} value={km || ""} onChange={(e) => setKm(Number(e.target.value))} />
              </label>
              <label className="full">
                <span>Schaden oder Auffälligkeit? (optional)</span>
                <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="z. B. Kratzer hinten links, Kontrollleuchte" />
              </label>
            </div>
            <button type="button" className="btn btn-sm btn-primary" onClick={giveBack}>
              Zurückgeben
            </button>
          </div>
        )}
        {v.returned && (
          <p className="muted small">
            ✓ Zurückgegeben{v.kmEnd ? ` bei ${L.num(v.kmEnd)} km` : ""}
            {v.returnNote ? ` · „${v.returnNote}“` : ""}
          </p>
        )}

        <footer>
          {!isNew && editable && (manager || !started) && (
            <button
              type="button"
              className="icon-btn"
              title="Buchung stornieren"
              onClick={() => {
                if (!window.confirm("Buchung stornieren?")) return;
                remove("bookings", v.id, `Buchung ${vehicle?.name} storniert`);
                notify("Buchung storniert");
                onClose();
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            {editable ? "Abbrechen" : "Schließen"}
          </button>
          {editable && !v.returned && (
            <button type="submit" className="btn btn-sm btn-primary" disabled={invalid || busy.length > 0 || !v.vehicleId}>
              {isNew ? "Buchen" : "Speichern"}
            </button>
          )}
        </footer>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ workshop */

export function ServiceSheet({ entry, onClose }: { entry: Partial<ServiceEntry>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const manager = canManageFleet(data);
  const me = currentUser(data);
  const isNew = !entry.id;
  const [v, setV] = useState<ServiceEntry>({
    id: entry.id ?? uid("s"),
    vehicleId: entry.vehicleId ?? data.vehicles[0]?.id ?? "",
    kind: entry.kind ?? (manager ? "service" : "schaden"),
    status: entry.status ?? (manager ? "geplant" : "offen"),
    date: entry.date ?? (manager ? addDays(today(), 7) : ""),
    until: entry.until ?? entry.date ?? (manager ? addDays(today(), 7) : ""),
    time: entry.time ?? "07:30",
    workshop: entry.workshop ?? "",
    description: entry.description ?? "",
    km: entry.km ?? 0,
    cost: entry.cost ?? 0,
    reportedBy: entry.reportedBy ?? me?.id ?? ""
  });
  const vehicle = data.vehicles.find((x) => x.id === v.vehicleId);
  const set = (patch: Partial<ServiceEntry>) => setV((o) => ({ ...o, ...patch }));
  const next = v.kind === "service" ? "nextService" : v.kind === "pickerl" ? "nextInspection" : null;
  const [nextDue, setNextDue] = useState(addDays(v.date || today(), 365));
  const busy = vehicle && v.status === "geplant" && v.date ? vehicleBusy(data, v.vehicleId, dayStart(v.date), dayEnd(v.until || v.date), v.id).filter((b) => b.kind === "booking") : [];
  const reporter = data.employees.find((e) => e.id === v.reportedBy);
  const needsDate = v.status !== "offen" && !v.date;

  const submit = () => {
    if (!v.vehicleId || needsDate) return;
    const item = { ...v, until: v.until && v.until >= v.date ? v.until : v.date, description: v.description.trim(), workshop: v.workshop.trim() };
    const what = `${L.serviceKind[v.kind].label} ${vehicle?.name ?? ""}`;
    save("services", item, isNew ? (v.status === "offen" ? `Gemeldet: ${what}` : `Werkstatttermin: ${what}`) : `${what} aktualisiert`);
    if (vehicle && v.status === "erledigt") {
      const patch: Partial<Vehicle> = {};
      if (next) patch[next] = nextDue;
      if (v.km > (vehicle.km ?? 0)) patch.km = v.km;
      if (vehicle.status === "werkstatt") patch.status = "verfuegbar";
      if (Object.keys(patch).length) save("vehicles", { ...vehicle, ...patch });
    }
    notify(v.status === "offen" ? "Gemeldet – der Fuhrpark kümmert sich" : v.status === "erledigt" ? "In der Service-Historie gespeichert" : "Werkstatttermin gespeichert");
    onClose();
  };

  const title = !manager ? "Schaden melden" : isNew ? "Werkstatttermin" : v.status === "erledigt" ? "Werkstattbesuch" : "Werkstatttermin";

  return (
    <Sheet color={v.status === "erledigt" ? "#059669" : v.kind === "schaden" ? "#dc2626" : SERVICE_COLOR} title={title} sub={vehicle?.plate} onClose={onClose}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {manager && (
          <div className="kind-chips" role="radiogroup" aria-label="Art">
            {(Object.keys(L.serviceKind) as ServiceKind[]).map((k) => (
              <button key={k} type="button" role="radio" aria-checked={v.kind === k} className={v.kind === k ? "on" : ""} onClick={() => set({ kind: k })}>
                <span>{L.serviceKind[k].icon}</span> {L.serviceKind[k].label}
              </button>
            ))}
          </div>
        )}

        <div className="job-grid">
          <label className="full">
            <span>Fahrzeug</span>
            <select value={v.vehicleId} onChange={(e) => set({ vehicleId: e.target.value })}>
              {data.vehicles.map((x) => (
                <option key={x.id} value={x.id}>
                  {vehicleLabel(x)}
                </option>
              ))}
            </select>
          </label>
          {manager && v.status !== "offen" && (
            <>
              <label>
                <span>{v.status === "erledigt" ? "Datum" : "Termin am"}</span>
                <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value, until: !v.until || v.until < e.target.value || v.until === v.date ? e.target.value : v.until })} />
              </label>
              <label>
                <span>Uhrzeit</span>
                <input type="time" value={v.time} step={900} onChange={(e) => set({ time: e.target.value })} />
              </label>
              <label>
                <span>Zurück am</span>
                <input type="date" value={v.until} min={v.date} onChange={(e) => set({ until: e.target.value })} />
              </label>
              <label>
                <span>Werkstatt</span>
                <input list="workshops" value={v.workshop} onChange={(e) => set({ workshop: e.target.value })} placeholder="z. B. Porsche Linz" />
                <datalist id="workshops">
                  {knownWorkshops(data).map((w) => (
                    <option key={w} value={w} />
                  ))}
                </datalist>
              </label>
            </>
          )}
          <label className="full">
            <span>{manager ? "Beschreibung" : "Was ist passiert?"}</span>
            <textarea rows={2} value={v.description} onChange={(e) => set({ description: e.target.value })} placeholder={manager ? "z. B. Jahresservice, Bremsen prüfen" : "z. B. Kratzer hinten links"} autoFocus={!manager} />
          </label>
          {manager && v.status === "erledigt" && (
            <>
              <label>
                <span>Kilometerstand</span>
                <input type="number" min={0} value={v.km || ""} onChange={(e) => set({ km: Number(e.target.value) })} placeholder={vehicle?.km ? String(vehicle.km) : ""} />
              </label>
              <label>
                <span>Kosten (€)</span>
                <input type="number" min={0} step="0.01" value={v.cost || ""} onChange={(e) => set({ cost: Number(e.target.value) })} />
              </label>
              {next && (
                <label className="full">
                  <span>{v.kind === "service" ? "Nächstes Service fällig am" : "Nächstes Pickerl fällig am"}</span>
                  <input type="date" value={nextDue} onChange={(e) => setNextDue(e.target.value)} />
                </label>
              )}
            </>
          )}
        </div>

        {busy.length > 0 && (
          <p className="job-warn">
            <AlertTriangle size={14} /> Achtung, das Fahrzeug ist {busy.map((b) => b.label).join(" · ")}.
          </p>
        )}
        {needsDate && <p className="job-warn">Bitte ein Datum wählen.</p>}
        {!isNew && reporter && v.kind === "schaden" && <p className="muted small">Gemeldet von {reporter.name}</p>}

        {manager && (
          <div className="status-switch" role="group" aria-label="Status">
            {(Object.keys(L.serviceStatus) as ServiceStatus[]).map((st) => (
              <button key={st} type="button" className={v.status === st ? `on tone-${L.serviceStatus[st].tone}` : ""} onClick={() => {
                  // done means today at the latest; a new appointment needs a date
                  const date = st === "erledigt" && (!v.date || v.date > today()) ? today() : st !== "offen" && !v.date ? today() : v.date;
                  set({ status: st, date, until: !v.until || v.until < date || st === "erledigt" ? date : v.until });
                }}>
                {L.serviceStatus[st].label}
              </button>
            ))}
          </div>
        )}

        <footer>
          {!isNew && manager && canDelete(data) && (
            <button
              type="button"
              className="icon-btn"
              title="Löschen"
              onClick={() => {
                if (!window.confirm("Eintrag löschen?")) return;
                remove("services", v.id, `${L.serviceKind[v.kind].label} ${vehicle?.name} gelöscht`);
                onClose();
              }}
            >
              <Trash2 size={15} />
            </button>
          )}
          <span className="spacer" />
          <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="submit" className="btn btn-sm btn-primary" disabled={!v.vehicleId || needsDate || (!manager && !v.description.trim())}>
            {!manager ? "Melden" : isNew ? "Speichern" : "Speichern"}
          </button>
        </footer>
      </form>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ bits */

export function StateBadge({ vehicle }: { vehicle: Vehicle }) {
  const { data } = useStore();
  const s = vehicleState(data, vehicle);
  return (
    <span className="state-badge" title={s.detail}>
      <Badge tone={s.tone}>{s.label}</Badge>
      {s.detail && <small>{s.detail}</small>}
    </span>
  );
}

export function DueBadge({ date }: { date?: string }) {
  if (!date) return <span className="muted">–</span>;
  const t = today();
  const tone = date < t ? "red" : date <= addDays(t, 30) ? "amber" : "gray";
  return <Badge tone={tone}>{date < t ? `überfällig ${fmtShort(date)}` : fmt(date)}</Badge>;
}

/* ------------------------------------------------------------------ week board */

function segment(start: string, end: string, day: string) {
  const s = start.slice(0, 10) === day ? start.slice(11) : "";
  const e = end.slice(0, 10) === day ? end.slice(11) : "";
  if (s && e) return `${s}–${e}`;
  if (s) return `ab ${s}`;
  if (e) return `bis ${e}`;
  return "ganztags";
}

/** Vehicles × days with bookings, workshop dates and site assignments. Click a free cell to book. */
export function FleetBoard({ vehicles, from, onFrom }: { vehicles: Vehicle[]; from: string; onFrom: (d: string) => void }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const manager = canManageFleet(data);
  const me = data.currentUserId;
  const t = today();
  const days = Array.from({ length: 7 }, (_, i) => addDays(from, i));
  const short = (id: string) => {
    const n = data.employees.find((e) => e.id === id)?.name ?? "–";
    const [a, b] = n.split(" ");
    return b ? `${a} ${b[0]}.` : a;
  };

  return (
    <section className="card card-flush fleet-board-card">
      <header className="card-header fleet-board-head">
        <h2>
          Wochenplan <small className="muted">KW {isoWeek(from)}</small>
        </h2>
        <div className="card-actions">
          <button type="button" className="icon-btn" onClick={() => onFrom(addDays(from, -7))} aria-label="Vorige Woche">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn btn-sm" onClick={() => onFrom(startOfWeek(t))}>
            Heute
          </button>
          <button type="button" className="icon-btn" onClick={() => onFrom(addDays(from, 7))} aria-label="Nächste Woche">
            <ChevronRight size={16} />
          </button>
        </div>
      </header>
      <div className="fleet-board-scroll">
        <div className="fleet-board" style={{ gridTemplateColumns: `minmax(150px, 1.3fr) repeat(7, minmax(92px, 1fr))` }}>
          <div className="fb-corner">Fahrzeug</div>
          {days.map((d) => (
            <div key={d} className={`fb-day ${d === t ? "today" : ""} ${isWeekend(d) || holidayName(d) ? "off" : ""}`} title={holidayName(d)}>
              <strong>{weekdayShort(d)}</strong> {fmtShort(d)}
            </div>
          ))}
          {vehicles.map((v) => {
            const bookable = manager || v.pool || v.driverId === me;
            return (
              <div key={v.id} className="fb-row">
                <div className="fb-vehicle">
                  {manager ? (
                    <Link href={`/fuhrpark/fahrzeuge/${v.id}`}>
                      <strong>{v.name}</strong>
                    </Link>
                  ) : (
                    <strong>{v.name}</strong>
                  )}
                  <span className="plate">{v.plate}</span>
                  <small>
                    {v.type} · {v.seats} Sitze{v.fuel === "elektro" ? " · ⚡" : ""}
                  </small>
                </div>
                {days.map((d) => {
                  const bookings = data.bookings.filter((b) => b.vehicleId === v.id && !(b.returned && b.end < dayStart(d)) && b.start <= dayEnd(d) && b.end >= dayStart(d));
                  const shop = data.services.filter((s) => s.vehicleId === v.id && s.status === "geplant" && s.date && s.date <= d && d <= (s.until || s.date));
                  const sites = data.assignments.filter((a) => a.resourceType === "vehicle" && a.resourceId === v.id && a.start <= d && d <= a.end);
                  const blocked = v.status === "ausser_betrieb" || shop.length > 0 || sites.length > 0;
                  return (
                    <div
                      key={d}
                      className={`fb-cell ${d === t ? "today" : ""} ${isWeekend(d) || holidayName(d) ? "off" : ""} ${bookable && !blocked && d >= t ? "free" : ""}`}
                      onClick={(e) => {
                        if (e.target !== e.currentTarget || !bookable || blocked || d < t) return;
                        openEditor({ kind: "booking", item: { vehicleId: v.id, start: `${d}T07:00`, end: `${d}T17:00` } });
                      }}
                    >
                      {v.status === "ausser_betrieb" && <span className="fb-chip out">Außer Betrieb</span>}
                      {shop.map((s) => (
                        <button key={s.id} type="button" className="fb-chip shop" onClick={() => manager && openEditor({ kind: "service", item: s })} title={s.description}>
                          {L.serviceKind[s.kind].icon} {s.workshop || L.serviceKind[s.kind].label}
                        </button>
                      ))}
                      {sites.map((a) => {
                        const p = data.projects.find((x) => x.id === a.projectId);
                        return (
                          <span key={a.id} className="fb-chip site" style={{ "--pc": p?.color ?? a.color ?? "#64748b" } as CSSProperties} title={p?.name ?? a.label}>
                            {p?.code ?? a.label}
                          </span>
                        );
                      })}
                      {bookings.map((b) => (
                        <button key={b.id} type="button" className={`fb-chip booking ${b.employeeId === me ? "mine" : ""} ${b.returned ? "done" : ""}`} onClick={() => openEditor({ kind: "booking", item: b })} title={`${short(b.employeeId)} · ${b.purpose}`}>
                          <span>{segment(b.start, b.end, d)}</span> {short(b.employeeId)}
                        </button>
                      ))}
                      {bookable && !blocked && d >= t && bookings.length === 0 && (
                        <span className="fb-plus" aria-hidden>
                          <Plus size={13} />
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ finder */

/** "When do you need a car?" – lists free pool vehicles for that slot. */
export function BookingFinder() {
  const { data } = useStore();
  const openEditor = useEditor();
  const manager = canManageFleet(data);
  const t = today();
  const hour = new Date().getHours();
  const [from, setFrom] = useState(hour >= 15 ? `${addDays(t, 1)}T07:00` : `${t}T${String(Math.max(7, hour + 1)).padStart(2, "0")}:00`);
  const [to, setTo] = useState(hour >= 15 ? `${addDays(t, 1)}T17:00` : `${t}T17:00`);
  const [seats, setSeats] = useState(1);
  const vehicles = bookableVehicles(data, manager).filter((v) => manager || v.pool);
  const invalid = to <= from;
  const rows = useMemo(
    () =>
      vehicles
        .filter((v) => v.seats >= seats)
        .map((v) => ({ v, busy: invalid ? [] : vehicleBusy(data, v.id, from, to) }))
        .sort((a, b) => a.busy.length - b.busy.length),
    [data, vehicles, from, to, seats, invalid]
  );
  const free = rows.filter((r) => !r.busy.length).length;

  return (
    <section className="card finder">
      <header className="finder-head">
        <span className="finder-icon">
          <CarFront size={20} />
        </span>
        <div>
          <h2>Wann brauchst du ein Fahrzeug?</h2>
          <p className="muted small">{invalid ? "Die Rückgabe muss nach der Abholung liegen." : `${free} von ${rows.length} Fahrzeugen frei`}</p>
        </div>
      </header>
      <div className="finder-form job-grid">
        <DateTime label="Abholung" value={from} onChange={(v) => (setFrom(v), to <= v && setTo(`${v.slice(0, 10)}T${to.slice(11)}`))} />
        <DateTime label="Rückgabe" value={to} onChange={setTo} />
        <label>
          <span>Personen</span>
          <select value={seats} onChange={(e) => setSeats(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n === 1 ? "1 Person" : `${n}+ Personen`}
              </option>
            ))}
          </select>
        </label>
        <div className="slot-chips">
          {SLOTS.map((s) => (
            <button key={s.label} type="button" className={from.endsWith(s.from) && to.endsWith(s.to) && from.slice(0, 10) === to.slice(0, 10) ? "on" : ""} onClick={() => (setFrom(`${from.slice(0, 10)}T${s.from}`), setTo(`${from.slice(0, 10)}T${s.to}`))}>
              {s.label}
            </button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? (
        <p className="empty">{data.vehicles.length ? "Kein passendes Poolfahrzeug." : "Noch keine Fahrzeuge angelegt – das macht der Fuhrpark."}</p>
      ) : (
        <ul className="finder-list">
          {rows.map(({ v, busy }) => (
            <li key={v.id} className={busy.length ? "busy" : ""}>
              <span className="finder-car">
                <strong>{v.name}</strong>
                <span className="plate">{v.plate}</span>
              </span>
              <small className="muted">
                {v.type} · {v.seats} Sitze · {v.fuel ? L.fuel[v.fuel].label : ""}
                {v.location ? ` · ${v.location}` : ""}
              </small>
              {busy.length ? (
                <small className="finder-why">{busy[0].label}</small>
              ) : (
                <button type="button" className="btn btn-sm btn-primary" disabled={invalid} onClick={() => openEditor({ kind: "booking", item: { vehicleId: v.id, start: from, end: to } })}>
                  Buchen
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ lists */

export function BookingList({ bookings, empty, showDriver }: { bookings: Booking[]; empty: string; showDriver?: boolean }) {
  const { data } = useStore();
  const openEditor = useEditor();
  const now = nowLocal();
  if (!bookings.length) return <p className="empty">{empty}</p>;
  return (
    <ul className="compact-list">
      {bookings.map((b) => {
        const v = data.vehicles.find((x) => x.id === b.vehicleId);
        const active = b.start <= now && now <= b.end && !b.returned;
        const late = b.end < now && !b.returned;
        return (
          <li key={b.id}>
            <button type="button" onClick={() => openEditor({ kind: "booking", item: b })}>
              <Badge tone={late ? "red" : active ? "blue" : b.returned ? "green" : "gray"}>{late ? "Rückgabe offen" : active ? "Unterwegs" : b.returned ? "Zurück" : fmtShort(b.start.slice(0, 10))}</Badge>
              <strong>{v?.name ?? "–"}</strong>
              <span className="muted">
                {fmtSpan(b.start, b.end)}
                {showDriver ? ` · ${data.employees.find((e) => e.id === b.employeeId)?.name ?? "–"}` : ""}
                {b.purpose ? ` · ${b.purpose}` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ServiceList({ entries, empty }: { entries: ServiceEntry[]; empty: string }) {
  const { data } = useStore();
  const openEditor = useEditor();
  if (!entries.length) return <p className="empty">{empty}</p>;
  return (
    <ul className="compact-list">
      {entries.map((s) => {
        const v = data.vehicles.find((x) => x.id === s.vehicleId);
        return (
          <li key={s.id}>
            <button type="button" onClick={() => openEditor({ kind: "service", item: s })}>
              <Badge tone={L.serviceStatus[s.status].tone}>{s.status === "geplant" && s.date ? `${weekdayShort(s.date)} ${fmtShort(s.date)}` : L.serviceStatus[s.status].label}</Badge>
              <strong>
                {L.serviceKind[s.kind].icon} {v?.name ?? "–"}
              </strong>
              <span className="muted">
                {L.serviceKind[s.kind].label}
                {s.workshop ? ` · ${s.workshop}` : ""}
                {s.time && s.status === "geplant" ? ` · ${s.time}` : ""}
                {s.description ? ` · ${s.description}` : ""}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}

export function ReportDamageButton({ vehicleId, className = "btn" }: { vehicleId?: string; className?: string }) {
  const openEditor = useEditor();
  return (
    <button type="button" className={className} onClick={() => openEditor({ kind: "service", item: vehicleId ? { vehicleId } : {} })}>
      <Wrench size={15} /> Schaden melden
    </button>
  );
}

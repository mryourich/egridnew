"use client";

import { ChevronLeft, ChevronRight, MapPin, Navigation, Phone, Plus, Route, Search, Trash2, UserRound, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Due, Empty, PageHead, Prio, Seg, SortHead, StatusBadge, useConfirm, Who } from "@/components/app/kit";
import { Button, IconButton, Input, Select } from "@/components/ui";
import { addDays, fmt, startOfWeek, today, weekdayLong, weekdayShort, isoWeek } from "@/lib/date";
import { PRIO_RANK } from "@/lib/labels";
import { personName, useStore } from "@/lib/store/store";
import type { Customer, ServiceOrder } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { CustomerDialog, OrderDialog } from "./dialogs";
import { addressOf, isDone, mapsUrl, ORDER_STATUS, ORDER_STATUSES, ordersOf, routeUrl, technicians } from "./model";

type View = "disposition" | "auftraege" | "kunden";

/** Service: orders for customers – planned weekly per technician, worked off on the tablet. */
export function Service() {
  const { data } = useStore();
  const q = useQuery();
  const lead = !!data.people.find((p) => p.id === data.meId)?.lead;
  const view = (["disposition", "auftraege", "kunden"] as View[]).includes(q.get("ansicht") as View) ? (q.get("ansicht") as View) : lead ? "disposition" : "auftraege";
  const [creating, setCreating] = useState(false);
  const [newCustomer, setNewCustomer] = useState(false);
  const router = useRouter();

  if (!data.workspace.modules?.service)
    return (
      <div className="page">
        <Empty icon={<Wrench size={28} />} title="Service ist nicht eingeschaltet" text="Unter Einstellungen › Funktionen lässt sich das Modul für Kundendienst und Serviceaufträge einschalten." />
      </div>
    );

  return (
    <div className="page">
      <PageHead
        title="Service"
        sub={lead ? "Aufträge disponieren, Berichte freigeben" : "Aufträge und Kunden – die eigenen Aufträge des Tages stehen unter „Mein Tag“"}
        actions={
          <>
            <Seg<View>
              label="Ansicht"
              value={view}
              onChange={(v) => q.set({ ansicht: v })}
              options={[
                { value: "disposition", label: "Disposition" },
                { value: "auftraege", label: "Aufträge" },
                { value: "kunden", label: "Kunden" }
              ]}
            />
            {view === "kunden" ? (
              <Button leftIcon={<Plus size={15} />} onClick={() => setNewCustomer(true)}>
                Kunde
              </Button>
            ) : (
              <Button leftIcon={<Plus size={15} />} onClick={() => setCreating(true)}>
                Auftrag
              </Button>
            )}
          </>
        }
      />
      {view === "disposition" && <Dispatch />}
      {view === "auftraege" && <OrderList />}
      {view === "kunden" && <Customers />}
      {creating && <OrderDialog onClose={() => setCreating(false)} onSaved={(o) => router.push(`/service/auftrag/${o.id}`)} />}
      {newCustomer && <CustomerDialog onClose={() => setNewCustomer(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ Mein Tag */

/** Service orders of one person on one day – used by "Mein Tag". */
export function DayOrders({ date, who }: { date: string; who: string }) {
  const { data } = useStore();
  const router = useRouter();
  const list = ordersOf(data, who, date);
  const cust = (o: ServiceOrder) => data.customers.find((c) => c.id === o.customerId);
  const open = list.filter((o) => !isDone(o));
  const route = routeUrl(open.map((o) => addressOf(o, cust(o)).line));
  const done = list.length - open.length;

  return (
    <section className="panel">
      <div className="panel-head">
        <Wrench size={15} className="muted" />
        <h3>Serviceaufträge</h3>
        <span className="muted">
          {done} von {list.length} erledigt
        </span>
        <span className="grow" />
        {route && (
          <a className="ui-button ui-button-secondary ui-button-size-sm" href={route} target="_blank" rel="noreferrer">
            <Route size={14} /> Tagesroute
          </a>
        )}
      </div>
      <div className="panel-body">
      {list.length ? (
        <ol className="day-list">
          {list.map((o, i) => {
            const c = cust(o);
            const addr = addressOf(o, c).line;
            return (
              <li key={o.id} className={cn("day-card", isDone(o) && "done", o.status === "in_arbeit" && "active")}>
                <span className="day-no">{i + 1}</span>
                <button type="button" className="day-main" onClick={() => router.push(`/service/auftrag/${o.id}`)}>
                  <span className="day-top">
                    <strong>{c?.name ?? "–"}</strong>
                    <StatusBadge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</StatusBadge>
                    {o.priority === "hoch" && <Prio p="hoch" />}
                  </span>
                  <span className="day-title">{o.title}</span>
                  <span className="day-addr">
                    <MapPin size={13} /> {addr || "Keine Adresse"}
                  </span>
                </button>
                <div className="day-actions">
                  {addr && (
                    <a className="ui-button ui-button-secondary ui-button-size-lg" href={mapsUrl(addr)} target="_blank" rel="noreferrer" aria-label={`Navigation zu ${c?.name}`}>
                      <Navigation size={16} /> <span className="hide-sm">Navigation</span>
                    </a>
                  )}
                  {c?.phone && (
                    <a className="ui-button ui-button-secondary ui-button-size-lg" href={`tel:${c.phone.replace(/\s/g, "")}`} aria-label={`${c.name} anrufen`}>
                      <Phone size={16} />
                    </a>
                  )}
                  <Link className="ui-button ui-button-default ui-button-size-lg" href={`/service/auftrag/${o.id}`}>
                    Öffnen
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="muted">Keine Serviceaufträge an diesem Tag.</p>
      )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ Disposition */

function Dispatch() {
  const { data, save, notify } = useStore();
  const q = useQuery();
  const week = startOfWeek(q.get("woche") || today());
  const days = Array.from({ length: 5 }, (_, i) => addDays(week, i));
  const [all, setAll] = useState(false);
  const [drag, setDrag] = useState("");
  const [over, setOver] = useState("");
  const [edit, setEdit] = useState<ServiceOrder | null>(null);
  const max = data.workspace.maxPerDay ?? 10;
  const techs = technicians(data, all);
  const pool = data.orders.filter((o) => o.status === "offen" || (!o.techId && !isDone(o))).sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || a.no.localeCompare(b.no));
  const cust = (o: ServiceOrder) => data.customers.find((c) => c.id === o.customerId);

  /** Drops an order into a cell (before another order) or back into the pool. */
  const place = (orderId: string, techId: string, date: string, before?: string) => {
    const o = data.orders.find((x) => x.id === orderId);
    if (!o || isDone(o)) return;
    if (!techId) {
      save("orders", { ...o, techId: "", date: "", seq: 0, status: "offen" });
      return;
    }
    const list = ordersOf(data, techId, date).filter((x) => x.id !== o.id);
    const at = before ? Math.max(0, list.findIndex((x) => x.id === before)) : list.length;
    list.splice(at, 0, { ...o, techId, date });
    list.forEach((x, i) => {
      const next = { ...x, seq: i + 1, ...(x.id === o.id ? { techId, date, status: o.status === "offen" ? ("geplant" as const) : o.status } : {}) };
      if (x.id === o.id || x.seq !== i + 1) save("orders", next);
    });
    if (list.length > max) notify(`${personName(data, techId)} hat am ${fmt(date)} jetzt ${list.length} Aufträge (mehr als ${max}).`, { tone: "error" });
  };
  const dropProps = (key: string, techId: string, date: string, before?: string) => ({
    onDragOver: (e: React.DragEvent) => (e.preventDefault(), setOver(key)),
    onDragLeave: () => setOver(""),
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setOver("");
      const id = e.dataTransfer.getData("text/plain") || drag;
      if (id) place(id, techId, date, before);
      setDrag("");
    }
  });
  const card = (o: ServiceOrder, techId = "", date = "") => (
    <div
      key={o.id}
      className={cn("disp-card", o.priority, isDone(o) && "done", drag === o.id && "lifted")}
      draggable={!isDone(o)}
      onDragStart={(e) => (e.dataTransfer.setData("text/plain", o.id), (e.dataTransfer.effectAllowed = "move"), setDrag(o.id))}
      onDragEnd={() => setDrag("")}
      onClick={() => setEdit(o)}
      title={`${o.no} · ${o.title}\n${cust(o)?.name ?? ""}, ${addressOf(o, cust(o)).line}`}
      {...(techId ? dropProps(`${techId}|${date}|${o.id}`, techId, date, o.id) : {})}
    >
      <strong>{cust(o)?.name ?? "–"}</strong>
      <span>{o.title}</span>
      <small>{[cust(o)?.city, o.status !== "geplant" && o.status !== "offen" ? ORDER_STATUS[o.status].label : ""].filter(Boolean).join(" · ")}</small>
    </div>
  );

  return (
    <>
      <div className="toolbar">
        <div className="seg">
          <button type="button" aria-label="Vorige Woche" onClick={() => q.set({ woche: addDays(week, -7) })}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className={cn(week === startOfWeek(today()) && "on")} onClick={() => q.set({ woche: null })}>
            Diese Woche
          </button>
          <button type="button" aria-label="Nächste Woche" onClick={() => q.set({ woche: addDays(week, 7) })}>
            <ChevronRight size={14} />
          </button>
        </div>
        <strong>
          KW {isoWeek(week)} · {fmt(days[0])} – {fmt(days[4])}
        </strong>
        <label className="check-row">
          <input type="checkbox" className="ui-checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Alle Mitarbeiter zeigen
        </label>
        <span className="count">Aufträge in die Tage ziehen · max. {max} je Tag</span>
      </div>
      <div className="disp">
        <aside className={cn("panel disp-pool", over === "pool" && "over")} {...dropProps("pool", "", "")}>
          <div className="panel-head">
            <h3>Nicht zugeteilt</h3>
            <span className="muted">{pool.length}</span>
          </div>
          <div className="disp-pool-list">{pool.length ? pool.map((o) => card(o)) : <p className="muted panel-body">Alle Aufträge sind zugeteilt.</p>}</div>
        </aside>
        <div className="panel disp-grid-wrap">
          <table className="disp-grid">
            <thead>
              <tr>
                <th>Techniker</th>
                {days.map((d) => (
                  <th key={d} className={cn(d === today() && "today")}>
                    {weekdayShort(d)} {fmt(d).slice(0, 6)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {techs.map((p) => (
                <tr key={p.id}>
                  <th>
                    <Who id={p.id} />
                    <small>{p.role}</small>
                  </th>
                  {days.map((d) => {
                    const list = ordersOf(data, p.id, d);
                    const key = `${p.id}|${d}`;
                    const away = data.absences.find((a) => a.personId === p.id && a.start <= d && a.end >= d);
                    return (
                      <td key={d} className={cn(over === key && "over", d === today() && "today", away && "away")} {...dropProps(key, p.id, d)}>
                        <span className={cn("disp-count", list.length > max && "full", list.length === max && "max")}>
                          {list.length}/{max}
                        </span>
                        {away && <small className="muted">abwesend</small>}
                        {list.map((o) => card(o, p.id, d))}
                      </td>
                    );
                  })}
                </tr>
              ))}
              {!techs.length && (
                <tr>
                  <td colSpan={6}>
                    <p className="muted panel-body">Keine Techniker gefunden – Funktion „Servicetechniker“ in den Stammdaten setzen oder „Alle Mitarbeiter zeigen“.</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {edit && <OrderDialog order={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

/* ------------------------------------------------------------------ Aufträge */

type SortKey = "no" | "customer" | "date" | "status" | "priority";

function OrderList() {
  const { data } = useStore();
  const router = useRouter();
  const [status, setStatus] = useState("aktiv");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: 1 });
  const cust = (o: ServiceOrder) => data.customers.find((c) => c.id === o.customerId);
  const t = term.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = data.orders.filter((o) => (status === "aktiv" ? o.status !== "freigegeben" : !status || o.status === status) && (!t || [o.no, o.title, o.description, cust(o)?.name, cust(o)?.city, personName(data, o.techId)].join(" ").toLowerCase().includes(t)));
    const val = (o: ServiceOrder): string | number => (sort.key === "no" ? o.no : sort.key === "customer" ? (cust(o)?.name ?? "").toLowerCase() : sort.key === "date" ? (o.date || "9999") + String(o.seq).padStart(3, "0") : sort.key === "status" ? ORDER_STATUSES.indexOf(o.status) : PRIO_RANK[o.priority]);
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, status, t, sort]);
  return (
    <>
      <div className="toolbar">
        <Select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="filter-select">
          <option value="aktiv">Alle offenen</option>
          <option value="">Alle</option>
          {ORDER_STATUSES.map((k) => (
            <option key={k} value={k}>
              {ORDER_STATUS[k].label}
            </option>
          ))}
        </Select>
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nr., Kunde, Ort, Auftrag" aria-label="Aufträge durchsuchen" />
        </label>
        <span className="count">{rows.length} Aufträge</span>
      </div>
      <section className="panel">
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <SortHead k="no" sort={sort} onSort={setSort}>
                    Nr.
                  </SortHead>
                  <SortHead k="customer" sort={sort} onSort={setSort}>
                    Kunde / Auftrag
                  </SortHead>
                  <SortHead k="priority" sort={sort} onSort={setSort}>
                    Priorität
                  </SortHead>
                  <th className="ui-table-head">Techniker</th>
                  <SortHead k="date" sort={sort} onSort={setSort}>
                    Termin
                  </SortHead>
                  <SortHead k="status" sort={sort} onSort={setSort}>
                    Status
                  </SortHead>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <tr key={o.id} className="ui-table-row clickable" onClick={() => router.push(`/service/auftrag/${o.id}`)}>
                    <td className="ui-table-cell mono">{o.no}</td>
                    <td className="ui-table-cell">
                      <div className="point-cell">
                        <strong>{cust(o)?.name ?? "–"}</strong>
                        <small>
                          {o.title} · {addressOf(o, cust(o)).line}
                        </small>
                      </div>
                    </td>
                    <td className="ui-table-cell">
                      <Prio p={o.priority} />
                    </td>
                    <td className="ui-table-cell">
                      <Who id={o.techId} empty="Nicht zugeteilt" />
                    </td>
                    <td className="ui-table-cell">{o.date ? <Due due={o.date} done={isDone(o)} /> : <span className="muted">–</span>}</td>
                    <td className="ui-table-cell">
                      <StatusBadge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</StatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <Empty inline icon={<Wrench size={26} />} title="Keine Aufträge" text="Mit „Auftrag“ oben rechts anlegen." />
          </div>
        )}
      </section>
    </>
  );
}

/* ------------------------------------------------------------------ Kunden */

function Customers() {
  const { data, remove, notify, restore } = useStore();
  const ask = useConfirm();
  const [term, setTerm] = useState("");
  const [edit, setEdit] = useState<Customer | null>(null);
  const t = term.trim().toLowerCase();
  const rows = data.customers.filter((c) => !t || [c.no, c.name, c.contact, c.city, c.street, c.phone, c.uid].join(" ").toLowerCase().includes(t)).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const drop = async (c: Customer) => {
    const n = data.orders.filter((o) => o.customerId === c.id).length;
    if (n) return notify(`${c.name} hat ${n} Aufträge und kann nicht gelöscht werden.`, { tone: "error" });
    if (!(await ask({ title: `${c.name} löschen?` }))) return;
    const before = data;
    remove("customers", c.id);
    notify("Kunde gelöscht", { undo: () => restore(before) });
  };
  return (
    <>
      <div className="toolbar">
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Name, Ort, Kd.-Nr., UID" aria-label="Kunden durchsuchen" />
        </label>
        <span className="count">{rows.length} Kunden</span>
      </div>
      <section className="panel">
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="ui-table-head">Kd.-Nr.</th>
                  <th className="ui-table-head">Kunde</th>
                  <th className="ui-table-head">Adresse</th>
                  <th className="ui-table-head">Telefon</th>
                  <th className="ui-table-head num">Aufträge</th>
                  <th className="ui-table-head" aria-label="Aktionen" />
                </tr>
              </thead>
              <tbody>
                {rows.map((c) => (
                  <tr key={c.id} className="ui-table-row clickable" onClick={() => setEdit(c)}>
                    <td className="ui-table-cell mono">{c.no}</td>
                    <td className="ui-table-cell">
                      <div className="point-cell">
                        <strong>{c.name}</strong>
                        <small>{[c.contact, c.uid].filter(Boolean).join(" · ") || "–"}</small>
                      </div>
                    </td>
                    <td className="ui-table-cell">
                      {c.street}, {c.zip} {c.city}
                    </td>
                    <td className="ui-table-cell nowrap">{c.phone || "–"}</td>
                    <td className="ui-table-cell num">{data.orders.filter((o) => o.customerId === c.id).length}</td>
                    <td className="ui-table-cell num" onClick={(e) => e.stopPropagation()}>
                      <IconButton label="Löschen" variant="danger" size="sm" onClick={() => void drop(c)}>
                        <Trash2 size={14} />
                      </IconButton>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <Empty inline icon={<UserRound size={26} />} title="Keine Kunden" text="Mit „Kunde“ oben rechts anlegen." />
          </div>
        )}
      </section>
      {edit && <CustomerDialog customer={edit} onClose={() => setEdit(null)} />}
    </>
  );
}

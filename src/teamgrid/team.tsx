"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, Phone, Plus, Trash2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { PersonForm } from "@/core/company";
import { addDays, fmt, holidayName, isWeekend, monthLabel, today, weekdayShort, workdaysBetween } from "@/core/date";
import { byRole, levelView, rightsOf, ROLLE_LABEL, ROLLEN, scopedPeople, subtree, type Rolle } from "@/core/roles";
import { uid, useStore } from "@/core/store";
import type { Absence, AbsenceType, Person } from "@/core/types";
import { Avatar, Button, Empty, Field, IconButton, Modal, PageHead, SearchBox, Seg } from "@/core/ui";
import { ABS_TYPES, ABSENCE, dayText } from "./plan-kit";
import "./team.css";

export type Tab = "leute" | "org" | "abwesend";

/** The people – searchable, also with a hundred of them –, the organisation chart and the absence calendar. */
export function Team({ tab = "leute" }: { tab?: Tab }) {
  const { data } = useStore();
  const [person, setPerson] = useState<Partial<Person> | null>(null);
  const [away, setAway] = useState<Partial<Absence> | null>(null);
  const [query, setQuery] = useState(() => (typeof window === "undefined" ? "" : new URLSearchParams(window.location.search).get("q") ?? ""));
  const [role, setRole] = useState<Rolle | "alle">("alle");
  const edit = rightsOf(data).team;
  const t = today();
  const all = scopedPeople(data);
  // step by step: leaders start with the people directly below them
  const lv = levelView(data);
  const [depth, setDepth] = useState<"direkt" | "alle">("direkt");
  const near = lv ? new Set([lv.me, ...lv.direct, ...lv.extra]) : null;
  const people = near && depth === "direkt" && tab !== "org" ? all.filter((e) => near.has(e.id)) : all;
  const q = query.trim().toLowerCase();
  const shown = people.filter((e) => (role === "alle" || e.rolle === role) && (!q || [e.name, e.title, e.phone, e.email, e.team].join(" ").toLowerCase().includes(q)));
  const awayToday = data.absences.filter((a) => a.start <= t && a.end >= t && people.some((e) => e.id === a.employeeId)).length;
  const count = (r: Rolle | "alle") => (r === "alle" ? people.length : people.filter((e) => e.rolle === r).length);
  const roleFilter: (Rolle | "alle")[] = ["alle", ...ROLLEN.filter((r) => count(r) > 0)];

  if (!rightsOf(data).teamView)
    return (
      <div className="page narrow">
        <Empty title="Kein Zugriff">Das Team sehen Leiter und Koordinatoren.</Empty>
      </div>
    );

  return (
    <div className="page">
      <PageHead kicker={tab === "org" ? "Organigramm" : tab === "abwesend" ? "Abwesenheiten" : "Mitarbeiter"} title="People" sub={`${people.length} ${people.length === 1 ? "Person" : "Personen"} · heute ${awayToday} abwesend · Monteure, Lehrlinge und Externe kosten nichts extra`}>
        {edit && (
          <>
            <Button icon={<CalendarPlus size={15} />} onClick={() => setAway({ start: t, end: t, type: "urlaub" })}>
              Urlaub / ZA / Krankenstand
            </Button>
            <Button variant="primary" icon={<Plus size={15} />} onClick={() => setPerson({})}>
              Mitarbeiter
            </Button>
          </>
        )}
      </PageHead>

      <div className="toolbar">
        <SearchBox value={query} onChange={setQuery} placeholder="Name, Funktion, Telefon…" />
        {lv && tab !== "org" && (
          <Seg
            value={depth}
            onChange={setDepth}
            options={[
              { value: "direkt", label: "Meine Ebene" },
              { value: "alle", label: <>Ganzer Bereich <small>{all.length}</small></> }
            ]}
          />
        )}
        <div className="v-chips">
          {roleFilter.map((r) => (
            <button key={r} type="button" className={role === r ? "on" : ""} onClick={() => setRole(r)}>
              {r === "alle" ? "Alle" : ROLLE_LABEL[r]} <small>{count(r)}</small>
            </button>
          ))}
        </div>
      </div>

      {tab === "leute" ? (
        shown.length === 0 ? (
          <Empty title="Niemand gefunden." />
        ) : (
          <div className="panel">
            <table className={`table ${edit ? "rows-click" : ""}`}>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rolle</th>
                  <th className="hide-sm">Vorgesetzt</th>
                  <th className="hide-md">Telefon</th>
                  <th>Heute</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => {
                  const d = dayText(data, e.id, t);
                  const absent = d.am.kind === "absence";
                  return (
                    <tr key={e.id} onClick={() => edit && setPerson(e)}>
                      <td>
                        <span className="who">
                          <Avatar id={e.id} size={28} />
                          <span>
                            <strong>{e.name}</strong>
                            {e.title && e.title !== ROLLE_LABEL[e.rolle] && <small className="sub">{e.title}</small>}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`v-role r-${e.rolle}`}>{ROLLE_LABEL[e.rolle]}</span>
                      </td>
                      <td className="hide-sm">{data.people.find((x) => x.id === e.managerId)?.name ?? <span className="muted">–</span>}</td>
                      <td className="hide-md nowrap">
                        {e.phone ? (
                          <a href={`tel:${e.phone.replace(/\s/g, "")}`} onClick={(ev) => ev.stopPropagation()} className="v-team-phone">
                            <Phone size={13} /> {e.phone}
                          </a>
                        ) : (
                          <span className="muted">–</span>
                        )}
                      </td>
                      <td className={absent ? "v-team-away" : d.am.kind === "free" && d.pm.kind === "free" ? "muted" : ""}>{d.text}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : tab === "org" ? (
        <OrgChart people={people} highlight={q || role !== "alle" ? new Set(shown.map((e) => e.id)) : null} onOpen={(e) => edit && setPerson(e)} />
      ) : (
        <AbsenceCalendar people={shown} onPick={(a) => edit && setAway(a)} />
      )}

      {person && <PersonForm person={person} onClose={() => setPerson(null)} />}
      {away && <AbsenceForm absence={away} people={all} onClose={() => setAway(null)} />}
    </div>
  );
}

/** Organisation chart: who leads whom – it decides what everybody sees. Drag a person onto another = below them. */
function OrgChart({ people, highlight, onOpen }: { people: Person[]; highlight: Set<string> | null; onOpen: (e: Person) => void }) {
  const { data, save, notify } = useStore();
  const edit = rightsOf(data).team;
  const top = rightsOf(data).allPeople;
  const [drag, setDrag] = useState("");
  const [over, setOver] = useState("");
  const ids = new Set(people.map((e) => e.id));
  // a person can go below anybody except themselves and their own people
  const canDrop = (target: string) => !!drag && drag !== target && !subtree(data, drag).has(target) && people.find((e) => e.id === drag)?.managerId !== target;
  const move = (target: string) => {
    const e = data.people.find((x) => x.id === drag);
    setDrag("");
    setOver("");
    if (!e || (target && !canDrop(target))) return;
    const boss = data.people.find((x) => x.id === target);
    save("people", { ...e, managerId: target });
    notify(boss ? `${e.name} → unter ${boss.name}` : `${e.name} → ganz oben`);
  };
  const kids = (id: string) => people.filter((e) => e.managerId === id).sort(byRole);
  const roots = people.filter((e) => !e.managerId || !ids.has(e.managerId)).sort(byRole);
  const leads = (list: Person[]) => list.filter((c) => kids(c.id).length > 0);
  const leaves = (list: Person[]) => list.filter((c) => kids(c.id).length === 0);
  const node = (e: Person): React.ReactNode => {
    const k = kids(e.id);
    return (
      <li key={e.id}>
        <button
          type="button"
          className={`v-org-card r-${e.rolle} ${highlight && !highlight.has(e.id) ? "dim" : ""} ${drag === e.id ? "dragging" : ""} ${over === e.id ? "over" : ""}`}
          onClick={() => onOpen(e)}
          draggable={edit && (top || e.id !== data.meId)}
          onDragStart={(ev) => {
            ev.dataTransfer.effectAllowed = "move";
            ev.dataTransfer.setData("text/plain", e.name);
            // changing the page inside dragstart cancels the drag in Chrome – mark it right after
            setTimeout(() => setDrag(e.id));
          }}
          onDragEnd={() => (setDrag(""), setOver(""))}
          onDragOver={(ev) => {
            if (!canDrop(e.id)) return;
            ev.preventDefault();
            ev.stopPropagation();
            setOver(e.id);
          }}
          onDragLeave={() => over === e.id && setOver("")}
          onDrop={(ev) => {
            ev.preventDefault();
            ev.stopPropagation();
            move(e.id);
          }}
          title={edit ? "Ziehen und auf eine andere Person fallen lassen = darunter einordnen" : undefined}
        >
          <Avatar id={e.id} size={30} />
          <span>
            <strong>{e.name}</strong>
            <small>{ROLLE_LABEL[e.rolle]}</small>
          </span>
          {k.length > 0 && <em>{k.length}</em>}
        </button>
        {/* a crew without own leaders stacks vertically – keeps big teams narrow */}
        {k.length > 0 && leads(k).length === 0 && <ul className="stack">{k.map(node)}</ul>}
        {leads(k).length > 0 && (
          <ul>
            {leaves(k).length > 0 && (
              <li className="leafs">
                <ul className="stack inline">{leaves(k).map(node)}</ul>
              </li>
            )}
            {leads(k).map(node)}
          </ul>
        )}
      </li>
    );
  };
  return (
    <div className="panel v-org">
      <p className="v-org-hint">
        {edit ? "Personen mit der Maus auf eine andere Person ziehen = darunter einordnen. " : ""}Leiter sehen in Projekten, Planung und Team sich und alle unter sich, Monteure ihr Team.
      </p>
      {edit && top && drag && (
        <div className={`v-org-top ${over === "__top" ? "over" : ""}`} onDragOver={(ev) => (ev.preventDefault(), setOver("__top"))} onDragLeave={() => setOver("")} onDrop={(ev) => (ev.preventDefault(), move(""))}>
          Hier ablegen = ganz oben (ohne Vorgesetzte)
        </div>
      )}
      <div
        className="v-org-scroll"
        ref={(el) => {
          if (el && !el.dataset.centred) {
            el.dataset.centred = "1";
            el.scrollLeft = (el.scrollWidth - el.clientWidth) / 2;
          }
        }}
      >
        <ul className="v-org-tree">{roots.map(node)}</ul>
      </div>
    </div>
  );
}

/** Month view: one row per person, one column per day. Drag across days to enter Urlaub, ZA or Krankenstand. */
export function AbsenceCalendar({ people, onPick }: { people: Person[]; onPick: (a: Partial<Absence>) => void }) {
  const { data } = useStore();
  const t = today();
  const [month, setMonth] = useState(t.slice(0, 7));
  const [range, setRange] = useState<{ emp: string; a: string; b: string } | null>(null);
  const first = `${month}-01`;
  const days: string[] = [];
  for (let d = first; d.slice(0, 7) === month; d = addDays(d, 1)) days.push(d);
  const shiftMonth = (n: number) => {
    const [y, m] = month.split("-").map(Number);
    const d = new Date(Date.UTC(y, m - 1 + n, 1));
    setMonth(`${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`);
  };
  const absOn = (emp: string, d: string) => data.absences.find((a) => a.employeeId === emp && a.start <= d && a.end >= d);
  const picked = (emp: string, d: string) => range && range.emp === emp && d >= (range.a < range.b ? range.a : range.b) && d <= (range.a < range.b ? range.b : range.a);
  const finish = () => {
    if (!range) return;
    const [start, end] = range.a < range.b ? [range.a, range.b] : [range.b, range.a];
    setRange(null);
    onPick({ employeeId: range.emp, start, end, type: "urlaub" });
  };
  const holidays = (emp: string) => {
    const y = month.slice(0, 4);
    return data.absences.filter((a) => a.employeeId === emp && a.type === "urlaub" && a.start.startsWith(y)).reduce((n, a) => n + workdaysBetween(a.start, a.end), 0);
  };

  return (
    <div className="panel v-cal" onPointerUp={finish} onPointerLeave={() => range && finish()}>
      <header>
        <div className="v-cal-nav">
          <IconButton label="Voriger Monat" onClick={() => shiftMonth(-1)}>
            <ChevronLeft size={17} />
          </IconButton>
          <h2>{monthLabel(first, true)}</h2>
          <IconButton label="Nächster Monat" onClick={() => shiftMonth(1)}>
            <ChevronRight size={17} />
          </IconButton>
          <button type="button" className="link" onClick={() => setMonth(t.slice(0, 7))}>
            Heute
          </button>
        </div>
        <div className="v-cal-legend">
          {ABS_TYPES.map((k) => (
            <span key={k}>
              <i style={{ background: ABSENCE[k].color }} /> {ABSENCE[k].label}
            </span>
          ))}
          <span className="muted">Über mehrere Tage ziehen = eintragen</span>
        </div>
      </header>
      <div className="v-cal-scroll">
        <table style={{ "--days": days.length } as CSSProperties}>
          <thead>
            <tr>
              <th className="v-cal-name">Mitarbeiter</th>
              {days.map((d) => (
                <th key={d} className={`${isWeekend(d) ? "we" : ""} ${holidayName(d) ? "hol" : ""} ${d === t ? "today" : ""}`} title={holidayName(d)}>
                  <span>{Number(d.slice(8))}</span>
                  <small>{weekdayShort(d).slice(0, 2)}</small>
                </th>
              ))}
              <th className="v-cal-sum" title="Urlaubstage dieses Jahr">
                U {month.slice(0, 4)}
              </th>
            </tr>
          </thead>
          <tbody>
            {people.map((e) => (
              <tr key={e.id}>
                <th className="v-cal-name">
                  <span className="v-cal-who">
                    <Avatar id={e.id} size={20} />
                    <span>{e.name}</span>
                  </span>
                </th>
                {days.map((d) => {
                  const a = absOn(e.id, d);
                  const off = isWeekend(d) || !!holidayName(d);
                  return (
                    <td
                      key={d}
                      className={`${off ? "off" : ""} ${d === t ? "today" : ""} ${picked(e.id, d) ? "pick" : ""} ${a ? "abs" : ""}`}
                      style={a ? ({ "--c": ABSENCE[a.type].color } as CSSProperties) : undefined}
                      title={a ? `${ABSENCE[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}` : undefined}
                      onPointerDown={(ev) => {
                        ev.preventDefault();
                        if (a) return onPick(a);
                        setRange({ emp: e.id, a: d, b: d });
                      }}
                      onPointerEnter={() => range && range.emp === e.id && setRange({ ...range, b: d })}
                    >
                      {a && !off ? ABSENCE[a.type].short : ""}
                    </td>
                  );
                })}
                <td className="v-cal-sum">{holidays(e.id) || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function AbsenceForm({ absence, people, onClose }: { absence: Partial<Absence>; people: Person[]; onClose: () => void }) {
  const { save, remove, notify } = useStore();
  const isNew = !absence.id;
  const [employeeId, setEmployeeId] = useState(absence.employeeId ?? people[0]?.id ?? "");
  const [type, setType] = useState<AbsenceType>(absence.type ?? "urlaub");
  const [start, setStart] = useState(absence.start ?? today());
  const [end, setEnd] = useState(absence.end ?? today());
  const [note, setNote] = useState(absence.note ?? "");
  const name = people.find((p) => p.id === employeeId)?.name ?? "";

  return (
    <Modal
      kicker="Abwesenheit"
      title={isNew ? "Abwesenheit eintragen" : `${ABSENCE[type].label} · ${name}`}
      onClose={onClose}
      footer={
        <>
          {!isNew && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => (remove("absences", absence.id!), onClose())}>
              Löschen
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button
            variant="primary"
            disabled={!employeeId}
            onClick={() => {
              save("absences", { id: absence.id ?? uid(), note: note.trim(), employeeId, type, start, end: end < start ? start : end });
              notify(`${ABSENCE[type].label} eingetragen: ${name}`);
              onClose();
            }}
          >
            Speichern
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Wer?" className="span-2">
          <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
            {people.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="span-2">
          <Seg<AbsenceType> value={type} onChange={setType} options={ABS_TYPES.map((k) => ({ value: k, label: ABSENCE[k].label }))} />
        </div>
        <Field label="Von">
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </Field>
        <Field label="Bis">
          <input type="date" value={end} min={start} onChange={(e) => e.target.value && setEnd(e.target.value)} />
        </Field>
        <Field label="Notiz" className="span-2">
          <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="optional, z. B. Krankmeldung liegt vor" />
        </Field>
      </div>
    </Modal>
  );
}

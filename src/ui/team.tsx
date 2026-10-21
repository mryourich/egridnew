"use client";

import { CalendarPlus, ChevronLeft, ChevronRight, Phone, Plus, Search, Trash2 } from "lucide-react";
import { useState, type CSSProperties } from "react";
import { addDays, fmt, holidayName, isWeekend, monthLabel, today, weekdayShort, workdaysBetween } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import type { Absence, AbsenceType, Employee } from "@/lib/types";
import { assignableRoles, subtree } from "@/lib/roles";
import { ABSENCE, activePeople, canEditTeam, canRemove, dayText, ROLLE_INFO, ROLLE_LABEL, ROLLEN, rolleOf, scopedPeople, type Rolle } from "./access";
import { Empty, Face, Field, PageHead, Sheet } from "./kit";

type Tab = "leute" | "org" | "abwesend";
const ABS_KEYS: AbsenceType[] = ["urlaub", "za", "krank", "schulung"];
const ABS_SHORT: Record<string, string> = { urlaub: "U", za: "ZA", krank: "K", schulung: "S", sonstiges: "–" };

/** The people of the company – searchable, also with a hundred people – and an absence calendar. */
export function Team() {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>("leute");
  const [person, setPerson] = useState<Partial<Employee> | null>(null);
  const [away, setAway] = useState<Partial<Absence> | null>(null);
  const [query, setQuery] = useState("");
  const [role, setRole] = useState<Rolle | "alle">("alle");
  const planner = canEditTeam(data);
  const t = today();
  const people = scopedPeople(data);
  const q = query.trim().toLowerCase();
  const shown = people
    .filter((e) => (role === "alle" || rolleOf(e) === role) && (!q || [e.name, e.role, e.phone, e.email, e.team].join(" ").toLowerCase().includes(q)))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const awayToday = data.absences.filter((a) => a.start <= t && a.end >= t && people.some((e) => e.id === a.employeeId)).length;
  const count = (r: Rolle | "alle") => (r === "alle" ? people.length : people.filter((e) => rolleOf(e) === r).length);
  const roleFilter: (Rolle | "alle")[] = ["alle", ...ROLLEN.filter((r) => count(r) > 0)];

  return (
    <div className="v-page">
      <PageHead title="Team" sub={`${people.length} ${people.length === 1 ? "Person" : "Personen"} · heute ${awayToday} abwesend · Monteure kosten nichts extra`}>
        {planner && (
          <>
            <button type="button" className="v-btn" onClick={() => setAway({ start: t, end: t, type: "urlaub" })}>
              <CalendarPlus size={16} /> Urlaub / ZA / Krank
            </button>
            <button type="button" className="v-btn primary" onClick={() => setPerson({})}>
              <Plus size={17} /> Mitarbeiter
            </button>
          </>
        )}
      </PageHead>

      <div className="v-team-bar">
        <div className="v-seg">
          <button type="button" className={tab === "leute" ? "on" : ""} onClick={() => setTab("leute")}>
            Mitarbeiter
          </button>
          <button type="button" className={tab === "org" ? "on" : ""} onClick={() => setTab("org")}>
            Organigramm
          </button>
          <button type="button" className={tab === "abwesend" ? "on" : ""} onClick={() => setTab("abwesend")}>
            Abwesenheiten
          </button>
        </div>
        <label className="v-team-search">
          <Search size={15} />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, Rolle, Telefon …" aria-label="Suchen" />
        </label>
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
          <Empty>Niemand gefunden.</Empty>
        ) : (
          <div className="v-panel v-team-table">
            <table className="v-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Rolle</th>
                  <th className="hide-sm">Vorgesetzt</th>
                  <th className="hide-sm">Telefon</th>
                  <th>Heute</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((e) => {
                  const d = dayText(data, e.id, t);
                  const absent = d.am.kind === "absence";
                  return (
                    <tr key={e.id} className={planner ? "click" : ""} onClick={() => planner && setPerson(e)}>
                      <td>
                        <span className="v-team-name">
                          <Face id={e.id} size={28} />
                          <span>
                            <strong>{e.name}</strong>
                            {e.role && e.role !== ROLLE_LABEL[rolleOf(e)] && <small>{e.role}</small>}
                          </span>
                        </span>
                      </td>
                      <td>
                        <span className={`v-role r-${rolleOf(e)}`}>{ROLLE_LABEL[rolleOf(e)]}</span>
                      </td>
                      <td className="hide-sm muted-ink">{data.employees.find((x) => x.id === e.managerId)?.name ?? "–"}</td>
                      <td className="hide-sm">
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
        <OrgChart people={people} highlight={q || role !== "alle" ? new Set(shown.map((e) => e.id)) : null} onOpen={(e) => planner && setPerson(e)} />
      ) : (
        <AbsenceCalendar people={shown} onPick={(a) => planner && setAway(a)} />
      )}

      {person && <PersonSheet person={person} onClose={() => setPerson(null)} />}
      {away && <AbsenceSheet absence={away} onClose={() => setAway(null)} />}
    </div>
  );
}

/** Organisation chart: who leads whom – it decides what everybody sees in planning and team. */
function OrgChart({ people, highlight, onOpen }: { people: Employee[]; highlight: Set<string> | null; onOpen: (e: Employee) => void }) {
  const ids = new Set(people.map((e) => e.id));
  const byRole = (a: Employee, b: Employee) => ROLLEN.indexOf(rolleOf(a)) - ROLLEN.indexOf(rolleOf(b)) || a.name.localeCompare(b.name, "de");
  const kids = (id: string) => people.filter((e) => e.managerId === id).sort(byRole);
  const roots = people.filter((e) => !e.managerId || !ids.has(e.managerId)).sort(byRole);
  const leads = (list: Employee[]) => list.filter((c) => kids(c.id).length > 0);
  const leaves = (list: Employee[]) => list.filter((c) => kids(c.id).length === 0);
  const node = (e: Employee): React.ReactNode => {
    const k = kids(e.id);
    return (
      <li key={e.id}>
        <button type="button" className={`v-org-card r-${rolleOf(e)} ${highlight && !highlight.has(e.id) ? "dim" : ""}`} onClick={() => onOpen(e)}>
          <Face id={e.id} size={30} />
          <span>
            <strong>{e.name}</strong>
            <small>{ROLLE_LABEL[rolleOf(e)]}</small>
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
    <div className="v-panel v-org">
      <p className="v-org-hint">
        Wer wen führt, legst du beim Mitarbeiter unter „Vorgesetzt“ fest. Leiter sehen in Planung und Team sich und alle unter sich, Monteure ihr Team.
      </p>
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
function AbsenceCalendar({ people, onPick }: { people: Employee[]; onPick: (a: Partial<Absence>) => void }) {
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
  const inRange = (emp: string, d: string) => range && range.emp === emp && d >= (range.a < range.b ? range.a : range.b) && d <= (range.a < range.b ? range.b : range.a);
  const finish = () => {
    if (!range) return;
    const [start, end] = range.a < range.b ? [range.a, range.b] : [range.b, range.a];
    setRange(null);
    onPick({ employeeId: range.emp, start, end, type: "urlaub" });
  };
  const totals = (emp: string) => {
    const y = month.slice(0, 4);
    return data.absences
      .filter((a) => a.employeeId === emp && a.type === "urlaub" && a.start.startsWith(y))
      .reduce((n, a) => n + workdaysBetween(a.start, a.end), 0);
  };

  return (
    <div className="v-panel v-cal" onPointerUp={finish} onPointerLeave={() => range && finish()}>
      <header>
        <div className="v-cal-nav">
          <button type="button" className="v-icon" onClick={() => shiftMonth(-1)} aria-label="Voriger Monat">
            <ChevronLeft size={17} />
          </button>
          <h2>{monthLabel(first, true)}</h2>
          <button type="button" className="v-icon" onClick={() => shiftMonth(1)} aria-label="Nächster Monat">
            <ChevronRight size={17} />
          </button>
          <button type="button" className="v-link" onClick={() => setMonth(t.slice(0, 7))}>
            Heute
          </button>
        </div>
        <div className="v-cal-legend">
          {ABS_KEYS.map((k) => (
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
                    <Face id={e.id} size={20} />
                    <span>{e.name}</span>
                  </span>
                </th>
                {days.map((d) => {
                  const a = absOn(e.id, d);
                  const off = isWeekend(d) || !!holidayName(d);
                  return (
                    <td
                      key={d}
                      className={`${off ? "off" : ""} ${d === t ? "today" : ""} ${inRange(e.id, d) ? "pick" : ""} ${a ? "abs" : ""}`}
                      style={a ? ({ "--c": ABSENCE[a.type].color } as CSSProperties) : undefined}
                      title={a ? `${ABSENCE[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}` : undefined}
                      onPointerDown={(ev) => {
                        ev.preventDefault();
                        if (a) return onPick(a);
                        setRange({ emp: e.id, a: d, b: d });
                      }}
                      onPointerEnter={() => range && range.emp === e.id && setRange({ ...range, b: d })}
                    >
                      {a && !off ? ABS_SHORT[a.type] : ""}
                    </td>
                  );
                })}
                <td className="v-cal-sum">{totals(e.id) || ""}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PersonSheet({ person, onClose }: { person: Partial<Employee>; onClose: () => void }) {
  const { data, save, notify } = useStore();
  const isNew = !person.id;
  const [name, setName] = useState(person.name ?? "");
  const [role, setRole] = useState<Rolle>(isNew ? "monteur" : rolleOf(person as Employee));
  const [managerId, setManagerId] = useState(person.managerId ?? (isNew ? data.currentUserId : ""));
  const allowed = assignableRoles(data);
  // nobody can report to themselves or to someone below them
  const below = person.id ? subtree(data, person.id) : new Set<string>();
  const bosses = activePeople(data).filter((e) => !below.has(e.id) && !["monteur", "lehrling", "extern"].includes(rolleOf(e)));
  const [phone, setPhone] = useState(person.phone ?? "");
  const [email, setEmail] = useState(person.email ?? "");

  const submit = () => {
    if (!name.trim()) return;
    const base: Employee = isNew
      ? { id: uid("e"), name: "", role: "", department: "", team: "", phone: "", email: "", hourlyRate: 0, qualifications: [], active: true }
      : (person as Employee);
    const item: Employee = { ...base, name: name.trim(), rolle: role, managerId, role: base.role && !isNew && rolleOf(base) === role ? base.role : ROLLE_LABEL[role], phone: phone.trim(), email: email.trim() };
    save("employees", item, isNew ? `${item.name} angelegt` : `${item.name} geändert`);
    notify(isNew ? `${item.name} ist im Team` : "Gespeichert");
    onClose();
  };

  return (
    <Sheet
      title={isNew ? "Neuer Mitarbeiter" : person.name}
      onClose={onClose}
      footer={
        <>
          {!isNew && canEditTeam(data) && person.id !== data.currentUserId && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                if (!window.confirm(`${person.name} aus dem Team nehmen?`)) return;
                save("employees", { ...(person as Employee), active: false }, `${person.name} ausgetreten`);
                onClose();
              }}
            >
              <Trash2 size={16} /> Aus dem Team
            </button>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button type="button" className="v-btn primary" onClick={submit} disabled={!name.trim()}>
            {isNew ? "Anlegen" : "Speichern"}
          </button>
        </>
      }
    >
      <Field label="Name">
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder="Vor- und Nachname" />
      </Field>
      <Field label="Rolle" hint={ROLLE_INFO[role]}>
        <div className="v-switch small wrap">
          {ROLLEN.filter((r) => allowed.includes(r) || r === role).map((r) => (
            <button key={r} type="button" className={role === r ? "on" : ""} onClick={() => setRole(r)} disabled={!allowed.includes(r)}>
              {ROLLE_LABEL[r]}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Vorgesetzt" hint="Bestimmt den Platz im Organigramm – und damit, wer diese Person in Planung und Team sieht.">
        <select value={managerId} onChange={(e) => setManagerId(e.target.value)}>
          <option value="">– niemand (ganz oben) –</option>
          {bosses.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name} · {ROLLE_LABEL[rolleOf(e)]}
            </option>
          ))}
        </select>
      </Field>
      <div className="v-row2">
        <Field label="Telefon">
          <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+43 …" />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

function AbsenceSheet({ absence, onClose }: { absence: Partial<Absence>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !absence.id;
  const people = activePeople(data);
  const [employeeId, setEmployeeId] = useState(absence.employeeId ?? people[0]?.id ?? "");
  const [type, setType] = useState<AbsenceType>(absence.type ?? "urlaub");
  const [start, setStart] = useState(absence.start ?? today());
  const [end, setEnd] = useState(absence.end ?? today());

  return (
    <Sheet
      title={isNew ? "Abwesenheit eintragen" : "Abwesenheit"}
      onClose={onClose}
      footer={
        <>
          {!isNew && canRemove(data) && (
            <button
              type="button"
              className="v-btn ghost danger"
              onClick={() => {
                remove("absences", absence.id!);
                onClose();
              }}
            >
              <Trash2 size={16} /> Löschen
            </button>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="v-btn primary"
            disabled={!employeeId}
            onClick={() => {
              save("absences", { id: absence.id ?? uid("ab"), note: absence.note ?? "", employeeId, type, start, end: end < start ? start : end });
              notify(`${ABSENCE[type].label} eingetragen`);
              onClose();
            }}
          >
            Speichern
          </button>
        </>
      }
    >
      <Field label="Wer?">
        <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          {people.map((e) => (
            <option key={e.id} value={e.id}>
              {e.name}
            </option>
          ))}
        </select>
      </Field>
      <div className="v-switch small wrap">
        {ABS_KEYS.map((k) => (
          <button key={k} type="button" className={type === k ? "on" : ""} onClick={() => setType(k)}>
            {ABSENCE[k].label}
          </button>
        ))}
      </div>
      <div className="v-row2">
        <Field label="Von">
          <input type="date" value={start} onChange={(e) => e.target.value && setStart(e.target.value)} />
        </Field>
        <Field label="Bis">
          <input type="date" value={end} min={start} onChange={(e) => e.target.value && setEnd(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

"use client";

import { ChevronLeft, ChevronRight, Coffee, Download, LogIn, LogOut, Play, Plus, Square, Timer, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { addDays, fmt, isoWeek, isWeekend, startOfWeek, today, weekdayShort } from "@/core/date";
import { downloadBlob } from "@/core/files";
import { byRole, isField, me, rightsOf, ROLLE_LABEL, scopedPeople } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { ClockDay, Data, TimeEntry } from "@/core/types";
import { Avatar, Button, IconButton, PageHead, Seg, Tag } from "@/core/ui";
import { visibleProjects } from "./model";
import { ABSENCE } from "./plan-kit";
import { balance, billingOf, clockMinutes, eur0, fmtH, minutesOf, targetOn, workedOn } from "./money";

const hm = (d: Date) => `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
const monthStart = (d: string) => `${d.slice(0, 7)}-01`;

/** Re-render every half minute while something runs. */
function useTick(active: boolean) {
  const [, set] = useState(0);
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => set((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [active]);
}

/** Clock in/out, breaks and the job timer of the signed-in person. */
function useClock() {
  const { data, save, notify } = useStore();
  const t = today();
  const day = data.clock.find((c) => c.employeeId === data.meId && c.date === t);
  const onBreak = !!day && !day.out && day.breaks.some((b) => !b.end);
  const running = !!day && !day.out;
  const put = (c: ClockDay) => save("clock", c);
  return {
    day,
    running,
    onBreak,
    clockIn() {
      if (day && !day.out) return;
      put(day ? { ...day, out: undefined } : { id: uid(), employeeId: data.meId, date: t, in: now(), breaks: [] });
      notify(`Eingestempelt ${hm(new Date())}`);
    },
    pause() {
      if (!day || day.out) return;
      put({ ...day, breaks: onBreak ? day.breaks.map((b) => (b.end ? b : { ...b, end: now() })) : [...day.breaks, { start: now() }] });
      notify(onBreak ? "Pause beendet" : "Pause gestartet");
    },
    clockOut() {
      if (!day || day.out) return;
      const stopped = this.stopTimer(day);
      put({ ...stopped, out: now(), breaks: stopped.breaks.map((b) => (b.end ? b : { ...b, end: now() })) });
      notify(`Feierabend – ${fmtH(clockMinutes(day))} gearbeitet`);
    },
    startTimer(projectId: string, activity: string) {
      let base = day;
      if (!base || base.out) {
        base = { id: base?.id ?? uid(), employeeId: data.meId, date: t, in: base?.in ?? now(), breaks: base?.breaks ?? [] };
      }
      const stopped = base.timer ? this.stopTimer(base) : base;
      put({ ...stopped, timer: { projectId, activity, since: now() } });
      notify(`Timer läuft: ${data.projects.find((p) => p.id === projectId)?.name ?? "Intern"}`);
    },
    /** Books the running timer as a time entry; returns the day without timer. */
    stopTimer(c: ClockDay = day!): ClockDay {
      if (!c?.timer) return c;
      const from = new Date(c.timer.since);
      const to = new Date();
      if (to.getTime() - from.getTime() >= 60_000)
        save(
          "times",
          { id: uid(), employeeId: data.meId, projectId: c.timer.projectId, date: t, start: hm(from), end: hm(to), pause: 0, activity: c.timer.activity, billable: !!c.timer.projectId, createdBy: data.meId, createdAt: now() },
          `${Math.round((to.getTime() - from.getTime()) / 60000)} min gebucht`
        );
      const next = { ...c, timer: undefined };
      save("clock", next);
      return next;
    }
  };
}

/** Time clock in the top bar: one click in, pause, out – the live working time always in view. */
export function ClockPill() {
  const { data } = useStore();
  const clock = useClock();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useTick(clock.running);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  if (!me(data)) return null;
  const worked = clock.day ? clockMinutes(clock.day) : 0;
  const state = !clock.day ? "out" : clock.day.out ? "done" : clock.onBreak ? "break" : "in";

  return (
    <div className="topbar-pop-wrap" ref={box}>
      <button type="button" className={`clock-pill ${state}`} onClick={() => (state === "out" ? clock.clockIn() : setOpen((o) => !o))} title="Stempeluhr">
        {state === "out" ? <LogIn size={15} /> : <Timer size={15} />}
        <span>{state === "out" ? "Einstempeln" : state === "done" ? `Feierabend · ${fmtH(worked)}` : `${state === "break" ? "Pause" : "Im Dienst"} · ${fmtH(worked)}`}</span>
      </button>
      {open && clock.day && (
        <div className="topbar-pop clock-pop">
          <ClockPanel compact />
        </div>
      )}
    </div>
  );
}

/** The time clock with the job timer – in the top bar and on "Meine Zeiten". */
function ClockPanel({ compact }: { compact?: boolean }) {
  const { data } = useStore();
  const clock = useClock();
  const projects = visibleProjects(data);
  const [projectId, setProjectId] = useState(projects[0]?.id ?? "");
  const [activity, setActivity] = useState("");
  useTick(clock.running);
  const t = today();
  const worked = clock.day ? clockMinutes(clock.day) : 0;
  const target = targetOn(data, t);
  const timer = clock.day?.timer;
  const timerMin = timer ? Math.round((Date.now() - new Date(timer.since).getTime()) / 60000) : 0;

  return (
    <div className={`clock-panel ${compact ? "compact" : ""}`}>
      <div className="clock-head">
        <div>
          <span>Heute gearbeitet</span>
          <strong>{fmtH(worked)}</strong>
          <small>
            Soll {fmtH(target)}
            {clock.day && ` · seit ${hm(new Date(clock.day.in))}`}
            {clock.day?.breaks.length ? ` · ${clock.day.breaks.length} Pause${clock.day.breaks.length > 1 ? "n" : ""}` : ""}
          </small>
        </div>
        <div className="clock-actions">
          {!clock.running ? (
            <Button variant="primary" icon={<LogIn size={15} />} onClick={() => clock.clockIn()}>
              {clock.day?.out ? "Wieder einstempeln" : "Einstempeln"}
            </Button>
          ) : (
            <>
              <Button icon={<Coffee size={15} />} onClick={() => clock.pause()}>
                {clock.onBreak ? "Pause beenden" : "Pause"}
              </Button>
              <Button variant="danger" icon={<LogOut size={15} />} onClick={() => clock.clockOut()}>
                Feierabend
              </Button>
            </>
          )}
        </div>
      </div>
      <div className="clock-timer">
        <span className="clock-label">Auf Projekt buchen</span>
        {timer ? (
          <div className="clock-running">
            <span className="dot" />
            <strong>{data.projects.find((p) => p.id === timer.projectId)?.name ?? "Intern"}</strong>
            <small>
              {timer.activity || "ohne Tätigkeit"} · {fmtH(timerMin)}
            </small>
            <Button size="sm" icon={<Square size={13} />} onClick={() => clock.stopTimer()}>
              Stopp & buchen
            </Button>
          </div>
        ) : (
          <div className="clock-start">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label="Projekt">
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              <option value="">Intern (Lager, Büro, Schulung)</option>
            </select>
            <input value={activity} onChange={(e) => setActivity(e.target.value)} placeholder="Tätigkeit, z. B. Kabelzug" aria-label="Tätigkeit" />
            <Button size="sm" variant="primary" icon={<Play size={13} />} onClick={() => (clock.startTimer(projectId, activity.trim()), setActivity(""))}>
              Start
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ my times */

export function MyTimes() {
  const { data, save, remove } = useStore();
  const t = today();
  const [week, setWeek] = useState(startOfWeek(t));
  const days = Array.from({ length: 7 }, (_, i) => addDays(week, i));
  const mine = data.times.filter((x) => x.employeeId === data.meId && x.date >= week && x.date <= days[6]);
  const weekMin = days.reduce((s, d) => s + workedOn(data, data.meId, d), 0);
  const weekTarget = days.reduce((s, d) => s + targetOn(data, d), 0);
  const saldo = balance(data, data.meId, monthStart(t), addDays(t, -1));
  const booked = mine.reduce((s, x) => s + minutesOf(x), 0);
  const billable = mine.filter((x) => x.billable).reduce((s, x) => s + minutesOf(x), 0);
  const projects = visibleProjects(data);

  return (
    <>
      <PageHead kicker="Meine Zeiten" title="Zeiterfassung" sub="Einstempeln, Pausen, Feierabend – und Stunden direkt auf Projekte buchen." />
      <ClockPanel />
      <div className="kpis">
        <div className="kpi">
          <span>Diese Woche</span>
          <b>{fmtH(weekMin)}</b>
          <small>Soll {fmtH(weekTarget)}</small>
        </div>
        <div className="kpi">
          <span>Auf Projekte gebucht</span>
          <b>{fmtH(booked)}</b>
          <small>{booked ? Math.round((billable / booked) * 100) : 0} % verrechenbar</small>
        </div>
        <div className="kpi">
          <span>Saldo diesen Monat</span>
          <b className={saldo < 0 ? "bad" : ""}>{fmtH(saldo)}</b>
          <small>Überstunden bis gestern</small>
        </div>
        <div className="kpi">
          <span>Tagessoll</span>
          <b>{fmtH(Math.round((billingOf(data).weekHours / 5) * 60))}</b>
          <small>{billingOf(data).weekHours} h Woche</small>
        </div>
      </div>

      <section className="panel">
        <header className="panel-head">
          <h2>
            KW {isoWeek(week)} · {fmt(week)} – {fmt(days[6])}
          </h2>
          <span className="week-nav">
            <IconButton label="Vorige Woche" onClick={() => setWeek(addDays(week, -7))}>
              <ChevronLeft size={16} />
            </IconButton>
            <button type="button" className="link" onClick={() => setWeek(startOfWeek(t))}>
              Diese Woche
            </button>
            <IconButton label="Nächste Woche" onClick={() => setWeek(addDays(week, 7))}>
              <ChevronRight size={16} />
            </IconButton>
          </span>
        </header>
        <table className="table time-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Projekt</th>
              <th>Tätigkeit</th>
              <th>Von</th>
              <th>Bis</th>
              <th className="num">Pause</th>
              <th className="num">Stunden</th>
              <th>Verr.</th>
              <th className="w-menu" />
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const list = mine.filter((x) => x.date === d).sort((a, b) => a.start.localeCompare(b.start));
              const away = data.absences.find((a) => a.employeeId === data.meId && a.start <= d && a.end >= d);
              return (
                <DayRows key={d} day={d} list={list} away={away ? ABSENCE[away.type].label : ""} weekend={isWeekend(d)} projects={projects.map((p) => ({ id: p.id, name: p.name }))} onSave={(x) => save("times", x)} onRemove={(x) => remove("times", x.id)} />
              );
            })}
          </tbody>
        </table>
      </section>
    </>
  );
}

function DayRows({ day, list, away, weekend, projects, onSave, onRemove }: { day: string; list: TimeEntry[]; away: string; weekend: boolean; projects: { id: string; name: string }[]; onSave: (x: TimeEntry) => void; onRemove: (x: TimeEntry) => void }) {
  const { data } = useStore();
  const sum = list.reduce((s, x) => s + minutesOf(x), 0);
  const add = () => onSave({ id: uid(), employeeId: data.meId, projectId: projects[0]?.id ?? "", date: day, start: "07:00", end: "16:00", pause: 30, activity: "", billable: !!projects[0], createdBy: data.meId, createdAt: now() });
  const label = (
    <td rowSpan={Math.max(1, list.length)} className={`time-day ${weekend ? "we" : ""} ${day === today() ? "today" : ""}`}>
      <strong>
        {weekdayShort(day)} {fmt(day).slice(0, 6)}
      </strong>
      <small>{away || (sum ? fmtH(sum) : "")}</small>
      <button type="button" className="link small" onClick={add}>
        <Plus size={12} /> Zeit
      </button>
    </td>
  );
  if (!list.length)
    return (
      <tr className="time-empty">
        {label}
        <td colSpan={8} className="muted">
          {away ? away : weekend ? "" : "keine Zeiten gebucht"}
        </td>
      </tr>
    );
  return (
    <>
      {list.map((x, i) => (
        <tr key={x.id}>
          {i === 0 && label}
          <td>
            <select className="cell-input" value={x.projectId} onChange={(e) => onSave({ ...x, projectId: e.target.value, billable: !!e.target.value && x.billable })}>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
              {x.projectId && !projects.some((p) => p.id === x.projectId) && <option value={x.projectId}>{data.projects.find((p) => p.id === x.projectId)?.name ?? "Projekt"}</option>}
              <option value="">Intern</option>
            </select>
          </td>
          <td>
            <input className="cell-input" key={x.activity} defaultValue={x.activity} placeholder="Tätigkeit" onBlur={(e) => e.target.value !== x.activity && onSave({ ...x, activity: e.target.value })} />
          </td>
          <td>
            <input className="cell-input time" type="time" value={x.start} onChange={(e) => e.target.value && onSave({ ...x, start: e.target.value })} />
          </td>
          <td>
            <input className="cell-input time" type="time" value={x.end} onChange={(e) => e.target.value && onSave({ ...x, end: e.target.value })} />
          </td>
          <td className="num">
            <input className="cell-input num" type="number" min={0} step={5} value={x.pause} onChange={(e) => onSave({ ...x, pause: Number(e.target.value) || 0 })} />
          </td>
          <td className="num strong">{fmtH(minutesOf(x))}</td>
          <td>
            <input type="checkbox" className="check" checked={x.billable} disabled={!x.projectId} onChange={(e) => onSave({ ...x, billable: e.target.checked })} aria-label="verrechenbar" />
          </td>
          <td className="w-menu">
            <IconButton label="Löschen" onClick={() => onRemove(x)}>
              <Trash2 size={14} />
            </IconButton>
          </td>
        </tr>
      ))}
    </>
  );
}

/* ------------------------------------------------------------------ attendance */

/** Who is in today, on a break, done or away – and the overtime balance. */
export function Attendance() {
  const { data } = useStore();
  const t = today();
  const people = isField(data) ? data.people.filter((p) => p.id === data.meId) : scopedPeople(data).sort(byRole);
  useTick(true);
  const rows = people.map((p) => {
    const c = data.clock.find((x) => x.employeeId === p.id && x.date === t);
    const away = data.absences.find((a) => a.employeeId === p.id && a.start <= t && a.end >= t);
    const state = away ? { label: ABSENCE[away.type].label, tone: "amber" as const } : !c ? { label: "nicht gestempelt", tone: "gray" as const } : c.out ? { label: `Feierabend ${hm(new Date(c.out))}`, tone: "gray" as const } : c.breaks.some((b) => !b.end) ? { label: "Pause", tone: "amber" as const } : { label: `im Dienst seit ${hm(new Date(c.in))}`, tone: "green" as const };
    return { p, c, state, worked: workedOn(data, p.id, t), saldo: balance(data, p.id, monthStart(t), addDays(t, -1)) };
  });
  const count = (tone: string) => rows.filter((r) => r.state.tone === tone).length;
  return (
    <>
      <PageHead kicker="Anwesenheit" title="Zeiterfassung" sub="Wer ist heute im Dienst, in Pause oder abwesend – live aus der Stempeluhr." />
      <div className="kpis">
        <div className="kpi">
          <span>Im Dienst</span>
          <b>{count("green")}</b>
        </div>
        <div className="kpi">
          <span>Pause / abwesend</span>
          <b>{count("amber")}</b>
        </div>
        <div className="kpi">
          <span>Nicht gestempelt</span>
          <b>{rows.filter((r) => !r.c && r.state.tone === "gray").length}</b>
        </div>
        <div className="kpi">
          <span>Team</span>
          <b>{rows.length}</b>
        </div>
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Status heute</th>
              <th className="num">Heute</th>
              <th className="num">Saldo Monat</th>
              <th className="hide-md">Gerade auf</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ p, c, state, worked, saldo }) => (
              <tr key={p.id}>
                <td>
                  <span className="who">
                    <Avatar id={p.id} size={26} />
                    <span>
                      <strong>{p.name}</strong>
                      <small className="sub">{ROLLE_LABEL[p.rolle]}</small>
                    </span>
                  </span>
                </td>
                <td>
                  <Tag tone={state.tone} dot>
                    {state.label}
                  </Tag>
                </td>
                <td className="num">{worked ? fmtH(worked) : "–"}</td>
                <td className={`num ${saldo < 0 ? "bad" : ""}`}>{fmtH(saldo)}</td>
                <td className="hide-md muted">{c?.timer ? data.projects.find((x) => x.id === c.timer!.projectId)?.name ?? "Intern" : "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ evaluation and export */

type Period = "30" | "monat" | "vormonat";
function periodRange(p: Period) {
  const t = today();
  if (p === "monat") return { from: monthStart(t), to: t, label: "dieser Monat" };
  if (p === "vormonat") {
    const last = addDays(monthStart(t), -1);
    return { from: monthStart(last), to: last, label: "Vormonat" };
  }
  return { from: addDays(t, -29), to: t, label: "letzte 30 Tage" };
}

/** Whose times someone may see: everybody in view for leaders, otherwise only their own. */
const visibleTimes = (data: Data) => {
  if (isField(data) || !rightsOf(data).teamView) return data.times.filter((x) => x.employeeId === data.meId);
  const ids = new Set(scopedPeople(data).map((p) => p.id));
  return data.times.filter((x) => ids.has(x.employeeId));
};

export function TimeReport() {
  const { data } = useStore();
  const [period, setPeriod] = useState<Period>("30");
  const { from, to } = periodRange(period);
  const list = visibleTimes(data).filter((x) => x.date >= from && x.date <= to);
  const total = list.reduce((s, x) => s + minutesOf(x), 0);
  const bill = list.filter((x) => x.billable).reduce((s, x) => s + minutesOf(x), 0);
  const rate = billingOf(data).rate;
  const byProject = new Map<string, number>();
  for (const x of list) byProject.set(x.projectId, (byProject.get(x.projectId) ?? 0) + minutesOf(x));
  const byPerson = new Map<string, number>();
  for (const x of list) byPerson.set(x.employeeId, (byPerson.get(x.employeeId) ?? 0) + minutesOf(x));
  const allHours = (projectId: string) => data.times.filter((x) => x.projectId === projectId && x.billable).reduce((s, x) => s + minutesOf(x), 0) / 60;

  return (
    <>
      <PageHead kicker="Auswertung" title="Zeiterfassung" sub="Stunden, verrechenbarer Anteil und Wert je Projekt – das Budget füllt sich live aus den gebuchten Zeiten.">
        <Seg<Period> value={period} onChange={setPeriod} options={[{ value: "30", label: "30 Tage" }, { value: "monat", label: "Monat" }, { value: "vormonat", label: "Vormonat" }]} />
      </PageHead>
      <div className="kpis">
        <div className="kpi">
          <span>Stunden gesamt</span>
          <b>{fmtH(total)}</b>
        </div>
        <div className="kpi">
          <span>Verrechenbar</span>
          <b>{fmtH(bill)}</b>
          <small>{total ? Math.round((bill / total) * 100) : 0} % Anteil</small>
        </div>
        <div className="kpi">
          <span>Nicht verrechenbar</span>
          <b>{fmtH(total - bill)}</b>
          <small>Lager, Büro, Schulung</small>
        </div>
        <div className="kpi">
          <span>Wert der Stunden</span>
          <b>{eur0((bill / 60) * rate)}</b>
          <small>zu {rate} €/h netto</small>
        </div>
      </div>
      <div className="cols">
        <section className="panel">
          <header className="panel-head">
            <h2>Stunden je Projekt</h2>
          </header>
          <table className="table">
            <thead>
              <tr>
                <th>Projekt</th>
                <th className="num">Stunden</th>
                <th className="num">Wert</th>
                <th className="w-progress">Budget verbraucht</th>
              </tr>
            </thead>
            <tbody>
              {[...byProject.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([pid, m]) => {
                  const p = data.projects.find((x) => x.id === pid);
                  const used = p?.budget ? Math.round(((allHours(pid) * rate) / p.budget) * 100) : null;
                  return (
                    <tr key={pid || "intern"}>
                      <td>
                        <strong>{p?.name ?? "Intern"}</strong>
                        <small className="sub">{p?.client ?? "Lager, Büro, Schulung"}</small>
                      </td>
                      <td className="num">{fmtH(m)}</td>
                      <td className="num">{p ? eur0((m / 60) * rate) : "–"}</td>
                      <td className="w-progress">
                        {used == null ? (
                          <span className="muted">–</span>
                        ) : (
                          <span className="progress-cell">
                            <span className={`b-bar t-${used > 90 ? "red" : used > 70 ? "amber" : "green"}`}>
                              <i style={{ width: `${Math.min(100, used)}%` }} />
                            </span>
                            <b>{used} %</b>
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <header className="panel-head">
            <h2>Stunden je Person</h2>
          </header>
          <table className="table">
            <tbody>
              {[...byPerson.entries()]
                .sort((a, b) => b[1] - a[1])
                .map(([id, m]) => (
                  <tr key={id}>
                    <td>
                      <span className="who">
                        <Avatar id={id} size={22} />
                        {personName(data, id)}
                      </span>
                    </td>
                    <td className="num">{fmtH(m)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

export function TimeExport() {
  const { data, notify } = useStore();
  const [period, setPeriod] = useState<Period>("monat");
  const [person, setPerson] = useState("");
  const { from, to, label } = periodRange(period);
  const people = isField(data) ? data.people.filter((p) => p.id === data.meId) : scopedPeople(data);
  const list = visibleTimes(data)
    .filter((x) => x.date >= from && x.date <= to && (!person || x.employeeId === person))
    .sort((a, b) => a.date.localeCompare(b.date) || personName(data, a.employeeId).localeCompare(personName(data, b.employeeId)) || a.start.localeCompare(b.start));
  const csv = () => {
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`;
    const rows = [["Datum", "Mitarbeiter", "Projekt", "Projektnummer", "Von", "Bis", "Pause (min)", "Stunden", "Tätigkeit", "Verrechenbar"]];
    for (const x of list) {
      const p = data.projects.find((y) => y.id === x.projectId);
      rows.push([fmt(x.date), personName(data, x.employeeId), p?.name ?? "Intern", p?.number ?? "", x.start, x.end, String(x.pause), (minutesOf(x) / 60).toFixed(2).replace(".", ","), x.activity, x.billable ? "ja" : "nein"]);
    }
    downloadBlob(new Blob(["﻿" + rows.map((r) => r.map(esc).join(";")).join("\r\n")], { type: "text/csv;charset=utf-8" }), `Stundenliste ${from} bis ${to}.csv`);
    notify(`${list.length} Einträge exportiert`);
  };
  return (
    <>
      <PageHead kicker="Export" title="Zeiterfassung" sub="Stundenliste für Lohnverrechnung und Kunden – als CSV, öffnet direkt in Excel.">
        <Button variant="primary" icon={<Download size={15} />} onClick={csv} disabled={!list.length}>
          CSV herunterladen
        </Button>
      </PageHead>
      <div className="toolbar">
        <Seg<Period> value={period} onChange={setPeriod} options={[{ value: "monat", label: "Dieser Monat" }, { value: "vormonat", label: "Vormonat" }, { value: "30", label: "30 Tage" }]} />
        <select className="select-sm" value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Mitarbeiter">
          <option value="">Alle Mitarbeiter</option>
          {people.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <span className="muted small">
          {list.length} Einträge · {fmtH(list.reduce((s, x) => s + minutesOf(x), 0))} · {label}
        </span>
      </div>
      <div className="panel">
        <table className="table">
          <thead>
            <tr>
              <th>Datum</th>
              <th>Mitarbeiter</th>
              <th>Projekt</th>
              <th>Von–Bis</th>
              <th className="num">Stunden</th>
              <th className="hide-md">Tätigkeit</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(0, 200).map((x) => (
              <tr key={x.id}>
                <td className="nowrap">{fmt(x.date)}</td>
                <td>{personName(data, x.employeeId)}</td>
                <td>{data.projects.find((p) => p.id === x.projectId)?.name ?? "Intern"}</td>
                <td className="nowrap">
                  {x.start}–{x.end}
                </td>
                <td className="num">{fmtH(minutesOf(x))}</td>
                <td className="hide-md muted">{x.activity}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {list.length > 200 && <p className="panel-hint">Vorschau zeigt 200 von {list.length} – der Export enthält alle.</p>}
      </div>
    </>
  );
}

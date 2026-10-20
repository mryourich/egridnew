"use client";

import { CalendarRange, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addDays, fmtShort, holidayName, inRange, isoWeek, startOfWeek, today, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import { currentUser, myProjects, projectTeam, roleOf, seesAll, useStore } from "@/lib/store";
import type { Absence, Data, Employee, Job } from "@/lib/types";
import { EmpAvatar } from "./person";

type Slot = { kind: "job"; job: Job } | { kind: "absence"; absence: Absence } | { kind: "holiday"; name: string } | { kind: "free" };

const ABSENCE_COLOR: Record<string, string> = { urlaub: "#0891b2", krank: "#dc2626", za: "#16a34a", schulung: "#7c3aed", sonstiges: "#64748b" };

/** What fills one half day of one person: holiday, absence, the first job – or nothing. */
function slot(data: Data, e: Employee, day: string, pm: boolean): Slot {
  const holiday = holidayName(day);
  if (holiday) return { kind: "holiday", name: holiday };
  const absence = data.absences.find((a) => a.employeeId === e.id && inRange(day, a.start, a.end));
  if (absence) return { kind: "absence", absence };
  const job = data.jobs.find(
    (j) => j.employeeId === e.id && !j.symbol && inRange(day, j.start, j.end) && !(pm && day === j.end && j.endAm) && !(!pm && day === j.start && j.startPm)
  );
  return job ? { kind: "job", job } : { kind: "free" };
}

const same = (a: Slot, b: Slot) =>
  a.kind === b.kind && (a.kind === "job" ? a.job.id === (b as typeof a).job.id : a.kind === "absence" ? a.absence.id === (b as typeof a).absence.id : true);

/** People the current user plans: the teams of my projects (admin and office: everybody). */
function people(data: Data) {
  const all = data.employees.filter((e) => e.active);
  if (seesAll(roleOf(currentUser(data)))) return all;
  const ids = new Set(myProjects(data).flatMap((p) => projectTeam(data, p).map((e) => e.id)));
  return all.filter((e) => ids.has(e.id));
}

/** Who does what this week – in half days, with holidays, Urlaub and Krankenstand. */
export function TeamWeek() {
  const { data } = useStore();
  const t = today();
  const [monday, setMonday] = useState(() => startOfWeek(t));
  const scroller = useRef<HTMLDivElement>(null);
  // phones: start with today in view, not Monday
  useEffect(() => {
    const box = scroller.current;
    const day = box?.querySelector<HTMLElement>(".tw-day.is-today");
    const name = box?.querySelector<HTMLElement>(".tw-corner");
    if (box && day && name && box.scrollWidth > box.clientWidth) box.scrollLeft += day.getBoundingClientRect().left - name.getBoundingClientRect().right;
  }, [monday]);
  const days = [0, 1, 2, 3, 4].map((i) => addDays(monday, i));
  const crew = people(data).sort((a, b) => (a.team || "").localeCompare(b.team || "", "de") || a.name.localeCompare(b.name, "de"));

  const todayCount = { work: 0, away: 0, free: 0 };
  if (days.includes(t))
    for (const e of crew) {
      const s = slot(data, e, t, new Date().getHours() >= 12);
      if (s.kind === "job") todayCount.work++;
      else if (s.kind === "absence") todayCount.away++;
      else if (s.kind === "free") todayCount.free++;
    }

  const project = (j: Job) => data.projects.find((p) => p.id === j.projectId);

  return (
    <section className="card tw">
      <header className="tw-head">
        <h2>
          <CalendarRange size={17} /> Wer macht was
        </h2>
        {days.includes(t) && (
          <span className="tw-today">
            Heute <b>{todayCount.work}</b> im Einsatz · <b>{todayCount.away}</b> abwesend · <b className={todayCount.free ? "free" : ""}>{todayCount.free}</b> frei
          </span>
        )}
        <span className="spacer" />
        <span className="tw-nav">
          <button type="button" className="icon-btn" onClick={() => setMonday(addDays(monday, -7))} aria-label="Vorige Woche">
            <ChevronLeft size={16} />
          </button>
          <button type="button" className="btn btn-sm" onClick={() => setMonday(startOfWeek(t))}>
            KW {isoWeek(monday)}
          </button>
          <button type="button" className="icon-btn" onClick={() => setMonday(addDays(monday, 7))} aria-label="Nächste Woche">
            <ChevronRight size={16} />
          </button>
        </span>
      </header>

      {crew.length === 0 ? (
        <p className="dl-empty">Noch niemand im Team. Lege Mitarbeiter an und lade sie in ein Projekt ein.</p>
      ) : (
        <div className="tw-scroll" ref={scroller}>
          <div className="tw-grid" role="table" aria-label="Einteilung dieser Woche">
            <div className="tw-corner" role="columnheader">
              Mitarbeiter
            </div>
            {days.map((d) => (
              <div key={d} className={`tw-day ${d === t ? "is-today" : ""}`} role="columnheader">
                <strong>{weekdayShort(d)}</strong> {fmtShort(d)}
                <small>
                  <span>VM</span>
                  <span>NM</span>
                </small>
              </div>
            ))}
            {crew.map((e) => (
              <div key={e.id} className="tw-row" role="row">
                <div className="tw-name" role="rowheader">
                  <EmpAvatar id={e.id} size={26} />
                  <span>
                    <strong>{e.name}</strong>
                    <small>{e.team || e.role}</small>
                  </span>
                </div>
                {days.map((d) => {
                  const am = slot(data, e, d, false);
                  const pm = slot(data, e, d, true);
                  const halves: { s: Slot; span: number; pm: boolean }[] = same(am, pm) ? [{ s: am, span: 2, pm: false }] : [{ s: am, span: 1, pm: false }, { s: pm, span: 1, pm: true }];
                  return halves.map(({ s, span, pm: isPm }) => {
                    const key = `${e.id}-${d}-${isPm ? "pm" : "am"}`;
                    const cls = `tw-cell span-${span} ${d === t ? "is-today" : ""}`;
                    if (s.kind === "job") {
                      const p = project(s.job);
                      return (
                        <Link
                          key={key}
                          href={p ? `/projekte/${p.id}/plan` : "/projekte"}
                          className={`${cls} tw-job ${s.job.done ? "done" : ""}`}
                          style={{ "--c": s.job.color || p?.color || "#1463ff" } as CSSProperties}
                          title={`${p?.name ?? ""}\n${s.job.title}${span === 1 ? (isPm ? " · Nachmittag" : " · Vormittag") : ""}`}
                        >
                          <b>{p?.code ?? ""}</b>
                          <span>{s.job.title}</span>
                        </Link>
                      );
                    }
                    if (s.kind === "absence")
                      return (
                        <div key={key} className={`${cls} tw-away`} style={{ "--c": ABSENCE_COLOR[s.absence.type] } as CSSProperties} title={s.absence.note || L.absenceType[s.absence.type].label}>
                          {L.absenceType[s.absence.type].label}
                        </div>
                      );
                    if (s.kind === "holiday")
                      return (
                        <div key={key} className={`${cls} tw-holiday`} title={s.name}>
                          {s.name}
                        </div>
                      );
                    return <div key={key} className={`${cls} tw-free`} aria-label="frei" />;
                  });
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

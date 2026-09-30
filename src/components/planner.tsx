"use client";

import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { addDays, diffDays, fmt, holidayName, isoWeek, isWeekend, monthLabel, startOfWeek, today, weekday, weekdayShort } from "@/lib/date";
import * as L from "@/lib/labels";
import type { Absence, Assignment, Employee, ISODate, Project } from "@/lib/types";

/**
 * Resource planner in the style of classic planning boards (Tom's Planner):
 * numbered tree of departments → teams → people, compact rows, day grid with
 * calendar weeks, weekends, public holidays and labelled project bars.
 */

type Props = {
  employees: Employee[];
  assignments: Assignment[];
  absences: Absence[];
  projects: Project[];
  from: ISODate;
  days: number;
  dayWidth: number;
  /** Bars of this project are highlighted and editable; all others are faded and locked. */
  focusProjectId?: string;
  /** Hide bars of other projects completely (TeamGrid view). */
  hideOtherProjects?: boolean;
  readOnly?: boolean;
  conflicts?: Set<string>;
  onChange?: (id: string, start: ISODate, end: ISODate, employeeId: string) => void;
  onBarClick?: (id: string) => void;
  onAbsenceClick?: (id: string) => void;
  onCreate?: (employeeId: string, start: ISODate, end: ISODate) => void;
  /** Add a new person, optionally into a department/team. */
  onAddPerson?: (department: string, team: string) => void;
  onPersonClick?: (employeeId: string) => void;
  emptyText?: string;
};

type Drag = { id: string; mode: "move" | "start" | "end" | "create"; x0: number; y0: number; start: ISODate; end: ISODate; emp: string; moved: boolean };

type Row =
  | { kind: "group"; id: string; no: string; label: string; level: number; count: number; department: string; team: string }
  | { kind: "person"; id: string; no: string; employee: Employee; level: number };

const LANE = 16;
const ROW = 19;
const NO_W = 52;

export function ResourcePlanner({
  employees,
  assignments,
  absences,
  projects,
  from,
  days,
  dayWidth: dw,
  focusProjectId,
  hideOtherProjects,
  readOnly,
  conflicts,
  onChange,
  onBarClick,
  onAbsenceClick,
  onCreate,
  onAddPerson,
  onPersonClick,
  emptyText = "Keine Mitarbeiter"
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = today();
  const to = addDays(from, days - 1);
  const nameW = 210;
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);
  const projectById = useMemo(() => new Map(projects.map((p) => [p.id, p])), [projects]);

  // Numbered tree: department → team → person (a level is skipped when it would repeat its parent).
  const rows = useMemo(() => {
    const out: Row[] = [];
    const departments = [...new Set(employees.map((e) => e.department || "Allgemein"))];
    departments.forEach((dep, di) => {
      const depKey = `d:${dep}`;
      const inDep = employees.filter((e) => (e.department || "Allgemein") === dep);
      out.push({ kind: "group", id: depKey, no: `${di + 1}`, label: dep, level: 0, count: inDep.length, department: dep, team: "" });
      if (collapsed.has(depKey)) return;
      const teams = [...new Set(inDep.map((e) => e.team || dep))];
      teams.forEach((team, ti) => {
        const inTeam = inDep.filter((e) => (e.team || dep) === team);
        const flat = team === dep || teams.length === 1;
        const teamKey = `t:${dep}:${team}`;
        const prefix = flat ? `${di + 1}` : `${di + 1}.${ti + 1}`;
        if (!flat) {
          out.push({ kind: "group", id: teamKey, no: prefix, label: team, level: 1, count: inTeam.length, department: dep, team });
          if (collapsed.has(teamKey)) return;
        }
        inTeam.forEach((e, ei) => out.push({ kind: "person", id: e.id, no: `${prefix}.${ei + 1}`, employee: e, level: flat ? 1 : 2 }));
      });
    });
    return out;
  }, [employees, collapsed]);

  const shown = useMemo(() => {
    let list = assignments.filter((a) => a.resourceType === "employee");
    if (hideOtherProjects && focusProjectId) list = list.filter((a) => a.projectId === focusProjectId);
    if (drag && drag.mode !== "create") list = list.map((a) => (a.id === drag.id ? { ...a, start: drag.start, end: drag.end, resourceId: drag.emp } : a));
    return list.filter((a) => a.end >= from && a.start <= to);
  }, [assignments, hideOtherProjects, focusProjectId, drag, from, to]);

  const lanesFor = (empId: string) => {
    const own = shown.filter((a) => a.resourceId === empId).sort((a, b) => a.start.localeCompare(b.start));
    const ends: ISODate[] = [];
    const lane = new Map<string, number>();
    for (const a of own) {
      let i = ends.findIndex((e) => e < a.start);
      if (i === -1) i = ends.length;
      ends[i] = a.end;
      lane.set(a.id, i);
    }
    return { lane, count: Math.max(1, ends.length) };
  };

  const editable = (a: Assignment) => !readOnly && !!onChange && (!focusProjectId || a.projectId === focusProjectId);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = Math.round((e.clientX - d.x0) / dw);
      const orig = assignments.find((a) => a.id === d.id);
      let next: Drag = { ...d, moved: d.moved || Math.abs(e.clientX - d.x0) > 3 || Math.abs(e.clientY - d.y0) > 3 };
      if (d.mode === "create") next = { ...next, end: addDays(d.start, Math.max(0, delta)) };
      else if (orig && editable(orig)) {
        if (d.mode === "move") {
          next = { ...next, start: addDays(orig.start, delta), end: addDays(orig.end, delta) };
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-emp]");
          if (el?.dataset.emp) next.emp = el.dataset.emp;
        } else if (d.mode === "start") {
          const s = addDays(orig.start, delta);
          next = { ...next, start: s > orig.end ? orig.end : s };
        } else {
          const en = addDays(orig.end, delta);
          next = { ...next, end: en < orig.start ? orig.start : en };
        }
      }
      dragRef.current = next;
      setDrag(next);
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.mode === "create") return onCreate?.(d.emp, d.start, d.end);
      if (!d.moved) return onBarClick?.(d.id);
      const orig = assignments.find((a) => a.id === d.id);
      if (orig && (orig.start !== d.start || orig.end !== d.end || orig.resourceId !== d.emp)) onChange?.(d.id, d.start, d.end, d.emp);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  // Keep today in view.
  useEffect(() => {
    const el = scrollRef.current;
    const idx = diffDays(from, t);
    if (!el || idx < 0 || idx >= days) return;
    const visible = el.clientWidth - NO_W - nameW;
    el.scrollLeft = idx * dw > visible * 0.7 ? Math.max(0, idx * dw - visible * 0.25) : 0;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, days, dw]);

  const beginBar = (e: React.PointerEvent, a: Assignment, mode: Drag["mode"]) => {
    e.stopPropagation();
    e.preventDefault();
    const d: Drag = { id: a.id, mode: editable(a) ? mode : "move", x0: e.clientX, y0: e.clientY, start: a.start, end: a.end, emp: a.resourceId, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const beginCreate = (e: React.PointerEvent<HTMLDivElement>, empId: string) => {
    if (readOnly || !onCreate || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const date = addDays(from, Math.floor((e.clientX - rect.left) / dw));
    const d: Drag = { id: "__new", mode: "create", x0: e.clientX, y0: e.clientY, start: date, end: date, emp: empId, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const box = (start: ISODate, end: ISODate) => {
    const s = Math.max(0, diffDays(from, start));
    const e = Math.min(days - 1, diffDays(from, end));
    return { left: s * dw, width: (e - s + 1) * dw };
  };

  // Header groups.
  const months: { label: string; span: number }[] = [];
  const weeks: { label: string; span: number }[] = [];
  for (const d of dayList) {
    const m = monthLabel(d, true);
    if (months.at(-1)?.label === m) months.at(-1)!.span++;
    else months.push({ label: m, span: 1 });
    const w = String(isoWeek(d));
    if (weeks.at(-1)?.label === w && weekday(d) !== 1) weeks.at(-1)!.span++;
    else weeks.push({ label: w, span: 1 });
  }

  const special = dayList
    .map((d, i) => ({ d, i, holiday: holidayName(d), weekend: isWeekend(d), today: d === t }))
    .filter((x) => x.holiday || x.weekend || x.today);

  const timelineW = days * dw;
  const toggle = (id: string) =>
    setCollapsed((c) => {
      const n = new Set(c);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });

  return (
    <div className="planner" style={{ "--dw": `${dw}px`, "--no": `${NO_W}px`, "--nm": `${nameW}px` } as CSSProperties}>
      <div className="planner-scroll" ref={scrollRef}>
        <div className="planner-inner" style={{ width: NO_W + nameW + timelineW }}>
          <div className="pl-head">
            <div className="pl-corner">
              <span className="pl-no">Nr.</span>
              <span>Mitarbeiter</span>
              {onAddPerson && (
                <button type="button" className="pl-add" onClick={() => onAddPerson("", "")} title="Person hinzufügen">
                  + Person
                </button>
              )}
            </div>
            <div className="pl-head-time" style={{ width: timelineW }}>
              <div className="pl-hrow pl-months">
                {months.map((m, i) => (
                  <span key={i} style={{ width: m.span * dw }}>
                    {m.span * dw > 60 ? m.label : ""}
                  </span>
                ))}
              </div>
              <div className="pl-hrow pl-weeks">
                {weeks.map((w, i) => (
                  <span key={i} style={{ width: w.span * dw }} title={`Kalenderwoche ${w.label}`}>
                    {w.span * dw >= 22 ? w.label : ""}
                  </span>
                ))}
              </div>
              <div className="pl-hrow pl-days">
                {dayList.map((d) => (
                  <span key={d} className={`${isWeekend(d) ? "we" : ""} ${holidayName(d) ? "hol" : ""} ${d === t ? "today" : ""}`} title={`${weekdayShort(d)} ${fmt(d)}${holidayName(d) ? ` · ${holidayName(d)}` : ""}`}>
                    {dw >= 15 ? d.slice(8) : ""}
                  </span>
                ))}
              </div>
              <div className="pl-hrow pl-wd">
                {dayList.map((d) => (
                  <span key={d} className={`${isWeekend(d) ? "we" : ""} ${holidayName(d) ? "hol" : ""} ${d === t ? "today" : ""}`}>
                    {dw >= 15 ? weekdayShort(d) : weekdayShort(d)[0]}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="pl-body">
            <div className="pl-cols" style={{ left: NO_W + nameW, width: timelineW }}>
              {special.map((x) => (
                <span key={x.d} className={x.holiday ? "hol" : x.today ? "today" : "we"} style={{ left: x.i * dw, width: dw }} title={x.holiday} />
              ))}
            </div>

            {rows.length === 0 && <div className="pl-empty">{emptyText}</div>}

            {rows.map((row) => {
              if (row.kind === "group") {
                return (
                  <div key={row.id} className={`pl-row pl-group lvl-${row.level}`}>
                    <button type="button" className="pl-left" onClick={() => toggle(row.id)}>
                      <span className="pl-no">{row.no}</span>
                      <span className="pl-name" style={{ paddingLeft: row.level * 12 }}>
                        {collapsed.has(row.id) ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                        {row.label}
                        <em>{row.count}</em>
                      </span>
                      {onAddPerson && (
                        <span
                          role="button"
                          tabIndex={0}
                          className="pl-add-row"
                          title={`Person zu ${row.label} hinzufügen`}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAddPerson(row.department, row.team);
                          }}
                        >
                          +
                        </span>
                      )}
                    </button>
                    <div className="pl-time" style={{ width: timelineW }} />
                  </div>
                );
              }
              const emp = row.employee;
              const { lane, count } = lanesFor(emp.id);
              const own = shown.filter((a) => a.resourceId === emp.id);
              const abs = absences.filter((a) => a.employeeId === emp.id && a.end >= from && a.start <= to);
              const creating = drag?.mode === "create" && drag.emp === emp.id ? drag : null;
              return (
                <div key={row.id} className={`pl-row ${drag?.mode === "move" && drag.emp === emp.id && drag.moved ? "drop" : ""}`} style={{ height: Math.max(ROW, count * LANE + 3) }} data-emp={emp.id}>
                  <button type="button" className={`pl-left ${onPersonClick ? "clickable" : ""}`} title={`${emp.name} · ${emp.role}`} onClick={() => onPersonClick?.(emp.id)}>
                    <span className="pl-no">{row.no}</span>
                    <span className="pl-name" style={{ paddingLeft: row.level * 12 + 14 }}>
                      {emp.name}
                      <small>{emp.role}</small>
                    </span>
                  </button>
                  <div className={`pl-time ${!readOnly && onCreate ? "creatable" : ""}`} style={{ width: timelineW }} onPointerDown={(e) => beginCreate(e, emp.id)}>
                    {abs.map((a) => {
                      const b = box(a.start, a.end);
                      return (
                        <div
                          key={a.id}
                          className={`pl-abs abs-${a.type}`}
                          style={{ left: b.left, width: b.width }}
                          title={`${L.absenceType[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}`}
                          onPointerDown={(e) => e.stopPropagation()}
                          onClick={() => onAbsenceClick?.(a.id)}
                        >
                          {L.absenceType[a.type].label}
                        </div>
                      );
                    })}
                    {own.map((a) => {
                      const p = projectById.get(a.projectId);
                      const b = box(a.start, a.end);
                      const faded = focusProjectId && a.projectId !== focusProjectId;
                      const label = p ? `${p.code}; ${p.name}` : a.label || "Eintrag";
                      const bad = conflicts?.has(a.id);
                      return (
                        <div
                          key={a.id}
                          className={`pl-bar ${faded ? "faded" : ""} ${bad ? "conflict" : ""} ${drag?.id === a.id ? "active" : ""} ${editable(a) ? "editable" : ""}`}
                          style={{ left: b.left + 1, width: Math.max(4, b.width - 2), top: 2 + (lane.get(a.id) ?? 0) * LANE, "--c": p?.color ?? a.color ?? "#64748b" } as CSSProperties}
                          title={`${label}\n${fmt(a.start)} – ${fmt(a.end)}${a.note ? `\n${a.note}` : ""}${bad ? "\n⚠ Doppelt verplant oder abwesend" : ""}`}
                          onPointerDown={(e) => beginBar(e, a, "move")}
                        >
                          {bad && <i className="pl-warn">!</i>}
                          <span>{label}</span>
                          {editable(a) && <span className="h h-l" onPointerDown={(e) => beginBar(e, a, "start")} />}
                          {editable(a) && <span className="h h-r" onPointerDown={(e) => beginBar(e, a, "end")} />}
                        </div>
                      );
                    })}
                    {creating && (
                      <div className="pl-creating" style={{ left: diffDays(from, creating.start) * dw, width: (diffDays(creating.start, creating.end) + 1) * dw }}>
                        {diffDays(creating.start, creating.end) + 1}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

const ZOOMS = {
  detail: { label: "Detail", dw: 30, days: 42, step: 14 },
  normal: { label: "Normal", dw: 19, days: 91, step: 28 },
  overview: { label: "Übersicht", dw: 10, days: 182, step: 56 }
} as const;
type Zoom = keyof typeof ZOOMS;

/** Date range, zoom and the matching toolbar controls shared by all planner views. */
export function usePlannerRange(initialZoom: Zoom = "normal") {
  const [zoom, setZoom] = useState<Zoom>(initialZoom);
  const [from, setFrom] = useState(() => addDays(startOfWeek(today()), -14));
  const z = ZOOMS[zoom];

  const controls: ReactNode = (
    <>
      <div className="btn-group">
        <button className="btn btn-icon" type="button" onClick={() => setFrom(addDays(from, -z.step))} aria-label="Zurück">
          <ChevronLeft size={16} />
        </button>
        <button className="btn" type="button" onClick={() => setFrom(addDays(startOfWeek(today()), -14))}>
          Heute
        </button>
        <button className="btn btn-icon" type="button" onClick={() => setFrom(addDays(from, z.step))} aria-label="Weiter">
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="segmented">
        {(Object.keys(ZOOMS) as Zoom[]).map((k) => (
          <button key={k} type="button" className={zoom === k ? "active" : ""} onClick={() => setZoom(k)}>
            {ZOOMS[k].label}
          </button>
        ))}
      </div>
    </>
  );

  return { from, days: z.days, dayWidth: z.dw, controls };
}

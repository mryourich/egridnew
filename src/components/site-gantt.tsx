"use client";

import { AlertTriangle, Check, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { addDays, diffDays, fmt, fmtShort, overlaps, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { nodeOptions } from "@/lib/site";
import { uid, useStore } from "@/lib/store";
import type { ISODate, Job, Project } from "@/lib/types";
import { PlannerCols, PlannerHeadTime, usePlannerRange } from "./planner";
import { Avatar } from "./ui";

/** Tom's-Planner-like colour palette for jobs. */
export const JOB_COLORS = ["#dc2626", "#ea580c", "#f59e0b", "#ca8a04", "#84cc16", "#16a34a", "#0d9488", "#0891b2", "#0ea5e9", "#2563eb", "#1e3a8a", "#7c3aed", "#c026d3", "#db2777", "#78716c", "#334155"];

const LANE = 18;
const NAME_W = 220;

type Drag = { id: string; mode: "move" | "start" | "end" | "create"; x0: number; y0: number; start: ISODate; end: ISODate; emp: string; moved: boolean };
type Pop = { job: Partial<Job>; x: number; y: number };
type Menu = { x: number; y: number; job?: Job; emp?: string; date?: ISODate };

/**
 * Site schedule for the site manager: rows are the people the project manager
 * planned onto this site; the site manager drops coloured jobs onto their days.
 */
export function SiteGantt({ project }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const { from, days, dayWidth: dw, controls } = usePlannerRange("detail");
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [pop, setPop] = useState<Pop | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = today();
  const to = addDays(from, days - 1);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);

  const presence = data.assignments.filter((a) => a.projectId === project.id && a.resourceType === "employee");
  const teamIds = [...new Set(presence.map((a) => a.resourceId))];
  const team = data.employees.filter((e) => teamIds.includes(e.id));
  const jobs = data.jobs.filter((j) => j.projectId === project.id);

  const shownJobs = drag && drag.mode !== "create" ? jobs.map((j) => (j.id === drag.id ? { ...j, start: drag.start, end: drag.end, employeeId: drag.emp } : j)) : jobs;

  useEffect(() => {
    const el = scrollRef.current;
    const idx = diffDays(from, t);
    if (!el || idx < 0 || idx >= days) return;
    const visible = el.clientWidth - NAME_W;
    el.scrollLeft = idx * dw > visible * 0.6 ? Math.max(0, idx * dw - visible * 0.2) : 0;
  }, [from, days, dw, t]);

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = Math.round((e.clientX - d.x0) / dw);
      const orig = jobs.find((j) => j.id === d.id);
      let next: Drag = { ...d, moved: d.moved || Math.abs(e.clientX - d.x0) > 3 || Math.abs(e.clientY - d.y0) > 3 };
      if (d.mode === "create") next = { ...next, end: addDays(d.start, Math.max(0, delta)) };
      else if (orig) {
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
    const up = (e: PointerEvent) => {
      const d = dragRef.current;
      dragRef.current = null;
      setDrag(null);
      if (!d) return;
      if (d.mode === "create") {
        setPop({ job: { employeeId: d.emp, start: d.start, end: d.end }, x: e.clientX, y: e.clientY });
        return;
      }
      const orig = jobs.find((j) => j.id === d.id);
      if (!orig) return;
      if (!d.moved) {
        setPop({ job: orig, x: e.clientX, y: e.clientY });
        return;
      }
      if (orig.start !== d.start || orig.end !== d.end || orig.employeeId !== d.emp) save("jobs", { ...orig, start: d.start, end: d.end, employeeId: d.emp });
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const beginJob = (e: React.PointerEvent, j: Job, mode: Drag["mode"]) => {
    e.stopPropagation();
    if (e.button !== 0) return;
    e.preventDefault();
    const d: Drag = { id: j.id, mode, x0: e.clientX, y0: e.clientY, start: j.start, end: j.end, emp: j.employeeId, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const beginCreate = (e: React.PointerEvent<HTMLDivElement>, emp: string) => {
    if (e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const date = addDays(from, Math.floor((e.clientX - rect.left) / dw));
    const d: Drag = { id: "__new", mode: "create", x0: e.clientX, y0: e.clientY, start: date, end: date, emp, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const box = (start: ISODate, end: ISODate) => {
    const s = Math.max(0, diffDays(from, start));
    const e = Math.min(days - 1, diffDays(from, end));
    return { left: s * dw, width: Math.max(0, (e - s + 1) * dw) };
  };

  const timelineW = days * dw;
  const todayJobs = jobs.filter((j) => j.start <= t && j.end >= t);

  return (
    <div className="stack">
      <div className="toolbar">
        {controls}
        <span className="spacer" />
        <span className="hint">Klick oder Rechtsklick auf einen Tag = Aufgabe · Rechtsklick auf Aufgabe = Farbe, erledigt, duplizieren</span>
      </div>

      <div className="planner site-gantt" style={{ "--dw": `${dw}px`, "--no": "0px", "--nm": `${NAME_W}px` } as CSSProperties}>
        <div className="planner-scroll" ref={scrollRef}>
          <div className="planner-inner" style={{ width: NAME_W + timelineW }}>
            <div className="pl-head">
              <div className="pl-corner sg-corner">
                <span>Team</span>
                <em>{team.length} Personen · {todayJobs.length} Aufgaben heute</em>
              </div>
              <PlannerHeadTime dayList={dayList} dw={dw} />
            </div>
            <div className="pl-body">
              <PlannerCols dayList={dayList} dw={dw} left={NAME_W} />
              {team.length === 0 && <div className="pl-empty">Die Projektleitung hat dieser Baustelle noch niemanden zugeteilt.</div>}
              {team.map((emp) => {
                const own = shownJobs.filter((j) => j.employeeId === emp.id && j.end >= from && j.start <= to).sort((a, b) => a.start.localeCompare(b.start));
                const ends: ISODate[] = [];
                const lane = new Map<string, number>();
                for (const j of own) {
                  let i = ends.findIndex((x) => x < j.start);
                  if (i === -1) i = ends.length;
                  ends[i] = j.end;
                  lane.set(j.id, i);
                }
                const lanes = Math.max(1, ends.length);
                const here = presence.filter((a) => a.resourceId === emp.id);
                const elsewhere = data.assignments.filter((a) => a.resourceType === "employee" && a.resourceId === emp.id && a.projectId !== project.id && a.end >= from && a.start <= to);
                const abs = data.absences.filter((a) => a.employeeId === emp.id && a.end >= from && a.start <= to);
                const creating = drag?.mode === "create" && drag.emp === emp.id ? drag : null;
                return (
                  <div key={emp.id} className={`pl-row sg-row ${drag?.mode === "move" && drag.moved && drag.emp === emp.id ? "drop" : ""}`} style={{ height: lanes * LANE + 8 }} data-emp={emp.id}>
                    <div className="pl-left sg-left">
                      <Avatar name={emp.name} size={24} />
                      <span>
                        <strong>{emp.name}</strong>
                        <small>{emp.role}</small>
                      </span>
                    </div>
                    <div
                      className="pl-time creatable"
                      style={{ width: timelineW }}
                      onPointerDown={(e) => beginCreate(e, emp.id)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenu({ x: e.clientX, y: e.clientY, emp: emp.id, date: addDays(from, Math.floor((e.clientX - rect.left) / dw)) });
                      }}
                    >
                      {here.map((a) => {
                        const b = box(a.start, a.end);
                        return b.width > 0 ? <div key={a.id} className="sg-presence" style={{ left: b.left, width: b.width }} title={`Auf der Baustelle ${fmt(a.start)} – ${fmt(a.end)}`} /> : null;
                      })}
                      {elsewhere.map((a) => {
                        const b = box(a.start, a.end);
                        const p = data.projects.find((x) => x.id === a.projectId);
                        return b.width > 0 ? (
                          <div key={a.id} className="sg-elsewhere" style={{ left: b.left, width: b.width }} title={`Woanders: ${p?.name ?? a.label ?? ""}`}>
                            {b.width > 70 && <span>{p ? p.code : a.label}</span>}
                          </div>
                        ) : null;
                      })}
                      {abs.map((a) => {
                        const b = box(a.start, a.end);
                        return (
                          <div key={a.id} className={`sg-abs abs-${a.type}`} style={{ left: b.left, width: b.width }} title={`${L.absenceType[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}`} onPointerDown={(e) => e.stopPropagation()}>
                            {L.absenceType[a.type].label}
                          </div>
                        );
                      })}
                      {own.map((j) => {
                        const b = box(j.start, j.end);
                        return (
                          <div
                            key={j.id}
                            className={`sg-job ${j.done ? "done" : ""} ${drag?.id === j.id ? "active" : ""}`}
                            style={{ left: b.left + 1, width: Math.max(6, b.width - 2), top: 4 + (lane.get(j.id) ?? 0) * LANE, "--c": j.color } as CSSProperties}
                            title={`${j.title}\n${fmt(j.start)} – ${fmt(j.end)}${j.note ? `\n${j.note}` : ""}`}
                            onPointerDown={(e) => beginJob(e, j, "move")}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenu({ x: e.clientX, y: e.clientY, job: j });
                            }}
                          >
                            {j.done && <Check size={11} />}
                            <span>{j.title}</span>
                            <i className="h h-l" onPointerDown={(e) => beginJob(e, j, "start")} />
                            <i className="h h-r" onPointerDown={(e) => beginJob(e, j, "end")} />
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

      <div className="sg-legend">
        <span>
          <i className="sg-presence" /> auf dieser Baustelle eingeplant (Projektleitung)
        </span>
        <span>
          <i className="sg-elsewhere" /> auf anderer Baustelle
        </span>
        <span>
          <i className="sg-abs abs-urlaub" /> Urlaub / Krankenstand (HR)
        </span>
      </div>

      {menu && (
        <ContextMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={
            menu.job
              ? [
                  { label: "Bearbeiten …", onClick: () => setPop({ job: menu.job!, x: menu.x, y: menu.y }) },
                  { label: menu.job.done ? "Wieder öffnen" : "Als erledigt markieren", onClick: () => save("jobs", { ...menu.job!, done: !menu.job!.done }) },
                  {
                    label: "Duplizieren (danach)",
                    onClick: () => {
                      const len = diffDays(menu.job!.start, menu.job!.end);
                      const start = addDays(menu.job!.end, 1);
                      save("jobs", { ...menu.job!, id: uid("j"), start, end: addDays(start, len), done: false });
                      notify("Aufgabe dupliziert");
                    }
                  },
                  { label: "Löschen", danger: true, onClick: () => remove("jobs", menu.job!.id, `Aufgabe „${menu.job!.title}“ gelöscht`) }
                ]
              : [{ label: `Aufgabe am ${fmt(menu.date!)} hinzufügen …`, onClick: () => setPop({ job: { employeeId: menu.emp, start: menu.date, end: menu.date }, x: menu.x, y: menu.y }) }]
          }
          colors={menu.job ? { value: menu.job.color, onPick: (c) => save("jobs", { ...menu.job!, color: c }) } : undefined}
        />
      )}

      {pop && <JobPopover project={project} job={pop.job} x={pop.x} y={pop.y} teamIds={teamIds} onClose={() => setPop(null)} />}
    </div>
  );
}

/** Small floating editor for a job – title, colour palette, person, dates and link to the structure. */
export function JobPopover({ project, job, x, y, teamIds, onClose }: { project: Project; job: Partial<Job>; x: number; y: number; teamIds: string[]; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !job.id;
  const [v, setV] = useState<Job>({
    id: job.id ?? uid("j"),
    projectId: project.id,
    employeeId: job.employeeId ?? teamIds[0] ?? "",
    title: job.title ?? "",
    color: job.color ?? JOB_COLORS[9],
    start: job.start ?? today(),
    end: job.end ?? job.start ?? today(),
    nodeId: job.nodeId ?? "",
    note: job.note ?? "",
    done: job.done ?? false
  });
  const ref = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    setPos({ left: Math.max(8, Math.min(x + 8, window.innerWidth - w - 8)), top: Math.max(8, Math.min(y + 8, window.innerHeight - h - 8)) });
  }, [x, y]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const set = (patch: Partial<Job>) => setV((o) => ({ ...o, ...patch }));
  const person = data.employees.find((e) => e.id === v.employeeId);
  const onSite = data.assignments.some((a) => a.projectId === project.id && a.resourceId === v.employeeId && overlaps(a.start, a.end, v.start, v.end));
  const absence = data.absences.find((a) => a.employeeId === v.employeeId && overlaps(a.start, a.end, v.start, v.end));

  const submit = () => {
    if (!v.title.trim()) return;
    const end = v.end < v.start ? v.start : v.end;
    save("jobs", { ...v, title: v.title.trim(), end }, isNew ? `Aufgabe „${v.title.trim()}“ an ${person?.name ?? ""}` : undefined);
    notify(isNew ? `Aufgabe für ${person?.name ?? ""} angelegt` : "Aufgabe gespeichert");
    onClose();
  };

  return (
    <>
      <div className="pop-backdrop" onPointerDown={onClose} />
      <div
        ref={ref}
        className="job-pop"
        style={{ left: pos.left, top: pos.top, "--c": v.color } as CSSProperties}
        role="dialog"
        aria-label={isNew ? "Neue Aufgabe" : "Aufgabe"}
      >
        <header>
          <span>{isNew ? "Neue Aufgabe" : "Aufgabe"}</span>
          <button type="button" className="icon-btn" onClick={onClose} aria-label="Schließen">
            <X size={16} />
          </button>
        </header>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
        >
          <input ref={titleRef} className="job-title" autoFocus value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="Was ist zu tun?" aria-label="Titel" />
          <div className="palette" role="radiogroup" aria-label="Farbe">
            {JOB_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={v.color === c} aria-label={c} className={v.color === c ? "on" : ""} style={{ background: c }} onClick={() => {
                  set({ color: c });
                  titleRef.current?.focus();
                }}
              />
            ))}
          </div>
          <div className="job-grid">
            <label className="full">
              <span>Wer</span>
              <select value={v.employeeId} onChange={(e) => set({ employeeId: e.target.value })}>
                {data.employees
                  .filter((e) => teamIds.includes(e.id))
                  .map((e) => (
                    <option key={e.id} value={e.id}>
                      {e.name} · {e.role}
                    </option>
                  ))}
              </select>
            </label>
            <label>
              <span>Von</span>
              <input type="date" value={v.start} onChange={(e) => set({ start: e.target.value, end: e.target.value > v.end ? e.target.value : v.end })} />
            </label>
            <label>
              <span>Bis</span>
              <input type="date" value={v.end} min={v.start} onChange={(e) => set({ end: e.target.value })} />
            </label>
            <label className="full">
              <span>Bereich / Punkt</span>
              <select value={v.nodeId} onChange={(e) => set({ nodeId: e.target.value })}>
                <option value="">– ohne –</option>
                {nodeOptions(data.siteNodes, project.id).map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="full">
              <span>Notiz</span>
              <input value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="optional" />
            </label>
          </div>
          {(!onSite || absence) && (
            <p className="job-warn">
              <AlertTriangle size={13} />
              {absence ? `${person?.name} ist ${L.absenceType[absence.type].label.toLowerCase()} (${fmtShort(absence.start)}–${fmtShort(absence.end)}).` : `${person?.name} ist in diesem Zeitraum nicht für die Baustelle eingeplant – bitte mit der Projektleitung abstimmen.`}
            </p>
          )}
          <footer>
            {!isNew && (
              <>
                <button
                  type="button"
                  className="icon-btn"
                  title="Löschen"
                  onClick={() => {
                    remove("jobs", v.id, `Aufgabe „${v.title}“ gelöscht`);
                    onClose();
                  }}
                >
                  <Trash2 size={15} />
                </button>
                <label className="check">
                  <input type="checkbox" checked={v.done} onChange={(e) => set({ done: e.target.checked })} /> erledigt
                </label>
              </>
            )}
            <span className="spacer" />
            <button type="button" className="btn btn-sm btn-ghost" onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className="btn btn-sm btn-primary" disabled={!v.title.trim()}>
              {isNew ? "Anlegen" : "Speichern"}
            </button>
          </footer>
        </form>
      </div>
    </>
  );
}

type MenuItem = { label: string; onClick: () => void; danger?: boolean };

/** Right-click menu with optional colour palette row. */
function ContextMenu({ x, y, items, colors, onClose }: { x: number; y: number; items: MenuItem[]; colors?: { value: string; onPick: (c: string) => void }; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    setPos({ left: Math.min(x, window.innerWidth - el.offsetWidth - 8), top: Math.min(y, window.innerHeight - el.offsetHeight - 8) });
  }, [x, y]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  return (
    <>
      <div
        className="pop-backdrop"
        onPointerDown={onClose}
        onContextMenu={(e) => {
          e.preventDefault();
          onClose();
        }}
      />
      <div ref={ref} className="ctx-menu" style={pos} role="menu">
        {colors && (
          <div className="ctx-colors" role="radiogroup" aria-label="Farbe">
            {JOB_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={colors.value === c}
                aria-label={c}
                className={colors.value === c ? "on" : ""}
                style={{ background: c }}
                onClick={() => {
                  colors.onPick(c);
                  onClose();
                }}
              />
            ))}
          </div>
        )}
        {items.map((it) => (
          <button
            key={it.label}
            type="button"
            role="menuitem"
            className={it.danger ? "danger" : ""}
            onClick={() => {
              onClose();
              it.onClick();
            }}
          >
            {it.label}
          </button>
        ))}
      </div>
    </>
  );
}

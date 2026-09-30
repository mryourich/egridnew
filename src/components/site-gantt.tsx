"use client";

import { AlertTriangle, Check, ChevronRight, Diamond, Palette, Pencil, Star, Trash2, X } from "lucide-react";
import { useEffect, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { addDays, diffDays, fmt, fmtShort, overlaps, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { nodeOptions } from "@/lib/site";
import { canDelete, uid, useStore } from "@/lib/store";
import type { Absence, AbsenceType, ISODate, Job, Project } from "@/lib/types";
import { PlannerCols, PlannerHeadTime, usePlannerRange } from "./planner";
import { Avatar } from "./ui";

/** Palette in the layout of classic planning boards: 6 rows × 5 columns. */
export const PALETTE = [
  ["#808033", "#7a9a8a", "#2e75b6", "#7f6252", "#707070"],
  ["#bfcb2c", "#8fbfa6", "#5fb3d9", "#b07d5e", "#a0a0a0"],
  ["#e8f55a", "#c6e0a3", "#a9c8f7", "#dfb398", "#d4d4d4"],
  ["#735a97", "#b03a50", "#d91414", "#de7a25", "#fbd02e"],
  ["#b673b8", "#c07070", "#ff3b30", "#ff8a1e", "#fff31a"],
  ["#f5a0cf", "#e6a8ac", "#f47070", "#ffa726", "#faf59a"]
];
export const JOB_COLORS = PALETTE.flat();

/** Symbols like on classic planning boards. */
export const SYMBOLS = [
  "❌", "✅", "➕", "❓", "❗", "⛔", "♦️",
  "⚠️", "🕒", "💬", "ℹ️", "🧮", "👩", "👨‍💼",
  "👷", "👩‍🔧", "👨‍🔧", "🧑‍💼", "👥", "📖", "🔔",
  "⬇️", "💲", "💶", "💷", "💴", "🔻", "💎",
  "🔷", "🔶", "🔒", "📞", "📱", "💡", "☕",
  "🔧", "🚚", "🔑", "✉️", "⏰", "⏱️", "⭐",
  "⚙️", "🎂", "🍸", "📦", "🔍", "📅", "⏳",
  "📊", "✏️", "☀️", "⛅", "☁️", "🙂", "🙁",
  "✍️", "❔", "❕", "‼️", "🚩", "🏁", "🚧",
  "🏳️", "➡️", "⬅️", "⬆️", "✔️", "☑️", "✖️",
  "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "▶️",
  "🏗️", "🔌", "⚡", "🧯", "🪜", "📐", "📸"
];

/** Readable text colour on a given background. */
export function textOn(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#1f2937" : "#ffffff";
}

/** One lane = one grid row; bars fill it completely. */
const LANE = 32;
const NAME_W = 220;

/* Half-day helpers: position = day * 2 (+1 for afternoon). */
function jobHalves(from: ISODate, j: Pick<Job, "start" | "end" | "startPm" | "endAm">) {
  const s = diffDays(from, j.start) * 2 + (j.startPm ? 1 : 0);
  const e = diffDays(from, j.end) * 2 + (j.endAm ? 1 : 2);
  return { s, e: Math.max(e, s + 1) };
}
function fromHalves(from: ISODate, s: number, e: number) {
  const last = e - 1;
  return { start: addDays(from, Math.floor(s / 2)), startPm: s % 2 === 1, end: addDays(from, Math.floor(last / 2)), endAm: last % 2 === 0 };
}

type Drag =
  | { kind: "job"; id: string; mode: "move" | "start" | "end"; x0: number; y0: number; moved: boolean; dh: number; emp: string }
  | { kind: "abs"; id: string; mode: "move" | "start" | "end"; x0: number; y0: number; moved: boolean; dd: number; emp: string };

type Menu = { x: number; y: number; job?: Job; abs?: Absence; emp?: string; half?: number };

/**
 * Site schedule for the site manager in the style of classic planning boards:
 * left mouse = move / resize in half days, click on a bar = rename,
 * right mouse = small menu to insert bars or symbols with a colour palette.
 */
export function SiteGantt({ project }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const { from, days, dayWidth: dw, controls } = usePlannerRange("detail");
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [details, setDetails] = useState<{ job: Partial<Job>; x: number; y: number } | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const t = today();
  const hw = dw / 2;
  const to = addDays(from, days - 1);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);

  const presence = data.assignments.filter((a) => a.projectId === project.id && a.resourceType === "employee");
  const teamIds = [...new Set(presence.map((a) => a.resourceId))];
  const team = data.employees.filter((e) => teamIds.includes(e.id));
  const jobs = data.jobs.filter((j) => j.projectId === project.id);

  const previewJob = (j: Job): Job => {
    if (!drag || drag.kind !== "job" || drag.id !== j.id) return j;
    const { s, e } = jobHalves(from, j);
    let ns = s;
    let ne = e;
    if (drag.mode === "move") {
      ns = s + drag.dh;
      ne = e + drag.dh;
    } else if (drag.mode === "start") ns = Math.min(e - 1, s + drag.dh);
    else ne = Math.max(s + 1, e + drag.dh);
    return { ...j, ...fromHalves(from, ns, ne), employeeId: drag.emp };
  };

  const previewAbs = (a: Absence): Absence => {
    if (!drag || drag.kind !== "abs" || drag.id !== a.id) return a;
    if (drag.mode === "move") return { ...a, start: addDays(a.start, drag.dd), end: addDays(a.end, drag.dd), employeeId: drag.emp };
    if (drag.mode === "start") {
      const s = addDays(a.start, drag.dd);
      return { ...a, start: s > a.end ? a.end : s };
    }
    const e = addDays(a.end, drag.dd);
    return { ...a, end: e < a.start ? a.start : e };
  };

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
      const moved = d.moved || Math.abs(e.clientX - d.x0) > 3 || Math.abs(e.clientY - d.y0) > 3;
      let next: Drag;
      if (d.kind === "job") {
        next = { ...d, moved, dh: Math.round((e.clientX - d.x0) / hw) };
        if (d.mode === "move") {
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-emp]");
          if (el?.dataset.emp) next = { ...next, emp: el.dataset.emp };
        }
      } else {
        next = { ...d, moved, dd: Math.round((e.clientX - d.x0) / dw) };
        if (d.mode === "move") {
          const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-emp]");
          if (el?.dataset.emp) next = { ...next, emp: el.dataset.emp };
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
      if (d.kind === "job") {
        const j = jobs.find((x) => x.id === d.id);
        if (!j) return;
        if (!d.moved) {
          setEditing(j.id);
          return;
        }
        const p = previewJobWith(j, d);
        if (p.start !== j.start || p.end !== j.end || p.startPm !== j.startPm || p.endAm !== j.endAm || p.employeeId !== j.employeeId) save("jobs", p);
      } else {
        const a = data.absences.find((x) => x.id === d.id);
        if (!a || !d.moved) return;
        const p = previewAbsWith(a, d);
        if (p.start !== a.start || p.end !== a.end || p.employeeId !== a.employeeId) {
          const who = data.employees.find((x) => x.id === p.employeeId)?.name ?? "";
          save("absences", p, `${L.absenceType[a.type].label} ${who} ${fmt(p.start)} – ${fmt(p.end)}`);
          notify(`${L.absenceType[a.type].label} · ${who}: ${fmt(p.start)} – ${fmt(p.end)}`);
        }
      }
    };
    // Resolve previews from the final drag state (closures above see the render-time state).
    const previewJobWith = (j: Job, d: Extract<Drag, { kind: "job" }>) => {
      const { s, e } = jobHalves(from, j);
      let ns = s;
      let ne = e;
      if (d.mode === "move") {
        ns = s + d.dh;
        ne = e + d.dh;
      } else if (d.mode === "start") ns = Math.min(e - 1, s + d.dh);
      else ne = Math.max(s + 1, e + d.dh);
      return { ...j, ...fromHalves(from, ns, ne), employeeId: d.emp };
    };
    const previewAbsWith = (a: Absence, d: Extract<Drag, { kind: "abs" }>) => {
      if (d.mode === "move") return { ...a, start: addDays(a.start, d.dd), end: addDays(a.end, d.dd), employeeId: d.emp };
      if (d.mode === "start") {
        const s = addDays(a.start, d.dd);
        return { ...a, start: s > a.end ? a.end : s };
      }
      const e = addDays(a.end, d.dd);
      return { ...a, end: e < a.start ? a.start : e };
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const beginJob = (e: React.PointerEvent, j: Job, mode: "move" | "start" | "end") => {
    if (e.button !== 0 || editing === j.id) return;
    e.stopPropagation();
    e.preventDefault();
    const d: Drag = { kind: "job", id: j.id, mode: j.symbol ? "move" : mode, x0: e.clientX, y0: e.clientY, moved: false, dh: 0, emp: j.employeeId };
    dragRef.current = d;
    setDrag(d);
  };

  const beginAbs = (e: React.PointerEvent, a: Absence, mode: "move" | "start" | "end") => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const d: Drag = { kind: "abs", id: a.id, mode, x0: e.clientX, y0: e.clientY, moved: false, dd: 0, emp: a.employeeId };
    dragRef.current = d;
    setDrag(d);
  };

  const insert = (emp: string, half: number, color: string, symbol: boolean, icon?: string) => {
    const day = Math.floor(half / 2);
    const s = day * 2;
    const id = uid("j");
    save("jobs", { id, projectId: project.id, employeeId: emp, title: symbol ? "" : "Neue Aufgabe", color, ...fromHalves(from, s, s + 2), nodeId: "", note: "", done: false, symbol, icon }, symbol ? "Symbol eingefügt" : "Zeitbalken eingefügt");
    setEditing(id);
  };

  const timelineW = days * dw;
  const todayJobs = jobs.filter((j) => j.start <= t && j.end >= t && !j.symbol);

  return (
    <div className="stack">
      <div className="toolbar">
        {controls}
        <span className="spacer" />
        <span className="hint">Ziehen = verschieben (halbe Tage) · Klick auf Balken = umbenennen · Rechtsklick = einfügen, Farbe</span>
      </div>

      <div className="planner site-gantt" style={{ "--dw": `${dw}px`, "--no": "0px", "--nm": `${NAME_W}px` } as CSSProperties}>
        <div className="planner-scroll" ref={scrollRef}>
          <div className="planner-inner" style={{ width: NAME_W + timelineW }}>
            <div className="pl-head">
              <div className="pl-corner sg-corner">
                <span>Team</span>
                <em>
                  {team.length} Personen · {todayJobs.length} Aufgaben heute
                </em>
              </div>
              <PlannerHeadTime dayList={dayList} dw={dw} />
            </div>
            <div className="pl-body">
              <PlannerCols dayList={dayList} dw={dw} left={NAME_W} />
              {team.length === 0 && <div className="pl-empty">Die Projektleitung hat dieser Baustelle noch niemanden zugeteilt.</div>}
              {team.map((emp) => {
                const own = jobs
                  .map(previewJob)
                  .filter((j) => j.employeeId === emp.id && j.end >= from && j.start <= to)
                  .sort((a, b) => a.start.localeCompare(b.start) || Number(!!a.startPm) - Number(!!b.startPm));
                const ends: number[] = [];
                const lane = new Map<string, number>();
                for (const j of own) {
                  const { s, e } = jobHalves(from, j);
                  let i = ends.findIndex((x) => x <= s);
                  if (i === -1) i = ends.length;
                  ends[i] = j.symbol ? s + 6 : e;
                  lane.set(j.id, i);
                }
                const lanes = Math.max(1, ends.length);
                const here = presence.filter((a) => a.resourceId === emp.id);
                const elsewhere = data.assignments.filter((a) => a.resourceType === "employee" && a.resourceId === emp.id && a.projectId !== project.id && a.end >= from && a.start <= to);
                const abs = data.absences.map(previewAbs).filter((a) => a.employeeId === emp.id && a.end >= from && a.start <= to);
                const dayBox = (start: ISODate, end: ISODate) => {
                  const s = Math.max(0, diffDays(from, start));
                  const e = Math.min(days - 1, diffDays(from, end));
                  return { left: s * dw, width: Math.max(0, (e - s + 1) * dw) };
                };
                return (
                  <div key={emp.id} className={`pl-row sg-row ${drag && drag.mode === "move" && drag.moved && drag.emp === emp.id ? "drop" : ""}`} style={{ height: lanes * LANE }} data-emp={emp.id}>
                    <div className="pl-left sg-left">
                      <Avatar name={emp.name} size={24} />
                      <span>
                        <strong>{emp.name}</strong>
                        <small>{emp.role}</small>
                      </span>
                    </div>
                    <div
                      className="pl-time"
                      style={{ width: timelineW }}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenu({ x: e.clientX, y: e.clientY, emp: emp.id, half: Math.floor((e.clientX - rect.left) / hw) });
                      }}
                    >
                      {here.map((a) => {
                        const b = dayBox(a.start, a.end);
                        return b.width > 0 ? <div key={a.id} className="sg-presence" style={{ left: b.left, width: b.width }} title={`Auf der Baustelle ${fmt(a.start)} – ${fmt(a.end)}`} /> : null;
                      })}
                      {elsewhere.map((a) => {
                        const b = dayBox(a.start, a.end);
                        const p = data.projects.find((x) => x.id === a.projectId);
                        return b.width > 0 ? (
                          <div key={a.id} className="sg-elsewhere" style={{ left: b.left, width: b.width }} title={`Woanders: ${p?.name ?? a.label ?? ""}`}>
                            {b.width > 70 && <span>{p ? p.code : a.label}</span>}
                          </div>
                        ) : null;
                      })}
                      {abs.map((a) => {
                        const b = dayBox(a.start, a.end);
                        return (
                          <div
                            key={a.id}
                            className={`sg-abs abs-${a.type} ${drag?.kind === "abs" && drag.id === a.id ? "active" : ""}`}
                            style={{ left: b.left, width: b.width }}
                            title={`${L.absenceType[a.type].label} ${fmt(a.start)} – ${fmt(a.end)} · ziehen zum Verschieben`}
                            onPointerDown={(e) => beginAbs(e, a, "move")}
                            onContextMenu={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setMenu({ x: e.clientX, y: e.clientY, abs: data.absences.find((x) => x.id === a.id) });
                            }}
                          >
                            {L.absenceType[a.type].label}
                            <i className="h h-l" onPointerDown={(e) => beginAbs(e, a, "start")} />
                            <i className="h h-r" onPointerDown={(e) => beginAbs(e, a, "end")} />
                          </div>
                        );
                      })}
                      {own.map((j) => {
                        const { s, e } = jobHalves(from, j);
                        const top = (lane.get(j.id) ?? 0) * LANE;
                        const onCtx = (ev: React.MouseEvent) => {
                          ev.preventDefault();
                          ev.stopPropagation();
                          setMenu({ x: ev.clientX, y: ev.clientY, job: jobs.find((x) => x.id === j.id) });
                        };
                        if (j.symbol) {
                          return (
                            <div key={j.id} className="sg-symbol" style={{ left: s * hw + hw - 8, top: top + (LANE - 18) / 2, "--c": j.color } as CSSProperties} title={`${j.title} · ${fmt(j.start)}`} onPointerDown={(ev) => beginJob(ev, j, "move")} onContextMenu={onCtx}>
                              {j.icon ? <span className="sg-emoji">{j.icon}</span> : <Star size={16} fill={j.color} color="#1f2937" strokeWidth={1.2} />}
                              {editing === j.id ? <RenameInput job={j} onDone={() => setEditing(null)} /> : j.title ? <span>{j.title}</span> : null}
                            </div>
                          );
                        }
                        return (
                          <div
                            key={j.id}
                            className={`sg-job ${j.done ? "done" : ""} ${drag?.kind === "job" && drag.id === j.id ? "active" : ""} ${editing === j.id ? "editing" : ""}`}
                            style={{ left: s * hw, width: Math.max(8, (e - s) * hw), top: top + 1, height: LANE - 1, background: j.color, color: textOn(j.color) } as CSSProperties}
                            title={`${j.title}\n${fmt(j.start)}${j.startPm ? " (ab Mittag)" : ""} – ${fmt(j.end)}${j.endAm ? " (bis Mittag)" : ""}${j.note ? `\n${j.note}` : ""}`}
                            onPointerDown={(ev) => beginJob(ev, j, "move")}
                            onContextMenu={onCtx}
                          >
                            {editing === j.id ? (
                              <RenameInput job={j} onDone={() => setEditing(null)} />
                            ) : (
                              <>
                                {j.done && <Check size={11} />}
                                <span>{j.title}</span>
                                <i className="h h-l" onPointerDown={(ev) => beginJob(ev, j, "start")} />
                                <i className="h h-r" onPointerDown={(ev) => beginJob(ev, j, "end")} />
                              </>
                            )}
                          </div>
                        );
                      })}
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
          <i className="sg-abs abs-urlaub" /> Urlaub / Krankenstand (HR) – verschiebbar
        </span>
      </div>

      {menu && (
        <PlanMenu
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          items={
            menu.job?.symbol
              ? [
                  { icon: <Star size={16} />, label: "Symbol ändern", icons: (ic) => save("jobs", { ...menu.job!, icon: ic }) },
                  { icon: <Pencil size={16} />, label: menu.job.title ? "Text ändern" : "Text hinzufügen", onClick: () => setEditing(menu.job!.id) },
                  ...(canDelete(data) ? [{ icon: <Trash2 size={16} />, label: "Löschen", danger: true, onClick: () => remove("jobs", menu.job!.id, "Symbol gelöscht") }] : [])
                ]
              : menu.job
              ? [
                  { icon: <Palette size={16} />, label: "Farbe", colors: (c) => save("jobs", { ...menu.job!, color: c }) },
                  { icon: <Pencil size={16} />, label: "Umbenennen", onClick: () => setEditing(menu.job!.id) },
                  { icon: <ChevronRight size={16} />, label: "Details …", onClick: () => setDetails({ job: menu.job!, x: menu.x, y: menu.y }) },
                  { icon: <Check size={16} />, label: menu.job.done ? "Wieder öffnen" : "Als erledigt markieren", onClick: () => save("jobs", { ...menu.job!, done: !menu.job!.done }) },
                  {
                    icon: <Diamond size={16} />,
                    label: "Duplizieren",
                    onClick: () => {
                      const { s, e } = jobHalves(from, menu.job!);
                      save("jobs", { ...menu.job!, id: uid("j"), ...fromHalves(from, e, e + (e - s)), done: false });
                      notify("Dupliziert");
                    }
                  },
                  { icon: <Trash2 size={16} />, label: "Löschen", danger: true, onClick: () => remove("jobs", menu.job!.id, `Aufgabe „${menu.job!.title}“ gelöscht`) }
                ]
              : menu.abs
                ? [
                    ...(Object.keys(L.absenceType) as AbsenceType[]).map((type) => ({
                      icon: <span className={`menu-swatch abs-${type}`} />,
                      label: L.absenceType[type].label + (menu.abs!.type === type ? " ✓" : ""),
                      onClick: () => save("absences", { ...menu.abs!, type })
                    })),
                    { icon: <Trash2 size={16} />, label: "Abwesenheit löschen", danger: true, onClick: () => remove("absences", menu.abs!.id, "Abwesenheit gelöscht") }
                  ]
                : [
                    { icon: <InsertBarIcon />, label: "Neuen Zeitbalken einfügen", colors: (c) => insert(menu.emp!, menu.half!, c, false) },
                    { icon: <Star size={17} strokeWidth={1.6} />, label: "Neues Symbol einfügen", icons: (ic) => insert(menu.emp!, menu.half!, "#f59e0b", true, ic) }
                  ]
          }
        />
      )}

      {details && <JobPopover project={project} job={details.job} x={details.x} y={details.y} teamIds={teamIds} onClose={() => setDetails(null)} />}
    </div>
  );
}

function InsertBarIcon() {
  return (
    <svg width="18" height="16" viewBox="0 0 18 16" fill="none" stroke="currentColor" strokeWidth="1.4" aria-hidden>
      <rect x="1" y="2" width="13" height="8" rx="1.5" />
      <circle cx="13.5" cy="11.5" r="3.6" fill="#fff" />
      <path d="M13.5 9.8v3.4M11.8 11.5h3.4" />
    </svg>
  );
}

/** Rename a job in place: Enter or leaving the field saves, Esc cancels. */
function RenameInput({ job, onDone }: { job: Job; onDone: () => void }) {
  const { save } = useStore();
  const [text, setText] = useState(job.title);
  const ref = useRef<HTMLInputElement>(null);
  const done = useRef(false);
  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);
  const commit = (keep: boolean) => {
    if (done.current) return;
    done.current = true;
    if (keep && text.trim() && text.trim() !== job.title) save("jobs", { ...job, title: text.trim() });
    onDone();
  };
  return (
    <input
      ref={ref}
      className="rename-input"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(true);
        if (e.key === "Escape") commit(false);
      }}
      onBlur={() => commit(true)}
      aria-label="Aufgabe umbenennen"
    />
  );
}

type PlanMenuItem = { icon: ReactNode; label: string; onClick?: () => void; colors?: (c: string) => void; icons?: (icon: string) => void; danger?: boolean };

/** Small right-click menu; items with colours open the palette on hover or click. */
function PlanMenu({ x, y, items, onClose }: { x: number; y: number; items: PlanMenuItem[]; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const custom = useRef<HTMLInputElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });
  const [sub, setSub] = useState<number | null>(null);
  const [flip, setFlip] = useState(false);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const left = Math.min(x, window.innerWidth - el.offsetWidth - 8);
    setPos({ left, top: Math.min(y, window.innerHeight - el.offsetHeight - 8) });
    setFlip(left + el.offsetWidth + 240 > window.innerWidth);
  }, [x, y]);

  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);

  const pick = (item: PlanMenuItem, c: string) => {
    onClose();
    item.colors?.(c);
  };

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
      <div ref={ref} className="plan-menu" style={pos} role="menu">
        {items.map((it, i) => (
          <div key={it.label} className="pm-item-wrap" onMouseEnter={() => setSub(it.colors || it.icons ? i : null)}>
            <button
              type="button"
              role="menuitem"
              className={`pm-item ${it.danger ? "danger" : ""} ${sub === i ? "open" : ""}`}
              onClick={() => {
                if (it.colors || it.icons) setSub(i);
                else {
                  onClose();
                  it.onClick?.();
                }
              }}
            >
              <span className="pm-icon">{it.icon}</span>
              {it.label}
              {(it.colors || it.icons) && <ChevronRight size={14} className="pm-chev" />}
            </button>
            {it.icons && sub === i && (
              <div className={`pm-palette pm-symbols ${flip ? "flip" : ""}`} role="listbox" aria-label="Symbol">
                {SYMBOLS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    aria-label={ic}
                    onClick={() => {
                      onClose();
                      it.icons?.(ic);
                    }}
                  >
                    {ic}
                  </button>
                ))}
              </div>
            )}
            {it.colors && sub === i && (
              <div className={`pm-palette ${flip ? "flip" : ""}`} role="radiogroup" aria-label="Farbe">
                <div className="pm-grid">
                  {PALETTE.flat().map((c) => (
                    <button key={c} type="button" style={{ background: c }} aria-label={c} onClick={() => pick(it, c)} />
                  ))}
                </div>
                <button type="button" className="pm-custom" onClick={() => custom.current?.click()}>
                  benutzerdefiniert …
                </button>
                <input ref={custom} type="color" hidden onChange={(e) => pick(it, e.target.value)} />
              </div>
            )}
          </div>
        ))}
      </div>
    </>
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
    done: job.done ?? false,
    startPm: job.startPm ?? false,
    endAm: job.endAm ?? false,
    symbol: job.symbol ?? false
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
            <label className="check half">
              <input type="checkbox" checked={!!v.startPm} onChange={(e) => set({ startPm: e.target.checked })} /> ab Mittag
            </label>
            <label className="check half">
              <input type="checkbox" checked={!!v.endAm} onChange={(e) => set({ endAm: e.target.checked })} /> bis Mittag
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


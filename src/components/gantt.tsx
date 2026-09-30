"use client";

import { ChevronDown, ChevronRight } from "lucide-react";
import { Fragment, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { addDays, diffDays, isoWeek, isWeekend, monthLabel, today, weekday, weekdayShort } from "@/lib/date";
import type { ISODate } from "@/lib/types";

export type GanttRow = { id: string; label: ReactNode; sub?: ReactNode; group?: string; muted?: boolean };

export type GanttBar = {
  id: string;
  rowId: string;
  start: ISODate;
  end: ISODate;
  label: string;
  color: string;
  progress?: number;
  milestone?: boolean;
  conflict?: boolean;
  /** Rendered behind the row as a hatched block (e.g. absences); not draggable. */
  background?: boolean;
  title?: string;
  dependsOn?: string;
};

type Props = {
  rows: GanttRow[];
  bars: GanttBar[];
  from: ISODate;
  days: number;
  dayWidth: number;
  labelWidth?: number;
  /** Stack overlapping bars in lanes (resource planner) instead of one bar per row. */
  lanes?: boolean;
  showDependencies?: boolean;
  /** Allows dragging a bar onto another row. */
  allowRowChange?: boolean;
  /** Shows per-day booked counts in group header rows. */
  groupLoad?: boolean;
  onChange?: (id: string, start: ISODate, end: ISODate, rowId: string) => void;
  onBarClick?: (id: string) => void;
  onCreate?: (rowId: string, start: ISODate, end: ISODate) => void;
  emptyText?: string;
};

type Drag = {
  id: string;
  mode: "move" | "start" | "end" | "create";
  x0: number;
  y0: number;
  start: ISODate;
  end: ISODate;
  rowId: string;
  moved: boolean;
};

const LANE = 22;
const PAD = 4;
const MIN_ROW = 30;

export function Gantt({
  rows,
  bars,
  from,
  days,
  dayWidth: dw,
  labelWidth = 230,
  lanes = false,
  showDependencies = false,
  allowRowChange = false,
  groupLoad = false,
  onChange,
  onBarClick,
  onCreate,
  emptyText = "Keine Einträge"
}: Props) {
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const to = addDays(from, days - 1);
  const t = today();
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);

  // Apply live drag preview to the bar being dragged.
  const shownBars = useMemo(() => {
    if (!drag || drag.mode === "create") return bars;
    return bars.map((b) => (b.id === drag.id ? { ...b, start: drag.start, end: drag.end, rowId: drag.rowId } : b));
  }, [bars, drag]);

  const visibleBars = shownBars.filter((b) => b.end >= from && b.start <= to);

  // Lane layout per row.
  const layout = useMemo(() => {
    const byRow = new Map<string, { lane: Map<string, number>; count: number }>();
    for (const row of rows) {
      const own = visibleBars.filter((b) => b.rowId === row.id && !b.background).sort((a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end));
      const laneEnds: ISODate[] = [];
      const lane = new Map<string, number>();
      for (const b of own) {
        let i = lanes ? laneEnds.findIndex((end) => end < b.start) : 0;
        if (i === -1) i = laneEnds.length;
        laneEnds[i] = b.end;
        lane.set(b.id, i);
      }
      byRow.set(row.id, { lane, count: Math.max(1, lanes ? laneEnds.length : 1) });
    }
    return byRow;
  }, [rows, visibleBars, lanes]);

  const groups = useMemo(() => {
    const result: { name: string | undefined; rows: GanttRow[] }[] = [];
    for (const row of rows) {
      const last = result[result.length - 1];
      if (last && last.name === row.group) last.rows.push(row);
      else result.push({ name: row.group, rows: [row] });
    }
    return result;
  }, [rows]);

  // Vertical positions for dependency arrows.
  const rowTops = new Map<string, number>();
  let y = 0;
  for (const g of groups) {
    if (g.name) y += MIN_ROW - 4;
    if (g.name && collapsed.has(g.name)) continue;
    for (const row of g.rows) {
      rowTops.set(row.id, y);
      y += rowHeight(layout.get(row.id)?.count ?? 1);
    }
  }
  const bodyHeight = y;

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const delta = Math.round((e.clientX - d.x0) / dw);
      const orig = bars.find((b) => b.id === d.id);
      let next: Drag = { ...d, moved: d.moved || Math.abs(e.clientX - d.x0) > 3 || Math.abs(e.clientY - d.y0) > 3 };
      if (d.mode === "create") {
        const end = addDays(d.start, Math.max(0, delta));
        next = { ...next, end };
      } else if (orig && onChange) {
        if (d.mode === "move") {
          next = { ...next, start: addDays(orig.start, delta), end: addDays(orig.end, delta) };
          if (allowRowChange) {
            const el = document.elementFromPoint(e.clientX, e.clientY)?.closest<HTMLElement>("[data-row]");
            if (el?.dataset.row) next.rowId = el.dataset.row;
          }
        } else if (d.mode === "start") {
          const start = addDays(orig.start, delta);
          next = { ...next, start: start > orig.end ? orig.end : start };
        } else {
          const end = addDays(orig.end, delta);
          next = { ...next, end: end < orig.start ? orig.start : end };
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
      if (d.mode === "create") {
        onCreate?.(d.rowId, d.start, d.end);
        return;
      }
      if (!d.moved) {
        onBarClick?.(d.id);
        return;
      }
      const orig = bars.find((b) => b.id === d.id);
      if (orig && (orig.start !== d.start || orig.end !== d.end || orig.rowId !== d.rowId)) onChange?.(d.id, d.start, d.end, d.rowId);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  // Bring today into view when the range or scale changes.
  useEffect(() => {
    const el = scrollRef.current;
    const idx = diffDays(from, today());
    if (el && idx > 0 && idx < days) el.scrollLeft = Math.max(0, idx * dw - (el.clientWidth - labelWidth) * 0.3);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, days, dw]);

  const beginDrag = (e: React.PointerEvent, bar: GanttBar, mode: Drag["mode"]) => {
    if (bar.background) return;
    e.stopPropagation();
    e.preventDefault();
    const d: Drag = { id: bar.id, mode: onChange ? mode : "move", x0: e.clientX, y0: e.clientY, start: bar.start, end: bar.end, rowId: bar.rowId, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const beginCreate = (e: React.PointerEvent<HTMLDivElement>, rowId: string) => {
    if (!onCreate || e.button !== 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const idx = Math.floor((e.clientX - rect.left) / dw);
    const date = addDays(from, idx);
    const d: Drag = { id: "__new", mode: "create", x0: e.clientX, y0: e.clientY, start: date, end: date, rowId, moved: false };
    dragRef.current = d;
    setDrag(d);
  };

  const months = useMemo(() => {
    const list: { label: string; span: number }[] = [];
    for (const d of dayList) {
      const label = monthLabel(d, dw * days > 900);
      const last = list[list.length - 1];
      if (last && last.label === label) last.span++;
      else list.push({ label, span: 1 });
    }
    return list;
  }, [dayList, dw, days]);

  const mondayOffset = (weekday(from) + 6) % 7;
  const timelineStyle: CSSProperties = {
    width: days * dw,
    backgroundSize: `${dw}px 100%, ${dw * 7}px 100%`,
    backgroundPositionX: `0, ${-mondayOffset * dw}px`
  };
  const todayIdx = diffDays(from, t);

  const barBox = (b: GanttBar) => {
    const s = Math.max(0, diffDays(from, b.start));
    const e = Math.min(days - 1, diffDays(from, b.end));
    return { left: s * dw, width: (e - s + 1) * dw, cutStart: b.start < from, cutEnd: b.end > to };
  };

  return (
    <div className="gantt" style={{ "--dw": `${dw}px`, "--lw": `${labelWidth}px` } as CSSProperties}>
      <div className="gantt-scroll" ref={scrollRef}>
        <div className="gantt-inner" style={{ width: labelWidth + days * dw }}>
          <div className="gantt-head">
            <div className="gantt-corner" />
            <div className="gantt-head-timeline">
              <div className="gantt-months">
                {months.map((m, i) => (
                  <span key={i} style={{ width: m.span * dw }}>
                    {m.span * dw > 40 ? m.label : ""}
                  </span>
                ))}
              </div>
              <div className="gantt-days">
                {dayList.map((d) => (
                  <span key={d} className={`${isWeekend(d) ? "we" : ""} ${d === t ? "today" : ""} ${weekday(d) === 1 ? "mon" : ""}`} title={`${weekdayShort(d)} ${d} · KW ${isoWeek(d)}`}>
                    {dw >= 26 ? (
                      <>
                        <small>{weekdayShort(d)}</small>
                        {Number(d.slice(8))}
                      </>
                    ) : dw >= 16 ? (
                      Number(d.slice(8))
                    ) : weekday(d) === 1 ? (
                      <small className="kw">{isoWeek(d)}</small>
                    ) : null}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="gantt-body" style={{ minHeight: bodyHeight }}>
            {rows.length === 0 && <div className="gantt-empty">{emptyText}</div>}
            {groups.map((g, gi) => {
              const isCollapsed = g.name ? collapsed.has(g.name) : false;
              return (
                <Fragment key={g.name ?? `g${gi}`}>
                  {g.name && (
                    <div className="gantt-row gantt-group">
                      <button
                        type="button"
                        className="gantt-label"
                        onClick={() =>
                          setCollapsed((c) => {
                            const n = new Set(c);
                            if (n.has(g.name!)) n.delete(g.name!);
                            else n.add(g.name!);
                            return n;
                          })
                        }
                      >
                        {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                        {g.name}
                        <span className="gantt-count">{g.rows.length}</span>
                      </button>
                      <div className="gantt-timeline" style={timelineStyle}>
                        {groupLoad &&
                          dayList.map((d, i) => {
                            const busy = g.rows.filter((r) => shownBars.some((b) => b.rowId === r.id && !b.background && b.start <= d && b.end >= d)).length;
                            const ratio = busy / g.rows.length;
                            return (
                              <span key={d} className="load" style={{ left: i * dw, width: dw, opacity: busy ? 0.25 + ratio * 0.75 : 0 }} title={`${busy} von ${g.rows.length} verplant`}>
                                {dw >= 20 && busy ? busy : ""}
                              </span>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  {!isCollapsed &&
                    g.rows.map((row) => {
                      const info = layout.get(row.id)!;
                      const rowBars = visibleBars.filter((b) => b.rowId === row.id);
                      const creating = drag?.mode === "create" && drag.rowId === row.id ? drag : null;
                      return (
                        <div key={row.id} className={`gantt-row ${row.muted ? "muted" : ""} ${drag?.rowId === row.id && drag.mode === "move" ? "drop" : ""}`} style={{ height: rowHeight(info.count) }} data-row={row.id}>
                          <div className="gantt-label">
                            <div className="gantt-label-text">
                              <span>{row.label}</span>
                              {row.sub && <small>{row.sub}</small>}
                            </div>
                          </div>
                          <div className={`gantt-timeline ${onCreate ? "creatable" : ""}`} style={timelineStyle} onPointerDown={(e) => beginCreate(e, row.id)}>
                            {rowBars
                              .filter((b) => b.background)
                              .map((b) => {
                                const box = barBox(b);
                                return (
                                  <div key={b.id} className="gantt-bg" style={{ left: box.left, width: box.width, "--c": b.color } as CSSProperties} title={b.title ?? b.label}>
                                    {box.width > 50 && <span>{b.label}</span>}
                                  </div>
                                );
                              })}
                            {rowBars
                              .filter((b) => !b.background)
                              .map((b) => {
                                const box = barBox(b);
                                const lane = info.lane.get(b.id) ?? 0;
                                const top = PAD + lane * LANE;
                                const active = drag?.id === b.id;
                                if (b.milestone) {
                                  return (
                                    <div
                                      key={b.id}
                                      className={`gantt-milestone ${active ? "active" : ""}`}
                                      style={{ left: box.left + dw / 2 - 8, top: top + 1, "--c": b.color } as CSSProperties}
                                      title={b.title ?? b.label}
                                      onPointerDown={(e) => beginDrag(e, b, "move")}
                                    >
                                      <i />
                                      <span>{b.label}</span>
                                    </div>
                                  );
                                }
                                return (
                                  <div
                                    key={b.id}
                                    className={`gantt-bar ${b.conflict ? "conflict" : ""} ${active ? "active" : ""} ${box.cutStart ? "cut-start" : ""} ${box.cutEnd ? "cut-end" : ""}`}
                                    style={{ left: box.left + 1, width: Math.max(6, box.width - 2), top, "--c": b.color } as CSSProperties}
                                    title={b.title ?? b.label}
                                    onPointerDown={(e) => beginDrag(e, b, "move")}
                                  >
                                    {b.progress !== undefined && <span className="gantt-bar-progress" style={{ width: `${b.progress}%` }} />}
                                    <span className="gantt-bar-label">{b.label}</span>
                                    {onChange && !box.cutStart && <span className="handle handle-l" onPointerDown={(e) => beginDrag(e, b, "start")} />}
                                    {onChange && !box.cutEnd && <span className="handle handle-r" onPointerDown={(e) => beginDrag(e, b, "end")} />}
                                  </div>
                                );
                              })}
                            {creating && (
                              <div className="gantt-creating" style={{ left: diffDays(from, creating.start) * dw, width: (diffDays(creating.start, creating.end) + 1) * dw }}>
                                {diffDays(creating.start, creating.end) + 1} T
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                </Fragment>
              );
            })}

            {todayIdx >= 0 && todayIdx < days && <div className="gantt-today" style={{ left: labelWidth + todayIdx * dw + dw / 2 }} />}

            {showDependencies && (
              <svg className="gantt-deps" width={days * dw} height={bodyHeight} style={{ left: labelWidth }}>
                <defs>
                  <marker id="arrow" viewBox="0 0 8 8" refX="7" refY="4" markerWidth="7" markerHeight="7" orient="auto">
                    <path d="M0,0 L8,4 L0,8 z" />
                  </marker>
                </defs>
                {visibleBars
                  .filter((b) => b.dependsOn)
                  .map((b) => {
                    const pre = shownBars.find((p) => p.id === b.dependsOn);
                    const y1 = pre && rowTops.get(pre.rowId);
                    const y2 = rowTops.get(b.rowId);
                    if (!pre || y1 === undefined || y2 === undefined) return null;
                    const x1 = (diffDays(from, pre.end) + 1) * dw - (pre.milestone ? dw / 2 - 6 : 1);
                    const x2 = diffDays(from, b.start) * dw + (b.milestone ? dw / 2 - 8 : 1);
                    const ya = y1 + PAD + 9;
                    const yb = y2 + PAD + 9;
                    const mid = Math.max(x1 + 6, Math.min(x2 - 6, x1 + 10));
                    const late = pre.end >= b.start;
                    return <path key={b.id} className={late ? "late" : ""} d={`M${x1},${ya} H${mid} V${yb} H${x2}`} markerEnd="url(#arrow)" />;
                  })}
              </svg>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function rowHeight(lanes: number) {
  return Math.max(MIN_ROW, lanes * LANE + PAD * 2 - 2);
}

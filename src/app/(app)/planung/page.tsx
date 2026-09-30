"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gantt, type GanttBar, type GanttRow } from "@/components/gantt";
import { useEditor } from "@/components/shell";
import { Badge, Dot, PageHeader, SearchInput, Segmented } from "@/components/ui";
import { addDays, fmt, inRange, isWeekend, startOfWeek, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { findConflicts, resourceName, useStore } from "@/lib/store";
import type { ResourceType } from "@/lib/types";

type Zoom = "week" | "2weeks" | "month" | "quarter";

const zooms: Record<Zoom, { label: string; days: number; step: number; min: number }> = {
  week: { label: "Woche", days: 7, step: 7, min: 60 },
  "2weeks": { label: "2 Wochen", days: 14, step: 7, min: 34 },
  month: { label: "Monat", days: 35, step: 28, min: 18 },
  quarter: { label: "Quartal", days: 91, step: 28, min: 9 }
};

const LABEL_W = 200;

export default function PlanningPage() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const [zoom, setZoom] = useState<Zoom>("2weeks");
  const [from, setFrom] = useState(() => startOfWeek(today()));
  const [types, setTypes] = useState<Set<ResourceType>>(new Set(["employee", "vehicle", "equipment"]));
  const [projectFilter, setProjectFilter] = useState("");
  const [query, setQuery] = useState("");
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1000);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const z = zooms[zoom];
  const labelWidth = width < 640 ? 130 : LABEL_W;
  const dayWidth = Math.max(z.min, Math.floor((width - labelWidth - 2) / z.days));
  const to = addDays(from, z.days - 1);
  const conflicts = useMemo(() => findConflicts(data), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (text: string) => !q || text.toLowerCase().includes(q);
    const list: GanttRow[] = [];
    if (types.has("employee")) {
      const teams = [...new Set(data.employees.filter((e) => e.active).map((e) => e.team || "Ohne Team"))].sort();
      for (const team of teams) {
        for (const e of data.employees.filter((x) => x.active && (x.team || "Ohne Team") === team && match(`${x.name} ${x.role} ${team}`))) {
          list.push({ id: `employee:${e.id}`, label: e.name, sub: e.role, group: team });
        }
      }
    }
    if (types.has("vehicle")) {
      for (const v of data.vehicles.filter((x) => match(`${x.name} ${x.plate} ${x.type}`))) {
        list.push({ id: `vehicle:${v.id}`, label: v.name, sub: v.status === "verfuegbar" ? v.plate : `${v.plate} · ${L.vehicleStatus[v.status].label}`, group: "Fahrzeuge", muted: v.status !== "verfuegbar" });
      }
    }
    if (types.has("equipment")) {
      for (const q2 of data.equipment.filter((x) => match(`${x.name} ${x.category} ${x.serial}`))) {
        list.push({ id: `equipment:${q2.id}`, label: q2.name, sub: q2.status === "verfuegbar" ? q2.category : L.equipmentStatus[q2.status].label, group: "Geräte", muted: q2.status !== "verfuegbar" });
      }
    }
    if (onlyConflicts) {
      const withConflict = new Set(data.assignments.filter((a) => conflicts.has(a.id)).map((a) => `${a.resourceType}:${a.resourceId}`));
      return list.filter((r) => withConflict.has(r.id));
    }
    return list;
  }, [data, types, query, onlyConflicts, conflicts]);

  const bars = useMemo(() => {
    const projects = new Map(data.projects.map((p) => [p.id, p]));
    const result: GanttBar[] = data.assignments
      .filter((a) => !projectFilter || a.projectId === projectFilter)
      .map((a) => {
        const p = projects.get(a.projectId);
        const conflict = conflicts.has(a.id);
        return {
          id: a.id,
          rowId: `${a.resourceType}:${a.resourceId}`,
          start: a.start,
          end: a.end,
          label: p ? `${p.code} ${p.name}` : "Projekt gelöscht",
          color: p?.color ?? "#94a3b8",
          conflict,
          title: `${p?.name ?? "–"}\n${fmt(a.start)} – ${fmt(a.end)}${a.note ? `\n${a.note}` : ""}${conflict ? "\n⚠ Konflikt: Doppelbuchung oder Abwesenheit" : ""}`
        };
      });
    for (const ab of data.absences) {
      result.push({ id: ab.id, rowId: `employee:${ab.employeeId}`, start: ab.start, end: ab.end, label: L.absenceType[ab.type].label, color: ab.type === "krank" ? "#ef4444" : ab.type === "urlaub" ? "#06b6d4" : "#8b5cf6", background: true, title: `${L.absenceType[ab.type].label} ${fmt(ab.start)} – ${fmt(ab.end)}` });
    }
    return result;
  }, [data, conflicts, projectFilter]);

  // Utilisation of employees across the visible working days.
  const utilisation = useMemo(() => {
    const employees = data.employees.filter((e) => e.active);
    let capacity = 0;
    let booked = 0;
    for (let d = from; d <= to; d = addDays(d, 1)) {
      if (isWeekend(d)) continue;
      for (const e of employees) {
        if (data.absences.some((ab) => ab.employeeId === e.id && inRange(d, ab.start, ab.end))) continue;
        capacity++;
        if (data.assignments.some((a) => a.resourceType === "employee" && a.resourceId === e.id && inRange(d, a.start, a.end))) booked++;
      }
    }
    return capacity ? Math.round((booked / capacity) * 100) : 0;
  }, [data, from, to]);

  const toggleType = (t: ResourceType) =>
    setTypes((s) => {
      const n = new Set(s);
      if (n.has(t)) n.delete(t);
      else n.add(t);
      return n;
    });

  const activeProjects = data.projects.filter((p) => p.status !== "abgeschlossen");

  return (
    <div className="page page-planner">
      <PageHeader
        title="Plantafel"
        subtitle={`${fmt(from)} – ${fmt(to)} · Auslastung Mitarbeiter ${utilisation} %`}
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "assignment" })}>
            <Plus size={16} /> Einplanen
          </button>
        }
      />

      <div className="toolbar">
        <div className="btn-group">
          <button className="btn btn-icon" type="button" onClick={() => setFrom(addDays(from, -z.step))} aria-label="Zurück">
            <ChevronLeft size={16} />
          </button>
          <button className="btn" type="button" onClick={() => setFrom(startOfWeek(today()))}>
            Heute
          </button>
          <button className="btn btn-icon" type="button" onClick={() => setFrom(addDays(from, z.step))} aria-label="Weiter">
            <ChevronRight size={16} />
          </button>
        </div>
        <Segmented options={(Object.keys(zooms) as Zoom[]).map((k) => ({ value: k, label: zooms[k].label }))} value={zoom} onChange={setZoom} />
        <div className="chip-group">
          {(Object.keys(L.resourceType) as ResourceType[]).map((t) => (
            <button key={t} type="button" className={`chip ${types.has(t) ? "on" : ""}`} onClick={() => toggleType(t)}>
              {L.resourceType[t].plural}
            </button>
          ))}
        </div>
        <select className="select-sm" value={projectFilter} onChange={(e) => setProjectFilter(e.target.value)}>
          <option value="">Alle Projekte</option>
          {activeProjects.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
        <SearchInput value={query} onChange={setQuery} placeholder="Ressource suchen…" />
        {conflicts.size > 0 && (
          <button type="button" className={`chip chip-danger ${onlyConflicts ? "on" : ""}`} onClick={() => setOnlyConflicts((v) => !v)}>
            <AlertTriangle size={13} /> {conflicts.size} Konflikte
          </button>
        )}
      </div>

      <div className="planner-legend">
        {activeProjects.map((p) => (
          <button key={p.id} type="button" className={`legend-item ${projectFilter === p.id ? "on" : ""}`} onClick={() => setProjectFilter(projectFilter === p.id ? "" : p.id)}>
            <Dot color={p.color} /> {p.code} {p.name}
          </button>
        ))}
        <span className="legend-item static">
          <span className="legend-hatch" /> Abwesenheit
        </span>
        <span className="legend-hint">Ziehen = verschieben · Ränder = Dauer · leere Fläche ziehen = neu einplanen</span>
      </div>

      <div ref={wrapRef} className="planner-wrap">
        <Gantt
          rows={rows}
          bars={bars}
          from={from}
          days={z.days}
          dayWidth={dayWidth}
          labelWidth={labelWidth}
          lanes
          groupLoad
          allowRowChange
          emptyText={onlyConflicts ? "Keine Konflikte 🎉" : "Keine Ressourcen gefunden"}
          onBarClick={(id) => {
            const a = data.assignments.find((x) => x.id === id);
            if (a) openEditor({ kind: "assignment", item: a });
          }}
          onChange={(id, start, end, rowId) => {
            const a = data.assignments.find((x) => x.id === id);
            if (!a) return;
            const [type, resourceId] = rowId.split(":") as [ResourceType, string];
            if (type !== a.resourceType) {
              notify(`${L.resourceType[a.resourceType].label} kann nur auf gleiche Ressourcenart verschoben werden`);
              return;
            }
            const moved = resourceId !== a.resourceId;
            save("assignments", { ...a, start, end, resourceId }, moved ? `Einplanung umgebucht auf ${resourceName(data, type, resourceId)}` : undefined);
            notify(moved ? `Umgebucht auf ${resourceName(data, type, resourceId)}` : `${fmt(start)} – ${fmt(end)}`);
          }}
          onCreate={(rowId, start, end) => {
            const [resourceType, resourceId] = rowId.split(":");
            openEditor({ kind: "assignment", item: { resourceType, resourceId, start, end, projectId: projectFilter || activeProjects[0]?.id || "" } });
          }}
        />
      </div>

      <ConflictList />
    </div>
  );
}

function ConflictList() {
  const { data } = useStore();
  const openEditor = useEditor();
  const conflicts = findConflicts(data);
  if (!conflicts.size) return null;
  const list = data.assignments.filter((a) => conflicts.has(a.id)).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <section className="card conflict-card">
      <header className="card-header">
        <h2>
          <AlertTriangle size={15} /> Konflikte
        </h2>
        <Badge tone="red">{list.length}</Badge>
      </header>
      <ul className="compact-list">
        {list.map((a) => {
          const p = data.projects.find((x) => x.id === a.projectId);
          const absence = a.resourceType === "employee" && data.absences.find((ab) => ab.employeeId === a.resourceId && ab.start <= a.end && ab.end >= a.start);
          return (
            <li key={a.id}>
              <button type="button" onClick={() => openEditor({ kind: "assignment", item: a })}>
                <Dot color={p?.color ?? "#94a3b8"} />
                <strong>{resourceName(data, a.resourceType, a.resourceId)}</strong>
                <span>{p?.name}</span>
                <span className="muted">
                  {fmt(a.start)} – {fmt(a.end)}
                </span>
                <Badge tone={absence ? "violet" : "red"}>{absence ? L.absenceType[absence.type].label : "Doppelbuchung"}</Badge>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

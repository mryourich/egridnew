"use client";

import { AlertTriangle, ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { Gantt, type GanttBar, type GanttRow } from "@/components/gantt";
import { useEditor } from "@/components/shell";
import { PageHeader, SearchInput, Segmented } from "@/components/ui";
import { addDays, fmt, startOfWeek, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { findConflicts, resourceName, useStore } from "@/lib/store";
import type { ResourceType } from "@/lib/types";

type Zoom = "week" | "2weeks" | "month";

const zooms: Record<Zoom, { label: string; days: number; step: number; min: number }> = {
  week: { label: "Woche", days: 7, step: 7, min: 60 },
  "2weeks": { label: "2 Wochen", days: 14, step: 7, min: 34 },
  month: { label: "Monat", days: 35, step: 28, min: 18 }
};

export default function PlanningPage() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const [zoom, setZoom] = useState<Zoom>("2weeks");
  const [from, setFrom] = useState(() => startOfWeek(today()));
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
  const labelWidth = width < 640 ? 120 : 190;
  const dayWidth = Math.max(z.min, Math.floor((width - labelWidth - 2) / z.days));
  const to = addDays(from, z.days - 1);
  const conflicts = useMemo(() => findConflicts(data), [data]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (text: string) => !q || text.toLowerCase().includes(q);
    const list: GanttRow[] = [
      ...data.employees.filter((e) => e.active && match(`${e.name} ${e.role}`)).map((e) => ({ id: `employee:${e.id}`, label: e.name, group: "Mitarbeiter" })),
      ...data.vehicles.filter((v) => match(`${v.name} ${v.plate}`)).map((v) => ({ id: `vehicle:${v.id}`, label: `${v.name} · ${v.plate}`, group: "Fahrzeuge", muted: v.status !== "verfuegbar" })),
      ...data.equipment.filter((x) => match(x.name)).map((x) => ({ id: `equipment:${x.id}`, label: x.name, group: "Geräte", muted: x.status !== "verfuegbar" }))
    ];
    if (!onlyConflicts) return list;
    const withConflict = new Set(data.assignments.filter((a) => conflicts.has(a.id)).map((a) => `${a.resourceType}:${a.resourceId}`));
    return list.filter((r) => withConflict.has(r.id));
  }, [data, query, onlyConflicts, conflicts]);

  const bars = useMemo(() => {
    const result: GanttBar[] = data.assignments.map((a) => {
      const p = data.projects.find((x) => x.id === a.projectId);
      const conflict = conflicts.has(a.id);
      return {
        id: a.id,
        rowId: `${a.resourceType}:${a.resourceId}`,
        start: a.start,
        end: a.end,
        label: p?.name ?? "Projekt gelöscht",
        color: p?.color ?? "#94a3b8",
        conflict,
        title: `${p?.name ?? "–"}\n${fmt(a.start)} – ${fmt(a.end)}${a.note ? `\n${a.note}` : ""}${conflict ? "\nKonflikt: doppelt verplant oder abwesend" : ""}`
      };
    });
    for (const ab of data.absences) {
      result.push({ id: ab.id, rowId: `employee:${ab.employeeId}`, start: ab.start, end: ab.end, label: L.absenceType[ab.type].label, color: "#94a3b8", background: true });
    }
    return result;
  }, [data, conflicts]);

  return (
    <div className="page page-planner">
      <PageHeader
        title="Einsatzplanung"
        subtitle={`${fmt(from)} – ${fmt(to)}`}
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
        <SearchInput value={query} onChange={setQuery} placeholder="Suchen…" />
        {conflicts.size > 0 && (
          <button type="button" className={`chip chip-danger ${onlyConflicts ? "on" : ""}`} onClick={() => setOnlyConflicts((v) => !v)}>
            <AlertTriangle size={13} /> {conflicts.size} Konflikte
          </button>
        )}
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
          allowRowChange
          emptyText={onlyConflicts ? "Keine Konflikte" : "Nichts gefunden"}
          onBarClick={(id) => {
            const a = data.assignments.find((x) => x.id === id);
            if (a) openEditor({ kind: "assignment", item: a });
          }}
          onChange={(id, start, end, rowId) => {
            const a = data.assignments.find((x) => x.id === id);
            if (!a) return;
            const [type, resourceId] = rowId.split(":") as [ResourceType, string];
            if (type !== a.resourceType) {
              notify(`${L.resourceType[a.resourceType].label} kann nur auf gleiche Art verschoben werden`);
              return;
            }
            const moved = resourceId !== a.resourceId;
            save("assignments", { ...a, start, end, resourceId }, moved ? `Einplanung umgebucht auf ${resourceName(data, type, resourceId)}` : undefined);
            notify(moved ? `Umgebucht auf ${resourceName(data, type, resourceId)}` : `${fmt(start)} – ${fmt(end)}`);
          }}
          onCreate={(rowId, start, end) => {
            const [resourceType, resourceId] = rowId.split(":");
            openEditor({ kind: "assignment", item: { resourceType, resourceId, start, end } });
          }}
        />
      </div>
    </div>
  );
}

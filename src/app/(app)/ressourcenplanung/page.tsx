"use client";

import { AlertTriangle, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { ResourcePlanner, usePlannerRange } from "@/components/planner";
import { useEditor } from "@/components/shell";
import { PageHeader, SearchInput } from "@/components/ui";
import { fmt } from "@/lib/date";
import { findConflicts, useStore } from "@/lib/store";

export default function ResourcePlanningPage() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const { from, days, dayWidth, controls } = usePlannerRange();
  const [query, setQuery] = useState("");
  const [focus, setFocus] = useState("");
  const [onlyConflicts, setOnlyConflicts] = useState(false);
  const conflicts = useMemo(() => findConflicts(data), [data]);

  const employees = useMemo(() => {
    const q = query.trim().toLowerCase();
    let list = data.employees.filter((e) => e.active && (!q || `${e.name} ${e.role} ${e.team} ${e.department}`.toLowerCase().includes(q)));
    if (onlyConflicts) list = list.filter((e) => data.assignments.some((a) => a.resourceId === e.id && conflicts.has(a.id)));
    return list;
  }, [data, query, onlyConflicts, conflicts]);

  const active = data.projects.filter((p) => p.status !== "abgeschlossen");

  return (
    <div className="page">
      <PageHeader
        title="Ressourcenplanung"
        subtitle="Alle Mitarbeiter und Projekte · ziehen zum Verschieben, Ränder für die Dauer, leere Fläche ziehen zum Einplanen"
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "assignment", item: focus ? { projectId: focus } : undefined })}>
            <Plus size={16} /> Einplanen
          </button>
        }
      />
      <div className="toolbar">
        {controls}
        <select className="select-sm" value={focus} onChange={(e) => setFocus(e.target.value)} aria-label="Projekt hervorheben">
          <option value="">Alle Projekte</option>
          {active.map((p) => (
            <option key={p.id} value={p.id}>
              {p.code} · {p.name}
            </option>
          ))}
        </select>
        <SearchInput value={query} onChange={setQuery} placeholder="Mitarbeiter suchen…" />
        {conflicts.size > 0 && (
          <button type="button" className={`chip chip-danger ${onlyConflicts ? "on" : ""}`} onClick={() => setOnlyConflicts((v) => !v)}>
            <AlertTriangle size={13} /> {conflicts.size} Konflikte
          </button>
        )}
      </div>
      <ResourcePlanner
        employees={employees}
        assignments={data.assignments}
        absences={data.absences}
        projects={data.projects}
        from={from}
        days={days}
        dayWidth={dayWidth}
        focusProjectId={focus || undefined}
        conflicts={conflicts}
        emptyText={onlyConflicts ? "Keine Konflikte" : "Keine Mitarbeiter gefunden"}
        onBarClick={(id) => {
          const a = data.assignments.find((x) => x.id === id);
          if (a) openEditor({ kind: "assignment", item: a });
        }}
        onAbsenceChange={(id, start, end, employeeId) => {
          const a = data.absences.find((x) => x.id === id);
          if (!a) return;
          const who = data.employees.find((x) => x.id === employeeId)?.name ?? "";
          save("absences", { ...a, start, end, employeeId }, `Abwesenheit ${who} ${fmt(start)} – ${fmt(end)}`);
          notify(`${who}: ${fmt(start)} – ${fmt(end)}`);
        }}
        onAbsenceClick={(id) => {
          const a = data.absences.find((x) => x.id === id);
          if (a) openEditor({ kind: "absence", item: a });
        }}
        onChange={(id, start, end, employeeId) => {
          const a = data.assignments.find((x) => x.id === id);
          if (!a) return;
          const moved = employeeId !== a.resourceId;
          const name = data.employees.find((e) => e.id === employeeId)?.name ?? "";
          save("assignments", { ...a, start, end, resourceId: employeeId }, moved ? `Einplanung umgebucht auf ${name}` : undefined);
          notify(moved ? `Umgebucht auf ${name}` : `${fmt(start)} – ${fmt(end)}`);
        }}
        onAddPerson={(department, team) => openEditor({ kind: "employee", item: { department, team } })}
        onPersonClick={(id) => {
          const e = data.employees.find((x) => x.id === id);
          if (e) openEditor({ kind: "employee", item: e });
        }}
        onCreate={(employeeId, start, end) => openEditor({ kind: "assignment", item: { resourceType: "employee", resourceId: employeeId, start, end, projectId: focus || active[0]?.id || "" } })}
      />
    </div>
  );
}

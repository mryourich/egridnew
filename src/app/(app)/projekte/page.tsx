"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Gantt } from "@/components/gantt";
import { useEditor } from "@/components/shell";
import { Avatar, Badge, Dot, Empty, PageHeader, Progress, SearchInput, Segmented } from "@/components/ui";
import { addDays, diffDays, fmt, startOfWeek, today } from "@/lib/date";
import * as L from "@/lib/labels";
import { employeeName, projectProgress, useStore } from "@/lib/store";
import type { ProjectStatus } from "@/lib/types";

type View = "list" | "timeline";

export default function ProjectsPage() {
  const { data, save, notify } = useStore();
  const openEditor = useEditor();
  const router = useRouter();
  const [view, setView] = useState<View>("list");
  const [status, setStatus] = useState<ProjectStatus | "all">("all");
  const [query, setQuery] = useState("");

  const projects = useMemo(() => {
    const q = query.toLowerCase();
    return data.projects
      .filter((p) => status === "all" || p.status === status)
      .filter((p) => !q || `${p.code} ${p.name} ${p.client} ${p.location}`.toLowerCase().includes(q))
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [data.projects, status, query]);

  const counts = (s: ProjectStatus) => data.projects.filter((p) => p.status === s).length;
  const from = projects.length ? startOfWeek(projects.reduce((m, p) => (p.start < m ? p.start : m), projects[0].start)) : startOfWeek(today());
  const until = projects.reduce((m, p) => (p.end > m ? p.end : m), addDays(today(), 30));
  const days = Math.min(365, diffDays(from, until) + 8);

  return (
    <div className="page">
      <PageHeader
        title="Projekte"
        subtitle={`${data.projects.length} Projekte · ${counts("aktiv")} aktiv`}
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "project" })}>
            <Plus size={16} /> Projekt anlegen
          </button>
        }
      />
      <div className="toolbar">
        <Segmented
          options={[
            { value: "list", label: "Liste" },
            { value: "timeline", label: "Zeitplan" }
          ]}
          value={view}
          onChange={setView}
        />
        <div className="chip-group">
          <button type="button" className={`chip ${status === "all" ? "on" : ""}`} onClick={() => setStatus("all")}>
            Alle {data.projects.length}
          </button>
          {(Object.keys(L.projectStatus) as ProjectStatus[]).map((s) => (
            <button key={s} type="button" className={`chip ${status === s ? "on" : ""}`} onClick={() => setStatus(s)}>
              {L.projectStatus[s].label} {counts(s)}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Projekt suchen…" />
      </div>

      {projects.length === 0 ? (
        <Empty>Keine Projekte gefunden.</Empty>
      ) : view === "list" ? (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Projekt</th>
                <th>Auftraggeber</th>
                <th>Status</th>
                <th>Projektleitung</th>
                <th>Bauleitung</th>
                <th>Team (heute · geplant)</th>
                <th>Zeitraum</th>
                <th className="w-progress">Fortschritt</th>
                <th className="num">Mängel</th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p) => {
                const progress = projectProgress(data, p.id);
                const issues = data.issues.filter((i) => i.projectId === p.id && i.status !== "erledigt").length;
                const t = today();
                const team = data.assignments.filter((a) => a.projectId === p.id && a.resourceType === "employee" && a.end >= t);
                const nowIds = [...new Set(team.filter((a) => a.start <= t).map((a) => a.resourceId))];
                const laterIds = [...new Set(team.filter((a) => a.start > t).map((a) => a.resourceId))].filter((id) => !nowIds.includes(id));
                return (
                  <tr key={p.id} className="clickable" onClick={() => router.push(`/projekte/${p.id}`)}>
                    <td>
                      <Link href={`/projekte/${p.id}`} className="cell-title" onClick={(e) => e.stopPropagation()}>
                        <Dot color={p.color} />
                        <span>
                          <strong>{p.name}</strong>
                          <small>
                            {p.code} · {p.location}
                          </small>
                        </span>
                      </Link>
                    </td>
                    <td>{p.client}</td>
                    <td>
                      <Badge tone={L.projectStatus[p.status].tone}>{L.projectStatus[p.status].label}</Badge>
                    </td>
                    <td>
                      {p.managerId && (
                        <span className="cell-person">
                          <Avatar name={employeeName(data, p.managerId)} size={20} /> {employeeName(data, p.managerId)}
                        </span>
                      )}
                    </td>
                    <td>
                      {p.siteManagerId && (
                        <span className="cell-person">
                          <Avatar name={employeeName(data, p.siteManagerId)} size={20} /> {employeeName(data, p.siteManagerId)}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className="avatar-stack" title={[...nowIds, ...laterIds].map((id) => employeeName(data, id)).join(", ")}>
                        {nowIds.slice(0, 6).map((id) => (
                          <Avatar key={id} name={employeeName(data, id)} size={22} />
                        ))}
                        {laterIds.slice(0, 4).map((id) => (
                          <span key={id} className="later">
                            <Avatar name={employeeName(data, id)} size={22} />
                          </span>
                        ))}
                        <small>
                          {nowIds.length} · {laterIds.length}
                        </small>
                      </span>
                    </td>
                    <td className="nowrap">
                      {fmt(p.start)} – {fmt(p.end)}
                    </td>
                    <td>
                      <span className="cell-progress">
                        <Progress value={progress} color={p.color} /> {progress} %
                      </span>
                    </td>
                    <td className="num">{issues ? <Badge tone="amber">{issues}</Badge> : "–"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="card card-flush">
          <Gantt
            rows={projects.map((p) => ({ id: p.id, label: p.name, sub: `${p.code} · ${L.projectStatus[p.status].label}` }))}
            bars={projects.map((p) => ({ id: p.id, rowId: p.id, start: p.start, end: p.end, label: `${projectProgress(data, p.id)} %`, color: p.color, progress: projectProgress(data, p.id), title: `${p.name}\n${fmt(p.start)} – ${fmt(p.end)}` }))}
            from={from}
            days={days}
            dayWidth={days > 120 ? 6 : 12}
            onBarClick={(id) => router.push(`/projekte/${id}`)}
            onChange={(id, start, end) => {
              const p = data.projects.find((x) => x.id === id);
              if (!p) return;
              save("projects", { ...p, start, end }, `Projektzeitraum ${p.name} geändert`);
              notify(`${p.name}: ${fmt(start)} – ${fmt(end)}`);
            }}
          />
        </div>
      )}
    </div>
  );
}

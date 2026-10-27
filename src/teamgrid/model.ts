import { today } from "@/core/date";
import { canManage, canSee, canWork, teamOf } from "@/core/roles";
import type { Data, OpenPoint, PointType, Project } from "@/core/types";

/** Projects the signed-in person sees, newest work first; archived ones on request. */
export function visibleProjects(data: Data, archived = false) {
  return data.projects
    .filter((p) => (archived ? p.status === "archived" : p.status !== "archived") && canSee(data, p))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export const POINT_TYPE: Record<PointType, { label: string; child?: PointType; childLabel?: string }> = {
  area: { label: "Bereich", child: "section", childLabel: "Unterbereich" },
  section: { label: "Unterbereich", child: "subsection", childLabel: "Abschnitt" },
  subsection: { label: "Abschnitt", child: "task", childLabel: "Punkt" },
  task: { label: "Punkt" }
};

export const childrenOf = (points: OpenPoint[], parentId: string) => points.filter((p) => p.parentId === parentId).sort((a, b) => a.order - b.order);

/** The actual work items (leaves of type "task") below a node, or all of a project. */
export function tasksUnder(points: OpenPoint[], id: string) {
  if (!id) return points.filter((p) => p.type === "task");
  const out: OpenPoint[] = [];
  const walk = (pid: string) => {
    for (const c of points.filter((p) => p.parentId === pid)) (c.type === "task" ? out.push(c) : walk(c.id));
  };
  walk(id);
  return out;
}

export function pathOf(points: OpenPoint[], id: string) {
  const out: OpenPoint[] = [];
  for (let n = points.find((p) => p.id === id); n; n = points.find((p) => p.id === n!.parentId)) out.unshift(n);
  return out;
}

export const pathLabel = (points: OpenPoint[], id: string) =>
  pathOf(points, id)
    .map((p) => p.title)
    .join(" › ");

/** Share of done points in percent – the project progress comes from the work, not from a slider. */
export function progress(points: OpenPoint[]) {
  const tasks = points.filter((p) => p.type === "task");
  return tasks.length ? Math.round((tasks.filter((t) => t.status === "done").length / tasks.length) * 100) : 0;
}

export function projectFacts(data: Data, p: Project) {
  const points = data.points.filter((x) => x.projectId === p.id);
  const tasks = points.filter((x) => x.type === "task");
  const t = today();
  const defects = data.defects.filter((d) => d.projectId === p.id);
  const openDefects = defects.filter((d) => d.status !== "done");
  return {
    points,
    tasks,
    open: tasks.filter((x) => x.status !== "done"),
    late: tasks.filter((x) => x.status !== "done" && x.due && x.due < t),
    progress: progress(points),
    defects,
    openDefects,
    urgent: openDefects.filter((d) => d.priority === "high"),
    todos: data.tasks.filter((x) => x.projectId === p.id),
    overdue: !!p.due && p.due < t && p.status !== "archived",
    team: teamOf(p)
  };
}

/** Everything the screens of one project need to know about the signed-in person. */
export function access(data: Data, p: Project) {
  return { manage: canManage(data, p), work: canWork(data, p) };
}

export const PROJECT_COLORS = ["#1a5cff", "#7c3aed", "#0891b2", "#16a34a", "#d97706", "#dc2626", "#0f766e", "#475569"];

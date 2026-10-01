import { today } from "./date";
import { isArea, shortPath } from "./site";
import { myProjects } from "./store";
import type { Data, Issue, Project, SiteNode } from "./types";

export type MyTask =
  | { kind: "punkt"; id: string; title: string; where: string; due: string; project: Project; node: SiteNode; overdue: boolean; status: SiteNode["status"] }
  | { kind: "mangel"; id: string; title: string; where: string; due: string; project: Project; issue: Issue; overdue: boolean; severity: Issue["severity"] };

/** Everything assigned to a person that is still open: points of the structure and defects. */
export function myTasks(data: Data, userId = data.currentUserId): MyTask[] {
  const t = today();
  const projects = myProjects(data, userId);
  const byId = new Map(projects.map((p) => [p.id, p]));
  const out: MyTask[] = [];
  for (const n of data.siteNodes) {
    const p = byId.get(n.projectId);
    if (!p || n.assigneeId !== userId || n.status === "erledigt") continue;
    const siblings = data.siteNodes.filter((x) => x.projectId === n.projectId);
    if (isArea(siblings, n)) continue;
    out.push({ kind: "punkt", id: n.id, title: n.title, where: n.parentId ? shortPath(data.siteNodes, n.parentId) : "", due: n.due, project: p, node: n, overdue: !!n.due && n.due < t, status: n.status });
  }
  for (const i of data.issues) {
    const p = byId.get(i.projectId);
    if (!p || i.assigneeId !== userId || i.status === "erledigt") continue;
    out.push({ kind: "mangel", id: i.id, title: i.title, where: i.nodeId ? shortPath(data.siteNodes, i.nodeId) : i.location, due: i.due, project: p, issue: i, overdue: !!i.due && i.due < t, severity: i.severity });
  }
  // overdue first, then by due date, undated last
  return out.sort((a, b) => Number(b.overdue) - Number(a.overdue) || (a.due || "9999").localeCompare(b.due || "9999") || a.title.localeCompare(b.title, "de"));
}

/** Where a task opens: the point in the structure or the defect list. */
export function taskHref(t: MyTask) {
  return t.kind === "punkt" ? `/projekte/${t.project.id}/struktur?punkt=${t.id}` : `/projekte/${t.project.id}/maengel`;
}

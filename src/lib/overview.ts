import { addDays, inRange, today } from "./date";
import { isArea, nodeProgress, siteProgress } from "./site";
import type { Data, Project } from "./types";

const rank = { kritisch: 0, hoch: 1, mittel: 2, niedrig: 3 };

/** Everything worth knowing about one project at a glance. */
export function projectStats(data: Data, p: Project) {
  const t = today();
  const soon = addDays(t, 7);
  const nodes = data.siteNodes.filter((n) => n.projectId === p.id);
  const points = nodes.filter((n) => !isArea(nodes, n));
  const openPoints = points.filter((n) => n.status !== "erledigt");
  const issues = data.issues.filter((i) => i.projectId === p.id);
  const openIssues = issues.filter((i) => i.status !== "erledigt").sort((a, b) => rank[a.severity] - rank[b.severity] || (a.due || "9").localeCompare(b.due || "9"));
  const materials = data.materials.filter((m) => m.projectId === p.id);
  const jobsToday = data.jobs.filter((j) => j.projectId === p.id && !j.symbol && inRange(t, j.start, j.end));
  const openJobs = data.jobs.filter((j) => j.projectId === p.id && !j.symbol && !j.done && j.end >= t);
  const areas = nodes
    .filter((n) => !n.parentId)
    .sort((a, b) => a.order - b.order)
    .map((n) => ({ node: n, progress: nodeProgress(nodes, n) }));
  return {
    progress: siteProgress(data, p.id),
    areas,
    points,
    openPoints,
    inWork: openPoints.filter((n) => n.status === "in_arbeit"),
    overduePoints: openPoints.filter((n) => n.due && n.due < t),
    duePoints: openPoints.filter((n) => n.due && n.due >= t && n.due <= soon),
    openIssues,
    criticalIssues: openIssues.filter((i) => i.severity === "kritisch" || i.severity === "hoch"),
    overdueIssues: openIssues.filter((i) => i.due && i.due < t),
    materialOpen: materials.filter((m) => m.status === "offen"),
    materialOrdered: materials.filter((m) => m.status === "bestellt"),
    jobsToday,
    openJobs,
    crewToday: new Set(jobsToday.map((j) => j.employeeId)).size,
    photos: data.photos.filter((x) => x.projectId === p.id).sort((a, b) => b.takenAt.localeCompare(a.takenAt)),
    lastReport: data.reports.filter((r) => r.projectId === p.id).sort((a, b) => b.date.localeCompare(a.date))[0],
    activity: data.activity.filter((a) => a.projectId === p.id),
    daysLeft: p.end ? Math.round((Date.parse(p.end) - Date.parse(t)) / 864e5) : null
  };
}

export type ProjectStats = ReturnType<typeof projectStats>;

/** Relative time for activity feeds: "vor 5 Min.", "gestern" … */
export function ago(iso: string) {
  const min = Math.round((Date.now() - Date.parse(iso)) / 60000);
  if (min < 1) return "gerade eben";
  if (min < 60) return `vor ${min} Min.`;
  const h = Math.round(min / 60);
  if (h < 24) return `vor ${h} Std.`;
  const d = Math.round(h / 24);
  return d === 1 ? "gestern" : `vor ${d} Tagen`;
}

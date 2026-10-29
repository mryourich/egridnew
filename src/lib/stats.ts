import { inRange, today } from "./date";
import { dueState } from "./format";
import { defectOpen } from "./labels";
import type { Data } from "./store/types";

/** Figures of one site or of all sites ("" ). */
export function siteStats(data: Data, siteId: string) {
  const on = <T extends { siteId: string }>(l: T[]) => (siteId ? l.filter((x) => x.siteId === siteId) : l);
  const points = on(data.points).filter((p) => p.type === "punkt");
  const done = points.filter((p) => p.status === "erledigt").length;
  const defects = on(data.defects);
  const open = defects.filter((d) => defectOpen(d.status));
  const tasks = on(data.tasks).filter((x) => x.status !== "erledigt");
  const t = today();
  return {
    points: points.length,
    pointsDone: done,
    pointsOpen: points.length - done,
    progress: points.length ? Math.round((done / points.length) * 100) : 0,
    defectsOpen: open.length,
    defectsHigh: open.filter((d) => d.priority === "hoch").length,
    defectsOver: open.filter((d) => dueState(d.due) === "over").length,
    tasksOpen: tasks.length,
    tasksOver: tasks.filter((x) => dueState(x.due) === "over").length,
    lowStock: on(data.materials).filter((m) => m.qty < m.minQty).length,
    lowStockOpen: on(data.materials).filter((m) => m.qty < m.minQty && !m.ordered).length,
    todayEntries: on(data.entries).filter((e) => !e.symbol && inRange(t, e.start, e.end)).length
  };
}

import type { Data, Defect, OpenPoint } from "@/lib/store/types";

export const childrenOf = (points: OpenPoint[], parentId: string) => points.filter((p) => p.parentId === parentId).sort((a, b) => a.order - b.order);

/** Checklist points (leaves) below a node. */
export function pointsBelow(points: OpenPoint[], id: string): OpenPoint[] {
  return childrenOf(points, id).flatMap((x) => (x.type === "punkt" ? [x] : pointsBelow(points, x.id)));
}

/** Path from the root down to a node (without the node). */
export function pathOf(points: OpenPoint[], id: string) {
  const out: OpenPoint[] = [];
  let p = points.find((x) => x.id === id);
  while (p?.parentId) {
    const parent = points.find((x) => x.id === p!.parentId);
    if (!parent) break;
    out.unshift(parent);
    p = parent;
  }
  return out;
}

export const pathLabel = (points: OpenPoint[], id: string) => pathOf(points, id).map((x) => x.title).join(" › ");

export const defectNo = (d: Pick<Defect, "no">) => `M-${String(d.no).padStart(3, "0")}`;

export const nextDefectNo = (data: Data, siteId: string) => Math.max(0, ...data.defects.filter((d) => d.siteId === siteId).map((d) => d.no)) + 1;

export const nextOrder = (points: OpenPoint[]) => Math.max(0, ...points.map((x) => x.order)) + 1;

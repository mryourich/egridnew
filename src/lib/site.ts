import type { Data, NodeStatus, Photo, SiteNode } from "./types";

export const nodeStatus: Record<NodeStatus, { label: string; tone: "gray" | "blue" | "green" }> = {
  offen: { label: "Offen", tone: "gray" },
  in_arbeit: { label: "In Arbeit", tone: "blue" },
  erledigt: { label: "Erledigt", tone: "green" }
};

const LEVELS = ["Bereich", "Unterbereich", "Abschnitt"];

/** Name of the level at a given depth: Bereich, Unterbereich, Abschnitt, then Punkt. */
export function levelName(depth: number) {
  return LEVELS[depth] ?? "Punkt";
}

export function childrenOf(nodes: SiteNode[], parentId: string) {
  return nodes.filter((n) => n.parentId === parentId).sort((a, b) => a.order - b.order);
}

export function depthOf(nodes: SiteNode[], node: SiteNode) {
  let depth = 0;
  let current = node;
  while (current.parentId) {
    const parent = nodes.find((n) => n.id === current.parentId);
    if (!parent) break;
    current = parent;
    depth++;
  }
  return depth;
}

export function pathOf(nodes: SiteNode[], id: string) {
  const path: SiteNode[] = [];
  let current = nodes.find((n) => n.id === id);
  while (current) {
    path.unshift(current);
    current = current.parentId ? nodes.find((n) => n.id === current!.parentId) : undefined;
  }
  return path;
}

export function pathLabel(nodes: SiteNode[], id: string) {
  return pathOf(nodes, id)
    .map((n) => n.title)
    .join(" › ");
}

/** The node and all nodes below it. */
export function subtreeIds(nodes: SiteNode[], id: string) {
  const ids = [id];
  for (let i = 0; i < ids.length; i++) ids.push(...nodes.filter((n) => n.parentId === ids[i]).map((n) => n.id));
  return ids;
}

/** Leaf progress from status; parents average their children. */
export function nodeProgress(nodes: SiteNode[], node: SiteNode): number {
  const kids = nodes.filter((n) => n.parentId === node.id);
  if (!kids.length) return node.status === "erledigt" ? 100 : node.status === "in_arbeit" ? 50 : 0;
  return Math.round(kids.reduce((s, k) => s + nodeProgress(nodes, k), 0) / kids.length);
}

export function siteProgress(data: Data, projectId: string) {
  const nodes = data.siteNodes.filter((n) => n.projectId === projectId);
  const roots = nodes.filter((n) => !n.parentId);
  if (!roots.length) return 0;
  return Math.round(roots.reduce((s, r) => s + nodeProgress(nodes, r), 0) / roots.length);
}

/** Tree options for selects, indented by depth. */
export function nodeOptions(nodes: SiteNode[], projectId: string, exclude?: string) {
  const list = nodes.filter((n) => n.projectId === projectId);
  const skip = exclude ? new Set(subtreeIds(list, exclude)) : new Set<string>();
  const out: { value: string; label: string }[] = [];
  const walk = (parentId: string, depth: number) => {
    for (const n of childrenOf(list, parentId)) {
      if (skip.has(n.id)) continue;
      out.push({ value: n.id, label: `${"   ".repeat(depth)}${n.title}` });
      walk(n.id, depth + 1);
    }
  };
  walk("", 0);
  return out;
}

/** Last two levels of a path – compact enough for tables and captions. */
export function shortPath(nodes: SiteNode[], id: string) {
  return pathOf(nodes, id)
    .slice(-2)
    .map((n) => n.title)
    .join(" › ");
}

/** Areas group points; a node without children counts as a point unless it was created as an area. */
export function isArea(nodes: SiteNode[], n: SiteNode) {
  return n.kind ? n.kind === "area" : nodes.some((k) => k.parentId === n.id);
}

/** Points below an area (any depth), in display order. */
export function pointsUnder(nodes: SiteNode[], areaId: string) {
  const out: SiteNode[] = [];
  const walk = (parentId: string) => {
    for (const n of childrenOf(nodes, parentId)) {
      if (isArea(nodes, n)) walk(n.id);
      else out.push(n);
    }
  };
  walk(areaId);
  return out;
}

/** "Bereich - Unterpunkt - 001": the area path plus a running number per point. */
export function photoName(nodes: SiteNode[], photos: Photo[], photo: Photo) {
  const path = photo.nodeId ? pathOf(nodes, photo.nodeId).map((n) => n.title) : [];
  const siblings = photos.filter((p) => p.projectId === photo.projectId && p.nodeId === photo.nodeId).sort((a, b) => a.takenAt.localeCompare(b.takenAt) || a.id.localeCompare(b.id));
  const no = String(siblings.findIndex((p) => p.id === photo.id) + 1).padStart(3, "0");
  return [...(path.length ? path : ["Ohne Bereich"]), no].join(" - ");
}

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { dropFiles } from "./files";
import { now, uid } from "./id";
import { createDemo, createEmpty, DATA_VERSION, DEMO_VERSION } from "./seed";
import type { CalendarLayout, Collection, Data, Item } from "./types";

const KEY = "vysner:baustelle";
const SITE_KEY = "vysner:baustelle:site";

export { now, uid };

export type Toast = { id: number; text: string; tone?: "error"; undo?: () => void };

type Store = {
  data: Data;
  /** creates or replaces a record and stamps who and when */
  save: <K extends Collection>(key: K, item: Item<K>) => void;
  /** removes a record and what hangs off it */
  remove: <K extends Collection>(key: K, id: string) => void;
  /** restores records exactly as they were (undo) */
  restore: (snapshot: Data) => void;
  setLayout: (layout: CalendarLayout) => void;
  setMe: (id: string) => void;
  reset: (kind: "demo" | "empty") => void;
  /** selected site in the top bar ("" = all) */
  siteId: string;
  setSiteId: (id: string) => void;
  notify: (text: string, opts?: { tone?: "error"; undo?: () => void }) => void;
  toast: Toast | null;
  dismiss: () => void;
};

const Ctx = createContext<Store | null>(null);

function load(): Data {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      // the sample company is refreshed when its content changed; own data is kept
      if (d.demo && d.demo !== DEMO_VERSION) return createDemo();
      if (d.version === DATA_VERSION) return { ...createEmpty(), ...d };
    }
  } catch {
    // storage blocked or broken: start with the sample company
  }
  return createDemo();
}

/** Ids of a checklist node and everything below it. */
export function branchOf(points: Data["points"], id: string) {
  const ids = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of points) if (!ids.has(p.id) && ids.has(p.parentId)) (ids.add(p.id), (grew = true));
  }
  return ids;
}

/** Collections that belong to a site – hidden from people who are not on it. */
const SITE_BOUND = ["points", "defects", "tasks", "notes", "materials", "reports"] as const;

/**
 * Who sees a site: team or construction management ("Darf freigeben") see all, everyone else only the sites
 * they lead, belong to or created. The Planner keeps all entries, so everybody knows where everybody works.
 */
export function visibleSiteIds(d: Data) {
  const me = d.people.find((p) => p.id === d.meId);
  if (!me || me.lead) return null;
  return new Set(d.sites.filter((s) => s.managerId === me.id || s.memberIds.includes(me.id) || s.createdBy === me.id).map((s) => s.id));
}

/** The data as the signed-in person sees it. */
function viewOf(d: Data): Data {
  const ids = visibleSiteIds(d);
  if (!ids) return d;
  const v = { ...d, sites: d.sites.filter((s) => ids.has(s.id)) } as Data;
  for (const k of SITE_BOUND) (v as Record<string, unknown>)[k] = (d[k] as { siteId: string }[]).filter((x) => !x.siteId || ids.has(x.siteId));
  return v;
}

/** Undo snapshots are taken from the view – records the person could not see are kept. */
function mergeHidden(snapshot: Data, full: Data): Data {
  const ids = visibleSiteIds(full);
  if (!ids) return snapshot;
  const out = { ...snapshot, sites: [...snapshot.sites, ...full.sites.filter((s) => !ids.has(s.id) && !snapshot.sites.some((x) => x.id === s.id))] } as Data;
  for (const k of SITE_BOUND) {
    const hidden = (full[k] as { id: string; siteId: string }[]).filter((x) => x.siteId && !ids.has(x.siteId));
    (out as Record<string, unknown>)[k] = [...(snapshot[k] as { id: string }[]), ...hidden.filter((h) => !(snapshot[k] as { id: string }[]).some((x) => x.id === h.id))];
  }
  return out;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [siteId, setSite] = useState("");
  const [toast, setToast] = useState<Toast | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setData(load());
    try {
      setSite(window.localStorage.getItem(SITE_KEY) ?? "");
    } catch {
      // only for this visit
    }
  }, []);

  const notify = useCallback((text: string, opts: { tone?: "error"; undo?: () => void } = {}) => {
    setToast({ id: Date.now(), text, ...opts });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(null), opts.undo ? 6000 : 3000);
  }, []);

  useEffect(() => {
    if (!data) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      notify("Speichern fehlgeschlagen – der Speicher dieses Browsers ist voll.", { tone: "error" });
    }
  }, [data, notify]);

  const save = useCallback(<K extends Collection>(key: K, item: Item<K>) => {
    setData((d) => {
      if (!d) return d;
      const list = d[key] as Item<K>[];
      const old = list.find((x) => x.id === item.id);
      const it = { ...(item as Record<string, unknown>) };
      if (key !== "people" && key !== "absences") {
        if (!old) {
          it.createdBy ||= d.meId;
          it.createdAt ||= now();
        } else {
          it.updatedBy = d.meId;
          it.updatedAt = now();
        }
      }
      return { ...d, [key]: old ? list.map((x) => (x.id === item.id ? (it as Item<K>) : x)) : [...list, it as Item<K>] };
    });
  }, []);

  const remove = useCallback(<K extends Collection>(key: K, id: string) => {
    setData((d) => {
      if (!d) return d;
      let next: Data = { ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) };
      const files: string[] = [];
      if (key === "sites") {
        // a site takes everything on it along
        const keep = <T extends { siteId: string }>(l: T[]) => l.filter((x) => x.siteId !== id);
        for (const x of d.points.filter((y) => y.siteId === id)) files.push(...x.files.map((f) => f.id));
        for (const x of d.defects.filter((y) => y.siteId === id)) files.push(...[...x.files, ...(x.fixFiles ?? [])].map((f) => f.id));
        for (const r of d.reports.filter((y) => y.siteId === id)) files.push(...r.files.map((f) => f.id), ...(r.pdf ? [r.pdf.id] : []));
        next = { ...next, points: keep(d.points), defects: keep(d.defects), tasks: keep(d.tasks), entries: keep(d.entries), notes: keep(d.notes), materials: keep(d.materials), reports: keep(d.reports) };
      }
      if (key === "points") {
        // a node takes its children; defects stay but lose the link
        const ids = branchOf(d.points, id);
        for (const x of d.points.filter((p) => ids.has(p.id))) files.push(...x.files.map((f) => f.id));
        next = { ...next, points: d.points.filter((p) => !ids.has(p.id)), defects: d.defects.map((x) => (ids.has(x.pointId) ? { ...x, pointId: "" } : x)) };
      }
      if (key === "people") {
        // assignments are cleared, the person's own calendar row goes
        const un = (ids: string[]) => ids.filter((x) => x !== id);
        next = {
          ...next,
          sites: d.sites.map((x) => ({ ...x, managerId: x.managerId === id ? "" : x.managerId, memberIds: un(x.memberIds) })),
          points: d.points.map((x) => (x.assigneeIds.includes(id) ? { ...x, assigneeIds: un(x.assigneeIds) } : x)),
          defects: d.defects.map((x) => (x.ownerId === id ? { ...x, ownerId: "" } : x)),
          tasks: d.tasks.map((x) => (x.ownerId === id ? { ...x, ownerId: "" } : x)),
          orders: d.orders.map((x) => (x.techId === id ? { ...x, techId: "", status: x.status === "geplant" ? "offen" : x.status } : x)),
          entries: d.entries.filter((x) => x.rowId !== id),
          absences: d.absences.filter((x) => x.personId !== id)
        };
      }
      if (key === "defects") {
        const x = d.defects.find((y) => y.id === id);
        if (x) files.push(...[...x.files, ...(x.fixFiles ?? [])].map((f) => f.id));
      }
      if (key === "orders") {
        // an order takes its reports along
        const o = d.orders.find((y) => y.id === id);
        if (o) files.push(...o.files.map((f) => f.id));
        for (const r of d.reports.filter((y) => y.orderId === id)) files.push(...r.files.map((f) => f.id), ...(r.pdf ? [r.pdf.id] : []));
        next = { ...next, reports: d.reports.filter((r) => r.orderId !== id) };
      }
      if (key === "reports") {
        const r = d.reports.find((y) => y.id === id);
        if (r) files.push(...r.files.map((f) => f.id), ...(r.pdf ? [r.pdf.id] : []));
      }
      if (key === "entries") next = { ...next, entries: next.entries.map((e) => (e.links?.includes(id) ? { ...e, links: e.links.filter((l) => l !== id) } : e)) };
      if (files.length) void dropFiles(files);
      return next;
    });
  }, []);

  const setSiteId = useCallback((id: string) => {
    setSite(id);
    try {
      window.localStorage.setItem(SITE_KEY, id);
    } catch {
      // only for this visit
    }
  }, []);

  const view = useMemo(() => data && viewOf(data), [data]);
  const value = useMemo<Store | null>(
    () =>
      view && {
        data: view,
        save,
        remove,
        restore: (snapshot) => setData((d) => (d ? mergeHidden(snapshot, d) : snapshot)),
        setLayout: (calendar) => setData((d) => d && { ...d, calendar }),
        setMe: (meId) => setData((d) => d && { ...d, meId }),
        reset: (kind) => (setData(kind === "demo" ? createDemo() : createEmpty()), setSiteId("")),
        siteId: view.sites.some((s) => s.id === siteId) ? siteId : "",
        setSiteId,
        notify,
        toast,
        dismiss: () => setToast(null)
      },
    [view, save, remove, siteId, setSiteId, notify, toast]
  );

  if (!value) return <div className="app-boot" aria-label="Lädt" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export const personName = (data: Data, id: string) => data.people.find((p) => p.id === id)?.name ?? "";
export const siteName = (data: Data, id: string) => data.sites.find((s) => s.id === id)?.name ?? "";

/** Sites in the work lists: not archived, sorted by name. */
export const activeSites = (data: Data) => data.sites.filter((s) => s.status !== "archiviert").sort((a, b) => a.name.localeCompare(b.name, "de"));

/** Filter by the site chosen in the top bar. */
export const inSite = (siteId: string) => (x: { siteId: string }) => !siteId || x.siteId === siteId;

"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { rightsOf } from "./roles";
import { createDemo, createEmpty, DATA_VERSION, DEMO_VERSION } from "./seed";
import type { Collection, Data, Item, Workspace } from "./types";

const KEY = "vysner:data";

/** Ids that also work as Supabase uuids later. */
export function uid() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const now = () => new Date().toISOString();

type Store = {
  data: Data;
  /** creates or replaces a record; stamps who and when */
  save: <K extends Collection>(key: K, item: Item<K>, activity?: string) => void;
  /** removes a record and everything that hangs off it */
  remove: <K extends Collection>(key: K, id: string, activity?: string) => void;
  setWorkspace: (w: Workspace) => void;
  setMe: (id: string) => void;
  replaceAll: (d: Data) => void;
  reset: (kind: "demo" | "empty") => void;
  notify: (text: string) => void;
  toast: string;
};

const Ctx = createContext<Store | null>(null);

function load(): Data {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) {
      const d = JSON.parse(raw) as Data;
      // the demo company is refreshed when its content changed; own data is kept
      if (d.demo && d.demo !== DEMO_VERSION) return createDemo();
      if (d.version === DATA_VERSION) return { ...createEmpty(), ...d };
    }
  } catch {
    // storage blocked or broken: start with the demo
  }
  return createDemo();
}

/** Ids of an open point and everything below it. */
function branch(points: Data["points"], id: string) {
  const ids = new Set([id]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const p of points) if (!ids.has(p.id) && ids.has(p.parentId)) (ids.add(p.id), (grew = true));
  }
  return ids;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [toast, setToast] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const ref = useRef<Data | null>(null);
  ref.current = data;

  useEffect(() => setData(load()), []);
  useEffect(() => {
    if (!data) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(data));
    } catch {
      setToast("Speicher voll – bitte große Dateien entfernen.");
    }
  }, [data]);

  const notify = useCallback((text: string) => {
    setToast(text);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setToast(""), 2800);
  }, []);

  // the management looks at everything but changes nothing
  const blocked = useCallback(() => {
    const d = ref.current;
    if (!d || !rightsOf(d).readOnly) return false;
    notify("Nur Ansicht – deine Rolle ändert keine Daten.");
    return true;
  }, [notify]);

  const log = (d: Data, text: string | undefined, projectId: string) =>
    text ? [{ id: uid(), projectId, at: now(), by: d.meId, text }, ...d.activity].slice(0, 2000) : d.activity;

  const save = useCallback(
    <K extends Collection>(key: K, item: Item<K>, activity?: string) => {
      if (blocked()) return;
      setData((d) => {
        if (!d) return d;
        const list = d[key] as Item<K>[];
        const old = list.find((x) => x.id === item.id);
        const it = { ...(item as Record<string, unknown>) };
        if (key !== "people") {
          if (!old) {
            it.createdBy ||= d.meId;
            it.createdAt ||= now();
          } else {
            it.updatedBy = d.meId;
            it.updatedAt = now();
          }
        }
        const next = old ? list.map((x) => (x.id === item.id ? (it as Item<K>) : x)) : [...list, it as Item<K>];
        const projectId = "projectId" in it ? String(it.projectId) : key === "projects" ? String(it.id) : "";
        return { ...d, [key]: next, activity: log(d, activity, projectId) };
      });
    },
    [blocked]
  );

  const remove = useCallback(
    <K extends Collection>(key: K, id: string, activity?: string) => {
      if (blocked()) return;
      setData((d) => {
        if (!d) return d;
        const projectId = (d[key] as { id: string; projectId?: string }[]).find((x) => x.id === id)?.projectId ?? (key === "projects" ? id : "");
        let next: Data = { ...d, [key]: (d[key] as { id: string }[]).filter((x) => x.id !== id) };
        if (key === "projects") {
          // a project takes everything in it along
          const keep = <T extends { projectId: string }>(l: T[]) => l.filter((x) => x.projectId !== id);
          next = {
            ...next,
            points: keep(d.points),
            defects: keep(d.defects),
            tasks: keep(d.tasks),
            notes: keep(d.notes),
            documents: keep(d.documents),
            reports: keep(d.reports),
            jobs: keep(d.jobs),
            photos: keep(d.photos),
            materials: keep(d.materials),
            regie: keep(d.regie),
            dailies: keep(d.dailies),
            activity: keep(d.activity)
          };
        }
        if (key === "points") {
          // a point takes its sub-points; defects and photos stay but lose the link
          const ids = branch(d.points, id);
          next = {
            ...next,
            points: d.points.filter((p) => !ids.has(p.id)),
            defects: d.defects.map((x) => (ids.has(x.openPointId) ? { ...x, openPointId: "" } : x)),
            photos: d.photos.map((x) => (ids.has(x.pointId) ? { ...x, pointId: "" } : x))
          };
        }
        if (key === "people") {
          next = {
            ...next,
            projects: d.projects.map((p) => ({ ...p, memberIds: p.memberIds.filter((m) => m !== id), managerId: p.managerId === id ? "" : p.managerId })),
            points: d.points.map((p) => ({ ...p, assigneeIds: p.assigneeIds.filter((a) => a !== id) })),
            people: next.people.map((p) => (p.managerId === id ? { ...p, managerId: "" } : p)),
            jobs: d.jobs.filter((j) => j.employeeId !== id),
            absences: d.absences.filter((a) => a.employeeId !== id)
          };
        }
        return key === "projects" ? next : { ...next, activity: log(d, activity, projectId) };
      });
    },
    [blocked]
  );

  const value = useMemo<Store | null>(
    () =>
      data && {
        data,
        save,
        remove,
        setWorkspace: (workspace) => !blocked() && setData((d) => d && { ...d, workspace }),
        setMe: (meId) => setData((d) => d && { ...d, meId }),
        replaceAll: (next) => setData({ ...createEmpty(), ...next, version: DATA_VERSION }),
        reset: (kind) => setData(kind === "demo" ? createDemo() : createEmpty()),
        notify,
        toast
      },
    [data, save, remove, notify, toast, blocked]
  );

  if (!value) return <div className="tg-boot" aria-label="Lädt" />;
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useStore() {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside StoreProvider");
  return s;
}

export const personName = (data: Data, id: string) => data.people.find((p) => p.id === id)?.name ?? "";

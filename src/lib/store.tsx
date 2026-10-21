"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { rightsOf, rolleOf } from "./roles";
import { createEmpty, createSeed, DATA_VERSION, SEED_VERSION } from "./seed";
import type { AccessRole, Company, CollectionKey, Data, Item, Project } from "./types";

const STORAGE_KEY = "vysnpro:data";

type Store = {
  data: Data;
  save: <K extends CollectionKey>(key: K, item: Item<K>, activity?: string) => void;
  remove: <K extends CollectionKey>(key: K, id: string, activity?: string) => void;
  setCompany: (company: Company) => void;
  setCurrentUser: (id: string) => void;
  replaceAll: (data: Data) => void;
  /** "empty" starts a clean company with one site-management login, "demo" loads the sample company. */
  reset: (kind: "empty" | "demo") => void;
  notify: (text: string) => void;
  toast: string;
};

const StoreContext = createContext<Store | null>(null);

/** Local date-time "YYYY-MM-DDTHH:mm:ss" (not UTC – shown as is). */
export function nowStamp() {
  const d = new Date();
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
}

/** "01.10.2026, 14:32" */
export function fmtStamp(ts: string | undefined) {
  if (!ts) return "";
  const [d, t = ""] = ts.split("T");
  const [y, m, day] = d.split("-");
  return `${day}.${m}.${y}${t ? `, ${t.slice(0, 5)}` : ""}`;
}

/** Material status may only be changed by site and project management. */
export function canSetMaterialStatus(data: Data) {
  if (rightsOf(data).editSites) return true;
  const r = roleOf(currentUser(data));
  return r === "bl" || r === "pl";
}

export function uid(prefix = "") {
  return `${prefix}${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

function load(): Data {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Data;
      // an older demo firm is replaced by the current demo (own company data is never touched)
      if (parsed.company?.tenantId === "muster" && parsed.seedVersion !== SEED_VERSION) {
        const seed = createSeed();
        const keep = seed.employees.some((e) => e.id === parsed.currentUserId);
        return keep ? { ...seed, currentUserId: parsed.currentUserId } : seed;
      }
      if (parsed.version === DATA_VERSION) return { ...createEmpty(), ...parsed };
    }
  } catch {
    // Storage unavailable or corrupt: fall back to demo data.
  }
  return createEmpty();
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<Data | null>(null);
  const [toast, setToast] = useState("");
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    setData(load());
  }, []);

  useEffect(() => {
    if (!data) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      setToast("Speicher voll – bitte große Dateien entfernen.");
    }
  }, [data]);

  // a "view only" hint stays visible – success messages right after it would be misleading
  const hold = useRef(0);
  const notify = useCallback((text: string, sticky = false) => {
    if (!sticky && Date.now() < hold.current) return;
    if (sticky) hold.current = Date.now() + 1500;
    setToast(text);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 2600);
  }, []);

  const withActivity = (d: Data, text: string | undefined, projectId: string) =>
    text ? [{ id: uid("ac"), at: nowStamp(), by: d.currentUserId, text, projectId }, ...d.activity].slice(0, 1000) : d.activity;

  // Geschäftsführung looks at everything but changes nothing (own notes aside)
  const dataRef = useRef<Data | null>(null);
  dataRef.current = data;
  const readOnly = useCallback(
    (key: string) => {
      const d = dataRef.current;
      if (!d || key === "notes" || rolleOf(currentUser(d)) !== "gf") return false;
      notify("Geschäftsführung: nur Ansicht – ändern können Admin und Leitung.", true);
      return true;
    },
    [notify]
  );

  const save = useCallback(<K extends CollectionKey>(key: K, item: Item<K>, activity?: string) => {
    if (readOnly(key)) return;
    setData((d) => {
      if (!d) return d;
      const list = d[key] as Item<K>[];
      const old = list.find((x) => x.id === item.id) as Record<string, unknown> | undefined;
      const exists = !!old;
      // stamp who created / changed it and record every status change
      let stamped = item;
      if (key !== "activity") {
        const ts = nowStamp();
        const me = d.currentUserId;
        const it = { ...(item as Record<string, unknown>) };
        if (!old) {
          it.createdBy ??= me;
          it.createdTs ??= ts;
        } else {
          // forms that rebuild the entry keep its origin and history
          for (const f of ["createdBy", "createdTs", "history"]) if (it[f] === undefined && old[f] !== undefined) it[f] = old[f];
          it.updatedBy = me;
          it.updatedTs = ts;
        }
        if ("status" in it && key !== "projects" && (!old || old.status !== it.status)) {
          const hist = (Array.isArray(it.history) ? it.history : []) as { status: string; by: string; ts: string }[];
          it.history = [...hist, { status: String(it.status), by: me, ts }];
        }
        stamped = it as Item<K>;
      }
      const next = exists ? list.map((x) => (x.id === stamped.id ? stamped : x)) : [...list, stamped];
      const projectId = "projectId" in item ? String(item.projectId) : key === "projects" ? item.id : "";
      return { ...d, [key]: next, activity: withActivity(d, activity, projectId) };
    });
  }, [readOnly]);

  const remove = useCallback(<K extends CollectionKey>(key: K, id: string, activity?: string) => {
    if (readOnly(key)) return;
    setData((d) => {
      if (!d) return d;
      const next: Data = { ...d, [key]: (d[key] as Item<K>[]).filter((x) => x.id !== id), activity: withActivity(d, activity, "") };
      // Cascade: removing a project or resource removes what hangs off it.
      if (key === "projects") {
        for (const k of ["issues", "reports", "regie", "materials", "times", "plans", "siteNodes", "photos", "jobs", "folders", "files"] as const) {
          (next as Record<string, unknown>)[k] = (next[k] as { projectId: string }[]).filter((x) => x.projectId !== id);
        }
      }
      if (key === "siteNodes") {
        // Removing an area removes everything below it and its photos; defects stay but lose the link.
        const ids = new Set([id]);
        for (let grew = true; grew; ) {
          grew = false;
          for (const n of d.siteNodes) if (!ids.has(n.id) && ids.has(n.parentId)) (ids.add(n.id), (grew = true));
        }
        next.siteNodes = d.siteNodes.filter((n) => !ids.has(n.id));
        next.photos = d.photos.filter((p) => !ids.has(p.nodeId));
        next.issues = d.issues.map((i) => (i.nodeId && ids.has(i.nodeId) ? { ...i, nodeId: "" } : i));
        next.jobs = d.jobs.map((j) => (j.nodeId && ids.has(j.nodeId) ? { ...j, nodeId: "" } : j));
      }
      if (key === "employees") {
        next.projects = next.projects.map((p) => (p.members.includes(id) ? { ...p, members: p.members.filter((m) => m !== id) } : p));
        next.notes = next.notes.filter((n) => n.ownerId !== id);
        next.absences = next.absences.filter((a) => a.employeeId !== id);
        next.jobs = next.jobs.filter((j) => j.employeeId !== id);
      }
      return next;
    });
  }, [readOnly]);

  const value = useMemo<Store | null>(
    () =>
      data && {
        data,
        save,
        remove,
        setCompany: (company) => !readOnly("company") && setData((d) => d && { ...d, company }),
        setCurrentUser: (id) => setData((d) => d && { ...d, currentUserId: id }),
        replaceAll: (next) => setData({ ...createEmpty(), ...next, version: DATA_VERSION }),
        reset: (kind) =>
          setData((old) => {
            if (kind === "empty") return createEmpty();
            // keep the viewer in the same role when switching to the demo firm
            const seed = createSeed();
            const role = old ? rolleOf(currentUser(old)) : "teamleiter";
            const same = seed.employees.find((e) => rolleOf(e) === role);
            return same ? { ...seed, currentUserId: same.id } : seed;
          }),
        notify,
        toast
      },
    [data, save, remove, notify, toast, readOnly]
  );

  if (!value) {
    return (
      <div className="boot">
        <div className="boot-spinner" />
      </div>
    );
  }

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error("useStore must be used inside StoreProvider");
  return store;
}

export function employeeName(data: Data, id: string) {
  return data.employees.find((e) => e.id === id)?.name ?? "–";
}

export function currentUser(data: Data) {
  return data.employees.find((e) => e.id === data.currentUserId) ?? data.employees[0];
}

/** Projects are private: only the creator and invited members see them – unless the role sees every site. */
export function myProjects(data: Data, userId = data.currentUserId, withDone = false) {
  const all = rightsOf(data, userId).allSites;
  return data.projects.filter((p) => (withDone || p.status !== "abgeschlossen") && (all || isMember(p, userId)));
}

export function isMember(p: Project, userId: string) {
  return p.createdBy === userId || p.members.includes(userId);
}

/** Everybody on a project: creator first, then the invited members. */
export function projectTeam(data: Data, p: Project) {
  const ids = [p.createdBy, ...p.members.filter((m) => m !== p.createdBy)];
  return ids.map((id) => data.employees.find((e) => e.id === id)).filter((e): e is NonNullable<typeof e> => !!e);
}

export type Role = AccessRole;

export const roleLabel: Record<Role, string> = {
  admin: "Admin",
  buero: "Büro",
  pl: "Projektleitung",
  bl: "Bauleitung",
  mk: "Montagekoordination",
  monteur: "Monteur"
};

/** Role derived from the job title until real roles come with the login. */
export function roleOf(e: { role: string; access?: Role } | undefined): Role {
  if (e?.access) return e.access;
  const r = (e?.role ?? "").toLowerCase();
  if (r.includes("projektleit")) return "pl";
  if (r.includes("bauleit")) return "bl";
  if (r.includes("koordinat")) return "mk";
  if (r.includes("geschäftsf") || r.includes("admin")) return "admin";
  if (r.includes("büro") || r.includes("buero") || r.includes("office")) return "buero";
  return "monteur";
}

/** Only those who change sites may delete; workers add and tick off. */
export function canDelete(data: Data) {
  return rightsOf(data).editSites;
}

/** Who may release Regieberichte (and later hours). */
export function canRelease(data: Data) {
  return rightsOf(data).editSites;
}

/** People that can be put on a site. */
export function plannable(data: Data) {
  return data.employees.filter((e) => e.active);
}

/** Everybody except workers may create projects, invite people and manage the team. */
export function isManager(data: Data) {
  return rightsOf(data).editSites;
}

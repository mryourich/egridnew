"use client";

import { ArrowLeft, Building2, ChevronDown, ClipboardList, FileText, FolderKanban, LayoutDashboard, ListTree, LogOut, Menu as MenuIcon, NotebookPen, Search, Settings, TriangleAlert, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { visibleProjects } from "@/teamgrid/model";
import { OfflineSupport } from "./offline";
import { byRole, me, ROLLE_LABEL, ROLLEN, rightsOf } from "./roles";
import { StoreProvider, useStore } from "./store";
import { Avatar } from "./ui";
import "./app.css";

/** Pages inside a project – the project menu in the sidebar. */
export const PROJECT_TABS = [
  { key: "", label: "Übersicht", icon: LayoutDashboard },
  { key: "punkte", label: "Offene Punkte", icon: ListTree },
  { key: "maengel", label: "Mängel", icon: TriangleAlert },
  { key: "aufgaben", label: "Aufgaben", icon: ClipboardList },
  { key: "notizen", label: "Notizen", icon: NotebookPen },
  { key: "dokumente", label: "Dokumente", icon: FileText },
  { key: "berichte", label: "Berichte", icon: FileText },
  { key: "einstellungen", label: "Projekt-Einstellungen", icon: Settings }
] as const;

export function Hub({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Frame>{children}</Frame>
    </StoreProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const path = usePathname();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [path]);
  const parts = path.split("/").filter(Boolean);
  const projectId = parts[0] === "projekte" && parts[1] && parts[1] !== "neu" ? parts[1] : "";
  const project = projectId ? data.projects.find((p) => p.id === projectId) : undefined;
  const tab = parts[2] ?? "";

  return (
    <div className={`hub ${open ? "nav-open" : ""}`}>
      <aside className="hub-side">
        <Link href="/projekte" className="hub-brand" aria-label="VYSNER">
          <img src="/brand/vysner-mark-small.png" alt="" />
          <img src="/brand/vysner-word.png" alt="VYSNER" className="hub-word" />
        </Link>
        <div className="hub-module">
          <span>Modul</span>
          <strong>TeamGrid</strong>
        </div>
        {project ? (
          <nav className="hub-nav" aria-label="Projekt">
            <Link href="/projekte" className="hub-back">
              <ArrowLeft size={14} /> Alle Projekte
            </Link>
            <div className="hub-project">
              <i style={{ background: project.color }} />
              <span>
                <strong>{project.name}</strong>
                <small>{[project.number, project.client].filter(Boolean).join(" · ")}</small>
              </span>
            </div>
            {PROJECT_TABS.map((t) => (
              <Link key={t.key} href={`/projekte/${project.id}${t.key ? `/${t.key}` : ""}`} className={tab === t.key ? "on" : ""}>
                <t.icon size={16} />
                {t.label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="hub-nav" aria-label="TeamGrid">
            <Link href="/projekte" className={parts[0] === "projekte" ? "on" : ""}>
              <FolderKanban size={16} /> Projekte
            </Link>
            <ProjectShortcuts />
          </nav>
        )}
        <div className="hub-side-foot">
          {rightsOf(data).admin && (
            <Link href="/einstellungen" className={parts[0] === "einstellungen" ? "on" : ""}>
              <Building2 size={16} /> Firma & Benutzer
            </Link>
          )}
        </div>
      </aside>

      <div className="hub-main">
        <header className="hub-top">
          <button type="button" className="hub-burger" onClick={() => setOpen((o) => !o)} aria-label="Menü">
            {open ? <X size={20} /> : <MenuIcon size={20} />}
          </button>
          <QuickFind />
          <span className="hub-grow" />
          <UserMenu />
        </header>
        <main className="hub-content">{children}</main>
      </div>
      {open && <div className="hub-scrim" onClick={() => setOpen(false)} />}
      {toast && <div className="hub-toast" role="status">{toast}</div>}
      <OfflineSupport />
    </div>
  );
}

/** The five most recent projects, one click away. */
function ProjectShortcuts() {
  const { data } = useStore();
  const list = visibleProjects(data).slice(0, 8);
  if (!list.length) return null;
  return (
    <div className="hub-shortcuts">
      <span className="hub-label">Meine Projekte</span>
      {list.map((p) => (
        <Link key={p.id} href={`/projekte/${p.id}`}>
          <i style={{ background: p.color }} />
          {p.name}
        </Link>
      ))}
    </div>
  );
}

/** Search across projects, points and defects (Ctrl+K). */
function QuickFind() {
  const { data } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, []);
  const term = q.trim().toLowerCase();
  const projects = visibleProjects(data);
  const ids = new Set(projects.map((p) => p.id));
  const name = (id: string) => projects.find((p) => p.id === id)?.name ?? "";
  const hits = term.length < 2 ? [] : [
    ...projects.filter((p) => `${p.name} ${p.client} ${p.number} ${p.location}`.toLowerCase().includes(term)).map((p) => ({ key: p.id, label: p.name, sub: `Projekt · ${p.client}`, href: `/projekte/${p.id}` })),
    ...data.points.filter((p) => ids.has(p.projectId) && p.title.toLowerCase().includes(term)).map((p) => ({ key: p.id, label: p.title, sub: `Offener Punkt · ${name(p.projectId)}`, href: `/projekte/${p.projectId}/punkte?punkt=${p.id}` })),
    ...data.defects.filter((d) => ids.has(d.projectId) && `${d.title} ${d.location}`.toLowerCase().includes(term)).map((d) => ({ key: d.id, label: d.title, sub: `Mangel · ${name(d.projectId)}`, href: `/projekte/${d.projectId}/maengel?mangel=${d.id}` }))
  ].slice(0, 9);
  return (
    <div className="hub-find">
      <Search size={15} />
      <input
        ref={input}
        value={q}
        onChange={(e) => (setQ(e.target.value), setOpen(true))}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && hits[0]) (router.push(hits[0].href), setQ(""), input.current?.blur());
          if (e.key === "Escape") (setQ(""), input.current?.blur());
        }}
        placeholder="Projekt, Punkt oder Mangel suchen…"
        aria-label="Suchen"
      />
      <kbd>Strg K</kbd>
      {open && term.length >= 2 && (
        <div className="hub-find-pop">
          {hits.length === 0 && <p>Nichts gefunden.</p>}
          {hits.map((h) => (
            <Link key={h.key} href={h.href} onClick={() => setQ("")}>
              <strong>{h.label}</strong>
              <small>{h.sub}</small>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

/** Who is signed in – until the real login: switch the person (demo). */
function UserMenu() {
  const { data, setMe, notify } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const user = me(data);
  if (!user) return null;
  const people = data.people.filter((p) => p.active).sort(byRole);
  return (
    <div className="hub-user" ref={box}>
      <button type="button" className="hub-user-btn" onClick={() => setOpen((o) => !o)}>
        <Avatar id={user.id} size={30} />
        <span>
          <strong>{user.name}</strong>
          <small>{ROLLE_LABEL[user.rolle]}</small>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="hub-user-pop">
          <p className="hub-label">{data.workspace.name}</p>
          <p className="hub-label">Anmelden als (Demo)</p>
          <div className="hub-user-list">
            {ROLLEN.map((r) => {
              const list = people.filter((p) => p.rolle === r);
              if (!list.length) return null;
              return (
                <div key={r}>
                  <small>{ROLLE_LABEL[r]}</small>
                  {list.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={p.id === user.id ? "on" : ""}
                      onClick={() => {
                        setMe(p.id);
                        setOpen(false);
                        notify(`Angemeldet als ${p.name}`);
                      }}
                    >
                      {p.name}
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
          <Link href="/" className="hub-user-out">
            <LogOut size={14} /> Zur Website
          </Link>
        </div>
      )}
    </div>
  );
}

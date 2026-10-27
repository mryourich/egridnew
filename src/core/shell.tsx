"use client";

import { ArrowLeft, Bell, ChevronDown, FolderKanban, HelpCircle, LayoutGrid, LogOut, Menu as MenuIcon, Plus, Search, X } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import { ProgressSidebar } from "@/teamgrid/open-points";
import { visibleProjects } from "@/teamgrid/model";
import { fmtWhen } from "./format";
import { locate, MODULES, type ModuleNavItem, type SubNavItem } from "./modules";
import { OfflineSupport } from "./offline";
import { byRole, isField, me, rightsOf, ROLLE_LABEL, ROLLEN } from "./roles";
import { personName, StoreProvider, useStore } from "./store";
import type { Data } from "./types";
import { Avatar } from "./ui";
import "./app.css";
import "./egrid.css";
import "./egrid-extra.css";
import "@/teamgrid/teamgrid.css";

export function Hub({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Suspense>
        <Frame>{children}</Frame>
      </Suspense>
    </StoreProvider>
  );
}

/** Which modules someone may open. */
export function modulesFor(data: Data) {
  const r = rightsOf(data);
  return MODULES.filter((m) => (m.key === "people" ? r.teamView : m.key === "settings" ? r.admin : true));
}

/** Sub pages of a module for the signed-in person. */
export function subItemsFor(data: Data, m: ModuleNavItem) {
  return m.subItems.filter((s) => !s.office || !isField(data));
}

const hrefOf = (m: ModuleNavItem, s: SubNavItem, projectId = "") => (m.key === "site" ? `/projekte/${projectId}${s.key ? `/${s.key}` : ""}` : `${m.path}${s.key ? `/${s.key}` : ""}`);

/** The eGrid frame: platform menu ↔ module menu on the left, search, notifications and user on top. */
function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const path = usePathname();
  const params = useSearchParams();
  const router = useRouter();
  const { module, sub, projectId } = locate(path);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [platform, setPlatform] = useState(!module);
  const [siteMenu, setSiteMenu] = useState(false);
  useEffect(() => {
    setMobileOpen(false);
    setPlatform(!module);
    setSiteMenu(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);
  const project = projectId ? data.projects.find((p) => p.id === projectId) : undefined;
  const progressMode = module?.key === "site" && !!project && sub === "punkte" && !siteMenu;

  return (
    <div className="app-frame">
      <aside className={`sidebar ${mobileOpen ? "open" : ""}`}>
        <div className="brand-row">
          <Link href="/start" className="brand-link" aria-label="VYSNER Start">
            <img src="/brand/vysner-icon.png" width={36} height={36} alt="" />
            <strong>VYSNER</strong>
          </Link>
          <button className="icon-button sidebar-close" type="button" aria-label="Menü schließen" onClick={() => setMobileOpen(false)}>
            <X size={18} />
          </button>
        </div>

        {platform || !module ? (
          <PlatformMenu active={module} />
        ) : (
          <>
            <button className="sidebar-back" type="button" onClick={() => (progressMode ? setSiteMenu(true) : setPlatform(true))}>
              <span>
                <ArrowLeft size={15} />
              </span>
              {progressMode ? "SiteManager-Menü" : "Plattform-Menü"}
            </button>
            {module.key === "site" ? (
              project ? (
                progressMode ? (
                  <ProgressSidebar project={project} />
                ) : (
                  <>
                    <ProjectContextCard name={project.name} onChange={() => router.push("/projekte")} />
                    <ModuleSubnav module={module} items={subItemsFor(data, module)} activeKey={sub} hrefOf={(s) => hrefOf(module, s, project.id)} />
                  </>
                )
              ) : (
                <>
                  <ActiveModuleCard module={module} />
                  <ProjectSidebarList />
                </>
              )
            ) : (
              <>
                <ActiveModuleCard module={module} />
                <ModuleSubnav module={module} items={subItemsFor(data, module)} activeKey={sub} hrefOf={(s) => hrefOf(module, s)} />
              </>
            )}
          </>
        )}
      </aside>
      {mobileOpen && <div className="sidebar-scrim" onClick={() => setMobileOpen(false)} />}

      <main className="main-shell">
        <header className="topbar">
          <button className="icon-button menu-button" type="button" aria-label="Menü öffnen" onClick={() => setMobileOpen(true)}>
            <MenuIcon size={20} />
          </button>
          <QuickFind />
          <div className="topbar-actions">
            <Link className="icon-button" href="/start" aria-label="Alle Apps" title="Alle Apps">
              <LayoutGrid size={19} />
            </Link>
            <Notifications />
            <Link className="icon-button" href="/start#hilfe" aria-label="Hilfe" title="Hilfe">
              <HelpCircle size={19} />
            </Link>
            <UserMenu />
          </div>
        </header>
        <section className="page-content" data-tab={params.get("tab") ?? undefined}>
          {children}
        </section>
      </main>
      {toast && (
        <div className="hub-toast" role="status">
          {toast}
        </div>
      )}
      <OfflineSupport />
    </div>
  );
}

function PlatformMenu({ active }: { active?: ModuleNavItem }) {
  const { data } = useStore();
  return (
    <section className="platform-menu">
      <div className="sidebar-section-label">Plattform-Menü</div>
      <nav className="platform-module-list" aria-label="Plattform-Menü">
        {modulesFor(data).map((m) => (
          <Link key={m.key} href={m.path} className={m.key === active?.key ? "active" : ""}>
            <span className="menu-icon">
              <m.icon size={15} />
            </span>
            <span>
              <strong>{m.label}</strong>
              <small>{m.soon ? "Bald verfügbar" : m.summary}</small>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

function ActiveModuleCard({ module }: { module: ModuleNavItem }) {
  return (
    <div className="active-module-card">
      <span className="menu-icon">
        <module.icon size={15} />
      </span>
      <span>
        <strong>{module.label}</strong>
        <small>{module.summary}</small>
      </span>
    </div>
  );
}

function ProjectContextCard({ name, onChange }: { name: string; onChange: () => void }) {
  return (
    <button className="active-module-card project-context-card" type="button" onClick={onChange}>
      <span className="menu-icon">
        <FolderKanban size={15} />
      </span>
      <span>
        <strong>{name}</strong>
        <small>Projekt wechseln</small>
      </span>
    </button>
  );
}

function ModuleSubnav({ module, items, activeKey, hrefOf }: { module: ModuleNavItem; items: SubNavItem[]; activeKey: string; hrefOf: (s: SubNavItem) => string }) {
  return (
    <section className="module-subnav-panel" aria-label={`${module.label} Untermenü`}>
      <div className="subnav-header">
        <span>Untermenü</span>
        <strong>{module.label}</strong>
      </div>
      <nav className="module-subnav">
        {items.map((item) => (
          <Link key={item.key} href={hrefOf(item)} aria-current={activeKey === item.key ? "page" : undefined} className={activeKey === item.key ? "active" : ""}>
            <item.icon size={16} />
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
          </Link>
        ))}
      </nav>
    </section>
  );
}

function ProjectSidebarList() {
  const { data } = useStore();
  const list = visibleProjects(data);
  return (
    <section className="module-subnav-panel project-picker-panel" aria-label="SiteManager Projekte">
      <div className="subnav-header">
        <span>Projekt</span>
        <strong>Projekte</strong>
      </div>
      <nav className="module-subnav project-picker-nav">
        {list.map((p) => (
          <Link key={p.id} href={`/projekte/${p.id}`}>
            <FolderKanban size={16} style={{ color: p.color }} />
            <span>
              <strong>{p.name}</strong>
              <small>{p.location || p.client}</small>
            </span>
          </Link>
        ))}
        {rightsOf(data).create && (
          <Link className="project-create-link" href="/projekte?neu=1">
            <Plus size={16} />
            <span>
              <strong>Projekt anlegen</strong>
              <small>Neues SiteManager-Projekt</small>
            </span>
          </Link>
        )}
      </nav>
    </section>
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
  const hits =
    term.length < 2
      ? []
      : [
          ...projects.filter((p) => `${p.name} ${p.client} ${p.number} ${p.location}`.toLowerCase().includes(term)).map((p) => ({ key: p.id, label: p.name, sub: `Projekt · ${p.client}`, href: `/projekte/${p.id}` })),
          ...data.points.filter((p) => ids.has(p.projectId) && p.title.toLowerCase().includes(term)).map((p) => ({ key: p.id, label: p.title, sub: `Open Point · ${name(p.projectId)}`, href: `/projekte/${p.projectId}/punkte?punkt=${p.id}` })),
          ...data.defects.filter((d) => ids.has(d.projectId) && `${d.title} ${d.location}`.toLowerCase().includes(term)).map((d) => ({ key: d.id, label: d.title, sub: `Mangel · ${name(d.projectId)}`, href: `/projekte/${d.projectId}/maengel?mangel=${d.id}` })),
          ...data.people.filter((p) => p.active && p.name.toLowerCase().includes(term) && rightsOf(data).teamView).map((p) => ({ key: p.id, label: p.name, sub: `Mitarbeiter · ${ROLLE_LABEL[p.rolle]}`, href: `/team?q=${encodeURIComponent(p.name)}` }))
        ].slice(0, 9);
  return (
    <div className="search-box">
      <Search size={18} />
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
        placeholder="Suche..."
        aria-label="Suchen"
      />
      <kbd>Ctrl K</kbd>
      {open && term.length >= 2 && (
        <div className="search-pop">
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

/** Bell: what changed lately in my projects. */
function Notifications() {
  const { data } = useStore();
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
  const ids = new Set(visibleProjects(data).map((p) => p.id));
  const list = data.activity.filter((a) => ids.has(a.projectId) && a.by !== data.meId).slice(0, 8);
  const mine = data.defects.filter((d) => d.ownerId === data.meId && d.status !== "done" && ids.has(d.projectId)).length + data.points.filter((p) => p.type === "task" && p.status !== "done" && p.assigneeIds.includes(data.meId) && ids.has(p.projectId)).length;
  return (
    <div className="topbar-pop-wrap" ref={box}>
      <button className="icon-button" type="button" aria-label="Benachrichtigungen" onClick={() => setOpen((o) => !o)}>
        <Bell size={19} />
        {mine > 0 && <span className="notification-dot">{mine > 9 ? "9+" : mine}</span>}
      </button>
      {open && (
        <div className="topbar-pop notif-pop">
          <header>
            <strong>Benachrichtigungen</strong>
            <Link href="/dashboard">{mine} offen für dich</Link>
          </header>
          {list.length === 0 ? (
            <p className="muted">Nichts Neues.</p>
          ) : (
            list.map((a) => (
              <Link key={a.id} href={`/projekte/${a.projectId}`}>
                <Avatar id={a.by} size={24} />
                <span>
                  <b>{personName(data, a.by) || "Jemand"}</b> {a.text}
                  <small>
                    {data.projects.find((p) => p.id === a.projectId)?.name} · {fmtWhen(a.at)}
                  </small>
                </span>
              </Link>
            ))
          )}
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
    <div className="topbar-pop-wrap" ref={box}>
      <button type="button" className="user-menu" onClick={() => setOpen((o) => !o)}>
        <Avatar id={user.id} size={34} />
        <span>
          <strong>{user.name}</strong>
          <small>{ROLLE_LABEL[user.rolle]}</small>
        </span>
        <ChevronDown size={15} />
      </button>
      {open && (
        <div className="topbar-pop user-pop">
          <p className="pop-label">{data.workspace.name}</p>
          <p className="pop-label">Anmelden als (Demo)</p>
          <div className="user-pop-list">
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
          <Link href="/" className="user-pop-out">
            <LogOut size={14} /> Zur Website
          </Link>
        </div>
      )}
    </div>
  );
}

"use client";

import { ChevronDown, ChevronRight, FileText, FolderKanban, Home, ListTodo, LogOut, MoreHorizontal, Plus, Search, Settings, StickyNote, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { sectionsFor, type SiteSection } from "@/lib/sections";
import { shortPath } from "@/lib/site";
import { currentUser, isManager, myProjects, roleLabel, roleOf, StoreProvider, useStore, type Role } from "@/lib/store";
import { myTasks } from "@/lib/tasks";
import { Editor, type EditorTarget } from "./editors";
import { OfflineSupport } from "./offline";
import { Avatar } from "./ui";

const EditorContext = createContext<(target: EditorTarget) => void>(() => {});

export function useEditor() {
  return useContext(EditorContext);
}

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <Frame>{children}</Frame>
    </StoreProvider>
  );
}

type Module = { href: string; label: string; icon: typeof Home; match: string[]; badge?: number; phone?: boolean };

function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const pathname = usePathname();
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const role = roleOf(currentUser(data));
  const tasks = myTasks(data).length;

  // the three things a site needs every day …
  const main: Module[] = [
    { href: "/dashboard", label: "Start", icon: Home, match: ["/dashboard"] },
    { href: "/aufgaben", label: "Aufgaben", icon: ListTodo, match: ["/aufgaben"], badge: tasks },
    { href: "/projekte", label: "Projekte", icon: FolderKanban, match: ["/projekte"] }
  ];
  // … and the rest, quietly below
  const more: Module[] = [
    { href: "/dokumente", label: "Dokumente", icon: FileText, match: ["/dokumente"] },
    { href: "/notizen", label: "Notizen", icon: StickyNote, match: ["/notizen"] },
    ...(role !== "monteur"
      ? [
          { href: "/team", label: "Mitarbeiter", icon: Users, match: ["/team"] },
          { href: "/einstellungen", label: "Einstellungen", icon: Settings, match: ["/einstellungen"] }
        ]
      : [])
  ];
  const isActive = (paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const inMore = isActive(["/mehr", ...more.flatMap((m) => m.match)]);

  return (
    <EditorContext.Provider value={setTarget}>
      <div className="shell">
        <aside className="side" aria-label="Navigation">
          <Link href="/dashboard" className="side-brand" aria-label="VYSNER Start">
            <img className="brand-mark" src="/brand/vysner-mark-small.png" alt="" />
            <img className="brand-word" src="/brand/vysner-word.png" alt="VYSNER" />
          </Link>
          <GlobalSearch />
          <nav className="side-nav" aria-label="Module">
            {main.map((m) => (
              <Link key={m.href} href={m.href} className={isActive(m.match) ? "active" : ""}>
                <m.icon size={18} />
                <span>{m.label}</span>
                {m.badge ? <em className="side-badge">{m.badge}</em> : null}
              </Link>
            ))}
          </nav>
          <ProjectNav />
          <nav className="side-more" aria-label="Weitere">
            {more.map((m) => (
              <Link key={m.href} href={m.href} className={isActive(m.match) ? "active" : ""}>
                <m.icon size={16} />
                <span>{m.label}</span>
              </Link>
            ))}
          </nav>
          <div className="side-foot">
            <UserSwitch up />
          </div>
        </aside>

        <div className="main">
          <header className="mtop">
            <Link href="/dashboard" className="side-brand" aria-label="VYSNER Start">
              <img className="brand-mark" src="/brand/vysner-mark-small.png" alt="" />
              <img className="brand-word" src="/brand/vysner-word.png" alt="VYSNER" />
            </Link>
            <span className="spacer" />
            <UserSwitch />
          </header>
          <main className="content">{children}</main>
          <nav className="tabbar" aria-label="Module">
            {main.map((m) => (
              <Link key={m.href} href={m.href} className={isActive(m.match) ? "active" : ""}>
                <m.icon size={21} />
                <span>{m.label}</span>
                {m.badge ? <em className="tab-badge">{m.badge}</em> : null}
              </Link>
            ))}
            <Link href="/mehr" className={inMore ? "active" : ""}>
              <MoreHorizontal size={21} />
              <span>Mehr</span>
            </Link>
          </nav>
        </div>

        {target && <Editor target={target} onClose={() => setTarget(null)} />}
        {toast && <div className="toast">{toast}</div>}
        <OfflineSupport />
      </div>
    </EditorContext.Provider>
  );
}

/** Phone: everything that is not one of the three main tabs. */
export function MorePage() {
  const { data } = useStore();
  const role = roleOf(currentUser(data));
  const user = currentUser(data);
  const links = [
    { href: "/dokumente", label: "Dokumente", text: "Firmenweite Ablage", icon: FileText },
    { href: "/notizen", label: "Notizen", text: "Deine Zettel", icon: StickyNote },
    ...(role !== "monteur"
      ? [
          { href: "/team", label: "Mitarbeiter", text: "Leute, Rollen, Zugänge", icon: Users },
          { href: "/einstellungen", label: "Einstellungen", text: "Firma, Vorlagen, Module", icon: Settings }
        ]
      : [])
  ];
  return (
    <div className="page more-page">
      <h1>Mehr</h1>
      <div className="search-row">
        <GlobalSearch compact />
      </div>
      <ul className="rows box">
        {links.map((l) => (
          <li key={l.href}>
            <Link href={l.href} className="prow">
              <l.icon size={18} className="more-ic" />
              <span className="row-main">
                <strong>{l.label}</strong>
                <small>{l.text}</small>
              </span>
              <ChevronRight size={16} className="prow-go" />
            </Link>
          </li>
        ))}
      </ul>
      {user && (
        <p className="more-user">
          Angemeldet als <strong>{user.name}</strong> · {roleLabel[role]}
        </p>
      )}
    </div>
  );
}

/** Search across projects, points, defects, documents and people – Ctrl/⌘ + K. */
function GlobalSearch({ compact }: { compact?: boolean }) {
  const { data } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (compact) return;
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [compact]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const term = q.trim().toLowerCase();
  const projects = myProjects(data, data.currentUserId, true);
  const mine = new Set(projects.map((p) => p.id));
  const hit = (...v: (string | undefined)[]) => v.some((x) => x?.toLowerCase().includes(term));
  type Hit = { key: string; group: string; title: string; sub: string; href: string };
  const hits: Hit[] = !term
    ? []
    : [
        ...projects.filter((p) => hit(p.name, p.code, p.client, p.location)).map((p) => ({ key: p.id, group: "Projekte", title: p.name, sub: [p.code, p.client].filter(Boolean).join(" · "), href: `/projekte/${p.id}` })),
        ...data.siteNodes
          .filter((n) => mine.has(n.projectId) && hit(n.title, n.description))
          .slice(0, 8)
          .map((n) => ({ key: n.id, group: "Punkte & Bereiche", title: n.title, sub: `${projects.find((p) => p.id === n.projectId)?.name ?? ""}${n.parentId ? ` · ${shortPath(data.siteNodes, n.parentId)}` : ""}`, href: `/projekte/${n.projectId}/struktur?punkt=${n.id}` })),
        ...data.issues
          .filter((i) => mine.has(i.projectId) && hit(i.title, i.location, i.description))
          .slice(0, 6)
          .map((i) => ({ key: i.id, group: "Mängel", title: i.title, sub: `${projects.find((p) => p.id === i.projectId)?.name ?? ""} · ${i.location}`, href: `/projekte/${i.projectId}/maengel` })),
        ...data.files
          .filter((f) => (!f.projectId || mine.has(f.projectId)) && hit(f.name))
          .slice(0, 6)
          .map((f) => ({ key: f.id, group: "Dokumente", title: f.name, sub: f.projectId ? projects.find((p) => p.id === f.projectId)?.name ?? "" : "Allgemein", href: f.projectId ? `/projekte/${f.projectId}/dokumente` : "/dokumente" })),
        ...data.employees
          .filter((e) => e.active && hit(e.name, e.role, e.team))
          .slice(0, 6)
          .map((e) => ({ key: e.id, group: "Personen", title: e.name, sub: e.role, href: roleOf(currentUser(data)) === "monteur" ? "/dashboard" : "/team" }))
      ];
  const go = (h: Hit) => {
    setOpen(false);
    setQ("");
    router.push(h.href);
  };

  return (
    <div className={`gsearch ${compact ? "compact" : ""}`} ref={box}>
      <Search size={16} />
      <input
        ref={input}
        value={q}
        onChange={(e) => (setQ(e.target.value), setSel(0), setOpen(true))}
        onFocus={() => setOpen(true)}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), setSel((x) => Math.min(hits.length - 1, x + 1)));
          if (e.key === "ArrowUp") (e.preventDefault(), setSel((x) => Math.max(0, x - 1)));
          if (e.key === "Enter" && hits[sel]) go(hits[sel]);
          if (e.key === "Escape") (setOpen(false), input.current?.blur());
        }}
        placeholder="Suchen …"
        aria-label="Suchen"
      />
      {!compact && <kbd>Strg K</kbd>}
      {open && term && (
        <div className="gsearch-results" role="listbox">
          {hits.length === 0 && <p className="gs-empty">Nichts gefunden.</p>}
          {hits.map((h, i) => (
            <Fragment key={`${h.group}-${h.key}`}>
              {(i === 0 || hits[i - 1].group !== h.group) && <span className="gs-group">{h.group}</span>}
              <button type="button" role="option" aria-selected={i === sel} className={i === sel ? "on" : ""} onMouseEnter={() => setSel(i)} onClick={() => go(h)}>
                <strong>{h.title}</strong>
                <small>{h.sub}</small>
              </button>
            </Fragment>
          ))}
        </div>
      )}
    </div>
  );
}

/** Demo sign-in: switch the user to see what each role sees (real login comes with Supabase). */
function UserSwitch({ up = false }: { up?: boolean }) {
  const { data, setCurrentUser, notify } = useStore();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const user = currentUser(data);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  if (!user) return null;
  return (
    <div className={`quick-create ${up ? "menu-up" : ""}`} ref={ref}>
      <button type="button" className="topbar-user" onClick={() => setOpen((o) => !o)} title="Benutzer wechseln (Demo)">
        <Avatar name={user.name} photo={user.photo} size={28} />
        <span>
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </span>
      </button>
      {open && (
        <div className="menu user-menu">
          <div className="user-card">
            <Avatar name={user.name} photo={user.photo} size={36} />
            <span>
              <strong>{user.name}</strong>
              <small>
                {user.role} · {roleLabel[roleOf(user)]}
              </small>
            </span>
          </div>
          <Link href="/einstellungen" className="menu-link" onClick={() => setOpen(false)}>
            <Settings size={15} /> Einstellungen
          </Link>
          {roleOf(user) !== "monteur" && (
            <Link href="/team" className="menu-link" onClick={() => setOpen(false)}>
              <Users size={15} /> Mitarbeiter verwalten
            </Link>
          )}
          <small className="menu-title">
            <LogOut size={12} /> Anmelden als (Demo)
          </small>
          {data.employees.filter((e) => e.active).length < 2 && <p className="menu-hint">Lege unter „Mitarbeiter verwalten“ Mitarbeiter mit Rechten an – dann kannst du hier in ihre Rolle wechseln.</p>}
          {(["admin", "pl", "bl", "mk", "buero", "monteur"] as Role[])
            .filter((r) => data.employees.some((e) => e.active && roleOf(e) === r))
            .map((r) => (
            <div key={r} className="menu-group">
              <span>{roleLabel[r]}</span>
              {data.employees
                .filter((e) => e.active && roleOf(e) === r)
                .map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    className={e.id === user.id ? "on" : ""}
                    onClick={() => {
                      setCurrentUser(e.id);
                      setOpen(false);
                      notify(`Angemeldet als ${e.name}`);
                    }}
                  >
                    {e.name}
                  </button>
                ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/** Sidebar: my projects as a calm list. */
function ProjectNav() {
  const { data } = useStore();
  const pathname = usePathname();
  const openEditor = useContext(EditorContext);
  const sites = myProjects(data);
  const [, base, siteId] = pathname.split("/");
  const openId = base === "projekte" ? siteId : "";
  return (
    <div className="side-projects">
      <span className="side-label">
        Meine Projekte
        {isManager(data) && (
          <button type="button" className="side-add" onClick={() => openEditor({ kind: "project" })} aria-label="Neues Projekt" title="Neues Projekt">
            <Plus size={14} />
          </button>
        )}
      </span>
      {sites.length === 0 && <span className="side-empty">Noch keine Projekte</span>}
      {sites.map((p) => (
        <Link key={p.id} href={`/projekte/${p.id}`} className={`sp-row ${p.id === openId ? "active" : ""}`} title={p.name}>
          <i style={{ background: p.color }} />
          <span>{p.name}</span>
        </Link>
      ))}
    </div>
  );
}

/** The sections people use every day are tabs; the rest sits behind „Mehr“. */
const PRIMARY: SiteSection[] = ["uebersicht", "struktur", "maengel", "fotos", "plaene"];

export function ProjectTabs({ projectId }: { projectId: string }) {
  const { data } = useStore();
  const pathname = usePathname();
  const role = roleOf(currentUser(data));
  const section = pathname.split("/")[3];
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  useEffect(() => setOpen(false), [pathname]);
  const all = sectionsFor(data, role);
  const tabs = all.filter((s) => PRIMARY.includes(s.key));
  const rest = all.filter((s) => !PRIMARY.includes(s.key));
  const activeRest = rest.find((s) => s.key === section);
  return (
    <nav className="ptabs" aria-label="Bereiche">
      {tabs.map((s) => (
        <Link key={s.key} href={`/projekte/${projectId}/${s.key}`} className={section === s.key ? "active" : ""}>
          {s.label}
        </Link>
      ))}
      {rest.length > 0 && (
        <div className="ptabs-more" ref={box}>
          <button type="button" className={activeRest ? "active" : ""} onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {activeRest ? activeRest.label : "Mehr"} <ChevronDown size={14} />
          </button>
          {open && (
            <div className="menu ptabs-menu">
              {rest.map((s) => (
                <Link key={s.key} href={`/projekte/${projectId}/${s.key}`} className={`menu-link ${section === s.key ? "on" : ""}`}>
                  {s.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </nav>
  );
}

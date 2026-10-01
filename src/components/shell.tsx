"use client";

import { AlertTriangle, Bell, CalendarRange, Camera, ClipboardList, Clock, FileText, FolderKanban, FolderOpen, Home, LayoutDashboard, ListChecks, ListTodo, LogOut, Package, Plus, Search, Settings, StickyNote, Users } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createContext, Fragment, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { siteSections } from "@/lib/sections";
import { shortPath } from "@/lib/site";
import { currentUser, employeeName, fmtStamp, isManager, myProjects, roleLabel, roleOf, StoreProvider, useStore, type Role } from "@/lib/store";
import { myTasks } from "@/lib/tasks";
import { Editor, type EditorTarget } from "./editors";
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

type Module = { href: string; label: string; icon: typeof Home; match: string[]; roles: Role[]; badge?: number };

function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const pathname = usePathname();
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const role = roleOf(currentUser(data));
  const tasks = myTasks(data).length;
  const everyone: Role[] = ["pl", "bl", "mk", "monteur"];

  const modules: Module[] = (
    [
      { href: "/dashboard", label: role === "monteur" ? "Heute" : "Dashboard", icon: Home, match: ["/dashboard"], roles: everyone },
      { href: "/aufgaben", label: "Meine Aufgaben", icon: ListTodo, match: ["/aufgaben"], roles: everyone, badge: tasks },
      { href: "/projekte", label: "Projekte", icon: FolderKanban, match: ["/projekte"], roles: everyone },
      { href: "/dokumente", label: "Dokumente", icon: FileText, match: ["/dokumente"], roles: everyone },
      { href: "/notizen", label: "Notizen", icon: StickyNote, match: ["/notizen"], roles: everyone }
    ] as Module[]
  ).filter((m) => m.roles.includes(role));
  const isActive = (paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const current = modules.find((m) => isActive(m.match));

  return (
    <EditorContext.Provider value={setTarget}>
      <div className="shell">
        <aside className="side" aria-label="Navigation">
          <Link href="/dashboard" className="side-brand" aria-label="VYSNER Start">
            <img className="brand-mark" src="/brand/vysner-mark-small.png" alt="" />
            <img className="brand-word" src="/brand/vysner-word.png" alt="VYSNER" />
          </Link>
          <nav className="side-nav" aria-label="Module">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} className={current === m ? "active" : ""}>
                <m.icon size={18} />
                <span>{m.label}</span>
                {m.badge ? <em className="side-badge">{m.badge}</em> : null}
              </Link>
            ))}
          </nav>
          <ProjectNav />
          <div className="side-foot">
            {role !== "monteur" && (
              <Link href="/einstellungen" className={`side-link ${isActive(["/einstellungen", "/team"]) ? "active" : ""}`}>
                <Settings size={18} />
                <span>Einstellungen</span>
              </Link>
            )}
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
            <GlobalSearch compact />
            <Notifications />
            <UserSwitch />
          </header>
          <header className="topbar-v">
            <GlobalSearch />
            <span className="spacer" />
            <Notifications />
            <UserSwitch />
          </header>
          <main className="content">{children}</main>
          <nav className="tabbar" aria-label="Module">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} className={current === m ? "active" : ""}>
                <m.icon size={20} />
                <span>{m.href === "/aufgaben" ? "Aufgaben" : m.label}</span>
                {m.badge ? <em className="tab-badge">{m.badge}</em> : null}
              </Link>
            ))}
          </nav>
        </div>

        {target && <Editor target={target} onClose={() => setTarget(null)} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </EditorContext.Provider>
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
        placeholder={compact ? "Suchen …" : "Projekte, Punkte, Mängel, Dokumente suchen …"}
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

const SEEN_KEY = "vysner:benachrichtigungen-gelesen";

/** Bell with what happened in my projects since I last looked. */
function Notifications() {
  const { data } = useStore();
  const [open, setOpen] = useState(false);
  const [seen, setSeen] = useState("");
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    try {
      setSeen(window.localStorage.getItem(`${SEEN_KEY}:${data.currentUserId}`) ?? "");
    } catch {
      setSeen("");
    }
  }, [data.currentUserId]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const mine = new Set(myProjects(data).map((p) => p.id));
  const feed = data.activity.filter((a) => mine.has(a.projectId) && a.by !== data.currentUserId).slice(0, 15);
  const unread = feed.filter((a) => a.at > seen).length;
  const markRead = () => {
    const now = feed[0]?.at ?? "";
    setSeen(now);
    try {
      window.localStorage.setItem(`${SEEN_KEY}:${data.currentUserId}`, now);
    } catch {
      // private mode – fine
    }
  };
  return (
    <div className="notif" ref={box}>
      <button type="button" className="icon-btn notif-btn" aria-label={`Benachrichtigungen${unread ? ` (${unread} neu)` : ""}`} onClick={() => setOpen((o) => !o)}>
        <Bell size={18} />
        {unread > 0 && <i>{unread > 9 ? "9+" : unread}</i>}
      </button>
      {open && (
        <div className="notif-pop">
          <header>
            <strong>Benachrichtigungen</strong>
            {unread > 0 && (
              <button type="button" className="link-btn" onClick={markRead}>
                Alle gelesen
              </button>
            )}
          </header>
          {feed.length === 0 && <p className="gs-empty">Noch nichts Neues.</p>}
          {feed.map((a) => (
            <Link key={a.id} href={`/projekte/${a.projectId}`} className={a.at > seen ? "new" : ""} onClick={() => setOpen(false)}>
              {a.by ? <Avatar name={employeeName(data, a.by)} photo={data.employees.find((e) => e.id === a.by)?.photo} size={28} /> : <span className="notif-dot" />}
              <span>
                <strong>{a.text}</strong>
                <small>
                  {a.by ? `${employeeName(data, a.by)} · ` : ""}
                  {fmtStamp(a.at)}
                </small>
              </span>
            </Link>
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
          {(["pl", "bl", "mk", "monteur"] as Role[])
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

const SECTION_ICONS: Record<string, typeof Home> = {
  plan: CalendarRange,
  struktur: ListChecks,
  fotos: Camera,
  maengel: AlertTriangle,
  material: Package,
  berichte: ClipboardList,
  dokumente: FolderOpen,
  uebersicht: LayoutDashboard,
  zeiten: Clock
};

/** Sidebar: my projects with their picture. */
function ProjectNav() {
  const { data } = useStore();
  const pathname = usePathname();
  const openEditor = useContext(EditorContext);
  const sites = myProjects(data);
  const [, base, siteId] = pathname.split("/");
  const openId = base === "projekte" ? siteId : "";
  return (
    <div className="side-projects">
      <span className="side-label">Meine Projekte</span>
      {sites.length === 0 && <span className="side-empty">Noch keine Projekte</span>}
      {sites.map((p) => (
        <Link key={p.id} href={`/projekte/${p.id}`} className={`sp-card ${p.id === openId ? "active" : ""}`} title={p.name}>
          {p.image ? <img src={p.image} alt="" /> : <i style={{ background: p.color }}>{p.name.slice(0, 1)}</i>}
          <span>
            <strong>{p.name}</strong>
            <small>{p.code}</small>
          </span>
        </Link>
      ))}
      {isManager(data) && (
        <button type="button" className="sp-new" onClick={() => openEditor({ kind: "project" })}>
          <Plus size={15} /> Neues Projekt
        </button>
      )}
    </div>
  );
}

/** Section tabs of a project, across the top of the project page. */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const { data } = useStore();
  const pathname = usePathname();
  const role = roleOf(currentUser(data));
  const section = pathname.split("/")[3];
  return (
    <nav className="proj-tabs" aria-label="Bereiche">
      {siteSections
        .filter((s) => s.roles.includes(role))
        .map((s) => {
          const Icon = SECTION_ICONS[s.key];
          return (
            <Link key={s.key} href={`/projekte/${projectId}/${s.key}`} className={section === s.key ? "active" : ""}>
              <Icon size={16} />
              {s.label}
            </Link>
          );
        })}
    </nav>
  );
}

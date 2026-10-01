"use client";

import { AlertTriangle, CalendarRange, Clock, Camera, ClipboardList, FileText, FolderKanban, Eye, EyeOff, FolderOpen, Home, LayoutDashboard, ListChecks, LogOut, Package, Settings, StickyNote, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { siteSections } from "@/lib/sections";
import { currentUser, myProjects, roleLabel, roleOf, StoreProvider, useStore, type Role } from "@/lib/store";
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

type NavItem = { href: string; label: string; badge?: number };
type Module = { href: string; label: string; short?: string; match: string[]; sub?: NavItem[] };

function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const pathname = usePathname();
  const [target, setTarget] = useState<EditorTarget | null>(null);
  const role = roleOf(currentUser(data));

  const all: (Module & { icon: typeof Home; roles: Role[] })[] = [
    { href: "/dashboard", label: role === "monteur" ? "Heute" : "Start", icon: Home, match: ["/dashboard"], roles: ["pl", "bl", "mk", "monteur"] },
    { href: "/projekte", label: "Projekte", icon: FolderKanban, match: ["/projekte"], roles: ["pl", "bl", "mk", "monteur"] },
    { href: "/notizen", label: "Notizen", icon: StickyNote, match: ["/notizen"], roles: ["pl", "bl", "mk", "monteur"] },
    { href: "/dokumente", label: "Dokumente", icon: FileText, match: ["/dokumente"], roles: ["pl", "bl", "mk", "monteur"] }
  ];
  const modules = all.filter((m) => m.roles.includes(role));
  const isActive = (paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const current = modules.find((m) => isActive(m.match));

  return (
    <EditorContext.Provider value={setTarget}>
      <div className="shell">
        <aside className="side" aria-label="Navigation">
          <Link href="/dashboard" className="side-brand" aria-label="VYSNER Start">
            <span className="brand-tile">
              <img src="/brand/vysner-mark-small.png" alt="" />
            </span>
            <span className="brand-words">
              <img className="brand-word" src="/brand/vysner-word.png" alt="VYSNER" />
            </span>
          </Link>
          <nav className="side-nav" aria-label="Module">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} className={current === m ? "active" : ""}>
                <m.icon size={18} />
                <span>{m.label}</span>
              </Link>
            ))}
          </nav>
          <ProjectNav role={role} />
          <div className="side-foot">
            <span className="side-company">{data.company.name}</span>
            <UserSwitch up />
          </div>
        </aside>

        <div className="main">
          <header className="mtop">
            <Link href="/dashboard" className="side-brand" aria-label="VYSNER Start">
              <span className="brand-tile">
                <img src="/brand/vysner-mark-small.png" alt="" />
              </span>
              <span className="brand-words">
                <img className="brand-word" src="/brand/vysner-word.png" alt="VYSNER" />
              </span>
            </Link>
            <span className="spacer" />
            <UserSwitch />
          </header>
          <main className="content">{children}</main>
          <nav className="tabbar" aria-label="Module">
            {modules.map((m) => (
              <Link key={m.href} href={m.href} className={current === m ? "active" : ""}>
                <m.icon size={20} />
                <span>{m.short ?? m.label}</span>
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

/** Sidebar: my projects; the open one unfolds into its sections. */
function ProjectNav({ role }: { role: Role }) {
  const { data, save, notify } = useStore();
  const pathname = usePathname();
  const me = data.currentUserId;
  const all = myProjects(data);
  const hidden = all.filter((p) => p.hiddenFor?.includes(me));
  const [showHidden, setShowHidden] = useState(false);
  const sites = all.filter((p) => showHidden || !p.hiddenFor?.includes(me));
  const [, base, siteId, section] = pathname.split("/");
  const openId = base === "projekte" ? siteId : "";
  const toggle = (p: (typeof all)[number]) => {
    const isHidden = !!p.hiddenFor?.includes(me);
    save("projects", { ...p, hiddenFor: isHidden ? p.hiddenFor!.filter((x) => x !== me) : [...(p.hiddenFor ?? []), me] });
    notify(isHidden ? `${p.name} wird wieder angezeigt` : `${p.name} ausgeblendet`);
  };
  return (
    <div className="side-projects">
      <span className="side-label">Meine Projekte</span>
      {sites.length === 0 && <span className="side-empty">{all.length ? "Alle ausgeblendet" : "Noch keine Projekte"}</span>}
      {sites.map((p) => {
        const open = p.id === openId;
        const isHidden = !!p.hiddenFor?.includes(me);
        return (
          <div key={p.id} className={`sp ${open ? "open" : ""} ${isHidden ? "is-hidden" : ""}`}>
            <div className="sp-line">
              <Link href={`/projekte/${p.id}`} className="sp-head" title={p.name}>
                {p.image ? <img src={p.image} alt="" /> : <i style={{ background: p.color }} />}
                <span>{p.name}</span>
              </Link>
              <button type="button" className="sp-hide" title={isHidden ? "Wieder anzeigen" : "In der Seitenleiste ausblenden"} aria-label={isHidden ? `${p.name} anzeigen` : `${p.name} ausblenden`} onClick={() => toggle(p)}>
                {isHidden ? <Eye size={14} /> : <EyeOff size={14} />}
              </button>
            </div>
            {open && (
              <nav className="sp-sections" aria-label={p.name}>
                {siteSections
                  .filter((s) => s.roles.includes(role))
                  .map((s) => {
                    const Icon = SECTION_ICONS[s.key];
                    return (
                      <Link key={s.key} href={`/projekte/${p.id}/${s.key}`} className={section === s.key ? "active" : ""}>
                        <Icon size={15} />
                        <span>{s.label}</span>
                      </Link>
                    );
                  })}
              </nav>
            )}
          </div>
        );
      })}
      {hidden.length > 0 && (
        <button type="button" className="sp-more" onClick={() => setShowHidden((v) => !v)}>
          {showHidden ? "Ausgeblendete verbergen" : `${hidden.length} ausgeblendet – anzeigen`}
        </button>
      )}
    </div>
  );
}

/** Section tabs of a project for phones and tablets (the sidebar is hidden there). */
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
              <Icon size={15} />
              {s.label}
            </Link>
          );
        })}
    </nav>
  );
}

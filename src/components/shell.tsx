"use client";

import { AlertTriangle, CalendarRange, Camera, ClipboardList, FileText, FolderKanban, FolderOpen, Home, ListChecks, LogOut, Package, Settings, StickyNote, Users } from "lucide-react";
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
    { href: "/dokumente", label: "Dokumente", icon: FileText, match: ["/dokumente"], roles: ["pl", "bl", "mk", "monteur"] },
    { href: "/team", label: "Team", icon: Users, match: ["/team"], roles: ["pl", "bl", "mk"] }
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
          <small className="menu-title">
            <LogOut size={12} /> Anmelden als (Demo)
          </small>
          {data.employees.filter((e) => e.active).length < 2 && <p className="menu-hint">Lege unter „Team“ Mitarbeiter mit Rechten an – dann kannst du hier in ihre Rolle wechseln.</p>}
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
  team: Users
};

function useSectionCounts(projectId: string) {
  const { data } = useStore();
  const t = new Date().toISOString().slice(0, 10);
  const of = <T extends { projectId: string }>(list: T[]) => list.filter((x) => x.projectId === projectId);
  return {
    plan: of(data.jobs).filter((j) => !j.done && j.end >= t).length,
    struktur: of(data.siteNodes).filter((n) => n.status !== "erledigt" && !data.siteNodes.some((k) => k.parentId === n.id)).length,
    fotos: of(data.photos).length,
    maengel: of(data.issues).filter((i) => i.status !== "erledigt").length,
    material: of(data.materials).filter((m) => m.status !== "angekommen").length,
    berichte: of(data.reports).length + of(data.regie).length,
    dokumente: of(data.files).length
  } as Record<string, number>;
}

/** Sidebar: my projects; the open one unfolds into its sections. */
function ProjectNav({ role }: { role: Role }) {
  const { data } = useStore();
  const pathname = usePathname();
  const sites = myProjects(data);
  const [, base, siteId, section] = pathname.split("/");
  const openId = base === "projekte" ? siteId : "";
  const counts = useSectionCounts(openId ?? "");
  return (
    <div className="side-projects">
      <span className="side-label">Meine Projekte</span>
      {sites.length === 0 && <span className="side-empty">Noch keine Projekte</span>}
      {sites.map((p) => {
        const open = p.id === openId;
        return (
          <div key={p.id} className={`sp ${open ? "open" : ""}`}>
            <Link href={`/projekte/${p.id}`} className="sp-head" title={p.name}>
              {p.image ? <img src={p.image} alt="" /> : <i style={{ background: p.color }} />}
              <span>{p.name}</span>
            </Link>
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
                        {counts[s.key] ? <em>{counts[s.key]}</em> : null}
                      </Link>
                    );
                  })}
              </nav>
            )}
          </div>
        );
      })}
    </div>
  );
}

/** Section tabs of a project for phones and tablets (the sidebar is hidden there). */
export function ProjectTabs({ projectId }: { projectId: string }) {
  const { data } = useStore();
  const pathname = usePathname();
  const role = roleOf(currentUser(data));
  const section = pathname.split("/")[3];
  const counts = useSectionCounts(projectId);
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
              {counts[s.key] ? <em>{counts[s.key]}</em> : null}
            </Link>
          );
        })}
    </nav>
  );
}

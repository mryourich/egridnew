"use client";

import { FileText, FolderKanban, Home, LogOut, Settings, StickyNote, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
      <div className="app">
        <div className="app-header">
          <header className="topbar">
            <Link href="/dashboard" className="topbar-brand" aria-label="VYSNpro Start">
              <Image src="/brand/vysnpro-logo-wide.png" alt="VYSNpro" width={167} height={24} priority />
            </Link>
            <nav className="mainnav" aria-label="Module">
              {modules.map((m) => (
                <Link key={m.href} href={m.href} className={current === m ? "active" : ""}>
                  <m.icon size={17} />
                  <span className="nav-long">{m.label}</span>
                  <span className="nav-short">{m.short ?? m.label}</span>
                </Link>
              ))}
            </nav>
            <span className="spacer" />
            <span className="topbar-company">{data.company.name}</span>
            <UserSwitch />
          </header>
          {current?.href === "/projekte" && <SiteBar role={role} />}
          {current?.sub && (
            <nav className="subbar" aria-label={current.label}>
              {current.sub.map((s) => (
                <Link key={s.href} href={s.href} className={isActive([s.href]) ? "active" : ""}>
                  {s.label}
                  {s.badge ? <em>{s.badge}</em> : null}
                </Link>
              ))}
            </nav>
          )}
        </div>

        <main className="content">{children}</main>

        {target && <Editor target={target} onClose={() => setTarget(null)} />}
        {toast && <div className="toast">{toast}</div>}
      </div>
    </EditorContext.Provider>
  );
}

/** Demo sign-in: switch the user to see what each role sees (real login comes with Supabase). */
function UserSwitch() {
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
    <div className="quick-create" ref={ref}>
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

/** Site navigation: site picker plus the sections of the open site. */
function SiteBar({ role }: { role: Role }) {
  const { data } = useStore();
  const pathname = usePathname();
  const router = useRouter();
  const sites = myProjects(data);
  const [, , siteId, section] = pathname.split("/");
  const site = sites.find((p) => p.id === siteId);
  const t = new Date().toISOString().slice(0, 10);

  if (!site) {
    return (
      <nav className="subbar" aria-label="Projekte">
        <Link href="/projekte" className={pathname === "/projekte" ? "active" : ""}>
          Übersicht
        </Link>
        {sites.map((p) => (
          <Link key={p.id} href={`/projekte/${p.id}`}>
            <i className="dot" style={{ background: p.color }} /> {p.name}
          </Link>
        ))}
      </nav>
    );
  }

  const of = <T extends { projectId: string }>(list: T[]) => list.filter((x) => x.projectId === site.id);
  const counts: Record<string, number> = {
    plan: of(data.jobs).filter((j) => !j.done && j.end >= t).length,
    struktur: of(data.siteNodes).filter((n) => n.status !== "erledigt" && !data.siteNodes.some((k) => k.parentId === n.id)).length,
    fotos: of(data.photos).length,
    maengel: of(data.issues).filter((i) => i.status !== "erledigt").length,
    material: of(data.materials).filter((m) => m.status !== "angekommen").length,
    berichte: of(data.reports).length + of(data.regie).length,
    dokumente: of(data.files).length
  };

  return (
    <nav className="subbar site-bar" aria-label={site.name}>
      <select
        className="site-picker"
        value={site.id}
        style={{ borderColor: site.color }}
        onChange={(e) => router.push(`/projekte/${e.target.value}/${section ?? ""}`)}
        aria-label="Projekt wechseln"
      >
        {sites.map((p) => (
          <option key={p.id} value={p.id}>
            {p.code} · {p.name}
          </option>
        ))}
      </select>
      {siteSections
        .filter((s) => s.roles.includes(role))
        .map((s) => (
          <Link key={s.key} href={`/projekte/${site.id}/${s.key}`} className={section === s.key ? "active" : ""}>
            {s.label}
            {counts[s.key] ? <em>{counts[s.key]}</em> : null}
          </Link>
        ))}
    </nav>
  );
}

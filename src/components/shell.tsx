"use client";

import { FolderKanban, HardHat, Home, LogOut, Settings, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { currentUser, findConflicts, roleLabel, roleOf, StoreProvider, useStore, type Role } from "@/lib/store";
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
type Module = { href: string; label: string; match: string[]; sub?: NavItem[] };

function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const pathname = usePathname();
  const [target, setTarget] = useState<EditorTarget | null>(null);

  const conflicts = findConflicts(data).size;
  const role = roleOf(currentUser(data));

  const all: (Module & { icon: typeof Home; roles: Role[] })[] = [
    { href: "/dashboard", label: "Start", icon: Home, match: ["/dashboard"], roles: ["pl", "bl", "hr", "monteur"] },
    {
      href: "/projekte",
      label: "Projekte",
      icon: FolderKanban,
      match: ["/projekte", "/ressourcenplanung"],
      roles: ["pl"],
      sub: [
        { href: "/projekte", label: "Alle Projekte" },
        { href: "/ressourcenplanung", label: "Ressourcenplanung", badge: conflicts }
      ]
    },
    { href: "/teamgrid", label: role === "monteur" ? "Meine Baustellen" : "TeamGrid", icon: HardHat, match: ["/teamgrid"], roles: ["pl", "bl", "monteur"] },
    { href: "/ressourcen", label: "Personal", icon: Users, match: ["/ressourcen"], roles: ["pl", "hr"] }
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
                  <span>{m.label}</span>
                </Link>
              ))}
            </nav>
            <span className="spacer" />
            <span className="topbar-company">{data.company.name}</span>
            <UserSwitch />
          </header>
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
        <Avatar name={user.name} size={28} />
        <span>
          <strong>{user.name}</strong>
          <small>{user.role}</small>
        </span>
      </button>
      {open && (
        <div className="menu user-menu">
          <div className="user-card">
            <Avatar name={user.name} size={36} />
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
            <LogOut size={12} /> Ansicht wechseln (Demo)
          </small>
          {(["pl", "bl", "hr", "monteur"] as Role[]).map((r) => (
            <div key={r} className="menu-group">
              <span>{roleLabel[r]}</span>
              {data.employees
                .filter((e) => e.active && roleOf(e) === r)
                .slice(0, r === "monteur" ? 8 : 3)
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

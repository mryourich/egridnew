"use client";

import { Plus, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { currentUser, findConflicts, StoreProvider, useStore } from "@/lib/store";
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
  const user = currentUser(data);

  const modules: Module[] = [
    { href: "/dashboard", label: "Start", match: ["/dashboard"] },
    {
      href: "/projekte",
      label: "Projekte",
      match: ["/projekte", "/ressourcenplanung"],
      sub: [
        { href: "/projekte", label: "Projekte" },
        { href: "/ressourcenplanung", label: "Ressourcenplanung", badge: conflicts }
      ]
    },
    { href: "/teamgrid", label: "TeamGrid", match: ["/teamgrid"] },
    { href: "/ressourcen", label: "Ressourcen", match: ["/ressourcen"] }
  ];

  const isActive = (paths: string[]) => paths.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  const current = modules.find((m) => isActive(m.match));

  return (
    <EditorContext.Provider value={setTarget}>
      <div className="app">
        <div className="app-header">
        <header className="topbar">
          <Link href="/dashboard" className="topbar-brand">
            <Image src="/brand/vysnpro-icon.png" alt="" width={24} height={24} priority />
            <span>
              VYSN<b>pro</b>
            </span>
          </Link>
          <span className="topbar-company">{data.company.name}</span>
          <span className="spacer" />
          <QuickCreate onPick={setTarget} />
          <Link href="/einstellungen" className="topbar-icon" aria-label="Einstellungen" title="Einstellungen">
            <Settings size={18} />
          </Link>
          <UserSwitch />
        </header>

        <nav className="modulebar" aria-label="Module">
          {modules.map((m) => (
            <Link key={m.href} href={m.href} className={current === m ? "active" : ""}>
              {m.label}
            </Link>
          ))}
        </nav>
        {current?.sub && (
          <nav className="subbar" aria-label={current.label}>
            {current.sub.map((s) => {
              const active = isActive([s.href]);
              return (
                <Link key={s.href} href={s.href} className={active ? "active" : ""}>
                  {s.label}
                  {s.badge ? <em>{s.badge}</em> : null}
                </Link>
              );
            })}
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

function QuickCreate({ onPick }: { onPick: (t: EditorTarget) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const items: { label: string; kind: EditorTarget["kind"] }[] = [
    { label: "Projekt", kind: "project" },
    { label: "Einplanung", kind: "assignment" },
    { label: "Abwesenheit", kind: "absence" }
  ];

  return (
    <div className="quick-create" ref={ref}>
      <button className="topbar-new" onClick={() => setOpen((o) => !o)} type="button">
        <Plus size={16} /> <span>Neu</span>
      </button>
      {open && (
        <div className="menu">
          {items.map((i) => (
            <button
              key={i.kind}
              type="button"
              onClick={() => {
                setOpen(false);
                onPick({ kind: i.kind });
              }}
            >
              {i.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
          <small className="menu-title">Angemeldet als (Demo)</small>
          {data.employees
            .filter((e) => e.active)
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
                {e.name} <small>{e.role}</small>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}

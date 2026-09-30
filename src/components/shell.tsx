"use client";

import { Plus, Settings } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { findConflicts, StoreProvider, useStore } from "@/lib/store";
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
  const openIssues = data.issues.filter((i) => i.status !== "erledigt").length;
  const user = data.employees.find((e) => e.id === "e2");

  const modules: Module[] = [
    { href: "/dashboard", label: "Start", match: ["/dashboard"] },
    {
      href: "/teamgrid",
      label: "TeamGrid",
      match: ["/teamgrid", "/planung", "/meldungen"],
      sub: [
        { href: "/teamgrid", label: "Baustellen" },
        { href: "/planung", label: "Einsatzplanung", badge: conflicts },
        { href: "/meldungen", label: "Mängel", badge: openIssues }
      ]
    },
    { href: "/projekte", label: "Projekte", match: ["/projekte"] },
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
          {user && (
            <span className="topbar-user" title={`${user.name} · ${user.role}`}>
              <Avatar name={user.name} size={28} />
              <span>
                <strong>{user.name}</strong>
                <small>{user.role}</small>
              </span>
            </span>
          )}
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
    { label: "Mangel", kind: "issue" },
    { label: "Tagesbericht", kind: "report" },
    { label: "Einplanung", kind: "assignment" },
    { label: "Projekt", kind: "project" }
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

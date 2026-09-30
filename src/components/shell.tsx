"use client";

import { AlertTriangle, CalendarRange, FolderKanban, LayoutDashboard, Menu, Plus, Settings, Users, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { findConflicts, StoreProvider, useStore } from "@/lib/store";
import { Editor, type EditorTarget } from "./editors";

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

function Frame({ children }: { children: ReactNode }) {
  const { data, toast } = useStore();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);
  const [target, setTarget] = useState<EditorTarget | null>(null);

  useEffect(() => setMenuOpen(false), [pathname]);

  const conflicts = findConflicts(data).size;
  const openIssues = data.issues.filter((i) => i.status !== "erledigt").length;

  const nav = [
    { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/planung", label: "Plantafel", icon: CalendarRange, badge: conflicts, tone: "red" },
    { href: "/projekte", label: "Projekte", icon: FolderKanban, badge: data.projects.filter((p) => p.status === "aktiv").length },
    { href: "/meldungen", label: "Mängel & Meldungen", icon: AlertTriangle, badge: openIssues, tone: "amber" },
    { href: "/ressourcen", label: "Ressourcen", icon: Users },
    { href: "/einstellungen", label: "Einstellungen", icon: Settings }
  ];

  return (
    <EditorContext.Provider value={setTarget}>
      <div className="app">
        <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
          <div className="sidebar-brand">
            <Image src="/brand/vysnpro-icon.png" alt="" width={30} height={30} priority />
            <span>
              VYSN<b>pro</b>
            </span>
            <button className="icon-btn sidebar-close" onClick={() => setMenuOpen(false)} aria-label="Menü schließen" type="button">
              <X size={18} />
            </button>
          </div>
          <QuickCreate onPick={setTarget} />
          <nav className="sidebar-nav">
            {nav.map((item) => {
              const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} className={active ? "active" : ""}>
                  <item.icon size={17} />
                  <span>{item.label}</span>
                  {item.badge ? <em className={`nav-badge ${item.tone ?? ""}`}>{item.badge}</em> : null}
                </Link>
              );
            })}
          </nav>
          <div className="sidebar-foot">
            <span className="sidebar-company">{data.company.name}</span>
            <span className="sidebar-mode">Demo-Modus · Daten im Browser</span>
          </div>
        </aside>
        {menuOpen && <div className="sidebar-backdrop" onClick={() => setMenuOpen(false)} />}

        <div className="main">
          <div className="mobile-bar">
            <button className="icon-btn" onClick={() => setMenuOpen(true)} aria-label="Menü öffnen" type="button">
              <Menu size={20} />
            </button>
            <Image src="/brand/vysnpro-icon.png" alt="" width={24} height={24} />
            <strong>
              VYSN<b>pro</b>
            </strong>
          </div>
          <main className="content">{children}</main>
        </div>

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
    { label: "Einplanung", kind: "assignment" },
    { label: "Mangel / Meldung", kind: "issue" },
    { label: "Tagesbericht", kind: "report" },
    { label: "Vorgang", kind: "task" },
    { label: "Projekt", kind: "project" },
    { label: "Abwesenheit", kind: "absence" }
  ];

  return (
    <div className="quick-create" ref={ref}>
      <button className="btn btn-primary btn-block" onClick={() => setOpen((o) => !o)} type="button">
        <Plus size={16} /> Neu anlegen
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

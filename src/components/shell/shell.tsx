"use client";

import { CalendarRange, CheckSquare, ClipboardList, FileText, GanttChart, IdCard, LayoutGrid, Menu, Package, PanelLeftClose, PanelLeftOpen, Search, Settings, StickyNote, Sun, Wrench, X } from "lucide-react";

const COLLAPSE_KEY = "vysner:nav-collapsed";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { ConfirmProvider, Toaster } from "@/components/app/kit";
import { StoreProvider, useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";
import { canApprove } from "@/modules/berichte/model";
import { GlobalSearch } from "./global-search";
import { SettingsDialog } from "./settings";
import { SitePicker, UserMenu } from "./top-controls";

export const NAV = [
  {
    group: "Persönlich",
    items: [
      { href: "/aufgaben", label: "Meine Aufgaben", icon: CheckSquare },
      { href: "/mein-tag", label: "Mein Tag", icon: Sun }
    ]
  },
  {
    group: "Baustelle",
    items: [
      { href: "/uebersicht", label: "Übersicht", icon: LayoutGrid },
      { href: "/openpoints", label: "OpenPoints", icon: ClipboardList },
      { href: "/kalender", label: "Kalender", icon: CalendarRange },
      { href: "/berichte", label: "Berichte", icon: FileText },
      { href: "/notizen", label: "Notizen", icon: StickyNote },
      { href: "/material", label: "Material", icon: Package }
    ]
  },
  {
    group: "Firma",
    items: [
      { href: "/planner", label: "Planner", icon: GanttChart },
      { href: "/service", label: "Service", icon: Wrench },
      { href: "/stammdaten", label: "Stammdaten", icon: IdCard }
    ]
  }
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <ConfirmProvider>
        <Frame>{children}</Frame>
        <Toaster />
      </ConfirmProvider>
    </StoreProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { data } = useStore();
  const lead = canApprove(data);
  const pending = data.reports.filter((r) => r.status === "unterschrieben").length;
  const [open, setOpen] = useState(false);
  const [settings, setSettings] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    try {
      setCollapsed(window.localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      // expanded
    }
  }, []);
  const toggleNav = () =>
    setCollapsed((c) => {
      try {
        window.localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        // only for this visit
      }
      return !c;
    });

  return (
    <div className={cn("app", open && "nav-open", collapsed && "nav-collapsed")}>
      <aside className="nav" aria-label="Hauptnavigation">
        <Link href="/uebersicht" className="nav-brand">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/vysner-icon.png" alt="" width={26} height={26} />
          <span>
            <strong>VYSNER</strong>
          </span>
        </Link>
        <nav className="nav-list">
          {NAV.map(({ group, items }) => (
            <div key={group} className="nav-group">
              <span className="nav-group-label">{group}</span>
              {items
                .filter((n) => n.href !== "/service" || data.workspace.modules?.service)
                .map(({ href, label, icon: Icon }) => {
                  const on = path === href || path.startsWith(`${href}/`) || (href === "/berichte" && path.startsWith("/berichte"));
                  const badge = href === "/berichte" && lead ? pending : 0;
                  return (
                    <Link key={href} href={href} className={cn("nav-item", on && "on")} aria-current={on ? "page" : undefined} title={label}>
                      <Icon size={17} strokeWidth={1.8} />
                      <span>{label}</span>
                      {badge > 0 && (
                        <b className="nav-badge" title={`${badge} zur Freigabe`}>
                          {badge}
                        </b>
                      )}
                    </Link>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="nav-foot">
          <button type="button" className="nav-item nav-toggle" onClick={toggleNav} title={collapsed ? "Menü ausklappen" : "Menü einklappen"} aria-label={collapsed ? "Menü ausklappen" : "Menü einklappen"} aria-expanded={!collapsed}>
            {collapsed ? <PanelLeftOpen size={17} strokeWidth={1.8} /> : <PanelLeftClose size={17} strokeWidth={1.8} />}
            <span>Menü einklappen</span>
          </button>
          <button type="button" className="nav-item" onClick={() => setSettings(true)} title="Einstellungen">
            <Settings size={17} strokeWidth={1.8} />
            <span>Einstellungen</span>
          </button>
        </div>
      </aside>
      <button type="button" className="nav-scrim" aria-label="Menü schließen" onClick={() => setOpen(false)} />

      <div className="main">
        <header className="top">
          <button type="button" className="top-menu" aria-label={open ? "Menü schließen" : "Menü öffnen"} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <GlobalSearch icon={<Search size={14} />} />
          <span className="grow" />
          <SitePicker />
          <UserMenu onSettings={() => setSettings(true)} />
        </header>
        <main className="content">{children}</main>
      </div>
      {settings && <SettingsDialog onClose={() => setSettings(false)} />}
    </div>
  );
}

"use client";

import { CalendarDays, HardHat, LayoutDashboard, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { OfflineSupport } from "@/components/offline";
import { EditorHost } from "@/components/shell";
import { StoreProvider, useStore } from "@/lib/store";
import { activePeople, canSettings, me, ROLLE_LABEL, ROLLEN, rolleOf, seesTeam } from "./access";
import { Face } from "./kit";
import "./app.css";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/planung", label: "Planung", icon: CalendarDays },
  { href: "/projekte", label: "Baustellen", icon: HardHat },
  { href: "/team", label: "Team", icon: Users }
];

export function AppFrame({ children }: { children: ReactNode }) {
  return (
    <StoreProvider>
      <EditorHost>
        <Frame>{children}</Frame>
      </EditorHost>
    </StoreProvider>
  );
}

function Frame({ children }: { children: ReactNode }) {
  const { toast, data } = useStore();
  const nav = NAV.filter((n) => n.href !== "/team" || seesTeam(data));
  const path = usePathname();
  const active = (href: string) => path === href || path.startsWith(`${href}/`);
  return (
    <div className="v-app">
      <aside className="v-side">
        <Link href="/dashboard" className="v-brand" aria-label="VYSNER">
          <img src="/brand/vysner-mark-small.png" alt="" />
          <img src="/brand/vysner-word.png" alt="VYSNER" className="v-word" />
        </Link>
        <nav aria-label="Menü">
          {nav.map((n) => (
            <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""}>
              <n.icon size={19} />
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="v-side-foot">
          <UserMenu up />
        </div>
      </aside>

      <header className="v-top">
        <Link href="/dashboard" className="v-brand" aria-label="VYSNER">
          <img src="/brand/vysner-mark-small.png" alt="" />
          <img src="/brand/vysner-word.png" alt="VYSNER" className="v-word" />
        </Link>
        <UserMenu />
      </header>

      <main className="v-main">{children}</main>

      <nav className="v-tabs" aria-label="Menü">
        {nav.map((n) => (
          <Link key={n.href} href={n.href} className={active(n.href) ? "on" : ""}>
            <n.icon size={21} />
            <span>{n.label}</span>
          </Link>
        ))}
      </nav>

      {toast && <div className="v-toast">{toast}</div>}
      <OfflineSupport />
    </div>
  );
}

/** Who am I – settings and (until the real login) switching the person. */
function UserMenu({ up }: { up?: boolean }) {
  const { data, setCurrentUser, notify } = useStore();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const path = usePathname();
  useEffect(() => setOpen(false), [path]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);
  const user = me(data);
  if (!user) return null;

  return (
    <div className={`v-user ${up ? "up" : ""}`} ref={box}>
      <button type="button" className="v-user-btn" onClick={() => setOpen((o) => !o)} aria-label="Benutzer">
        <Face id={user.id} size={32} />
        <span>
          <strong>{user.name}</strong>
          <small>{ROLLE_LABEL[rolleOf(user)]}</small>
        </span>
      </button>
      {open && (
        <div className="v-user-pop">
          {canSettings(data) && (
            <Link href="/einstellungen" className="v-pop-link">
              <Settings size={16} /> Einstellungen
            </Link>
          )}
          <p className="v-pop-label">Anmelden als (Demo)</p>
          <div className="v-pop-people">
            {ROLLEN.map((g) => {
              const people = activePeople(data).filter((e) => rolleOf(e) === g);
              if (!people.length) return null;
              return (
                <div key={g}>
                  <small>{ROLLE_LABEL[g]}</small>
                  {people.map((e) => (
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
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

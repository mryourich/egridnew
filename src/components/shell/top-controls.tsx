"use client";

import { Check, ChevronDown, HardHat, Settings } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Avatar } from "@/components/app/kit";
import { DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui";
import { activeSites, personName, useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";

/** Small menu that closes on outside click and Esc. */
export function Pop({ trigger, children, className, align = "right" }: { trigger: (open: boolean, toggle: () => void) => ReactNode; children: (close: () => void) => ReactNode; className?: string; align?: "left" | "right" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const out = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", out);
    window.addEventListener("keydown", esc);
    return () => {
      window.removeEventListener("pointerdown", out);
      window.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div className={cn("ui-dropdown", className)} ref={ref}>
      {trigger(open, () => setOpen((o) => !o))}
      {open && (
        <div className="ui-dropdown-content" style={align === "left" ? { left: 0, right: "auto" } : undefined} role="menu">
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** Site chosen in the top bar – every module filters by it. */
export function SitePicker() {
  const { data, siteId, setSiteId } = useStore();
  const sites = activeSites(data);
  const current = data.sites.find((s) => s.id === siteId);
  return (
    <Pop
      className="site-picker"
      trigger={(open, toggle) => (
        <button type="button" className={cn("top-btn", open && "on")} onClick={toggle} aria-haspopup="menu" aria-expanded={open}>
          <HardHat size={15} />
          <span className="label">
            <small>Baustelle</small>
            <strong>{current ? current.name : "Alle Baustellen"}</strong>
          </span>
          <ChevronDown size={14} />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownMenuItem className={cn(!siteId && "on")} onClick={() => (setSiteId(""), close())}>
            <span className="swatch" style={{ background: "var(--border-strong)" }} />
            <span className="grow">Alle Baustellen</span>
            {!siteId && <Check size={14} />}
          </DropdownMenuItem>
          {sites.length > 0 && <DropdownMenuSeparator />}
          {sites.map((s) => (
            <DropdownMenuItem key={s.id} className={cn(s.id === siteId && "on")} onClick={() => (setSiteId(s.id), close())}>
              <span className="swatch" style={{ background: s.color }} />
              <span className="grow">
                {s.name}
                <small className="muted" style={{ display: "block", fontSize: 11 }}>
                  {s.number} · {s.client}
                </small>
              </span>
              {s.id === siteId && <Check size={14} />}
            </DropdownMenuItem>
          ))}
          {!sites.length && <DropdownMenuLabel>Noch keine Baustelle angelegt</DropdownMenuLabel>}
        </>
      )}
    </Pop>
  );
}

/** "Angemeldet als" – until the login exists, whoever uses the device picks their name. */
export function UserMenu({ onSettings }: { onSettings: () => void }) {
  const { data, setMe } = useStore();
  const people = data.people.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const me = data.people.find((p) => p.id === data.meId);
  return (
    <Pop
      trigger={(open, toggle) => (
        <button type="button" className={cn("top-btn", open && "on")} onClick={toggle} aria-haspopup="menu" aria-expanded={open} aria-label="Benutzer">
          <Avatar id={data.meId} size={24} />
          <span className="label hide-sm">
            <small>Angemeldet als</small>
            <strong>{personName(data, data.meId) || "–"}</strong>
          </span>
          <ChevronDown size={14} />
        </button>
      )}
    >
      {(close) => (
        <>
          <DropdownMenuLabel>
            {data.workspace.name}
            {me && <span style={{ display: "block", textTransform: "none", letterSpacing: 0, fontWeight: 500 }}>{me.role}</span>}
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuLabel>Benutzer wechseln</DropdownMenuLabel>
          <div style={{ maxHeight: 260, overflowY: "auto" }}>
            {people.map((p) => (
              <DropdownMenuItem key={p.id} className={cn(p.id === data.meId && "on")} onClick={() => (setMe(p.id), close())}>
                <Avatar id={p.id} size={20} />
                <span className="grow">{p.name}</span>
                <small className="muted">{p.role}</small>
              </DropdownMenuItem>
            ))}
          </div>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => (close(), onSettings())}>
            <Settings size={15} /> Einstellungen & Mitarbeiter
          </DropdownMenuItem>
        </>
      )}
    </Pop>
  );
}

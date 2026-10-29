"use client";

import { CheckSquare, ClipboardList, HardHat, Package, StickyNote, TriangleAlert, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { siteName, useStore } from "@/lib/store/store";
import { cn } from "@/lib/utils";

type Hit = { key: string; group: string; icon: ReactNode; title: string; sub: string; href: string; siteId: string };

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");

/** One search over sites, checklist, defects, tasks, material and notes. Ctrl+K focuses it. */
export function GlobalSearch({ icon }: { icon: ReactNode }) {
  const { data, siteId, setSiteId } = useStore();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        input.current?.focus();
        setOpen(true);
      }
    };
    const out = (e: PointerEvent) => !box.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("keydown", key);
    window.addEventListener("pointerdown", out);
    return () => {
      window.removeEventListener("keydown", key);
      window.removeEventListener("pointerdown", out);
    };
  }, []);

  const hits = useMemo<Hit[]>(() => {
    const t = norm(q.trim());
    if (t.length < 2) return [];
    const has = (...s: (string | undefined)[]) => s.some((x) => x && norm(x).includes(t));
    const out: Hit[] = [];
    for (const s of data.sites) if (has(s.name, s.number, s.client, s.address)) out.push({ key: `s${s.id}`, group: "Baustellen", icon: <HardHat size={14} />, title: s.name, sub: `${s.number} · ${s.client}`, href: `/uebersicht/${s.id}`, siteId: "" });
    for (const p of data.people) if (has(p.name, p.personnelNo, p.role, p.trade, p.company, ...(p.qualifications ?? []))) out.push({ key: `u${p.id}`, group: "Mitarbeiter", icon: <UserRound size={14} />, title: p.name, sub: [p.personnelNo && `Pers.-Nr. ${p.personnelNo}`, p.role].filter(Boolean).join(" · "), href: `/stammdaten?person=${p.id}`, siteId: "" });
    for (const p of data.points) if (has(p.title, p.note)) out.push({ key: `p${p.id}`, group: "Checkliste", icon: <ClipboardList size={14} />, title: p.title, sub: siteName(data, p.siteId), href: `/openpoints?punkt=${p.id}`, siteId: p.siteId });
    for (const m of data.defects) if (has(m.title, m.description, m.location, `M-${String(m.no).padStart(3, "0")}`)) out.push({ key: `m${m.id}`, group: "Mängel", icon: <TriangleAlert size={14} />, title: `M-${String(m.no).padStart(3, "0")} ${m.title}`, sub: `${siteName(data, m.siteId)}${m.location ? ` · ${m.location}` : ""}`, href: `/openpoints?ansicht=maengel&mangel=${m.id}`, siteId: m.siteId });
    for (const a of data.tasks) if (has(a.title, a.note)) out.push({ key: `t${a.id}`, group: "Aufgaben", icon: <CheckSquare size={14} />, title: a.title, sub: siteName(data, a.siteId) || "Ohne Baustelle", href: `/aufgaben?aufgabe=${a.id}`, siteId: a.siteId });
    for (const m of data.materials) if (has(m.name, m.artNo, m.barcode, m.supplier)) out.push({ key: `a${m.id}`, group: "Material", icon: <Package size={14} />, title: m.name, sub: `${m.artNo} · ${siteName(data, m.siteId)}`, href: `/material?artikel=${m.id}`, siteId: m.siteId });
    for (const n of data.notes) if (has(n.text)) out.push({ key: `n${n.id}`, group: "Notizen", icon: <StickyNote size={14} />, title: n.text.split("\n")[0], sub: siteName(data, n.siteId) || "Persönlich", href: `/notizen?notiz=${n.id}`, siteId: n.siteId });
    return out.slice(0, 40);
  }, [q, data]);

  const go = (h: Hit) => {
    // the item has to be visible under the chosen site
    if (siteId && h.siteId && h.siteId !== siteId) setSiteId(h.siteId);
    setOpen(false);
    setQ("");
    input.current?.blur();
    router.push(h.href);
  };

  let last = "";
  return (
    <div className="gsearch" ref={box}>
      <label className="search">
        {icon}
        <input
          ref={input}
          className="ui-input"
          value={q}
          placeholder="Suchen … (Strg+K)"
          aria-label="Suchen"
          role="combobox"
          aria-expanded={open && hits.length > 0}
          aria-controls="gsearch-list"
          onFocus={() => setOpen(true)}
          onChange={(e) => (setQ(e.target.value), setActive(0), setOpen(true))}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") (e.preventDefault(), setActive((a) => Math.min(hits.length - 1, a + 1)));
            if (e.key === "ArrowUp") (e.preventDefault(), setActive((a) => Math.max(0, a - 1)));
            if (e.key === "Enter" && hits[active]) go(hits[active]);
            if (e.key === "Escape") (setOpen(false), e.currentTarget.blur());
          }}
        />
      </label>
      {open && q.trim().length >= 2 && (
        <div className="gsearch-list" id="gsearch-list" role="listbox">
          {hits.length === 0 && <p className="muted gsearch-none">Keine Treffer für „{q.trim()}“</p>}
          {hits.map((h, i) => {
            const head = h.group !== last ? ((last = h.group), <div className="gsearch-group">{h.group}</div>) : null;
            return (
              <div key={h.key}>
                {head}
                <button type="button" role="option" aria-selected={i === active} className={cn("gsearch-hit", i === active && "on")} onMouseEnter={() => setActive(i)} onClick={() => go(h)}>
                  {h.icon}
                  <span className="grow">
                    <strong>{h.title}</strong>
                    <small>{h.sub}</small>
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

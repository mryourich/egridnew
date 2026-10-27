"use client";

import { MoreHorizontal, Search, X } from "lucide-react";
import { useEffect, useId, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { initials, type Tone } from "./format";
import { useStore } from "./store";

type BtnProps = ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "default" | "ghost" | "danger"; size?: "sm" | "md"; icon?: ReactNode };

export function Button({ variant = "default", size = "md", icon, children, className = "", type = "button", ...rest }: BtnProps) {
  return (
    <button type={type} className={`b-btn ${variant} ${size} ${className}`} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" className={`b-icon ${className}`} aria-label={label} title={label} {...rest}>
      {children}
    </button>
  );
}

export function Field({ label, hint, children, className = "" }: { label: string; hint?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <label className={`b-field ${className}`}>
      <span className="b-label">{label}</span>
      {children}
      {hint && <small className="b-hint">{hint}</small>}
    </label>
  );
}

export function Tag({ tone = "gray", children, dot }: { tone?: Tone; children: ReactNode; dot?: boolean }) {
  return <span className={`b-tag t-${tone} ${dot ? "dot" : ""}`}>{children}</span>;
}

export function Avatar({ id, name, size = 24 }: { id?: string; name?: string; size?: number }) {
  const { data } = useStore();
  const n = (id && data.people.find((p) => p.id === id)?.name) || name || "?";
  const hue = [...n].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return (
    <span className="b-avatar" title={n} style={{ width: size, height: size, fontSize: Math.round(size * 0.4), background: `hsl(${hue} 45% 92%)`, color: `hsl(${hue} 40% 30%)` }}>
      {initials(n)}
    </span>
  );
}

export function People({ ids, max = 3 }: { ids: string[]; max?: number }) {
  const { data } = useStore();
  if (!ids.length) return <span className="b-muted">–</span>;
  const names = ids.map((id) => data.people.find((p) => p.id === id)?.name ?? "").filter(Boolean);
  return (
    <span className="b-people" title={names.join(", ")}>
      {ids.slice(0, max).map((id) => (
        <Avatar key={id} id={id} size={22} />
      ))}
      {ids.length === 1 ? <span className="b-people-name">{names[0]}</span> : ids.length > max && <em>+{ids.length - max}</em>}
    </span>
  );
}

export function Bar({ value, tone = "green" }: { value: number; tone?: Tone }) {
  return (
    <span className={`b-bar t-${tone}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100}>
      <i style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </span>
  );
}

export function Empty({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="b-empty">
      <strong>{title}</strong>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}

export function PageHead({ kicker, title, sub, children }: { kicker?: string; title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="b-head">
      <div>
        {kicker && <span className="b-kicker">{kicker}</span>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="b-head-actions">{children}</div>}
    </header>
  );
}

export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="b-seg" role="tablist">
      {options.map((o) => (
        <button key={o.value} type="button" role="tab" aria-selected={value === o.value} className={value === o.value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SearchBox({ value, onChange, placeholder = "Suchen…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="b-search">
      <Search size={14} />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} />
      {value && (
        <button type="button" onClick={() => onChange("")} aria-label="Suche leeren">
          <X size={13} />
        </button>
      )}
    </label>
  );
}

export function Toggle({ checked, onChange, label, hint, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string; disabled?: boolean }) {
  const id = useId();
  return (
    <div className="b-toggle-row">
      <span>
        <label htmlFor={id}>{label}</label>
        {hint && <small>{hint}</small>}
      </span>
      <button id={id} type="button" role="switch" aria-checked={checked} className={`b-toggle ${checked ? "on" : ""}`} onClick={() => onChange(!checked)} disabled={disabled}>
        <i />
      </button>
    </div>
  );
}

/** Dialog in the middle of the screen; Esc or a click beside it closes. */
export function Modal({ title, kicker, onClose, children, footer, wide }: { title: ReactNode; kicker?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  const close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", key);
    document.body.classList.add("b-noscroll");
    return () => {
      window.removeEventListener("keydown", key);
      document.body.classList.remove("b-noscroll");
    };
  }, []);
  return createPortal(
    <div className="b-modal-back" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`b-modal ${wide ? "wide" : ""}`} role="dialog" aria-modal="true">
        <header>
          <div>
            {kicker && <span className="b-kicker">{kicker}</span>}
            <h2>{title}</h2>
          </div>
          <IconButton label="Schließen" onClick={onClose}>
            <X size={18} />
          </IconButton>
        </header>
        <div className="b-modal-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export type MenuItem = { label: string; icon?: ReactNode; onClick: () => void; danger?: boolean; disabled?: boolean } | "-";

/** "…" menu next to a row. */
export function Menu({ items, label = "Mehr" }: { items: MenuItem[]; label?: string }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const btn = useRef<HTMLButtonElement>(null);
  const box = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: Event) => !box.current?.contains(e.target as Node) && !btn.current?.contains(e.target as Node) && setOpen(false);
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("scroll", () => setOpen(false), { once: true, capture: true });
    return () => window.removeEventListener("pointerdown", close, true);
  }, [open]);
  const shown = items.filter((i) => i === "-" || !i.disabled);
  if (!shown.some((i) => i !== "-")) return null;
  return (
    <>
      <button
        ref={btn}
        type="button"
        className="b-icon b-more"
        aria-label={label}
        title={label}
        onClick={(e) => {
          e.stopPropagation();
          const r = btn.current!.getBoundingClientRect();
          setPos({ x: Math.min(r.right, window.innerWidth - 8), y: r.bottom + 4 });
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal size={16} />
      </button>
      {open &&
        createPortal(
          <div ref={box} className="b-menu" style={{ right: window.innerWidth - pos.x, top: Math.min(pos.y, window.innerHeight - 40 * shown.length - 16) }} onClick={(e) => e.stopPropagation()}>
            {shown.map((i, n) =>
              i === "-" ? (
                <hr key={n} />
              ) : (
                <button
                  key={n}
                  type="button"
                  className={i.danger ? "danger" : ""}
                  onClick={() => {
                    setOpen(false);
                    i.onClick();
                  }}
                >
                  {i.icon}
                  {i.label}
                </button>
              )
            )}
          </div>,
          document.body
        )}
    </>
  );
}

/** Person picker for one or more people. */
export function PeoplePicker({ value, onChange, options, multiple }: { value: string[]; onChange: (ids: string[]) => void; options: { id: string; name: string; info?: string }[]; multiple?: boolean }) {
  return (
    <div className="b-picker">
      {options.map((o) => {
        const on = value.includes(o.id);
        return (
          <button
            key={o.id}
            type="button"
            className={on ? "on" : ""}
            onClick={() => onChange(multiple ? (on ? value.filter((v) => v !== o.id) : [...value, o.id]) : on ? [] : [o.id])}
            aria-pressed={on}
          >
            <Avatar id={o.id} size={20} />
            <span>{o.name}</span>
            {o.info && <small>{o.info}</small>}
          </button>
        );
      })}
      {!options.length && <span className="b-muted">Noch niemand im Projektteam.</span>}
    </div>
  );
}

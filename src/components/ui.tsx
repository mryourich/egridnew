"use client";

import { X, type LucideIcon } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Tone } from "@/lib/labels";

export function Badge({ tone = "gray", children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

export function Dot({ color }: { color: string }) {
  return <span className="dot" style={{ background: color }} />;
}

export function Progress({ value, color }: { value: number; color?: string }) {
  return (
    <span className="progress" title={`${value} %`}>
      <span style={{ width: `${Math.max(0, Math.min(100, value))}%`, background: color }} />
    </span>
  );
}

export function Avatar({ name, size = 24 }: { name: string; size?: number }) {
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % 360;
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size * 0.4, background: `hsl(${hash} 65% 92%)`, color: `hsl(${hash} 55% 32%)` }} title={name}>
      {initials || "?"}
    </span>
  );
}

export function PageHeader({ title, subtitle, actions }: { title: ReactNode; subtitle?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="page-header">
      <div>
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function Kpi({ icon: Icon, label, value, hint, tone = "blue" }: { icon: LucideIcon; label: string; value: ReactNode; hint?: ReactNode; tone?: Tone }) {
  return (
    <div className="kpi">
      <span className={`kpi-icon tone-${tone}`}>
        <Icon size={16} />
      </span>
      <div>
        <span className="kpi-label">{label}</span>
        <strong className="kpi-value">{value}</strong>
        {hint && <span className="kpi-hint">{hint}</span>}
      </div>
    </div>
  );
}

export function Card({ title, actions, children, className = "", flush }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string; flush?: boolean }) {
  return (
    <section className={`card ${flush ? "card-flush" : ""} ${className}`}>
      {(title || actions) && (
        <header className="card-header">
          <h2>{title}</h2>
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Tabs<T extends string>({ tabs, value, onChange }: { tabs: { value: T; label: string; count?: number }[]; value: T; onChange: (v: T) => void }) {
  return (
    <nav className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.value} role="tab" aria-selected={value === t.value} className={value === t.value ? "active" : ""} onClick={() => onChange(t.value)} type="button">
          {t.label}
          {t.count !== undefined && <span className="tab-count">{t.count}</span>}
        </button>
      ))}
    </nav>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: { value: T; label: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button key={o.value} type="button" className={value === o.value ? "active" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Modal({ title, onClose, children, wide }: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? "modal-wide" : ""}`} role="dialog" aria-modal="true" aria-label={title}>
        <header className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" type="button" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>
        {children}
      </div>
    </div>
  );
}

export type Field = {
  key: string;
  label: string;
  type?: "text" | "number" | "date" | "select" | "textarea" | "color" | "checkbox" | "image" | "range" | "email" | "tel";
  options?: { value: string; label: string }[];
  required?: boolean;
  full?: boolean;
  min?: number;
  max?: number;
  step?: number;
  placeholder?: string;
};

type Values = Record<string, unknown>;

export async function downscale(file: File, max = 1280): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = url;
    });
    const scale = Math.min(1, max / Math.max(img.width, img.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(img.width * scale);
    canvas.height = Math.round(img.height * scale);
    canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.78);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export function EntityForm<T extends Values>({
  fields: fieldsProp,
  initial,
  onSubmit,
  onCancel,
  onDelete,
  submitLabel = "Speichern",
  validate
}: {
  fields: Field[] | ((values: T) => Field[]);
  initial: T;
  onSubmit: (values: T) => void;
  onCancel: () => void;
  onDelete?: () => void;
  submitLabel?: string;
  validate?: (values: T) => string | null;
}) {
  const [values, setValues] = useState<T>(initial);
  const [error, setError] = useState<string | null>(null);
  const resolve = (v: T) => (typeof fieldsProp === "function" ? fieldsProp(v) : fieldsProp);
  const fields = resolve(values);
  const set = (key: string, value: unknown) =>
    setValues((prev) => {
      const next = { ...prev, [key]: value } as T;
      // A required select whose options changed (e.g. resource list after switching type) snaps to its first option.
      for (const f of resolve(next)) {
        if (f.type === "select" && f.required && f.options && !f.options.some((o) => o.value === next[f.key])) {
          (next as Values)[f.key] = f.options[0]?.value ?? "";
        }
      }
      return next;
    });

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const message = validate?.(values) ?? null;
    setError(message);
    if (!message) onSubmit(values);
  };

  return (
    <form className="form" onSubmit={submit}>
      <div className="form-grid">
        {fields.map((f) => {
          const v = values[f.key];
          const id = `f-${f.key}`;
          let input: ReactNode;
          switch (f.type) {
            case "select":
              input = (
                <select id={id} value={String(v ?? "")} onChange={(e) => set(f.key, e.target.value)} required={f.required}>
                  {!f.required && !f.options?.some((o) => o.value === "") && <option value="">–</option>}
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              );
              break;
            case "textarea":
              input = <textarea id={id} rows={3} value={String(v ?? "")} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} required={f.required} />;
              break;
            case "checkbox":
              input = (
                <label className="check">
                  <input id={id} type="checkbox" checked={Boolean(v)} onChange={(e) => set(f.key, e.target.checked)} /> {f.placeholder ?? "Ja"}
                </label>
              );
              break;
            case "number":
              input = <input id={id} type="number" value={Number.isFinite(v) ? String(v) : ""} min={f.min} max={f.max} step={f.step ?? "any"} onChange={(e) => set(f.key, e.target.value === "" ? 0 : Number(e.target.value))} required={f.required} />;
              break;
            case "range":
              input = (
                <div className="range">
                  <input id={id} type="range" min={f.min ?? 0} max={f.max ?? 100} step={f.step ?? 5} value={Number(v ?? 0)} onChange={(e) => set(f.key, Number(e.target.value))} />
                  <output>{String(v ?? 0)} %</output>
                </div>
              );
              break;
            case "color":
              input = (
                <div className="swatches">
                  {f.options?.map((o) => (
                    <button key={o.value} type="button" className={v === o.value ? "active" : ""} style={{ background: o.value }} onClick={() => set(f.key, o.value)} aria-label={o.label} />
                  ))}
                </div>
              );
              break;
            case "image":
              input = (
                <div className="image-field">
                  {v ? <img src={String(v)} alt="" /> : null}
                  <input
                    id={id}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (file) set(f.key, await downscale(file));
                    }}
                  />
                  {v ? (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => set(f.key, "")}>
                      Foto entfernen
                    </button>
                  ) : null}
                </div>
              );
              break;
            default:
              input = <input id={id} type={f.type ?? "text"} value={String(v ?? "")} placeholder={f.placeholder} onChange={(e) => set(f.key, e.target.value)} required={f.required} />;
          }
          return (
            <div key={f.key} className={`field ${f.full || f.type === "textarea" || f.type === "image" ? "field-full" : ""}`}>
              <label htmlFor={id}>
                {f.label}
                {f.required && <span className="req">*</span>}
              </label>
              {input}
            </div>
          );
        })}
      </div>
      {error && <p className="form-error">{error}</p>}
      <footer className="form-footer">
        {onDelete && (
          <button
            type="button"
            className="btn btn-danger-ghost"
            onClick={() => {
              if (window.confirm("Wirklich löschen?")) onDelete();
            }}
          >
            Löschen
          </button>
        )}
        <span className="spacer" />
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Abbrechen
        </button>
        <button type="submit" className="btn btn-primary">
          {submitLabel}
        </button>
      </footer>
    </form>
  );
}

export function SearchInput({ value, onChange, placeholder = "Suchen…" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return <input className="search-input" type="search" value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />;
}

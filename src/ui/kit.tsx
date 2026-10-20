"use client";

import { X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useStore } from "@/lib/store";
import { initials } from "./access";

/** Round initials or profile picture. */
export function Face({ id, name, size = 32 }: { id?: string; name?: string; size?: number }) {
  const { data } = useStore();
  const e = id ? data.employees.find((x) => x.id === id) : undefined;
  const n = e?.name ?? name ?? "?";
  const hue = [...n].reduce((s, c) => s + c.charCodeAt(0), 0) % 360;
  return e?.photo ? (
    <img className="v-face" src={e.photo} alt={n} style={{ width: size, height: size }} />
  ) : (
    <span className="v-face" title={n} style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue} 70% 93%)`, color: `hsl(${hue} 45% 32%)` }}>
      {initials(n)}
    </span>
  );
}

/** Dialog: centred on the PC, from the bottom on the phone. */
export function Sheet({ title, onClose, children, footer, wide }: { title: ReactNode; onClose: () => void; children: ReactNode; footer?: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const key = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  }, [onClose]);
  if (typeof document === "undefined") return null;
  return createPortal(
    <div className="v-sheet-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`v-sheet ${wide ? "wide" : ""}`} role="dialog" aria-label={typeof title === "string" ? title : undefined}>
        <header>
          <strong>{title}</strong>
          <button type="button" className="v-icon" onClick={onClose} aria-label="Schließen">
            <X size={18} />
          </button>
        </header>
        <div className="v-sheet-body">{children}</div>
        {footer && <footer>{footer}</footer>}
      </div>
    </div>,
    document.body
  );
}

export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label className="v-field">
      <span>{label}</span>
      {children}
      {hint && <small>{hint}</small>}
    </label>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="v-empty">{children}</p>;
}

export function PageHead({ title, sub, children }: { title: ReactNode; sub?: ReactNode; children?: ReactNode }) {
  return (
    <header className="v-head">
      <div>
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {children && <div className="v-head-actions">{children}</div>}
    </header>
  );
}

export function fileSize(bytes: number) {
  return bytes > 1e6 ? `${(bytes / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1e3))} KB`;
}

export function readFile(file: File) {
  return new Promise<string>((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.onerror = rej;
    r.readAsDataURL(file);
  });
}

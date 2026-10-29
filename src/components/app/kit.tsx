"use client";

import { ArrowDown, ArrowUp, Download, FileText, Paperclip, X } from "lucide-react";
import { createContext, useContext, useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogOverlay, DialogTitle, IconButton, Input, SheetContent, SheetHeader, SheetOverlay, SheetTitle, StatusBadge, Textarea } from "@/components/ui";
import { dueState, dueText, fmtDateTime, fmtSize } from "@/lib/format";
import { PRIORITY } from "@/lib/labels";
import { downloadFile, isImage, storeFile, useFileUrl } from "@/lib/store/files";
import { personName, useStore } from "@/lib/store/store";
import type { FileRef, Priority } from "@/lib/store/types";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ modal */

/** Dialog in a portal: Esc and the backdrop close it, focus goes to the first field. */
export function Modal({
  title,
  description,
  children,
  footer,
  onClose,
  size,
  onSubmit
}: {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
  size?: "wide" | "narrow";
  /** turns the dialog into a form: Enter submits */
  onSubmit?: () => void;
}) {
  const ref = useRef<HTMLElement>(null);
  const id = useId();
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && (e.stopPropagation(), onClose());
    window.addEventListener("keydown", esc);
    const first = ref.current?.querySelector<HTMLElement>("[autofocus], .ui-dialog-body input, .ui-dialog-body select, .ui-dialog-body textarea");
    first?.focus();
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  const body = (
    <>
      <DialogHeader>
        <div className="grow">
          <DialogTitle id={id}>{title}</DialogTitle>
          {description && <DialogDescription>{description}</DialogDescription>}
        </div>
        <IconButton label="Schließen" variant="ghost" size="sm" onClick={onClose}>
          <X size={16} />
        </IconButton>
      </DialogHeader>
      <div className="ui-dialog-body">{children}</div>
      {footer && <DialogFooter>{footer}</DialogFooter>}
    </>
  );
  return createPortal(
    <div className="app-modal-root">
      <DialogOverlay onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <DialogContent ref={ref} className={size} aria-labelledby={id}>
          {onSubmit ? (
            <form
              style={{ display: "contents" }}
              onSubmit={(e) => {
                e.preventDefault();
                onSubmit();
              }}
            >
              {body}
            </form>
          ) : (
            body
          )}
        </DialogContent>
      </DialogOverlay>
    </div>,
    document.body
  );
}

/** Side panel for editing one record; changes save as they are made. */
export function SidePanel({ title, sub, children, footer, onClose }: { title: ReactNode; sub?: ReactNode; children: ReactNode; footer?: ReactNode; onClose: () => void }) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !document.querySelector(".ui-dialog-overlay") && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);
  return createPortal(
    <div className="app-modal-root">
      <SheetOverlay onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
        <SheetContent side="right">
          <SheetHeader>
            <div className="grow">
              <SheetTitle>{title}</SheetTitle>
              {sub && <p className="ui-sheet-description">{sub}</p>}
            </div>
            <IconButton label="Schließen" variant="ghost" size="sm" onClick={onClose}>
              <X size={16} />
            </IconButton>
          </SheetHeader>
          <div className="ui-dialog-body sheet-body">{children}</div>
          {footer && <div className="ui-sheet-footer">{footer}</div>}
        </SheetContent>
      </SheetOverlay>
    </div>,
    document.body
  );
}

/** Text field that saves when it loses focus (Enter too, Esc restores). */
export function BlurInput({ value, onSave, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value" | "onBlur" | "defaultValue"> & { value: string; onSave: (v: string) => void }) {
  return (
    <Input
      key={value}
      defaultValue={value}
      onBlur={(e) => e.target.value.trim() !== value && onSave(e.target.value.trim())}
      onKeyDown={(e) => {
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          e.currentTarget.value = value;
          e.currentTarget.blur();
        }
      }}
      {...rest}
    />
  );
}

export function BlurTextarea({ value, onSave, ...rest }: Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "value" | "onBlur" | "defaultValue"> & { value: string; onSave: (v: string) => void }) {
  return <Textarea key={value} defaultValue={value} onBlur={(e) => e.target.value.trim() !== value && onSave(e.target.value.trim())} {...rest} />;
}

/* ------------------------------------------------------------------ confirm */

type Ask = (o: { title: string; text?: string; confirm?: string; danger?: boolean }) => Promise<boolean>;
const ConfirmCtx = createContext<Ask>(async () => false);

/** Asks before something is deleted; returns true when confirmed. */
export const useConfirm = () => useContext(ConfirmCtx);

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [q, setQ] = useState<(Parameters<Ask>[0] & { done: (v: boolean) => void }) | null>(null);
  const ask: Ask = (o) => new Promise((done) => setQ({ ...o, done }));
  const close = (v: boolean) => {
    q?.done(v);
    setQ(null);
  };
  return (
    <ConfirmCtx.Provider value={ask}>
      {children}
      {q && (
        <Modal
          size="narrow"
          title={q.title}
          onClose={() => close(false)}
          onSubmit={() => close(true)}
          footer={
            <>
              <span className="grow" />
              <Button type="button" variant="secondary" onClick={() => close(false)}>
                Abbrechen
              </Button>
              <Button type="submit" variant={q.danger === false ? "default" : "destructive"} autoFocus>
                {q.confirm ?? "Löschen"}
              </Button>
            </>
          }
        >
          <p className="muted">{q.text ?? "Das kann nicht rückgängig gemacht werden."}</p>
        </Modal>
      )}
    </ConfirmCtx.Provider>
  );
}

/* ------------------------------------------------------------------ fields */

export function Field({ label, hint, error, className, children }: { label: string; hint?: string; error?: string; className?: string; children: ReactNode }) {
  return (
    <label className={cn("field", error && "error", className)}>
      <span>{label}</span>
      {children}
      {error ? <small className="field-error">{error}</small> : hint ? <small>{hint}</small> : null}
    </label>
  );
}

export function Seg<T extends string>({ value, options, onChange, label }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void; label?: string }) {
  return (
    <div className="seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={o.value === value} className={o.value === value ? "on" : ""} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ page parts */

export function PageHead({ title, sub, actions, crumbs }: { title: ReactNode; sub?: ReactNode; actions?: ReactNode; crumbs?: ReactNode }) {
  return (
    <header className="page-head">
      <div className="titles">
        {crumbs && <nav className="crumbs">{crumbs}</nav>}
        <h1>{title}</h1>
        {sub && <p>{sub}</p>}
      </div>
      {actions && <div className="actions">{actions}</div>}
    </header>
  );
}

export function Empty({ icon, title, text, action, inline }: { icon?: ReactNode; title: string; text?: ReactNode; action?: ReactNode; inline?: boolean }) {
  return (
    <div className={cn("empty", inline && "inline")}>
      {icon}
      <strong>{title}</strong>
      {text && <p>{text}</p>}
      {action}
    </div>
  );
}

/** Column head that sorts; click again flips the direction. */
export function SortHead<K extends string>({ k, sort, onSort, children, className }: { k: K; sort: { key: K; dir: 1 | -1 }; onSort: (s: { key: K; dir: 1 | -1 }) => void; children: ReactNode; className?: string }) {
  const on = sort.key === k;
  return (
    <th className={cn("ui-table-head", className)} aria-sort={on ? (sort.dir === 1 ? "ascending" : "descending") : "none"}>
      <button type="button" className={cn("sort", on && "on")} onClick={() => onSort({ key: k, dir: on ? (sort.dir === 1 ? -1 : 1) : 1 })}>
        {children}
        {on && (sort.dir === 1 ? <ArrowUp size={11} /> : <ArrowDown size={11} />)}
      </button>
    </th>
  );
}

/* ------------------------------------------------------------------ people */

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("") || "?";

export function Avatar({ id, size = 22 }: { id: string; size?: number }) {
  const { data } = useStore();
  const name = personName(data, id);
  return (
    <span className="avatar" style={{ width: size, height: size, fontSize: size < 20 ? 8 : 10 }} title={name}>
      {initials(name)}
    </span>
  );
}

export function Who({ id, empty = "–" }: { id: string; empty?: string }) {
  const { data } = useStore();
  const name = personName(data, id);
  if (!name) return <span className="muted">{empty}</span>;
  return (
    <span className="who">
      <Avatar id={id} size={20} />
      <span>{name}</span>
    </span>
  );
}

export function PeopleStack({ ids, max = 3 }: { ids: string[]; max?: number }) {
  const { data } = useStore();
  if (!ids.length) return <span className="muted">–</span>;
  const names = ids.map((id) => personName(data, id)).filter(Boolean);
  return (
    <span className="who" title={names.join(", ")}>
      <span className="people-stack">
        {ids.slice(0, max).map((id) => (
          <Avatar key={id} id={id} size={20} />
        ))}
      </span>
      <span>{ids.length === 1 ? names[0] : `${names[0]} +${ids.length - 1}`}</span>
    </span>
  );
}

/** Active people as options. */
export function PersonOptions({ none = "Niemand" }: { none?: string | false }) {
  const { data } = useStore();
  return (
    <>
      {none !== false && <option value="">{none}</option>}
      {data.people
        .filter((p) => p.active)
        .sort((a, b) => a.name.localeCompare(b.name, "de"))
        .map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
    </>
  );
}

/* ------------------------------------------------------------------ small markers */

export function Prio({ p }: { p: Priority }) {
  return <span className={cn("prio", p)}>{PRIORITY[p]}</span>;
}

export function Due({ due, done }: { due: string; done?: boolean }) {
  const st = dueState(due, done);
  return (
    <span className={cn("due nowrap", st)} title={st === "over" ? "Überfällig" : undefined}>
      {dueText(due)}
    </span>
  );
}

export { StatusBadge };

/* ------------------------------------------------------------------ toast */

export function Toaster() {
  const { toast, dismiss } = useStore();
  if (!toast) return null;
  return (
    <div className={cn("toast", toast.tone)} role="status" aria-live="polite">
      <span>{toast.text}</span>
      {toast.undo && (
        <button
          type="button"
          onClick={() => {
            toast.undo!();
            dismiss();
          }}
        >
          Rückgängig
        </button>
      )}
      <button type="button" aria-label="Meldung schließen" onClick={dismiss}>
        <X size={13} />
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ attachments */

function Thumb({ f, onOpen }: { f: FileRef; onOpen: () => void }) {
  const url = useFileUrl(isImage(f) ? f : undefined);
  return (
    <button type="button" className="thumb" onClick={onOpen} aria-label={`${f.name} öffnen`}>
      {url ? <img src={url} alt="" /> : <FileText size={22} />}
    </button>
  );
}

function Preview({ f, onClose }: { f: FileRef; onClose: () => void }) {
  const url = useFileUrl(f);
  const { data, notify } = useStore();
  return (
    <Modal
      size="wide"
      title={f.name}
      description={`${fmtSize(f.size)} · ${personName(data, f.addedBy) || "–"} · ${fmtDateTime(f.addedAt)}`}
      onClose={onClose}
      footer={
        <>
          <span className="grow" />
          <Button variant="secondary" leftIcon={<Download size={15} />} onClick={async () => ((await downloadFile(f)) ? undefined : notify("Datei nicht gefunden", { tone: "error" }))}>
            Herunterladen
          </Button>
        </>
      }
    >
      {isImage(f) ? url ? <img className="preview-img" src={url} alt={f.name} /> : <p className="muted">Lädt …</p> : url && f.mime === "application/pdf" ? <iframe title={f.name} src={url} style={{ width: "100%", height: "65dvh", border: 0 }} /> : <Empty inline icon={<FileText size={28} />} title="Keine Vorschau" text="Diese Datei kann heruntergeladen werden." />}
    </Modal>
  );
}

/** Photos and files of a record: add, preview, download, remove. */
export function Attachments({ files, onChange, label = "Fotos & Dateien" }: { files: FileRef[]; onChange: (files: FileRef[]) => void; label?: string }) {
  const { data, notify } = useStore();
  const input = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState<FileRef | null>(null);
  const [busy, setBusy] = useState(false);
  const add = async (list: FileList | null) => {
    if (!list?.length) return;
    setBusy(true);
    const added: FileRef[] = [];
    for (const f of Array.from(list)) {
      try {
        added.push(await storeFile(f, data.meId));
      } catch (e) {
        notify(e instanceof Error ? e.message : "Datei konnte nicht gespeichert werden", { tone: "error" });
      }
    }
    setBusy(false);
    if (added.length) onChange([...files, ...added]);
  };
  return (
    <div className="field">
      <span>
        {label} {files.length > 0 && <span className="muted">({files.length})</span>}
      </span>
      <div className="files">
        {files.map((f) => (
          <div className="file-tile" key={f.id}>
            <Thumb f={f} onOpen={() => setOpen(f)} />
            <span className="name" title={f.name}>
              {f.name}
            </span>
            <IconButton label="Entfernen" size="sm" variant="ghost" onClick={() => onChange(files.filter((x) => x.id !== f.id))}>
              <X size={12} />
            </IconButton>
          </div>
        ))}
        <button type="button" className="file-add" onClick={() => input.current?.click()} disabled={busy}>
          <Paperclip size={16} />
          {busy ? "Speichert …" : "Hinzufügen"}
        </button>
      </div>
      <input ref={input} type="file" multiple accept="image/*,application/pdf,.doc,.docx,.xls,.xlsx,.txt" hidden onChange={(e) => (void add(e.target.files), (e.target.value = ""))} />
      {open && <Preview f={open} onClose={() => setOpen(null)} />}
    </div>
  );
}

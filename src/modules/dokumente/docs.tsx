"use client";

import { Building2, Download, FileArchive, FileText, Folder, FolderLock, FolderPlus, Search, Trash2, Upload, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useRef, useState, type DragEvent, type ReactNode } from "react";
import { Empty, Field, FilePreview, FileThumb, Modal, PageHead, SortHead, useConfirm } from "@/components/app/kit";
import { Button, IconButton, Input, Select } from "@/components/ui";
import { fmtDateTime, fmtSize } from "@/lib/format";
import { readFile, storeFile } from "@/lib/store/files";
import { now, personName, uid, useStore } from "@/lib/store/store";
import type { Data, Doc, DocScope, FileRef, Report } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { downloadBlob, makeZip, safeName } from "@/lib/zip";
import { KIND_LABEL } from "@/modules/berichte/model";

/** Folders every place starts with; own folders come on top. */
export const DEFAULT_FOLDERS: Record<DocScope, string[]> = {
  baustelle: ["Pläne", "Verträge & Aufträge", "Lieferscheine", "Protokolle", "Fotos", "Sonstiges"],
  kunde: ["Angebote", "Verträge", "Korrespondenz", "Sonstiges"],
  firma: ["Vorlagen", "Zertifikate & Nachweise", "Versicherung", "Arbeitssicherheit", "Sonstiges"]
};
/** Released reports land here by themselves – read-only. */
export const REPORT_FOLDER = "Berichte";
const MAX = 50 * 1024 * 1024;

type Place = { key: string; scope: DocScope; siteId: string; customerId: string; name: string };
type Row = { id: string; name: string; folder: string; size: number; by: string; at: string; file: FileRef; doc?: Doc; report?: Report };
type SortKey = "name" | "folder" | "size" | "at";

export function placeOf(data: Data, key: string): Place | null {
  if (key === "firma") return { key, scope: "firma", siteId: "", customerId: "", name: data.workspace.name || "Firma" };
  const [scope, id] = key.split(":");
  if (scope === "baustelle") {
    const s = data.sites.find((x) => x.id === id);
    return s ? { key, scope, siteId: s.id, customerId: "", name: s.name } : null;
  }
  if (scope === "kunde") {
    const c = data.customers.find((x) => x.id === id);
    return c ? { key, scope, siteId: "", customerId: c.id, name: c.name } : null;
  }
  return null;
}

const docsOf = (data: Data, p: Place) => data.docs.filter((d) => d.scope === p.scope && d.siteId === p.siteId && d.customerId === p.customerId);

/** Released reports of a place: the company sees all of them. */
export const reportsOf = (data: Data, p: Place) =>
  data.reports.filter((r) => r.status === "freigegeben" && r.pdf && (p.scope === "firma" || (p.scope === "baustelle" ? r.siteId === p.siteId : r.customerId === p.customerId)));

const foldersOf = (data: Data, p: Place) => [...new Set([...DEFAULT_FOLDERS[p.scope], ...(data.workspace.docFolders?.[p.key] ?? []), ...docsOf(data, p).map((d) => d.folder)])];

function rowsOf(data: Data, p: Place): Row[] {
  const docs = docsOf(data, p).map((d) => ({ id: d.id, name: d.file.name, folder: d.folder, size: d.file.size, by: d.file.addedBy, at: d.file.addedAt, file: d.file, doc: d }));
  const reports = reportsOf(data, p).map((r) => ({ id: r.id, name: r.pdf!.name, folder: REPORT_FOLDER, size: r.pdf!.size, by: r.approvedBy ?? r.pdf!.addedBy, at: r.approvedAt ?? r.pdf!.addedAt, file: r.pdf!, report: r }));
  return [...docs, ...reports];
}

/** Files and documents per site, per customer and for the company – with released reports as archive. */
export function Documents() {
  const { data, siteId, save, remove, restore, notify } = useStore();
  const ask = useConfirm();
  const q = useQuery();
  const input = useRef<HTMLInputElement>(null);
  const [term, setTerm] = useState("");
  const [busy, setBusy] = useState(0);
  const [drag, setDrag] = useState(false);
  const [open, setOpen] = useState<FileRef | null>(null);
  const [newFolder, setNewFolder] = useState(false);
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "at", dir: -1 });

  const place = placeOf(data, q.get("ort") || (siteId ? `baustelle:${siteId}` : "firma")) ?? placeOf(data, "firma")!;
  const folders = foldersOf(data, place);
  const folder = q.get("ordner");
  const all = useMemo(() => rowsOf(data, place), [data, place.key]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = term.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = all.filter((r) => (!folder || r.folder === folder) && (!t || [r.name, r.folder, r.doc?.note ?? "", personName(data, r.by)].join(" ").toLowerCase().includes(t)));
    const val = (r: Row) => (sort.key === "size" ? r.size : sort.key === "at" ? r.at : sort.key === "folder" ? r.folder.toLowerCase() : r.name.toLowerCase());
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [all, folder, t, sort, data]);

  const sites = [...data.sites].filter((s) => !siteId || s.id === siteId).sort((a, b) => Number(a.status === "archiviert") - Number(b.status === "archiviert") || a.name.localeCompare(b.name, "de"));
  const customers = [...data.customers].sort((a, b) => a.name.localeCompare(b.name, "de"));
  const count = (key: string) => {
    const p = placeOf(data, key);
    return p ? docsOf(data, p).length + reportsOf(data, p).length : 0;
  };
  const go = (key: string) => (setTerm(""), q.set({ ort: key, ordner: null }));
  const target = folder && folder !== REPORT_FOLDER ? folder : "Sonstiges";

  const upload = async (list: File[]) => {
    if (!list.length) return;
    setBusy(list.length);
    let n = 0;
    for (const f of list) {
      try {
        const file = await storeFile(f, data.meId, { max: MAX, keep: true });
        save("docs", { id: uid(), scope: place.scope, siteId: place.siteId, customerId: place.customerId, folder: target, file, note: "", createdBy: data.meId, createdAt: now() });
        n++;
      } catch (e) {
        notify(e instanceof Error ? e.message : "Datei konnte nicht gespeichert werden", { tone: "error" });
      }
    }
    setBusy(0);
    if (n) notify(`${n} ${n === 1 ? "Datei" : "Dateien"} in „${target}“ abgelegt`);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDrag(false);
    void upload(Array.from(e.dataTransfer.files));
  };

  const drop = async (d: Doc) => {
    if (!(await ask({ title: `„${d.file.name}“ löschen?`, text: "Die Datei wird aus den Dokumenten entfernt." }))) return;
    const before = data;
    remove("docs", d.id);
    notify("Datei gelöscht", { undo: () => restore(before) });
  };

  const download = async (r: Row) => {
    const blob = await readFile(r.file.id);
    if (blob) downloadBlob(blob, r.name);
    else notify("Datei auf diesem Gerät nicht gefunden", { tone: "error" });
  };

  const own = data.workspace.docFolders?.[place.key] ?? [];
  const setFolders = (list: string[]) => restore({ ...data, workspace: { ...data.workspace, docFolders: { ...data.workspace.docFolders, [place.key]: list } } });
  const dropFolder = (f: string) => (setFolders(own.filter((x) => x !== f)), q.set({ ordner: null }));

  const zip = async () => {
    if (!all.length) return notify("Hier liegen noch keine Dateien.");
    const out: { path: string; data: Blob }[] = [];
    const used = new Set<string>();
    let missing = 0;
    for (const r of all) {
      const blob = await readFile(r.file.id);
      if (!blob) {
        missing++;
        continue;
      }
      const dir = safeName(r.folder);
      const dot = r.name.lastIndexOf(".");
      const base = safeName(dot > 0 ? r.name.slice(0, dot) : r.name);
      const ext = dot > 0 ? r.name.slice(dot) : "";
      let path = `${dir}/${base}${ext}`;
      for (let i = 2; used.has(path); i++) path = `${dir}/${base} (${i})${ext}`;
      used.add(path);
      out.push({ path, data: blob });
    }
    if (!out.length) return notify("Die Dateien liegen nicht auf diesem Gerät.", { tone: "error" });
    downloadBlob(await makeZip(out), `Dokumente ${safeName(place.name)}.zip`);
    notify(missing ? `ZIP erstellt – ${missing} Dateien fehlen auf diesem Gerät` : `ZIP mit ${out.length} Dateien erstellt`);
  };

  const node = (key: string, label: string, icon: ReactNode, sub?: string) => (
    <div key={key} className={cn("tree-node site", place.key === key && "on")}>
      {icon}
      <button type="button" className="tree-label" onClick={() => go(key)} title={sub ? `${label} · ${sub}` : label}>
        <span className="grow">{label}</span>
        <small>{count(key) || ""}</small>
      </button>
    </div>
  );

  return (
    <div className="page">
      <PageHead
        title="Dokumente"
        sub="Firma, Baustellen und Kunden · freigegebene Berichte landen automatisch im Ordner „Berichte“"
        actions={
          <>
            <Button variant="secondary" leftIcon={<FileArchive size={15} />} onClick={() => void zip()}>
              ZIP
            </Button>
            <Button leftIcon={<Upload size={15} />} onClick={() => input.current?.click()} disabled={!!busy}>
              {busy ? `Speichert ${busy} …` : "Hochladen"}
            </Button>
          </>
        }
      />
      <input ref={input} type="file" multiple hidden onChange={(e) => (void upload(Array.from(e.target.files ?? [])), (e.target.value = ""))} />
      <div className="checklist">
        <aside className="panel tree" aria-label="Ablage">
          <div className="panel-head">
            <h3>Ablage</h3>
          </div>
          <div className="tree-body">
            <div className="tree-site">{node("firma", "Firma allgemein", <Building2 size={15} className="tree-icon" />)}</div>
            <div className="tree-site">
              <span className="tree-group">Baustellen</span>
              {sites.map((s) => node(`baustelle:${s.id}`, s.name, <span className="swatch" style={{ background: s.color }} />, s.status === "archiviert" ? "archiviert" : undefined))}
              {!sites.length && <p className="muted tree-empty">Keine Baustelle vorhanden.</p>}
            </div>
            <div className="tree-site">
              <span className="tree-group">Kunden</span>
              {customers.map((c) => node(`kunde:${c.id}`, c.name, <Users size={15} className="tree-icon" />, c.city))}
              {!customers.length && <p className="muted tree-empty">Noch keine Kunden.</p>}
            </div>
          </div>
        </aside>

        <section
          className={cn("panel doc-panel", drag && "drag")}
          onDragOver={(e) => (e.preventDefault(), setDrag(true))}
          onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget as Node | null) && setDrag(false)}
          onDrop={onDrop}
          aria-label={`Dokumente ${place.name}`}
        >
          <div className="panel-head wrap">
            <div className="grow point-head">
              <h3>{place.name}</h3>
              <span className="muted">{place.scope === "firma" ? "Firma allgemein" : place.scope === "baustelle" ? "Baustelle" : "Kunde"}</span>
            </div>
            <label className="search">
              <Search size={14} />
              <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Datei, Ordner, Person" aria-label="Dokumente durchsuchen" />
            </label>
          </div>
          <div className="doc-folders" aria-label="Ordner">
            <FolderChip on={!folder} label="Alle" n={all.length} onClick={() => q.set({ ordner: null })} />
            {folders.map((f) => (
              <FolderChip key={f} on={folder === f} label={f} n={all.filter((r) => r.folder === f).length} onClick={() => q.set({ ordner: f })} onRemove={own.includes(f) && folder === f && !all.some((r) => r.folder === f) ? () => dropFolder(f) : undefined} />
            ))}
            <FolderChip on={folder === REPORT_FOLDER} label={REPORT_FOLDER} n={all.filter((r) => r.report).length} locked onClick={() => q.set({ ordner: REPORT_FOLDER })} />
            <button type="button" className="doc-folder add" onClick={() => setNewFolder(true)}>
              <FolderPlus size={14} /> Ordner
            </button>
          </div>
          {folder === REPORT_FOLDER && <p className="hint doc-hint">Freigegebene Bautagesberichte, Regiescheine und Serviceberichte erscheinen hier automatisch als PDF. Sie lassen sich hier nicht ändern oder löschen.</p>}
          {rows.length ? (
            <div className="table-scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <SortHead k="name" sort={sort} onSort={setSort}>
                      Name
                    </SortHead>
                    <SortHead k="folder" sort={sort} onSort={setSort}>
                      Ordner
                    </SortHead>
                    <SortHead k="size" sort={sort} onSort={setSort} className="num">
                      Größe
                    </SortHead>
                    <SortHead k="at" sort={sort} onSort={setSort}>
                      Abgelegt
                    </SortHead>
                    <th className="ui-table-head" aria-label="Aktionen" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="ui-table-row clickable" onClick={() => setOpen(r.file)}>
                      <td className="ui-table-cell">
                        <div className="doc-name">
                          <FileThumb f={r.file} onOpen={() => setOpen(r.file)} />
                          <div className="point-cell">
                            <strong>{r.name}</strong>
                            {r.report && (
                              <small>
                                {KIND_LABEL[r.report.kind]} {r.report.no} ·{" "}
                                <Link href={`/berichte/${r.report.id}`} onClick={(e) => e.stopPropagation()}>
                                  Bericht öffnen
                                </Link>
                              </small>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                        {r.doc ? (
                          <Select value={r.folder} aria-label={`Ordner von ${r.name}`} className="filter-select" onChange={(e) => (save("docs", { ...r.doc!, folder: e.target.value }), notify(`Nach „${e.target.value}“ verschoben`))}>
                            {folders.map((f) => (
                              <option key={f} value={f}>
                                {f}
                              </option>
                            ))}
                          </Select>
                        ) : (
                          <span className="muted">{REPORT_FOLDER}</span>
                        )}
                      </td>
                      <td className="ui-table-cell num nowrap">{fmtSize(r.size)}</td>
                      <td className="ui-table-cell">
                        <div className="point-cell">
                          <strong>{personName(data, r.by) || "–"}</strong>
                          <small>{fmtDateTime(r.at)}</small>
                        </div>
                      </td>
                      <td className="ui-table-cell num nowrap" onClick={(e) => e.stopPropagation()}>
                        <IconButton label="Herunterladen" size="sm" variant="ghost" onClick={() => void download(r)}>
                          <Download size={14} />
                        </IconButton>
                        {r.doc && (
                          <IconButton label="Löschen" size="sm" variant="ghost" onClick={() => void drop(r.doc!)}>
                            <Trash2 size={14} />
                          </IconButton>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-body">
              <Empty
                inline
                icon={folder === REPORT_FOLDER ? <FileText size={26} /> : <Upload size={26} />}
                title={t ? "Nichts gefunden" : folder === REPORT_FOLDER ? "Noch keine freigegebenen Berichte" : "Noch keine Dateien"}
                text={t ? "Suchbegriff anpassen." : folder === REPORT_FOLDER ? "Sobald ein Bericht freigegeben ist, liegt sein PDF hier." : `Dateien hierher ziehen oder „Hochladen“ – sie landen in „${target}“.`}
                action={
                  !t && folder !== REPORT_FOLDER ? (
                    <Button variant="secondary" leftIcon={<Upload size={15} />} onClick={() => input.current?.click()}>
                      Hochladen
                    </Button>
                  ) : undefined
                }
              />
            </div>
          )}
          {drag && <div className="doc-drop">Loslassen zum Ablegen in „{target}“</div>}
        </section>
      </div>
      {open && <FilePreview f={open} onClose={() => setOpen(null)} />}
      {newFolder && (
        <NewFolder
          taken={[...folders, REPORT_FOLDER]}
          onClose={() => setNewFolder(false)}
          onCreate={(name) => {
            setNewFolder(false);
            setFolders([...own, name]);
            q.set({ ordner: name });
            notify(`Ordner „${name}“ angelegt`);
          }}
        />
      )}
    </div>
  );
}

function FolderChip({ on, label, n, locked, onClick, onRemove }: { on: boolean; label: string; n: number; locked?: boolean; onClick: () => void; onRemove?: () => void }) {
  return (
    <span className={cn("doc-folder", on && "on")}>
      <button type="button" aria-pressed={on} onClick={onClick}>
        {locked ? <FolderLock size={14} /> : <Folder size={14} />}
        {label}
        {n > 0 && <small>{n}</small>}
      </button>
      {onRemove && (
        <button type="button" className="doc-folder-x" aria-label={`Ordner ${label} entfernen`} title="Leeren Ordner entfernen" onClick={onRemove}>
          <X size={12} />
        </button>
      )}
    </span>
  );
}

function NewFolder({ taken, onClose, onCreate }: { taken: string[]; onClose: () => void; onCreate: (name: string) => void }) {
  const [name, setName] = useState("");
  const v = name.trim();
  const dup = taken.some((f) => f.toLowerCase() === v.toLowerCase());
  return (
    <Modal
      title="Ordner anlegen"
      onClose={onClose}
      onSubmit={() => v && !dup && onCreate(v)}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!v || dup}>
            Anlegen
          </Button>
        </>
      }
    >
      <Field label="Name" error={dup ? "Diesen Ordner gibt es schon." : undefined}>
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="z. B. Brandschutz, Abnahme, Fotos Rohbau" maxLength={60} />
      </Field>
    </Modal>
  );
}

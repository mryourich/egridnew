"use client";

import { Download, Eye, FileText, Image as ImageIcon, Trash2, Upload } from "lucide-react";
import { useRef, useState } from "react";
import { download, readAttachment } from "@/core/files";
import { DOC_KIND, DOC_STATUS, fmtSize, fmtWhen } from "@/core/format";
import { now, personName, uid, useStore } from "@/core/store";
import type { Attachment, DocumentKind, DocumentStatus, Project } from "@/core/types";
import { Button, Empty, Menu, PageHead, SearchBox, Seg } from "@/core/ui";
import { Lightbox } from "./attachments";
import { access } from "./model";

/** Plans, protocols and photo documentation of a project. */
export function Documents({ project: p }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const { work, manage } = access(data, p);
  const input = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<DocumentKind | "alle">("alle");
  const [uploadKind, setUploadKind] = useState<DocumentKind>("file");
  const [q, setQ] = useState("");
  const [view, setView] = useState<Attachment | null>(null);
  const [busy, setBusy] = useState(false);
  const all = data.documents.filter((d) => d.projectId === p.id);
  const term = q.trim().toLowerCase();
  const list = all.filter((d) => (kind === "alle" || d.kind === kind) && (!term || d.name.toLowerCase().includes(term))).sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    for (const f of Array.from(files)) {
      try {
        const file = await readAttachment(f, data.meId);
        const name = f.name.replace(/\.[^.]+$/, "");
        save("documents", { id: uid(), projectId: p.id, name, kind: file.kind === "photo" && uploadKind === "file" ? "photo" : uploadKind, status: "draft", file, createdBy: data.meId, createdAt: now() }, `Dokument „${name}“ hochgeladen`);
      } catch (e) {
        notify(e instanceof Error ? e.message : "Datei konnte nicht gelesen werden.");
      }
    }
    setBusy(false);
  };
  const open = (a: Attachment) => {
    if (a.kind === "photo") return setView(a);
    if (a.mime === "application/pdf" || a.url.startsWith("/")) return window.open(a.url, "_blank", "noopener");
    download(a);
  };

  return (
    <div className="page">
      <PageHead kicker="Dokumente" title="Dokumente" sub="Pläne, Protokolle, Fotos – mit Freigabestatus.">
        {work && (
          <>
            <select className="select-sm" value={uploadKind} onChange={(e) => setUploadKind(e.target.value as DocumentKind)} aria-label="Art">
              {(Object.keys(DOC_KIND) as DocumentKind[]).map((k) => (
                <option key={k} value={k}>
                  als {DOC_KIND[k]}
                </option>
              ))}
            </select>
            <Button variant="primary" icon={<Upload size={15} />} onClick={() => input.current?.click()} disabled={busy}>
              {busy ? "Lädt …" : "Hochladen"}
            </Button>
            <input ref={input} type="file" multiple hidden onChange={(e) => (upload(e.target.files), (e.target.value = ""))} />
          </>
        )}
      </PageHead>

      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Dokument suchen…" />
        <Seg<DocumentKind | "alle">
          value={kind}
          onChange={setKind}
          options={[{ value: "alle" as const, label: <>Alle <small>{all.length}</small></> }, ...(Object.keys(DOC_KIND) as DocumentKind[]).filter((k) => all.some((d) => d.kind === k)).map((k) => ({ value: k, label: <>{DOC_KIND[k]} <small>{all.filter((d) => d.kind === k).length}</small></> }))]}
        />
      </div>

      {list.length === 0 ? (
        <Empty title={all.length ? "Nichts in dieser Ansicht." : "Noch keine Dokumente."} action={work && !all.length ? <Button variant="primary" icon={<Upload size={15} />} onClick={() => input.current?.click()}>Erstes Dokument hochladen</Button> : undefined} />
      ) : (
        <div className="panel">
          <table className="table">
            <thead>
              <tr>
                <th>Dokument</th>
                <th className="hide-sm">Art</th>
                <th>Status</th>
                <th className="hide-md">Hochgeladen</th>
                <th className="num hide-sm">Größe</th>
                <th className="w-menu" />
              </tr>
            </thead>
            <tbody>
              {list.map((d) => (
                <tr key={d.id}>
                  <td>
                    <button type="button" className="doc-cell" onClick={() => open(d.file)}>
                      {d.file.kind === "photo" ? <img src={d.file.url} alt="" /> : <span className="doc-ic">{d.file.mime.startsWith("image/") ? <ImageIcon size={16} /> : <FileText size={16} />}</span>}
                      <span>
                        <strong>{d.name}</strong>
                        <small>{d.file.name}</small>
                      </span>
                    </button>
                  </td>
                  <td className="hide-sm">{DOC_KIND[d.kind]}</td>
                  <td>
                    <select className={`status-select doc-${d.status}`} value={d.status} disabled={!manage} onChange={(e) => save("documents", { ...d, status: e.target.value as DocumentStatus }, `„${d.name}“: ${DOC_STATUS[e.target.value as DocumentStatus].label}`)} aria-label="Status">
                      {(Object.keys(DOC_STATUS) as DocumentStatus[]).map((s) => (
                        <option key={s} value={s}>
                          {DOC_STATUS[s].label}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="hide-md muted">
                    {personName(data, d.createdBy)} · {fmtWhen(d.createdAt)}
                  </td>
                  <td className="num hide-sm muted">{fmtSize(d.file.size)}</td>
                  <td className="w-menu">
                    <Menu
                      items={[
                        { label: "Ansehen", icon: <Eye size={14} />, onClick: () => open(d.file) },
                        { label: "Herunterladen", icon: <Download size={14} />, onClick: () => download(d.file) },
                        "-",
                        { label: "Löschen", icon: <Trash2 size={14} />, danger: true, disabled: !(manage || d.createdBy === data.meId), onClick: () => window.confirm(`„${d.name}“ löschen?`) && remove("documents", d.id, `Dokument „${d.name}“ gelöscht`) }
                      ]}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {view && <Lightbox a={view} onClose={() => setView(null)} />}
    </div>
  );
}

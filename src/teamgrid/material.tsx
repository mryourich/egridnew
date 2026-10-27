"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { fmtWhen } from "@/core/format";
import { now, personName, uid, useStore } from "@/core/store";
import type { Material, MaterialStatus, Project } from "@/core/types";
import { Button, PageHead, SearchBox } from "@/core/ui";
import { access } from "./model";

export const MATERIAL_STATUS: Record<MaterialStatus, string> = { open: "Offen", ordered: "Bestellt", arrived: "Angekommen" };
const COLUMNS: MaterialStatus[] = ["open", "ordered", "arrived"];

/** Shared order list of a project: open → ordered → arrived. Article numbers are remembered. */
export function MaterialList({ project: p }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const { manage, work } = access(data, p);
  const [artNo, setArtNo] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("Stk");
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  /** Workers may correct their own entries while nothing is ordered yet. */
  const editable = (m: Material) => manage || (work && m.status === "open" && m.createdBy === data.meId);
  const list = data.materials.filter((m) => m.projectId === p.id && (!q || `${m.artNo} ${m.name} ${m.note}`.toLowerCase().includes(q)));

  const remember = (no: string, n: string, u: string) => {
    const nr = no.trim();
    if (!nr || !n.trim()) return;
    const known = data.articles.find((a) => a.artNo === nr);
    if (!known) save("articles", { id: uid(), artNo: nr, name: n.trim(), unit: u || "Stk" });
    else if (known.name !== n.trim() || known.unit !== u) save("articles", { ...known, name: n.trim(), unit: u || known.unit });
  };
  const pickArt = (no: string) => {
    setArtNo(no);
    const a = data.articles.find((x) => x.artNo === no.trim());
    if (a) (setName(a.name), setUnit(a.unit));
  };
  const add = () => {
    if (!name.trim()) return;
    const item: Material = { id: uid(), projectId: p.id, artNo: artNo.trim(), name: name.trim(), qty: Number(qty.replace(",", ".")) || 1, unit: unit.trim() || "Stk", status: "open", note: "", createdBy: data.meId, createdAt: now() };
    save("materials", item, `Material angefordert: ${item.qty} ${item.unit} ${item.name}`);
    remember(item.artNo, item.name, item.unit);
    notify(`${item.name} hinzugefügt`);
    setArtNo("");
    setName("");
    setQty("");
    setUnit("Stk");
  };
  const update = (m: Material, patch: Partial<Material>) => {
    const next = { ...m, ...patch };
    if (JSON.stringify(next) === JSON.stringify(m)) return;
    save("materials", next, patch.status ? `${m.name}: ${MATERIAL_STATUS[patch.status]}` : undefined);
    if (patch.artNo !== undefined || patch.name !== undefined) remember(next.artNo, next.name, next.unit);
  };

  return (
    <div className="page">
      <PageHead kicker="Material" title="Material" sub="Gemeinsame Bestell-Liste des Projekts: offen → bestellt → angekommen.">
        <SearchBox value={query} onChange={setQuery} placeholder="Material suchen…" />
      </PageHead>

      {work && (
        <form className="panel quick-add mat-add" onSubmit={(e) => (e.preventDefault(), add())}>
          <datalist id="mat-articles">
            {data.articles.map((a) => (
              <option key={a.id} value={a.artNo}>
                {a.name}
              </option>
            ))}
          </datalist>
          <input list="mat-articles" value={artNo} onChange={(e) => pickArt(e.target.value)} placeholder="Art.-Nr." aria-label="Artikelnummer" className="mat-art" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Material, z. B. Kabelschuh 50/M10" aria-label="Material" className="mat-name" />
          <input inputMode="decimal" value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Menge" aria-label="Menge" className="mat-qty" />
          <input value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Einheit" className="mat-unit" />
          <Button type="submit" variant="primary" icon={<Plus size={15} />} disabled={!name.trim()}>
            Hinzufügen
          </Button>
          <small className="mat-hint">Artikel mit Art.-Nr. merkt sich VYSNER – beim nächsten Mal genügt die Nummer.{!manage && " Den Status (bestellt / angekommen) setzt die Projekt- bzw. Bauleitung."}</small>
        </form>
      )}

      <div className="mat-board">
        {COLUMNS.map((col) => {
          const items = list.filter((m) => m.status === col).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <section key={col} className={`panel mat-col mat-${col}`}>
              <header>
                <strong>{MATERIAL_STATUS[col]}</strong>
                <em>{items.length}</em>
              </header>
              {items.map((m) => {
                const edit = editable(m);
                return (
                  <article key={m.id} className="mat-card">
                    <input key={`n${m.name}`} className="mat-title" defaultValue={m.name} readOnly={!edit} onBlur={(e) => e.target.value.trim() && update(m, { name: e.target.value.trim() })} aria-label="Material" />
                    <div className="mat-row">
                      <label>
                        <span>Art.-Nr.</span>
                        <input key={`a${m.artNo}`} defaultValue={m.artNo} readOnly={!edit} onBlur={(e) => update(m, { artNo: e.target.value.trim() })} />
                      </label>
                      <label className="mat-q">
                        <span>Menge</span>
                        <input key={`q${m.qty}`} inputMode="decimal" defaultValue={String(m.qty).replace(".", ",")} readOnly={!edit} onBlur={(e) => update(m, { qty: Number(e.target.value.replace(",", ".")) || m.qty })} />
                        <small>{m.unit}</small>
                      </label>
                    </div>
                    <small className="mat-trail">
                      Angefordert von {personName(data, m.createdBy) || "–"} · {fmtWhen(m.createdAt)}
                      {m.status !== "open" && m.updatedBy && ` · ${MATERIAL_STATUS[m.status]}: ${personName(data, m.updatedBy)} ${fmtWhen(m.updatedAt)}`}
                    </small>
                    <div className="mat-actions">
                      {manage ? (
                        COLUMNS.map((st) => (
                          <button key={st} type="button" className={m.status === st ? "on" : ""} onClick={() => update(m, { status: st })}>
                            {MATERIAL_STATUS[st]}
                          </button>
                        ))
                      ) : (
                        <span className="mat-locked">{MATERIAL_STATUS[m.status]}</span>
                      )}
                      {edit && (
                        <button type="button" className="mat-del" aria-label="Entfernen" title="Entfernen" onClick={() => window.confirm(`${m.name} entfernen?`) && remove("materials", m.id, `Material ${m.name} entfernt`)}>
                          <X size={13} />
                        </button>
                      )}
                    </div>
                  </article>
                );
              })}
              {items.length === 0 && <p className="mat-empty">Nichts {col === "open" ? "offen" : col === "ordered" ? "bestellt" : "angekommen"}.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

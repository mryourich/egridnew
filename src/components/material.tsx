"use client";

import { Plus, X } from "lucide-react";
import { useState } from "react";
import { today } from "@/lib/date";
import * as L from "@/lib/labels";
import { canDelete, uid, useStore } from "@/lib/store";
import type { Material, MaterialStatus, Project } from "@/lib/types";
import { SearchInput } from "./ui";

const COLUMNS: MaterialStatus[] = ["offen", "bestellt", "angekommen"];

/** Shared order list of a project: open → ordered → arrived. Article numbers are remembered. */
export function MaterialSection({ project }: { project: Project }) {
  const { data, save, remove, notify } = useStore();
  const [artNo, setArtNo] = useState("");
  const [name, setName] = useState("");
  const [qty, setQty] = useState("");
  const [unit, setUnit] = useState("Stk");
  const [query, setQuery] = useState("");
  const q = query.toLowerCase();
  const list = data.materials.filter((m) => m.projectId === project.id && (!q || `${m.artNo} ${m.name}`.toLowerCase().includes(q)));

  const remember = (no: string, n: string, u: string) => {
    const nr = no.trim();
    if (!nr || !n.trim()) return;
    const known = data.articles.find((a) => a.artNo === nr);
    if (!known) save("articles", { id: uid("ar"), artNo: nr, name: n.trim(), unit: u || "Stk" });
    else if (known.name !== n.trim() || known.unit !== u) save("articles", { ...known, name: n.trim(), unit: u || known.unit });
  };

  const pickArt = (no: string) => {
    setArtNo(no);
    const a = data.articles.find((x) => x.artNo === no.trim());
    if (a) {
      setName(a.name);
      setUnit(a.unit);
    }
  };

  const add = () => {
    if (!name.trim()) return;
    const item: Material = { id: uid("m"), projectId: project.id, artNo: artNo.trim(), name: name.trim(), qty: Number(qty) || 1, unit: unit || "Stk", status: "offen", createdAt: today() };
    save("materials", item, `Material ${item.name}`);
    remember(item.artNo, item.name, item.unit);
    notify(`${item.name} hinzugefügt`);
    setArtNo("");
    setName("");
    setQty("");
    setUnit("Stk");
  };

  const update = (m: Material, patch: Partial<Material>) => {
    const next = { ...m, ...patch };
    save("materials", next);
    if (patch.artNo !== undefined || patch.name !== undefined) remember(next.artNo, next.name, next.unit);
  };

  return (
    <div className="stack">
      <form
        className="card mat-add"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <datalist id="mat-articles">
          {data.articles.map((a) => (
            <option key={a.id} value={a.artNo}>
              {a.name}
            </option>
          ))}
        </datalist>
        <input list="mat-articles" value={artNo} onChange={(e) => pickArt(e.target.value)} placeholder="Art.-Nr." aria-label="Artikelnummer" className="mat-art" />
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Material / Bestellung" aria-label="Material" className="mat-name" />
        <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} placeholder="Menge" aria-label="Menge" className="mat-qty" />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Einheit" className="mat-unit" />
        <button type="submit" className="btn btn-primary" disabled={!name.trim()}>
          <Plus size={15} /> Hinzufügen
        </button>
        <p className="mat-hint">Artikel mit Art.-Nr. merkt sich VYSNpro – beim nächsten Mal genügt die Nummer.</p>
      </form>

      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Material suchen…" />
      </div>

      <div className="mat-board">
        {COLUMNS.map((col) => {
          const items = list.filter((m) => m.status === col).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
          return (
            <section key={col} className={`mat-col mat-${col}`}>
              <header>
                <strong>{L.materialStatus[col].label}</strong>
                <em>{items.length}</em>
              </header>
              {items.map((m) => (
                <article key={m.id} className="mat-card">
                  <input className="mat-title" value={m.name} onChange={(e) => update(m, { name: e.target.value })} aria-label="Material" />
                  <div className="mat-row">
                    <label>
                      <span>Art.-Nr.</span>
                      <input value={m.artNo} onChange={(e) => update(m, { artNo: e.target.value })} />
                    </label>
                    <label className="mat-q">
                      <span>Menge</span>
                      <input type="number" min={0} value={m.qty} onChange={(e) => update(m, { qty: Number(e.target.value) })} />
                      <small>{m.unit}</small>
                    </label>
                  </div>
                  <div className="mat-actions">
                    {COLUMNS.map((st) => (
                      <button key={st} type="button" className={m.status === st ? "on" : ""} onClick={() => update(m, { status: st })}>
                        {L.materialStatus[st].label}
                      </button>
                    ))}
                    {canDelete(data) && (
                      <button type="button" className="mat-del" aria-label="Entfernen" onClick={() => window.confirm(`${m.name} entfernen?`) && remove("materials", m.id, `Material ${m.name} entfernt`)}>
                        <X size={13} />
                      </button>
                    )}
                  </div>
                </article>
              ))}
              {items.length === 0 && <p className="mat-empty">Nichts {col === "offen" ? "offen" : col === "bestellt" ? "bestellt" : "angekommen"}.</p>}
            </section>
          );
        })}
      </div>
    </div>
  );
}

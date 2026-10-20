"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { today } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import type { Material, MaterialStatus } from "@/lib/types";
import { canPlan, canRemove } from "./access";
import { Empty } from "./kit";

const STATUS: Record<MaterialStatus, { label: string; next: MaterialStatus }> = {
  offen: { label: "zu bestellen", next: "bestellt" },
  bestellt: { label: "bestellt", next: "angekommen" },
  angekommen: { label: "geliefert", next: "offen" }
};
const ORDER: MaterialStatus[] = ["offen", "bestellt", "angekommen"];

/** What is needed on the site – everybody writes it down, the office orders. */
export function MaterialList({ projectId }: { projectId: string }) {
  const { data, save, remove } = useStore();
  const [qty, setQty] = useState("1");
  const [unit, setUnit] = useState("Stk");
  const [name, setName] = useState("");
  const changer = canPlan(data);
  const list = data.materials.filter((m) => m.projectId === projectId).sort((a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status) || a.name.localeCompare(b.name, "de"));

  const add = () => {
    if (!name.trim()) return;
    const item: Material = { id: uid("m"), projectId, artNo: "", name: name.trim(), qty: Number(qty) || 1, unit: unit.trim() || "Stk", status: "offen", createdAt: today() };
    save("materials", item, `Material ${item.qty} ${item.unit} ${item.name} angefordert`);
    setName("");
    setQty("1");
  };

  return (
    <div className="v-tab">
      <form
        className="v-add mat"
        onSubmit={(e) => {
          e.preventDefault();
          add();
        }}
      >
        <input type="number" min={0} value={qty} onChange={(e) => setQty(e.target.value)} aria-label="Menge" />
        <input value={unit} onChange={(e) => setUnit(e.target.value)} aria-label="Einheit" list="v-units" />
        <datalist id="v-units">
          {["Stk", "m", "kg", "Pkg", "Rolle", "l", "m²"].map((u) => (
            <option key={u} value={u} />
          ))}
        </datalist>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Was wird gebraucht?" aria-label="Material" />
        <button type="submit" className="v-btn primary" disabled={!name.trim()}>
          Hinzufügen
        </button>
      </form>
      {list.length === 0 ? (
        <Empty>Noch kein Material eingetragen.</Empty>
      ) : (
        <ul className="v-card v-list">
          {list.map((m) => (
            <li key={m.id} className={m.status === "angekommen" ? "done" : ""}>
              <span className="v-qty">
                {m.qty} {m.unit}
              </span>
              <span className="v-list-main">
                <strong>{m.name}</strong>
              </span>
              {changer ? (
                <button type="button" className={`v-chip s-${m.status}`} onClick={() => save("materials", { ...m, status: STATUS[m.status].next }, `${m.name}: ${STATUS[STATUS[m.status].next].label}`)} title="Antippen = nächster Stand">
                  {STATUS[m.status].label}
                </button>
              ) : (
                <span className={`v-chip s-${m.status}`}>{STATUS[m.status].label}</span>
              )}
              {canRemove(data) && (
                <button type="button" className="v-icon" onClick={() => remove("materials", m.id, `${m.name} entfernt`)} aria-label="Entfernen">
                  <X size={16} />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

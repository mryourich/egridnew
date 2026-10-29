"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, IconButton, Input, Select } from "@/components/ui";
import { fmtEuro, fmtNum, parseNum } from "@/lib/format";
import { hoursOf } from "@/lib/pdf/report-pdf";
import { uid } from "@/lib/store/id";
import { useStore } from "@/lib/store/store";
import type { DeviceLine, MaterialLine, WorkLine } from "@/lib/store/types";

const num = (v: string, fallback = 0) => {
  const n = parseNum(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
};

/** Staff with date, from–to and break; hours are computed. */
export function WorkLines({ value, onChange, date, prices, readOnly }: { value: WorkLine[]; onChange: (v: WorkLine[]) => void; date: string; prices?: boolean; readOnly?: boolean }) {
  const { data } = useStore();
  const set = (i: number, patch: Partial<WorkLine>) => onChange(value.map((w, j) => (j === i ? { ...w, ...patch } : w)));
  const total = value.reduce((s, w) => s + hoursOf(w), 0);
  return (
    <div className="lines">
      <table className="ui-table lines-table">
        <thead>
          <tr>
            <th className="ui-table-head">Name</th>
            <th className="ui-table-head" title="Im PDF steht die Funktion">Funktion (im PDF)</th>
            <th className="ui-table-head">Datum</th>
            <th className="ui-table-head">von</th>
            <th className="ui-table-head">bis</th>
            <th className="ui-table-head num">Pause (min)</th>
            <th className="ui-table-head num">Std.</th>
            {prices && <th className="ui-table-head num">Satz €/h</th>}
            {!readOnly && <th className="ui-table-head" aria-label="Entfernen" />}
          </tr>
        </thead>
        <tbody>
          {value.map((w, i) => (
            <tr key={w.id} className="ui-table-row">
              <td className="ui-table-cell">
                {readOnly ? (
                  w.name
                ) : (
                  <Select value={w.personId || "_"} aria-label="Person" onChange={(e) => set(i, e.target.value === "_" ? { personId: "" } : { personId: e.target.value, name: data.people.find((p) => p.id === e.target.value)?.name ?? "" })}>
                    <option value="_">{w.personId ? "" : w.name || "Person wählen"}</option>
                    {data.people
                      .filter((p) => p.active || p.id === w.personId)
                      .sort((a, b) => a.name.localeCompare(b.name, "de"))
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                        </option>
                      ))}
                  </Select>
                )}
              </td>
              <td className="ui-table-cell muted nowrap">{data.people.find((p) => p.id === w.personId)?.role || "–"}</td>
              <td className="ui-table-cell">{readOnly ? w.date : <Input type="date" value={w.date} aria-label="Datum" onChange={(e) => set(i, { date: e.target.value })} />}</td>
              <td className="ui-table-cell">{readOnly ? w.from : <Input type="time" value={w.from} aria-label="von" onChange={(e) => set(i, { from: e.target.value })} />}</td>
              <td className="ui-table-cell">{readOnly ? w.to : <Input type="time" value={w.to} aria-label="bis" onChange={(e) => set(i, { to: e.target.value })} />}</td>
              <td className="ui-table-cell num">{readOnly ? w.pause : <Input key={w.pause} defaultValue={String(w.pause)} inputMode="numeric" aria-label="Pause in Minuten" className="num" onBlur={(e) => set(i, { pause: Math.round(num(e.target.value)) })} />}</td>
              <td className="ui-table-cell num">{fmtNum(hoursOf(w))}</td>
              {prices && <td className="ui-table-cell num">{readOnly ? (w.rate ? fmtEuro(w.rate) : "") : <Input key={w.rate} defaultValue={w.rate ? String(w.rate).replace(".", ",") : ""} inputMode="decimal" aria-label="Stundensatz" className="num" onBlur={(e) => set(i, { rate: num(e.target.value) || undefined })} />}</td>}
              {!readOnly && (
                <td className="ui-table-cell">
                  <IconButton label="Zeile entfernen" size="sm" variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </IconButton>
                </td>
              )}
            </tr>
          ))}
          <tr className="ui-table-row">
            <td className="ui-table-cell muted" colSpan={6}>
              {value.length} {value.length === 1 ? "Person" : "Personen"}
            </td>
            <td className="ui-table-cell num">
              <strong>{fmtNum(total)}</strong>
            </td>
            <td className="ui-table-cell" colSpan={(prices ? 1 : 0) + (readOnly ? 0 : 1)} />
          </tr>
        </tbody>
      </table>
      {!readOnly && (
        <Button type="button" size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => onChange([...value, { id: uid(), personId: "", name: "", date, from: "07:00", to: "16:00", pause: 30 }])}>
          Person
        </Button>
      )}
    </div>
  );
}

export function MaterialLines({ value, onChange, prices, readOnly }: { value: MaterialLine[]; onChange: (v: MaterialLine[]) => void; prices?: boolean; readOnly?: boolean }) {
  const set = (i: number, patch: Partial<MaterialLine>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="lines">
      <table className="ui-table lines-table">
        <thead>
          <tr>
            <th className="ui-table-head">Material</th>
            <th className="ui-table-head num">Menge</th>
            <th className="ui-table-head">Einheit</th>
            {prices && <th className="ui-table-head num">Preis €</th>}
            {!readOnly && <th className="ui-table-head" aria-label="Entfernen" />}
          </tr>
        </thead>
        <tbody>
          {value.map((m, i) => (
            <tr key={m.id} className="ui-table-row">
              <td className="ui-table-cell">{readOnly ? m.name : <Input key={m.name} defaultValue={m.name} aria-label="Material" placeholder="Bezeichnung" list="material-names" onBlur={(e) => set(i, { name: e.target.value.trim() })} />}</td>
              <td className="ui-table-cell num">{readOnly ? fmtNum(m.qty) : <Input key={m.qty} defaultValue={String(m.qty).replace(".", ",")} inputMode="decimal" className="num" aria-label="Menge" onBlur={(e) => set(i, { qty: num(e.target.value, m.qty) })} />}</td>
              <td className="ui-table-cell">{readOnly ? m.unit : <Input key={m.unit} defaultValue={m.unit} aria-label="Einheit" list="report-units" onBlur={(e) => set(i, { unit: e.target.value.trim() })} />}</td>
              {prices && <td className="ui-table-cell num">{readOnly ? (m.price ? fmtEuro(m.price) : "") : <Input key={m.price} defaultValue={m.price ? String(m.price).replace(".", ",") : ""} inputMode="decimal" className="num" aria-label="Preis" onBlur={(e) => set(i, { price: num(e.target.value) || undefined })} />}</td>}
              {!readOnly && (
                <td className="ui-table-cell">
                  <IconButton label="Zeile entfernen" size="sm" variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </IconButton>
                </td>
              )}
            </tr>
          ))}
          {!value.length && (
            <tr className="ui-table-row">
              <td className="ui-table-cell muted" colSpan={5}>
                Kein Material
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <Button type="button" size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => onChange([...value, { id: uid(), name: "", qty: 1, unit: "Stk" }])}>
          Material
        </Button>
      )}
      <datalist id="report-units">
        {["Stk", "m", "m²", "m³", "kg", "l", "Pkg", "pausch", "h"].map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
    </div>
  );
}

export function DeviceLines({ value, onChange, prices, readOnly }: { value: DeviceLine[]; onChange: (v: DeviceLine[]) => void; prices?: boolean; readOnly?: boolean }) {
  const set = (i: number, patch: Partial<DeviceLine>) => onChange(value.map((m, j) => (j === i ? { ...m, ...patch } : m)));
  return (
    <div className="lines">
      <table className="ui-table lines-table">
        <thead>
          <tr>
            <th className="ui-table-head">Gerät</th>
            <th className="ui-table-head num">Stunden</th>
            {prices && <th className="ui-table-head num">Satz €/h</th>}
            {!readOnly && <th className="ui-table-head" aria-label="Entfernen" />}
          </tr>
        </thead>
        <tbody>
          {value.map((g, i) => (
            <tr key={g.id} className="ui-table-row">
              <td className="ui-table-cell">{readOnly ? g.name : <Input key={g.name} defaultValue={g.name} aria-label="Gerät" placeholder="z. B. Kernbohrgerät" onBlur={(e) => set(i, { name: e.target.value.trim() })} />}</td>
              <td className="ui-table-cell num">{readOnly ? fmtNum(g.hours) : <Input key={g.hours} defaultValue={String(g.hours).replace(".", ",")} inputMode="decimal" className="num" aria-label="Stunden" onBlur={(e) => set(i, { hours: num(e.target.value, g.hours) })} />}</td>
              {prices && <td className="ui-table-cell num">{readOnly ? (g.rate ? fmtEuro(g.rate) : "") : <Input key={g.rate} defaultValue={g.rate ? String(g.rate).replace(".", ",") : ""} inputMode="decimal" className="num" aria-label="Satz" onBlur={(e) => set(i, { rate: num(e.target.value) || undefined })} />}</td>}
              {!readOnly && (
                <td className="ui-table-cell">
                  <IconButton label="Zeile entfernen" size="sm" variant="danger" onClick={() => onChange(value.filter((_, j) => j !== i))}>
                    <Trash2 size={13} />
                  </IconButton>
                </td>
              )}
            </tr>
          ))}
          {!value.length && (
            <tr className="ui-table-row">
              <td className="ui-table-cell muted" colSpan={4}>
                Keine Geräte
              </td>
            </tr>
          )}
        </tbody>
      </table>
      {!readOnly && (
        <Button type="button" size="sm" variant="secondary" leftIcon={<Plus size={14} />} onClick={() => onChange([...value, { id: uid(), name: "", hours: 1 }])}>
          Gerät
        </Button>
      )}
    </div>
  );
}

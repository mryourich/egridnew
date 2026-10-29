"use client";

import { AlertTriangle, Barcode, Download, Minus, Package, Plus, Printer, ScanLine, Search, Trash2 } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { BlurInput, BlurTextarea, Empty, Field, Modal, PageHead, SidePanel, SortHead, StatusBadge, useConfirm } from "@/components/app/kit";
import { Button, Checkbox, IconButton, Input, Select, Switch } from "@/components/ui";
import { fmtDateTime, fmtNum, parseNum } from "@/lib/format";
import { activeSites, inSite, now, personName, siteName, uid, useStore } from "@/lib/store/store";
import type { MaterialItem } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { svg128, validCode128 } from "./code128";
import { ScanDialog } from "./scanner";

type SortKey = "name" | "qty" | "supplier" | "site" | "status";
const UNITS = ["Stk", "m", "m²", "m³", "kg", "l", "Pkg", "Rolle", "Kartusche", "Sack", "Palette"];

const low = (m: MaterialItem) => m.qty < m.minQty;
const withOrdered = (m: MaterialItem, ordered: boolean): MaterialItem => ({ ...m, ordered, orderedAt: ordered ? now() : undefined });

/** Next internal code for items without a manufacturer barcode. */
function nextCode(items: MaterialItem[]) {
  const n = Math.max(0, ...items.map((m) => (/^VY-(\d+)$/.exec(m.barcode)?.[1] ? Number(/^VY-(\d+)$/.exec(m.barcode)![1]) : 0)));
  return `VY-${String(n + 1).padStart(6, "0")}`;
}

/** Stock per site: barcode labels, scanning, ordered / not ordered, warning below the minimum. */
export function Material() {
  const { data, save, siteId, notify } = useStore();
  const q = useQuery();
  const [term, setTerm] = useState("");
  const [ordered, setOrdered] = useState<"" | "ja" | "nein">("");
  const [supplier, setSupplier] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "status", dir: 1 });
  const [scanning, setScanning] = useState(false);
  const [creating, setCreating] = useState<{ barcode?: string } | null>(null);
  const onlyLow = q.get("filter") === "unter";
  const openId = q.get("artikel");

  const scoped = data.materials.filter(inSite(siteId));
  const suppliers = [...new Set(scoped.map((m) => m.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
  const t = term.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = scoped.filter(
      (m) => (!onlyLow || low(m)) && (!ordered || (ordered === "ja") === m.ordered) && (!supplier || m.supplier === supplier) && (!t || [m.name, m.artNo, m.barcode, m.supplier, m.note, siteName(data, m.siteId)].join(" ").toLowerCase().includes(t))
    );
    // warnings first, then by name
    const val = (m: MaterialItem): string | number =>
      sort.key === "qty" ? m.qty : sort.key === "supplier" ? m.supplier.toLowerCase() || "zzz" : sort.key === "site" ? siteName(data, m.siteId).toLowerCase() : sort.key === "status" ? (low(m) ? (m.ordered ? 1 : 0) : 2) * 1e6 + m.name.toLowerCase().charCodeAt(0) : m.name.toLowerCase();
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.name.localeCompare(b.name, "de");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, siteId, onlyLow, ordered, supplier, t, sort]);
  const lowCount = scoped.filter(low).length;

  const found = useCallback(
    (code: string) => {
      setScanning(false);
      const hit = data.materials.find((m) => m.barcode === code && (!siteId || m.siteId === siteId)) ?? data.materials.find((m) => m.barcode === code || m.artNo === code);
      if (hit) {
        q.set({ artikel: hit.id });
        notify(`Gefunden: ${hit.name}${hit.siteId !== siteId && siteId ? ` (${siteName(data, hit.siteId)})` : ""}`);
      } else {
        notify(`Barcode ${code} ist noch keinem Artikel zugeordnet.`);
        setCreating({ barcode: code });
      }
    },
    [data, siteId, q, notify]
  );

  const step = (m: MaterialItem, d: number) => save("materials", { ...m, qty: Math.max(0, Math.round((m.qty + d) * 100) / 100) });

  return (
    <div className="page">
      <PageHead
        title="Material"
        sub={`Bestand ${siteId ? siteName(data, siteId) : "aller Baustellen"} · ${scoped.length} Artikel`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<ScanLine size={15} />} onClick={() => setScanning(true)}>
              Scannen
            </Button>
            <Button leftIcon={<Plus size={15} />} onClick={() => setCreating({})}>
              Artikel anlegen
            </Button>
          </>
        }
      />

      {lowCount > 0 && (
        <div className={cn("alert-bar", onlyLow && "on")} role="status">
          <AlertTriangle size={16} />
          <span className="grow">
            <strong>{lowCount} Artikel unter Mindestbestand</strong> · davon {scoped.filter((m) => low(m) && !m.ordered).length} noch nicht bestellt
          </span>
          <Button size="sm" variant="secondary" onClick={() => q.set({ filter: onlyLow ? null : "unter" })}>
            {onlyLow ? "Alle anzeigen" : "Nur diese anzeigen"}
          </Button>
        </div>
      )}

      <div className="toolbar">
        <label className="search">
          <Search size={14} />
          <Input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            onKeyDown={(e) => {
              // a hand scanner types into the search and ends with Enter
              if (e.key === "Enter" && term.trim() && data.materials.some((m) => m.barcode === term.trim())) {
                found(term.trim());
                setTerm("");
              }
            }}
            placeholder="Artikel, Art.-Nr., Barcode"
            aria-label="Material durchsuchen"
          />
        </label>
        <Select value={ordered} onChange={(e) => setOrdered(e.target.value as typeof ordered)} aria-label="Bestellstatus" className="filter-select">
          <option value="">Bestellt & nicht bestellt</option>
          <option value="ja">Bestellt</option>
          <option value="nein">Nicht bestellt</option>
        </Select>
        <Select value={supplier} onChange={(e) => setSupplier(e.target.value)} aria-label="Lieferant" className="filter-select">
          <option value="">Alle Lieferanten</option>
          {suppliers.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <label className="check-row">
          <Checkbox checked={onlyLow} onChange={(e) => q.set({ filter: e.target.checked ? "unter" : null })} /> Unter Mindestbestand
        </label>
        <span className="count">{rows.length} Artikel</span>
      </div>

      <section className="panel">
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <SortHead k="name" sort={sort} onSort={setSort}>
                    Artikel
                  </SortHead>
                  {!siteId && (
                    <SortHead k="site" sort={sort} onSort={setSort}>
                      Baustelle
                    </SortHead>
                  )}
                  <th className="ui-table-head">Barcode</th>
                  <SortHead k="qty" sort={sort} onSort={setSort} className="num">
                    Bestand
                  </SortHead>
                  <th className="ui-table-head num">Min.</th>
                  <SortHead k="supplier" sort={sort} onSort={setSort}>
                    Lieferant
                  </SortHead>
                  <SortHead k="status" sort={sort} onSort={setSort}>
                    Status
                  </SortHead>
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => (
                  <tr key={m.id} className={cn("ui-table-row clickable", low(m) && "warn", openId === m.id && "selected")} onClick={() => q.set({ artikel: m.id })}>
                    <td className="ui-table-cell">
                      <div className="point-cell">
                        <strong>{m.name}</strong>
                        <small>{m.artNo || "–"}</small>
                      </div>
                    </td>
                    {!siteId && <td className="ui-table-cell muted">{siteName(data, m.siteId)}</td>}
                    <td className="ui-table-cell mono muted">{m.barcode || "–"}</td>
                    <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="qty">
                        <IconButton label="Eins weniger" size="sm" variant="ghost" onClick={() => step(m, -1)} disabled={m.qty <= 0}>
                          <Minus size={13} />
                        </IconButton>
                        <span className={cn("qty-value", low(m) && "signal-text")}>
                          {fmtNum(m.qty)} <small>{m.unit}</small>
                        </span>
                        <IconButton label="Eins mehr" size="sm" variant="ghost" onClick={() => step(m, 1)}>
                          <Plus size={13} />
                        </IconButton>
                      </div>
                    </td>
                    <td className="ui-table-cell num muted">{fmtNum(m.minQty)}</td>
                    <td className="ui-table-cell">{m.supplier || <span className="muted">–</span>}</td>
                    <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                      <div className="mat-status">
                        <button type="button" className={cn("order-toggle", m.ordered && "on")} aria-pressed={m.ordered} onClick={() => save("materials", withOrdered(m, !m.ordered))} title={m.ordered ? `Bestellt ${fmtDateTime(m.orderedAt)}` : "Als bestellt markieren"}>
                          {m.ordered ? "Bestellt" : "Nicht bestellt"}
                        </button>
                        {low(m) && (
                          <StatusBadge tone="amber" icon={AlertTriangle}>
                            Unter Minimum
                          </StatusBadge>
                        )}
                      </div>
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
              icon={<Package size={26} />}
              title={scoped.length ? "Kein Artikel für diesen Filter" : "Noch kein Material erfasst"}
              text={scoped.length ? "Suche oder Filter anpassen." : "Artikel anlegen oder einen Barcode scannen – jeder Artikel gehört zum Bestand einer Baustelle."}
              action={
                !scoped.length && (
                  <Button leftIcon={<Plus size={15} />} onClick={() => setCreating({})}>
                    Artikel anlegen
                  </Button>
                )
              }
            />
          </div>
        )}
      </section>
      {scanning && <ScanDialog onCode={found} onClose={() => setScanning(false)} />}
      {creating && <NewItem barcode={creating.barcode} onClose={() => setCreating(null)} onCreated={(id) => (setCreating(null), q.set({ artikel: id }))} />}
      {openId && <ItemPanel id={openId} onClose={() => q.set({ artikel: null })} />}
    </div>
  );
}

function NewItem({ barcode, onClose, onCreated }: { barcode?: string; onClose: () => void; onCreated: (id: string) => void }) {
  const { data, save, siteId, notify } = useStore();
  const sites = activeSites(data);
  const [m, setM] = useState<MaterialItem>(() => ({ id: uid(), siteId: siteId || sites[0]?.id || "", name: "", artNo: "", barcode: barcode ?? nextCode(data.materials), qty: 0, unit: "Stk", minQty: 0, supplier: "", ordered: false, note: "", createdBy: data.meId, createdAt: now() }));
  const [qty, setQty] = useState("0");
  const [minQty, setMinQty] = useState("0");
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<MaterialItem>) => setM((x) => ({ ...x, ...patch }));
  const errs = {
    name: !m.name.trim() ? "Bitte eine Bezeichnung eingeben" : "",
    site: !m.siteId ? "Bitte eine Baustelle wählen" : "",
    barcode: m.barcode && !validCode128(m.barcode) ? "Nur Buchstaben, Ziffern und Satzzeichen, max. 48 Zeichen" : data.materials.some((x) => x.barcode === m.barcode && x.siteId === m.siteId) ? "Dieser Barcode ist auf der Baustelle schon vergeben" : "",
    qty: Number.isNaN(parseNum(qty)) || parseNum(qty) < 0 ? "Bitte eine Zahl ≥ 0" : "",
    minQty: Number.isNaN(parseNum(minQty)) || parseNum(minQty) < 0 ? "Bitte eine Zahl ≥ 0" : ""
  };
  const submit = () => {
    setTried(true);
    if (Object.values(errs).some(Boolean)) return;
    save("materials", { ...m, name: m.name.trim(), artNo: m.artNo.trim(), supplier: m.supplier.trim(), qty: parseNum(qty), minQty: parseNum(minQty) });
    notify(`„${m.name.trim()}“ angelegt`);
    onCreated(m.id);
  };
  const e = (k: keyof typeof errs) => (tried ? errs[k] : "");
  return (
    <Modal
      size="wide"
      title="Artikel anlegen"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!sites.length}>
            Anlegen
          </Button>
        </>
      }
    >
      {!sites.length ? (
        <p className="muted">Zuerst eine Baustelle in der Übersicht anlegen – der Bestand wird je Baustelle geführt.</p>
      ) : (
        <div className="form-grid">
          <Field label="Bezeichnung" error={e("name")}>
            <Input value={m.name} onChange={(ev) => set({ name: ev.target.value })} placeholder="z. B. Pressfitting Bogen 90° 16" autoFocus />
          </Field>
          <Field label="Baustelle" error={e("site")}>
            <Select value={m.siteId} onChange={(ev) => set({ siteId: ev.target.value })}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Artikelnummer">
            <Input value={m.artNo} onChange={(ev) => set({ artNo: ev.target.value })} />
          </Field>
          <Field label="Barcode" hint="Herstellercode übernehmen oder den vorgeschlagenen eigenen Code verwenden" error={e("barcode")}>
            <Input value={m.barcode} onChange={(ev) => set({ barcode: ev.target.value.trim() })} className="mono" />
          </Field>
          <Field label="Bestand" error={e("qty")}>
            <Input value={qty} onChange={(ev) => setQty(ev.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Einheit">
            <Input value={m.unit} onChange={(ev) => set({ unit: ev.target.value })} list="units" />
          </Field>
          <Field label="Mindestbestand" error={e("minQty")} hint="Darunter wird gewarnt">
            <Input value={minQty} onChange={(ev) => setMinQty(ev.target.value)} inputMode="decimal" />
          </Field>
          <Field label="Lieferant">
            <Input value={m.supplier} onChange={(ev) => set({ supplier: ev.target.value })} list="suppliers" />
          </Field>
          <label className="check-row span-2">
            <Checkbox checked={m.ordered} onChange={(ev) => set({ ordered: ev.target.checked, orderedAt: ev.target.checked ? now() : undefined })} /> Bereits bestellt
          </label>
        </div>
      )}
      <datalist id="units">
        {UNITS.map((u) => (
          <option key={u} value={u} />
        ))}
      </datalist>
      <datalist id="suppliers">
        {[...new Set(data.materials.map((x) => x.supplier).filter(Boolean))].map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </Modal>
  );
}

function ItemPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, save, remove, notify, restore } = useStore();
  const ask = useConfirm();
  const [delta, setDelta] = useState("");
  const m = data.materials.find((x) => x.id === id);
  if (!m) return null;
  const set = (patch: Partial<MaterialItem>) => save("materials", { ...m, ...patch });
  const num = (v: string, k: "qty" | "minQty") => {
    const n = parseNum(v);
    if (Number.isNaN(n) || n < 0) return notify("Bitte eine Zahl ≥ 0 eingeben", { tone: "error" });
    set({ [k]: n });
  };
  const book = (sign: 1 | -1) => {
    const n = parseNum(delta);
    if (Number.isNaN(n) || n <= 0) return notify("Bitte eine Menge größer 0 eingeben", { tone: "error" });
    const qty = Math.max(0, Math.round((m.qty + sign * n) * 100) / 100);
    set({ qty });
    setDelta("");
    notify(`${sign > 0 ? "Zugang" : "Entnahme"} ${fmtNum(n)} ${m.unit} · Bestand ${fmtNum(qty)} ${m.unit}`);
  };
  const drop = async () => {
    if (!(await ask({ title: `„${m.name}“ löschen?` }))) return;
    const before = data;
    remove("materials", m.id);
    onClose();
    notify("Artikel gelöscht", { undo: () => restore(before) });
  };
  let label = "";
  let labelError = "";
  try {
    label = m.barcode ? svg128(m.barcode, { caption: m.name.slice(0, 40) }) : "";
  } catch (e) {
    labelError = e instanceof Error ? e.message : "Barcode ungültig";
  }
  const downloadLabel = () => {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([label], { type: "image/svg+xml" }));
    a.download = `etikett-${m.barcode}.svg`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 10_000);
  };
  const printLabel = () => {
    const w = window.open("", "_blank", "width=480,height=360");
    if (!w) return notify("Das Druckfenster wurde blockiert – Pop-ups für diese Seite erlauben.", { tone: "error" });
    w.document.write(`<!doctype html><html lang="de"><head><title>Etikett ${m.barcode}</title><style>@page{margin:8mm}body{margin:0;display:grid;place-items:center;min-height:90vh}svg{max-width:100%;height:auto}</style></head><body>${label}<script>window.onload=()=>{window.print();setTimeout(()=>window.close(),300)}</script></body></html>`);
    w.document.close();
  };
  return (
    <SidePanel
      title={m.name}
      sub={`${siteName(data, m.siteId)}${m.artNo ? ` · Art.-Nr. ${m.artNo}` : ""}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="destructive" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
            Löschen
          </Button>
          <span className="grow" />
          <Button size="sm" onClick={onClose}>
            Fertig
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {low(m) && (
          <div className="alert-bar span-2" role="status">
            <AlertTriangle size={16} />
            <span>
              Bestand {fmtNum(m.qty)} {m.unit} liegt unter dem Mindestbestand von {fmtNum(m.minQty)} {m.unit}. {m.ordered ? "Bereits bestellt." : "Noch nicht bestellt."}
            </span>
          </div>
        )}
        <div className="stock-box span-2">
          <div>
            <small>Bestand</small>
            <strong className={cn(low(m) && "signal-text")}>
              {fmtNum(m.qty)} {m.unit}
            </strong>
          </div>
          <form
            className="stock-book"
            onSubmit={(e) => {
              e.preventDefault();
              book(1);
            }}
          >
            <Input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Menge" inputMode="decimal" aria-label="Menge buchen" />
            <Button type="button" variant="secondary" size="sm" leftIcon={<Minus size={13} />} onClick={() => book(-1)}>
              Entnahme
            </Button>
            <Button type="submit" variant="secondary" size="sm" leftIcon={<Plus size={13} />}>
              Zugang
            </Button>
          </form>
        </div>
        <Field label="Bezeichnung" className="span-2">
          <BlurInput value={m.name} onSave={(v) => (v ? set({ name: v }) : notify("Bezeichnung darf nicht leer sein", { tone: "error" }))} />
        </Field>
        <Field label="Artikelnummer">
          <BlurInput value={m.artNo} onSave={(v) => set({ artNo: v })} />
        </Field>
        <Field label="Lieferant">
          <BlurInput value={m.supplier} onSave={(v) => set({ supplier: v })} />
        </Field>
        <Field label="Bestand">
          <BlurInput value={String(m.qty).replace(".", ",")} inputMode="decimal" onSave={(v) => num(v, "qty")} />
        </Field>
        <Field label="Mindestbestand">
          <BlurInput value={String(m.minQty).replace(".", ",")} inputMode="decimal" onSave={(v) => num(v, "minQty")} />
        </Field>
        <Field label="Einheit">
          <Select value={UNITS.includes(m.unit) ? m.unit : "_"} onChange={(e) => e.target.value !== "_" && set({ unit: e.target.value })}>
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u}
              </option>
            ))}
            {!UNITS.includes(m.unit) && <option value="_">{m.unit}</option>}
          </Select>
        </Field>
        <Field label="Baustelle">
          <Select value={m.siteId} onChange={(e) => set({ siteId: e.target.value })}>
            {data.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <label className="check-row span-2">
          <Switch checked={m.ordered} onChange={(e) => save("materials", withOrdered(m, e.target.checked))} /> {m.ordered ? `Bestellt${m.orderedAt ? ` am ${fmtDateTime(m.orderedAt)}` : ""}` : "Nicht bestellt"}
        </label>
        <Field label="Barcode (Code 128)" className="span-2">
          <BlurInput value={m.barcode} className="mono" onSave={(v) => (!v || validCode128(v) ? set({ barcode: v }) : notify("Nur Buchstaben, Ziffern und Satzzeichen, max. 48 Zeichen", { tone: "error" }))} />
        </Field>
        <div className="span-2 label-box">
          {label ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={`data:image/svg+xml;utf8,${encodeURIComponent(label)}`} alt={`Barcode ${m.barcode}`} />
              <div className="label-actions">
                <Button variant="secondary" size="sm" leftIcon={<Printer size={14} />} onClick={printLabel}>
                  Etikett drucken
                </Button>
                <Button variant="secondary" size="sm" leftIcon={<Download size={14} />} onClick={downloadLabel}>
                  Als SVG
                </Button>
              </div>
            </>
          ) : (
            <p className="muted">
              <Barcode size={16} /> {labelError || "Kein Barcode hinterlegt."}
            </p>
          )}
        </div>
        <Field label="Notiz" className="span-2">
          <BlurTextarea value={m.note} rows={3} onSave={(v) => set({ note: v })} />
        </Field>
        <p className="span-2 stamp muted">
          Angelegt von {personName(data, m.createdBy) || "–"}, {fmtDateTime(m.createdAt)}
          {m.updatedAt && (
            <>
              <br />
              Zuletzt geändert von {personName(data, m.updatedBy ?? "") || "–"}, {fmtDateTime(m.updatedAt)}
            </>
          )}
        </p>
      </div>
    </SidePanel>
  );
}

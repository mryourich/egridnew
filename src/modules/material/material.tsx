"use client";

import { AlertTriangle, Barcode, ChevronDown, ChevronRight, Download, Minus, Package, Plus, Printer, ScanLine, Search, Trash2, Truck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BlurInput, BlurTextarea, Empty, Field, Modal, PageHead, SidePanel, SortHead, StatusBadge, useConfirm } from "@/components/app/kit";
import { Button, Checkbox, IconButton, Input, Select, Switch } from "@/components/ui";
import { fmt, today } from "@/lib/date";
import { fmtDateTime, fmtNum, parseNum } from "@/lib/format";
import { downloadBlob } from "@/lib/zip";
import { activeSites, inSite, now, personName, siteName, uid, useStore } from "@/lib/store/store";
import type { MaterialItem } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { svg128, validCode128 } from "./code128";
import { BookDialog } from "./booking";
import { ScanDialog } from "./scanner";
import { book, cancelOrder, isLow, MOVE_LABEL, order, orders, receive, suggest, withdrawals } from "./stock";

type SortKey = "name" | "qty" | "supplier" | "site" | "status";
const UNITS = ["Stk", "m", "m²", "m³", "kg", "l", "Pkg", "Rolle", "Kartusche", "Sack", "Palette"];

const low = isLow;
const OPEN_KEY = "vysner:material-all-open";

/** Next internal code for items without a manufacturer barcode. */
function nextCode(items: MaterialItem[]) {
  const n = Math.max(0, ...items.map((m) => (/^VY-(\d+)$/.exec(m.barcode)?.[1] ? Number(/^VY-(\d+)$/.exec(m.barcode)![1]) : 0)));
  return `VY-${String(n + 1).padStart(6, "0")}`;
}

/**
 * Stock per site. On top what needs ordering (below the minimum, not yet ordered) with the quantity to order,
 * then what is ordered and still to come, everything else in the full list below.
 * Scanning a barcode with the phone books a withdrawal – the stock follows automatically.
 */
export function Material() {
  const { data, save, siteId, notify } = useStore();
  const q = useQuery();
  const [term, setTerm] = useState("");
  const [supplier, setSupplier] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "name", dir: 1 });
  const [scanning, setScanning] = useState(false);
  const [booking, setBooking] = useState<MaterialItem | null>(null);
  const [creating, setCreating] = useState<{ barcode?: string } | null>(null);
  const [qtys, setQtys] = useState<Record<string, string>>({});
  const [allOpen, setAllOpen] = useState(false);
  const onlyLow = q.get("filter") === "unter";
  const openId = q.get("artikel");
  const me = data.meId;

  useEffect(() => {
    try {
      setAllOpen(window.localStorage.getItem(OPEN_KEY) === "1");
    } catch {
      // closed
    }
  }, []);
  const toggleAll = (v: boolean) => {
    setAllOpen(v);
    try {
      window.localStorage.setItem(OPEN_KEY, v ? "1" : "0");
    } catch {
      // only for this visit
    }
  };
  // /material?scan=1 opens the camera straight away (bookmark on the phone's home screen)
  useEffect(() => {
    if (q.get("scan")) {
      setScanning(true);
      q.set({ scan: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const scoped = data.materials.filter(inSite(siteId));
  const toOrder = scoped.filter((m) => low(m) && !m.ordered).sort((a, b) => a.qty / Math.max(1, a.minQty) - b.qty / Math.max(1, b.minQty) || a.name.localeCompare(b.name, "de"));
  const incoming = scoped.filter((m) => m.ordered).sort((a, b) => (a.orderedAt ?? "").localeCompare(b.orderedAt ?? ""));
  const suppliers = [...new Set(scoped.map((m) => m.supplier).filter(Boolean))].sort((a, b) => a.localeCompare(b, "de"));
  const t = term.trim().toLowerCase();
  const rows = useMemo(() => {
    const list = scoped.filter((m) => (!onlyLow || low(m)) && (!supplier || m.supplier === supplier) && (!t || [m.name, m.artNo, m.barcode, m.supplier, m.note, siteName(data, m.siteId)].join(" ").toLowerCase().includes(t)));
    const val = (m: MaterialItem): string | number =>
      sort.key === "qty" ? m.qty : sort.key === "supplier" ? m.supplier.toLowerCase() || "zzz" : sort.key === "site" ? siteName(data, m.siteId).toLowerCase() : sort.key === "status" ? (low(m) ? (m.ordered ? 1 : 0) : 2) : m.name.toLowerCase();
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || a.name.localeCompare(b.name, "de");
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, siteId, onlyLow, supplier, t, sort]);
  const showAll = allOpen || !!t || onlyLow || !!supplier;

  const found = useCallback(
    (code: string) => {
      setScanning(false);
      const hit = data.materials.find((m) => m.barcode === code && (!siteId || m.siteId === siteId)) ?? data.materials.find((m) => m.barcode === code || m.artNo === code);
      if (hit) setBooking(hit);
      else {
        notify(`Barcode ${code} ist noch keinem Artikel zugeordnet.`);
        setCreating({ barcode: code });
      }
    },
    [data, siteId, notify]
  );

  const qtyOf = (m: MaterialItem) => qtys[m.id] ?? String(suggest(m));
  const placeOrder = (m: MaterialItem) => {
    const n = parseNum(qtyOf(m));
    if (!Number.isFinite(n) || n <= 0) return notify("Bitte eine Bestellmenge größer 0 eingeben", { tone: "error" });
    save("materials", order(m, n, me));
    notify(`Bestellt: ${fmtNum(n)} ${m.unit} ${m.name}`, { undo: () => save("materials", m) });
  };
  const orderList = () => {
    const head = ["Baustelle", "Artikel", "Art.-Nr.", "Barcode", "Lieferant", "Bestand", "Mindestbestand", "Bestellmenge", "Einheit"];
    const lines = toOrder.map((m) => [siteName(data, m.siteId), m.name, m.artNo, m.barcode, m.supplier, fmtNum(m.qty), fmtNum(m.minQty), qtyOf(m), m.unit]);
    const csv = "﻿" + [head, ...lines].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(";")).join("\r\n");
    downloadBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `Bestellliste ${siteId ? siteName(data, siteId) : "alle Baustellen"} ${fmt(today())}.csv`);
  };
  const step = (m: MaterialItem, d: number) => save("materials", book(m, d < 0 ? "entnahme" : "zugang", Math.abs(d), me));

  return (
    <div className="page">
      <PageHead
        title="Material"
        sub={`Bestand ${siteId ? siteName(data, siteId) : "aller Baustellen"} · ${scoped.length} Artikel`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<Plus size={15} />} onClick={() => setCreating({})}>
              Artikel anlegen
            </Button>
            <Button leftIcon={<ScanLine size={15} />} onClick={() => setScanning(true)}>
              Scannen & buchen
            </Button>
          </>
        }
      />

      <section className="panel prio-panel">
        <div className="panel-head wrap">
          <AlertTriangle size={16} className={toOrder.length ? "signal-text" : "muted"} />
          <h2>Nachbestellen</h2>
          <span className="muted">{toOrder.length ? `${toOrder.length} Artikel unter Mindestbestand, noch nicht bestellt` : "Alles über dem Mindestbestand oder bereits bestellt"}</span>
          <span className="grow" />
          {toOrder.length > 0 && (
            <Button size="sm" variant="secondary" leftIcon={<Download size={14} />} onClick={orderList}>
              Bestellliste (CSV)
            </Button>
          )}
        </div>
        {toOrder.length > 0 ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="ui-table-head">Artikel</th>
                  {!siteId && <th className="ui-table-head">Baustelle</th>}
                  <th className="ui-table-head num">Bestand / Min.</th>
                  <th className="ui-table-head">Lieferant</th>
                  <th className="ui-table-head">Bisher bestellt</th>
                  <th className="ui-table-head">Bestellmenge</th>
                  <th className="ui-table-head" aria-label="Bestellen" />
                </tr>
              </thead>
              <tbody>
                {toOrder.map((m) => {
                  const past = orders(m);
                  return (
                    <tr key={m.id} className="ui-table-row warn">
                      <td className="ui-table-cell">
                        <button type="button" className="point-cell link-cell" onClick={() => q.set({ artikel: m.id })}>
                          <strong>{m.name}</strong>
                          <small>{[m.artNo, m.barcode].filter(Boolean).join(" · ")}</small>
                        </button>
                      </td>
                      {!siteId && <td className="ui-table-cell muted">{siteName(data, m.siteId)}</td>}
                      <td className="ui-table-cell num nowrap">
                        <span className="signal-text">{fmtNum(m.qty)}</span> / {fmtNum(m.minQty)} <small className="muted">{m.unit}</small>
                      </td>
                      <td className="ui-table-cell">{m.supplier || <span className="muted">–</span>}</td>
                      <td className="ui-table-cell muted nowrap">{past.length ? `${past.length}× · zuletzt ${fmt(past.at(-1)!.at.slice(0, 10))}` : "noch nie"}</td>
                      <td className="ui-table-cell">
                        <div className="order-qty">
                          <Input value={qtyOf(m)} onChange={(e) => setQtys((x) => ({ ...x, [m.id]: e.target.value }))} inputMode="decimal" aria-label={`Bestellmenge ${m.name}`} onKeyDown={(e) => e.key === "Enter" && placeOrder(m)} />
                          <span className="muted">{m.unit}</span>
                        </div>
                      </td>
                      <td className="ui-table-cell num">
                        <Button size="sm" onClick={() => placeOrder(m)}>
                          Bestellt
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="panel-body muted">Kein Handlungsbedarf.</p>
        )}
      </section>

      {incoming.length > 0 && (
        <section className="panel">
          <div className="panel-head">
            <Truck size={16} className="muted" />
            <h2>Bestellt – Lieferung offen</h2>
            <span className="muted">{incoming.length} Artikel</span>
          </div>
          <div className="list-rows">
            {incoming.map((m) => (
              <div key={m.id}>
                <button type="button" className="title link-cell" onClick={() => q.set({ artikel: m.id })}>
                  <strong>{m.name}</strong> <small className="muted">· {[!siteId && siteName(data, m.siteId), m.supplier].filter(Boolean).join(" · ")}</small>
                </button>
                <span className="nowrap">
                  {m.orderedQty ? `${fmtNum(m.orderedQty)} ${m.unit}` : "Menge offen"} <small className="muted">· bestellt {fmt(m.orderedAt?.slice(0, 10))}</small>
                </span>
                <span className={cn("nowrap", low(m) && "signal-text")}>
                  Bestand {fmtNum(m.qty)} {m.unit}
                </span>
                <Button size="sm" variant="secondary" onClick={() => (save("materials", cancelOrder(m)), notify("Bestellung storniert", { undo: () => save("materials", m) }))}>
                  Storno
                </Button>
                <Button size="sm" disabled={!m.orderedQty} title={m.orderedQty ? "Liefermenge zum Bestand buchen" : "Bestellmenge im Artikel eintragen"} onClick={() => (save("materials", receive(m, me)), notify(`Lieferung gebucht: +${fmtNum(m.orderedQty ?? 0)} ${m.unit} ${m.name}`, { undo: () => save("materials", m) }))}>
                  Geliefert
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="panel">
        <button type="button" className="panel-head panel-toggle" aria-expanded={showAll} onClick={() => toggleAll(!allOpen)}>
          {showAll ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
          <h2>Alle Artikel</h2>
          <span className="muted">{scoped.length} im Bestand</span>
        </button>
        <div className="toolbar panel-tools">
          <label className="search">
            <Search size={14} />
            <Input
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              onKeyDown={(e) => {
                // a hand scanner types into the search and ends with Enter
                if (e.key === "Enter" && term.trim() && data.materials.some((m) => m.barcode === term.trim())) {
                  e.preventDefault();
                  found(term.trim());
                  setTerm("");
                }
              }}
              placeholder="Artikel, Art.-Nr., Barcode"
              aria-label="Material durchsuchen"
            />
          </label>
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
          <span className="count">{showAll ? `${rows.length} Artikel` : "Zum Aufklappen auf „Alle Artikel“ tippen"}</span>
        </div>
        {showAll &&
          (rows.length ? (
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
                          <IconButton label="Eins entnehmen" size="sm" variant="ghost" onClick={() => step(m, -1)} disabled={m.qty <= 0}>
                            <Minus size={13} />
                          </IconButton>
                          <span className={cn("qty-value", low(m) && "signal-text")}>
                            {fmtNum(m.qty)} <small>{m.unit}</small>
                          </span>
                          <IconButton label="Eins zubuchen" size="sm" variant="ghost" onClick={() => step(m, 1)}>
                            <Plus size={13} />
                          </IconButton>
                        </div>
                      </td>
                      <td className="ui-table-cell num muted">{fmtNum(m.minQty)}</td>
                      <td className="ui-table-cell">{m.supplier || <span className="muted">–</span>}</td>
                      <td className="ui-table-cell">
                        {m.ordered ? <StatusBadge tone="blue">Bestellt{m.orderedQty ? ` ${fmtNum(m.orderedQty)}` : ""}</StatusBadge> : low(m) ? <StatusBadge tone="amber" icon={AlertTriangle}>Nachbestellen</StatusBadge> : <span className="muted">OK</span>}
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
          ))}
      </section>
      {scanning && <ScanDialog onCode={found} onClose={() => setScanning(false)} />}
      {booking && <BookDialog item={booking} onClose={() => setBooking(null)} onNext={() => (setBooking(null), setScanning(true))} />}
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
            <Checkbox checked={m.ordered} onChange={(ev) => set({ ordered: ev.target.checked, orderedAt: ev.target.checked ? now() : undefined, orderedQty: undefined })} /> Bereits bestellt
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
  const [orderQty, setOrderQty] = useState("");
  const m = data.materials.find((x) => x.id === id);
  if (!m) return null;
  const set = (patch: Partial<MaterialItem>) => save("materials", { ...m, ...patch });
  const num = (v: string, k: "qty" | "minQty") => {
    const n = parseNum(v);
    if (Number.isNaN(n) || n < 0) return notify("Bitte eine Zahl ≥ 0 eingeben", { tone: "error" });
    // a changed stock figure is kept as correction in the log
    save("materials", k === "qty" ? book(m, "korrektur", n, data.meId) : { ...m, minQty: n });
  };
  const bookDelta = (sign: 1 | -1) => {
    const n = parseNum(delta);
    if (Number.isNaN(n) || n <= 0) return notify("Bitte eine Menge größer 0 eingeben", { tone: "error" });
    const out = book(m, sign > 0 ? "zugang" : "entnahme", n, data.meId);
    save("materials", out);
    setDelta("");
    notify(`${sign > 0 ? "Zugang" : "Entnahme"} ${fmtNum(n)} ${m.unit} · Bestand ${fmtNum(out.qty)} ${m.unit}`);
  };
  const placeOrder = () => {
    const n = parseNum(orderQty || String(suggest(m)));
    if (!Number.isFinite(n) || n <= 0) return notify("Bitte eine Bestellmenge größer 0 eingeben", { tone: "error" });
    save("materials", order(m, n, data.meId));
    setOrderQty("");
    notify(`Bestellt: ${fmtNum(n)} ${m.unit}`);
  };
  const log = [...(m.log ?? [])].reverse();
  const used30 = withdrawals(m)
    .filter((x) => Date.now() - Date.parse(x.at) < 30 * 86_400_000)
    .reduce((sum, x) => sum + x.qty, 0);
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
              bookDelta(1);
            }}
          >
            <Input value={delta} onChange={(e) => setDelta(e.target.value)} placeholder="Menge" inputMode="decimal" aria-label="Menge buchen" />
            <Button type="button" variant="secondary" size="sm" leftIcon={<Minus size={13} />} onClick={() => bookDelta(-1)}>
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
        <div className="span-2 order-box">
          {m.ordered ? (
            <>
              <span className="grow">
                <strong>Bestellt{m.orderedQty ? `: ${fmtNum(m.orderedQty)} ${m.unit}` : ""}</strong>
                <small className="muted"> · {fmtDateTime(m.orderedAt)}</small>
              </span>
              <Button size="sm" variant="secondary" onClick={() => save("materials", cancelOrder(m))}>
                Storno
              </Button>
              <Button size="sm" disabled={!m.orderedQty} onClick={() => (save("materials", receive(m, data.meId)), notify(`Lieferung gebucht: +${fmtNum(m.orderedQty ?? 0)} ${m.unit}`))}>
                Geliefert
              </Button>
            </>
          ) : (
            <form
              className="order-qty grow"
              onSubmit={(e) => {
                e.preventDefault();
                placeOrder();
              }}
            >
              <span className="grow">Nicht bestellt</span>
              <Input value={orderQty} onChange={(e) => setOrderQty(e.target.value)} placeholder={String(suggest(m))} inputMode="decimal" aria-label="Bestellmenge" />
              <span className="muted">{m.unit}</span>
              <Button type="submit" size="sm">
                Bestellen
              </Button>
            </form>
          )}
        </div>
        <p className="span-2 muted stock-stats">
          {orders(m).length ? `${orders(m).length}× bestellt, zuletzt ${fmtDateTime(orders(m).at(-1)!.at)}` : "Noch nie bestellt"} · Verbrauch letzte 30 Tage: {fmtNum(used30)} {m.unit}
        </p>
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
        <div className="field span-2">
          <span>Buchungen</span>
          {log.length ? (
            <ul className="move-log">
              {log.slice(0, 30).map((x) => (
                <li key={x.id}>
                  <span className={cn("move-kind", x.kind)}>{MOVE_LABEL[x.kind]}</span>
                  <strong className="nowrap">
                    {x.kind === "entnahme" ? "−" : x.kind === "zugang" || (x.kind === "korrektur" && x.qty > 0) ? "+" : ""}
                    {fmtNum(Math.abs(x.qty))} {m.unit}
                  </strong>
                  <span className="grow muted">
                    {personName(data, x.by) || "–"}
                    {x.note ? ` · ${x.note}` : ""}
                  </span>
                  <span className="muted nowrap">{fmtDateTime(x.at)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <small className="muted">Noch keine Buchungen.</small>
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

"use client";

import { AlertTriangle, ArrowRightLeft, Ban, CheckCircle2, Copy, FileDown, Import, Plus, Send, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { addDays, fmt, today } from "@/core/date";
import { rightsOf } from "@/core/roles";
import { now, uid, useStore } from "@/core/store";
import type { BillingDoc, BillingKind, BillingLine, BillingStatus } from "@/core/types";
import { Button, Empty, Field, IconButton, Modal, PageHead, SearchBox, Seg, Tag } from "@/core/ui";
import { billingOf, eur, eur0, hoursOf, KIND, nextNo, overdue, totals } from "./money";

export const STATUS: Record<BillingStatus, { label: string; tone: "gray" | "blue" | "green" | "amber" | "red" }> = {
  entwurf: { label: "Entwurf", tone: "gray" },
  versendet: { label: "Versendet", tone: "blue" },
  angenommen: { label: "Angenommen", tone: "green" },
  abgelehnt: { label: "Abgelehnt", tone: "red" },
  bezahlt: { label: "Bezahlt", tone: "green" },
  storniert: { label: "Storniert", tone: "gray" }
};

const edit = (data: Parameters<typeof rightsOf>[0]) => rightsOf(data).sales && !rightsOf(data).readOnly;
const pathOfKind = (k: BillingKind) => (k === "angebot" ? "angebote" : k === "mahnung" ? "mahnungen" : "rechnungen");

/** A fresh document with today's date, the next number and the company terms. */
function blank(data: Parameters<typeof billingOf>[0], kind: BillingKind, patch: Partial<BillingDoc> = {}): BillingDoc {
  const t = today();
  const b = billingOf(data);
  return { id: "", kind, no: nextNo(data, kind, t), date: t, due: addDays(t, kind === "angebot" ? 30 : b.terms), contactId: "", projectId: "", title: "", intro: kind === "angebot" ? "Wir bedanken uns für Ihre Anfrage und bieten Ihnen folgende Leistungen an:" : "Wir erlauben uns, folgende Leistungen in Rechnung zu stellen:", lines: [], vat: b.vat, status: "entwurf", createdBy: data.meId, createdAt: "", ...patch };
}

/* ------------------------------------------------------------------ overview */

export function BillingOverview() {
  const { data } = useStore();
  const t = today();
  const docs = data.billing;
  const open = docs.filter((b) => b.kind === "rechnung" && b.status === "versendet");
  const late = open.filter((b) => overdue(b, t));
  const paidYear = docs.filter((b) => b.kind === "rechnung" && b.status === "bezahlt" && b.date.startsWith(t.slice(0, 4)));
  const quotes = docs.filter((b) => b.kind === "angebot" && b.status === "versendet");
  const sum = (list: BillingDoc[]) => list.reduce((s, b) => s + totals(b).gross, 0);
  const unbilled = data.times.filter((x) => x.billable && !x.billedIn && x.projectId).reduce((s, x) => s + hoursOf(x), 0);
  if (!rightsOf(data).sales) return <Empty title="Kein Zugriff">Kunden und Abrechnung sehen Leitung und Büro.</Empty>;
  return (
    <>
      <PageHead kicker="Übersicht" title="Abrechnung" sub="Offene Posten, Umsatz und was noch nicht verrechnet ist.">
        {edit(data) && (
          <>
            <Link className="b-btn default md" href="/abrechnung/angebote?neu=1">
              <Plus size={15} /> Angebot
            </Link>
            <Link className="b-btn primary md" href="/abrechnung/rechnungen?neu=1">
              <Plus size={15} /> Rechnung
            </Link>
          </>
        )}
      </PageHead>
      <div className="kpis">
        <Link className="kpi" href="/abrechnung/rechnungen">
          <span>Offene Posten</span>
          <b>{eur0(sum(open))}</b>
          <small>{open.length} Rechnungen</small>
        </Link>
        <Link className="kpi" href="/abrechnung/mahnungen">
          <span>Überfällig</span>
          <b className={late.length ? "bad" : ""}>{eur0(sum(late))}</b>
          <small>{late.length} Rechnungen</small>
        </Link>
        <div className="kpi">
          <span>Bezahlt {t.slice(0, 4)}</span>
          <b>{eur0(paidYear.reduce((s, b) => s + totals(b).net, 0))}</b>
          <small>netto</small>
        </div>
        <Link className="kpi" href="/abrechnung/angebote">
          <span>Angebote offen</span>
          <b>{eur0(quotes.reduce((s, b) => s + totals(b).net, 0))}</b>
          <small>{quotes.length} versendet · netto</small>
        </Link>
      </div>
      <div className="cols">
        <section className="panel">
          <header className="panel-head">
            <h2>Noch nicht verrechnet</h2>
            <span className="muted">{Math.round(unbilled)} h</span>
          </header>
          <table className="table">
            <tbody>
              {data.projects
                .map((p) => ({ p, h: data.times.filter((x) => x.projectId === p.id && x.billable && !x.billedIn).reduce((s, x) => s + hoursOf(x), 0), r: data.regie.filter((r) => r.projectId === p.id && r.approvedAt && !r.billedIn).length }))
                .filter((x) => x.h || x.r)
                .map(({ p, h, r }) => (
                  <tr key={p.id}>
                    <td>
                      <strong>{p.name}</strong>
                      <small className="sub">{p.client}</small>
                    </td>
                    <td className="num">{Math.round(h * 10) / 10} h</td>
                    <td className="num">{r ? `${r} Regie` : "–"}</td>
                    <td className="num">{eur0(h * billingOf(data).rate)}</td>
                    <td className="w-menu">
                      {edit(data) && (
                        <Link className="link" href={`/abrechnung/rechnungen?neu=1&projekt=${p.id}`}>
                          abrechnen
                        </Link>
                      )}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </section>
        <section className="panel">
          <header className="panel-head">
            <h2>
              <AlertTriangle size={15} /> Überfällig
            </h2>
          </header>
          {late.length === 0 ? (
            <p className="panel-empty">Alle Rechnungen im Plan.</p>
          ) : (
            <ul className="side-list">
              {late.map((b) => (
                <li key={b.id}>
                  <Link href={`/abrechnung/mahnungen?mahnen=${b.id}`}>
                    <span>
                      <strong>
                        {b.no} · {data.contacts.find((c) => c.id === b.contactId)?.name}
                      </strong>
                      <small>
                        fällig {fmt(b.due)} · {eur(totals(b).gross)}
                      </small>
                    </span>
                    <Tag tone="red">mahnen</Tag>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ lists */

export function BillingList({ kind }: { kind: "angebot" | "rechnung" | "mahnung" }) {
  const { data, save } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [open, setOpen] = useState<BillingDoc | null>(null);
  const t = today();
  const kinds: BillingKind[] = kind === "rechnung" ? ["rechnung", "gutschrift"] : [kind];
  const term = q.trim().toLowerCase();
  const name = (id: string) => data.contacts.find((c) => c.id === id)?.name ?? "";
  const list = data.billing
    .filter((b) => kinds.includes(b.kind) && (!status || (status === "ueberfaellig" ? overdue(b, t) : b.status === status)) && (!term || `${b.no} ${b.title} ${name(b.contactId)}`.toLowerCase().includes(term)))
    .sort((a, b) => b.date.localeCompare(a.date) || b.no.localeCompare(a.no));
  const late = data.billing.filter((b) => overdue(b, t));

  // open from the address: ?beleg=, ?neu=1 (&kunde=, &titel=, &projekt=), ?mahnen=
  useEffect(() => {
    const id = params.get("beleg");
    const remind = params.get("mahnen");
    const fromQuote = params.get("ausAngebot");
    if (fromQuote) {
      const q = data.billing.find((x) => x.id === fromQuote);
      if (q) setOpen(blank(data, "rechnung", { contactId: q.contactId, projectId: q.projectId, title: q.title, lines: q.lines.map((l) => ({ ...l, id: uid() })), refId: q.id }));
    } else if (id) {
      const b = data.billing.find((x) => x.id === id);
      if (b) setOpen(b);
    } else if (remind) {
      const inv = data.billing.find((x) => x.id === remind);
      if (inv) setOpen(dunning(inv));
    } else if (params.get("neu") && edit(data)) {
      const projectId = params.get("projekt") ?? "";
      const p = data.projects.find((x) => x.id === projectId);
      setOpen(blank(data, kind, { contactId: params.get("kunde") ?? p?.contactId ?? "", projectId, title: params.get("titel") ?? (p ? `${p.name} – Teilrechnung` : "") }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);
  const close = () => (setOpen(null), params.toString() && router.replace(`/abrechnung/${pathOfKind(kind)}`));

  /** Dunning letter for an overdue invoice: level and fee rise with every letter. */
  function dunning(inv: BillingDoc): BillingDoc {
    const level = data.billing.filter((b) => b.kind === "mahnung" && b.refId === inv.id).length + 1;
    const g = totals(inv).gross;
    return blank(data, "mahnung", {
      contactId: inv.contactId,
      projectId: inv.projectId,
      refId: inv.id,
      level,
      fee: level > 1 ? 15 * (level - 1) : 0,
      vat: 0,
      title: `${level}. Mahnung zu ${inv.no}`,
      intro: level === 1 ? `Sicher ist es Ihrer Aufmerksamkeit entgangen: Unsere Rechnung ${inv.no} vom ${fmt(inv.date)} war am ${fmt(inv.due)} fällig. Wir bitten um Überweisung binnen 7 Tagen.` : `Leider konnten wir bis heute keinen Zahlungseingang zu Rechnung ${inv.no} feststellen. Wir ersuchen um umgehende Zahlung.`,
      lines: [{ id: uid(), text: `Offener Betrag Rechnung ${inv.no} vom ${fmt(inv.date)}`, qty: 1, unit: "", price: g }],
      due: addDays(today(), 7)
    });
  }

  if (!rightsOf(data).sales) return <Empty title="Kein Zugriff">Kunden und Abrechnung sehen Leitung und Büro.</Empty>;
  const statuses: (BillingStatus | "ueberfaellig")[] = kind === "angebot" ? ["entwurf", "versendet", "angenommen", "abgelehnt"] : kind === "rechnung" ? ["entwurf", "versendet", "ueberfaellig", "bezahlt", "storniert"] : ["entwurf", "versendet", "bezahlt"];
  return (
    <>
      <PageHead kicker={KIND[kind].plural} title="Abrechnung" sub={kind === "angebot" ? "Kalkulieren, versenden, nach Annahme mit einem Klick zur Rechnung." : kind === "rechnung" ? "Rechnungen und Gutschriften – Stunden, Material und Regie übernehmen, Zahlung verbuchen." : "Überfällige Rechnungen mahnen – Stufe und Mahnspesen steigen automatisch."}>
        {edit(data) && kind !== "mahnung" && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen(blank(data, kind))}>
            {kind === "angebot" ? "Neues Angebot" : "Neue Rechnung"}
          </Button>
        )}
      </PageHead>
      {kind === "mahnung" && late.length > 0 && (
        <section className="panel">
          <header className="panel-head">
            <h2>
              <AlertTriangle size={15} /> Überfällige Rechnungen
            </h2>
          </header>
          <table className="table">
            <tbody>
              {late.map((b) => {
                const level = data.billing.filter((x) => x.kind === "mahnung" && x.refId === b.id).length;
                return (
                  <tr key={b.id}>
                    <td className="mono">{b.no}</td>
                    <td>
                      <strong>{name(b.contactId)}</strong>
                      <small className="sub">
                        fällig {fmt(b.due)} · {level ? `${level}. Mahnung verschickt` : "noch nicht gemahnt"}
                      </small>
                    </td>
                    <td className="num">{eur(totals(b).gross)}</td>
                    <td className="w-menu nowrap">{edit(data) && level < 3 && <Button size="sm" onClick={() => setOpen(dunning(b))}>{level + 1}. Mahnung</Button>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>
      )}
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Nummer, Kunde, Betreff…" />
        <Seg value={status} onChange={setStatus} options={[{ value: "", label: "Alle" }, ...statuses.map((s) => ({ value: s, label: s === "ueberfaellig" ? "Überfällig" : STATUS[s].label }))]} />
      </div>
      {list.length === 0 ? (
        <Empty title={`Keine ${KIND[kind].plural} in dieser Ansicht.`} />
      ) : (
        <div className="panel">
          <table className="table rows-click">
            <thead>
              <tr>
                <th>Nummer</th>
                <th>Kunde / Betreff</th>
                <th className="hide-sm">Datum</th>
                <th className="hide-sm">{kind === "angebot" ? "Gültig bis" : "Fällig"}</th>
                <th>Status</th>
                <th className="num">Netto</th>
                <th className="num">Brutto</th>
              </tr>
            </thead>
            <tbody>
              {list.map((b) => {
                const tt = totals(b);
                const late2 = overdue(b, t);
                return (
                  <tr key={b.id} onClick={() => setOpen(b)}>
                    <td className="mono nowrap">
                      {b.no}
                      {b.kind === "gutschrift" && <small className="sub">Gutschrift</small>}
                    </td>
                    <td>
                      <strong>{name(b.contactId) || "–"}</strong>
                      <small className="sub">{b.title}</small>
                    </td>
                    <td className="hide-sm nowrap">{fmt(b.date)}</td>
                    <td className={`hide-sm nowrap ${late2 ? "bad" : ""}`}>{b.due ? fmt(b.due) : "–"}</td>
                    <td>
                      <Tag tone={late2 ? "red" : STATUS[b.status].tone} dot>
                        {late2 ? "Überfällig" : STATUS[b.status].label}
                      </Tag>
                    </td>
                    <td className="num">{eur(tt.net)}</td>
                    <td className="num strong">{eur(tt.gross)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {open && <DocEditor doc={open} onClose={close} onSave={(b) => (save("billing", b), b)} onOpen={(b) => setOpen(b)} />}
    </>
  );
}

/* ------------------------------------------------------------------ editor */

function DocEditor({ doc, onClose, onSave, onOpen }: { doc: BillingDoc; onClose: () => void; onSave: (b: BillingDoc) => BillingDoc; onOpen: (b: BillingDoc) => void }) {
  const { data, save, remove, notify } = useStore();
  const router = useRouter();
  const isNew = !doc.id;
  const may = edit(data);
  const [v, setV] = useState<BillingDoc>(doc);
  const set = (x: Partial<BillingDoc>) => setV((o) => ({ ...o, ...x }));
  const locked = !may || (!isNew && doc.status !== "entwurf");
  const tt = totals(v);
  const projects = data.projects.filter((p) => !v.contactId || p.contactId === v.contactId || !p.contactId);
  const rate = billingOf(data).rate;
  const setLine = (id: string, x: Partial<BillingLine>) => set({ lines: v.lines.map((l) => (l.id === id ? { ...l, ...x } : l)) });
  const num = (s: string) => Number(s.replace(/\s/g, "").replace(",", ".")) || 0;

  /** Unbilled hours, approved Regie and arrived material of the project become lines. */
  const importProject = () => {
    const p = data.projects.find((x) => x.id === v.projectId);
    if (!p) return notify("Zuerst ein Projekt wählen.");
    const hours = data.times.filter((x) => x.projectId === p.id && x.billable && !x.billedIn);
    const regie = data.regie.filter((r) => r.projectId === p.id && r.approvedAt && !r.billedIn);
    const lines: BillingLine[] = [];
    const h = hours.reduce((s, x) => s + hoursOf(x), 0);
    if (h) {
      const dates = hours.map((x) => x.date).sort();
      lines.push({ id: uid(), text: `Montagestunden ${fmt(dates[0])} – ${fmt(dates[dates.length - 1])}`, qty: Math.round(h * 4) / 4, unit: "h", price: rate });
    }
    for (const r of regie) {
      lines.push({ id: uid(), text: `Regie Nr. ${String(r.no).padStart(2, "0")} vom ${fmt(r.date)}: ${r.description.split("\n")[0]}`, qty: r.workers.reduce((s, w) => s + w.hours, 0), unit: "h", price: rate });
      for (const m of r.materials.filter((x) => x.name.trim())) lines.push({ id: uid(), text: `${m.name}${m.artNo ? ` (Art. ${m.artNo})` : ""} – Regie Nr. ${String(r.no).padStart(2, "0")}`, qty: m.qty, unit: m.unit, price: 0 });
    }
    if (!lines.length) return notify("Nichts Offenes: alle Stunden und Regiescheine sind schon verrechnet.");
    set({ lines: [...v.lines, ...lines], contactId: v.contactId || p.contactId || "" });
    notify(`${lines.length} Positionen übernommen – Preise prüfen`);
  };

  const store = (patch: Partial<BillingDoc> = {}, activity?: string) => {
    const item = { ...v, ...patch, id: v.id || uid(), title: v.title.trim(), createdAt: v.createdAt || now(), lines: v.lines.filter((l) => l.text.trim() || l.price) };
    onSave(item);
    if (activity) save("billing", item, activity);
    return item;
  };
  /** Marks the hours and Regie of the project as billed by this invoice. */
  const markBilled = (item: BillingDoc) => {
    if (item.kind !== "rechnung" || !item.projectId) return;
    for (const x of data.times.filter((y) => y.projectId === item.projectId && y.billable && !y.billedIn)) save("times", { ...x, billedIn: item.id });
    for (const r of data.regie.filter((y) => y.projectId === item.projectId && y.approvedAt && !y.billedIn)) save("regie", { ...r, billedIn: item.id });
  };

  return (
    <Modal
      kicker={`${KIND[v.kind].label} ${v.no}`}
      title={isNew ? `${KIND[v.kind].label} erstellen` : v.title || KIND[v.kind].label}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && may && v.status === "entwurf" && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm("Entwurf löschen?") && (remove("billing", v.id), onClose())}>
              Löschen
            </Button>
          )}
          {!isNew && (
            <a className="b-btn ghost md" href={`/druck/beleg/${v.id}`} target="_blank" rel="noreferrer">
              <FileDown size={15} /> PDF
            </a>
          )}
          <span className="grow" />
          {may && v.status === "entwurf" && (
            <>
              <Button onClick={() => (store(), notify("Entwurf gespeichert"), onClose())} disabled={!v.contactId}>
                Speichern
              </Button>
              <Button
                variant="primary"
                icon={<Send size={15} />}
                disabled={!v.contactId || !v.lines.length}
                onClick={() => {
                  const item = store({ status: "versendet" }, `${KIND[v.kind].label} ${v.no} versendet`);
                  markBilled(item);
                  notify(`${KIND[v.kind].label} ${v.no} ist fertig – PDF öffnet sich`);
                  window.open(`/druck/beleg/${item.id}`, "_blank");
                  onClose();
                }}
              >
                Abschließen & PDF
              </Button>
            </>
          )}
          {may && v.kind === "angebot" && v.status === "versendet" && (
            <>
              <Button icon={<X size={15} />} onClick={() => (store({ status: "abgelehnt" }, `Angebot ${v.no} abgelehnt`), onClose())}>
                Abgelehnt
              </Button>
              <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={() => (store({ status: "angenommen" }, `Angebot ${v.no} angenommen`), notify("Angenommen"), onClose())}>
                Angenommen
              </Button>
            </>
          )}
          {may && v.kind === "angebot" && v.status === "angenommen" && (
            <Button
              variant="primary"
              icon={<ArrowRightLeft size={15} />}
              onClick={() => router.push(`/abrechnung/rechnungen?ausAngebot=${v.id}`)}
            >
              In Rechnung umwandeln
            </Button>
          )}
          {may && v.kind === "rechnung" && v.status === "versendet" && (
            <>
              <Button icon={<Ban size={15} />} onClick={() => window.confirm(`${v.no} stornieren?`) && (store({ status: "storniert" }, `Rechnung ${v.no} storniert`), onClose())}>
                Stornieren
              </Button>
              <Button variant="primary" icon={<CheckCircle2 size={15} />} onClick={() => (store({ status: "bezahlt", paidAt: now() }, `Zahlung zu ${v.no} verbucht`), notify("Zahlung verbucht"), onClose())}>
                Bezahlt
              </Button>
            </>
          )}
          {may && v.kind === "mahnung" && v.status === "versendet" && (
            <Button
              variant="primary"
              icon={<CheckCircle2 size={15} />}
              onClick={() => {
                store({ status: "bezahlt", paidAt: now() });
                const inv = data.billing.find((b) => b.id === v.refId);
                if (inv) save("billing", { ...inv, status: "bezahlt", paidAt: now() }, `Zahlung zu ${inv.no} verbucht`);
                notify("Zahlung verbucht");
                onClose();
              }}
            >
              Zahlung eingegangen
            </Button>
          )}
          {!isNew && may && v.kind === "rechnung" && v.status !== "entwurf" && (
            <Button icon={<Copy size={15} />} onClick={() => onOpen(blank(data, "gutschrift", { contactId: v.contactId, projectId: v.projectId, title: `Gutschrift zu ${v.no}`, refId: v.id, lines: v.lines.map((l) => ({ ...l, id: uid() })) }))}>
              Gutschrift
            </Button>
          )}
        </>
      }
    >
      <fieldset className="form-grid regie-form doc-form" disabled={locked}>
        <Field label="Kunde *">
          <select value={v.contactId} onChange={(e) => set({ contactId: e.target.value })}>
            <option value="">– wählen –</option>
            {data.contacts
              .filter((c) => c.status !== "lieferant")
              .sort((a, b) => a.name.localeCompare(b.name, "de"))
              .map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
          </select>
        </Field>
        <Field label="Projekt">
          <select value={v.projectId} onChange={(e) => set({ projectId: e.target.value })}>
            <option value="">– ohne –</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Datum">
          <input type="date" value={v.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
        <Field label={v.kind === "angebot" ? "Gültig bis" : "Zahlbar bis"}>
          <input type="date" value={v.due} onChange={(e) => set({ due: e.target.value })} />
        </Field>
        <Field label="Betreff" className="span-2">
          <input value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Elektroinstallation Halle 3" />
        </Field>
        <Field label="Einleitung" className="span-2">
          <textarea rows={2} value={v.intro} onChange={(e) => set({ intro: e.target.value })} />
        </Field>
      </fieldset>

      <div className="doc-lines">
        <table className="table">
          <thead>
            <tr>
              <th className="w-no">Pos.</th>
              <th>Leistung</th>
              <th className="num">Menge</th>
              <th>Einheit</th>
              <th className="num">Einzelpreis</th>
              <th className="num">Gesamt</th>
              <th className="w-menu" />
            </tr>
          </thead>
          <tbody>
            {v.lines.map((l, i) => (
              <tr key={l.id}>
                <td className="w-no muted">{i + 1}</td>
                <td>
                  <input className="cell-input" disabled={locked} value={l.text} onChange={(e) => setLine(l.id, { text: e.target.value })} placeholder="Beschreibung der Leistung" />
                </td>
                <td className="num">
                  <input className="cell-input num" disabled={locked} key={`q${l.qty}`} defaultValue={String(l.qty).replace(".", ",")} onBlur={(e) => setLine(l.id, { qty: num(e.target.value) })} />
                </td>
                <td>
                  <input className="cell-input unit" disabled={locked} value={l.unit} onChange={(e) => setLine(l.id, { unit: e.target.value })} />
                </td>
                <td className="num">
                  <input className="cell-input num" disabled={locked} key={`p${l.price}`} defaultValue={l.price.toFixed(2).replace(".", ",")} onBlur={(e) => setLine(l.id, { price: num(e.target.value) })} />
                </td>
                <td className="num strong">{eur(l.qty * l.price)}</td>
                <td className="w-menu">
                  {!locked && (
                    <IconButton label="Position entfernen" onClick={() => set({ lines: v.lines.filter((x) => x.id !== l.id) })}>
                      <X size={14} />
                    </IconButton>
                  )}
                </td>
              </tr>
            ))}
            {!v.lines.length && (
              <tr>
                <td colSpan={7} className="muted">
                  Noch keine Positionen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        {!locked && (
          <div className="doc-line-actions">
            <Button size="sm" icon={<Plus size={14} />} onClick={() => set({ lines: [...v.lines, { id: uid(), text: "", qty: 1, unit: "Stk", price: 0 }] })}>
              Position
            </Button>
            <Button size="sm" icon={<Plus size={14} />} onClick={() => set({ lines: [...v.lines, { id: uid(), text: "Montagestunden", qty: 8, unit: "h", price: rate }] })}>
              Stunden
            </Button>
            {v.kind !== "mahnung" && (
              <Button size="sm" icon={<Import size={14} />} onClick={importProject} disabled={!v.projectId}>
                Aus Projekt übernehmen
              </Button>
            )}
          </div>
        )}
        <dl className="doc-sum">
          <dt>Netto</dt>
          <dd>{eur(tt.net - (v.fee ?? 0))}</dd>
          {!!v.fee && (
            <>
              <dt>Mahnspesen</dt>
              <dd>{eur(v.fee)}</dd>
            </>
          )}
          <dt>
            USt.{" "}
            {locked ? (
              `${v.vat} %`
            ) : (
              <select className="select-sm" value={v.vat} onChange={(e) => set({ vat: Number(e.target.value) })}>
                {[20, 13, 10, 0].map((x) => (
                  <option key={x} value={x}>
                    {x} %
                  </option>
                ))}
              </select>
            )}
          </dt>
          <dd>{eur(tt.tax)}</dd>
          <dt className="total">Gesamt</dt>
          <dd className="total">{eur(tt.gross)}</dd>
        </dl>
        {v.vat === 0 && v.kind !== "mahnung" && <p className="muted small">Ohne USt.: Übergang der Steuerschuld auf den Leistungsempfänger (Bauleistung, § 19 Abs. 1a UStG) – erscheint so auf dem PDF.</p>}
      </div>
      {!isNew && (
        <p className="trail">
          Status: {STATUS[v.status].label}
          {v.paidAt && ` · bezahlt am ${fmt(v.paidAt.slice(0, 10))}`}
          {v.refId && ` · bezieht sich auf ${data.billing.find((b) => b.id === v.refId)?.no ?? ""}`}
        </p>
      )}
    </Modal>
  );
}

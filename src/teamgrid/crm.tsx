"use client";

import { FileText, FolderKanban, Mail, Phone, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { addDays, fmt, today } from "@/core/date";
import { byRole, FIELD, rightsOf } from "@/core/roles";
import { now, personName, uid, useStore } from "@/core/store";
import type { Contact, ContactStatus, Deal, DealStage, Project } from "@/core/types";
import { Avatar, Button, Empty, Field, Modal, PageHead, SearchBox, Seg, Tag } from "@/core/ui";
import { PROJECT_COLORS } from "./model";
import { eur0, KIND, totals } from "./money";

export const CONTACT_STATUS: Record<ContactStatus, { label: string; tone: "blue" | "green" | "gray" | "amber" }> = {
  kunde: { label: "Kunde", tone: "green" },
  interessent: { label: "Interessent", tone: "blue" },
  lieferant: { label: "Lieferant", tone: "gray" },
  partner: { label: "Partner", tone: "amber" }
};

export const STAGES: { key: DealStage; label: string }[] = [
  { key: "anfrage", label: "Anfrage" },
  { key: "besichtigung", label: "Besichtigung" },
  { key: "angebot", label: "Angebot" },
  { key: "beauftragt", label: "Beauftragt" },
  { key: "verloren", label: "Verloren" }
];

const canEdit = (data: Parameters<typeof rightsOf>[0]) => rightsOf(data).sales && !rightsOf(data).readOnly;

/* ------------------------------------------------------------------ contacts */

export function Contacts() {
  const { data } = useStore();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<ContactStatus | "">("");
  const [open, setOpen] = useState<Partial<Contact> | null>(null);
  const term = q.trim().toLowerCase();
  const list = data.contacts
    .filter((c) => (!status || c.status === status) && (!term || `${c.name} ${c.person} ${c.email} ${c.phone} ${c.address} ${c.tags.join(" ")}`.toLowerCase().includes(term)))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
  const count = (s: ContactStatus | "") => (s ? data.contacts.filter((c) => c.status === s).length : data.contacts.length);
  const revenue = (id: string) => data.billing.filter((b) => b.contactId === id && b.kind === "rechnung" && b.status !== "storniert" && b.status !== "entwurf").reduce((s, b) => s + totals(b).net, 0);

  if (!rightsOf(data).sales) return <Empty title="Kein Zugriff">Kunden und Abrechnung sehen Leitung und Büro.</Empty>;
  return (
    <>
      <PageHead kicker="Kontakte" title="Kunden" sub="Kunden, Interessenten, Lieferanten und Partner – mit Projekten, Anfragen und Belegen auf einen Blick.">
        {canEdit(data) && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen({})}>
            Neuer Kontakt
          </Button>
        )}
      </PageHead>
      <div className="toolbar">
        <SearchBox value={q} onChange={setQ} placeholder="Name, Ort, Telefon, Schlagwort…" />
        <Seg<ContactStatus | "">
          value={status}
          onChange={setStatus}
          options={[{ value: "", label: <>Alle <small>{count("")}</small></> }, ...(Object.keys(CONTACT_STATUS) as ContactStatus[]).map((s) => ({ value: s, label: <>{CONTACT_STATUS[s].label} <small>{count(s)}</small></> }))]}
        />
      </div>
      {list.length === 0 ? (
        <Empty title={data.contacts.length ? "Niemand gefunden." : "Noch keine Kontakte."} />
      ) : (
        <div className="panel">
          <table className="table rows-click">
            <thead>
              <tr>
                <th>Firma / Name</th>
                <th>Status</th>
                <th className="hide-md">Kontakt</th>
                <th className="num">Projekte</th>
                <th className="num">Umsatz netto</th>
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c.id} onClick={() => setOpen(c)}>
                  <td>
                    <strong>{c.name}</strong>
                    <small className="sub">{[c.person, c.address].filter(Boolean).join(" · ")}</small>
                  </td>
                  <td>
                    <Tag tone={CONTACT_STATUS[c.status].tone}>{CONTACT_STATUS[c.status].label}</Tag>
                    {c.tags.map((t) => (
                      <span key={t} className="chip">
                        {t}
                      </span>
                    ))}
                  </td>
                  <td className="hide-md muted nowrap">{[c.phone, c.email].filter(Boolean).join(" · ") || "–"}</td>
                  <td className="num">{data.projects.filter((p) => p.contactId === c.id).length || "–"}</td>
                  <td className="num">{revenue(c.id) ? eur0(revenue(c.id)) : "–"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {open && <ContactForm contact={open} onClose={() => setOpen(null)} />}
    </>
  );
}

function ContactForm({ contact, onClose }: { contact: Partial<Contact>; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const isNew = !contact.id;
  const edit = canEdit(data);
  const [v, setV] = useState<Contact>({ id: "", name: "", person: "", email: "", phone: "", address: "", status: "kunde", tags: [], note: "", createdBy: data.meId, createdAt: "", ...contact });
  const set = (x: Partial<Contact>) => setV((o) => ({ ...o, ...x }));
  const projects = data.projects.filter((p) => p.contactId === v.id);
  const deals = data.deals.filter((d) => d.contactId === v.id);
  const docs = data.billing.filter((b) => b.contactId === v.id).sort((a, b) => b.date.localeCompare(a.date));
  const submit = () => {
    if (!v.name.trim()) return;
    save("contacts", { ...v, id: v.id || uid(), name: v.name.trim(), createdAt: v.createdAt || now() });
    notify(isNew ? `${v.name.trim()} angelegt` : "Gespeichert");
    onClose();
  };
  return (
    <Modal
      kicker={isNew ? "Neuer Kontakt" : CONTACT_STATUS[v.status].label}
      title={isNew ? "Kontakt anlegen" : v.name}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && edit && !projects.length && !docs.length && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm(`${v.name} löschen?`) && (remove("contacts", v.id), onClose())}>
              Löschen
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            {edit ? "Abbrechen" : "Schließen"}
          </Button>
          {edit && (
            <Button variant="primary" onClick={submit} disabled={!v.name.trim()}>
              Speichern
            </Button>
          )}
        </>
      }
    >
      <fieldset className="form-grid regie-form" disabled={!edit}>
        <Field label="Firma / Name *" className="span-2">
          <input autoFocus={isNew} value={v.name} onChange={(e) => set({ name: e.target.value })} />
        </Field>
        <Field label="Ansprechperson">
          <input value={v.person} onChange={(e) => set({ person: e.target.value })} />
        </Field>
        <Field label="Status">
          <select value={v.status} onChange={(e) => set({ status: e.target.value as ContactStatus })}>
            {(Object.keys(CONTACT_STATUS) as ContactStatus[]).map((s) => (
              <option key={s} value={s}>
                {CONTACT_STATUS[s].label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Telefon">
          <input type="tel" value={v.phone} onChange={(e) => set({ phone: e.target.value })} />
        </Field>
        <Field label="E-Mail">
          <input type="email" value={v.email} onChange={(e) => set({ email: e.target.value })} />
        </Field>
        <Field label="Adresse" className="span-2">
          <input value={v.address} onChange={(e) => set({ address: e.target.value })} placeholder="Straße, PLZ Ort" />
        </Field>
        <Field label="Schlagworte" hint="mit Komma trennen, z. B. Industrie, Wartungsvertrag" className="span-2">
          <input key={v.id} defaultValue={v.tags.join(", ")} onBlur={(e) => set({ tags: e.target.value.split(",").map((t) => t.trim()).filter(Boolean) })} />
        </Field>
        <Field label="Notiz" className="span-2">
          <textarea rows={2} value={v.note} onChange={(e) => set({ note: e.target.value })} />
        </Field>
      </fieldset>
      {!isNew && (
        <div className="contact-links">
          {(v.phone || v.email) && (
            <p className="contact-actions">
              {v.phone && (
                <a className="b-btn default sm" href={`tel:${v.phone.replace(/\s/g, "")}`}>
                  <Phone size={13} /> Anrufen
                </a>
              )}
              {v.email && (
                <a className="b-btn default sm" href={`mailto:${v.email}`}>
                  <Mail size={13} /> E-Mail
                </a>
              )}
            </p>
          )}
          <h3>Verlauf</h3>
          <ul className="timeline">
            {projects.map((p) => (
              <li key={p.id}>
                <FolderKanban size={14} />
                <Link href={`/projekte/${p.id}`}>Projekt {p.name}</Link>
                <small>{fmt(p.start || today())}</small>
              </li>
            ))}
            {deals.map((d) => (
              <li key={d.id}>
                <Plus size={14} />
                <Link href="/kunden/anfragen">
                  Anfrage {d.title} · {STAGES.find((s) => s.key === d.stage)?.label}
                </Link>
                <small>{eur0(d.value)}</small>
              </li>
            ))}
            {docs.map((b) => (
              <li key={b.id}>
                <FileText size={14} />
                <Link href={`/abrechnung/${b.kind === "angebot" ? "angebote" : b.kind === "mahnung" ? "mahnungen" : "rechnungen"}?beleg=${b.id}`}>
                  {KIND[b.kind].label} {b.no} · {b.title}
                </Link>
                <small>{eur0(totals(b).gross)}</small>
              </li>
            ))}
            {!projects.length && !deals.length && !docs.length && <li className="muted">Noch nichts verknüpft.</li>}
          </ul>
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ inquiry pipeline */

/** Inquiries as a board: drag a card into the next column; a won inquiry becomes a project with one click. */
export function Pipeline() {
  const { data, save, notify } = useStore();
  const router = useRouter();
  const [open, setOpen] = useState<Partial<Deal> | null>(null);
  const [drag, setDrag] = useState("");
  const [over, setOver] = useState<DealStage | "">("");
  const edit = canEdit(data);
  const deals = data.deals;
  const weighted = deals.filter((d) => d.stage !== "verloren" && d.stage !== "beauftragt").reduce((s, d) => s + (d.value * d.probability) / 100, 0);
  const won = deals.filter((d) => d.stage === "beauftragt");

  const move = (id: string, stage: DealStage) => {
    const d = deals.find((x) => x.id === id);
    setDrag("");
    setOver("");
    if (!d || d.stage === stage) return;
    save("deals", { ...d, stage, probability: stage === "beauftragt" ? 100 : stage === "verloren" ? 0 : d.probability }, `Anfrage „${d.title}“ → ${STAGES.find((s) => s.key === stage)?.label}`);
    notify(`${d.title} → ${STAGES.find((s) => s.key === stage)?.label}`);
  };
  if (!rightsOf(data).sales) return <Empty title="Kein Zugriff">Kunden und Abrechnung sehen Leitung und Büro.</Empty>;

  return (
    <>
      <PageHead kicker="Anfragen" title="Kunden" sub="Jede Anfrage von der Besichtigung bis zum Auftrag. Karten ziehen = Phase wechseln. Beauftragt → mit einem Klick ein Projekt.">
        {edit && (
          <Button variant="primary" icon={<Plus size={15} />} onClick={() => setOpen({ stage: "anfrage" })}>
            Neue Anfrage
          </Button>
        )}
      </PageHead>
      <div className="kpis">
        <div className="kpi">
          <span>Offene Anfragen</span>
          <b>{deals.filter((d) => !["beauftragt", "verloren"].includes(d.stage)).length}</b>
        </div>
        <div className="kpi">
          <span>Gewichteter Wert</span>
          <b>{eur0(weighted)}</b>
          <small>Wert × Wahrscheinlichkeit</small>
        </div>
        <div className="kpi">
          <span>Beauftragt</span>
          <b>{eur0(won.reduce((s, d) => s + d.value, 0))}</b>
          <small>{won.length} Aufträge</small>
        </div>
        <div className="kpi">
          <span>Trefferquote</span>
          <b>{won.length + deals.filter((d) => d.stage === "verloren").length ? Math.round((won.length / (won.length + deals.filter((d) => d.stage === "verloren").length)) * 100) : 0} %</b>
          <small>beauftragt / entschieden</small>
        </div>
      </div>
      <div className="board">
        {STAGES.map((s) => {
          const list = deals.filter((d) => d.stage === s.key).sort((a, b) => a.order - b.order || b.value - a.value);
          return (
            <section
              key={s.key}
              className={`board-col st-${s.key} ${over === s.key ? "over" : ""}`}
              onDragOver={(e) => {
                if (!drag) return;
                e.preventDefault();
                setOver(s.key);
              }}
              onDragLeave={() => over === s.key && setOver("")}
              onDrop={(e) => (e.preventDefault(), move(drag, s.key))}
            >
              <header>
                <strong>{s.label}</strong>
                <em>{list.length}</em>
                <small>{eur0(list.reduce((n, d) => n + d.value, 0))}</small>
              </header>
              {list.map((d) => {
                const c = data.contacts.find((x) => x.id === d.contactId);
                return (
                  <article
                    key={d.id}
                    className={`board-card ${drag === d.id ? "dragging" : ""}`}
                    draggable={edit}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", d.title);
                      setTimeout(() => setDrag(d.id));
                    }}
                    onDragEnd={() => (setDrag(""), setOver(""))}
                    onClick={() => setOpen(d)}
                  >
                    <strong>{d.title}</strong>
                    <small>{c?.name ?? "ohne Kunde"}</small>
                    <div className="board-meta">
                      <b>{eur0(d.value)}</b>
                      <span>{d.probability} %</span>
                      {d.closeDate && <span className={d.closeDate < today() && !["beauftragt", "verloren"].includes(d.stage) ? "bad" : ""}>{fmt(d.closeDate).slice(0, 6)}</span>}
                      <Avatar id={d.ownerId} size={20} />
                    </div>
                    {d.stage === "beauftragt" &&
                      (d.projectId ? (
                        <Link className="board-link" href={`/projekte/${d.projectId}`} onClick={(e) => e.stopPropagation()}>
                          <FolderKanban size={13} /> Zum Projekt
                        </Link>
                      ) : (
                        edit && (
                          <button
                            type="button"
                            className="board-link"
                            onClick={(e) => {
                              e.stopPropagation();
                              const p = toProject(d);
                              router.push(`/projekte/${p.id}`);
                            }}
                          >
                            <FolderKanban size={13} /> Projekt anlegen
                          </button>
                        )
                      ))}
                  </article>
                );
              })}
              {edit && s.key === "anfrage" && (
                <button type="button" className="board-add" onClick={() => setOpen({ stage: "anfrage" })}>
                  <Plus size={14} /> Anfrage
                </button>
              )}
            </section>
          );
        })}
      </div>
      {open && <DealForm deal={open} onClose={() => setOpen(null)} onProject={(d) => router.push(`/projekte/${toProject(d).id}`)} />}
    </>
  );

  /** Won inquiry → project of the SiteManager, linked to the customer. */
  function toProject(d: Deal): Project {
    const c = data.contacts.find((x) => x.id === d.contactId);
    const t = today();
    const p: Project = {
      id: uid(),
      name: d.title,
      number: `P-${t.slice(2, 4)}${String(data.projects.length + 1).padStart(2, "0")}`,
      client: c?.name ?? "",
      contactId: d.contactId,
      location: c?.address.split(",").pop()?.trim() ?? "",
      status: "planning",
      start: t,
      due: addDays(t, 60),
      managerId: d.ownerId || data.meId,
      memberIds: [],
      budget: d.value || null,
      description: d.note,
      color: PROJECT_COLORS[data.projects.length % PROJECT_COLORS.length],
      settings: { photoRequired: false, defectApproval: true },
      createdBy: data.meId,
      createdAt: now()
    };
    save("projects", p, `Projekt „${p.name}“ aus Anfrage angelegt`);
    save("deals", { ...d, stage: "beauftragt", probability: 100, projectId: p.id });
    if (c && c.status === "interessent") save("contacts", { ...c, status: "kunde" });
    notify("Projekt angelegt – der Interessent ist jetzt Kunde");
    return p;
  }
}

function DealForm({ deal, onClose, onProject }: { deal: Partial<Deal>; onClose: () => void; onProject: (d: Deal) => void }) {
  const { data, save, remove, notify } = useStore();
  const router = useRouter();
  const isNew = !deal.id;
  const edit = canEdit(data);
  const [v, setV] = useState<Deal>({ id: "", title: "", contactId: data.contacts[0]?.id ?? "", stage: "anfrage", value: 0, probability: 30, ownerId: data.meId, closeDate: addDays(today(), 14), note: "", order: 0, createdBy: data.meId, createdAt: "", ...deal });
  const set = (x: Partial<Deal>) => setV((o) => ({ ...o, ...x }));
  const owners = data.people.filter((p) => p.active && !FIELD.includes(p.rolle)).sort(byRole);
  const quote = data.billing.find((b) => b.kind === "angebot" && b.contactId === v.contactId && b.title === v.title);
  const store = () => {
    const item = { ...v, id: v.id || uid(), title: v.title.trim(), createdAt: v.createdAt || now() };
    save("deals", item, isNew ? `Anfrage „${item.title}“ erfasst` : undefined);
    return item;
  };
  return (
    <Modal
      kicker={isNew ? "Neue Anfrage" : STAGES.find((s) => s.key === v.stage)?.label}
      title={isNew ? "Anfrage erfassen" : v.title}
      onClose={onClose}
      wide
      footer={
        <>
          {!isNew && edit && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={() => window.confirm("Anfrage löschen?") && (remove("deals", v.id), onClose())}>
              Löschen
            </Button>
          )}
          {edit && v.title.trim() && !quote && (
            <Button icon={<FileText size={15} />} onClick={() => (store(), router.push(`/abrechnung/angebote?neu=1&kunde=${v.contactId}&titel=${encodeURIComponent(v.title.trim())}`))}>
              Angebot schreiben
            </Button>
          )}
          {quote && (
            <Link className="b-btn default md" href={`/abrechnung/angebote?beleg=${quote.id}`}>
              <FileText size={15} /> {quote.no}
            </Link>
          )}
          {edit && !v.projectId && v.stage !== "verloren" && v.title.trim() && (
            <Button icon={<FolderKanban size={15} />} onClick={() => (onProject(store()), onClose())}>
              Beauftragt → Projekt
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            {edit ? "Abbrechen" : "Schließen"}
          </Button>
          {edit && (
            <Button variant="primary" disabled={!v.title.trim()} onClick={() => (store(), notify("Gespeichert"), onClose())}>
              Speichern
            </Button>
          )}
        </>
      }
    >
      <fieldset className="form-grid regie-form" disabled={!edit}>
        <Field label="Was wird angefragt? *" className="span-2">
          <input autoFocus={isNew} value={v.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Elektroinstallation Halle 3" />
        </Field>
        <Field label="Kunde">
          <select value={v.contactId} onChange={(e) => set({ contactId: e.target.value })}>
            <option value="">– noch keiner –</option>
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
        <Field label="Phase">
          <select value={v.stage} onChange={(e) => set({ stage: e.target.value as DealStage })}>
            {STAGES.map((s) => (
              <option key={s.key} value={s.key}>
                {s.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Auftragswert netto (€)">
          <input inputMode="decimal" value={v.value || ""} onChange={(e) => set({ value: Number(e.target.value.replace(/[^\d,.]/g, "").replace(",", ".")) || 0 })} />
        </Field>
        <Field label={`Wahrscheinlichkeit · ${v.probability} %`}>
          <input type="range" min={0} max={100} step={10} value={v.probability} onChange={(e) => set({ probability: Number(e.target.value) })} />
        </Field>
        <Field label="Zuständig">
          <select value={v.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            {owners.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Entscheidung erwartet">
          <input type="date" value={v.closeDate} onChange={(e) => set({ closeDate: e.target.value })} />
        </Field>
        <Field label="Notiz" className="span-2">
          <textarea rows={3} value={v.note} onChange={(e) => set({ note: e.target.value })} placeholder="Umfang, Termin Besichtigung, Besonderheiten" />
        </Field>
      </fieldset>
      {!isNew && <p className="trail">Erfasst von {personName(data, v.createdBy) || "–"}</p>}
    </Modal>
  );
}

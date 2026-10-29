"use client";

import { ClipboardPen, FileSignature, FileText, MapPin, Navigation, Pause, Pencil, Phone, Play, Plus, Trash2, Wrench } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Attachments, BlurTextarea, Empty, Field, PageHead, Prio, StatusBadge, useConfirm } from "@/components/app/kit";
import { Button, IconButton, Input, Textarea } from "@/components/ui";
import { fmt, today, weekdayLong } from "@/lib/date";
import { fmtDateTime, fmtNum } from "@/lib/format";
import { now, personName, uid, useStore } from "@/lib/store/store";
import type { Report, ServiceOrder, Signature, WorkLine } from "@/lib/store/types";
import { MaterialLines } from "@/modules/berichte/lines";
import { freeze, KIND_LABEL, newReport, STATUS_LABEL } from "@/modules/berichte/model";
import { SignatureDialog } from "@/modules/berichte/signature";
import { OrderDialog } from "./dialogs";
import { addressOf, isDone, mapsUrl, minutesOf, ORDER_STATUS } from "./model";

const hhmm = (iso: string) => new Date(iso).toLocaleTimeString("de-AT", { hour: "2-digit", minute: "2-digit" });

/** One service order on the technician's tablet: drive there, work, document, let the customer sign. */
export function OrderPage({ id }: { id: string }) {
  const { data, save, remove, notify, restore } = useStore();
  const router = useRouter();
  const ask = useConfirm();
  const [editing, setEditing] = useState(false);
  const [signing, setSigning] = useState<null | "client" | "tech">(null);
  const [accepted, setAccepted] = useState<"ohne" | "vorbehalt">("ohne");
  const [reservation, setReservation] = useState("");
  const [clientSig, setClientSig] = useState<Signature | null>(null);
  const [busy, setBusy] = useState(false);
  const o = data.orders.find((x) => x.id === id);

  if (!o)
    return (
      <div className="page">
        <Empty
          icon={<Wrench size={28} />}
          title="Auftrag nicht gefunden"
          action={
            <Link href="/service" className="ui-button ui-button-secondary ui-button-size-default">
              Zum Service
            </Link>
          }
        />
      </div>
    );

  const c = data.customers.find((x) => x.id === o.customerId);
  const addr = addressOf(o, c);
  const set = (patch: Partial<ServiceOrder>) => save("orders", { ...o, ...patch });
  const running = o.times.find((t) => !t.to);
  const locked = isDone(o);
  const reports = data.reports.filter((r) => r.orderId === o.id);
  const serviceReport = reports.find((r) => r.kind === "service");
  const regie = reports.filter((r) => r.kind === "regie");
  const me = data.people.find((p) => p.id === data.meId);

  const start = () => set({ times: [...o.times, { from: now() }], status: "in_arbeit" });
  const stop = () => set({ times: o.times.map((t) => (t.to ? t : { ...t, to: now() })) });

  /** Time stamps as work lines for the report (technician of the order). */
  const workLines = (closeAt = now()): WorkLine[] =>
    o.times.map((t, i) => ({ id: `${o.id}-t${i}`, personId: o.techId, name: personName(data, o.techId), date: t.from.slice(0, 10), from: hhmm(t.from), to: hhmm(t.to ?? closeAt), pause: 0 }));

  const newRegie = () => {
    const r = newReport(data, "regie", today(), {
      orderId: o.id,
      customerId: o.customerId,
      orderedBy: c?.contact ? `${c.contact} (${c.name})` : (c?.name ?? ""),
      reason: `Zusatzleistung zu Auftrag ${o.no}`,
      workers: [{ id: uid(), personId: data.meId, name: me?.name ?? "", date: today(), from: hhmm(now()), to: hhmm(new Date(Date.now() + 3600_000).toISOString()), pause: 0 }]
    });
    save("reports", r);
    router.push(`/berichte/${r.id}`);
  };

  const begin = () => {
    if (!o.workDone.trim()) return notify("Bitte zuerst „Durchgeführte Arbeiten“ ausfüllen.", { tone: "error" });
    if (!o.times.length) return notify("Bitte die Arbeitszeit erfassen (Start/Stopp oder Zeile hinzufügen).", { tone: "error" });
    setSigning("client");
  };

  const finish = async (techSig: Signature) => {
    setSigning(null);
    setBusy(true);
    try {
      const closeAt = now();
      const times = o.times.map((t) => (t.to ? t : { ...t, to: closeAt }));
      const base = newReport(data, "service", today(), {
        orderId: o.id,
        customerId: o.customerId,
        text: o.workDone,
        workers: workLines(closeAt),
        materials: o.materials,
        files: o.files,
        accepted,
        reservation: accepted === "vorbehalt" ? reservation.trim() : "",
        signClient: clientSig ?? undefined,
        signContractor: techSig,
        status: "unterschrieben"
      });
      const report = await freeze(data, serviceReport ? { ...base, id: serviceReport.id, no: serviceReport.no } : base);
      save("reports", report);
      save("orders", { ...o, times, status: "erledigt" });
      notify(`Unterschrieben – ${report.no} als PDF erstellt und an die Teamleitung zur Freigabe übergeben`);
    } catch {
      notify("PDF konnte nicht erstellt werden", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const drop = async () => {
    if (!(await ask({ title: `Auftrag ${o.no} löschen?`, text: reports.length ? `${reports.length} Berichte zu diesem Auftrag werden mitgelöscht.` : undefined }))) return;
    const before = data;
    remove("orders", o.id);
    router.push("/service?ansicht=auftraege");
    notify("Auftrag gelöscht", { undo: () => restore(before) });
  };

  return (
    <div className="page order-page">
      <PageHead
        crumbs={
          <>
            <Link href="/service">Service</Link> / <span>{o.no}</span>
          </>
        }
        title={
          <span className="title-with-swatch">
            {c?.name ?? "Auftrag"}
            <StatusBadge tone={ORDER_STATUS[o.status].tone}>{ORDER_STATUS[o.status].label}</StatusBadge>
            {o.priority === "hoch" && <Prio p="hoch" />}
          </span>
        }
        sub={`${o.no} · ${o.title}${o.date ? ` · ${weekdayLong(o.date)}, ${fmt(o.date)}` : ""} · ${personName(data, o.techId) || "nicht zugeteilt"}`}
        actions={
          <>
            {!locked && (
              <Button variant="secondary" leftIcon={<Pencil size={14} />} onClick={() => setEditing(true)}>
                Bearbeiten
              </Button>
            )}
            <Button variant="destructive" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
              Löschen
            </Button>
          </>
        }
      />

      <section className="panel order-where">
        <div className="panel-body">
          <p className="order-addr">
            <MapPin size={16} /> <strong>{addr.line || "Keine Adresse"}</strong>
          </p>
          <p className="muted">{[c?.contact, c?.phone, c?.no && `Kd.-Nr. ${c.no}`].filter(Boolean).join(" · ")}</p>
          {c?.note && <p className="signal-text">{c.note}</p>}
        </div>
        <div className="order-buttons">
          {addr.line && (
            <a className="ui-button ui-button-default ui-button-size-lg" href={mapsUrl(addr.line)} target="_blank" rel="noreferrer">
              <Navigation size={16} /> Navigation
            </a>
          )}
          {c?.phone && (
            <a className="ui-button ui-button-secondary ui-button-size-lg" href={`tel:${c.phone.replace(/\s/g, "")}`}>
              <Phone size={16} /> Anrufen
            </a>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Auftrag</h3>
        </div>
        <div className="panel-body">
          <p style={{ whiteSpace: "pre-wrap" }}>{o.description || "Keine Beschreibung."}</p>
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Arbeitszeit</h3>
          <span className="muted">{fmtNum(Math.round(minutesOf(o)) / 60)} h</span>
          <span className="grow" />
          {!locked &&
            (running ? (
              <Button size="lg" variant="secondary" leftIcon={<Pause size={16} />} onClick={stop}>
                Stopp
              </Button>
            ) : (
              <Button size="lg" leftIcon={<Play size={16} />} onClick={start}>
                {o.times.length ? "Weiter" : "Arbeit beginnen"}
              </Button>
            ))}
        </div>
        <div className="panel-body">
          {o.times.length ? (
            <ul className="time-list">
              {o.times.map((t, i) => (
                <li key={i}>
                  <span>{fmt(t.from.slice(0, 10))}</span>
                  <TimeInput value={t.from} disabled={locked} onChange={(v) => set({ times: o.times.map((x, j) => (j === i ? { ...x, from: v } : x)) })} />
                  <span>–</span>
                  {t.to ? <TimeInput value={t.to} disabled={locked} onChange={(v) => set({ times: o.times.map((x, j) => (j === i ? { ...x, to: v } : x)) })} /> : <strong className="signal-text">läuft</strong>}
                  {!locked && (
                    <IconButton label="Zeit entfernen" size="sm" variant="danger" onClick={() => set({ times: o.times.filter((_, j) => j !== i) })}>
                      <Trash2 size={13} />
                    </IconButton>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="muted">Noch keine Zeit erfasst.</p>
          )}
          {!locked && (
            <Button size="sm" variant="ghost" leftIcon={<Plus size={14} />} onClick={() => set({ times: [...o.times, { from: new Date(`${o.date || today()}T07:00:00`).toISOString(), to: new Date(`${o.date || today()}T08:00:00`).toISOString() }] })}>
              Zeit nachtragen
            </Button>
          )}
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Durchgeführte Arbeiten</h3>
        </div>
        <div className="panel-body">
          <BlurTextarea value={o.workDone} rows={5} disabled={locked} placeholder="Was wurde gemacht, gemessen, getauscht – erscheint im Arbeitsbericht" onSave={(v) => set({ workDone: v })} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Material</h3>
        </div>
        <div className="panel-body">
          <MaterialLines value={o.materials} onChange={(materials) => set({ materials })} readOnly={locked} />
        </div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Fotos</h3>
        </div>
        <div className="panel-body">{locked ? <p className="muted">{o.files.length} Fotos</p> : <Attachments files={o.files} onChange={(files) => set({ files })} label="Fotos vom Einsatz" />}</div>
      </section>

      <section className="panel">
        <div className="panel-head">
          <h3>Regiescheine</h3>
          <span className="grow" />
          <Button size="sm" variant="secondary" leftIcon={<ClipboardPen size={14} />} onClick={newRegie}>
            Regieschein
          </Button>
        </div>
        {regie.length ? <ReportRows reports={regie} /> : <p className="panel-body muted">Zusatzarbeiten außerhalb des Auftrags als Regieschein erfassen und vom Kunden bestätigen lassen.</p>}
      </section>

      <section className="panel finish">
        <div className="panel-head">
          <h3>Abschluss</h3>
        </div>
        <div className="panel-body">
          {serviceReport && serviceReport.status !== "zurueck" ? (
            <ReportRows reports={[serviceReport]} />
          ) : (
            <>
              {serviceReport?.status === "zurueck" && <p className="signal-text">Zurückgegeben: {serviceReport.returnNote}</p>}
              <p className="muted">Der Kunde bestätigt am Tablet die Übernahme. Danach entsteht der Arbeitsbericht als PDF und geht zur Freigabe an die Teamleitung.</p>
              <Button size="lg" leftIcon={<FileSignature size={16} />} onClick={begin} disabled={busy}>
                {busy ? "PDF wird erstellt …" : "Kunde unterschreiben lassen"}
              </Button>
            </>
          )}
        </div>
      </section>

      {signing === "client" && (
        <SignatureDialog
          title="Übernahmebestätigung"
          description={`${o.no} · ${o.title}`}
          who="Kunde"
          defaultName={(c?.contact ?? "").toUpperCase()}
          defaultPlace={addr.city}
          confirm="Weiter"
          onClose={() => setSigning(null)}
          onSign={(s) => (setClientSig(s), setSigning("tech"))}
        >
          <div className="sign-summary">
            <p>
              <strong>Durchgeführt:</strong> {o.workDone}
            </p>
            <p>
              <strong>Arbeitszeit:</strong> {fmtNum(Math.round(minutesOf(o)) / 60)} h{o.materials.length ? ` · Material: ${o.materials.map((m) => `${fmtNum(m.qty)} ${m.unit} ${m.name}`).join(", ")}` : ""}
            </p>
          </div>
          <div className="accept">
            <label className="check-row">
              <input type="radio" name="acc" checked={accepted === "ohne"} onChange={() => setAccepted("ohne")} /> Leistung ordnungsgemäß erbracht und <strong>ohne Vorbehalt</strong> übernommen
            </label>
            <label className="check-row">
              <input type="radio" name="acc" checked={accepted === "vorbehalt"} onChange={() => setAccepted("vorbehalt")} /> Übernahme <strong>mit Vorbehalt</strong>
            </label>
            {accepted === "vorbehalt" && (
              <Field label="Vorbehalt (Mängel, Restarbeiten)">
                <Textarea value={reservation} onChange={(e) => setReservation(e.target.value)} rows={2} />
              </Field>
            )}
          </div>
        </SignatureDialog>
      )}
      {signing === "tech" && <SignatureDialog title="Unterschrift Techniker" who={me?.name ?? ""} defaultName={(personName(data, o.techId) || me?.name || "").toUpperCase()} defaultPlace={addr.city} confirm="Abschließen & PDF erstellen" onClose={() => setSigning(null)} onSign={(s) => void finish(s)} />}
      {editing && <OrderDialog order={o} onClose={() => setEditing(false)} />}
    </div>
  );
}

function TimeInput({ value, onChange, disabled }: { value: string; onChange: (iso: string) => void; disabled?: boolean }) {
  return (
    <Input
      type="time"
      className="time-input"
      value={hhmm(value)}
      disabled={disabled}
      aria-label="Uhrzeit"
      onChange={(e) => {
        if (!e.target.value) return;
        const d = new Date(value);
        const [h, m] = e.target.value.split(":").map(Number);
        d.setHours(h, m, 0, 0);
        onChange(d.toISOString());
      }}
    />
  );
}

function ReportRows({ reports }: { reports: Report[] }) {
  return (
    <div className="list-rows">
      {reports.map((r) => (
        <Link key={r.id} href={`/berichte/${r.id}`}>
          <FileText size={15} className="muted" />
          <span className="title">
            <strong>
              {KIND_LABEL[r.kind]} {r.no}
            </strong>{" "}
            <small className="muted">· {fmtDateTime(r.signClient?.at ?? r.createdAt)}</small>
          </span>
          <StatusBadge tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].label}</StatusBadge>
        </Link>
      ))}
    </div>
  );
}

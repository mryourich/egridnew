"use client";

import { CheckCircle2, Eye, FileSignature, FileText, Send, Trash2, Undo2, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Attachments, BlurInput, BlurTextarea, Empty, Field, Modal, PageHead, StatusBadge, useConfirm } from "@/components/app/kit";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { fmt, inRange, weekdayLong } from "@/lib/date";
import { fmtDateTime } from "@/lib/format";
import { readFile } from "@/lib/store/files";
import { now, personName, uid, useStore } from "@/lib/store/store";
import type { Report, Signature } from "@/lib/store/types";
import { DeviceLines, MaterialLines, WorkLines } from "./lines";
import { approveReport, canApprove, freeze, KIND_LABEL, previewPdf, sharePdf, STATUS_LABEL } from "./model";
import { SignatureDialog } from "./signature";

const WEATHER = ["Sonnig", "Heiter", "Bewölkt", "Regen", "Starkregen", "Schnee", "Frost", "Nebel", "Wind / Sturm", "Hitze"];

export async function openBlob(blob: Blob | undefined) {
  if (!blob) return false;
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank");
  if (!w) {
    const a = document.createElement("a");
    a.href = url;
    a.target = "_blank";
    a.click();
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
  return true;
}

/** Signing steps: client first (handed the tablet), then contractor. */
type Step = "client" | "contractor";

export function ReportPage({ id }: { id: string }) {
  const { data, save, remove, notify, restore } = useStore();
  const router = useRouter();
  const ask = useConfirm();
  const [step, setStep] = useState<Step | null>(null);
  const [busy, setBusy] = useState(false);
  const [returning, setReturning] = useState(false);
  const r = data.reports.find((x) => x.id === id);
  const me = data.people.find((p) => p.id === data.meId);

  if (!r)
    return (
      <div className="page">
        <Empty
          icon={<FileText size={28} />}
          title="Bericht nicht gefunden"
          text="Er wurde gelöscht oder der Link ist nicht mehr gültig."
          action={
            <Link href="/berichte" className="ui-button ui-button-secondary ui-button-size-default">
              Zu den Berichten
            </Link>
          }
        />
      </div>
    );

  const editable = r.status === "entwurf" || r.status === "zurueck";
  const set = (patch: Partial<Report>) => save("reports", { ...r, ...patch });
  const site = data.sites.find((s) => s.id === r.siteId);
  const order = data.orders.find((o) => o.id === r.orderId);
  const customer = data.customers.find((c) => c.id === (r.customerId || order?.customerId));
  const place = site?.address.split(",").pop()?.trim().replace(/^\d+\s*/, "") || customer?.city || "";
  const lead = canApprove(data);
  const ref = site ? site.name : customer ? `${customer.name}${order ? ` · ${order.no}` : ""}` : "";

  const missing = [
    !r.text.trim() && (r.kind === "regie" ? "Beschreibung der Leistung" : "Ausgeführte Arbeiten"),
    r.kind === "regie" && !r.orderedBy.trim() && "Angeordnet von",
    !r.workers.length && r.kind !== "service" && "mindestens eine Person"
  ].filter(Boolean) as string[];

  const startSigning = () => {
    if (missing.length) return notify(`Bitte noch ausfüllen: ${missing.join(", ")}`, { tone: "error" });
    setStep(r.kind === "bautagesbericht" ? "contractor" : "client");
  };

  const finish = async (signed: Report) => {
    setBusy(true);
    try {
      // whoever may release and signs it himself releases it right away
      const out = await freeze(data, lead ? { ...signed, status: "freigegeben", approvedBy: data.meId, approvedAt: now(), returnNote: undefined } : { ...signed, status: "unterschrieben", returnNote: undefined });
      save("reports", out);
      notify(lead ? `${KIND_LABEL[r.kind]} ${r.no} unterschrieben und freigegeben – PDF im Archiv` : `${KIND_LABEL[r.kind]} ${r.no} unterschrieben – PDF erstellt, wartet auf Freigabe`);
    } catch {
      notify("PDF konnte nicht erstellt werden", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const onSign = (s: Signature) => {
    if (step === "client") {
      const next = { ...r, signClient: s };
      save("reports", next);
      setStep("contractor");
    } else {
      setStep(null);
      void finish({ ...r, signContractor: s });
    }
  };

  const approve = async () => {
    setBusy(true);
    try {
      await approveReport(data, r, save);
      notify(`${r.no} freigegeben`);
    } catch {
      notify("PDF konnte nicht erstellt werden", { tone: "error" });
    } finally {
      setBusy(false);
    }
  };

  const drop = async () => {
    if (!(await ask({ title: `${KIND_LABEL[r.kind]} ${r.no} löschen?` }))) return;
    const before = data;
    remove("reports", r.id);
    router.push(order ? `/service/auftrag/${order.id}` : "/berichte");
    notify("Gelöscht", { undo: () => restore(before) });
  };

  const fromPlanner = () => {
    const people = data.entries.filter((e) => e.siteId === r.siteId && !e.symbol && inRange(r.date, e.start, e.end)).map((e) => e.rowId);
    const ids = [...new Set(people)].filter((pid) => data.people.some((p) => p.id === pid) && !r.workers.some((w) => w.personId === pid));
    if (!ids.length) return notify("Im Planner ist für diesen Tag niemand weiterer auf dieser Baustelle eingeteilt.");
    set({ workers: [...r.workers, ...ids.map((pid) => ({ id: uid(), personId: pid, name: personName(data, pid), date: r.date, from: "07:00", to: "16:00", pause: 30 }))] });
    notify(`${ids.length} ${ids.length === 1 ? "Person" : "Personen"} aus dem Planner übernommen`);
  };

  return (
    <div className="page report-page">
      <PageHead
        crumbs={
          <>
            {order ? <Link href={`/service/auftrag/${order.id}`}>Auftrag {order.no}</Link> : <Link href="/berichte">Berichte</Link>} / <span>{r.no}</span>
          </>
        }
        title={
          <span className="title-with-swatch">
            {KIND_LABEL[r.kind]} {r.no}
            <StatusBadge tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].label}</StatusBadge>
          </span>
        }
        sub={`${weekdayLong(r.date)}, ${fmt(r.date)}${ref ? ` · ${ref}` : ""}`}
        actions={
          <>
            {editable && (
              <Button variant="destructive" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
                Löschen
              </Button>
            )}
            {r.pdf ? (
              <>
                <Button variant="secondary" leftIcon={<FileText size={14} />} onClick={async () => ((await openBlob(await readFile(r.pdf!.id))) ? undefined : notify("PDF nicht auf diesem Gerät", { tone: "error" }))}>
                  PDF öffnen
                </Button>
                <Button variant="secondary" leftIcon={<Send size={14} />} onClick={async () => ((await sharePdf(r, `${KIND_LABEL[r.kind]} ${r.no}`)) ? undefined : notify("PDF nicht auf diesem Gerät", { tone: "error" }))}>
                  Senden
                </Button>
              </>
            ) : (
              <Button variant="secondary" leftIcon={<Eye size={14} />} onClick={async () => void openBlob(await previewPdf(data, r))}>
                Vorschau
              </Button>
            )}
            {editable && (
              <Button leftIcon={<FileSignature size={15} />} onClick={startSigning} disabled={busy}>
                {busy ? "PDF wird erstellt …" : lead ? "Unterschreiben & freigeben" : "Unterschreiben & abschließen"}
              </Button>
            )}
            {r.status === "unterschrieben" && lead && (
              <>
                <Button variant="secondary" leftIcon={<Undo2 size={14} />} onClick={() => setReturning(true)}>
                  Zurückgeben
                </Button>
                <Button leftIcon={<CheckCircle2 size={15} />} onClick={() => void approve()} disabled={busy}>
                  Freigeben
                </Button>
              </>
            )}
          </>
        }
      />

      {r.status === "zurueck" && r.returnNote && (
        <div className="alert-bar" role="status">
          <Undo2 size={16} /> <span>Zurückgegeben: {r.returnNote}</span>
        </div>
      )}
      {r.status === "unterschrieben" && !lead && (
        <p className="muted">
          Unterschrieben – wartet auf Freigabe durch{" "}
          {data.people
            .filter((p) => p.lead && p.active)
            .map((p) => p.name)
            .join(", ") || "die Team- oder Bauleitung"}
          .
        </p>
      )}
      {r.status === "freigegeben" && (
        <p className="ok-text">
          Freigegeben von {personName(data, r.approvedBy ?? "")} am {fmtDateTime(r.approvedAt)}
        </p>
      )}

      <div className="report-grid">
        <section className="panel">
          <div className="panel-head">
            <h3>Allgemein</h3>
          </div>
          <div className="panel-body form-grid">
            <Field label="Datum">
              <Input type="date" value={r.date} disabled={!editable} onChange={(e) => e.target.value && set({ date: e.target.value })} />
            </Field>
            {site ? (
              <Field label="Baustelle">
                <Input value={`${site.name} (${site.number})`} disabled />
              </Field>
            ) : (
              <Field label="Kunde">
                <Input value={customer?.name ?? ""} disabled />
              </Field>
            )}
            {r.kind === "bautagesbericht" && (
              <>
                <Field label="Wetter">
                  <Select value={r.weather} disabled={!editable} onChange={(e) => set({ weather: e.target.value })}>
                    <option value="">–</option>
                    {WEATHER.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="form-grid">
                  <Field label="°C früh">
                    <BlurInput value={r.tempAm} inputMode="numeric" disabled={!editable} onSave={(v) => set({ tempAm: v })} />
                  </Field>
                  <Field label="°C mittags">
                    <BlurInput value={r.tempPm} inputMode="numeric" disabled={!editable} onSave={(v) => set({ tempPm: v })} />
                  </Field>
                </div>
              </>
            )}
            {r.kind === "regie" && (
              <>
                <Field label="Angeordnet von" className="span-2" hint="Wer hat die Zusatzleistung beauftragt (Name, Funktion)?">
                  <BlurInput value={r.orderedBy} disabled={!editable} onSave={(v) => set({ orderedBy: v })} />
                </Field>
                <Field label="Grund / Bezug" className="span-2">
                  <BlurInput value={r.reason} disabled={!editable} placeholder="z. B. nicht im Leistungsverzeichnis, Kundenwunsch vor Ort" onSave={(v) => set({ reason: v })} />
                </Field>
              </>
            )}
          </div>
        </section>

        <Block title={r.kind === "regie" ? "Beschreibung der Leistung" : "Ausgeführte Arbeiten"}>
          <BlurTextarea value={r.text} rows={6} disabled={!editable} onSave={(v) => set({ text: v })} placeholder={r.kind === "regie" ? "Was wurde in Regie gemacht – Ort, Umfang" : "Bereich, Geschoß, Tätigkeit"} />
        </Block>
      </div>

      <Block
        title={r.kind === "service" ? "Arbeitszeit" : r.kind === "regie" ? "Arbeitskräfte" : "Personal auf der Baustelle"}
        action={
          editable &&
          r.kind === "bautagesbericht" && (
            <Button size="sm" variant="secondary" leftIcon={<Users size={14} />} onClick={fromPlanner}>
              Aus Planner übernehmen
            </Button>
          )
        }
      >
        <WorkLines value={r.workers} onChange={(workers) => set({ workers })} date={r.date} prices={false} readOnly={!editable} />
      </Block>

      {r.kind !== "bautagesbericht" && (
        <Block title="Material">
          <MaterialLines value={r.materials} onChange={(materials) => set({ materials })} prices={false} readOnly={!editable} />
        </Block>
      )}
      {r.kind !== "service" && (
        <Block title="Geräte">
          <DeviceLines value={r.devices} onChange={(devices) => set({ devices })} prices={false} readOnly={!editable} />
        </Block>
      )}

      {r.kind === "bautagesbericht" && (
        <div className="report-grid">
          <Block title="Lieferungen / Material">
            <BlurTextarea value={r.deliveries} rows={3} disabled={!editable} onSave={(v) => set({ deliveries: v })} />
          </Block>
          <Block title="Behinderungen, besondere Vorkommnisse">
            <BlurTextarea value={r.hindrances} rows={3} disabled={!editable} onSave={(v) => set({ hindrances: v })} placeholder="Wartezeiten, fehlende Vorleistungen, Unfälle, Schäden" />
          </Block>
          <Block title="Anordnungen des Auftraggebers">
            <BlurTextarea value={r.instructions} rows={3} disabled={!editable} onSave={(v) => set({ instructions: v })} />
          </Block>
          <Block title="Besuche, Begehungen">
            <BlurTextarea value={r.visitors} rows={3} disabled={!editable} onSave={(v) => set({ visitors: v })} />
          </Block>
        </div>
      )}

      <Block title="Fotos">
        {editable ? <Attachments files={r.files} onChange={(files) => set({ files })} label="Fotos zum Bericht" /> : <p className="muted">{r.files.length ? `${r.files.length} Fotos im PDF` : "Keine Fotos"}</p>}
      </Block>

      {(r.signClient || r.signContractor) && (
        <Block title="Unterschriften">
          <div className="sig-view">
            {[
              ["Auftraggeber", r.signClient],
              ["Auftragnehmer", r.signContractor]
            ].map(([label, s]) =>
              s ? (
                <figure key={label as string}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={(s as Signature).png} alt={`Unterschrift ${label}`} />
                  <figcaption>
                    {label as string}: {(s as Signature).name}, {(s as Signature).place} {fmtDateTime((s as Signature).at)}
                  </figcaption>
                </figure>
              ) : null
            )}
          </div>
        </Block>
      )}

      {step === "client" && (
        <SignatureDialog
          title={r.kind === "regie" ? "Bestätigung Auftraggeber" : "Unterschrift Kunde"}
          description={r.kind === "regie" ? "Der Auftraggeber bestätigt Art und Umfang der Regieleistungen." : undefined}
          who="Auftraggeber"
          defaultPlace={place}
          confirm="Weiter"
          onClose={() => setStep(null)}
          onSign={onSign}
        >
          <Summary r={r} />
        </SignatureDialog>
      )}
      {step === "contractor" && (
        <SignatureDialog
          title={r.kind === "bautagesbericht" ? "Unterschrift Bauleitung" : "Unterschrift Auftragnehmer"}
          who={me?.name ?? ""}
          defaultName={(me?.name ?? "").toUpperCase()}
          defaultPlace={place}
          confirm="Abschließen & PDF erstellen"
          onClose={() => setStep(null)}
          onSign={onSign}
        >
          {r.kind === "bautagesbericht" && (
            <p className="muted" style={{ marginBottom: 12 }}>
              Unterschrift des Auftraggebers / der ÖBA ist beim Bautagesbericht optional.{" "}
              <button type="button" className="link" onClick={() => setStep("client")}>
                Auftraggeber zuerst unterschreiben lassen
              </button>
            </p>
          )}
        </SignatureDialog>
      )}
      {returning && <ReturnDialog onClose={() => setReturning(false)} onReturn={(note) => {
            setReturning(false);
            set({ status: "zurueck", returnNote: note, signClient: undefined, signContractor: undefined, pdf: undefined, hash: undefined });
            // a returned service report reopens the order for the technician
            if (r.kind === "service" && order) save("orders", { ...order, status: "in_arbeit" });
            notify(`${r.no} zurückgegeben`);
          }} />}
    </div>
  );
}

function Block({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="panel">
      <div className="panel-head">
        <h3>{title}</h3>
        <span className="grow" />
        {action}
      </div>
      <div className="panel-body">{children}</div>
    </section>
  );
}

/** Short summary shown to the client before signing. */
function Summary({ r }: { r: Report }) {
  const { data } = useStore();
  return (
    <div className="sign-summary">
      <p>
        <strong>{r.kind === "regie" ? "Regieleistung" : "Leistung"}:</strong> {r.text || "–"}
      </p>
      {r.workers.length > 0 && (
        <p>
          <strong>Arbeitskräfte:</strong> {r.workers.map((w) => `${data.people.find((p) => p.id === w.personId)?.role || w.name} ${w.from}–${w.to}`).join(", ")}
        </p>
      )}
      {r.materials.length > 0 && (
        <p>
          <strong>Material:</strong> {r.materials.map((m) => `${m.qty} ${m.unit} ${m.name}`).join(", ")}
        </p>
      )}
    </div>
  );
}

function ReturnDialog({ onClose, onReturn }: { onClose: () => void; onReturn: (note: string) => void }) {
  const [note, setNote] = useState("");
  return (
    <Modal
      title="Zurückgeben"
      description="Die Unterschriften werden entfernt, der Bericht ist wieder bearbeitbar."
      onClose={onClose}
      onSubmit={() => note.trim() && onReturn(note.trim())}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!note.trim()}>
            Zurückgeben
          </Button>
        </>
      }
    >
      <Field label="Was ist zu korrigieren?">
        <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={3} autoFocus />
      </Field>
    </Modal>
  );
}

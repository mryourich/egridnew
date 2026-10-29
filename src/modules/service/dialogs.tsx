"use client";

import { useState } from "react";
import { Field, Modal } from "@/components/app/kit";
import { Button, Input, Select, Textarea } from "@/components/ui";
import { PRIORITIES, PRIORITY } from "@/lib/labels";
import { now, uid, useStore } from "@/lib/store/store";
import type { Customer, Priority, ServiceOrder } from "@/lib/store/types";
import { nextCustomerNo, nextOrderNo, ordersOf, technicians } from "./model";

export function CustomerDialog({ customer, onClose, onSaved }: { customer?: Customer; onClose: () => void; onSaved?: (c: Customer) => void }) {
  const { data, save, notify } = useStore();
  const [c, setC] = useState<Customer>(() => customer ?? { id: uid(), no: nextCustomerNo(data), name: "", contact: "", street: "", zip: "", city: "", phone: "", email: "", uid: "", note: "", createdBy: data.meId, createdAt: now() });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Customer>) => setC((x) => ({ ...x, ...patch }));
  const errs = {
    name: !c.name.trim() ? "Name bzw. Firma eingeben" : "",
    address: !c.street.trim() || !c.city.trim() ? "Straße und Ort werden für die Navigation gebraucht" : "",
    no: data.customers.some((x) => x.id !== c.id && x.no === c.no.trim()) ? "Kundennummer schon vergeben" : "",
    uid: c.uid.trim() && !/^ATU\d{8}$/i.test(c.uid.replace(/\s/g, "")) && /^AT/i.test(c.uid.trim()) ? "Österreichische UID: ATU + 8 Ziffern" : ""
  };
  const submit = () => {
    setTried(true);
    if (errs.name || errs.address || errs.no) return;
    const out = { ...c, name: c.name.trim(), no: c.no.trim(), uid: c.uid.replace(/\s/g, "").toUpperCase() };
    save("customers", out);
    notify(customer ? "Kunde gespeichert" : `Kunde „${out.name}“ angelegt`);
    onSaved?.(out);
    onClose();
  };
  const e = (k: keyof typeof errs) => (tried ? errs[k] : "");
  return (
    <Modal
      size="wide"
      title={customer ? "Kunde bearbeiten" : "Neuer Kunde"}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">{customer ? "Speichern" : "Anlegen"}</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Name / Firma" error={e("name")}>
          <Input value={c.name} onChange={(ev) => set({ name: ev.target.value })} autoFocus />
        </Field>
        <Field label="Kundennummer" error={e("no")}>
          <Input value={c.no} onChange={(ev) => set({ no: ev.target.value })} className="mono" />
        </Field>
        <Field label="Ansprechpartner">
          <Input value={c.contact} onChange={(ev) => set({ contact: ev.target.value })} />
        </Field>
        <Field label="Telefon">
          <Input value={c.phone} type="tel" onChange={(ev) => set({ phone: ev.target.value })} />
        </Field>
        <Field label="Straße" className="span-2" error={e("address")}>
          <Input value={c.street} onChange={(ev) => set({ street: ev.target.value })} />
        </Field>
        <Field label="PLZ">
          <Input value={c.zip} inputMode="numeric" onChange={(ev) => set({ zip: ev.target.value })} />
        </Field>
        <Field label="Ort">
          <Input value={c.city} onChange={(ev) => set({ city: ev.target.value })} />
        </Field>
        <Field label="E-Mail">
          <Input value={c.email} type="email" onChange={(ev) => set({ email: ev.target.value })} />
        </Field>
        <Field label="UID-Nummer" hint="Bei Firmenkunden, z. B. ATU12345678" error={e("uid")}>
          <Input value={c.uid} onChange={(ev) => set({ uid: ev.target.value })} className="mono" />
        </Field>
        <Field label="Notiz" className="span-2">
          <Textarea value={c.note} rows={2} onChange={(ev) => set({ note: ev.target.value })} placeholder="z. B. Schlüssel beim Hausbesorger, Hund im Garten" />
        </Field>
      </div>
    </Modal>
  );
}

export function OrderDialog({ order, defaults, onClose, onSaved }: { order?: ServiceOrder; defaults?: Partial<ServiceOrder>; onClose: () => void; onSaved?: (o: ServiceOrder) => void }) {
  const { data, save, notify } = useStore();
  const [o, setO] = useState<ServiceOrder>(
    () =>
      order ?? {
        id: uid(),
        no: nextOrderNo(data),
        customerId: data.customers[0]?.id ?? "",
        street: "",
        zip: "",
        city: "",
        title: "",
        description: "",
        priority: "mittel",
        techId: "",
        date: "",
        seq: 0,
        status: "offen",
        times: [],
        workDone: "",
        materials: [],
        files: [],
        createdBy: data.meId,
        createdAt: now(),
        ...defaults
      }
  );
  const [other, setOther] = useState(!!o.street);
  const [newCustomer, setNewCustomer] = useState(false);
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<ServiceOrder>) => setO((x) => ({ ...x, ...patch }));
  const techs = technicians(data);
  const errs = { title: !o.title.trim() ? "Kurz beschreiben, was zu tun ist" : "", customer: !o.customerId ? "Kunde wählen oder anlegen" : "" };
  const max = data.workspace.maxPerDay ?? 10;
  const load = o.techId && o.date ? ordersOf(data, o.techId, o.date).filter((x) => x.id !== o.id).length : 0;
  const submit = () => {
    setTried(true);
    if (errs.title || errs.customer) return;
    const planned = !!(o.techId && o.date);
    const moved = !order || order.techId !== o.techId || order.date !== o.date;
    const out: ServiceOrder = {
      ...o,
      title: o.title.trim(),
      street: other ? o.street : "",
      zip: other ? o.zip : "",
      city: other ? o.city : "",
      status: o.status === "offen" || o.status === "geplant" ? (planned ? "geplant" : "offen") : o.status,
      seq: planned && moved ? load + 1 : o.seq
    };
    save("orders", out);
    notify(order ? "Auftrag gespeichert" : `Auftrag ${out.no} angelegt`);
    onSaved?.(out);
    onClose();
  };
  return (
    <Modal
      size="wide"
      title={order ? `Auftrag ${order.no}` : "Neuer Auftrag"}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">{order ? "Speichern" : "Anlegen"}</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Kunde" error={tried ? errs.customer : ""}>
          <div className="inline-pair">
            <Select value={o.customerId} onChange={(e) => set({ customerId: e.target.value })}>
              {!data.customers.length && <option value="">Noch kein Kunde</option>}
              {[...data.customers]
                .sort((a, b) => a.name.localeCompare(b.name, "de"))
                .map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} · {c.city}
                  </option>
                ))}
            </Select>
            <Button type="button" size="sm" variant="secondary" onClick={() => setNewCustomer(true)}>
              Neu
            </Button>
          </div>
        </Field>
        <Field label="Priorität">
          <Select value={o.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
            {PRIORITIES.map((k) => (
              <option key={k} value={k}>
                {PRIORITY[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Auftrag" className="span-2" error={tried ? errs.title : ""}>
          <Input value={o.title} onChange={(e) => set({ title: e.target.value })} placeholder="z. B. Gastherme Jahreswartung" autoFocus />
        </Field>
        <Field label="Beschreibung" className="span-2">
          <Textarea value={o.description} rows={4} onChange={(e) => set({ description: e.target.value })} placeholder="Was ist zu tun, was ist mitzunehmen, Zugang, Ansprechpartner vor Ort" />
        </Field>
        <label className="check-row span-2">
          <input type="checkbox" className="ui-checkbox" checked={other} onChange={(e) => setOther(e.target.checked)} /> Einsatzort weicht von der Kundenadresse ab
        </label>
        {other && (
          <>
            <Field label="Straße (Einsatzort)" className="span-2">
              <Input value={o.street} onChange={(e) => set({ street: e.target.value })} />
            </Field>
            <Field label="PLZ">
              <Input value={o.zip} onChange={(e) => set({ zip: e.target.value })} />
            </Field>
            <Field label="Ort">
              <Input value={o.city} onChange={(e) => set({ city: e.target.value })} />
            </Field>
          </>
        )}
        <Field label="Techniker">
          <Select value={o.techId} onChange={(e) => set({ techId: e.target.value })}>
            <option value="">Noch nicht zugeteilt</option>
            {techs.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Datum" hint={o.techId && o.date ? `${load} von ${max} Aufträgen an diesem Tag${load >= max ? " – Tag ist voll" : ""}` : undefined}>
          <Input type="date" value={o.date} onChange={(e) => set({ date: e.target.value })} />
        </Field>
      </div>
      {newCustomer && <CustomerDialog onClose={() => setNewCustomer(false)} onSaved={(c) => set({ customerId: c.id })} />}
    </Modal>
  );
}

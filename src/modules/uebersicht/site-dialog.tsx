"use client";

import { useState } from "react";
import { Field, Modal, PersonOptions } from "@/components/app/kit";
import { Button, Checkbox, Input, Select, Textarea } from "@/components/ui";
import { today } from "@/lib/date";
import { SITE_STATUS, SITE_STATUSES } from "@/lib/labels";
import { SITE_COLORS } from "@/lib/store/seed";
import { uid, useStore } from "@/lib/store/store";
import type { Site } from "@/lib/store/types";

/** Next free site number in the style 2026-001. */
function nextNumber(sites: Site[]) {
  const y = today().slice(0, 4);
  const n = Math.max(0, ...sites.filter((s) => s.number.startsWith(`${y}-`)).map((s) => Number(s.number.slice(5)) || 0));
  return `${y}-${String(n + 1).padStart(3, "0")}`;
}

export function SiteDialog({ site, onClose, onSaved }: { site?: Site; onClose: () => void; onSaved?: (s: Site) => void }) {
  const { data, save, notify } = useStore();
  const [s, setS] = useState<Site>(
    () =>
      site ?? {
        id: uid(),
        number: nextNumber(data.sites),
        name: "",
        client: "",
        address: "",
        status: "geplant",
        start: today(),
        end: "",
        managerId: data.meId,
        memberIds: [],
        color: SITE_COLORS[data.sites.length % SITE_COLORS.length],
        note: "",
        createdBy: data.meId,
        createdAt: ""
      }
  );
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Site>) => setS((x) => ({ ...x, ...patch }));
  const nameErr = !s.name.trim() ? "Bitte einen Namen eingeben" : "";
  const endErr = s.start && s.end && s.end < s.start ? "Ende liegt vor dem Beginn" : "";
  const people = data.people.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name, "de"));

  const submit = () => {
    setTried(true);
    if (nameErr || endErr) return;
    const out = { ...s, name: s.name.trim(), client: s.client.trim(), address: s.address.trim(), number: s.number.trim() };
    save("sites", out);
    notify(site ? "Baustelle gespeichert" : `Baustelle „${out.name}“ angelegt`);
    onSaved?.(out);
    onClose();
  };

  return (
    <Modal
      size="wide"
      title={site ? "Baustelle bearbeiten" : "Neue Baustelle"}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">{site ? "Speichern" : "Anlegen"}</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Bezeichnung" error={tried ? nameErr : ""}>
          <Input value={s.name} onChange={(e) => set({ name: e.target.value })} placeholder="z. B. Wohnanlage Linz-Urfahr" autoFocus />
        </Field>
        <Field label="Baustellen-Nr.">
          <Input value={s.number} onChange={(e) => set({ number: e.target.value })} />
        </Field>
        <Field label="Auftraggeber">
          <Input value={s.client} onChange={(e) => set({ client: e.target.value })} />
        </Field>
        <Field label="Adresse">
          <Input value={s.address} onChange={(e) => set({ address: e.target.value })} placeholder="Straße, PLZ Ort" />
        </Field>
        <Field label="Status">
          <Select value={s.status} onChange={(e) => set({ status: e.target.value as Site["status"] })}>
            {SITE_STATUSES.map((k) => (
              <option key={k} value={k}>
                {SITE_STATUS[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Bauleitung">
          <Select value={s.managerId} onChange={(e) => set({ managerId: e.target.value })}>
            <PersonOptions />
          </Select>
        </Field>
        <Field label="Beginn">
          <Input type="date" value={s.start} onChange={(e) => set({ start: e.target.value })} />
        </Field>
        <Field label="Fertigstellung" error={endErr}>
          <Input type="date" value={s.end} min={s.start || undefined} onChange={(e) => set({ end: e.target.value })} />
        </Field>
        <div className="field span-2">
          <span>Farbe (Kalender)</span>
          <div className="color-row" role="radiogroup" aria-label="Farbe">
            {SITE_COLORS.map((c) => (
              <button key={c} type="button" role="radio" aria-checked={s.color === c} aria-label={c} className={s.color === c ? "on" : ""} style={{ background: c }} onClick={() => set({ color: c })} />
            ))}
          </div>
        </div>
        <div className="field span-2">
          <span>Team auf der Baustelle</span>
          <div className="check-grid">
            {people.map((p) => (
              <label key={p.id} className="check-row">
                <Checkbox checked={s.memberIds.includes(p.id)} onChange={(e) => set({ memberIds: e.target.checked ? [...s.memberIds, p.id] : s.memberIds.filter((x) => x !== p.id) })} />
                {p.name} <small className="muted">{p.role}</small>
              </label>
            ))}
          </div>
        </div>
        <Field label="Notiz" className="span-2">
          <Textarea value={s.note} onChange={(e) => set({ note: e.target.value })} rows={3} />
        </Field>
      </div>
    </Modal>
  );
}

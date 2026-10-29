"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { Field, Modal, Seg } from "@/components/app/kit";
import { Button, Checkbox, Input, Select, Textarea } from "@/components/ui";
import { fmt, today, weekdayShort } from "@/lib/date";
import { activeSites, now, uid, useStore } from "@/lib/store/store";
import type { Absence, AbsenceType, CalendarEntry } from "@/lib/store/types";
import { ABS_TYPES, ABSENCE, withMember } from "./plan-kit";

export type PlanEdit =
  | { kind: "new"; rowId: string; day: string; pm: boolean; siteId?: string }
  | { kind: "job"; job: CalendarEntry }
  | { kind: "absence"; absence: Absence };

type Part = "ganz" | "vm" | "nm";

/** Plan a person or a free row on a site – or enter an absence. */
export function EntrySheet({ edit, onClose, who }: { edit: PlanEdit; onClose: () => void; who?: string }) {
  const { data, save, remove, notify } = useStore();
  const sites = activeSites(data);
  const job = edit.kind === "job" ? edit.job : undefined;
  const absence = edit.kind === "absence" ? edit.absence : undefined;
  const startDay = job?.start ?? absence?.start ?? (edit.kind === "new" ? edit.day : today());
  const [rowId, setRowId] = useState(job?.rowId ?? absence?.personId ?? (edit.kind === "new" ? edit.rowId : ""));
  const person = data.people.find((e) => e.id === rowId);
  const rows = [...data.people.filter((p) => p.active).map((p) => ({ id: p.id, name: p.name })), ...(data.calendar.rows ?? [])];

  const [mode, setMode] = useState<"job" | "away">(absence ? "away" : "job");
  const [siteId, setSiteId] = useState(job?.siteId ?? (edit.kind === "new" ? edit.siteId : undefined) ?? sites[0]?.id ?? "");
  const [title, setTitle] = useState(job?.title ?? "");
  const [note, setNote] = useState(job?.note ?? absence?.note ?? "");
  const [done, setDone] = useState(job?.done ?? false);
  const [from, setFrom] = useState(startDay);
  const [to, setTo] = useState(job?.end ?? absence?.end ?? startDay);
  const [part, setPart] = useState<Part>(job ? (job.startPm ? "nm" : job.endAm ? "vm" : "ganz") : edit.kind === "new" && edit.pm ? "nm" : "ganz");
  const [type, setType] = useState<AbsenceType>(absence?.type ?? "urlaub");
  const away = mode === "away" && !!person;
  const err = to < from ? "Ende liegt vor dem Beginn" : "";

  const submit = () => {
    if (err) return;
    if (!away) {
      const s = data.sites.find((x) => x.id === siteId);
      if (!s) return;
      const item: CalendarEntry = {
        ...(job ?? { id: uid(), createdBy: data.meId, createdAt: now() }),
        siteId: s.id,
        rowId,
        title: title.trim(),
        note: note.trim(),
        done,
        color: job && job.siteId === s.id ? job.color : s.color,
        start: from,
        end: to,
        startPm: part === "nm",
        endAm: part === "vm"
      };
      save("entries", item);
      const member = withMember(data, s.id, rowId);
      if (member) save("sites", member);
      if (absence) remove("absences", absence.id);
      notify(job ? "Einsatz gespeichert" : "Eingeteilt");
    } else {
      save("absences", { ...(absence ?? { id: uid() }), personId: rowId, type, start: from, end: to, note: note.trim() });
      if (job) remove("entries", job.id);
      notify(`${ABSENCE[type].label} eingetragen`);
    }
    onClose();
  };

  const drop = () => {
    if (job) remove("entries", job.id);
    if (absence) remove("absences", absence.id);
    notify(job ? "Einsatz entfernt" : "Abwesenheit entfernt");
    onClose();
  };

  return (
    <Modal
      title={job ? "Einsatz bearbeiten" : absence ? "Abwesenheit" : "Neuer Einsatz"}
      description={`${person?.name ?? who ?? rows.find((r) => r.id === rowId)?.name ?? ""} · ${weekdayShort(startDay)} ${fmt(startDay)}`}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          {(job || absence) && (
            <Button type="button" variant="destructive" leftIcon={<Trash2 size={15} />} onClick={drop}>
              Entfernen
            </Button>
          )}
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={(!away && !siteId) || !!err}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {person && (
          <div className="span-2">
            <Seg
              label="Art"
              value={mode}
              onChange={setMode}
              options={[
                { value: "job", label: "Einteilen" },
                { value: "away", label: "Abwesenheit" }
              ]}
            />
          </div>
        )}
        <Field label="Zeile" className="span-2">
          <Select value={rowId} onChange={(e) => setRowId(e.target.value)}>
            {rows.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </Select>
        </Field>
        {!away ? (
          <>
            <Field label="Baustelle" className="span-2">
              <Select value={siteId} onChange={(e) => setSiteId(e.target.value)}>
                {!sites.length && <option value="">Keine Baustelle angelegt</option>}
                {sites.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Tätigkeit (optional)" className="span-2">
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Rohinstallation Bauteil A" />
            </Field>
            <div className="span-2">
              <Seg<Part>
                label="Tagesteil"
                value={part}
                onChange={setPart}
                options={[
                  { value: "ganz", label: "Ganzer Tag" },
                  { value: "vm", label: "Endet mittags" },
                  { value: "nm", label: "Beginnt mittags" }
                ]}
              />
            </div>
          </>
        ) : (
          <div className="span-2">
            <Seg<AbsenceType> label="Abwesenheit" value={type} onChange={setType} options={ABS_TYPES.map((k) => ({ value: k, label: ABSENCE[k].label }))} />
          </div>
        )}
        <Field label="Von">
          <Input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </Field>
        <Field label="Bis" error={err}>
          <Input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </Field>
        <Field label="Notiz" className="span-2">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} />
        </Field>
        {!away && job && (
          <label className="check-row span-2">
            <Checkbox checked={done} onChange={(e) => setDone(e.target.checked)} /> Erledigt
          </label>
        )}
      </div>
    </Modal>
  );
}

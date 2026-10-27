"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { fmt, today, weekdayShort } from "@/core/date";
import { now, uid, useStore } from "@/core/store";
import type { Absence, AbsenceType, Job } from "@/core/types";
import { Button, Field, Modal, Seg } from "@/core/ui";
import { visibleProjects } from "./model";
import { ABSENCE, withMember } from "./plan-kit";

export { withMember };

export type PlanEdit =
  | {
      kind: "new";
      employeeId: string;
      day: string;
      pm: boolean;
      projectId?: string;
      away?: boolean;
    }
  | { kind: "job"; job: Job }
  | { kind: "absence"; absence: Absence };

type Part = "ganz" | "vm" | "nm";

/** Plan a person on a site – or enter an absence. */
export function PlanSheet({
  edit,
  onClose,
  who,
}: {
  edit: PlanEdit;
  onClose: () => void;
  who?: string;
}) {
  const { data, save, remove, notify } = useStore();
  const sites = visibleProjects(data);
  const isAbsence = edit.kind === "absence";
  const job = edit.kind === "job" ? edit.job : undefined;
  const absence = edit.kind === "absence" ? edit.absence : undefined;
  const employeeId =
    job?.employeeId ??
    absence?.employeeId ??
    (edit.kind === "new" ? edit.employeeId : "");
  const startDay =
    job?.start ?? absence?.start ?? (edit.kind === "new" ? edit.day : today());
  const person = data.people.find((e) => e.id === employeeId);

  const [mode, setMode] = useState<"job" | "away">(
    isAbsence || (edit.kind === "new" && edit.away) ? "away" : "job",
  );
  const [projectId, setProjectId] = useState(
    job?.projectId ??
      (edit.kind === "new" ? edit.projectId : undefined) ??
      sites[0]?.id ??
      "",
  );
  const name = person?.name ?? who ?? "";
  const canAway = !!person;
  const [title, setTitle] = useState(job?.title ?? "");
  const [from, setFrom] = useState(startDay);
  const [to, setTo] = useState(job?.end ?? absence?.end ?? startDay);
  const [part, setPart] = useState<Part>(
    job
      ? job.startPm
        ? "nm"
        : job.endAm
          ? "vm"
          : "ganz"
      : edit.kind === "new"
        ? "ganz"
        : "ganz",
  );
  const [type, setType] = useState<AbsenceType>(absence?.type ?? "urlaub");

  const submit = () => {
    const end = to < from ? from : to;
    if (mode === "job") {
      const p = data.projects.find((x) => x.id === projectId);
      if (!p) return;
      const item: Job = {
        ...(job ?? { id: uid(), note: "", done: false, createdBy: data.meId, createdAt: now() }),
        projectId: p.id,
        employeeId,
        title: title.trim(),
        color: job && job.projectId === p.id ? job.color : p.color,
        start: from,
        end,
        startPm: part === "nm",
        endAm: part === "vm",
      };
      save("jobs", item, `${name} eingeteilt: ${p.name}`);
      const member = withMember(data, p.id, employeeId);
      if (member) save("projects", member);
      if (absence) remove("absences", absence.id);
      notify("Eingeteilt");
    } else {
      const item: Absence = {
        ...(absence ?? { id: uid(), note: "" }),
        employeeId,
        type,
        start: from,
        end,
      };
      save("absences", item);
      if (job) remove("jobs", job.id);
      notify(`${ABSENCE[type].label} eingetragen`);
    }
    onClose();
  };

  const drop = () => {
    if (job) remove("jobs", job.id, `${name}: Einteilung entfernt`);
    if (absence) remove("absences", absence.id);
    onClose();
  };

  return (
    <Modal
      kicker={name}
      title={`${weekdayShort(startDay)} ${fmt(startDay)}`}
      onClose={onClose}
      footer={
        <>
          {(job || absence) && (
            <Button variant="danger" icon={<Trash2 size={15} />} onClick={drop}>
              Entfernen
            </Button>
          )}
          <span className="grow" />
          <Button variant="ghost" onClick={onClose}>
            Abbrechen
          </Button>
          <Button variant="primary" onClick={submit} disabled={mode === "job" && !projectId}>
            Speichern
          </Button>
        </>
      }
    >
      <div className="form-grid">
        {canAway && (
          <div className="span-2">
            <Seg value={mode} onChange={setMode} options={[{ value: "job", label: "Einteilen" }, { value: "away", label: "Abwesenheit" }]} />
          </div>
        )}
        {mode === "job" ? (
          <>
            <Field label="Projekt" className="span-2">
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                {sites.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Was ist zu tun? (optional)" className="span-2">
              <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Kabelzug Abschnitt B" />
            </Field>
            <div className="span-2">
              <Seg<Part> value={part} onChange={setPart} options={[{ value: "ganz", label: "Ganzer Tag" }, { value: "vm", label: "Vormittag" }, { value: "nm", label: "Nachmittag" }]} />
            </div>
          </>
        ) : (
          <div className="span-2">
            <Seg<AbsenceType> value={type} onChange={setType} options={(["urlaub", "krank", "za", "schulung"] as AbsenceType[]).map((k) => ({ value: k, label: ABSENCE[k].label }))} />
          </div>
        )}
        <Field label="Von">
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </Field>
        <Field label="Bis">
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </Field>
      </div>
    </Modal>
  );
}

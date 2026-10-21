"use client";

import { Trash2 } from "lucide-react";
import { useState } from "react";
import { fmt, today, weekdayShort } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import type { Absence, AbsenceType, Data, Job } from "@/lib/types";
import { ABSENCE, canRemove, visibleSites } from "./access";
import { Field, Sheet } from "./kit";

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

/** Whoever is planned on a site may see it. */
export function withMember(data: Data, projectId: string, employeeId: string) {
  const p = data.projects.find((x) => x.id === projectId);
  if (
    !p ||
    !data.employees.some((e) => e.id === employeeId) ||
    p.createdBy === employeeId ||
    p.members.includes(employeeId)
  )
    return null;
  return { ...p, members: [...p.members, employeeId] };
}

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
  const sites = visibleSites(data);
  const isAbsence = edit.kind === "absence";
  const job = edit.kind === "job" ? edit.job : undefined;
  const absence = edit.kind === "absence" ? edit.absence : undefined;
  const employeeId =
    job?.employeeId ??
    absence?.employeeId ??
    (edit.kind === "new" ? edit.employeeId : "");
  const startDay =
    job?.start ?? absence?.start ?? (edit.kind === "new" ? edit.day : today());
  const person = data.employees.find((e) => e.id === employeeId);

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
        ...(job ?? { id: uid("j"), nodeId: "", note: "", done: false }),
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
        ...(absence ?? { id: uid("ab"), note: "" }),
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
    <Sheet
      title={`${name} · ${weekdayShort(startDay)} ${fmt(startDay)}`}
      onClose={onClose}
      footer={
        <>
          {(job || absence) && canRemove(data) && (
            <button type="button" className="v-btn ghost danger" onClick={drop}>
              <Trash2 size={16} /> Entfernen
            </button>
          )}
          <span className="v-grow" />
          <button type="button" className="v-btn ghost" onClick={onClose}>
            Abbrechen
          </button>
          <button
            type="button"
            className="v-btn primary"
            onClick={submit}
            disabled={mode === "job" && !projectId}
          >
            Speichern
          </button>
        </>
      }
    >
      {canAway && (
        <div className="v-switch">
          <button
            type="button"
            className={mode === "job" ? "on" : ""}
            onClick={() => setMode("job")}
          >
            Einteilen
          </button>
          <button
            type="button"
            className={mode === "away" ? "on" : ""}
            onClick={() => setMode("away")}
          >
            Abwesend
          </button>
        </div>
      )}

      {mode === "job" ? (
        <>
          <Field label="Baustelle">
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
            >
              {sites.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Was ist zu tun? (optional)">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="z. B. Kabelzug Abschnitt B"
            />
          </Field>
          <div className="v-switch small">
            {(
              [
                ["ganz", "Ganzer Tag"],
                ["vm", "Vormittag"],
                ["nm", "Nachmittag"],
              ] as [Part, string][]
            ).map(([k, l]) => (
              <button
                key={k}
                type="button"
                className={part === k ? "on" : ""}
                onClick={() => setPart(k)}
              >
                {l}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="v-switch small wrap">
          {(["urlaub", "krank", "za", "schulung"] as AbsenceType[]).map((k) => (
            <button
              key={k}
              type="button"
              className={type === k ? "on" : ""}
              onClick={() => setType(k)}
            >
              {ABSENCE[k].label}
            </button>
          ))}
        </div>
      )}

      <div className="v-row2">
        <Field label="Von">
          <input
            type="date"
            value={from}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
          />
        </Field>
        <Field label="Bis">
          <input
            type="date"
            value={to}
            min={from}
            onChange={(e) => e.target.value && setTo(e.target.value)}
          />
        </Field>
      </div>
    </Sheet>
  );
}

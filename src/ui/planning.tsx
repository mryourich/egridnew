"use client";

import { ChevronLeft, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { addDays, fmt, fmtShort, isoWeek, isWeekend, startOfWeek, today, weekday, weekdayShort } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import type { Absence, AbsenceType, Job } from "@/lib/types";
import { ABSENCE, activePeople, canPlan, canRemove, sameSlot, slotOf, visibleSites, type Slot } from "./access";
import { Empty, Face, Field, PageHead, Sheet } from "./kit";

type Edit =
  | { kind: "new"; employeeId: string; day: string; pm: boolean }
  | { kind: "job"; job: Job }
  | { kind: "absence"; absence: Absence };

/** Who works where this week – in half days. One click plans, one click changes. */
export function Planning() {
  const { data } = useStore();
  const t = today();
  const [monday, setMonday] = useState(() => startOfWeek(t));
  const [edit, setEdit] = useState<Edit | null>(null);
  const [weeks, setWeeks] = useState<1 | 2>(2);
  // workdays only: Monday to Friday of one or two weeks
  const days = Array.from({ length: weeks * 7 }, (_, i) => addDays(monday, i)).filter((d) => !isWeekend(d));
  const people = activePeople(data);
  const planner = canPlan(data);
  const scroller = useRef<HTMLDivElement>(null);

  // phones: today in view, not Monday
  useEffect(() => {
    const box = scroller.current;
    const day = box?.querySelector<HTMLElement>(".v-wk-day.today");
    const name = box?.querySelector<HTMLElement>(".v-wk-corner");
    if (box && day && name && box.scrollWidth > box.clientWidth) box.scrollLeft += day.getBoundingClientRect().left - name.getBoundingClientRect().right;
  }, [monday]);

  const open = (s: Slot, employeeId: string, day: string, pm: boolean) => {
    if (!planner) return;
    if (s.kind === "job") setEdit({ kind: "job", job: s.job });
    else if (s.kind === "absence") setEdit({ kind: "absence", absence: s.absence });
    else if (s.kind === "free") setEdit({ kind: "new", employeeId, day, pm });
  };

  return (
    <div className="v-page">
      <PageHead title="Planung" sub={planner ? "Auf ein Feld klicken, um jemanden einzuteilen oder Urlaub und Krankenstand einzutragen." : "Wer arbeitet wann wo."}>
        <div className="v-week-nav">
          <div className="v-seg">
            <button type="button" className={weeks === 1 ? "on" : ""} onClick={() => setWeeks(1)}>
              1 Woche
            </button>
            <button type="button" className={weeks === 2 ? "on" : ""} onClick={() => setWeeks(2)}>
              2 Wochen
            </button>
          </div>
          <button type="button" className="v-icon" onClick={() => setMonday(addDays(monday, -7))} aria-label="Vorige Woche">
            <ChevronLeft size={18} />
          </button>
          <button type="button" className="v-btn" onClick={() => setMonday(startOfWeek(t))}>
            KW {isoWeek(monday)}
            {weeks === 2 ? `–${isoWeek(addDays(monday, 7))}` : ""}
          </button>
          <button type="button" className="v-icon" onClick={() => setMonday(addDays(monday, 7))} aria-label="Nächste Woche">
            <ChevronRight size={18} />
          </button>
        </div>
      </PageHead>

      {people.length === 0 ? (
        <Empty>Noch keine Mitarbeiter. Lege sie unter „Team“ an.</Empty>
      ) : (
        <div className="v-card v-wk-scroll" ref={scroller}>
          <div className={`v-wk ${weeks === 2 ? "two" : ""}`} style={{ gridTemplateColumns: `var(--wk-name) repeat(${days.length * 2}, minmax(var(--wk-half), 1fr))` } as CSSProperties}>
            <div className="v-wk-corner" />
            {days.map((d) => (
              <div key={d} className={`v-wk-day ${d === t ? "today" : ""} ${weekday(d) === 1 ? "mon" : ""}`}>
                <strong>{weekdayShort(d)}</strong> {fmtShort(d)}
              </div>
            ))}
            {people.map((e) => (
              <div key={e.id} className="v-wk-row">
                <div className="v-wk-name">
                  <Face id={e.id} size={28} />
                  <span>{e.name}</span>
                </div>
                {days.map((d) => {
                  const am = slotOf(data, e.id, d, false);
                  const pm = slotOf(data, e.id, d, true);
                  const parts = sameSlot(am, pm) ? [{ s: am, pm: false, span: 2 }] : [{ s: am, pm: false, span: 1 }, { s: pm, pm: true, span: 1 }];
                  return parts.map(({ s, pm: isPm, span }) => (
                    <Cell key={`${e.id}${d}${isPm}`} slot={s} span={span} half={span === 1 ? (isPm ? "NM" : "VM") : ""} today={d === t} compact={weeks === 2} onClick={planner ? () => open(s, e.id, d, isPm) : undefined} />
                  ));
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="v-hint">Ein Feld ist ein Tag, ein halbes Feld ein halber Tag (Vormittag / Nachmittag). Mit der Maus über einem Eintrag siehst du, was zu tun ist.</p>

      {edit && <PlanSheet edit={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function Cell({ slot: s, span, half, today: isToday, compact, onClick }: { slot: Slot; span: number; half: string; today: boolean; compact?: boolean; onClick?: () => void }) {
  const cls = `v-wk-cell span${span} ${isToday ? "today" : ""} ${onClick ? "click" : ""}`;
  if (s.kind === "job") {
    const color = s.project?.color ?? s.job.color ?? "#1a5cff";
    return (
      <button type="button" className={`${cls} job`} style={{ "--c": color } as CSSProperties} onClick={onClick} disabled={!onClick} title={`${s.project?.name ?? ""} · ${s.job.title}`}>
        <b>{s.project?.name ?? "Baustelle"}</b>
        {s.job.title && !compact && <span>{s.job.title}</span>}
        {half && !compact && <i>{half}</i>}
      </button>
    );
  }
  if (s.kind === "absence")
    return (
      <button type="button" className={`${cls} away`} style={{ "--c": ABSENCE[s.absence.type].color } as CSSProperties} onClick={onClick} disabled={!onClick}>
        {ABSENCE[s.absence.type].label}
      </button>
    );
  if (s.kind === "holiday") return <div className={`${cls} holiday`}>{s.name}</div>;
  return <button type="button" className={`${cls} free`} onClick={onClick} disabled={!onClick} aria-label="frei – einteilen" />;
}

type Part = "ganz" | "vm" | "nm";

/** Plan a person on a site – or enter an absence. */
function PlanSheet({ edit, onClose }: { edit: Edit; onClose: () => void }) {
  const { data, save, remove, notify } = useStore();
  const sites = visibleSites(data);
  const isAbsence = edit.kind === "absence";
  const job = edit.kind === "job" ? edit.job : undefined;
  const absence = edit.kind === "absence" ? edit.absence : undefined;
  const employeeId = job?.employeeId ?? absence?.employeeId ?? (edit.kind === "new" ? edit.employeeId : "");
  const startDay = job?.start ?? absence?.start ?? (edit.kind === "new" ? edit.day : today());
  const person = data.employees.find((e) => e.id === employeeId);

  const [mode, setMode] = useState<"job" | "away">(isAbsence ? "away" : "job");
  const [projectId, setProjectId] = useState(job?.projectId ?? sites[0]?.id ?? "");
  const [title, setTitle] = useState(job?.title ?? "");
  const [from, setFrom] = useState(startDay);
  const [to, setTo] = useState(job?.end ?? absence?.end ?? startDay);
  const [part, setPart] = useState<Part>(job ? (job.startPm ? "nm" : job.endAm ? "vm" : "ganz") : edit.kind === "new" ? "ganz" : "ganz");
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
        color: p.color,
        start: from,
        end,
        startPm: part === "nm",
        endAm: part === "vm"
      };
      save("jobs", item, `${person?.name} eingeteilt: ${p.name}`);
      // whoever is planned on a site may see it
      if (p.createdBy !== employeeId && !p.members.includes(employeeId)) save("projects", { ...p, members: [...p.members, employeeId] });
      if (absence) remove("absences", absence.id);
      notify("Eingeteilt");
    } else {
      const item: Absence = { ...(absence ?? { id: uid("ab"), note: "" }), employeeId, type, start: from, end };
      save("absences", item);
      if (job) remove("jobs", job.id);
      notify(`${ABSENCE[type].label} eingetragen`);
    }
    onClose();
  };

  const drop = () => {
    if (job) remove("jobs", job.id, `${person?.name}: Einteilung entfernt`);
    if (absence) remove("absences", absence.id);
    onClose();
  };

  return (
    <Sheet
      title={`${person?.name ?? ""} · ${weekdayShort(startDay)} ${fmt(startDay)}`}
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
          <button type="button" className="v-btn primary" onClick={submit} disabled={mode === "job" && !projectId}>
            Speichern
          </button>
        </>
      }
    >
      <div className="v-switch">
        <button type="button" className={mode === "job" ? "on" : ""} onClick={() => setMode("job")}>
          Einteilen
        </button>
        <button type="button" className={mode === "away" ? "on" : ""} onClick={() => setMode("away")}>
          Abwesend
        </button>
      </div>

      {mode === "job" ? (
        <>
          <Field label="Baustelle">
            <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
              {sites.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Was ist zu tun? (optional)">
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Kabelzug Abschnitt B" />
          </Field>
          <div className="v-switch small">
            {(
              [
                ["ganz", "Ganzer Tag"],
                ["vm", "Vormittag"],
                ["nm", "Nachmittag"]
              ] as [Part, string][]
            ).map(([k, l]) => (
              <button key={k} type="button" className={part === k ? "on" : ""} onClick={() => setPart(k)}>
                {l}
              </button>
            ))}
          </div>
        </>
      ) : (
        <div className="v-switch small wrap">
          {(["urlaub", "krank", "za", "schulung"] as AbsenceType[]).map((k) => (
            <button key={k} type="button" className={type === k ? "on" : ""} onClick={() => setType(k)}>
              {ABSENCE[k].label}
            </button>
          ))}
        </div>
      )}

      <div className="v-row2">
        <Field label="Von">
          <input type="date" value={from} onChange={(e) => e.target.value && setFrom(e.target.value)} />
        </Field>
        <Field label="Bis">
          <input type="date" value={to} min={from} onChange={(e) => e.target.value && setTo(e.target.value)} />
        </Field>
      </div>
    </Sheet>
  );
}

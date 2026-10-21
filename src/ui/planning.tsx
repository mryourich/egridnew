"use client";

import { ChevronDown, ChevronRight, Trash2 } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { PlannerCols, PlannerHeadTime, usePlannerRange } from "@/components/planner";
import { textOn } from "@/components/site-gantt";
import { addDays, diffDays, fmt, today, weekdayShort } from "@/lib/date";
import { uid, useStore } from "@/lib/store";
import type { Absence, AbsenceType, ISODate, Job } from "@/lib/types";
import { ABSENCE, activePeople, canPlan, canRemove, simpleRole, visibleSites, type Simple } from "./access";
import { Empty, Face, Field, PageHead, Sheet } from "./kit";

type Edit =
  | { kind: "new"; employeeId: string; day: string; pm: boolean }
  | { kind: "job"; job: Job }
  | { kind: "absence"; absence: Absence };

type Drag = { kind: "job" | "abs"; id: string; mode: "move" | "start" | "end"; x0: number; d: number; moved: boolean };

const LANE = 24;
const GROUPS: { role: Simple; name: string }[] = [
  { role: "bauleiter", name: "Bauleitung" },
  { role: "monteur", name: "Monteure" },
  { role: "buero", name: "Büro" },
  { role: "chef", name: "Chef" }
];

/* Half-day positions: day * 2, +1 for the afternoon. */
function halves(from: ISODate, j: Pick<Job, "start" | "end" | "startPm" | "endAm">) {
  const s = diffDays(from, j.start) * 2 + (j.startPm ? 1 : 0);
  const e = diffDays(from, j.end) * 2 + (j.endAm ? 1 : 2);
  return { s, e: Math.max(e, s + 1) };
}
function fromHalves(from: ISODate, s: number, e: number) {
  const last = e - 1;
  return { start: addDays(from, Math.floor(s / 2)), startPm: s % 2 === 1, end: addDays(from, Math.floor(last / 2)), endAm: last % 2 === 0 };
}

/** Who works where – the whole company as a bar chart, like the site plan. Click plans, drag moves. */
export function Planning() {
  const { data, save, notify } = useStore();
  const t = today();
  const { from, days, dayWidth: dw, controls } = usePlannerRange("woche");
  const [edit, setEdit] = useState<Edit | null>(null);
  const [site, setSite] = useState("");
  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<Simple>>(new Set());
  const [drag, setDrag] = useState<Drag | null>(null);
  const [nameW, setNameW] = useState(190);
  const scroller = useRef<HTMLDivElement>(null);
  const planner = canPlan(data);
  const hw = dw / 2;
  const to = addDays(from, days - 1);
  const dayList = useMemo(() => Array.from({ length: days }, (_, i) => addDays(from, i)), [from, days]);
  const sites = visibleSites(data);

  useEffect(() => {
    const fit = () => setNameW(window.innerWidth < 640 ? 112 : 190);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  // today near the left edge, also on phones
  useEffect(() => {
    const box = scroller.current;
    if (box) box.scrollLeft = Math.max(0, (diffDays(from, t) - 2) * dw);
  }, [from, dw, t]);

  const q = query.trim().toLowerCase();
  const inRange = (x: { start: string; end: string }) => x.end >= from && x.start <= to;
  const jobs = data.jobs.filter((j) => !j.symbol && inRange(j) && (!site || j.projectId === site));
  const people = activePeople(data).filter((e) => (!q || e.name.toLowerCase().includes(q)) && (!site || jobs.some((j) => j.employeeId === e.id)));

  // live preview while dragging
  const shiftJob = (j: Job): Job => {
    if (!drag || drag.kind !== "job" || drag.id !== j.id || !drag.d) return j;
    const { s, e } = halves(from, j);
    const ns = drag.mode === "end" ? s : Math.min(s + drag.d, drag.mode === "start" ? e - 1 : Infinity);
    const ne = drag.mode === "start" ? e : Math.max(e + drag.d, drag.mode === "end" ? s + 1 : -Infinity);
    return { ...j, ...fromHalves(from, ns, ne) };
  };
  const shiftAbs = (a: Absence): Absence => {
    if (!drag || drag.kind !== "abs" || drag.id !== a.id || !drag.d) return a;
    const start = drag.mode === "end" ? a.start : addDays(a.start, drag.d);
    const end = drag.mode === "start" ? a.end : addDays(a.end, drag.d);
    return { ...a, start: start > end ? end : start, end: end < start ? start : end };
  };

  const begin = (e: React.PointerEvent, kind: Drag["kind"], id: string, mode: Drag["mode"]) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (!planner) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setDrag({ kind, id, mode, x0: e.clientX, d: 0, moved: false });
  };
  const move = (e: React.PointerEvent) => {
    if (!drag) return;
    const px = e.clientX - drag.x0;
    const d = Math.round(px / (drag.kind === "job" ? hw : dw));
    if (d !== drag.d || (!drag.moved && Math.abs(px) > 4)) setDrag({ ...drag, d, moved: drag.moved || Math.abs(px) > 4 });
  };
  const end = () => {
    if (!drag) return;
    if (drag.kind === "job") {
      const j = data.jobs.find((x) => x.id === drag.id);
      if (j && drag.moved && drag.d) {
        save("jobs", shiftJob(j), "Einteilung verschoben");
        notify("Verschoben");
      } else if (j && !drag.moved) setEdit({ kind: "job", job: j });
    } else {
      const a = data.absences.find((x) => x.id === drag.id);
      if (a && drag.moved && drag.d) save("absences", shiftAbs(a));
      else if (a && !drag.moved) setEdit({ kind: "absence", absence: a });
    }
    setDrag(null);
  };

  const timelineW = days * dw;

  return (
    <div className="v-page">
      <PageHead title="Planung" sub={planner ? "Auf eine freie Stelle klicken = einteilen. Balken ziehen = verschieben, an den Enden ziehen = länger oder kürzer." : "Wer arbeitet wann wo."} />

      {activePeople(data).length === 0 ? (
        <Empty>Noch keine Mitarbeiter. Lege sie unter „Team“ an.</Empty>
      ) : (
        <div className="v-legacy v-plan">
          <div className="toolbar sg-toolbar">
            {controls}
            <span className="spacer" />
            <input className="v-plan-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Person suchen…" aria-label="Person suchen" />
            <select className="sg-filter" value={site} onChange={(e) => setSite(e.target.value)} aria-label="Baustelle">
              <option value="">Alle Baustellen</option>
              {sites.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          <div className={`planner site-gantt cols-1 ${planner ? "" : "ro"}`} style={{ "--dw": `${dw}px`, "--no": "0px", "--nm": `${nameW}px` } as CSSProperties}>
            <div className="planner-scroll" ref={scroller}>
              <div className="planner-inner" style={{ width: nameW + timelineW }}>
                <div className="pl-head">
                  <div className="pl-corner sg-corner">
                    <em>
                      {people.length} Personen · {data.jobs.filter((j) => !j.symbol && j.start <= t && j.end >= t).length} heute eingeteilt
                    </em>
                  </div>
                  <PlannerHeadTime dayList={dayList} dw={dw} />
                </div>
                <div className="pl-body">
                  <PlannerCols dayList={dayList} dw={dw} left={nameW} />
                  {people.length === 0 && <div className="pl-empty">Niemand passt zum Filter.</div>}
                  {GROUPS.map((g) => {
                    const members = people.filter((e) => simpleRole(e) === g.role);
                    if (!members.length) return null;
                    const closed = collapsed.has(g.role);
                    const toggle = () =>
                      setCollapsed((c) => {
                        const n = new Set(c);
                        if (n.has(g.role)) n.delete(g.role);
                        else n.add(g.role);
                        return n;
                      });
                    return (
                      <div key={g.role}>
                        <div className="pl-row sg-grp" style={{ height: 28 }}>
                          <div className="pl-left sg-grp-left">
                            <button type="button" className="sg-grp-toggle" onClick={toggle} aria-label={closed ? "Aufklappen" : "Zuklappen"}>
                              {closed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
                            </button>
                            <strong onClick={toggle}>{g.name}</strong>
                            <small>{members.length}</small>
                          </div>
                          <div className="pl-time sg-grp-band" style={{ width: timelineW }} />
                        </div>
                        {!closed &&
                          members.map((e) => {
                            const own = jobs
                              .filter((j) => j.employeeId === e.id)
                              .map(shiftJob)
                              .sort((a, b) => a.start.localeCompare(b.start) || Number(!!a.startPm) - Number(!!b.startPm));
                            const ends: number[] = [];
                            const lane = new Map<string, number>();
                            for (const j of own) {
                              const { s } = halves(from, j);
                              let i = ends.findIndex((x) => x <= s);
                              if (i === -1) i = ends.length;
                              ends[i] = halves(from, j).e;
                              lane.set(j.id, i);
                            }
                            const abs = data.absences.filter((a) => a.employeeId === e.id).map(shiftAbs).filter(inRange);
                            return (
                              <div key={e.id} className="pl-row sg-row v-pl-row" style={{ height: Math.max(1, ends.length) * LANE }} data-emp={e.id}>
                                <div className="pl-left sg-left">
                                  <span className="sg-name">
                                    <Face id={e.id} size={20} />
                                    <strong title={e.name}>{e.name}</strong>
                                  </span>
                                </div>
                                <div
                                  className="pl-time"
                                  style={{ width: timelineW }}
                                  onClick={(ev) => {
                                    if (!planner || ev.target !== ev.currentTarget) return;
                                    const h = Math.floor((ev.clientX - ev.currentTarget.getBoundingClientRect().left) / hw);
                                    setEdit({ kind: "new", employeeId: e.id, day: addDays(from, Math.floor(h / 2)), pm: h % 2 === 1 });
                                  }}
                                >
                                  {abs.map((a) => {
                                    const s = Math.max(0, diffDays(from, a.start));
                                    const en = Math.min(days - 1, diffDays(from, a.end));
                                    return (
                                      <div
                                        key={a.id}
                                        className={`sg-abs abs-${a.type} ${drag?.id === a.id ? "active" : ""}`}
                                        style={{ left: s * dw, width: (en - s + 1) * dw }}
                                        title={`${ABSENCE[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}`}
                                        onPointerDown={(ev) => begin(ev, "abs", a.id, "move")}
                                        onPointerMove={move}
                                        onPointerUp={end}
                                      >
                                        {ABSENCE[a.type].label}
                                        {planner && <i className="h h-l" onPointerDown={(ev) => begin(ev, "abs", a.id, "start")} />}
                                        {planner && <i className="h h-r" onPointerDown={(ev) => begin(ev, "abs", a.id, "end")} />}
                                      </div>
                                    );
                                  })}
                                  {own.map((j) => {
                                    const { s, e: en } = halves(from, j);
                                    const p = data.projects.find((x) => x.id === j.projectId);
                                    const color = p?.color ?? j.color ?? "#1a5cff";
                                    const label = [p?.name ?? "Baustelle", j.title].filter(Boolean).join(" · ");
                                    return (
                                      <div
                                        key={j.id}
                                        className={`sg-job v-plan-job ${j.done ? "done" : ""} ${drag?.id === j.id ? "active" : ""}`}
                                        style={{ left: s * hw, width: Math.max(8, (en - s) * hw), top: (lane.get(j.id) ?? 0) * LANE + 1, height: LANE - 1, background: color, color: textOn(color) }}
                                        title={`${label}\n${fmt(j.start)}${j.startPm ? " (ab Mittag)" : ""} – ${fmt(j.end)}${j.endAm ? " (bis Mittag)" : ""}`}
                                        onPointerDown={(ev) => begin(ev, "job", j.id, "move")}
                                        onPointerMove={move}
                                        onPointerUp={end}
                                      >
                                        <span>{label}</span>
                                        {/* short bars are for moving; handles only where there is room */}
                                        {planner && (en - s) * hw >= 30 && <i className="h h-l" onPointerDown={(ev) => begin(ev, "job", j.id, "start")} />}
                                        {planner && (en - s) * hw >= 30 && <i className="h h-r" onPointerDown={(ev) => begin(ev, "job", j.id, "end")} />}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
          <div className="sg-legend">
            {planner && <span className="desktop-only">Klick auf eine freie Stelle = einteilen oder Urlaub eintragen · Klick auf einen Balken = ändern · Ziehen = verschieben</span>}
            <span>Farbe = Baustelle · ein halber Tag ist ein halbes Feld</span>
            <span>
              <i className="sg-abs abs-urlaub" /> Urlaub / Krankenstand
            </span>
          </div>
        </div>
      )}

      {edit && <PlanSheet edit={edit} onClose={() => setEdit(null)} />}
    </div>
  );
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

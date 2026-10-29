"use client";

import { CalendarRange, CheckSquare, ChevronLeft, ChevronRight, ClipboardList, HardHat, MapPin, Navigation, Phone } from "lucide-react";
import Link from "next/link";
import { PageHead, Prio, Due } from "@/components/app/kit";
import { Checkbox } from "@/components/ui";
import { addDays, fmt, inRange, today, weekdayLong } from "@/lib/date";
import { now, personName, siteName, useStore } from "@/lib/store/store";
import type { Task } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";
import { ABSENCE } from "@/modules/kalender/plan-kit";
import { mapsUrl } from "@/modules/service/model";
import { DayOrders } from "@/modules/service/service";

/** Mein Tag: where I work, what is mine to do – for the signed-in person, independent of the site picker. */
export function MyDay() {
  const { data, save, setSiteId } = useStore();
  const q = useQuery();
  const date = q.get("tag") || today();
  const me = data.meId;
  const isToday = date === today();
  const away = data.absences.find((a) => a.personId === me && inRange(date, a.start, a.end));
  const jobs = data.entries.filter((e) => e.rowId === me && !e.symbol && inRange(date, e.start, e.end));
  const tasks = data.tasks.filter((t) => t.ownerId === me && t.status !== "erledigt" && (!t.due || t.due <= date)).sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
  const points = data.points
    .filter((p) => p.type === "punkt" && p.status !== "erledigt" && p.assigneeIds.includes(me) && (!p.due || p.due <= addDays(date, 3)))
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 12);
  const done = (t: Task, v: boolean) => save("tasks", { ...t, status: v ? "erledigt" : "offen", doneAt: v ? now() : undefined });

  return (
    <div className="page">
      <PageHead title="Mein Tag" sub={`${personName(data, me)} · ${weekdayLong(date)}, ${fmt(date)}`} />
      <div className="toolbar">
        <div className="seg">
          <button type="button" aria-label="Vorheriger Tag" onClick={() => q.set({ tag: addDays(date, -1) })}>
            <ChevronLeft size={14} />
          </button>
          <button type="button" className={cn(isToday && "on")} onClick={() => q.set({ tag: null })}>
            Heute
          </button>
          <button type="button" aria-label="Nächster Tag" onClick={() => q.set({ tag: addDays(date, 1) })}>
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      <section className="panel">
        <div className="panel-head">
          <CalendarRange size={15} className="muted" />
          <h3>Einsatz {isToday ? "heute" : `am ${fmt(date)}`}</h3>
          <span className="grow" />
          <Link href="/planner" className="more">
            Planner
          </Link>
        </div>
        {away ? (
          <p className="panel-body">
            <strong>{ABSENCE[away.type].label}</strong> {away.note && <span className="muted">· {away.note}</span>}
          </p>
        ) : jobs.length ? (
          <div className="list-rows">
            {jobs.map((e) => {
              const s = data.sites.find((x) => x.id === e.siteId);
              return (
                <div key={e.id} className="job-row">
                  <span className="swatch" style={{ background: e.color }} />
                  <span className="title">
                    <strong>{s?.name ?? siteName(data, e.siteId) ?? "–"}</strong>
                    {e.title && <span className="muted"> · {e.title}</span>}
                    {s?.address && (
                      <small className="muted job-addr">
                        <MapPin size={12} /> {s.address}
                      </small>
                    )}
                  </span>
                  {s?.address && (
                    <a className="ui-button ui-button-secondary ui-button-size-default" href={mapsUrl(s.address)} target="_blank" rel="noreferrer">
                      <Navigation size={15} /> Navigation
                    </a>
                  )}
                  {s && data.people.find((p) => p.id === s.managerId)?.phone && (
                    <a className="ui-button ui-button-secondary ui-button-size-default" href={`tel:${data.people.find((p) => p.id === s.managerId)!.phone.replace(/\s/g, "")}`} title={`Bauleitung ${personName(data, s.managerId)}`}>
                      <Phone size={15} />
                    </a>
                  )}
                  {s && (
                    <Link className="ui-button ui-button-default ui-button-size-default" href="/uebersicht" onClick={() => setSiteId(s.id)}>
                      <HardHat size={15} /> Baustelle
                    </Link>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <p className="panel-body muted">Im Planner ist für diesen Tag kein Baustelleneinsatz eingetragen.</p>
        )}
      </section>

      {data.workspace.modules?.service && data.orders.some((o) => o.techId === me) && <DayOrders date={date} who={me} />}

      <div className="report-grid">
        <section className="panel">
          <div className="panel-head">
            <CheckSquare size={15} className="muted" />
            <h3>Fällige Aufgaben</h3>
            <span className="muted">{tasks.length}</span>
            <span className="grow" />
            <Link href="/aufgaben" className="more">
              Meine Aufgaben
            </Link>
          </div>
          {tasks.length ? (
            <div className="list-rows">
              {tasks.map((t) => (
                <div key={t.id}>
                  <Checkbox checked={false} aria-label={`${t.title} erledigt`} onChange={(e) => done(t, e.target.checked)} />
                  <Link href={`/aufgaben?aufgabe=${t.id}`} className="title">
                    {t.title}
                    {t.siteId && <small className="muted"> · {siteName(data, t.siteId)}</small>}
                  </Link>
                  {t.priority === "hoch" && <Prio p="hoch" />}
                  <Due due={t.due} />
                </div>
              ))}
            </div>
          ) : (
            <p className="panel-body muted">Nichts fällig.</p>
          )}
        </section>
        <section className="panel">
          <div className="panel-head">
            <ClipboardList size={15} className="muted" />
            <h3>Meine offenen Punkte</h3>
            <span className="muted">{points.length}</span>
          </div>
          {points.length ? (
            <div className="list-rows">
              {points.map((p) => (
                <Link key={p.id} href={`/openpoints?punkt=${p.id}`} onClick={() => setSiteId(p.siteId)}>
                  <span className="title">
                    {p.title}
                    <small className="muted"> · {siteName(data, p.siteId)}</small>
                  </span>
                  <Due due={p.due} />
                </Link>
              ))}
            </div>
          ) : (
            <p className="panel-body muted">Keine Checklistenpunkte in den nächsten Tagen.</p>
          )}
        </section>
      </div>
    </div>
  );
}

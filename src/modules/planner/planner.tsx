"use client";

import { PageHead } from "@/components/app/kit";
import { inRange, today, weekdayLong, fmt } from "@/lib/date";
import { siteName, useStore } from "@/lib/store/store";
import { Gantt } from "@/modules/kalender/gantt";
import { ABSENCE } from "@/modules/kalender/plan-kit";

/**
 * Planner: resource planning of the whole company – every employee in one board, bars per site,
 * absences included. Independent of the site chosen in the top bar, so everyone sees where everyone works.
 */
export function Planner() {
  const { data } = useStore();
  const t = today();
  const people = data.people.filter((p) => p.active);
  const work = (id: string) => data.entries.filter((e) => e.rowId === id && !e.symbol && inRange(t, e.start, e.end));
  const away = (id: string) => data.absences.find((a) => a.personId === id && inRange(t, a.start, a.end));
  const absent = people.filter((p) => away(p.id));
  const planned = people.filter((p) => !away(p.id) && work(p.id).length);
  const free = people.filter((p) => !away(p.id) && !work(p.id).length);
  const bySite = new Map<string, number>();
  for (const p of planned) for (const e of work(p.id)) bySite.set(e.siteId, (bySite.get(e.siteId) ?? 0) + 1);

  return (
    <div className="page full">
      <PageHead title="Planner" sub={`Ressourcenplanung ${data.workspace.name} – wer arbeitet wann wo`} />
      <section className="today-strip" aria-label={`Heute, ${weekdayLong(t)} ${fmt(t)}`}>
        <div className="today-cell accent">
          <small>Heute eingeplant</small>
          <strong>{planned.length}</strong>
        </div>
        <div className="today-cell sites">
          <small>Auf den Baustellen</small>
          <span>
            {[...bySite.entries()].length
              ? [...bySite.entries()].map(([id, n]) => (
                  <span key={id} className="site-chip">
                    <i style={{ background: data.sites.find((s) => s.id === id)?.color }} />
                    {siteName(data, id)} <b>{n}</b>
                  </span>
                ))
              : "Niemand eingeplant"}
          </span>
        </div>
        <div className="today-cell">
          <small>Abwesend</small>
          <span title={absent.map((p) => `${p.name}: ${ABSENCE[away(p.id)!.type].label}`).join("\n")}>{absent.length ? absent.map((p) => `${p.name.split(" ")[0]} (${ABSENCE[away(p.id)!.type].short})`).join(", ") : "–"}</span>
        </div>
        <div className={free.length ? "today-cell signal" : "today-cell"}>
          <small>Nicht eingeplant</small>
          <span>{free.length ? free.map((p) => p.name).join(", ") : "Alle eingeteilt"}</span>
        </div>
      </section>
      <Gantt company />
    </div>
  );
}

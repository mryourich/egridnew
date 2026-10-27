"use client";

import { rightsOf, scopedPeople } from "@/core/roles";
import { useStore } from "@/core/store";
import { Empty, PageHead } from "@/core/ui";
import { Gantt } from "./gantt";

/** Who works where and when – the whole company (or one's part of the organisation chart) on one board. */
export function Planning() {
  const { data } = useStore();
  const edit = rightsOf(data).plan;
  return (
    <div className="page wide">
      <PageHead kicker="TeamGrid" title="Planung" sub={edit ? "Rechtsklick auf eine freie Stelle = Zeitbalken, Symbol oder Abwesenheit · Balken ziehen = verschieben · Enden ziehen = länger" : "Wer arbeitet wann wo."} />
      {scopedPeople(data).length === 0 ? <Empty title="Noch keine Mitarbeiter">Lege sie unter „Team“ an.</Empty> : <Gantt scope={{ kind: "company" }} />}
    </div>
  );
}

"use client";

import { useStore } from "@/lib/store";
import { activePeople, canPlan } from "./access";
import { Gantt } from "./gantt";
import { Empty, PageHead } from "./kit";

/** Who works where – the whole company on one board. */
export function Planning() {
  const { data } = useStore();
  return (
    <div className="v-page wide">
      <PageHead title="Planung" sub={canPlan(data) ? "Rechtsklick auf eine freie Stelle = einteilen, Symbol oder Urlaub · Balken ziehen = verschieben" : "Wer arbeitet wann wo."} />
      {activePeople(data).length === 0 ? <Empty>Noch keine Mitarbeiter. Lege sie unter „Team“ an.</Empty> : <Gantt scope={{ kind: "company" }} />}
    </div>
  );
}

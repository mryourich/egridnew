"use client";

import { ArrowRight, HardHat, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Due, Empty, PageHead, Prio, Seg, SortHead, StatusBadge, Who } from "@/components/app/kit";
import { Button, Input } from "@/components/ui";
import { fmt, inRange, today } from "@/lib/date";
import { defectOpen, PRIO_RANK, SITE_STATUS } from "@/lib/labels";
import { siteStats } from "@/lib/stats";
import { personName, siteName, useStore } from "@/lib/store/store";
import type { Site } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { SiteDialog } from "./site-dialog";

type Show = "laufend" | "alle" | "archiviert";
type SortKey = "number" | "name" | "status" | "end" | "progress" | "defects";

export function Overview() {
  const { data, siteId } = useStore();
  const router = useRouter();
  const [show, setShow] = useState<Show>("laufend");
  const [q, setQ] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "number", dir: -1 });
  const [creating, setCreating] = useState(false);
  const all = siteStats(data, siteId);
  const t = today();
  const scope = <T extends { siteId: string }>(x: T) => !siteId || x.siteId === siteId;

  const rows = useMemo(() => {
    const term = q.trim().toLowerCase();
    const list = data.sites
      .filter((s) => (show === "alle" ? true : show === "archiviert" ? s.status === "archiviert" : s.status !== "archiviert"))
      .filter((s) => !term || [s.name, s.number, s.client, s.address, personName(data, s.managerId)].some((x) => x.toLowerCase().includes(term)))
      .map((s) => ({ s, st: siteStats(data, s.id) }));
    const val = (r: (typeof list)[number]): string | number =>
      sort.key === "progress" ? r.st.progress : sort.key === "defects" ? r.st.defectsOpen : sort.key === "status" ? Object.keys(SITE_STATUS).indexOf(r.s.status) : sort.key === "end" ? r.s.end || "9999" : r.s[sort.key].toLowerCase();
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [data, show, q, sort]);

  const myTasks = data.tasks
    .filter((x) => x.ownerId === data.meId && x.status !== "erledigt" && scope(x))
    .sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 6);
  const urgent = data.defects
    .filter((d) => defectOpen(d.status) && scope(d))
    .sort((a, b) => PRIO_RANK[a.priority] - PRIO_RANK[b.priority] || (a.due || "9999").localeCompare(b.due || "9999"))
    .slice(0, 6);
  const todayWork = data.entries.filter((e) => !e.symbol && scope(e) && inRange(t, e.start, e.end)).sort((a, b) => personName(data, a.rowId).localeCompare(personName(data, b.rowId), "de"));

  return (
    <div className="page">
      <PageHead
        title="Übersicht"
        sub={`${data.workspace.name} · ${siteId ? siteName(data, siteId) : "alle Baustellen"} · Stand ${fmt(t)}`}
        actions={
          <Button leftIcon={<Plus size={15} />} onClick={() => setCreating(true)}>
            Baustelle anlegen
          </Button>
        }
      />

      <section className="kpis" aria-label="Kennzahlen">
        <Link className="kpi accent" href="/openpoints">
          <span>Checkliste</span>
          <strong>{all.progress} %</strong>
          <small>
            {all.pointsDone} von {all.points} Punkten erledigt
          </small>
        </Link>
        <Link className={cn("kpi", all.defectsOpen && "signal")} href="/openpoints?ansicht=maengel">
          <span>Offene Mängel</span>
          <strong>{all.defectsOpen}</strong>
          <small>
            {all.defectsHigh} hohe Priorität · {all.defectsOver} überfällig
          </small>
        </Link>
        <Link className={cn("kpi", all.tasksOver && "signal")} href="/aufgaben">
          <span>Offene Aufgaben</span>
          <strong>{all.tasksOpen}</strong>
          <small>{all.tasksOver} überfällig</small>
        </Link>
        <Link className={cn("kpi", all.lowStock && "signal")} href="/material?filter=unter">
          <span>Unter Mindestbestand</span>
          <strong>{all.lowStock}</strong>
          <small>{all.lowStockOpen} noch nicht bestellt</small>
        </Link>
        <Link className="kpi" href="/kalender">
          <span>Heute eingeteilt</span>
          <strong>{new Set(todayWork.map((e) => e.rowId)).size}</strong>
          <small>{all.todayEntries} Einsätze laut Kalender</small>
        </Link>
      </section>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-head">
            <h2>Baustellen</h2>
            <span className="grow" />
            <label className="search">
              <Search size={14} />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Baustelle, Nr., Auftraggeber" aria-label="Baustellen durchsuchen" />
            </label>
            <Seg<Show>
              label="Anzeigen"
              value={show}
              onChange={setShow}
              options={[
                { value: "laufend", label: "Laufend" },
                { value: "alle", label: "Alle" },
                { value: "archiviert", label: "Archiv" }
              ]}
            />
          </div>
          {rows.length ? (
            <div className="table-scroll">
              <table className="ui-table">
                <thead>
                  <tr>
                    <SortHead k="number" sort={sort} onSort={setSort}>
                      Nr.
                    </SortHead>
                    <SortHead k="name" sort={sort} onSort={setSort}>
                      Baustelle
                    </SortHead>
                    <SortHead k="status" sort={sort} onSort={setSort}>
                      Status
                    </SortHead>
                    <SortHead k="end" sort={sort} onSort={setSort}>
                      Zeitraum
                    </SortHead>
                    <th className="ui-table-head">Bauleitung</th>
                    <SortHead k="progress" sort={sort} onSort={setSort}>
                      Fortschritt
                    </SortHead>
                    <SortHead k="defects" sort={sort} onSort={setSort} className="num">
                      Mängel
                    </SortHead>
                    <th className="ui-table-head" aria-label="Öffnen" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map(({ s, st }) => (
                    <SiteRow key={s.id} s={s} st={st} active={s.id === siteId} onOpen={() => router.push(`/uebersicht/${s.id}`)} />
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="panel-body">
              <Empty
                inline
                icon={<HardHat size={28} />}
                title={data.sites.length ? "Keine Baustelle gefunden" : "Noch keine Baustelle"}
                text={data.sites.length ? "Suche oder Filter anpassen." : "Lege die erste Baustelle an – Checkliste, Aufgaben, Kalender und Material hängen daran."}
                action={
                  !data.sites.length && (
                    <Button leftIcon={<Plus size={15} />} onClick={() => setCreating(true)}>
                      Baustelle anlegen
                    </Button>
                  )
                }
              />
            </div>
          )}
        </section>

        <div className="overview-side">
          <section className="panel">
            <div className="panel-head">
              <h3>Meine Aufgaben</h3>
              <span className="grow" />
              <Link href="/aufgaben" className="more">
                Alle <ArrowRight size={13} />
              </Link>
            </div>
            {myTasks.length ? (
              <div className="list-rows">
                {myTasks.map((x) => (
                  <Link key={x.id} href={`/aufgaben?aufgabe=${x.id}`}>
                    <span className="title">{x.title}</span>
                    <Due due={x.due} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="panel-body muted">Keine offenen Aufgaben.</p>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h3>Offene Mängel</h3>
              <span className="grow" />
              <Link href="/openpoints?ansicht=maengel" className="more">
                Mängelliste <ArrowRight size={13} />
              </Link>
            </div>
            {urgent.length ? (
              <div className="list-rows">
                {urgent.map((d) => (
                  <Link key={d.id} href={`/openpoints?ansicht=maengel&mangel=${d.id}`}>
                    <Prio p={d.priority} />
                    <span className="title">
                      {d.title}
                      <small className="muted"> · {siteName(data, d.siteId)}</small>
                    </span>
                    <Due due={d.due} />
                  </Link>
                ))}
              </div>
            ) : (
              <p className="panel-body muted">Keine offenen Mängel.</p>
            )}
          </section>
          <section className="panel">
            <div className="panel-head">
              <h3>Heute im Einsatz</h3>
              <span className="grow" />
              <Link href="/kalender" className="more">
                Kalender <ArrowRight size={13} />
              </Link>
            </div>
            {todayWork.length ? (
              <div className="list-rows">
                {todayWork.map((e) => (
                  <div key={e.id}>
                    <Who id={e.rowId} empty={data.calendar.rows?.find((r) => r.id === e.rowId)?.name ?? "–"} />
                    <span className="title muted" style={{ textAlign: "right" }}>
                      {e.title || siteName(data, e.siteId)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="panel-body muted">Heute ist niemand eingeteilt.</p>
            )}
          </section>
        </div>
      </div>
      {creating && <SiteDialog onClose={() => setCreating(false)} onSaved={(s) => router.push(`/uebersicht/${s.id}`)} />}
    </div>
  );
}

function SiteRow({ s, st, active, onOpen }: { s: Site; st: ReturnType<typeof siteStats>; active: boolean; onOpen: () => void }) {
  return (
    <tr className={cn("ui-table-row clickable", active && "selected")} onClick={onOpen}>
      <td className="ui-table-cell nowrap muted">{s.number}</td>
      <td className="ui-table-cell">
        <Link href={`/uebersicht/${s.id}`} className="site-cell" onClick={(e) => e.stopPropagation()}>
          <span className="swatch" style={{ background: s.color }} />
          <span>
            <strong>{s.name}</strong>
            <small>{s.client || "–"}</small>
          </span>
        </Link>
      </td>
      <td className="ui-table-cell">
        <StatusBadge tone={SITE_STATUS[s.status].tone}>{SITE_STATUS[s.status].label}</StatusBadge>
      </td>
      <td className="ui-table-cell nowrap">
        {fmt(s.start || undefined)} – {fmt(s.end || undefined)}
      </td>
      <td className="ui-table-cell">
        <Who id={s.managerId} />
      </td>
      <td className="ui-table-cell" style={{ minWidth: 120 }}>
        <div className="progress-cell">
          <div className="progress">
            <i style={{ width: `${st.progress}%` }} />
          </div>
          <span>{st.points ? `${st.progress} %` : "–"}</span>
        </div>
      </td>
      <td className={cn("ui-table-cell num", st.defectsHigh > 0 && "signal-text")}>{st.defectsOpen || "–"}</td>
      <td className="ui-table-cell num">
        <ArrowRight size={14} className="muted" />
      </td>
    </tr>
  );
}

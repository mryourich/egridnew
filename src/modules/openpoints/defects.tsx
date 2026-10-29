"use client";

import { Paperclip, Search, TriangleAlert } from "lucide-react";
import { useMemo, useState } from "react";
import { Due, Empty, Prio, SortHead, Who } from "@/components/app/kit";
import { Input, Select } from "@/components/ui";
import { DEFECT_STATUS, DEFECT_STATUSES, defectOpen, PRIO_RANK, PRIORITIES, PRIORITY } from "@/lib/labels";
import { inSite, personName, siteName, useStore } from "@/lib/store/store";
import type { Defect, DefectStatus } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { withDefectStatus } from "./editors";
import { defectNo } from "./model";
import { ZipButton } from "./zip-button";
import { exportDefects } from "@/lib/photo-export";

type SortKey = "no" | "title" | "priority" | "status" | "due" | "owner";

export function DefectList({ onOpen, openId }: { onOpen: (id: string) => void; openId: string }) {
  const { data, save, siteId } = useStore();
  const [term, setTerm] = useState("");
  const [status, setStatus] = useState<"" | "offen_alle" | DefectStatus>("offen_alle");
  const [prio, setPrio] = useState("");
  const [owner, setOwner] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "priority", dir: 1 });
  const all = data.defects.filter(inSite(siteId));
  const t = term.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = all.filter(
      (d) =>
        (!status || (status === "offen_alle" ? defectOpen(d.status) : d.status === status)) &&
        (!prio || d.priority === prio) &&
        (!owner || (owner === "_none" ? !d.ownerId : d.ownerId === owner)) &&
        (!t || [defectNo(d), d.title, d.description, d.location, personName(data, d.ownerId), siteName(data, d.siteId)].join(" ").toLowerCase().includes(t))
    );
    const val = (d: Defect): string | number =>
      sort.key === "no"
        ? `${siteName(data, d.siteId)}${String(d.no).padStart(5, "0")}`
        : sort.key === "priority"
          ? PRIO_RANK[d.priority] * 100000 + Number((d.due || "9999-12-31").replaceAll("-", "")) / 1000
          : sort.key === "status"
            ? DEFECT_STATUSES.indexOf(d.status)
            : sort.key === "due"
              ? d.due || "9999"
              : sort.key === "owner"
                ? personName(data, d.ownerId).toLowerCase() || "zzz"
                : d.title.toLowerCase();
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
  }, [all, data, status, prio, owner, t, sort]);

  const counts = DEFECT_STATUSES.map((k) => [k, all.filter((d) => d.status === k).length] as const);

  return (
    <section className="panel">
      <div className="panel-head wrap">
        <div className="grow point-head">
          <h3>Mängelliste</h3>
          <span className="muted">{counts.map(([k, n]) => `${DEFECT_STATUS[k].label} ${n}`).join(" · ")}</span>
        </div>
        <ZipButton label="Fotos & Liste (ZIP)" needsPhotos={false} name={`Mängel ${siteId ? siteName(data, siteId) : "alle Baustellen"}`} run={() => exportDefects(data, rows)} />
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nr., Mangel, Ort" aria-label="Mängel durchsuchen" />
        </label>
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status" className="filter-select">
          <option value="offen_alle">Offen & in Behebung</option>
          <option value="">Alle Status</option>
          {DEFECT_STATUSES.map((k) => (
            <option key={k} value={k}>
              {DEFECT_STATUS[k].label}
            </option>
          ))}
        </Select>
        <Select value={prio} onChange={(e) => setPrio(e.target.value)} aria-label="Priorität" className="filter-select">
          <option value="">Alle Prioritäten</option>
          {PRIORITIES.map((k) => (
            <option key={k} value={k}>
              {PRIORITY[k]}
            </option>
          ))}
        </Select>
        <Select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Zuständig" className="filter-select">
          <option value="">Alle Zuständigen</option>
          <option value={data.meId}>Mir zugewiesen</option>
          <option value="_none">Nicht zugewiesen</option>
          {data.people
            .filter((p) => p.active && p.id !== data.meId)
            .sort((a, b) => a.name.localeCompare(b.name, "de"))
            .map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
        </Select>
      </div>
      {rows.length ? (
        <div className="table-scroll">
          <table className="ui-table">
            <thead>
              <tr>
                <SortHead k="no" sort={sort} onSort={setSort}>
                  Nr.
                </SortHead>
                <SortHead k="title" sort={sort} onSort={setSort}>
                  Mangel
                </SortHead>
                <SortHead k="priority" sort={sort} onSort={setSort}>
                  Priorität
                </SortHead>
                <SortHead k="status" sort={sort} onSort={setSort}>
                  Status
                </SortHead>
                <SortHead k="owner" sort={sort} onSort={setSort}>
                  Zuständig
                </SortHead>
                <SortHead k="due" sort={sort} onSort={setSort}>
                  Frist
                </SortHead>
                <th className="ui-table-head" aria-label="Dateien" />
              </tr>
            </thead>
            <tbody>
              {rows.map((d) => (
                <tr key={d.id} className={cn("ui-table-row clickable", !defectOpen(d.status) && "done", openId === d.id && "selected")} onClick={() => onOpen(d.id)}>
                  <td className="ui-table-cell nowrap muted">{defectNo(d)}</td>
                  <td className="ui-table-cell">
                    <div className="point-cell">
                      <strong>{d.title}</strong>
                      <small>{[!siteId && siteName(data, d.siteId), d.location].filter(Boolean).join(" · ") || "–"}</small>
                    </div>
                  </td>
                  <td className="ui-table-cell">
                    <Prio p={d.priority} />
                  </td>
                  <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                    <Select className={cn("status-select", d.status)} value={d.status} aria-label="Status" onChange={(e) => save("defects", withDefectStatus(d, e.target.value as DefectStatus, data.meId))}>
                      {DEFECT_STATUSES.map((k) => (
                        <option key={k} value={k}>
                          {DEFECT_STATUS[k].label}
                        </option>
                      ))}
                    </Select>
                  </td>
                  <td className="ui-table-cell">
                    <Who id={d.ownerId} empty="Nicht zugewiesen" />
                  </td>
                  <td className="ui-table-cell">
                    <Due due={d.due} done={!defectOpen(d.status)} />
                  </td>
                  <td className="ui-table-cell nowrap muted">
                    {d.files.length > 0 && (
                      <span className="hint" title="Fotos Mangel">
                        <Paperclip size={13} /> {d.files.length}
                      </span>
                    )}
                    {(d.fixFiles ?? []).length > 0 && (
                      <span className="hint ok-text" title="Fotos Behebung">
                        <Paperclip size={13} /> {(d.fixFiles ?? []).length}
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="panel-body">
          <Empty inline icon={<TriangleAlert size={26} />} title={all.length ? "Keine Mängel für diesen Filter" : "Keine Mängel erfasst"} text={all.length ? "Filter anpassen, um behobene oder abgenommene Mängel zu sehen." : "Mängel werden über „Mangel erfassen“ oder direkt aus einem Checklistenpunkt angelegt."} />
        </div>
      )}
    </section>
  );
}

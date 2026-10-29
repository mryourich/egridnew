"use client";

import { CheckCircle2, ClipboardPen, FileText, Plus, Search } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Empty, Field, Modal, PageHead, Seg, SortHead, StatusBadge, Who } from "@/components/app/kit";
import { Button, Input, Select } from "@/components/ui";
import { fmt, today } from "@/lib/date";
import { activeSites, inSite, siteName, useStore } from "@/lib/store/store";
import type { Report, ReportKind } from "@/lib/store/types";
import { cn } from "@/lib/utils";
import { approveReport, canApprove, KIND_LABEL, newReport, STATUS_LABEL } from "./model";

type Show = "alle" | "freigabe" | "entwurf" | "freigegeben";
type SortKey = "no" | "date" | "kind" | "status";

/** Creates a site report (Bautagesbericht or Regieschein) and opens it. */
export function useCreateSiteReport() {
  const { data, save, siteId } = useStore();
  const router = useRouter();
  const [ask, setAsk] = useState<ReportKind | null>(null);
  const create = (kind: ReportKind, site: string, date = today()) => {
    const s = data.sites.find((x) => x.id === site);
    const r = newReport(data, kind, date, { siteId: site, orderedBy: "", reason: "" });
    // the Bautagesbericht starts with the people planned on this site today
    if (kind === "bautagesbericht" && s) {
      const ids = [...new Set(data.entries.filter((e) => e.siteId === site && !e.symbol && e.start <= date && e.end >= date).map((e) => e.rowId))].filter((pid) => data.people.some((p) => p.id === pid));
      r.workers = ids.map((pid, i) => ({ id: `${r.id}-${i}`, personId: pid, name: data.people.find((p) => p.id === pid)!.name, date, from: "07:00", to: "16:00", pause: 30 }));
    }
    save("reports", r);
    router.push(`/berichte/${r.id}`);
  };
  const start = (kind: ReportKind, site = siteId) => (site ? create(kind, site) : setAsk(kind));
  const dialog = ask && <NewSiteReport kind={ask} onClose={() => setAsk(null)} onCreate={(site, date) => (setAsk(null), create(ask, site, date))} />;
  return { start, dialog };
}

function NewSiteReport({ kind, onClose, onCreate }: { kind: ReportKind; onClose: () => void; onCreate: (site: string, date: string) => void }) {
  const { data } = useStore();
  const sites = activeSites(data);
  const [site, setSite] = useState(sites[0]?.id ?? "");
  const [date, setDate] = useState(today());
  return (
    <Modal
      title={`${KIND_LABEL[kind]} anlegen`}
      onClose={onClose}
      onSubmit={() => site && onCreate(site, date)}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!site}>
            Anlegen
          </Button>
        </>
      }
    >
      {sites.length ? (
        <div className="form-grid">
          <Field label="Baustelle" className="span-2">
            <Select value={site} onChange={(e) => setSite(e.target.value)}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Datum">
            <Input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </Field>
        </div>
      ) : (
        <p className="muted">Zuerst eine Baustelle in der Übersicht anlegen.</p>
      )}
    </Modal>
  );
}

/** Bautagesberichte and Regiescheine of the sites, plus service reports – with release. */
export function Reports() {
  const { data, siteId, save, notify } = useStore();
  const lead = canApprove(data);
  const [busy, setBusy] = useState("");
  const release = async (r: Report) => {
    setBusy(r.id);
    try {
      await approveReport(data, r, save);
      notify(`${r.no} freigegeben`);
    } catch {
      notify("PDF konnte nicht erstellt werden", { tone: "error" });
    } finally {
      setBusy("");
    }
  };
  const router = useRouter();
  const { start, dialog } = useCreateSiteReport();
  const [show, setShow] = useState<Show>("alle");
  const [kind, setKind] = useState("");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "date", dir: -1 });
  const scoped = data.reports.filter((r) => (siteId ? r.siteId === siteId : true));
  const pending = scoped.filter((r) => r.status === "unterschrieben").length;
  const t = term.trim().toLowerCase();
  const refOf = (r: Report) => (r.siteId ? siteName(data, r.siteId) : [data.customers.find((c) => c.id === r.customerId)?.name, data.orders.find((o) => o.id === r.orderId)?.no].filter(Boolean).join(" · "));

  const rows = useMemo(() => {
    const list = scoped.filter(
      (r) =>
        (show === "alle" || (show === "freigabe" ? r.status === "unterschrieben" : show === "entwurf" ? r.status === "entwurf" || r.status === "zurueck" : r.status === "freigegeben")) &&
        (!kind || r.kind === kind) &&
        (!t || [r.no, r.text, refOf(r), KIND_LABEL[r.kind]].join(" ").toLowerCase().includes(t))
    );
    const val = (r: Report) => (sort.key === "no" ? r.no : sort.key === "date" ? r.date + r.no : sort.key === "kind" ? r.kind : Object.keys(STATUS_LABEL).indexOf(r.status));
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, siteId, show, kind, t, sort]);

  return (
    <div className="page">
      <PageHead
        title="Berichte"
        sub={`${siteId ? siteName(data, siteId) : "Alle Baustellen"} · Bautagesberichte, Regiescheine${data.workspace.modules?.service ? ", Serviceberichte" : ""}`}
        actions={
          <>
            <Button variant="secondary" leftIcon={<ClipboardPen size={15} />} onClick={() => start("regie")}>
              Regieschein
            </Button>
            <Button leftIcon={<Plus size={15} />} onClick={() => start("bautagesbericht")}>
              Bautagesbericht
            </Button>
          </>
        }
      />
      <div className="toolbar">
        <Seg<Show>
          label="Status"
          value={show}
          onChange={setShow}
          options={[
            { value: "alle", label: "Alle" },
            { value: "freigabe", label: `Zur Freigabe (${pending})` },
            { value: "entwurf", label: "Entwürfe" },
            { value: "freigegeben", label: "Freigegeben" }
          ]}
        />
        <Select value={kind} onChange={(e) => setKind(e.target.value)} aria-label="Art" className="filter-select">
          <option value="">Alle Arten</option>
          {(Object.keys(KIND_LABEL) as ReportKind[]).map((k) => (
            <option key={k} value={k}>
              {KIND_LABEL[k]}
            </option>
          ))}
        </Select>
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Nr., Baustelle, Kunde, Text" aria-label="Berichte durchsuchen" />
        </label>
        <span className="count">{rows.length} Berichte</span>
      </div>
      <section className="panel">
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <SortHead k="no" sort={sort} onSort={setSort}>
                    Nr.
                  </SortHead>
                  <SortHead k="kind" sort={sort} onSort={setSort}>
                    Art
                  </SortHead>
                  <SortHead k="date" sort={sort} onSort={setSort}>
                    Datum
                  </SortHead>
                  <th className="ui-table-head">Baustelle / Kunde</th>
                  <th className="ui-table-head">Erstellt von</th>
                  <SortHead k="status" sort={sort} onSort={setSort}>
                    Status
                  </SortHead>
                  {lead && <th className="ui-table-head" aria-label="Freigabe" />}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id} className={cn("ui-table-row clickable", r.status === "unterschrieben" && "warn")} onClick={() => router.push(`/berichte/${r.id}`)}>
                    <td className="ui-table-cell mono">
                      <Link href={`/berichte/${r.id}`} onClick={(e) => e.stopPropagation()}>
                        {r.no}
                      </Link>
                    </td>
                    <td className="ui-table-cell">{KIND_LABEL[r.kind]}</td>
                    <td className="ui-table-cell nowrap">{fmt(r.date)}</td>
                    <td className="ui-table-cell">
                      <div className="point-cell">
                        <strong>{refOf(r) || "–"}</strong>
                        <small>{r.text.split("\n")[0] || "–"}</small>
                      </div>
                    </td>
                    <td className="ui-table-cell">
                      <Who id={r.createdBy} />
                    </td>
                    <td className="ui-table-cell">
                      <StatusBadge tone={STATUS_LABEL[r.status].tone}>{STATUS_LABEL[r.status].label}</StatusBadge>
                    </td>
                    {lead && (
                      <td className="ui-table-cell num" onClick={(e) => e.stopPropagation()}>
                        {r.status === "unterschrieben" && (
                          <Button size="sm" leftIcon={<CheckCircle2 size={14} />} disabled={busy === r.id} onClick={() => void release(r)}>
                            {busy === r.id ? "…" : "Freigeben"}
                          </Button>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <Empty
              inline
              icon={<FileText size={26} />}
              title={scoped.length ? "Kein Bericht für diesen Filter" : "Noch keine Berichte"}
              text={scoped.length ? "Filter anpassen." : "Bautagesbericht oder Regieschein anlegen – ausfüllen, unterschreiben lassen, das PDF entsteht automatisch."}
            />
          </div>
        )}
      </section>
      {dialog}
    </div>
  );
}

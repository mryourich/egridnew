"use client";

import { History } from "lucide-react";
import { fmt } from "@/lib/date";
import { employeeName, fmtStamp, useStore } from "@/lib/store";
import type { Tracked } from "@/lib/types";

export const ISSUE_LABELS = { offen: "Offen", in_arbeit: "In Arbeit", erledigt: "Behoben" };
export const NODE_LABELS = { offen: "Offen", in_arbeit: "In Arbeit", erledigt: "Erledigt" };
export const MATERIAL_LABELS = { offen: "Offen", bestellt: "Bestellt", angekommen: "Angekommen" };

type Props = {
  item: Tracked & { createdAt?: string };
  /** Label per status value, e.g. { erledigt: "Erledigt" }. */
  labels: Record<string, string>;
  /** Word for creating, e.g. "Gemeldet" or "Bestellung angelegt". */
  created?: string;
  compact?: boolean;
};

/** Who did what and when: creation plus every status change. */
export function Trail({ item, labels, created = "Angelegt", compact }: Props) {
  const { data } = useStore();
  const name = (id?: string) => (id ? employeeName(data, id) : "");
  const rows: { label: string; by?: string; ts: string }[] = [];
  const hist = item.history ?? [];
  // the first history entry is the creation itself (status "offen")
  const first = hist[0];
  if (item.createdTs || item.createdAt) rows.push({ label: created, by: item.createdBy ?? first?.by, ts: item.createdTs ? fmtStamp(item.createdTs) : fmt(item.createdAt) });
  for (const h of hist.slice(item.createdTs && first && first.ts === item.createdTs ? 1 : 0)) rows.push({ label: labels[h.status] ?? h.status, by: h.by, ts: fmtStamp(h.ts) });
  if (!rows.length) return null;
  if (compact) {
    const show = rows.length > 1 ? [rows[0], rows[rows.length - 1]] : rows;
    return (
      <small className="trail-compact" title={rows.map((r) => `${r.label}: ${name(r.by)} · ${r.ts}`).join("\n")}>
        {show.map((r, i) => (
          <span key={i}>
            {r.label} {r.by && <b>{name(r.by)}</b>} · {r.ts}
          </span>
        ))}
      </small>
    );
  }
  return (
    <ol className="trail">
      {rows.map((r, i) => (
        <li key={i}>
          <History size={12} />
          <strong>{r.label}</strong>
          <span>{name(r.by) || "–"}</span>
          <time>{r.ts}</time>
        </li>
      ))}
    </ol>
  );
}

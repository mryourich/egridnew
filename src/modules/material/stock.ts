import { now, uid } from "@/lib/store/id";
import type { MaterialItem, StockMove } from "@/lib/store/types";

const round = (n: number) => Math.round(n * 100) / 100;

export const isLow = (m: MaterialItem) => m.qty < m.minQty;

/** Books a withdrawal, receipt or correction and keeps it in the item's log. */
export function book(m: MaterialItem, kind: StockMove["kind"], qty: number, by: string, note?: string): MaterialItem {
  const delta = kind === "entnahme" ? -qty : kind === "zugang" ? qty : 0;
  const next = kind === "korrektur" ? qty : Math.max(0, round(m.qty + delta));
  const move: StockMove = { id: uid(), at: now(), by, kind, qty: kind === "korrektur" ? round(qty - m.qty) : qty, ...(note ? { note } : {}) };
  return { ...m, qty: next, log: [...(m.log ?? []), move].slice(-200) };
}

/** Records an order of a quantity. */
export function order(m: MaterialItem, qty: number, by: string): MaterialItem {
  const move: StockMove = { id: uid(), at: now(), by, kind: "bestellung", qty };
  return { ...m, ordered: true, orderedQty: qty, orderedAt: now(), log: [...(m.log ?? []), move].slice(-200) };
}

export function cancelOrder(m: MaterialItem): MaterialItem {
  return { ...m, ordered: false, orderedQty: undefined, orderedAt: undefined };
}

/** The ordered quantity arrived: stock goes up, the order is closed. */
export function receive(m: MaterialItem, by: string, qty = m.orderedQty ?? 0): MaterialItem {
  return cancelOrder(book(m, "zugang", qty, by, "Lieferung"));
}

/** Suggested order: back up to twice the minimum. */
export const suggest = (m: MaterialItem) => Math.max(1, Math.ceil(m.minQty * 2 - m.qty));

export const orders = (m: MaterialItem) => (m.log ?? []).filter((x) => x.kind === "bestellung");
export const withdrawals = (m: MaterialItem) => (m.log ?? []).filter((x) => x.kind === "entnahme");

export const MOVE_LABEL: Record<StockMove["kind"], string> = { entnahme: "Entnahme", zugang: "Zugang", bestellung: "Bestellung", korrektur: "Korrektur" };

import { today } from "@/lib/date";
import type { Customer, Data, OrderStatus, Person, ServiceOrder } from "@/lib/store/types";

export const ORDER_STATUS: Record<OrderStatus, { label: string; tone: "neutral" | "blue" | "amber" | "green" }> = {
  offen: { label: "Nicht zugeteilt", tone: "neutral" },
  geplant: { label: "Geplant", tone: "blue" },
  in_arbeit: { label: "In Arbeit", tone: "amber" },
  erledigt: { label: "Erledigt – zur Freigabe", tone: "amber" },
  freigegeben: { label: "Freigegeben", tone: "green" }
};
export const ORDER_STATUSES = Object.keys(ORDER_STATUS) as OrderStatus[];
export const isDone = (o: ServiceOrder) => o.status === "erledigt" || o.status === "freigegeben";

/** Where the work is: the order's own address or the customer's. */
export function addressOf(o: ServiceOrder, c?: Customer) {
  const street = o.street || c?.street || "";
  const zip = o.street ? o.zip : (c?.zip ?? "");
  const city = o.street ? o.city : (c?.city ?? "");
  return { street, zip, city, line: [street, [zip, city].filter(Boolean).join(" ")].filter(Boolean).join(", ") };
}

/** Google Maps route to one address (opens the app on the tablet). */
export const mapsUrl = (address: string) => `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, Österreich`)}&travelmode=driving`;

/** The day as one route: up to 9 stops plus the destination (Google Maps limit). */
export function routeUrl(addresses: string[]) {
  const list = addresses.filter(Boolean).slice(0, 10);
  if (!list.length) return "";
  const dest = list.at(-1)!;
  const way = list.slice(0, -1).map((a) => `${a}, Österreich`).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${dest}, Österreich`)}${way ? `&waypoints=${encodeURIComponent(way)}` : ""}&travelmode=driving`;
}

export function nextOrderNo(data: Data) {
  const p = `SA-${today().slice(0, 4)}-`;
  const n = Math.max(0, ...data.orders.filter((o) => o.no.startsWith(p)).map((o) => Number(o.no.slice(p.length)) || 0));
  return `${p}${String(n + 1).padStart(4, "0")}`;
}

export function nextCustomerNo(data: Data) {
  const n = Math.max(1000, ...data.customers.map((c) => Number(c.no.replace(/\D/g, "")) || 0));
  return `K-${n + 1}`;
}

/** Technicians: people in service (by function) and everyone who has orders. */
export function technicians(data: Data, all = false): Person[] {
  return data.people
    .filter((p) => p.active && (all || /service|kundendienst/i.test(`${p.role} ${p.trade ?? ""}`) || data.orders.some((o) => o.techId === p.id)))
    .sort((a, b) => a.name.localeCompare(b.name, "de"));
}

export const ordersOf = (data: Data, techId: string, date: string) => data.orders.filter((o) => o.techId === techId && o.date === date).sort((a, b) => a.seq - b.seq);

/** Minutes worked on an order (closed time stamps). */
export function minutesOf(o: ServiceOrder) {
  return o.times.reduce((s, t) => s + (t.to ? Math.max(0, Date.parse(t.to) - Date.parse(t.from)) / 60000 : 0), 0);
}

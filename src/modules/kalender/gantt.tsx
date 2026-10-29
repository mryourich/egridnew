"use client";

import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Copy,
  GripVertical,
  Link2,
  MessageSquare,
  Palette,
  Pencil,
  Plus,
  Search,
  Star,
  Trash2,
  Unlink,
  Users,
  X,
} from "lucide-react";
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { Avatar, useConfirm } from "@/components/app/kit";
import {
  addDays,
  diffDays,
  fmt,
  holidayName,
  isoWeek,
  isWeekend,
  monthLabel,
  startOfWeek,
  today,
  weekday,
  weekdayLong,
  weekdayShort,
  type ISODate,
} from "@/lib/date";
import { activeSites, now, uid, useStore } from "@/lib/store/store";
import type { Absence, AbsenceType, CalendarEntry as Job, CalendarLayout, Person } from "@/lib/store/types";
import { SiteDialog } from "@/modules/uebersicht/site-dialog";
import { EntrySheet, type PlanEdit } from "./entry-sheet";
import "./gantt.css";
import { ABS_TYPES, ABSENCE, PALETTE, Sym, SYMBOL_NAMES, textOn, withMember } from "./plan-kit";

const ZOOMS = {
  tag: { label: "Tag", dw: 36, days: 42, step: 7 },
  woche: { label: "Woche", dw: 20, days: 98, step: 14 },
  monat: { label: "Monat", dw: 9, days: 182, step: 28 },
} as const;
type Zoom = keyof typeof ZOOMS;

const LANE = 22;
const GROUP_H = 22;
/* Half-day positions: day * 2, +1 for the afternoon. */
function halves(
  from: ISODate,
  j: Pick<Job, "start" | "end" | "startPm" | "endAm">,
) {
  const s = diffDays(from, j.start) * 2 + (j.startPm ? 1 : 0);
  const e = diffDays(from, j.end) * 2 + (j.endAm ? 1 : 2);
  return { s, e: Math.max(e, s + 1) };
}
function fromHalves(from: ISODate, s: number, e: number) {
  const last = e - 1;
  return {
    start: addDays(from, Math.floor(s / 2)),
    startPm: s % 2 === 1,
    end: addDays(from, Math.floor(last / 2)),
    endAm: last % 2 === 0,
  };
}
const longDate = (d: ISODate, pm?: boolean) =>
  `${weekdayLong(d)} ${Number(d.slice(8))}. ${monthLabel(d, true).split(" ")[0]}${pm ? " (Nachm.)" : ""}`;
const dayCount = (n: number) =>
  `${String(n / 2).replace(".", ",")} ${n === 2 ? "Tag" : "Tage"}`;

type Item = {
  id: string;
  name: string;
  info: string;
  auto: string;
  emp?: Person;
};
type Drag = {
  kind: "job" | "abs";
  id: string;
  mode: "move" | "start" | "end";
  x0: number;
  y0: number;
  moved: boolean;
  d: number;
  row: string;
  add: boolean;
};
type Band = { x0: number; y0: number; x1: number; y1: number };
type MenuItem = {
  label: string;
  icon?: ReactNode;
  danger?: boolean;
  onClick?: () => void;
  colors?: (c: string) => void;
  icons?: (i: string) => void;
  list?: { label: string; color?: string; onClick: () => void }[];
};
type Menu = {
  x: number;
  y: number;
  items: MenuItem[];
  swatches?: (c: string) => void;
};

/**
 * VYSNER planning board: rows per person (plus free rows for crane, delivery, subcontractor), bars in half days,
 * symbols, comments and links. With a site chosen in the top bar it becomes that site's plan.
 * Click = select · drag = move / resize · drag on empty space = select several · double click = rename or new bar ·
 * right click (long press on touch) = menu · Del, F2, Ctrl+C / V / D and the arrow keys work on the selection.
 */
export function Gantt({ company = false }: { company?: boolean }) {
  const { data, save, remove, setLayout, notify, siteId, restore } = useStore();
  const ask = useConfirm();
  const t = today();
  // the Planner always shows the whole company, the calendar follows the site chosen in the top bar
  const site = company ? null : (data.sites.find((s) => s.id === siteId) ?? null);
  const layout: CalendarLayout = data.calendar;
  const saveLayout = (patch: Partial<CalendarLayout>) => setLayout({ ...layout, ...patch });
  const sites = activeSites(data);

  const [zoom, setZoom] = useState<Zoom>("woche");
  const { dw, step } = ZOOMS[zoom];
  // the visible range grows in both directions while scrolling – past included
  const startRange = (z: Zoom) => ({ from: addDays(startOfWeek(t), -ZOOMS[z].step * 2), days: ZOOMS[z].days + ZOOMS[z].step * 2 });
  const [range, setRange] = useState(() => startRange("woche"));
  const { from, days } = range;
  const [jump, setJump] = useState(0);
  const pendingShift = useRef(0);
  const hw = dw / 2;
  const to = addDays(from, days - 1);
  const dayList = Array.from({ length: days }, (_, i) => addDays(from, i));
  const timelineW = days * dw;

  const [query, setQuery] = useState("");
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());
  const [sel, setSel] = useState<string[]>([]);
  const [clip, setClip] = useState<Job[]>([]);
  const [drag, setDrag] = useState<Drag | null>(null);
  const dragRef = useRef<Drag | null>(null);
  const [band, setBand] = useState<Band | null>(null);
  const [menu, setMenu] = useState<Menu | null>(null);
  const [renaming, setRenaming] = useState("");
  const [note, setNote] = useState<{ id: string; x: number; y: number } | null>(
    null,
  );
  const [hoverNote, setHoverNote] = useState("");
  const [linkFrom, setLinkFrom] = useState("");
  const [sheet, setSheet] = useState<{ edit: PlanEdit; who?: string } | null>(
    null,
  );
  const [teamEdit, setTeamEdit] = useState(false);
  const [dnd, setDnd] = useState<{ type: "row" | "group"; id: string } | null>(
    null,
  );
  const [dropAt, setDropAt] = useState("");
  const [narrow, setNarrow] = useState(false);
  const [viewH, setViewH] = useState(0);
  const headRef = useRef<HTMLDivElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hover = useRef<{ row: string; half: number } | null>(null);
  const longPress = useRef<{
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setViewH(el.clientHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  useEffect(() => {
    const fit = () => setNarrow(window.innerWidth < 760);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const leftW = narrow ? 118 : 290;

  // today a little in from the left edge (on load, "Heute" and zoom)
  useEffect(() => {
    const el = scrollRef.current;
    const i = diffDays(from, t);
    if (el && i >= 0 && i < days) el.scrollLeft = Math.max(0, (i - 3) * dw);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [jump, zoom]);
  // after adding days in front, keep the view where it was
  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el && pendingShift.current) {
      el.scrollLeft += pendingShift.current;
      pendingShift.current = 0;
    }
  }, [from]);
  const onScroll = () => {
    const el = scrollRef.current;
    if (!el || pendingShift.current) return;
    const more = step * 2;
    if (el.scrollLeft < 120) {
      pendingShift.current = more * dw;
      setRange((r) => ({ from: addDays(r.from, -more), days: r.days + more }));
    } else if (el.scrollLeft + el.clientWidth > el.scrollWidth - 120) setRange((r) => ({ ...r, days: r.days + more }));
  };
  const scrollBy = (n: number) => scrollRef.current?.scrollBy({ left: n * dw, behavior: "smooth" });
  const goToday = (z: Zoom = zoom) => {
    setRange(startRange(z));
    setJump((j) => j + 1);
  };

  /* ---------------------------------------------------------------- rows and groups */
  const freeRows = layout.rows ?? [];
  // a site plan shows its team and whoever has work on it; the company board everyone
  const people = (
    site
      ? data.people.filter((e) => e.active && (e.id === site.managerId || site.memberIds.includes(e.id) || data.entries.some((j) => j.siteId === site.id && j.rowId === e.id)))
      : data.people.filter((e) => e.active)
  ).sort((a, b) => a.name.localeCompare(b.name, "de"));
  const order = layout.rowOrder ?? [];
  const pos = (id: string) => (order.includes(id) ? order.indexOf(id) : 1e6);
  const items: Item[] = (
    [
      ...people.map((e) => ({
        id: e.id,
        name: e.name,
        info: e.role,
        auto: e.role || "Mitarbeiter",
        emp: e,
      })),
      ...freeRows.map((r) => ({
        id: r.id,
        name: r.name,
        info: "Freie Zeile",
        auto: "Weitere",
      })),
    ] as Item[]
  )
    .map((it, i) => ({ it, i }))
    .sort((a, b) => pos(a.it.id) - pos(b.it.id) || a.i - b.i)
    .map((x) => x.it);
  // own groups once someone made them; until then rows are grouped by function
  const own = layout.groups ?? [];
  const autoNames = [...new Set(items.map((it) => it.auto))];
  const groups = own.length
    ? [...own, { id: "", name: "Ohne Gruppe" }]
    : autoNames.map((n) => ({ id: `auto:${n}`, name: n }));
  const groupOf = (it: Item) =>
    own.length
      ? own.some((g) => g.id === layout.memberGroup?.[it.id])
        ? layout.memberGroup![it.id]
        : ""
      : `auto:${it.auto}`;
  const nameOf = (rowId: string) =>
    items.find((it) => it.id === rowId)?.name ??
    data.people.find((e) => e.id === rowId)?.name ??
    freeRows.find((r) => r.id === rowId)?.name ??
    "";

  /** Turns the automatic grouping into own groups, so rows can be moved freely. */
  const ensureOwn = () => {
    if (own.length)
      return {
        gs: own,
        mg: { ...(layout.memberGroup ?? {}) },
        map: (id: string) => id,
      };
    const gs = groups
      .filter((g) => items.some((it) => groupOf(it) === g.id))
      .map((g) => ({ id: uid(), name: g.name, from: g.id }));
    const map = (id: string) => gs.find((g) => g.from === id)?.id ?? "";
    const mg: Record<string, string> = {};
    for (const it of items) mg[it.id] = map(groupOf(it));
    return { gs: gs.map(({ id, name }) => ({ id, name })), mg, map };
  };
  const dropRow = (rowId: string, target: { row?: string; group?: string }) => {
    if (target.row === rowId) return;
    const { gs, mg, map } = ensureOwn();
    const ids = items.map((it) => it.id).filter((id) => id !== rowId);
    let gid: string;
    if (target.row) {
      const tgt = items.find((it) => it.id === target.row)!;
      gid = map(groupOf(tgt));
      const at = ids.indexOf(target.row);
      ids.splice(
        items.findIndex((it) => it.id === rowId) <
          items.findIndex((it) => it.id === target.row)
          ? at + 1
          : at,
        0,
        rowId,
      );
    } else {
      gid = map(target.group ?? "");
      ids.push(rowId);
    }
    // rows hidden on a site plan keep their place
    const rest = order.filter((id) => !ids.includes(id));
    saveLayout({
      groups: gs,
      memberGroup: { ...mg, [rowId]: gid },
      rowOrder: [...ids, ...rest],
    });
  };
  const dropGroup = (groupId: string, targetId: string) => {
    const { gs, mg, map } = ensureOwn();
    const g = map(groupId);
    const tgt = map(targetId);
    if (!g || g === tgt) return;
    const list = gs.filter((x) => x.id !== g);
    list.splice(
      tgt ? list.findIndex((x) => x.id === tgt) : list.length,
      0,
      gs.find((x) => x.id === g)!,
    );
    saveLayout({ groups: list, memberGroup: mg });
  };
  const addRow = () => {
    const id = uid();
    saveLayout({ rows: [...freeRows, { id, name: "Neue Zeile" }] });
    setRenaming(`r:${id}`);
  };
  const addGroup = () => {
    const { gs, mg } = ensureOwn();
    const id = uid();
    saveLayout({
      groups: [...gs, { id, name: "Neue Gruppe" }],
      memberGroup: mg,
    });
    setRenaming(`g:${id}`);
  };
  const renameRow = (it: Item, name: string) => {
    setRenaming("");
    const n = name.trim();
    if (!n || n === it.name) return;
    if (it.emp) save("people", { ...it.emp, name: n });
    else
      saveLayout({
        rows: freeRows.map((r) => (r.id === it.id ? { ...r, name: n } : r)),
      });
  };
  const renameGroup = (gid: string, name: string) => {
    setRenaming("");
    const n = name.trim();
    if (!n) return;
    const { gs, mg, map } = ensureOwn();
    const id = map(gid) || gid;
    saveLayout({
      groups: gs.map((g) => (g.id === id ? { ...g, name: n } : g)),
      memberGroup: mg,
    });
  };
  const deleteRow = async (it: Item) => {
    const bars = data.entries.filter((j) => j.rowId === it.id);
    if (!(await ask({ title: `Zeile „${it.name}“ löschen?`, text: bars.length ? `${bars.length} Balken in dieser Zeile werden mitgelöscht.` : undefined }))) return;
    const before = data;
    setLayout({ ...layout, rows: freeRows.filter((r) => r.id !== it.id) });
    bars.forEach((j) => remove("entries", j.id));
    notify(`Zeile „${it.name}“ gelöscht`, { undo: () => restore(before) });
  };
  const deleteGroup = async (gid: string, name: string) => {
    if (!(await ask({ title: `Gruppe „${name}“ löschen?`, text: "Die Zeilen bleiben erhalten (ohne Gruppe).", confirm: "Gruppe löschen" }))) return;
    const mg = { ...(layout.memberGroup ?? {}) };
    for (const k of Object.keys(mg)) if (mg[k] === gid) mg[k] = "";
    saveLayout({ groups: own.filter((g) => g.id !== gid), memberGroup: mg });
  };
  const setStatus = (rowId: string, value: string) => {
    const v = value.trim().toUpperCase();
    if ((layout.rowStatus?.[rowId] ?? "") === v) return;
    saveLayout({ rowStatus: { ...(layout.rowStatus ?? {}), [rowId]: v } });
  };

  /* ---------------------------------------------------------------- bars */
  const scoped = data.entries.filter((j) => !site || j.siteId === site.id);
  const q = query.trim().toLowerCase();
  const projectOf = (j: Job) => data.sites.find((p) => p.id === j.siteId);
  const labelOf = (j: Job) =>
    site
      ? j.title
      : [projectOf(j)?.name ?? "Baustelle", j.title]
          .filter(Boolean)
          .join(" · ");
  const hit = (j: Job) => !q || labelOf(j).toLowerCase().includes(q);

  const preview = (j: Job): Job => {
    const d = drag;
    if (!d || d.kind !== "job" || !d.moved) return j;
    const group = d.mode === "move" && sel.length > 1 && sel.includes(d.id);
    if (j.id !== d.id && !(group && sel.includes(j.id))) return j;
    const { s, e } = halves(from, j);
    let ns = s;
    let ne = e;
    if (d.mode === "move") ((ns = s + d.d), (ne = e + d.d));
    else if (d.mode === "start") ns = Math.min(e - 1, s + d.d);
    else ne = Math.max(s + 1, e + d.d);
    return {
      ...j,
      ...fromHalves(from, ns, ne),
      rowId: j.id === d.id && !group ? d.row : j.rowId,
    };
  };
  const previewAbs = (a: Absence): Absence => {
    const d = drag;
    if (!d || d.kind !== "abs" || d.id !== a.id || !d.moved) return a;
    if (d.mode === "move")
      return {
        ...a,
        start: addDays(a.start, d.d),
        end: addDays(a.end, d.d),
        personId: d.row,
      };
    if (d.mode === "start") {
      const s = addDays(a.start, d.d);
      return { ...a, start: s > a.end ? a.end : s };
    }
    const e = addDays(a.end, d.d);
    return { ...a, end: e < a.start ? a.start : e };
  };

  // Layout of the body: every row's top, every bar's lane – needed for links, notes and the selection frame.
  type RowView =
    | {
        kind: "group";
        key: string;
        gid: string;
        name: string;
        count: number;
        ids: string[];
        top: number;
      }
    | {
        kind: "item";
        it: Item;
        top: number;
        height: number;
        bars: Job[];
        syms: Job[];
        lane: Map<string, number>;
        abs: Absence[];
        elsewhere: Job[];
      };
  const shown = items.filter(
    (it) =>
      !q ||
      it.name.toLowerCase().includes(q) ||
      scoped.some((j) => j.rowId === it.id && hit(j)),
  );
  const views: RowView[] = [];
  const box = new Map<
    string,
    { x0: number; x1: number; y: number; row: string }
  >();
  let top = 0;
  for (const g of groups) {
    const members = shown.filter((it) => groupOf(it) === g.id);
    if (!members.length && (!own.length || !g.id || q)) continue;
    const key = g.id || "none";
    views.push({
      kind: "group",
      key,
      gid: g.id,
      name: g.name,
      count: members.length,
      // a collapsed group shows its load per day
      ids: members.filter((m) => m.emp).map((m) => m.id),
      top,
    });
    top += GROUP_H;
    if (collapsed.has(key)) continue;
    for (const it of members) {
      const list = scoped
        .map(preview)
        .filter((j) => j.rowId === it.id && j.end >= from && j.start <= to)
        .sort(
          (a, b) =>
            a.start.localeCompare(b.start) ||
            Number(!!a.startPm) - Number(!!b.startPm),
        );
      const bars = list.filter((j) => !j.symbol);
      const syms = list.filter((j) => j.symbol);
      const ends: number[] = [];
      const lane = new Map<string, number>();
      for (const j of bars) {
        const { s, e } = halves(from, j);
        let i = ends.findIndex((x) => x <= s);
        if (i === -1) i = ends.length;
        ends[i] = e;
        lane.set(j.id, i);
      }
      for (const j of syms) {
        const { s } = halves(from, j);
        const under = bars.find(
          (b) => halves(from, b).s <= s && halves(from, b).e > s,
        );
        lane.set(j.id, under ? (lane.get(under.id) ?? 0) : 0);
      }
      const height = Math.max(1, ends.length) * LANE;
      for (const j of list) {
        const { s, e } = halves(from, j);
        box.set(j.id, {
          x0: s * hw,
          x1: e * hw,
          y: top + (lane.get(j.id) ?? 0) * LANE,
          row: it.id,
        });
      }
      const abs = it.emp
        ? data.absences
            .map(previewAbs)
            .filter(
              (a) => a.personId === it.id && a.end >= from && a.start <= to,
            )
        : [];
      const elsewhere =
        site && it.emp
          ? data.entries.filter(
              (j) =>
                j.rowId === it.id &&
                j.siteId !== site.id &&
                !j.symbol &&
                j.end >= from &&
                j.start <= to,
            )
          : [];
      views.push({
        kind: "item",
        it,
        top,
        height,
        bars,
        syms,
        lane,
        abs,
        elsewhere,
      });
      top += height;
    }
  }
  // empty rows down to the bottom, like a paper planning board
  const fillers = Math.max(0, Math.ceil((viewH - (headRef.current?.offsetHeight ?? 60) - top) / LANE));
  const bodyH = top + fillers * LANE;

  /* ---------------------------------------------------------------- actions */
  const insert = (
    row: string,
    half: number,
    opts: {
      color?: string;
      siteId?: string;
      symbol?: boolean;
      icon?: string;
      exact?: boolean;
    },
  ) => {
    const siteId = site?.id ?? opts.siteId ?? "";
    const p = data.sites.find((x) => x.id === siteId);
    if (!p) return;
    const s = opts.exact ? half : Math.floor(half / 2) * 2;
    const id = uid();
    save(
      "entries",
      {
        id,
        siteId,
        rowId: row,
        title: opts.symbol ? "" : site ? "Neue Aufgabe" : "",
        color: opts.color ?? p.color,
        ...fromHalves(from, s, s + (opts.symbol && opts.exact ? 1 : 2)),
        note: "",
        done: false,
        symbol: opts.symbol,
        createdBy: data.meId,
        createdAt: now(),
        icon: opts.icon,
      },
    );
    const member = withMember(data, siteId, row);
    if (member) save("sites", member);
    if (!opts.symbol && site) setRenaming(`j:${id}`);
    setSel([id]);
  };
  const addAbsence = (row: string, half: number, type: AbsenceType) => {
    const day = addDays(from, Math.floor(half / 2));
    save(
      "absences",
      { id: uid(), personId: row, type, start: day, end: day, note: "" },
    );
    notify(`${ABSENCE[type].label} eingetragen – Enden ziehen = länger`);
  };
  const removeJobs = (list: Job[]) => {
    if (!list.length) return;
    // links pointing at removed bars go along (store)
    const before = data;
    list.forEach((j) => remove("entries", j.id));
    setSel([]);
    notify(list.length > 1 ? `${list.length} Elemente entfernt` : "Entfernt", { undo: () => restore(before) });
  };
  const paste = (row: string, half: number) => {
    if (!clip.length) return;
    const first = Math.min(...clip.map((j) => halves(from, j).s));
    const ids: string[] = [];
    for (const j of clip) {
      const { s, e } = halves(from, j);
      const id = uid();
      ids.push(id);
      save("entries", {
        ...j,
        id,
        links: [],
        rowId: clip.length === 1 ? row : j.rowId,
        ...fromHalves(from, s - first + half, e - first + half),
        done: false,
      });
    }
    setSel(ids);
    notify("Eingefügt");
  };
  const duplicate = (list: Job[]) => {
    const ids: string[] = [];
    for (const j of list) {
      const { s, e } = halves(from, j);
      const id = uid();
      ids.push(id);
      save("entries", {
        ...j,
        id,
        links: [],
        ...fromHalves(from, e, e + (e - s)),
        done: false,
      });
    }
    setSel(ids);
    notify("Dupliziert");
  };
  const shift = (list: Job[], n: number) =>
    list.forEach((j) =>
      save("entries", {
        ...j,
        ...fromHalves(from, halves(from, j).s + n, halves(from, j).e + n),
      }),
    );
  const link = (fromId: string, toId: string) => {
    const a = data.entries.find((j) => j.id === fromId);
    if (!a || fromId === toId || a.links?.includes(toId)) return;
    save("entries", { ...a, links: [...(a.links ?? []), toId] });
    notify("Verknüpft");
  };
  const unlink = (id: string) => {
    for (const j of data.entries) {
      if (j.id === id && j.links?.length) save("entries", { ...j, links: [] });
      else if (j.links?.includes(id))
        save("entries", { ...j, links: j.links.filter((l) => l !== id) });
    }
  };

  /* ---------------------------------------------------------------- pointer: drag bars, frame selection */
  const commit = useRef<(d: Drag) => void>(() => {});
  commit.current = (d) => {
    if (d.kind === "job") {
      const j = data.entries.find((x) => x.id === d.id);
      if (!j) return;
      if (!d.moved) {
        setSel((cur) =>
          d.add
            ? cur.includes(j.id)
              ? cur.filter((x) => x !== j.id)
              : [...cur, j.id]
            : [j.id],
        );
        return;
      }
      const group = d.mode === "move" && sel.length > 1 && sel.includes(d.id);
      for (const x of group
        ? data.entries.filter((y) => sel.includes(y.id))
        : [j]) {
        const p = preview(x);
        if (
          p.start !== x.start ||
          p.end !== x.end ||
          p.startPm !== x.startPm ||
          p.endAm !== x.endAm ||
          p.rowId !== x.rowId
        ) {
          save("entries", p);
          const member = withMember(data, p.siteId, p.rowId);
          if (member) save("sites", member);
        }
      }
    } else {
      const a = data.absences.find((x) => x.id === d.id);
      if (!a) return;
      if (!d.moved) {
        setSheet({ edit: { kind: "absence", absence: a } });
        return;
      }
      const p = previewAbs(a);
      if (
        p.start !== a.start ||
        p.end !== a.end ||
        p.personId !== a.personId
      ) {
        save("absences", p);
        notify(
          `${ABSENCE[a.type].label} · ${nameOf(p.personId)}: ${fmt(p.start)} – ${fmt(p.end)}`,
        );
      }
    }
  };

  useEffect(() => {
    if (!drag) return;
    const move = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      const moved =
        d.moved ||
        Math.abs(e.clientX - d.x0) > 3 ||
        Math.abs(e.clientY - d.y0) > 3;
      let next: Drag = {
        ...d,
        moved,
        d: Math.round((e.clientX - d.x0) / (d.kind === "job" ? hw : dw)),
      };
      if (d.mode === "move") {
        const el = document
          .elementFromPoint(e.clientX, e.clientY)
          ?.closest<HTMLElement>("[data-row]");
        const row = el?.dataset.row;
        if (
          row &&
          (d.kind === "job" || data.people.some((x) => x.id === row))
        )
          next = { ...next, row };
      }
      dragRef.current = next;
      setDrag(next);
    };
    const up = () => {
      const d = dragRef.current;
      dragRef.current = null;
      if (d) commit.current(d);
      setDrag(null);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up, { once: true });
    return () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [drag !== null]);

  const begin = (
    e: React.PointerEvent,
    kind: Drag["kind"],
    id: string,
    mode: Drag["mode"],
    row: string,
  ) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    if (kind === "job" && linkFrom) {
      link(linkFrom, id);
      setLinkFrom("");
      return;
    }
    if (renaming === `j:${id}`) return;
    e.preventDefault();
    const d: Drag = {
      kind,
      id,
      mode,
      x0: e.clientX,
      y0: e.clientY,
      moved: false,
      d: 0,
      row,
      add: e.ctrlKey || e.metaKey || e.shiftKey,
    };
    dragRef.current = d;
    setDrag(d);
  };

  const inBody = (e: { clientX: number; clientY: number }) => {
    const r = bodyRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left - leftW, y: e.clientY - r.top };
  };
  const startBand = (e: React.PointerEvent) => {
    if (e.button !== 0 || e.target !== e.currentTarget) return;
    if (linkFrom) return setLinkFrom("");
    const p = inBody(e);
    let b: Band = { x0: p.x, y0: p.y, x1: p.x, y1: p.y };
    let moved = false;
    const add = e.ctrlKey || e.metaKey || e.shiftKey;
    const mv = (ev: PointerEvent) => {
      const q2 = inBody(ev);
      b = { ...b, x1: q2.x, y1: q2.y };
      if (!moved && Math.hypot(b.x1 - b.x0, b.y1 - b.y0) > 5) moved = true;
      if (moved) setBand(b);
    };
    const upH = () => {
      window.removeEventListener("pointermove", mv);
      setBand(null);
      if (!moved) return add || setSel([]);
      const [x0, x1] = [Math.min(b.x0, b.x1), Math.max(b.x0, b.x1)];
      const [y0, y1] = [Math.min(b.y0, b.y1), Math.max(b.y0, b.y1)];
      const ids = [...box.entries()]
        .filter(
          ([, r]) => r.x1 > x0 && r.x0 < x1 && r.y + LANE > y0 && r.y < y1,
        )
        .map(([id]) => id);
      setSel((cur) => (add ? [...new Set([...cur, ...ids])] : ids));
    };
    window.addEventListener("pointermove", mv);
    window.addEventListener("pointerup", upH, { once: true });
  };

  const halfAt = (e: React.MouseEvent) =>
    Math.floor(
      (e.clientX -
        (e.currentTarget as HTMLElement).getBoundingClientRect().left) /
        hw,
    );

  /* ---------------------------------------------------------------- menus */
  const colorItem = (onPick: (c: string) => void): MenuItem => ({
    label: "Neuen Zeitbalken einfügen",
    icon: <Plus size={15} />,
    colors: onPick,
  });
  const emptyMenu = (e: React.MouseEvent, it: Item) => {
    e.preventDefault();
    const half = halfAt(e);
    hover.current = { row: it.id, half };
    const picked = data.entries.filter((j) => sel.includes(j.id));
    const day = addDays(from, Math.floor(half / 2));
    // a symbol belongs to the site of the bar it sits on (company board)
    const under = scoped.find((j) => j.rowId === it.id && !j.symbol && j.start <= day && j.end >= day);
    const symbolSite = site?.id ?? under?.siteId ?? sites[0]?.id;
    const items2: MenuItem[] = [];
    if (site) items2.push(colorItem((c) => insert(it.id, half, { color: c })));
    else
      items2.push({
        label: "Neuen Zeitbalken einfügen",
        icon: <Plus size={15} />,
        list: sites.map((p) => ({
          label: p.name,
          color: p.color,
          onClick: () => insert(it.id, half, { siteId: p.id }),
        })),
      });
    if (symbolSite)
      items2.push({
        label: "Neues Symbol einfügen",
        icon: <Star size={15} />,
        icons: (ic) =>
          insert(it.id, half, {
            symbol: true,
            icon: ic,
            siteId: symbolSite,
            color: "#c2620a",
            exact: true,
          }),
      });
    if (it.emp)
      items2.push({
        label: "Abwesenheit eintragen",
        icon: <span className="g-sw abs" />,
        list: ABS_TYPES.map((k) => ({
          label: ABSENCE[k].label,
          color: ABSENCE[k].color,
          onClick: () => addAbsence(it.id, half, k),
        })),
      });
    if (clip.length)
      items2.push({
        label:
          clip.length > 1
            ? `${clip.length} Elemente einfügen`
            : "Zeitbalken/Symbol einfügen",
        icon: <Copy size={15} />,
        onClick: () => paste(it.id, half),
      });
    if (picked.length > 1) {
      items2.push({
        label: `${picked.length} Elemente kopieren`,
        icon: <Copy size={15} />,
        onClick: () => (setClip(picked), notify("Kopiert")),
      });
      items2.push({
        label: "Ausgewählte Elemente entfernen",
        icon: <Trash2 size={15} />,
        danger: true,
        onClick: () => removeJobs(picked),
      });
    }
    setMenu({ x: e.clientX, y: e.clientY, items: items2 });
  };
  const barMenu = (e: React.MouseEvent, j: Job) => {
    e.preventDefault();
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement)
      .closest<HTMLElement>(".g-lane")!
      .getBoundingClientRect();
    const half = Math.floor((e.clientX - rect.left) / hw);
    const picked =
      sel.includes(j.id) && sel.length > 1
        ? data.entries.filter((x) => sel.includes(x.id))
        : [j];
    if (!sel.includes(j.id)) setSel([j.id]);
    const linked =
      !!j.links?.length || data.entries.some((x) => x.links?.includes(j.id));
    const items2: MenuItem[] = [
      {
        label: "Neues Symbol einfügen",
        icon: <Star size={15} />,
        icons: (ic) =>
          insert(j.rowId, half, {
            symbol: true,
            icon: ic,
            siteId: j.siteId,
            color: "#c2620a",
            exact: true,
          }),
      },
      {
        label: j.comment ? "Kommentar bearbeiten" : "Kommentar einfügen",
        icon: <MessageSquare size={15} />,
        onClick: () => setNote({ id: j.id, x: e.clientX, y: e.clientY }),
      },
      ...(j.comment
        ? [
            {
              label: "Kommentar entfernen",
              icon: <X size={15} />,
              onClick: () => save("entries", { ...j, comment: "" }),
            },
          ]
        : []),
      {
        label: "Verknüpfung einfügen",
        icon: <Link2 size={15} />,
        onClick: () => (
          setLinkFrom(j.id),
          notify("Jetzt den nachfolgenden Balken anklicken")
        ),
      },
      ...(linked
        ? [
            {
              label: "Verknüpfungen entfernen",
              icon: <Unlink size={15} />,
              onClick: () => unlink(j.id),
            },
          ]
        : []),
      ...(j.symbol
        ? [
            {
              label: "Symbol ändern",
              icon: <Star size={15} />,
              icons: (ic: string) => save("entries", { ...j, icon: ic }),
            },
          ]
        : [
            {
              label: "Umbenennen (F2)",
              icon: <Pencil size={15} />,
              onClick: () => setRenaming(`j:${j.id}`),
            },
            {
              label: j.done ? "Wieder öffnen" : "Als erledigt markieren",
              icon: <Check size={15} />,
              onClick: () => save("entries", { ...j, done: !j.done }),
            },
            {
              label: "Details …",
              icon: <ChevronRight size={15} />,
              onClick: () =>
                setSheet({
                  edit: { kind: "job", job: j },
                  who: nameOf(j.rowId),
                }),
            },
          ]),
      {
        label:
          picked.length > 1
            ? `${picked.length} Elemente kopieren`
            : j.symbol
              ? "Symbol kopieren"
              : "Zeitbalken kopieren",
        icon: <Copy size={15} />,
        onClick: () => (
          setClip(picked),
          notify("Kopiert – Rechtsklick auf eine freie Stelle = einfügen")
        ),
      },
      {
        label: "Duplizieren (Strg+D)",
        icon: <Copy size={15} />,
        onClick: () => duplicate(picked),
      },
      {
        label:
          picked.length > 1
            ? "Ausgewählte Elemente entfernen"
            : j.symbol
              ? "Symbol entfernen"
              : "Zeitbalken entfernen",
        icon: <Trash2 size={15} />,
        danger: true,
        onClick: () => removeJobs(picked),
      },
    ];
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: items2,
      swatches: j.symbol
        ? undefined
        : (c) => picked.forEach((x) => save("entries", { ...x, color: c })),
    });
  };
  const absMenu = (e: React.MouseEvent, a: Absence) => {
    e.preventDefault();
    e.stopPropagation();
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        ...ABS_TYPES.map((k) => ({
          label: ABSENCE[k].label + (a.type === k ? " (aktuell)" : ""),
          icon: (
            <span className="g-sw" style={{ background: ABSENCE[k].color }} />
          ),
          onClick: () => save("absences", { ...a, type: k }),
        })),
        {
          label: "Abwesenheit löschen",
          icon: <Trash2 size={15} />,
          danger: true,
          onClick: () => (remove("absences", a.id), notify("Abwesenheit gelöscht")),
        },
      ],
    });
  };

  /* ---------------------------------------------------------------- keyboard */
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      const el = e.target instanceof HTMLElement ? e.target : null;
      if (
        el?.closest("input, textarea, select, [contenteditable]") ||
        document.querySelector(".ui-dialog-overlay, .ui-sheet-overlay")
      )
        return;
      const picked = data.entries.filter((j) => sel.includes(j.id));
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        setSel([]);
        setLinkFrom("");
        setMenu(null);
      } else if ((e.key === "Delete" || e.key === "Backspace") && picked.length) {
        e.preventDefault();
        removeJobs(picked);
      } else if (e.key === "F2" && picked.length) {
        e.preventDefault();
        setRenaming(`j:${picked[0].id}`);
      } else if (ctrl && e.key.toLowerCase() === "c" && picked.length) {
        setClip(picked);
        notify(picked.length > 1 ? `${picked.length} kopiert` : "Kopiert");
      } else if (
        ctrl &&
        e.key.toLowerCase() === "v" &&
        clip.length &&
        hover.current
      ) {
        e.preventDefault();
        paste(hover.current.row, hover.current.half);
      } else if (ctrl && e.key.toLowerCase() === "d" && picked.length) {
        e.preventDefault();
        duplicate(picked);
      } else if (
        (e.key === "ArrowLeft" || e.key === "ArrowRight") &&
        picked.length
      ) {
        e.preventDefault();
        shift(picked, (e.key === "ArrowLeft" ? -1 : 1) * (e.shiftKey ? 2 : 1));
      }
    };
    window.addEventListener("keydown", key);
    return () => window.removeEventListener("keydown", key);
  });

  /* ---------------------------------------------------------------- header */
  const months: { label: string; span: number }[] = [];
  const weeks: { label: string; span: number }[] = [];
  for (const d of dayList) {
    const m = monthLabel(d, true);
    if (months.at(-1)?.label === m) months.at(-1)!.span++;
    else months.push({ label: m, span: 1 });
    const w = String(isoWeek(d));
    if (weeks.at(-1)?.label === w && weekday(d) !== 1) weeks.at(-1)!.span++;
    else weeks.push({ label: w, span: 1 });
  }
  const dayCls = (d: ISODate) =>
    `${isWeekend(d) ? "we" : ""} ${holidayName(d) ? "hol" : ""} ${d === t ? "today" : ""}`;

  const dragged =
    drag?.moved && drag.kind === "job" ? box.get(drag.id) : undefined;
  const draggedJob =
    dragged && drag
      ? preview(data.entries.find((j) => j.id === drag.id)!)
      : undefined;

  return (
    <div
      className={`g-wrap ${linkFrom ? "linking" : ""}`}
      style={
        {
          "--dw": `${dw}px`,
          "--lw": `${leftW}px`,
          "--lane": `${LANE}px`,
        } as CSSProperties
      }
    >
      <div className="g-bar">
        <div className="g-nav">
          <button
            type="button"
            className="g-btn icon"
            onClick={() => scrollBy(-step)}
            aria-label="Zurück"
          >
            <ChevronLeft size={16} />
          </button>
          <button
            type="button"
            className="g-btn"
            onClick={() => goToday()}
          >
            Heute
          </button>
          <button
            type="button"
            className="g-btn icon"
            onClick={() => scrollBy(step)}
            aria-label="Weiter"
          >
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="g-zoom">
          {(Object.keys(ZOOMS) as Zoom[]).map((k) => (
            <button
              key={k}
              type="button"
              className={zoom === k ? "on" : ""}
              onClick={() => {
                setZoom(k);
                goToday(k);
              }}
            >
              {ZOOMS[k].label}
            </button>
          ))}
        </div>
        <div className="g-nav">
          <button
            type="button"
            className="g-btn primary"
            disabled={!items.length || !sites.length}
            onClick={() => {
              const row = items.find((it) => it.emp) ?? items[0];
              if (row) setSheet({ edit: { kind: "new", rowId: row.id, day: t, pm: false, siteId: site?.id }, who: row.name });
            }}
            title="Einsatz mit Dialog eintragen"
          >
            <Plus size={14} /> Einsatz
          </button>
        </div>
        <div className="g-nav">
          <button
            type="button"
            className="g-btn"
            onClick={addRow}
            title="Freie Zeile – z. B. Subunternehmer, Kran, Lieferung"
          >
            <Plus size={14} /> Zeile
          </button>
          <button type="button" className="g-btn" onClick={addGroup}>
            <Plus size={14} /> Gruppe
          </button>
          {site && (
            <button
              type="button"
              className="g-btn icon"
              onClick={() => setTeamEdit(true)}
              title="Team der Baustelle bearbeiten"
              aria-label="Team der Baustelle bearbeiten"
            >
              <Users size={15} />
            </button>
          )}
        </div>
        <span className="g-grow" />
        {linkFrom && (
          <span className="g-hint-link">
            <Link2 size={14} /> Nachfolgenden Balken anklicken ·{" "}
            <button type="button" onClick={() => setLinkFrom("")}>
              Abbrechen
            </button>
          </span>
        )}
        <label className="g-search">
          <Search size={14} />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={site ? "Zeile oder Einsatz …" : "Person oder Baustelle …"}
            aria-label="Suchen"
          />
        </label>
      </div>

      <div
        className="g-scroll"
        ref={scrollRef}
        onScroll={onScroll}
        onPointerDownCapture={(e) => {
          // touch has no right mouse button: a long press opens the same menu
          if (e.pointerType !== "touch") return;
          clearTimeout(longPress.current?.timer);
          const { clientX: x, clientY: y } = e;
          const target = e.target as HTMLElement;
          longPress.current = {
            x,
            y,
            timer: setTimeout(() => {
              dragRef.current = null;
              setDrag(null);
              target.dispatchEvent(
                new MouseEvent("contextmenu", {
                  bubbles: true,
                  cancelable: true,
                  clientX: x,
                  clientY: y,
                }),
              );
            }, 550),
          };
        }}
        onPointerMoveCapture={(e) => {
          const lp = longPress.current;
          if (lp && Math.hypot(e.clientX - lp.x, e.clientY - lp.y) > 8)
            clearTimeout(lp.timer);
        }}
        onPointerUpCapture={() => clearTimeout(longPress.current?.timer)}
      >
        <div className="g-inner" style={{ width: leftW + timelineW }}>
          <div className="g-head" ref={headRef}>
            <div className="g-corner">
              <span>{site ? "Team" : "Mitarbeiter"}</span>
              <span>Info</span>
              <span>Status</span>
            </div>
            <div className="g-time" style={{ width: timelineW }}>
              <div className="g-hrow months">
                {months.map((m, i) => (
                  <span key={i} style={{ width: m.span * dw }}>
                    {m.span * dw > 70 ? m.label : ""}
                  </span>
                ))}
              </div>
              <div className="g-hrow weeks">
                {weeks.map((w, i) => (
                  <span
                    key={i}
                    style={{ width: w.span * dw }}
                    title={`KW ${w.label}`}
                  >
                    {w.span * dw >= 26
                      ? `KW ${w.label}`
                      : w.span * dw >= 14
                        ? w.label
                        : ""}
                  </span>
                ))}
              </div>
              <div className="g-hrow days">
                {dayList.map((d) => (
                  <span
                    key={d}
                    className={dayCls(d)}
                    title={`${weekdayShort(d)} ${fmt(d)}${holidayName(d) ? ` · ${holidayName(d)}` : ""}`}
                  >
                    {dw >= 18 ? d.slice(8) : ""}
                    {dw >= 18 && (
                      <small>
                        {weekdayShort(d).slice(0, dw >= 30 ? 2 : 1)}
                      </small>
                    )}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div
            className="g-body"
            ref={bodyRef}
            style={{ height: Math.max(bodyH, 60) }}
          >
            <div className="g-cols" style={{ left: leftW, width: timelineW }}>
              {dayList.map((d, i) => {
                const hol = holidayName(d);
                if (!hol && !isWeekend(d) && d !== t) return null;
                return (
                  <span
                    key={d}
                    className={hol ? "hol" : d === t ? "today" : "we"}
                    style={{ left: i * dw, width: dw }}
                    title={hol}
                  />
                );
              })}
              {t >= from && t <= to && (
                <i className="g-now" style={{ left: diffDays(from, t) * dw + dw / 2 }} title={`Heute, ${fmt(t)}`} />
              )}
            </div>
            {views.length === 0 && (
              <div className="g-empty">
                {items.length
                  ? "Nichts gefunden."
                  : site
                    ? "Noch niemand auf der Baustelle – oben „Zeile“ anlegen oder das Team bearbeiten."
                    : "Noch keine Mitarbeiter – in den Einstellungen anlegen."}
              </div>
            )}

            {views.map((v) => {
              if (v.kind === "group") {
                const closed = collapsed.has(v.key);
                const toggle = () =>
                  setCollapsed((c) => {
                    const n = new Set(c);
                    if (n.has(v.key)) n.delete(v.key);
                    else n.add(v.key);
                    return n;
                  });
                return (
                  <div
                    key={`g-${v.key}`}
                    className={`g-group ${dropAt === `g:${v.key}` ? "over" : ""}`}
                    style={{ height: GROUP_H }}
                    onDragOver={(e) =>
                      dnd && (e.preventDefault(), setDropAt(`g:${v.key}`))
                    }
                    onDragLeave={() => setDropAt("")}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDropAt("");
                      if (dnd?.type === "row")
                        dropRow(dnd.id, { group: v.gid });
                      if (dnd?.type === "group") dropGroup(dnd.id, v.gid);
                      setDnd(null);
                    }}
                  >
                    <div
                      className="g-group-left"
                      draggable={!!v.gid && renaming !== `g:${v.gid}`}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", v.name);
                        setDnd({ type: "group", id: v.gid });
                      }}
                      onDragEnd={() => (setDnd(null), setDropAt(""))}
                    >
                      <button
                        type="button"
                        className="g-caret"
                        onClick={toggle}
                        aria-label={closed ? "Aufklappen" : "Zuklappen"}
                      >
                        {closed ? (
                          <ChevronRight size={13} />
                        ) : (
                          <ChevronDown size={13} />
                        )}
                      </button>
                      {renaming === `g:${v.gid}` && v.gid ? (
                        <NameInput
                          value={v.name}
                          onDone={(n) =>
                            n === null ? setRenaming("") : renameGroup(v.gid, n)
                          }
                        />
                      ) : (
                        <strong
                          onClick={toggle}
                          onDoubleClick={() =>
                            v.gid && setRenaming(`g:${v.gid}`)
                          }
                          title={
                            v.gid
                              ? "Doppelklick = umbenennen, ziehen = verschieben"
                              : undefined
                          }
                        >
                          {v.name}
                        </strong>
                      )}
                      <small>{v.count}</small>
                      {own.length > 0 && v.gid && (
                        <button
                          type="button"
                          className="g-x"
                          onClick={() => void deleteGroup(v.gid, v.name)}
                          title="Gruppe löschen"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    <div
                      className={`g-group-band ${closed && v.ids.length ? "sum" : ""}`}
                      style={{ width: timelineW }}
                      onClick={closed && v.ids.length ? toggle : undefined}
                      title={closed && v.ids.length ? "Klick = aufklappen" : undefined}
                    >
                      {closed && v.ids.length > 0 && <Load ids={v.ids} days={dayList} dw={dw} jobs={scoped} />}
                    </div>
                  </div>
                );
              }
              const { it, height } = v;
              return (
                <div
                  key={it.id}
                  className={`g-row ${drag?.moved && drag.mode === "move" && drag.row === it.id ? "drop" : ""} ${dropAt === `r:${it.id}` ? "over" : ""}`}
                  style={{ height }}
                  data-row={it.id}
                  onDragOver={(e) =>
                    dnd?.type === "row" &&
                    (e.preventDefault(), setDropAt(`r:${it.id}`))
                  }
                  onDragLeave={() => setDropAt("")}
                  onDrop={(e) => {
                    e.preventDefault();
                    setDropAt("");
                    if (dnd?.type === "row") dropRow(dnd.id, { row: it.id });
                    setDnd(null);
                  }}
                >
                  <div
                    className="g-left"
                    draggable={!renaming.endsWith(it.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", it.name);
                      setDnd({ type: "row", id: it.id });
                    }}
                    onDragEnd={() => (setDnd(null), setDropAt(""))}
                  >
                    <span className="g-name">
                      <GripVertical size={12} className="g-grip" />
                      {it.emp ? (
                        <Avatar id={it.id} size={16} />
                      ) : (
                        <span className="g-free">
                          {it.name.slice(0, 1).toUpperCase()}
                        </span>
                      )}
                      {renaming === `r:${it.id}` ? (
                        <NameInput
                          value={it.name}
                          onDone={(n) =>
                            n === null ? setRenaming("") : renameRow(it, n)
                          }
                        />
                      ) : (
                        <strong
                          title={it.name}
                          onDoubleClick={() => setRenaming(`r:${it.id}`)}
                        >
                          {it.name}
                        </strong>
                      )}
                      {!it.emp && renaming !== `r:${it.id}` && (
                        <button
                          type="button"
                          className="g-x"
                          title="Zeile löschen"
                          onClick={() => void deleteRow(it)}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </span>
                    <span className="g-info" title={it.info}>
                      {it.info}
                    </span>
                    <input
                        key={layout.rowStatus?.[it.id] ?? ""}
                        className="g-status"
                        defaultValue={layout.rowStatus?.[it.id] ?? ""}
                        placeholder="–"
                        aria-label={`Status ${it.name}`}
                        onBlur={(e) => setStatus(it.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") e.currentTarget.blur();
                          if (e.key === "Escape") {
                            e.currentTarget.value =
                              layout.rowStatus?.[it.id] ?? "";
                            e.currentTarget.blur();
                          }
                        }}
                      />
                  </div>
                  <div
                    className="g-lane"
                    style={{ width: timelineW }}
                    onPointerMove={(e) =>
                      (hover.current = { row: it.id, half: halfAt(e) })
                    }
                    onPointerDown={startBand}
                    onDoubleClick={(e) => {
                      if (e.target !== e.currentTarget) return;
                      const half = halfAt(e);
                      if (site) insert(it.id, half, {});
                      else
                        setSheet({
                          edit: {
                            kind: "new",
                            rowId: it.id,
                            day: addDays(from, Math.floor(half / 2)),
                            pm: half % 2 === 1,
                          },
                          who: it.name,
                        });
                    }}
                    onContextMenu={(e) => emptyMenu(e, it)}
                  >
                    {v.elsewhere.map((j) => {
                      const s = Math.max(0, diffDays(from, j.start));
                      const e2 = Math.min(days - 1, diffDays(from, j.end));
                      return (
                        <div
                          key={j.id}
                          className="g-elsewhere"
                          style={{ left: s * dw, width: (e2 - s + 1) * dw }}
                          title="In einem anderen Projekt eingeplant"
                        />
                      );
                    })}
                    {v.abs.map((a) => {
                      const s = Math.max(0, diffDays(from, a.start));
                      const e2 = Math.min(days - 1, diffDays(from, a.end));
                      return (
                        <div
                          key={a.id}
                          className={`g-abs ${drag?.id === a.id ? "active" : ""} ${(e2 - s + 1) * dw <= 30 ? "narrow" : ""}`}
                          style={
                            {
                              left: s * dw,
                              width: (e2 - s + 1) * dw,
                              "--c": ABSENCE[a.type].color,
                            } as CSSProperties
                          }
                          title={`${ABSENCE[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}`}
                          onPointerDown={(e) =>
                            begin(e, "abs", a.id, "move", a.personId)
                          }
                          onContextMenu={(e) => absMenu(e, a)}
                        >
                          <span>{ABSENCE[a.type].label}</span>
                          {(
                            <i
                              className="h l"
                              onPointerDown={(e) =>
                                begin(e, "abs", a.id, "start", a.personId)
                              }
                            />
                          )}
                          {(
                            <i
                              className="h r"
                              onPointerDown={(e) =>
                                begin(e, "abs", a.id, "end", a.personId)
                              }
                            />
                          )}
                        </div>
                      );
                    })}
                    {v.bars.map((j) => {
                      const { s, e: en } = halves(from, j);
                      const w = (en - s) * hw;
                      const lane = v.lane.get(j.id) ?? 0;
                      const p = site ? undefined : projectOf(j);
                      return (
                        <div
                          key={j.id}
                          className={`g-job ${w <= 30 ? "narrow" : ""} ${j.done ? "done" : ""} ${sel.includes(j.id) ? "sel" : ""} ${drag?.id === j.id ? "active" : ""} ${q && !hit(j) ? "dim" : ""} ${linkFrom === j.id ? "link-src" : ""}`}
                          style={{
                            left: s * hw,
                            width: Math.max(6, w - 1),
                            top: lane * LANE + 2,
                            background: j.color,
                            color: textOn(j.color),
                          }}
                          title={`${labelOf(j)}\n${fmt(j.start)}${j.startPm ? " (ab Mittag)" : ""} – ${fmt(j.end)}${j.endAm ? " (bis Mittag)" : ""}${j.note ? `\n${j.note}` : ""}`}
                          data-job={j.id}
                          onPointerDown={(e) =>
                            begin(e, "job", j.id, "move", j.rowId)
                          }
                          onDoubleClick={() => setRenaming(`j:${j.id}`)}
                          onContextMenu={(e) => barMenu(e, j)}
                          onMouseEnter={() => j.comment && setHoverNote(j.id)}
                          onMouseLeave={() => setHoverNote("")}
                        >
                          {renaming === `j:${j.id}` ? (
                            <NameInput
                              value={j.title}
                              onDone={(n) => {
                                setRenaming("");
                                if (n !== null && n.trim() !== j.title)
                                  save("entries", { ...j, title: n.trim() });
                              }}
                            />
                          ) : (
                            <>
                              {j.done && (
                                <span className="g-check">
                                  <Check size={9} strokeWidth={3.5} />
                                </span>
                              )}
                              <span className="g-label">
                                {p && !j.title ? p.name : labelOf(j)}
                              </span>
                              {j.comment && <i className="g-flag" />}
                              {(
                                <i
                                  className="h l"
                                  onPointerDown={(e) =>
                                    begin(e, "job", j.id, "start", j.rowId)
                                  }
                                />
                              )}
                              {(
                                <i
                                  className="h r"
                                  onPointerDown={(e) =>
                                    begin(e, "job", j.id, "end", j.rowId)
                                  }
                                />
                              )}
                            </>
                          )}
                        </div>
                      );
                    })}
                    {v.syms.map((j) => {
                      const { s } = halves(from, j);
                      return (
                        <div
                          key={j.id}
                          className={`g-sym ${sel.includes(j.id) ? "sel" : ""} ${q && !hit(j) ? "dim" : ""}`}
                          style={{
                            left: s * hw + hw / 2 - 9,
                            top: (v.lane.get(j.id) ?? 0) * LANE + 2,
                          }}
                          title={`${j.title || site?.name || projectOf(j)?.name || "Symbol"} · ${fmt(j.start)}${j.comment ? `\n${j.comment}` : ""}`}
                          onPointerDown={(e) =>
                            begin(e, "job", j.id, "move", j.rowId)
                          }
                          onContextMenu={(e) => barMenu(e, j)}
                          onMouseEnter={() => j.comment && setHoverNote(j.id)}
                          onMouseLeave={() => setHoverNote("")}
                        >
                          <Sym name={j.icon} />
                          {j.comment && <i className="g-flag" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

            {Array.from({ length: fillers }, (_, i) => (
              <div key={`f${i}`} className="g-row filler" style={{ height: LANE }}>
                <div className="g-left" onDoubleClick={addRow} title={i === 0 ? "Doppelklick = neue freie Zeile" : undefined}>
                  <span className="g-name" />
                  <span className="g-info" />
                  <span className="g-status" />
                </div>
                <div className="g-lane" style={{ width: timelineW }} onDoubleClick={addRow} />
              </div>
            ))}

            {/* links, notes, drag tips and the selection frame on top of the timeline */}
            <div
              className="g-layer"
              style={{ left: leftW, width: timelineW, height: bodyH }}
            >
              <svg width={timelineW} height={bodyH} className="g-links">
                <defs>
                  <marker
                    id="g-arrow"
                    viewBox="0 0 6 6"
                    refX="5"
                    refY="3"
                    markerWidth="6"
                    markerHeight="6"
                    orient="auto"
                  >
                    <path d="M0,0 L6,3 L0,6 z" fill="#475569" />
                  </marker>
                </defs>
                {scoped.flatMap((a) =>
                  (a.links ?? []).map((bId) => {
                    const A = box.get(a.id);
                    const B = box.get(bId);
                    if (!A || !B) return null;
                    const ay = A.y + LANE / 2;
                    const by = B.y + LANE / 2;
                    const mid = Math.max(
                      A.x1 + 6,
                      Math.min(B.x0 - 6, A.x1 + 6),
                    );
                    const d =
                      B.x0 >= A.x1 + 10
                        ? `M${A.x1},${ay} H${mid} V${by} H${B.x0 - 1}`
                        : `M${A.x1},${ay} H${A.x1 + 6} V${by > ay ? B.y - 1 : B.y + LANE + 1} H${B.x0 - 8} V${by} H${B.x0 - 1}`;
                    return (
                      <path
                        key={`${a.id}-${bId}`}
                        d={d}
                        className={
                          sel.includes(a.id) || sel.includes(bId) ? "sel" : ""
                        }
                        markerEnd="url(#g-arrow)"
                      />
                    );
                  }),
                )}
              </svg>
              {hoverNote && box.get(hoverNote) && !note && (
                <div
                  className="g-note"
                  style={{
                    left: box.get(hoverNote)!.x1 + 8,
                    top: box.get(hoverNote)!.y,
                  }}
                >
                  {data.entries.find((j) => j.id === hoverNote)?.comment}
                </div>
              )}
              {dragged && draggedJob && (
                <>
                  <div
                    className="g-tip l"
                    style={{ left: dragged.x0, top: dragged.y - 20 }}
                  >
                    {longDate(draggedJob.start, draggedJob.startPm)}
                  </div>
                  <div
                    className="g-tip r"
                    style={{ left: dragged.x1, top: dragged.y - 20 }}
                  >
                    {longDate(draggedJob.end)}
                    {draggedJob.endAm ? " (Vorm.)" : ""} ·{" "}
                    {dayCount(
                      halves(from, draggedJob).e - halves(from, draggedJob).s,
                    )}
                  </div>
                </>
              )}
              {band && (
                <div
                  className="g-band"
                  style={{
                    left: Math.min(band.x0, band.x1),
                    top: Math.min(band.y0, band.y1),
                    width: Math.abs(band.x1 - band.x0),
                    height: Math.abs(band.y1 - band.y0),
                  }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="g-legend">
        <span className="g-desk">
          Rechtsklick = Menü · Doppelklick ={" "}
          {site ? "neuer Balken / umbenennen" : "neuer Einsatz / umbenennen"} ·
          ziehen = verschieben · auf freier Fläche ziehen = mehrere
          auswählen · Entf, Strg+C/V/D, ←/→
        </span>
        <span className="g-touch">
          Lange drücken = Menü · Balken ziehen = verschieben
        </span>
        {site && (
          <span>
            <i className="g-elsewhere demo" /> auf einer anderen Baustelle
          </span>
        )}
        {ABS_TYPES.map((k) => (
          <span key={k}>
            <i className="g-sw" style={{ background: ABSENCE[k].color }} /> {ABSENCE[k].label}
          </span>
        ))}
        <span>
          <i className="g-flag demo" /> Kommentar
        </span>
      </div>

      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
      {note && (
        <NoteEditor
          job={data.entries.find((j) => j.id === note.id)}
          x={note.x}
          y={note.y}
          onDone={(text) => {
            const j = data.entries.find((x) => x.id === note.id);
            if (j && text !== null && text.trim() !== (j.comment ?? ""))
              save("entries", { ...j, comment: text.trim() });
            setNote(null);
          }}
        />
      )}
      {sheet && (
        <EntrySheet
          edit={sheet.edit}
          who={sheet.who}
          onClose={() => setSheet(null)}
        />
      )}
      {teamEdit && site && (
        <SiteDialog site={site} onClose={() => setTeamEdit(false)} />
      )}
    </div>
  );
}

/** Load of a closed group: per day how many of its people are planned (red when someone is away). */
function Load({ ids, days, dw, jobs }: { ids: string[]; days: ISODate[]; dw: number; jobs: Job[] }) {
  const { data } = useStore();
  const set = new Set(ids);
  const mine = jobs.filter((j) => !j.symbol && set.has(j.rowId));
  const away = data.absences.filter((a) => set.has(a.personId));
  return (
    <>
      {days.map((d, i) => {
        if (isWeekend(d) || holidayName(d)) return null;
        const planned = new Set(mine.filter((j) => j.start <= d && j.end >= d).map((j) => j.rowId)).size;
        const off = new Set(away.filter((a) => a.start <= d && a.end >= d).map((a) => a.personId)).size;
        const ratio = planned / Math.max(1, ids.length - off);
        return (
          <span
            key={d}
            className={`g-load ${off ? "off" : ""}`}
            style={{ left: i * dw, width: dw, "--r": Math.min(1, ratio) } as CSSProperties}
            title={`${weekdayShort(d)} ${fmt(d)}: ${planned} von ${ids.length} eingeteilt${off ? ` · ${off} abwesend` : ""}`}
          >
            {dw >= 16 ? planned : ""}
          </span>
        );
      })}
    </>
  );
}

/** Inline text field: Enter or clicking elsewhere saves, Esc cancels. */
function NameInput({
  value,
  onDone,
}: {
  value: string;
  onDone: (v: string | null) => void;
}) {
  const done = useRef(false);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  return (
    <input
      className="g-input"
      autoFocus
      defaultValue={value}
      onFocus={(e) => e.currentTarget.select()}
      onPointerDown={(e) => e.stopPropagation()}
      onBlur={(e) => finish(e.target.value)}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === "Enter") finish(e.currentTarget.value);
        if (e.key === "Escape") finish(null);
      }}
    />
  );
}

/** Yellow sticky note to write a comment; clicking elsewhere saves. */
function NoteEditor({
  job,
  x,
  y,
  onDone,
}: {
  job?: Job;
  x: number;
  y: number;
  onDone: (text: string | null) => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const done = useRef(false);
  const finish = (v: string | null) => {
    if (done.current) return;
    done.current = true;
    onDone(v);
  };
  useEffect(() => ref.current?.focus(), []);
  if (!job) return null;
  return (
    <div
      className="g-note editing"
      style={{
        left: Math.min(x + 8, window.innerWidth - 250),
        top: Math.min(y + 8, window.innerHeight - 160),
      }}
    >
      <textarea
        ref={ref}
        defaultValue={job.comment ?? ""}
        placeholder="Kommentar …"
        onBlur={(e) => finish(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") finish(null);
          if (e.key === "Enter" && (e.ctrlKey || e.metaKey))
            finish(e.currentTarget.value);
        }}
      />
    </div>
  );
}

function ContextMenu({ menu, onClose }: { menu: Menu; onClose: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  const [sub, setSub] = useState(-1);
  const [pos, setPos] = useState({ x: menu.x, y: menu.y });
  useEffect(() => {
    const el = ref.current;
    if (el)
      setPos({
        x: Math.max(
          4,
          Math.min(menu.x, window.innerWidth - el.offsetWidth - 8),
        ),
        y: Math.max(
          4,
          Math.min(menu.y, window.innerHeight - el.offsetHeight - 8),
        ),
      });
    const close = (e: Event) =>
      !ref.current?.contains(e.target as Node) && onClose();
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("pointerdown", close, true);
    window.addEventListener("keydown", esc);
    window.addEventListener("resize", onClose);
    return () => {
      window.removeEventListener("pointerdown", close, true);
      window.removeEventListener("keydown", esc);
      window.removeEventListener("resize", onClose);
    };
  }, [menu, onClose]);
  const run = (f: () => void) => {
    onClose();
    f();
  };
  return (
    <div
      className="g-menu"
      ref={ref}
      style={{ left: pos.x, top: pos.y }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {menu.items.map((m, i) => {
        const hasSub = !!(m.colors || m.icons || m.list);
        return (
          <div
            key={i}
            className="g-menu-item-wrap"
            onMouseEnter={() => setSub(hasSub ? i : -1)}
          >
            <button
              type="button"
              className={`g-menu-item ${m.danger ? "danger" : ""} ${sub === i ? "open" : ""}`}
              onClick={() =>
                hasSub
                  ? setSub(sub === i ? -1 : i)
                  : m.onClick && run(m.onClick)
              }
            >
              <span className="g-menu-ic">{m.icon}</span>
              {m.label}
              {hasSub && <ChevronRight size={13} className="g-menu-more" />}
            </button>
            {sub === i && hasSub && (
              <div className="g-sub">
                {m.colors && (
                  <div className="g-palette">
                    {PALETTE.flat().map((c) => (
                      <button
                        key={c}
                        type="button"
                        style={{ background: c }}
                        aria-label={c}
                        onClick={() => run(() => m.colors!(c))}
                      />
                    ))}
                  </div>
                )}
                {m.icons && (
                  <div className="g-icons">
                    {SYMBOL_NAMES.map((s) => (
                      <button
                        key={s}
                        type="button"
                        aria-label={s}
                        onClick={() => run(() => m.icons!(s))}
                      >
                        <Sym name={s} />
                      </button>
                    ))}
                  </div>
                )}
                {m.list?.map((l) => (
                  <button
                    key={l.label}
                    type="button"
                    className="g-menu-item"
                    onClick={() => run(l.onClick)}
                  >
                    <span className="g-menu-ic">
                      {l.color && (
                        <span
                          className="g-sw"
                          style={{ background: l.color }}
                        />
                      )}
                    </span>
                    {l.label}
                  </button>
                ))}
                {m.list?.length === 0 && (
                  <span className="g-menu-empty">Keine Baustelle</span>
                )}
              </div>
            )}
          </div>
        );
      })}
      {menu.swatches && (
        <div className="g-swatches" onMouseEnter={() => setSub(-1)}>
          <Palette size={14} />
          {[...PALETTE[0], ...PALETTE[3]]
            .map((c) => (
              <button
                key={c}
                type="button"
                style={{ background: c }}
                aria-label={`Farbe ${c}`}
                onClick={() => run(() => menu.swatches!(c))}
              />
            ))}
          <button
            type="button"
            className="g-more-colors"
            onClick={() => setSub(-2)}
            aria-label="Mehr Farben"
          >
            …
          </button>
          {sub === -2 && (
            <div className="g-sub up">
              <div className="g-palette">
                {PALETTE.flat().map((c) => (
                  <button
                    key={c}
                    type="button"
                    style={{ background: c }}
                    aria-label={c}
                    onClick={() => run(() => menu.swatches!(c))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

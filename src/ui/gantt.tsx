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
  UserPlus,
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
import { InviteDialog } from "@/components/invite";
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
} from "@/lib/date";
import { projectTeam, uid, useStore } from "@/lib/store";
import type {
  Absence,
  AbsenceType,
  Employee,
  ISODate,
  Job,
  PlanLayout,
  Project,
} from "@/lib/types";
import {
  ABSENCE,
  activePeople,
  canPlan,
  canRemove,
  ROLLE_LABEL,
  ROLLEN,
  rolleOf,
  scopedPeople,
  canEditSites,
  visibleSites,
} from "./access";
import { ledSites, levelView } from "@/lib/roles";
import { Face } from "./kit";
import { PlanSheet, withMember, type PlanEdit } from "./plan-sheet";

/** Palette in the layout of classic planning boards: 6 rows × 5 columns. */
export const PALETTE = [
  ["#808033", "#7a9a8a", "#2e75b6", "#7f6252", "#707070"],
  ["#bfcb2c", "#8fbfa6", "#5fb3d9", "#b07d5e", "#a0a0a0"],
  ["#e8f55a", "#c6e0a3", "#a9c8f7", "#dfb398", "#d4d4d4"],
  ["#735a97", "#b03a50", "#d91414", "#de7a25", "#fbd02e"],
  ["#b673b8", "#c07070", "#ff3b30", "#ff8a1e", "#fff31a"],
  ["#f5a0cf", "#e6a8ac", "#f47070", "#ffa726", "#faf59a"],
];

/** Symbols like on classic planning boards. */
export const SYMBOLS = [
  "❌",
  "✅",
  "➕",
  "❓",
  "❗",
  "⛔",
  "♦️",
  "⚠️",
  "🕒",
  "💬",
  "ℹ️",
  "🧮",
  "👷",
  "👨‍🔧",
  "👥",
  "📖",
  "🔔",
  "⬇️",
  "💶",
  "🔻",
  "💎",
  "🔷",
  "🔶",
  "🔒",
  "📞",
  "💡",
  "🔧",
  "🚚",
  "🔑",
  "✉️",
  "⏰",
  "⭐",
  "⚙️",
  "📦",
  "🔍",
  "📅",
  "⏳",
  "📊",
  "✏️",
  "☀️",
  "☁️",
  "🚩",
  "🏁",
  "🚧",
  "➡️",
  "✔️",
  "🔴",
  "🟠",
  "🟡",
  "🟢",
  "🔵",
  "🟣",
  "🏗️",
  "🔌",
  "⚡",
  "🧯",
  "🪜",
  "📐",
  "📸",
  "🙂",
];

/** Readable text colour on a given background. */
export function textOn(hex: string) {
  const n = parseInt(hex.replace("#", "").padEnd(6, "0").slice(0, 6), 16);
  return 0.299 * ((n >> 16) & 255) +
    0.587 * ((n >> 8) & 255) +
    0.114 * (n & 255) >
    160
    ? "#1f2937"
    : "#ffffff";
}

const ZOOMS = {
  tag: { label: "Tag", dw: 36, days: 42, step: 7 },
  woche: { label: "Woche", dw: 20, days: 98, step: 14 },
  monat: { label: "Monat", dw: 9, days: 182, step: 28 },
  quartal: { label: "Quartal", dw: 4, days: 364, step: 56 },
} as const;
type Zoom = keyof typeof ZOOMS;

const LANE = 22;
const GROUP_H = 22;
const ABS_TYPES: AbsenceType[] = ["urlaub", "za", "krank", "schulung"];
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

export type Scope = { kind: "site"; project: Project } | { kind: "company" };

type Item = {
  id: string;
  name: string;
  info: string;
  auto: string;
  emp?: Employee;
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
 * Planning board in the style of classic construction schedules:
 * rows with name / info / status, coloured bars in half days, symbols, sticky-note comments and links.
 * Click = select · drag = move / resize · drag on empty space = select several · double click = rename or new bar ·
 * right click = menu · Del, F2, Ctrl+C / V / D and the arrow keys work on the selection.
 */
export function Gantt({ scope }: { scope: Scope }) {
  const { data, save, remove, setCompany, notify } = useStore();
  const t = today();
  const site =
    scope.kind === "site"
      ? (data.projects.find((p) => p.id === scope.project.id) ?? scope.project)
      : null;
  const layout: PlanLayout = site ?? data.company.plan ?? {};
  const saveLayout = (patch: Partial<PlanLayout>, activity?: string) => {
    if (site) save("projects", { ...site, ...patch }, activity);
    else setCompany({ ...data.company, plan: { ...layout, ...patch } });
  };
  const edit = canPlan(data) || (!!site && canEditSites(data));
  const sites = visibleSites(data);

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
  const [siteFilter, setSiteFilter] = useState("");
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
  const [inviting, setInviting] = useState(false);
  const [dnd, setDnd] = useState<{ type: "row" | "group"; id: string } | null>(
    null,
  );
  const [dropAt, setDropAt] = useState("");
  const [narrow, setNarrow] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const hover = useRef<{ row: string; half: number } | null>(null);
  const longPress = useRef<{
    x: number;
    y: number;
    timer: ReturnType<typeof setTimeout>;
  } | null>(null);

  useEffect(() => {
    const fit = () => setNarrow(window.innerWidth < 760);
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, []);
  const leftW = narrow ? 118 : 300;

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
  const freeRows = layout.planRows ?? [];
  const people = site ? projectTeam(data, site) : scopedPeople(data);
  // company board follows the organisation chart: top down, every leader's people as one group
  const orgRank = new Map<string, number>();
  if (!site) {
    const byRole = (a: Employee, b: Employee) => ROLLEN.indexOf(rolleOf(a)) - ROLLEN.indexOf(rolleOf(b)) || a.name.localeCompare(b.name, "de");
    const ids = new Set(people.map((e) => e.id));
    const queue = people.filter((e) => !e.managerId || !ids.has(e.managerId)).sort(byRole);
    while (queue.length) {
      const e = queue.shift()!;
      orgRank.set(e.id, orgRank.size);
      queue.push(...people.filter((x) => x.managerId === e.id).sort(byRole));
    }
  }
  // leaders see their own level in detail, every branch below as one line (opened on click)
  const lv = site ? null : levelView(data);
  const branchName = (head: Employee) => `${rolleOf(head) === "bereichsleiter" ? "Bereich" : "Team"} ${head.name}`;
  const branchOf = new Map<string, string>();
  for (const b of lv?.branches ?? []) for (const id of b.members) branchOf.set(id, branchName(b.head));
  const extraIds = new Set(lv?.extra ?? []);
  const ledIds = new Set(lv ? ledSites(data).map((p) => p.id) : []);
  const teamName = (e: Employee) => {
    if (lv) {
      if (e.id === lv.me || lv.direct.includes(e.id)) return "Meine Ebene";
      if (branchOf.has(e.id)) return branchOf.get(e.id)!;
      if (extraIds.has(e.id)) return "Auf meinen Baustellen";
    }
    const boss = people.find((x) => x.id === e.managerId);
    return boss ? `Team ${boss.name}` : "Leitung";
  };
  const branchKeys = (lv?.branches ?? []).map((b) => `auto:${branchName(b.head)}`);
  const branchKeyStr = branchKeys.join("|");
  useEffect(() => {
    if (branchKeyStr) setCollapsed(new Set(branchKeyStr.split("|")));
  }, [branchKeyStr]);
  const order = layout.rowOrder ?? [];
  const pos = (id: string) => (order.includes(id) ? order.indexOf(id) : 1e6);
  const items: Item[] = (
    [
      ...people.map((e) => ({
        id: e.id,
        name: e.name,
        info: ROLLE_LABEL[rolleOf(e)],
        auto: site ? e.team || "Team" : teamName(e),
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
    .sort(
      (a, b) =>
        pos(a.it.id) - pos(b.it.id) ||
        (site
          ? 0
          : (orgRank.get(a.it.id) ?? 1e5) - (orgRank.get(b.it.id) ?? 1e5)) ||
        a.i - b.i,
    )
    .map((x) => x.it);
  // own groups only on a site plan; the company board always follows the organisation chart
  const own = site ? (layout.groups ?? []) : [];
  const autoNames = site
    ? [...new Set(items.map((it) => it.auto))]
    : lv
      ? ["Meine Ebene", ...(lv.branches ?? []).map((b) => branchName(b.head)), "Auf meinen Baustellen", "Weitere"]
      : [...new Set([...items.filter((it) => it.emp).map((it) => it.auto), "Weitere"])];
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
    data.employees.find((e) => e.id === rowId)?.name ??
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
      .map((g) => ({ id: uid("g"), name: g.name, from: g.id }));
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
    saveLayout({
      groups: gs,
      memberGroup: { ...mg, [rowId]: gid },
      rowOrder: ids,
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
    const id = uid("r");
    saveLayout(
      { planRows: [...freeRows, { id, name: "Neue Zeile" }] },
      "Zeile im Plan angelegt",
    );
    setRenaming(`r:${id}`);
  };
  const addGroup = () => {
    const { gs, mg } = ensureOwn();
    const id = uid("g");
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
    if (it.emp) save("employees", { ...it.emp, name: n });
    else
      saveLayout({
        planRows: freeRows.map((r) => (r.id === it.id ? { ...r, name: n } : r)),
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
  const deleteRow = (it: Item) => {
    const bars = data.jobs.filter((j) => j.employeeId === it.id);
    if (
      !window.confirm(
        `Zeile „${it.name}“${bars.length ? ` mit ${bars.length} Balken` : ""} löschen?`,
      )
    )
      return;
    bars.forEach((j) => remove("jobs", j.id));
    saveLayout(
      { planRows: freeRows.filter((r) => r.id !== it.id) },
      `Zeile „${it.name}“ gelöscht`,
    );
  };
  const deleteGroup = (gid: string, name: string) => {
    if (
      !window.confirm(
        `Gruppe „${name}“ löschen? Die Zeilen bleiben (ohne Gruppe).`,
      )
    )
      return;
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
  const scoped = data.jobs.filter((j) =>
    site
      ? j.projectId === site.id
      : (!siteFilter || j.projectId === siteFilter) &&
        // people from outside my branch: only their work on my sites
        (!extraIds.has(j.employeeId) || ledIds.has(j.projectId)),
  );
  const q = query.trim().toLowerCase();
  const projectOf = (j: Job) => data.projects.find((p) => p.id === j.projectId);
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
      employeeId: j.id === d.id && !group ? d.row : j.employeeId,
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
        employeeId: d.row,
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
      (!q ||
        it.name.toLowerCase().includes(q) ||
        scoped.some((j) => j.employeeId === it.id && hit(j))) &&
      (!siteFilter || site || scoped.some((j) => j.employeeId === it.id)),
  );
  const views: RowView[] = [];
  const box = new Map<
    string,
    { x0: number; x1: number; y: number; row: string }
  >();
  let top = 0;
  for (const g of groups) {
    const members = shown.filter((it) => groupOf(it) === g.id);
    if (!members.length && (!own.length || !g.id || q || siteFilter)) continue;
    const key = g.id || "none";
    views.push({
      kind: "group",
      key,
      gid: g.id,
      name: g.name,
      count: members.length,
      // a collapsed branch shows its load per day
      ids: lv && g.id.startsWith("auto:") && branchKeys.includes(g.id) ? members.filter((m) => m.emp).map((m) => m.id) : [],
      top,
    });
    top += GROUP_H;
    if (collapsed.has(key)) continue;
    for (const it of members) {
      const list = scoped
        .map(preview)
        .filter((j) => j.employeeId === it.id && j.end >= from && j.start <= to)
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
              (a) => a.employeeId === it.id && a.end >= from && a.start <= to,
            )
        : [];
      const elsewhere =
        site && it.emp
          ? data.jobs.filter(
              (j) =>
                j.employeeId === it.id &&
                j.projectId !== site.id &&
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
  const bodyH = top;

  /* ---------------------------------------------------------------- actions */
  const insert = (
    row: string,
    half: number,
    opts: {
      color?: string;
      projectId?: string;
      symbol?: boolean;
      icon?: string;
      exact?: boolean;
    },
  ) => {
    const projectId = site?.id ?? opts.projectId ?? "";
    const p = data.projects.find((x) => x.id === projectId);
    if (!p) return;
    const s = opts.exact ? half : Math.floor(half / 2) * 2;
    const id = uid("j");
    save(
      "jobs",
      {
        id,
        projectId,
        employeeId: row,
        title: opts.symbol ? "" : site ? "Neue Aufgabe" : "",
        color: opts.color ?? p.color,
        ...fromHalves(from, s, s + (opts.symbol && opts.exact ? 1 : 2)),
        nodeId: "",
        note: "",
        done: false,
        symbol: opts.symbol,
        icon: opts.icon,
      },
      opts.symbol ? "Symbol eingefügt" : `Zeitbalken eingefügt: ${nameOf(row)}`,
    );
    const member = withMember(data, projectId, row);
    if (member) save("projects", member);
    if (!opts.symbol && site) setRenaming(`j:${id}`);
    setSel([id]);
  };
  const addAbsence = (row: string, half: number, type: AbsenceType) => {
    const day = addDays(from, Math.floor(half / 2));
    save(
      "absences",
      { id: uid("ab"), employeeId: row, type, start: day, end: day, note: "" },
      `${ABSENCE[type].label}: ${nameOf(row)} ${fmt(day)}`,
    );
    notify(`${ABSENCE[type].label} eingetragen – Enden ziehen = länger`);
  };
  const removeJobs = (list: Job[]) => {
    if (!canRemove(data) || !list.length) return;
    const ids = new Set(list.map((j) => j.id));
    list.forEach((j) =>
      remove(
        "jobs",
        j.id,
        j.symbol ? "Symbol gelöscht" : `Zeitbalken „${labelOf(j)}“ gelöscht`,
      ),
    );
    // links pointing at removed bars go too
    data.jobs
      .filter((j) => !ids.has(j.id) && j.links?.some((l) => ids.has(l)))
      .forEach((j) =>
        save("jobs", { ...j, links: j.links!.filter((l) => !ids.has(l)) }),
      );
    setSel([]);
    notify(list.length > 1 ? `${list.length} Elemente entfernt` : "Entfernt");
  };
  const paste = (row: string, half: number) => {
    if (!clip.length) return;
    const first = Math.min(...clip.map((j) => halves(from, j).s));
    const ids: string[] = [];
    for (const j of clip) {
      const { s, e } = halves(from, j);
      const id = uid("j");
      ids.push(id);
      save("jobs", {
        ...j,
        id,
        links: [],
        employeeId: clip.length === 1 ? row : j.employeeId,
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
      const id = uid("j");
      ids.push(id);
      save("jobs", {
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
      save("jobs", {
        ...j,
        ...fromHalves(from, halves(from, j).s + n, halves(from, j).e + n),
      }),
    );
  const link = (fromId: string, toId: string) => {
    const a = data.jobs.find((j) => j.id === fromId);
    if (!a || fromId === toId || a.links?.includes(toId)) return;
    save("jobs", { ...a, links: [...(a.links ?? []), toId] });
    notify("Verknüpft");
  };
  const unlink = (id: string) => {
    for (const j of data.jobs) {
      if (j.id === id && j.links?.length) save("jobs", { ...j, links: [] });
      else if (j.links?.includes(id))
        save("jobs", { ...j, links: j.links.filter((l) => l !== id) });
    }
  };

  /* ---------------------------------------------------------------- pointer: drag bars, frame selection */
  const commit = useRef<(d: Drag) => void>(() => {});
  commit.current = (d) => {
    if (d.kind === "job") {
      const j = data.jobs.find((x) => x.id === d.id);
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
        ? data.jobs.filter((y) => sel.includes(y.id))
        : [j]) {
        const p = preview(x);
        if (
          p.start !== x.start ||
          p.end !== x.end ||
          p.startPm !== x.startPm ||
          p.endAm !== x.endAm ||
          p.employeeId !== x.employeeId
        ) {
          save("jobs", p);
          const member = withMember(data, p.projectId, p.employeeId);
          if (member) save("projects", member);
        }
      }
    } else {
      const a = data.absences.find((x) => x.id === d.id);
      if (!a) return;
      if (!d.moved) {
        if (edit) setSheet({ edit: { kind: "absence", absence: a } });
        return;
      }
      const p = previewAbs(a);
      if (
        p.start !== a.start ||
        p.end !== a.end ||
        p.employeeId !== a.employeeId
      ) {
        save("absences", p);
        notify(
          `${ABSENCE[a.type].label} · ${nameOf(p.employeeId)}: ${fmt(p.start)} – ${fmt(p.end)}`,
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
          (d.kind === "job" || data.employees.some((x) => x.id === row))
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
    if (!edit) {
      if (kind === "job") setSel([id]);
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
    const picked = data.jobs.filter((j) => sel.includes(j.id));
    const items2: MenuItem[] = [];
    if (edit) {
      if (site)
        items2.push(colorItem((c) => insert(it.id, half, { color: c })));
      else
        items2.push({
          label: "Neuen Zeitbalken einfügen",
          icon: <Plus size={15} />,
          list: sites.map((p) => ({
            label: p.name,
            color: p.color,
            onClick: () => insert(it.id, half, { projectId: p.id }),
          })),
        });
      items2.push({
        label: "Neues Symbol einfügen",
        icon: <Star size={15} />,
        icons: (ic) =>
          site
            ? insert(it.id, half, {
                symbol: true,
                icon: ic,
                color: "#f59e0b",
                exact: true,
              })
            : sites[0] &&
              insert(it.id, half, {
                symbol: true,
                icon: ic,
                projectId: siteFilter || sites[0].id,
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
        if (canRemove(data))
          items2.push({
            label: "Ausgewählte Elemente entfernen",
            icon: <Trash2 size={15} />,
            danger: true,
            onClick: () => removeJobs(picked),
          });
      }
    }
    if (items2.length) setMenu({ x: e.clientX, y: e.clientY, items: items2 });
  };
  const barMenu = (e: React.MouseEvent, j: Job) => {
    e.preventDefault();
    e.stopPropagation();
    if (!edit) return;
    const rect = (e.currentTarget as HTMLElement)
      .closest<HTMLElement>(".g-lane")!
      .getBoundingClientRect();
    const half = Math.floor((e.clientX - rect.left) / hw);
    const picked =
      sel.includes(j.id) && sel.length > 1
        ? data.jobs.filter((x) => sel.includes(x.id))
        : [j];
    if (!sel.includes(j.id)) setSel([j.id]);
    const linked =
      !!j.links?.length || data.jobs.some((x) => x.links?.includes(j.id));
    const items2: MenuItem[] = [
      {
        label: "Neues Symbol einfügen",
        icon: <Star size={15} />,
        icons: (ic) =>
          insert(j.employeeId, half, {
            symbol: true,
            icon: ic,
            projectId: j.projectId,
            color: "#f59e0b",
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
              onClick: () => save("jobs", { ...j, comment: "" }),
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
              icons: (ic: string) => save("jobs", { ...j, icon: ic }),
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
              onClick: () => save("jobs", { ...j, done: !j.done }),
            },
            {
              label: "Details …",
              icon: <ChevronRight size={15} />,
              onClick: () =>
                setSheet({
                  edit: { kind: "job", job: j },
                  who: nameOf(j.employeeId),
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
      ...(canRemove(data)
        ? [
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
          ]
        : []),
    ];
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: items2,
      swatches: j.symbol
        ? undefined
        : (c) => picked.forEach((x) => save("jobs", { ...x, color: c })),
    });
  };
  const absMenu = (e: React.MouseEvent, a: Absence) => {
    e.preventDefault();
    e.stopPropagation();
    if (!edit) return;
    setMenu({
      x: e.clientX,
      y: e.clientY,
      items: [
        ...ABS_TYPES.map((k) => ({
          label: ABSENCE[k].label + (a.type === k ? " ✓" : ""),
          icon: (
            <span className="g-sw" style={{ background: ABSENCE[k].color }} />
          ),
          onClick: () => save("absences", { ...a, type: k }),
        })),
        {
          label: "Abwesenheit löschen",
          icon: <Trash2 size={15} />,
          danger: true,
          onClick: () => remove("absences", a.id, "Abwesenheit gelöscht"),
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
        document.querySelector(".v-sheet, .modal")
      )
        return;
      const picked = data.jobs.filter((j) => sel.includes(j.id));
      const ctrl = e.ctrlKey || e.metaKey;
      if (e.key === "Escape") {
        setSel([]);
        setLinkFrom("");
        setMenu(null);
      } else if (!edit) return;
      else if ((e.key === "Delete" || e.key === "Backspace") && picked.length) {
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
      ? preview(data.jobs.find((j) => j.id === drag.id)!)
      : undefined;

  return (
    <div
      className={`g-wrap ${edit ? "" : "ro"} ${linkFrom ? "linking" : ""}`}
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
        {edit && (
          <div className="g-nav">
            <button
              type="button"
              className="g-btn"
              onClick={addRow}
              title="Freie Zeile – z. B. Subunternehmer, Kran, Lieferung"
            >
              <Plus size={14} /> Zeile
            </button>
            {site && (
              <button type="button" className="g-btn" onClick={addGroup}>
                <Plus size={14} /> Gruppe
              </button>
            )}
            {site && (
              <button
                type="button"
                className="g-btn icon"
                onClick={() => setInviting(true)}
                title="Leute ins Projekt holen"
              >
                <UserPlus size={15} />
              </button>
            )}
          </div>
        )}
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
            placeholder={site ? "Suchen…" : "Person oder Baustelle…"}
            aria-label="Suchen"
          />
        </label>
        {!site && (
          <select
            className="g-select"
            value={siteFilter}
            onChange={(e) => setSiteFilter(e.target.value)}
            aria-label="Baustelle"
          >
            <option value="">Alle Baustellen</option>
            {sites.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        )}
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
          <div className="g-head">
            <div className="g-corner">
              <span>{site ? "Zeile" : "Mitarbeiter"}</span>
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
            </div>
            {views.length === 0 && (
              <div className="g-empty">
                {items.length
                  ? "Nichts gefunden."
                  : site
                    ? "Noch niemand im Projekt – oben „+ Zeile“ oder Leute einladen."
                    : "Noch keine Mitarbeiter."}
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
                      draggable={edit && !!site && !!v.gid && renaming !== `g:${v.gid}`}
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
                            edit && v.gid && setRenaming(`g:${v.gid}`)
                          }
                          title={
                            edit && v.gid
                              ? "Doppelklick = umbenennen, ziehen = verschieben"
                              : undefined
                          }
                        >
                          {v.name}
                        </strong>
                      )}
                      <small>{v.count}</small>
                      {edit && own.length > 0 && v.gid && (
                        <button
                          type="button"
                          className="g-x"
                          onClick={() => deleteGroup(v.gid, v.name)}
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
                    draggable={edit && !!site && !renaming.endsWith(it.id)}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = "move";
                      e.dataTransfer.setData("text/plain", it.name);
                      setDnd({ type: "row", id: it.id });
                    }}
                    onDragEnd={() => (setDnd(null), setDropAt(""))}
                  >
                    <span className="g-name">
                      {edit && <GripVertical size={12} className="g-grip" />}
                      {it.emp ? (
                        <Face id={it.id} size={16} />
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
                          onDoubleClick={() =>
                            edit && setRenaming(`r:${it.id}`)
                          }
                        >
                          {it.name}
                        </strong>
                      )}
                      {edit && !it.emp && renaming !== `r:${it.id}` && (
                        <button
                          type="button"
                          className="g-x"
                          title="Zeile löschen"
                          onClick={() => deleteRow(it)}
                        >
                          <Trash2 size={11} />
                        </button>
                      )}
                    </span>
                    <span className="g-info" title={it.info}>
                      {it.info}
                    </span>
                    {edit ? (
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
                    ) : (
                      <span className="g-status">
                        {layout.rowStatus?.[it.id]}
                      </span>
                    )}
                  </div>
                  <div
                    className="g-lane"
                    style={{ width: timelineW }}
                    onPointerMove={(e) =>
                      (hover.current = { row: it.id, half: halfAt(e) })
                    }
                    onPointerDown={startBand}
                    onDoubleClick={(e) => {
                      if (e.target !== e.currentTarget || !edit) return;
                      const half = halfAt(e);
                      if (site) insert(it.id, half, {});
                      else
                        setSheet({
                          edit: {
                            kind: "new",
                            employeeId: it.id,
                            day: addDays(from, Math.floor(half / 2)),
                            pm: half % 2 === 1,
                            projectId: siteFilter || undefined,
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
                          title="Auf einer anderen Baustelle eingeplant"
                        />
                      );
                    })}
                    {v.abs.map((a) => {
                      const s = Math.max(0, diffDays(from, a.start));
                      const e2 = Math.min(days - 1, diffDays(from, a.end));
                      return (
                        <div
                          key={a.id}
                          className={`g-abs ${drag?.id === a.id ? "active" : ""}`}
                          style={
                            {
                              left: s * dw,
                              width: (e2 - s + 1) * dw,
                              "--c": ABSENCE[a.type].color,
                            } as CSSProperties
                          }
                          title={`${ABSENCE[a.type].label} ${fmt(a.start)} – ${fmt(a.end)}`}
                          onPointerDown={(e) =>
                            begin(e, "abs", a.id, "move", a.employeeId)
                          }
                          onContextMenu={(e) => absMenu(e, a)}
                        >
                          <span>{ABSENCE[a.type].label}</span>
                          {edit && (e2 - s + 1) * dw > 30 && (
                            <i
                              className="h l"
                              onPointerDown={(e) =>
                                begin(e, "abs", a.id, "start", a.employeeId)
                              }
                            />
                          )}
                          {edit && (e2 - s + 1) * dw > 30 && (
                            <i
                              className="h r"
                              onPointerDown={(e) =>
                                begin(e, "abs", a.id, "end", a.employeeId)
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
                          className={`g-job ${j.done ? "done" : ""} ${sel.includes(j.id) ? "sel" : ""} ${drag?.id === j.id ? "active" : ""} ${q && !hit(j) ? "dim" : ""} ${linkFrom === j.id ? "link-src" : ""}`}
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
                            begin(e, "job", j.id, "move", j.employeeId)
                          }
                          onDoubleClick={() => edit && setRenaming(`j:${j.id}`)}
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
                                  save("jobs", { ...j, title: n.trim() });
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
                              {edit && w > 30 && (
                                <i
                                  className="h l"
                                  onPointerDown={(e) =>
                                    begin(e, "job", j.id, "start", j.employeeId)
                                  }
                                />
                              )}
                              {edit && w > 30 && (
                                <i
                                  className="h r"
                                  onPointerDown={(e) =>
                                    begin(e, "job", j.id, "end", j.employeeId)
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
                          title={`${j.title || "Symbol"} · ${fmt(j.start)}${j.comment ? `\n${j.comment}` : ""}`}
                          onPointerDown={(e) =>
                            begin(e, "job", j.id, "move", j.employeeId)
                          }
                          onContextMenu={(e) => barMenu(e, j)}
                          onMouseEnter={() => j.comment && setHoverNote(j.id)}
                          onMouseLeave={() => setHoverNote("")}
                        >
                          {j.icon ?? "⭐"}
                          {j.comment && <i className="g-flag" />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}

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
                  {data.jobs.find((j) => j.id === hoverNote)?.comment}
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
        {edit ? (
          <>
            <span className="g-desk">
              Rechtsklick = Menü · Doppelklick ={" "}
              {site ? "neuer Balken / umbenennen" : "neuer Eintrag / umbenennen"} ·
              ziehen = verschieben · auf freier Fläche ziehen = mehrere
              auswählen · Entf, Strg+C/V/D, ←/→
            </span>
            <span className="g-touch">
              Lange drücken = Menü · Balken ziehen = verschieben
            </span>
          </>
        ) : (
          <span>Nur ansehen – planen können Admin, Bereichs- und Teamleitung und Koordination.</span>
        )}
        {site && (
          <span>
            <i className="g-elsewhere demo" /> auf einer anderen Baustelle
          </span>
        )}
        <span>
          <i className="g-flag demo" /> Kommentar
        </span>
      </div>

      {menu && <ContextMenu menu={menu} onClose={() => setMenu(null)} />}
      {note && (
        <NoteEditor
          job={data.jobs.find((j) => j.id === note.id)}
          x={note.x}
          y={note.y}
          onDone={(text) => {
            const j = data.jobs.find((x) => x.id === note.id);
            if (j && text !== null && text.trim() !== (j.comment ?? ""))
              save("jobs", { ...j, comment: text.trim() }, "Kommentar im Plan");
            setNote(null);
          }}
        />
      )}
      {sheet && (
        <PlanSheet
          edit={sheet.edit}
          who={sheet.who}
          onClose={() => setSheet(null)}
        />
      )}
      {inviting && site && (
        <InviteDialog project={site} onClose={() => setInviting(false)} />
      )}
    </div>
  );
}

/** Load of a closed branch: per day how many of its people are planned (red when someone is away). */
function Load({ ids, days, dw, jobs }: { ids: string[]; days: ISODate[]; dw: number; jobs: Job[] }) {
  const { data } = useStore();
  const set = new Set(ids);
  const mine = jobs.filter((j) => !j.symbol && set.has(j.employeeId));
  const away = data.absences.filter((a) => set.has(a.employeeId));
  return (
    <>
      {days.map((d, i) => {
        if (isWeekend(d) || holidayName(d)) return null;
        const planned = new Set(mine.filter((j) => j.start <= d && j.end >= d).map((j) => j.employeeId)).size;
        const off = new Set(away.filter((a) => a.start <= d && a.end >= d).map((a) => a.employeeId)).size;
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
                    {SYMBOLS.map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => run(() => m.icons!(s))}
                      >
                        {s}
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

"use client";

import { CheckSquare, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { BlurInput, BlurTextarea, Due, Empty, Field, Modal, PageHead, PersonOptions, Prio, Seg, SidePanel, SortHead, useConfirm, Who } from "@/components/app/kit";
import { Button, Checkbox, Input, Select, Textarea } from "@/components/ui";
import { addDays, today } from "@/lib/date";
import { dueState, fmtDateTime } from "@/lib/format";
import { PRIO_RANK, PRIORITIES, PRIORITY, WORK_STATUS, WORK_STATUSES } from "@/lib/labels";
import { activeSites, inSite, now, personName, siteName, uid, useStore } from "@/lib/store/store";
import type { Priority, Task, WorkStatus } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { cn } from "@/lib/utils";

type Mode = "meine" | "zugewiesen" | "alle";
type When = "" | "ueberfaellig" | "heute" | "woche" | "ohne";
type SortKey = "due" | "title" | "priority" | "status" | "owner" | "site";

const withStatus = (t: Task, status: WorkStatus): Task => ({ ...t, status, doneAt: status === "erledigt" ? now() : undefined });

/** Own tasks, tasks given to others, all tasks – filtered by status and due date. */
export function Tasks() {
  const { data, save, siteId } = useStore();
  const q = useQuery();
  const who: Mode = (["meine", "zugewiesen", "alle"] as Mode[]).includes(q.get("filter") as Mode) ? (q.get("filter") as Mode) : "meine";
  const [status, setStatus] = useState<"" | "aktiv" | WorkStatus>("aktiv");
  const [when, setWhen] = useState<When>("");
  const [term, setTerm] = useState("");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: "due", dir: 1 });
  const [creating, setCreating] = useState(false);
  const [quick, setQuick] = useState("");
  const quickRef = useRef<HTMLInputElement>(null);
  const openId = q.get("aufgabe");
  const me = data.meId;
  const t = today();

  const scoped = data.tasks.filter(inSite(siteId));
  const byWho = (x: Task) => (who === "meine" ? x.ownerId === me : who === "zugewiesen" ? x.createdBy === me && x.ownerId !== me : true);
  const counts = { meine: scoped.filter((x) => x.ownerId === me && x.status !== "erledigt").length, zugewiesen: scoped.filter((x) => x.createdBy === me && x.ownerId !== me && x.status !== "erledigt").length, alle: scoped.filter((x) => x.status !== "erledigt").length };
  const term2 = term.trim().toLowerCase();

  const rows = useMemo(() => {
    const list = scoped.filter(
      (x) =>
        byWho(x) &&
        (!status || (status === "aktiv" ? x.status !== "erledigt" : x.status === status)) &&
        (!when || (when === "ohne" ? !x.due : when === "ueberfaellig" ? dueState(x.due, x.status === "erledigt") === "over" : when === "heute" ? x.due === t : !!x.due && x.due >= t && x.due <= addDays(t, 7))) &&
        (!term2 || [x.title, x.note, personName(data, x.ownerId), siteName(data, x.siteId)].join(" ").toLowerCase().includes(term2))
    );
    const val = (x: Task): string | number =>
      sort.key === "due" ? x.due || "9999" : sort.key === "priority" ? PRIO_RANK[x.priority] : sort.key === "status" ? WORK_STATUSES.indexOf(x.status) : sort.key === "owner" ? personName(data, x.ownerId).toLowerCase() || "zzz" : sort.key === "site" ? siteName(data, x.siteId).toLowerCase() || "zzz" : x.title.toLowerCase();
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * sort.dir || PRIO_RANK[a.priority] - PRIO_RANK[b.priority];
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, siteId, who, status, when, term2, sort]);

  const addQuick = () => {
    const title = quick.trim();
    if (!title) return;
    save("tasks", { id: uid(), siteId, title, note: "", ownerId: me, status: "offen", priority: "mittel", due: "", createdBy: me, createdAt: now() });
    setQuick("");
    quickRef.current?.focus();
  };

  return (
    <div className="page">
      <PageHead
        title="Aufgaben"
        sub={`${siteId ? siteName(data, siteId) : "Alle Baustellen"} · angemeldet als ${personName(data, me)}`}
        actions={
          <Button leftIcon={<Plus size={15} />} onClick={() => setCreating(true)}>
            Aufgabe anlegen
          </Button>
        }
      />
      <div className="toolbar">
        <Seg<Mode>
          label="Aufgaben von"
          value={who}
          onChange={(v) => q.set({ filter: v === "meine" ? null : v })}
          options={[
            { value: "meine", label: `Meine (${counts.meine})` },
            { value: "zugewiesen", label: `Zugewiesen (${counts.zugewiesen})` },
            { value: "alle", label: `Alle (${counts.alle})` }
          ]}
        />
        <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)} aria-label="Status" className="filter-select">
          <option value="aktiv">Offen & in Arbeit</option>
          <option value="">Alle Status</option>
          {WORK_STATUSES.map((k) => (
            <option key={k} value={k}>
              {WORK_STATUS[k].label}
            </option>
          ))}
        </Select>
        <Select value={when} onChange={(e) => setWhen(e.target.value as When)} aria-label="Fälligkeit" className="filter-select">
          <option value="">Jede Fälligkeit</option>
          <option value="ueberfaellig">Überfällig</option>
          <option value="heute">Heute fällig</option>
          <option value="woche">Nächste 7 Tage</option>
          <option value="ohne">Ohne Datum</option>
        </Select>
        <label className="search">
          <Search size={14} />
          <Input value={term} onChange={(e) => setTerm(e.target.value)} placeholder="Aufgaben durchsuchen" aria-label="Aufgaben durchsuchen" />
        </label>
        <span className="count">{rows.length} Aufgaben</span>
      </div>

      <section className="panel">
        {rows.length ? (
          <div className="table-scroll">
            <table className="ui-table">
              <thead>
                <tr>
                  <th className="ui-table-head" style={{ width: 36 }}>
                    <span className="sr-only">Erledigt</span>
                  </th>
                  <SortHead k="title" sort={sort} onSort={setSort}>
                    Aufgabe
                  </SortHead>
                  {!siteId && (
                    <SortHead k="site" sort={sort} onSort={setSort}>
                      Baustelle
                    </SortHead>
                  )}
                  <SortHead k="owner" sort={sort} onSort={setSort}>
                    {who === "meine" ? "Von" : "Zuständig"}
                  </SortHead>
                  <SortHead k="priority" sort={sort} onSort={setSort}>
                    Priorität
                  </SortHead>
                  <SortHead k="due" sort={sort} onSort={setSort}>
                    Fällig
                  </SortHead>
                  <SortHead k="status" sort={sort} onSort={setSort}>
                    Status
                  </SortHead>
                </tr>
              </thead>
              <tbody>
                {rows.map((x) => (
                  <tr key={x.id} className={cn("ui-table-row clickable", x.status === "erledigt" && "done", openId === x.id && "selected")} onClick={() => q.set({ aufgabe: x.id })}>
                    <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                      <Checkbox checked={x.status === "erledigt"} aria-label={`${x.title} erledigt`} onChange={(e) => save("tasks", withStatus(x, e.target.checked ? "erledigt" : "offen"))} />
                    </td>
                    <td className="ui-table-cell">
                      <div className="point-cell">
                        <strong className={cn(x.status === "erledigt" && "struck")}>{x.title}</strong>
                        {x.note && <small>{x.note}</small>}
                      </div>
                    </td>
                    {!siteId && <td className="ui-table-cell muted">{siteName(data, x.siteId) || "–"}</td>}
                    <td className="ui-table-cell">{who === "meine" ? x.createdBy === me ? <span className="muted">Selbst angelegt</span> : <Who id={x.createdBy} /> : <Who id={x.ownerId} empty="Niemand" />}</td>
                    <td className="ui-table-cell">
                      <Prio p={x.priority} />
                    </td>
                    <td className="ui-table-cell">
                      <Due due={x.due} done={x.status === "erledigt"} />
                    </td>
                    <td className="ui-table-cell" onClick={(e) => e.stopPropagation()}>
                      <Select className={cn("status-select", x.status)} value={x.status} aria-label="Status" onChange={(e) => save("tasks", withStatus(x, e.target.value as WorkStatus))}>
                        {WORK_STATUSES.map((k) => (
                          <option key={k} value={k}>
                            {WORK_STATUS[k].label}
                          </option>
                        ))}
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="panel-body">
            <Empty
              inline
              icon={<CheckSquare size={26} />}
              title={scoped.some(byWho) ? "Keine Aufgaben für diesen Filter" : who === "zugewiesen" ? "Niemandem etwas zugewiesen" : "Keine Aufgaben"}
              text={scoped.some(byWho) ? "Status oder Fälligkeit anpassen." : who === "zugewiesen" ? "Aufgaben, die du anderen zuweist, erscheinen hier." : "Unten eine Aufgabe eintippen oder „Aufgabe anlegen“."}
            />
          </div>
        )}
        <form
          className="quick-add"
          onSubmit={(e) => {
            e.preventDefault();
            addQuick();
          }}
        >
          <Plus size={15} className="muted" />
          <Input ref={quickRef} value={quick} onChange={(e) => setQuick(e.target.value)} placeholder={`Neue Aufgabe für mich${siteId ? ` (${siteName(data, siteId)})` : ""} – Enter speichert`} aria-label="Neue Aufgabe" />
        </form>
      </section>
      {creating && <NewTask onClose={() => setCreating(false)} onCreated={(id) => (setCreating(false), q.set({ aufgabe: id }))} />}
      {openId && <TaskPanel id={openId} onClose={() => q.set({ aufgabe: null })} />}
    </div>
  );
}

function NewTask({ onClose, onCreated }: { onClose: () => void; onCreated: (id: string) => void }) {
  const { data, save, siteId, notify } = useStore();
  const [x, setX] = useState<Task>({ id: uid(), siteId, title: "", note: "", ownerId: data.meId, status: "offen", priority: "mittel", due: "", createdBy: data.meId, createdAt: now() });
  const [tried, setTried] = useState(false);
  const set = (patch: Partial<Task>) => setX((v) => ({ ...v, ...patch }));
  const err = !x.title.trim() ? "Bitte eine Aufgabe eingeben" : "";
  const submit = () => {
    setTried(true);
    if (err) return;
    save("tasks", { ...x, title: x.title.trim(), note: x.note.trim() });
    notify(x.ownerId === data.meId ? "Aufgabe angelegt" : `Aufgabe an ${personName(data, x.ownerId) || "–"} zugewiesen`);
    onCreated(x.id);
  };
  return (
    <Modal
      title="Neue Aufgabe"
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit">Anlegen</Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Aufgabe" className="span-2" error={tried ? err : ""}>
          <Input value={x.title} onChange={(e) => set({ title: e.target.value })} autoFocus />
        </Field>
        <Field label="Baustelle">
          <Select value={x.siteId} onChange={(e) => set({ siteId: e.target.value })}>
            <option value="">Ohne Baustelle</option>
            {activeSites(data).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Zuständig">
          <Select value={x.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            <PersonOptions none={false} />
          </Select>
        </Field>
        <Field label="Priorität">
          <Select value={x.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
            {PRIORITIES.map((k) => (
              <option key={k} value={k}>
                {PRIORITY[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Fällig am">
          <Input type="date" value={x.due} onChange={(e) => set({ due: e.target.value })} />
        </Field>
        <Field label="Notiz" className="span-2">
          <Textarea value={x.note} onChange={(e) => set({ note: e.target.value })} rows={3} />
        </Field>
      </div>
    </Modal>
  );
}

function TaskPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, save, remove, notify, restore } = useStore();
  const ask = useConfirm();
  const x = data.tasks.find((y) => y.id === id);
  if (!x) return null;
  const set = (patch: Partial<Task>) => save("tasks", { ...x, ...patch });
  const drop = async () => {
    if (!(await ask({ title: "Aufgabe löschen?" }))) return;
    const before = data;
    remove("tasks", x.id);
    onClose();
    notify("Aufgabe gelöscht", { undo: () => restore(before) });
  };
  return (
    <SidePanel
      title="Aufgabe"
      sub={siteName(data, x.siteId) || "Ohne Baustelle"}
      onClose={onClose}
      footer={
        <>
          <Button variant="destructive" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
            Löschen
          </Button>
          <span className="grow" />
          <Button size="sm" onClick={onClose}>
            Fertig
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Aufgabe" className="span-2">
          <BlurInput value={x.title} onSave={(v) => (v ? set({ title: v }) : notify("Aufgabe darf nicht leer sein", { tone: "error" }))} />
        </Field>
        <Field label="Status">
          <Select value={x.status} onChange={(e) => save("tasks", withStatus(x, e.target.value as WorkStatus))}>
            {WORK_STATUSES.map((k) => (
              <option key={k} value={k}>
                {WORK_STATUS[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priorität">
          <Select value={x.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
            {PRIORITIES.map((k) => (
              <option key={k} value={k}>
                {PRIORITY[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Zuständig">
          <Select value={x.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            <PersonOptions />
          </Select>
        </Field>
        <Field label="Fällig am">
          <Input type="date" value={x.due} onChange={(e) => set({ due: e.target.value })} />
        </Field>
        <Field label="Baustelle" className="span-2">
          <Select value={x.siteId} onChange={(e) => set({ siteId: e.target.value })}>
            <option value="">Ohne Baustelle</option>
            {data.sites.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notiz" className="span-2">
          <BlurTextarea value={x.note} rows={5} onSave={(v) => set({ note: v })} />
        </Field>
        <p className="span-2 stamp muted">
          Angelegt von {personName(data, x.createdBy) || "–"}, {fmtDateTime(x.createdAt)}
          {x.doneAt && (
            <>
              <br />
              Erledigt am {fmtDateTime(x.doneAt)}
            </>
          )}
        </p>
      </div>
    </SidePanel>
  );
}

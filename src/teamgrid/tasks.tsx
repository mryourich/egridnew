"use client";

import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { addDays, today } from "@/core/date";
import { fmtShort } from "@/core/format";
import { byRole, teamOf } from "@/core/roles";
import { now, uid, useStore } from "@/core/store";
import type { Project, Task } from "@/core/types";
import { Button, Menu, PageHead, Seg } from "@/core/ui";
import { InlineName } from "./points";
import { access } from "./model";

/** Short to-dos of a project that are not part of the open points (order, call, book). */
export function Tasks({ project: p }: { project: Project }) {
  const { data, save, remove } = useStore();
  const { work, manage } = access(data, p);
  const [view, setView] = useState<"offen" | "mine" | "done">("offen");
  const [title, setTitle] = useState("");
  const [owner, setOwner] = useState(data.meId);
  const [due, setDue] = useState(addDays(today(), 2));
  const [renaming, setRenaming] = useState("");
  const t = today();
  const all = data.tasks.filter((x) => x.projectId === p.id);
  const list = all
    .filter((x) => (view === "done" ? x.done : !x.done) && (view !== "mine" || x.ownerId === data.meId))
    .sort((a, b) => (a.due || "9").localeCompare(b.due || "9") || a.title.localeCompare(b.title, "de"));
  const team = teamOf(p)
    .map((id) => data.people.find((x) => x.id === id))
    .filter((x): x is NonNullable<typeof x> => !!x && x.active)
    .sort(byRole);

  const add = () => {
    if (!title.trim()) return;
    save("tasks", { id: uid(), projectId: p.id, title: title.trim(), ownerId: owner, due, done: false, createdBy: data.meId, createdAt: now() }, `Aufgabe „${title.trim()}“ angelegt`);
    setTitle("");
  };
  const tick = (x: Task, done: boolean) => save("tasks", { ...x, done, doneAt: done ? now() : undefined }, done ? `Aufgabe „${x.title}“ erledigt` : undefined);
  const mayChange = (x: Task) => manage || x.ownerId === data.meId || x.createdBy === data.meId;

  return (
    <div className="page narrow">
      <PageHead kicker="Aufgaben" title="Aufgaben" sub="Was rund ums Projekt zu erledigen ist – bestellen, anrufen, reservieren." />

      {work && (
        <form className="panel quick-add" onSubmit={(e) => (e.preventDefault(), add())}>
          <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Neue Aufgabe, z. B. Hubarbeitsbühne reservieren" aria-label="Aufgabe" />
          <select value={owner} onChange={(e) => setOwner(e.target.value)} aria-label="Zuständig">
            <option value="">– niemand –</option>
            {team.map((x) => (
              <option key={x.id} value={x.id}>
                {x.name}
              </option>
            ))}
          </select>
          <input type="date" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Fällig" />
          <Button type="submit" variant="primary" icon={<Plus size={15} />} disabled={!title.trim()}>
            Hinzufügen
          </Button>
        </form>
      )}

      <div className="toolbar">
        <Seg
          value={view}
          onChange={setView}
          options={[
            { value: "offen", label: <>Offen <small>{all.filter((x) => !x.done).length}</small></> },
            { value: "mine", label: <>Meine <small>{all.filter((x) => !x.done && x.ownerId === data.meId).length}</small></> },
            { value: "done", label: <>Erledigt <small>{all.filter((x) => x.done).length}</small></> }
          ]}
        />
      </div>

      <div className="panel">
        {list.length === 0 ? (
          <p className="panel-empty">{view === "done" ? "Noch nichts erledigt." : "Keine offenen Aufgaben."}</p>
        ) : (
          <table className="table">
            <tbody>
              {list.map((x) => (
                <tr key={x.id} className={x.done ? "done" : ""}>
                  <td className="w-check">
                    <input type="checkbox" className="check" checked={x.done} disabled={!work || !mayChange(x)} onChange={(e) => tick(x, e.target.checked)} aria-label="Erledigt" />
                  </td>
                  <td>
                    {renaming === x.id ? (
                      <InlineName initial={x.title} onDone={(v) => (setRenaming(""), v && v !== x.title && save("tasks", { ...x, title: v }))} />
                    ) : (
                      <span className="row-title plain" onDoubleClick={() => mayChange(x) && work && setRenaming(x.id)}>
                        {x.title}
                      </span>
                    )}
                  </td>
                  <td className="w-owner">
                    <select className="select-sm" value={x.ownerId} disabled={!work || !mayChange(x)} onChange={(e) => save("tasks", { ...x, ownerId: e.target.value })} aria-label="Zuständig">
                      <option value="">– niemand –</option>
                      {team.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className={`w-due ${!x.done && x.due && x.due < t ? "bad" : ""}`}>
                    {work && mayChange(x) ? <input type="date" className="date-sm" value={x.due} onChange={(e) => save("tasks", { ...x, due: e.target.value })} aria-label="Fällig" /> : x.due ? fmtShort(x.due) : "–"}
                  </td>
                  <td className="w-menu">
                    <Menu items={[{ label: "Löschen", icon: <Trash2 size={14} />, danger: true, disabled: !(work && mayChange(x)), onClick: () => remove("tasks", x.id, `Aufgabe „${x.title}“ gelöscht`) }]} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

"use client";

import { Copy, Trash2, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { Attachments, BlurInput, BlurTextarea, Field, Modal, PersonOptions, SidePanel, useConfirm } from "@/components/app/kit";
import { Button, Checkbox, Input, Select, Textarea } from "@/components/ui";
import { fmtDateTime } from "@/lib/format";
import { DEFECT_STATUS, DEFECT_STATUSES, PRIORITIES, PRIORITY, POINT_TYPE, WORK_STATUS, WORK_STATUSES } from "@/lib/labels";
import { activeSites, now, personName, siteName, uid, useStore } from "@/lib/store/store";
import type { Defect, DefectStatus, OpenPoint, Priority, WorkStatus } from "@/lib/store/types";
import { defectNo, nextDefectNo, pathLabel } from "./model";

/** Status change with who and when. */
export function withPointStatus(p: OpenPoint, status: WorkStatus, me: string): OpenPoint {
  return { ...p, status, doneBy: status === "erledigt" ? me : undefined, doneAt: status === "erledigt" ? now() : undefined };
}
export function withDefectStatus(d: Defect, status: DefectStatus, me: string): Defect {
  const fixed = status === "behoben" || status === "abgenommen";
  return { ...d, status, fixedBy: fixed ? (d.fixedBy ?? me) : undefined, fixedAt: fixed ? (d.fixedAt ?? now()) : undefined };
}

function Stamp({ x }: { x: { createdBy: string; createdAt: string; updatedBy?: string; updatedAt?: string } }) {
  const { data } = useStore();
  return (
    <p className="stamp muted">
      Angelegt von {personName(data, x.createdBy) || "–"}, {fmtDateTime(x.createdAt)}
      {x.updatedAt && (
        <>
          <br />
          Zuletzt geändert von {personName(data, x.updatedBy ?? "") || "–"}, {fmtDateTime(x.updatedAt)}
        </>
      )}
    </p>
  );
}

/** Edit a checklist point or node. */
export function PointPanel({ id, onClose, onDefect }: { id: string; onClose: () => void; onDefect: (p: OpenPoint) => void }) {
  const { data, save, remove, notify, restore } = useStore();
  const ask = useConfirm();
  const p = data.points.find((x) => x.id === id);
  if (!p) return null;
  const set = (patch: Partial<OpenPoint>) => save("points", { ...p, ...patch });
  const site = data.sites.find((s) => s.id === p.siteId);
  const linked = data.defects.filter((d) => d.pointId === p.id);
  const drop = async () => {
    if (!(await ask({ title: `„${p.title}“ löschen?`, text: p.type === "punkt" ? undefined : "Alle Einträge darunter werden mitgelöscht." }))) return;
    const before = data;
    remove("points", p.id);
    onClose();
    notify("Gelöscht", { undo: () => restore(before) });
  };
  return (
    <SidePanel
      title={POINT_TYPE[p.type]}
      sub={[site?.name, pathLabel(data.points, p.id)].filter(Boolean).join(" › ")}
      onClose={onClose}
      footer={
        <>
          <Button variant="destructive" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
            Löschen
          </Button>
          <span className="grow" />
          {p.type === "punkt" && (
            <Button variant="secondary" size="sm" leftIcon={<TriangleAlert size={14} />} onClick={() => onDefect(p)}>
              Mangel erfassen
            </Button>
          )}
          <Button size="sm" onClick={onClose}>
            Fertig
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Bezeichnung" className="span-2">
          <BlurInput value={p.title} onSave={(v) => (v ? set({ title: v }) : notify("Bezeichnung darf nicht leer sein", { tone: "error" }))} />
        </Field>
        {p.type === "punkt" && (
          <>
            <Field label="Status">
              <Select value={p.status} onChange={(e) => save("points", withPointStatus(p, e.target.value as WorkStatus, data.meId))}>
                {WORK_STATUSES.map((k) => (
                  <option key={k} value={k}>
                    {WORK_STATUS[k].label}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label="Fällig am">
              <Input type="date" value={p.due} onChange={(e) => set({ due: e.target.value })} />
            </Field>
            <div className="field span-2">
              <span>Zuständig</span>
              <div className="check-grid">
                {data.people
                  .filter((x) => x.active || p.assigneeIds.includes(x.id))
                  .sort((a, b) => a.name.localeCompare(b.name, "de"))
                  .map((x) => (
                    <label key={x.id} className="check-row">
                      <Checkbox checked={p.assigneeIds.includes(x.id)} onChange={(e) => set({ assigneeIds: e.target.checked ? [...p.assigneeIds, x.id] : p.assigneeIds.filter((y) => y !== x.id) })} />
                      {x.name}
                    </label>
                  ))}
              </div>
            </div>
          </>
        )}
        <Field label="Beschreibung" className="span-2">
          <BlurTextarea value={p.note} rows={4} onSave={(v) => set({ note: v })} placeholder="Details, Maße, Hinweise …" />
        </Field>
        {p.type === "punkt" && (
          <div className="span-2">
            <Attachments files={p.files} onChange={(files) => set({ files })} />
          </div>
        )}
        {linked.length > 0 && (
          <div className="field span-2">
            <span>Mängel zu diesem Punkt</span>
            <ul className="plain-list">
              {linked.map((d) => (
                <li key={d.id}>
                  <strong>{defectNo(d)}</strong> {d.title} · {DEFECT_STATUS[d.status].label}
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.status === "erledigt" && p.doneAt && (
          <p className="span-2 ok-text">
            Erledigt von {personName(data, p.doneBy ?? "") || "–"}, {fmtDateTime(p.doneAt)}
          </p>
        )}
        <div className="span-2">
          <Stamp x={p} />
        </div>
      </div>
    </SidePanel>
  );
}

/** Edit a defect. */
export function DefectPanel({ id, onClose }: { id: string; onClose: () => void }) {
  const { data, save, remove, notify, restore } = useStore();
  const ask = useConfirm();
  const d = data.defects.find((x) => x.id === id);
  if (!d) return null;
  const set = (patch: Partial<Defect>) => save("defects", { ...d, ...patch });
  const point = data.points.find((x) => x.id === d.pointId);
  const drop = async () => {
    if (!(await ask({ title: `Mangel ${defectNo(d)} löschen?` }))) return;
    const before = data;
    remove("defects", d.id);
    onClose();
    notify("Mangel gelöscht", { undo: () => restore(before) });
  };
  const copy = () => {
    const text = `${defectNo(d)} ${d.title}\n${siteName(data, d.siteId)}${d.location ? ` · ${d.location}` : ""}\n${d.description}`.trim();
    navigator.clipboard?.writeText(text).then(
      () => notify("In die Zwischenablage kopiert"),
      () => notify("Kopieren nicht möglich", { tone: "error" })
    );
  };
  return (
    <SidePanel
      title={`Mangel ${defectNo(d)}`}
      sub={siteName(data, d.siteId)}
      onClose={onClose}
      footer={
        <>
          <Button variant="destructive" size="sm" leftIcon={<Trash2 size={14} />} onClick={() => void drop()}>
            Löschen
          </Button>
          <span className="grow" />
          <Button variant="secondary" size="sm" leftIcon={<Copy size={14} />} onClick={copy}>
            Text kopieren
          </Button>
          <Button size="sm" onClick={onClose}>
            Fertig
          </Button>
        </>
      }
    >
      <div className="form-grid">
        <Field label="Mangel" className="span-2">
          <BlurInput value={d.title} onSave={(v) => (v ? set({ title: v }) : notify("Bezeichnung darf nicht leer sein", { tone: "error" }))} />
        </Field>
        <Field label="Status">
          <Select value={d.status} onChange={(e) => save("defects", withDefectStatus(d, e.target.value as DefectStatus, data.meId))}>
            {DEFECT_STATUSES.map((k) => (
              <option key={k} value={k}>
                {DEFECT_STATUS[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Priorität">
          <Select value={d.priority} onChange={(e) => set({ priority: e.target.value as Priority })}>
            {PRIORITIES.map((k) => (
              <option key={k} value={k}>
                {PRIORITY[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Zuständig">
          <Select value={d.ownerId} onChange={(e) => set({ ownerId: e.target.value })}>
            <PersonOptions />
          </Select>
        </Field>
        <Field label="Frist">
          <Input type="date" value={d.due} onChange={(e) => set({ due: e.target.value })} />
        </Field>
        <Field label="Ort" className="span-2">
          <BlurInput value={d.location} onSave={(v) => set({ location: v })} placeholder="Bauteil, Geschoß, Raum, Achse" />
        </Field>
        <Field label="Beschreibung" className="span-2">
          <BlurTextarea value={d.description} rows={4} onSave={(v) => set({ description: v })} />
        </Field>
        <div className="span-2">
          <Attachments files={d.files} onChange={(files) => set({ files })} label="Fotos & Dateien" />
        </div>
        {point && (
          <p className="span-2 muted">
            Aus Checklistenpunkt: <strong>{point.title}</strong>
          </p>
        )}
        {d.fixedAt && (
          <p className="span-2 ok-text">
            Behoben von {personName(data, d.fixedBy ?? "") || "–"}, {fmtDateTime(d.fixedAt)}
          </p>
        )}
        <div className="span-2">
          <Stamp x={d} />
        </div>
      </div>
    </SidePanel>
  );
}

/** Record a new defect – optionally from a checklist point. */
export function NewDefect({ siteId, point, onClose, onCreated }: { siteId: string; point?: OpenPoint; onClose: () => void; onCreated: (d: Defect) => void }) {
  const { data, save, notify } = useStore();
  const sites = activeSites(data);
  const [site, setSite] = useState(point?.siteId ?? siteId ?? sites[0]?.id ?? "");
  const [title, setTitle] = useState(point ? point.title : "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState(point ? pathLabel(data.points, point.id) : "");
  const [priority, setPriority] = useState<Priority>("mittel");
  const [ownerId, setOwner] = useState(point?.assigneeIds[0] ?? "");
  const [due, setDue] = useState("");
  const [tried, setTried] = useState(false);
  const err = !title.trim() ? "Bitte den Mangel kurz beschreiben" : "";
  const submit = () => {
    setTried(true);
    if (err || !site) return;
    const d: Defect = { id: uid(), siteId: site, no: nextDefectNo(data, site), pointId: point?.id ?? "", title: title.trim(), description: description.trim(), location: location.trim(), status: "offen", priority, ownerId, due, files: [], createdBy: data.meId, createdAt: now() };
    save("defects", d);
    notify(`Mangel ${defectNo(d)} erfasst`);
    onCreated(d);
  };
  return (
    <Modal
      title="Mangel erfassen"
      description={point ? `Aus Punkt „${point.title}“` : undefined}
      onClose={onClose}
      onSubmit={submit}
      footer={
        <>
          <span className="grow" />
          <Button type="button" variant="secondary" onClick={onClose}>
            Abbrechen
          </Button>
          <Button type="submit" disabled={!site}>
            Erfassen
          </Button>
        </>
      }
    >
      {!sites.length ? (
        <p className="muted">Zuerst eine Baustelle in der Übersicht anlegen.</p>
      ) : (
        <div className="form-grid">
          <Field label="Baustelle" className="span-2">
            <Select value={site} onChange={(e) => setSite(e.target.value)} disabled={!!point}>
              {sites.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mangel" className="span-2" error={tried ? err : ""}>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="z. B. Brandschutzmanschette fehlt" autoFocus />
          </Field>
          <Field label="Ort" className="span-2">
            <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Bauteil, Geschoß, Raum, Achse" />
          </Field>
          <Field label="Priorität">
            <Select value={priority} onChange={(e) => setPriority(e.target.value as Priority)}>
              {PRIORITIES.map((k) => (
                <option key={k} value={k}>
                  {PRIORITY[k]}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Frist">
            <Input type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </Field>
          <Field label="Zuständig" className="span-2">
            <Select value={ownerId} onChange={(e) => setOwner(e.target.value)}>
              <PersonOptions />
            </Select>
          </Field>
          <Field label="Beschreibung" className="span-2" hint="Fotos können nach dem Erfassen angehängt werden.">
            <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} />
          </Field>
        </div>
      )}
    </Modal>
  );
}

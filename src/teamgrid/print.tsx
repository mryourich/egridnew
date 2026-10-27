"use client";

import { Printer } from "lucide-react";
import { today } from "@/core/date";
import { defectNo, fmtDate, fmtShort, fmtStamp, fmtWhen, PRIORITY, PROJECT_STATUS, WORK_STATUS } from "@/core/format";
import { canSee, rightsOf } from "@/core/roles";
import { personName, StoreProvider, useStore } from "@/core/store";
import { isoWeek, weekdayLong } from "@/core/date";
import type { DailyReport, Data, OpenPoint, Project, Regie } from "@/core/types";
import { crewHours } from "./dailies";
import { billingOf, eur, KIND, totals } from "./money";
import { projectPhotos } from "./photo-list";
import { hoursOf, regieNo } from "./regie";
import { childrenOf, pathLabel, projectFacts, tasksUnder } from "./model";
import "./print.css";

export function PrintPage({ kind, id }: { kind: string; id: string }) {
  return (
    <StoreProvider>
      <Doc kind={kind} id={id} />
    </StoreProvider>
  );
}

function Doc({ kind, id }: { kind: string; id: string }) {
  const { data } = useStore();
  if (kind === "beleg") return <BillingPrint id={id} />;
  if (kind === "formular") return <FormPrint id={id} />;
  const regie = kind === "regie" ? data.regie.find((r) => r.id === id) : undefined;
  const daily = kind === "tagesbericht" ? data.dailies.find((r) => r.id === id) : undefined;
  const projectId = regie?.projectId ?? daily?.projectId ?? id;
  const p = data.projects.find((x) => x.id === projectId);
  if (!p || !canSee(data, p) || (kind === "regie" && !regie) || (kind === "tagesbericht" && !daily)) return <p className="pr-missing">Nicht gefunden.</p>;
  const title =
    kind === "maengel" ? "Mängelbericht" : kind === "punkte" ? "Offene Punkte" : kind === "fotos" ? "Fotodokumentation" : regie ? `Regieschein Nr. ${regieNo(regie.no)}` : daily ? "Tagesbericht" : "Statusbericht";
  return (
    <div className="pr">
      <div className="pr-bar">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} /> Drucken / als PDF speichern
        </button>
      </div>
      <article className="pr-page">
        <header className="pr-head">
          <div>
            <img src="/brand/vysner-logo.png" alt="VYSNER" />
            <span>{data.workspace.name}</span>
            {data.workspace.address && <span>{data.workspace.address}</span>}
          </div>
          <div className="pr-title">
            <h1>{title}</h1>
            <span>Stand {fmtDate(today())}</span>
          </div>
        </header>
        <table className="pr-meta">
          <tbody>
            <tr>
              <th>Projekt</th>
              <td>
                {p.name} {p.number && `(${p.number})`}
              </td>
              <th>Auftraggeber</th>
              <td>{p.client || "–"}</td>
            </tr>
            <tr>
              <th>Ort</th>
              <td>{p.location || "–"}</td>
              <th>Projektleitung</th>
              <td>{personName(data, p.managerId) || "–"}</td>
            </tr>
            <tr>
              <th>Status</th>
              <td>{PROJECT_STATUS[p.status].label}</td>
              <th>Fertig bis</th>
              <td>{fmtDate(p.due) || "–"}</td>
            </tr>
          </tbody>
        </table>
        {kind === "maengel" ? (
          <DefectList data={data} p={p} />
        ) : kind === "punkte" ? (
          <PointList data={data} p={p} />
        ) : kind === "fotos" ? (
          <PhotoReport data={data} p={p} />
        ) : regie ? (
          <RegieDoc data={data} r={regie} />
        ) : daily ? (
          <DailyDoc data={data} r={daily} />
        ) : (
          <Status data={data} p={p} />
        )}
        <footer className="pr-foot">Erstellt mit VYSNER TeamGrid · {fmtStamp(new Date().toISOString())}</footer>
      </article>
    </div>
  );
}

function Status({ data, p }: { data: Data; p: Project }) {
  const f = projectFacts(data, p);
  return (
    <>
      <div className="pr-kpis">
        <div>
          <b>{f.progress} %</b>
          <span>Fortschritt</span>
        </div>
        <div>
          <b>{f.open.length}</b>
          <span>offene Punkte</span>
        </div>
        <div>
          <b>{f.late.length}</b>
          <span>davon überfällig</span>
        </div>
        <div>
          <b>{f.openDefects.length}</b>
          <span>offene Mängel</span>
        </div>
      </div>
      <h2>Fortschritt nach Bereichen</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th>Bereich</th>
            <th className="num">Erledigt</th>
            <th className="num">Gesamt</th>
            <th className="num">%</th>
          </tr>
        </thead>
        <tbody>
          {childrenOf(f.points, "").map((a) => {
            const l = tasksUnder(f.points, a.id);
            const done = l.filter((x) => x.status === "done").length;
            return (
              <tr key={a.id}>
                <td>{a.title}</td>
                <td className="num">{done}</td>
                <td className="num">{l.length}</td>
                <td className="num">{l.length ? Math.round((done / l.length) * 100) : 0}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {f.urgent.length > 0 && (
        <>
          <h2>Mängel mit Priorität hoch</h2>
          <DefectRows data={data} p={p} only="high" />
        </>
      )}
      {f.late.length > 0 && (
        <>
          <h2>Überfällige Punkte</h2>
          <PointRows points={f.points} list={f.late} data={data} />
        </>
      )}
    </>
  );
}

function DefectList({ data, p }: { data: Data; p: Project }) {
  const fixed = data.defects.filter((d) => d.projectId === p.id && d.status === "done").sort((a, b) => a.no - b.no);
  return (
    <>
      <h2>Offene Mängel</h2>
      <DefectRows data={data} p={p} />
      <div className="pr-photos">
        {data.defects
          .filter((d) => d.projectId === p.id && d.status !== "done")
          .flatMap((d) => d.attachments.filter((a) => a.kind === "photo").map((a) => ({ d, a })))
          .map(({ d, a }) => (
            <figure key={a.id}>
              <img src={a.url} alt="" />
              <figcaption>
                {defectNo(d.no)} · {d.title}
              </figcaption>
            </figure>
          ))}
      </div>
      {fixed.length > 0 && <FixedDefects data={data} list={fixed} />}
    </>
  );
}

function DefectRows({ data, p, only }: { data: Data; p: Project; only?: "high" }) {
  const list = data.defects.filter((d) => d.projectId === p.id && d.status !== "done" && (!only || d.priority === only)).sort((a, b) => a.no - b.no);
  if (!list.length) return <p>Keine offenen Mängel.</p>;
  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th>Nr.</th>
          <th>Mangel</th>
          <th>Ort</th>
          <th>Priorität</th>
          <th>Status</th>
          <th>Zuständig</th>
          <th>Frist</th>
        </tr>
      </thead>
      <tbody>
        {list.map((d) => (
          <tr key={d.id}>
            <td>{defectNo(d.no)}</td>
            <td>
              <strong>{d.title}</strong>
              {d.description && <small>{d.description}</small>}
            </td>
            <td>{d.location || "–"}</td>
            <td>{PRIORITY[d.priority].label}</td>
            <td>{WORK_STATUS[d.status].label}</td>
            <td>{personName(data, d.ownerId) || "–"}</td>
            <td>{fmtShort(d.due) || "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PointList({ data, p }: { data: Data; p: Project }) {
  const points = data.points.filter((x) => x.projectId === p.id);
  return (
    <>
      {childrenOf(points, "").map((a) => {
        const open = tasksUnder(points, a.id).filter((x) => x.status !== "done");
        return (
          <section key={a.id}>
            <h2>
              {a.title} <small>({open.length} offen)</small>
            </h2>
            {open.length ? <PointRows points={points} list={open} data={data} /> : <p>Alles erledigt.</p>}
          </section>
        );
      })}
    </>
  );
}

function PointRows({ points, list, data }: { points: OpenPoint[]; list: OpenPoint[]; data: Data }) {
  return (
    <table className="pr-table">
      <thead>
        <tr>
          <th className="pr-box" />
          <th>Punkt</th>
          <th>Status</th>
          <th>Zugewiesen</th>
          <th>Fällig</th>
        </tr>
      </thead>
      <tbody>
        {list.map((x) => (
          <tr key={x.id}>
            <td className="pr-box">☐</td>
            <td>
              <strong>{x.title}</strong>
              <small>{pathLabel(points, x.parentId)}</small>
            </td>
            <td>{WORK_STATUS[x.status].label}</td>
            <td>{x.assigneeIds.map((id) => personName(data, id)).join(", ") || "–"}</td>
            <td>{fmtShort(x.due) || "–"}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function PhotoReport({ data, p }: { data: Data; p: Project }) {
  let pick: { projectId: string; keys: string[]; title: string } | null = null;
  try {
    pick = JSON.parse(window.localStorage.getItem("vysner:fotobericht") ?? "null");
  } catch {
    pick = null;
  }
  const chosen = pick && pick.projectId === p.id ? new Set(pick.keys) : null;
  const photos = projectPhotos(data, p.id)
    .filter((ph) => !chosen || chosen.has(ph.key))
    .sort((a, b) => a.name.localeCompare(b.name, "de", { numeric: true }));
  return (
    <>
      <h2>
        {chosen ? pick!.title : "Alle Fotos"} <small>({photos.length} Fotos)</small>
      </h2>
      <div className="pr-photos two">
        {photos.map((ph) => (
          <figure key={ph.key}>
            <img src={ph.file.url} alt="" />
            <figcaption>
              <strong>{ph.name}</strong>
              {ph.caption && <span>{ph.caption}</span>}
              <span>
                {fmtWhen(ph.at)} · {personName(data, ph.by)}
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </>
  );
}

function RegieDoc({ data, r }: { data: Data; r: Regie }) {
  const materials = r.materials.filter((m) => m.name.trim());
  return (
    <>
      <table className="pr-meta">
        <tbody>
          <tr>
            <th>Datum</th>
            <td>
              {weekdayLong(r.date)}, {fmtDate(r.date)}
            </td>
            <th>Auftrag von</th>
            <td>{r.orderedBy || "–"}</td>
          </tr>
        </tbody>
      </table>
      <h2>Ausgeführte Arbeit</h2>
      <p className="pr-text">{r.description}</p>
      <h2>Stunden</h2>
      <table className="pr-table">
        <thead>
          <tr>
            <th>Name</th>
            <th className="num">Stunden</th>
          </tr>
        </thead>
        <tbody>
          {r.workers.map((w) => (
            <tr key={w.employeeId}>
              <td>{personName(data, w.employeeId)}</td>
              <td className="num">{String(w.hours).replace(".", ",")}</td>
            </tr>
          ))}
          <tr className="pr-sum">
            <td>Summe</td>
            <td className="num">{String(hoursOf(r)).replace(".", ",")} h</td>
          </tr>
        </tbody>
      </table>
      {materials.length > 0 && (
        <>
          <h2>Material</h2>
          <table className="pr-table">
            <thead>
              <tr>
                <th>Art.-Nr.</th>
                <th>Bezeichnung</th>
                <th className="num">Menge</th>
                <th>Einheit</th>
              </tr>
            </thead>
            <tbody>
              {materials.map((m, i) => (
                <tr key={i}>
                  <td>{m.artNo || "–"}</td>
                  <td>{m.name}</td>
                  <td className="num">{String(m.qty).replace(".", ",")}</td>
                  <td>{m.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
      {r.photos.length > 0 && (
        <div className="pr-photos">
          {r.photos.map((a) => (
            <figure key={a.id}>
              <img src={a.url} alt="" />
            </figure>
          ))}
        </div>
      )}
      <div className="pr-signs">
        <div>
          {r.signature ? <img src={r.signature} alt="Unterschrift" /> : <span className="pr-sign-empty" />}
          <small>
            Auftraggeber{r.signedBy ? `: ${r.signedBy}` : ""}
            {r.signedAt ? ` · ${fmtStamp(r.signedAt)}` : ""}
          </small>
        </div>
        <div>
          <span className="pr-sign-empty">{r.approvedAt ? `Freigegeben ${fmtStamp(r.approvedAt)}` : ""}</span>
          <small>Auftragnehmer{r.approvedBy ? `: ${personName(data, r.approvedBy)}` : `: ${personName(data, r.createdBy)}`}</small>
        </div>
      </div>
    </>
  );
}

function DailyDoc({ data, r }: { data: Data; r: DailyReport }) {
  return (
    <>
      <table className="pr-meta">
        <tbody>
          <tr>
            <th>Datum</th>
            <td>
              {weekdayLong(r.date)}, {fmtDate(r.date)} · KW {isoWeek(r.date)}
            </td>
            <th>Wetter</th>
            <td>{r.weather || "–"}</td>
          </tr>
          <tr>
            <th>Verfasst von</th>
            <td>{personName(data, r.createdBy)}</td>
            <th>Personal</th>
            <td>
              {r.crew.length} Personen · {String(crewHours(r)).replace(".", ",")} h
            </td>
          </tr>
        </tbody>
      </table>
      <h2>Ausgeführte Arbeiten</h2>
      <p className="pr-text">{r.work}</p>
      {r.incidents && (
        <>
          <h2>Besonderheiten, Behinderungen</h2>
          <p className="pr-text">{r.incidents}</p>
        </>
      )}
      <h2>Personal</h2>
      <table className="pr-table">
        <tbody>
          {r.crew.map((c) => (
            <tr key={c.employeeId}>
              <td>{personName(data, c.employeeId)}</td>
              <td className="num">{String(c.hours).replace(".", ",")} h</td>
            </tr>
          ))}
        </tbody>
      </table>
      {r.photos.length > 0 && (
        <div className="pr-photos">
          {r.photos.map((a) => (
            <figure key={a.id}>
              <img src={a.url} alt="" />
            </figure>
          ))}
        </div>
      )}
      <div className="pr-signs">
        <div>
          <span className="pr-sign-empty" />
          <small>Bauleitung</small>
        </div>
        <div>
          <span className="pr-sign-empty" />
          <small>Auftraggeber</small>
        </div>
      </div>
    </>
  );
}

function FixedDefects({ data, list }: { data: Data; list: Data["defects"] }) {
  return (
    <section className="pr-after">
      <h2>
        Behobene Mängel <small>({list.length})</small>
      </h2>
      {list.map((d) => (
        <div key={d.id} className="pr-fix">
          <strong>
            {defectNo(d.no)} · {d.title}
          </strong>
          <small>
            {[d.location, d.closedAt && `behoben ${fmtStamp(d.closedAt)}`, d.closedBy && personName(data, d.closedBy)].filter(Boolean).join(" · ")}
          </small>
          {d.fixNote && <p className="pr-text">{d.fixNote}</p>}
          <div className="pr-photos">
            {d.attachments
              .filter((a) => a.kind === "photo")
              .map((a) => (
                <figure key={a.id}>
                  <img src={a.url} alt="" />
                  <figcaption>Vorher</figcaption>
                </figure>
              ))}
            {(d.fixPhotos ?? [])
              .filter((a) => a.kind === "photo")
              .map((a) => (
                <figure key={a.id}>
                  <img src={a.url} alt="" />
                  <figcaption>Nachher</figcaption>
                </figure>
              ))}
          </div>
        </div>
      ))}
    </section>
  );
}

/** Quote, invoice, credit note or dunning letter as an A4 letter. */
function BillingPrint({ id }: { id: string }) {
  const { data } = useStore();
  const b = data.billing.find((x) => x.id === id);
  if (!b || !rightsOf(data).sales) return <p className="pr-missing">Beleg nicht gefunden.</p>;
  const c = data.contacts.find((x) => x.id === b.contactId);
  const p = data.projects.find((x) => x.id === b.projectId);
  const t = totals(b);
  const s = billingOf(data);
  const ref = b.refId ? data.billing.find((x) => x.id === b.refId) : undefined;
  return (
    <div className="pr">
      <div className="pr-bar">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} /> Drucken / als PDF speichern
        </button>
      </div>
      <article className="pr-page pr-letter">
        <header className="pr-head">
          <div>
            <img src="/brand/vysner-logo.png" alt="VYSNER" />
            <span>{data.workspace.name}</span>
            {data.workspace.address && <span>{data.workspace.address}</span>}
          </div>
          <div className="pr-title">
            <h1>{KIND[b.kind].label}</h1>
            <span>{b.no}</span>
          </div>
        </header>
        <div className="pr-address">
          <div>
            <small>
              {data.workspace.name} · {data.workspace.address}
            </small>
            <strong>{c?.name ?? "–"}</strong>
            {c?.person && <span>z. H. {c.person}</span>}
            {c?.address.split(",").map((l) => <span key={l}>{l.trim()}</span>)}
          </div>
          <table className="pr-meta pr-docmeta">
            <tbody>
              <tr>
                <th>Datum</th>
                <td>{fmtDate(b.date)}</td>
              </tr>
              <tr>
                <th>{b.kind === "angebot" ? "Gültig bis" : "Zahlbar bis"}</th>
                <td>{fmtDate(b.due) || "–"}</td>
              </tr>
              {p && (
                <tr>
                  <th>Projekt</th>
                  <td>
                    {p.name} {p.number && `(${p.number})`}
                  </td>
                </tr>
              )}
              {ref && (
                <tr>
                  <th>Bezug</th>
                  <td>
                    {KIND[ref.kind].label} {ref.no}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <h2 className="pr-subject">{b.title}</h2>
        {b.intro && <p className="pr-text">{b.intro}</p>}
        <table className="pr-table pr-lines">
          <thead>
            <tr>
              <th>Pos.</th>
              <th>Leistung</th>
              <th className="num">Menge</th>
              <th>Einheit</th>
              <th className="num">Einzelpreis</th>
              <th className="num">Gesamt</th>
            </tr>
          </thead>
          <tbody>
            {b.lines.map((l, i) => (
              <tr key={l.id}>
                <td>{i + 1}</td>
                <td>{l.text}</td>
                <td className="num">{String(l.qty).replace(".", ",")}</td>
                <td>{l.unit}</td>
                <td className="num">{eur(l.price)}</td>
                <td className="num">{eur(l.qty * l.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <table className="pr-sums">
          <tbody>
            {!!b.fee && (
              <tr>
                <th>Mahnspesen</th>
                <td>{eur(b.fee)}</td>
              </tr>
            )}
            <tr>
              <th>Summe netto</th>
              <td>{eur(t.net)}</td>
            </tr>
            {b.kind !== "mahnung" && (
              <tr>
                <th>USt. {b.vat} %</th>
                <td>{eur(t.tax)}</td>
              </tr>
            )}
            <tr className="total">
              <th>{b.kind === "mahnung" ? "Zu zahlen" : "Gesamtbetrag"}</th>
              <td>{eur(t.gross)}</td>
            </tr>
          </tbody>
        </table>
        {b.vat === 0 && b.kind !== "mahnung" && <p className="pr-text pr-note">Übergang der Steuerschuld auf den Leistungsempfänger gemäß § 19 Abs. 1a UStG. UID des Leistungsempfängers lt. Auftrag.</p>}
        <p className="pr-text pr-note">
          {b.kind === "angebot"
            ? `Dieses Angebot ist gültig bis ${fmtDate(b.due)}. Wir freuen uns auf Ihren Auftrag.`
            : b.kind === "gutschrift"
              ? "Der Betrag wird Ihnen gutgeschrieben bzw. mit offenen Rechnungen verrechnet."
              : `Bitte überweisen Sie den Betrag bis ${fmtDate(b.due)}${s.iban ? ` auf ${s.iban}` : ""} unter Angabe der Nummer ${b.no}.`}
        </p>
        <footer className="pr-foot">
          {data.workspace.name} · {data.workspace.address}
          {s.uid && ` · UID ${s.uid}`}
          {s.iban && ` · IBAN ${s.iban}`}
        </footer>
      </article>
    </div>
  );
}

/** A filled-in form (inspection report) as a PDF. */
function FormPrint({ id }: { id: string }) {
  const { data } = useStore();
  const e = data.formEntries.find((x) => x.id === id);
  const tpl = e && data.forms.find((x) => x.id === e.templateId);
  const p = e && data.projects.find((x) => x.id === e.projectId);
  if (!e || !tpl || !p || !canSee(data, p)) return <p className="pr-missing">Protokoll nicht gefunden.</p>;
  return (
    <div className="pr">
      <div className="pr-bar">
        <button type="button" onClick={() => window.print()}>
          <Printer size={16} /> Drucken / als PDF speichern
        </button>
      </div>
      <article className="pr-page">
        <header className="pr-head">
          <div>
            <img src="/brand/vysner-logo.png" alt="VYSNER" />
            <span>{data.workspace.name}</span>
            {data.workspace.address && <span>{data.workspace.address}</span>}
          </div>
          <div className="pr-title">
            <h1>{tpl.name}</h1>
            <span>{e.status === "abgeschlossen" ? `abgeschlossen ${fmtStamp(e.closedAt)}` : "Entwurf"}</span>
          </div>
        </header>
        <table className="pr-meta">
          <tbody>
            <tr>
              <th>Projekt</th>
              <td>{p.name}</td>
              <th>Auftraggeber</th>
              <td>{p.client || "–"}</td>
            </tr>
            <tr>
              <th>Betreff</th>
              <td>{e.title}</td>
              <th>Erstellt</th>
              <td>
                {personName(data, e.createdBy)} · {fmtStamp(e.createdAt)}
              </td>
            </tr>
          </tbody>
        </table>
        <table className="pr-table pr-form">
          <tbody>
            {tpl.fields.map((f) =>
              f.type === "heading" ? (
                <tr key={f.id} className="pr-form-head">
                  <td colSpan={2}>{f.label}</td>
                </tr>
              ) : f.type === "photo" ? (
                (e.photos[f.id] ?? []).length > 0 && (
                  <tr key={f.id}>
                    <th>{f.label}</th>
                    <td>
                      <div className="pr-photos">
                        {(e.photos[f.id] ?? []).map((a) => (
                          <figure key={a.id}>
                            <img src={a.url} alt="" />
                          </figure>
                        ))}
                      </div>
                    </td>
                  </tr>
                )
              ) : (
                <tr key={f.id}>
                  <th>{f.label}</th>
                  <td>
                    {f.type === "check" ? (e.values[f.id] ? "☑ ja" : "☐ nein") : f.type === "signature" ? e.values[f.id] ? <img className="pr-sig" src={String(e.values[f.id])} alt="Unterschrift" /> : "–" : f.type === "date" ? fmtDate(String(e.values[f.id] ?? "")) || "–" : `${e.values[f.id] ?? "–"}${f.unit && e.values[f.id] ? ` ${f.unit}` : ""}`}
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
        <footer className="pr-foot">Erstellt mit VYSNER · {fmtStamp(new Date().toISOString())}</footer>
      </article>
    </div>
  );
}

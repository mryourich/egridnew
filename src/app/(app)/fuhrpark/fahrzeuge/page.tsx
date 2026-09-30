"use client";

import { Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { DueBadge, StateBadge } from "@/components/fleet";
import { FleetOnly } from "@/components/fleet-pages";
import { useEditor } from "@/components/shell";
import { Badge, Empty, PageHeader, SearchInput, Segmented } from "@/components/ui";
import * as L from "@/lib/labels";
import { useStore } from "@/lib/store";

type Filter = "alle" | "pool" | "dienst";

export default function VehiclesPage() {
  return (
    <FleetOnly>
      <Vehicles />
    </FleetOnly>
  );
}

function Vehicles() {
  const { data } = useStore();
  const openEditor = useEditor();
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("alle");
  const q = query.toLowerCase();
  const name = (id?: string) => data.employees.find((e) => e.id === id)?.name ?? "";
  const list = data.vehicles
    .filter((v) => (filter === "pool" ? v.pool : filter === "dienst" ? !v.pool : true))
    .filter((v) => !q || `${v.name} ${v.plate} ${v.type} ${name(v.driverId)} ${v.location ?? ""}`.toLowerCase().includes(q));

  return (
    <div className="page">
      <PageHeader
        title="Fahrzeuge"
        subtitle="Alle Fahrzeuge der Firma – Poolfahrzeuge und Dienstwagen"
        actions={
          <button className="btn btn-primary" type="button" onClick={() => openEditor({ kind: "vehicle" })}>
            <Plus size={16} /> Fahrzeug
          </button>
        }
      />
      <div className="toolbar">
        <SearchInput value={query} onChange={setQuery} placeholder="Kennzeichen, Modell, Fahrer…" />
        <Segmented
          value={filter}
          onChange={setFilter}
          options={[
            { value: "alle", label: `Alle ${data.vehicles.length}` },
            { value: "pool", label: "Pool" },
            { value: "dienst", label: "Dienstwagen" }
          ]}
        />
      </div>
      {list.length === 0 ? (
        <Empty>{data.vehicles.length ? "Kein Fahrzeug gefunden." : "Noch keine Fahrzeuge – leg das erste an."}</Empty>
      ) : (
        <div className="table-wrap card card-flush">
          <table className="table">
            <thead>
              <tr>
                <th>Fahrzeug</th>
                <th>Nutzung</th>
                <th className="num">Kilometer</th>
                <th>Service</th>
                <th>Pickerl</th>
                <th>Jetzt</th>
              </tr>
            </thead>
            <tbody>
              {list.map((v) => (
                <tr key={v.id} className={`clickable ${v.status === "ausser_betrieb" ? "inactive" : ""}`} onClick={() => router.push(`/fuhrpark/fahrzeuge/${v.id}`)}>
                  <td>
                    <span className="cell-title-stack">
                      <strong>{v.name}</strong>
                      <span>
                        <span className="plate">{v.plate}</span> <small className="muted">{v.type}{v.fuel ? ` · ${L.fuel[v.fuel].label}` : ""}</small>
                      </span>
                    </span>
                  </td>
                  <td>{v.pool ? <Badge tone="blue">Pool</Badge> : <span className="small">{name(v.driverId) || <span className="muted">–</span>}</span>}</td>
                  <td className="num">{v.km ? L.num(v.km) : "–"}</td>
                  <td>
                    <DueBadge date={v.nextService} />
                  </td>
                  <td>
                    <DueBadge date={v.nextInspection} />
                  </td>
                  <td>
                    <StateBadge vehicle={v} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

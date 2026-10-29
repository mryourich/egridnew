"use client";

import { ClipboardList, Plus, TriangleAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { PageHead, Seg } from "@/components/app/kit";
import { Button } from "@/components/ui";
import { siteName, useStore } from "@/lib/store/store";
import type { OpenPoint } from "@/lib/store/types";
import { useQuery } from "@/lib/use-query";
import { Checklist } from "./checklist";
import { DefectList } from "./defects";
import { DefectPanel, NewDefect, PointPanel } from "./editors";

type View = "checkliste" | "maengel";

/** OpenPoints: the checklist to tick off and the defect list – one page, two views. */
export function OpenPoints() {
  const { data, siteId } = useStore();
  const q = useQuery();
  const view: View = q.get("ansicht") === "maengel" ? "maengel" : "checkliste";
  const pointId = q.get("punkt");
  const defectId = q.get("mangel");
  const [newDefect, setNewDefect] = useState<{ point?: OpenPoint } | null>(null);

  // a point from a link: show its part of the structure
  useEffect(() => {
    const p = data.points.find((x) => x.id === pointId);
    if (p && p.type === "punkt" && p.parentId && q.get("knoten") !== p.parentId) q.set({ knoten: p.parentId });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pointId]);

  return (
    <div className="page">
      <PageHead
        title="OpenPoints"
        sub={siteId ? siteName(data, siteId) : "Alle Baustellen"}
        actions={
          <>
            <Seg<View>
              label="Ansicht"
              value={view}
              onChange={(v) => q.set({ ansicht: v === "maengel" ? "maengel" : null, punkt: null, mangel: null })}
              options={[
                {
                  value: "checkliste",
                  label: (
                    <span className="seg-icon">
                      <ClipboardList size={14} /> Checkliste
                    </span>
                  )
                },
                {
                  value: "maengel",
                  label: (
                    <span className="seg-icon">
                      <TriangleAlert size={14} /> Mängelliste
                    </span>
                  )
                }
              ]}
            />
            <Button leftIcon={<Plus size={15} />} onClick={() => setNewDefect({})}>
              Mangel erfassen
            </Button>
          </>
        }
      />
      {view === "checkliste" ? <Checklist onOpen={(id) => q.set({ punkt: id })} /> : <DefectList openId={defectId} onOpen={(id) => q.set({ mangel: id })} />}
      {pointId && <PointPanel id={pointId} onClose={() => q.set({ punkt: null })} onDefect={(p) => setNewDefect({ point: p })} />}
      {defectId && <DefectPanel id={defectId} onClose={() => q.set({ mangel: null })} />}
      {newDefect && <NewDefect siteId={siteId} point={newDefect.point} onClose={() => setNewDefect(null)} onCreated={(d) => (setNewDefect(null), q.set({ ansicht: "maengel", punkt: null, mangel: d.id }))} />}
    </div>
  );
}

"use client";

import type { Project } from "@/core/types";
import { PageHead } from "@/core/ui";
import { useStore } from "@/core/store";
import { StickyBoard } from "./sticky";

/** Notes of a project as sticky notes – pinned ones also hang on the dashboard of everyone in the project. */
export function Notes({ project: p }: { project: Project }) {
  const { data } = useStore();
  const notes = data.notes.filter((n) => n.projectId === p.id);
  return (
    <div className="page">
      <PageHead kicker="Notizen" title="Notizen" sub="Absprachen, Zugänge, Besonderheiten. Mit der Nadel heftest du eine Notiz aufs Dashboard aller im Projekt." />
      <StickyBoard notes={notes} projectId={p.id} empty="Erste Notiz schreiben" />
    </div>
  );
}

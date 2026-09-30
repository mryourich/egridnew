"use client";

import { IssuesTab } from "@/components/project-tabs";
import { PageHeader } from "@/components/ui";
import { useStore } from "@/lib/store";

export default function IssuesPage() {
  const { data } = useStore();
  const open = data.issues.filter((i) => i.status !== "erledigt");
  return (
    <div className="page">
      <PageHeader title="Mängel & Meldungen" subtitle={`${open.length} offen über alle Projekte · Mängel, Abweichungen und Behinderungen`} />
      <IssuesTab />
    </div>
  );
}

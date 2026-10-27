"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { ProjectPage } from "@/teamgrid/project";

export default function Page() {
  const { id, tab } = useParams<{ id: string; tab: string }>();
  // the pages read ?punkt= / ?mangel= from the address
  return (
    <Suspense>
      <ProjectPage id={id} tab={tab} />
    </Suspense>
  );
}

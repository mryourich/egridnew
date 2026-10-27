"use client";

import { Suspense } from "react";
import { ProjectSelection } from "@/teamgrid/site";

export default function Page() {
  return (
    <Suspense>
      <ProjectSelection />
    </Suspense>
  );
}

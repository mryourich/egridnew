"use client";

import { useParams } from "next/navigation";
import { Suspense } from "react";
import { Checklist } from "@/ui/checklist";
import { Defects } from "@/ui/defects";
import { Documents } from "@/ui/documents";
import { MaterialList } from "@/ui/material";
import { Photos } from "@/ui/photos";
import { Regie } from "@/ui/regie";
import { Reports } from "@/ui/reports";

function Tab() {
  const { id, section } = useParams<{ id: string; section: string }>();
  switch (section) {
    case "fotos":
      return <Photos projectId={id} />;
    case "maengel":
      return <Defects projectId={id} />;
    case "regie":
      return <Regie projectId={id} />;
    case "material":
      return <MaterialList projectId={id} />;
    case "tagesbericht":
      return <Reports projectId={id} />;
    case "dokumente":
      return <Documents projectId={id} />;
    default:
      return <Checklist projectId={id} />;
  }
}

export default function Page() {
  return (
    <Suspense>
      <Tab />
    </Suspense>
  );
}

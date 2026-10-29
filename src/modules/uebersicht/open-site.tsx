"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { useStore } from "@/lib/store/store";
import { SiteDetail } from "./site-detail";

/** Old links /uebersicht/<id>: choose the site in the top bar and show the overview of it. */
export function OpenSite({ id }: { id: string }) {
  const { data, setSiteId } = useStore();
  const router = useRouter();
  const known = data.sites.some((s) => s.id === id);
  useEffect(() => {
    if (!known) return;
    setSiteId(id);
    router.replace("/uebersicht");
  }, [id, known, setSiteId, router]);
  // unknown or not visible: the detail page says so
  return known ? null : <SiteDetail id={id} />;
}

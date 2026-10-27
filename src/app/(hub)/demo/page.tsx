"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useStore } from "@/core/store";

/** Entry from the website: loads the sample company (or a clean start) and opens TeamGrid. */
function Start() {
  const { data, reset } = useStore();
  const router = useRouter();
  const kind = useSearchParams().get("start") === "leer" ? "empty" : "demo";
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const own = !data.demo && (data.projects.length > 0 || data.people.length > 1);
    if (own && !window.confirm("Vorhandene Daten in diesem Browser ersetzen?")) return router.replace("/dashboard");
    reset(kind);
    router.replace("/dashboard");
  }, [data, kind, reset, router]);
  return null;
}

export default function Page() {
  return (
    <Suspense>
      <Start />
    </Suspense>
  );
}

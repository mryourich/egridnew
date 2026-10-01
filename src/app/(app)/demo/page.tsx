"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef } from "react";
import { useStore } from "@/lib/store";

/** Entry from the website: loads the sample company (or a clean start) and opens the app. */
function DemoStart() {
  const { data, reset, setCurrentUser } = useStore();
  const router = useRouter();
  const kind = useSearchParams().get("start") === "leer" ? "empty" : "demo";
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const hasOwnData = data.projects.length > 0 || data.employees.length > 1;
    const isDemo = data.employees.some((e) => e.id === "e16");
    if (hasOwnData && !isDemo && !window.confirm("Vorhandene Daten in diesem Browser ersetzen?")) {
      router.replace("/dashboard");
      return;
    }
    reset(kind);
    // visitors start as project manager – the role that sees the most
    if (kind === "demo") setCurrentUser("e1");
    router.replace("/dashboard");
  }, [data, kind, reset, router, setCurrentUser]);

  return <div className="boot"><div className="boot-spinner" /></div>;
}

export default function DemoPage() {
  return (
    <Suspense>
      <DemoStart />
    </Suspense>
  );
}

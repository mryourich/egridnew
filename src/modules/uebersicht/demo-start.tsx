"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { useStore } from "@/lib/store/store";

/** /demo loads the sample company, /demo?start=leer starts empty – then the overview opens. */
export function DemoStart() {
  const { reset } = useStore();
  const router = useRouter();
  const empty = useSearchParams().get("start") === "leer";
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    reset(empty ? "empty" : "demo");
    router.replace("/uebersicht");
  }, [empty, reset, router]);
  return <p className="page muted">{empty ? "Leerer Betrieb wird angelegt …" : "Beispielbetrieb wird geladen …"}</p>;
}

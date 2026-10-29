"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/** Reads and patches the address query (?ansicht=…&punkt=…) without scrolling. */
export function useQuery() {
  const router = useRouter();
  const path = usePathname();
  const params = useSearchParams();
  const set = useCallback(
    (patch: Record<string, string | null | undefined>) => {
      const q = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v) q.set(k, v);
        else q.delete(k);
      }
      const s = q.toString();
      router.replace(`${path}${s ? `?${s}` : ""}`, { scroll: false });
    },
    [params, path, router]
  );
  return { get: (k: string) => params.get(k) ?? "", set };
}

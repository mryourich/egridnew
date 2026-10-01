"use client";

import { useStore } from "@/lib/store";
import { Avatar } from "./ui";

/** Avatar of an employee – profile picture when there is one, otherwise initials. */
export function EmpAvatar({ id, size = 24 }: { id: string; size?: number }) {
  const { data } = useStore();
  const e = data.employees.find((x) => x.id === id);
  return <Avatar name={e?.name ?? "?"} photo={e?.photo} size={size} />;
}

"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
import { defaultSection } from "@/lib/sections";
import { currentUser, roleOf, useStore } from "@/lib/store";

export default function SiteIndex() {
  const { id } = useParams<{ id: string }>();
  const { data } = useStore();
  const router = useRouter();
  const section = defaultSection(roleOf(currentUser(data)));
  useEffect(() => router.replace(`/baustellen/${id}/${section}`), [id, section, router]);
  return null;
}

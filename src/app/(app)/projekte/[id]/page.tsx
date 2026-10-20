"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  useEffect(() => router.replace(`/projekte/${id}/struktur`), [id, router]);
  return null;
}

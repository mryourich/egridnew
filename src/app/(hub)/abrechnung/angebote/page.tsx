"use client";

import { Suspense } from "react";
import { BillingList } from "@/teamgrid/billing";

export default function Page() {
  return (
    <Suspense>
      <BillingList kind="angebot" />
    </Suspense>
  );
}

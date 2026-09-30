"use client";

import { BookingPage, FleetHome } from "@/components/fleet-pages";
import { canManageFleet, useStore } from "@/lib/store";

export default function FleetPage() {
  const { data } = useStore();
  return canManageFleet(data) ? <FleetHome /> : <BookingPage />;
}

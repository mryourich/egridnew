"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/** Registers the offline worker and shows a quiet banner while there is no network. */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      // when a new version takes over, reload once – so old and new files never mix
      const hadWorker = !!navigator.serviceWorker.controller;
      let reloaded = false;
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (!hadWorker || reloaded) return;
        reloaded = true;
        window.location.reload();
      });
      navigator.serviceWorker.register(`/sw.js?v=${process.env.NEXT_PUBLIC_BUILD_ID ?? "dev"}`, { updateViaCache: "none" }).catch(() => undefined);
    }
    const update = () => setOffline(!navigator.onLine);
    update();
    window.addEventListener("online", update);
    window.addEventListener("offline", update);
    return () => {
      window.removeEventListener("online", update);
      window.removeEventListener("offline", update);
    };
  }, []);
  if (!offline) return null;
  return (
    <div className="offline-bar" role="status">
      <WifiOff size={14} /> Offline – du kannst weiterarbeiten, alles wird auf diesem Gerät gespeichert.
    </div>
  );
}

"use client";

import { WifiOff } from "lucide-react";
import { useEffect, useState } from "react";

/** Registers the offline worker and shows a quiet banner while there is no network. */
export function OfflineSupport() {
  const [offline, setOffline] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator) navigator.serviceWorker.register("/sw.js").catch(() => undefined);
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

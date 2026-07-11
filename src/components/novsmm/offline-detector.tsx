"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function OfflineDetector() {
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setOffline(!navigator.onLine);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-amber-500/90 text-white text-center text-xs py-2 px-4 backdrop-blur-sm">
      <WifiOff className="inline h-3.5 w-3.5 mr-1.5" />
      You're offline. Some features may be unavailable.
    </div>
  );
}

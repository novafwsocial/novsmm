"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { X, Sparkles, CheckCircle2, AlertTriangle, Info, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

type Announcement = {
  title: string;
  message: string;
  type: "info" | "success" | "warning";
  date: string;
  version: string;
};

type VersionInfo = {
  version: string;
  announcement: Announcement | null;
};

const TYPE_STYLES = {
  info: { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-700", icon: Info },
  success: { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-700", icon: CheckCircle2 },
  warning: { bg: "bg-amber-500/10", border: "border-amber-500/20", text: "text-amber-700", icon: AlertTriangle },
};

/**
 * VersionAnnouncementBanner — shows a dismissible announcement banner
 * when the admin publishes a new version update.
 *
 * The banner is shown once per version (dismissed state stored in localStorage).
 * Falls back to showing the current version badge if no active announcement.
 */
export function VersionAnnouncementBanner() {
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => {
        setVersionInfo(data);
        // Check if this announcement was already dismissed
        if (data.announcement) {
          const dismissedKey = `novsmm_announcement_${data.announcement.version}_${data.announcement.date}`;
          const stored = localStorage.getItem(dismissedKey);
          if (stored === "true") setDismissed(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    if (versionInfo?.announcement) {
      const dismissedKey = `novsmm_announcement_${versionInfo.announcement.version}_${versionInfo.announcement.date}`;
      localStorage.setItem(dismissedKey, "true");
    }
    setDismissed(true);
  };

  if (!versionInfo?.announcement || dismissed) return null;

  const ann = versionInfo.announcement;
  const style = TYPE_STYLES[ann.type as keyof typeof TYPE_STYLES] ?? TYPE_STYLES.info;
  const Icon = style.icon;

  return (
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className={cn("fixed left-1/2 top-16 z-[60] w-[min(600px,calc(100vw-2rem))] -translate-x-1/2 rounded-2xl border p-4 shadow-lg backdrop-blur-md", style.bg, style.border)}
      >
        <div className="flex items-start gap-3">
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", style.bg, style.text)}>
            <Icon className="h-4 w-4" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-foreground">{ann.title}</span>
              <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium", style.bg, style.text)}>
                v{ann.version}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">{ann.message}</p>
          </div>
          <button
            onClick={handleDismiss}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
            aria-label="Dismiss announcement"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </motion.div>
  );
}

/**
 * VersionBadge — small version indicator shown in the footer or sidebar.
 */
export function VersionBadge({ className }: { className?: string }) {
  const [version, setVersion] = useState("1.0.0");

  useEffect(() => {
    fetch("/api/version")
      .then((r) => r.json())
      .then((data) => setVersion(data.version ?? "1.0.0"))
      .catch(() => {});
  }, []);

  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground", className)}>
      <Sparkles className="h-2.5 w-2.5" />
      v{version}
    </span>
  );
}

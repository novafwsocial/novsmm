import { cn } from "@/lib/utils";

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    processing: { label: "Processing", cls: "bg-blue-500/10 text-blue-700", dot: "bg-blue-500" },
    in_progress: { label: "In progress", cls: "bg-primary/10 text-primary", dot: "bg-primary" },
    completed: { label: "Completed", cls: "bg-emerald-500/10 text-emerald-700", dot: "bg-emerald-500" },
    partial: { label: "Partial", cls: "bg-amber-500/10 text-amber-700", dot: "bg-amber-500" },
    pending: { label: "Pending", cls: "bg-muted text-muted-foreground", dot: "bg-muted-foreground" },
    cancelled: { label: "Cancelled", cls: "bg-red-500/10 text-red-700", dot: "bg-red-500" },
  };
  const s = map[status] ?? map.pending;
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium", s.cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", s.dot)} />
      {s.label}
    </span>
  );
}

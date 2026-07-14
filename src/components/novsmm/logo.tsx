import { cn } from "@/lib/utils";

/**
 * NOVSMM brand logo — uses the official logo PNG.
 * Metallic stylized "W" mark on transparent background.
 * Used across the entire app: navbar, sidebar, footer, login screen, etc.
 */
export function Logo({
  className,
  showWord = true,
  alt = "NOVSMM",
}: {
  className?: string;
  showWord?: boolean;
  alt?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <img
        src="/logo-new.png"
        alt={alt}
        width={32}
        height={32}
        className="h-7 w-7 shrink-0"
        loading="eager"
      />
      {showWord && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          NOVSMM
        </span>
      )}
    </span>
  );
}

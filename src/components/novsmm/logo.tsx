import { cn } from "@/lib/utils";

/**
 * NOVSMM brand logo — uses the official SVG logo.
 * Circular black badge with a stylized white "N" mark.
 * Used across the entire app: navbar, sidebar, footer, login screen, etc.
 *
 * PERF FIX (U-H-002): previously used novsmm-logo.png (21KB PNG, rasterized).
 * Switched to logo.svg (1KB SVG, vector) — scales perfectly at any size,
 * no resolution loss on retina displays, and -20KB per page load.
 * Also removed the next/image dependency for the logo (SVG is tiny enough
 * that the Image component optimization adds more overhead than it saves).
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
        src="/logo.svg"
        alt={alt}
        width={32}
        height={32}
        className="h-7 w-7 shrink-0 rounded-full"
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

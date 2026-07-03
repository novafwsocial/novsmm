import { cn } from "@/lib/utils";
import Image from "next/image";

/**
 * NOVSMM brand logo — uses the official uploaded logo image.
 * Circular black badge with a stylized white "N" mark.
 * Used across the entire app: navbar, sidebar, footer, login screen, etc.
 */
export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <Image
        src="/novsmm-logo.png"
        alt="NOVSMM"
        width={32}
        height={32}
        className="h-7 w-7 shrink-0 rounded-full object-cover"
        priority
      />
      {showWord && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          NOVSMM
        </span>
      )}
    </span>
  );
}

import { cn } from "@/lib/utils";

/** NOVSMM wordmark — custom geometric monogram + wordmark. */
export function Logo({
  className,
  showWord = true,
}: {
  className?: string;
  showWord?: boolean;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <svg
        width="28"
        height="28"
        viewBox="0 0 32 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden
      >
        <rect width="32" height="32" rx="8" fill="oklch(0.18 0.004 285)" />
        <path
          d="M8 22V10.5L16 18.5L24 10.5V22"
          stroke="white"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="16" cy="24.5" r="1.4" fill="#0052ff" />
      </svg>
      {showWord && (
        <span className="text-[17px] font-semibold tracking-tight text-foreground">
          NOVSMM
        </span>
      )}
    </span>
  );
}

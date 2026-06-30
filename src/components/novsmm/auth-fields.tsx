"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  useState,
  useRef,
  type InputHTMLAttributes,
  type ReactNode,
} from "react";
import { Check, AlertCircle, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  icon?: ReactNode;
  hint?: string;
  error?: string;
  valid?: boolean;
  trailing?: ReactNode;
};

/**
 * Premium input — glow + elevation on focus, inline validation,
 * elegant error states (never ugly).
 */
export function Field({
  label,
  icon,
  hint,
  error,
  valid,
  trailing,
  className,
  type = "text",
  ...props
}: FieldProps) {
  const [focused, setFocused] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const isPw = type === "password";
  const effectiveType = isPw && showPw ? "text" : type;

  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      <motion.div
        animate={{
          boxShadow: focused
            ? "0 0 0 4px rgba(0,82,255,0.12), 0 1px 2px rgba(0,0,0,0.04), 0 8px 24px -10px rgba(0,82,255,0.25)"
            : "0 0 0 1px rgba(0,0,0,0.08), 0 1px 2px rgba(0,0,0,0.03)",
          y: focused ? -1 : 0,
        }}
        transition={{ type: "spring", stiffness: 300, damping: 22 }}
        className={cn(
          "relative flex items-center gap-2.5 rounded-xl bg-background px-3.5",
          error && "!shadow-[0_0_0_1px_rgba(220,38,38,0.4),0_8px_24px_-10px_rgba(220,38,38,0.25)]",
          valid && focused && "!shadow-[0_0_0_1px_rgba(16,185,129,0.4),0_0_0_4px_rgba(16,185,129,0.12)]",
          className
        )}
      >
        {icon && (
          <span
            className={cn(
              "shrink-0 text-muted-foreground transition-colors",
              focused && "text-primary",
              error && "text-destructive",
              valid && "text-emerald-500"
            )}
          >
            {icon}
          </span>
        )}
        <input
          {...props}
          type={effectiveType}
          onFocus={(e) => {
            setFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            props.onBlur?.(e);
          }}
          className="peer h-11 w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
        />
        {valid && (
          <motion.span
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="shrink-0 text-emerald-500"
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
          </motion.span>
        )}
        {isPw && (
          <button
            type="button"
            onClick={() => setShowPw((v) => !v)}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
            aria-label={showPw ? "Hide password" : "Show password"}
          >
            {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        )}
        {trailing}
      </motion.div>
      <AnimatePresence mode="wait">
        {error ? (
          <motion.div
            key="err"
            initial={{ opacity: 0, y: -4, height: 0 }}
            animate={{ opacity: 1, y: 0, height: "auto" }}
            exit={{ opacity: 0, y: -4, height: 0 }}
            className="flex items-center gap-1.5 px-1 pt-1.5 text-xs text-destructive"
          >
            <AlertCircle className="h-3 w-3" />
            {error}
          </motion.div>
        ) : hint ? (
          <motion.div
            key="hint"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="px-1 pt-1.5 text-xs text-muted-foreground"
          >
            {hint}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </label>
  );
}

/**
 * Password strength meter — animated, color-coded, with recommendations.
 */
export function PasswordStrength({ value }: { value: string }) {
  const { score, label, color, tips } = scorePassword(value);

  return (
    <AnimatePresence>
      {value.length > 0 && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="overflow-hidden"
        >
          <div className="mt-2 flex items-center gap-2">
            <div className="flex h-1.5 flex-1 gap-1">
              {[0, 1, 2, 3].map((i) => (
                <motion.div
                  key={i}
                  initial={false}
                  animate={{
                    backgroundColor:
                      i < score ? color : "rgba(0,0,0,0.08)",
                    opacity: i < score ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.3 }}
                  className="h-full flex-1 rounded-full"
                />
              ))}
            </div>
            <motion.span
              key={label}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              className="w-20 text-right text-[11px] font-medium"
              style={{ color: score > 0 ? color : "rgb(107 114 128)" }}
            >
              {label}
            </motion.span>
          </div>
          {tips.length > 0 && score < 4 && (
            <motion.ul
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="mt-2 flex flex-col gap-1"
            >
              {tips.map((t) => (
                <li
                  key={t}
                  className="flex items-center gap-1.5 text-[11px] text-muted-foreground"
                >
                  <span className="h-1 w-1 rounded-full bg-muted-foreground/50" />
                  {t}
                </li>
              ))}
            </motion.ul>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function scorePassword(pw: string): {
  score: number;
  label: string;
  color: string;
  tips: string[];
} {
  if (!pw) return { score: 0, label: "", color: "", tips: [] };
  const tips: string[] = [];
  let s = 0;
  if (pw.length >= 8) s++;
  else tips.push("Use at least 8 characters");
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  else tips.push("Mix uppercase and lowercase");
  if (/\d/.test(pw)) s++;
  else tips.push("Add a number");
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  else tips.push("Add a symbol");
  if (pw.length >= 12 && s === 4) s = 4;

  const map = [
    { label: "", color: "rgb(220 38 38)" },
    { label: "Weak", color: "rgb(220 38 38)" },
    { label: "Fair", color: "rgb(245 158 11)" },
    { label: "Good", color: "rgb(59 130 246)" },
    { label: "Strong", color: "rgb(16 185 129)" },
  ];
  return { score: s, ...map[s], tips };
}

/**
 * Social login button — premium with brand glyph + label.
 */
export function SocialButton({
  provider,
  onClick,
}: {
  provider: "google" | "discord" | "telegram" | "apple";
  onClick?: () => void;
}) {
  const labels: Record<string, string> = {
    google: "Google",
    discord: "Discord",
    telegram: "Telegram",
    apple: "Apple",
  };
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -1 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted/50"
    >
      <SocialGlyph provider={provider} />
      <span className="hidden sm:inline">{labels[provider]}</span>
    </motion.button>
  );
}

function SocialGlyph({ provider }: { provider: string }) {
  const c = "h-4 w-4";
  switch (provider) {
    case "google":
      return (
        <svg viewBox="0 0 24 24" className={c} aria-hidden>
          <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z" />
          <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z" />
          <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4z" />
          <path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.8 6-4.8z" />
        </svg>
      );
    case "discord":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="#5865F2" aria-hidden>
          <path d="M19.3 5.3A16 16 0 0 0 15.4 4l-.2.4c1.5.4 2.7 1 3.9 1.8a13 13 0 0 0-11 0c1.2-.8 2.5-1.4 3.9-1.8L11.7 4c-1.4.3-2.7.8-3.9 1.3C5 9.3 4.2 13.2 4.6 17c1.6 1.2 3.2 1.9 4.7 2.4l.4-.6c-.8-.3-1.5-.7-2.2-1.2l.5-.4c3 1.4 6.3 1.4 9.3 0l.5.4c-.7.5-1.4.9-2.2 1.2l.4.6c1.5-.5 3.1-1.2 4.7-2.4.5-4.4-.8-8.3-3.2-11.7zM9.7 14.7c-.9 0-1.7-.8-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9zm4.6 0c-.9 0-1.7-.8-1.7-1.9s.7-1.9 1.7-1.9 1.7.9 1.7 1.9-.7 1.9-1.7 1.9z" />
        </svg>
      );
    case "telegram":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="#229ED9" aria-hidden>
          <path d="M21.9 5.3l-2.9 13.6c-.2.9-.8 1.2-1.5.7l-4.1-3-2 1.9c-.2.2-.4.4-.9.4l.3-4.2 7.7-7c.3-.3-.1-.5-.5-.2L8.4 13.1l-4-1.2c-.9-.3-.9-.9.2-1.3l15.6-6c.7-.3 1.4.2 1.1 1.5z" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 24 24" className={c} fill="currentColor" aria-hidden>
          <path d="M16.5 12.5c0-2 1.6-3 1.7-3-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 .7s-1.6-.7-2.6-.7c-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .6 1 1.4 2.1 2.4 2.1 1 0 1.3-.6 2.5-.6s1.5.6 2.5.6 1.7-1 2.3-2c.7-1.1 1-2.2 1-2.3-.1 0-2.1-.8-2.1-3.2zM14.7 6.3c.5-.6.9-1.5.8-2.4-.8 0-1.7.5-2.2 1.2-.5.6-.9 1.5-.8 2.3.8.1 1.7-.4 2.2-1.1z" />
        </svg>
      );
    default:
      return null;
  }
}

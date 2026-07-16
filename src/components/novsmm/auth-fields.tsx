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
import { useLanguage } from "./language-provider";

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
          className="peer h-11 w-full bg-transparent text-base text-foreground placeholder:text-muted-foreground/60 focus:outline-none"
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
  const { t } = useLanguage();
  const { score, label, color, tips } = scorePassword(value, t);

  return (
    <AnimatePresence mode="wait">
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

function scorePassword(pw: string, t: (key: string, fallback?: string) => string): {
  score: number;
  label: string;
  color: string;
  tips: string[];
} {
  if (!pw) return { score: 0, label: "", color: "", tips: [] };
  const tips: string[] = [];
  let s = 0;
  if (pw.length >= 8) s++;
  else tips.push(t("auth.passwordTipLength"));
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) s++;
  else tips.push(t("auth.passwordTipCase"));
  if (/\d/.test(pw)) s++;
  else tips.push(t("auth.passwordTipNumber"));
  if (/[^A-Za-z0-9]/.test(pw)) s++;
  else tips.push(t("auth.passwordTipSymbol"));
  if (pw.length >= 12 && s === 4) s = 4;

  const map = [
    { label: "", color: "rgb(220 38 38)" },
    { label: t("auth.passwordWeak"), color: "rgb(220 38 38)" },
    { label: t("auth.passwordFair"), color: "rgb(245 158 11)" },
    { label: t("auth.passwordGood"), color: "rgb(59 130 246)" },
    { label: t("auth.passwordStrong"), color: "rgb(16 185 129)" },
  ];
  return { score: s, ...map[s], tips };
}

/**
 * Social login button — premium with brand glyph + label.
 *
 * BROAD-FIX-BATCH-1: previously this component only rendered a Google button
 * (the only OAuth provider wired up in auth.ts). The admin social-auth panel
 * (ADMIN-FIX-BATCH-2) supports Google + Facebook + GitHub + Twitter, so this
 * component now renders a button for any of those providers. The login and
 * register screens fetch the list of configured providers from
 * /api/auth/social-providers and render one SocialButton per configured
 * provider — unconfigured providers are hidden so users never click a button
 * that fails.
 *
 * The button is full-width with the official provider glyph.
 */
export type SocialProviderId = "google" | "facebook" | "github" | "twitter";

export function SocialButton({
  provider,
  onClick,
  loading = false,
}: {
  provider: SocialProviderId;
  onClick?: () => void;
  loading?: boolean;
}) {
  const meta = PROVIDER_META[provider];
  const { t } = useLanguage();
  return (
    <motion.button
      type="button"
      onClick={onClick}
      disabled={loading}
      whileHover={loading ? undefined : { y: -1 }}
      whileTap={loading ? undefined : { scale: 0.99 }}
      transition={{ type: "spring", stiffness: 400, damping: 20 }}
      className="flex h-11 w-full items-center justify-center gap-2.5 rounded-xl border border-border bg-background text-sm font-medium text-foreground transition-colors hover:bg-muted/50 disabled:opacity-60"
    >
      {meta.glyph}
      <span>
        {loading
          ? t("auth.redirecting")
          : t("auth.continueWith").replace("{provider}", meta.label)}
      </span>
    </motion.button>
  );
}

const PROVIDER_META: Record<
  SocialProviderId,
  { label: string; glyph: ReactNode }
> = {
  google: {
    label: "Google",
    glyph: <GoogleGlyph />,
  },
  facebook: {
    label: "Facebook",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#1877F2"
          d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07c0 6 4.39 10.97 10.13 11.93v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.69.24 2.69.24v2.95h-1.52c-1.49 0-1.96.93-1.96 1.89v2.27h3.33l-.53 3.49h-2.8V24C19.61 23.04 24 18.07 24 12.07z"
        />
      </svg>
    ),
  },
  github: {
    label: "GitHub",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#181717"
          d="M12 .5C5.37.5 0 5.87 0 12.5c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.05-3.34.73-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.21.09 1.84 1.24 1.84 1.24 1.07 1.84 2.81 1.31 3.5 1 .11-.78.42-1.31.76-1.61-2.67-.3-5.47-1.34-5.47-5.95 0-1.31.47-2.39 1.24-3.23-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 6 0c2.29-1.55 3.3-1.23 3.3-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.92 1.24 3.23 0 4.62-2.81 5.64-5.49 5.94.43.37.81 1.1.81 2.22 0 1.6-.01 2.89-.01 3.29 0 .32.21.7.83.58A12 12 0 0 0 24 12.5C24 5.87 18.63.5 12 .5z"
        />
      </svg>
    ),
  },
  twitter: {
    label: "Twitter / X",
    glyph: (
      <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
        <path
          fill="#000"
          d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24h-6.66l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644z"
        />
      </svg>
    ),
  },
};

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden>
      <path fill="#4285F4" d="M22.5 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.9a5 5 0 0 1-2.2 3.3v2.7h3.6c2.1-2 3.2-4.9 3.2-7.9z" />
      <path fill="#34A853" d="M12 23c2.9 0 5.4-1 7.2-2.6l-3.6-2.7c-1 .7-2.3 1.1-3.6 1.1-2.8 0-5.1-1.9-6-4.4H2.3v2.8A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M6 14.4a6.6 6.6 0 0 1 0-4.2V7.4H2.3a11 11 0 0 0 0 9.8L6 14.4z" />
      <path fill="#EA4335" d="M12 5.4c1.6 0 3 .5 4.1 1.6l3.1-3.1A11 11 0 0 0 2.3 7.4L6 10.2c.9-2.6 3.2-4.8 6-4.8z" />
    </svg>
  );
}

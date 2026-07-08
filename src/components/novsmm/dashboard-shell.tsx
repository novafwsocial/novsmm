"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect, useMemo, useRef, useCallback, type ReactNode } from "react";
import { signOut } from "next-auth/react";
import {
  LayoutGrid,
  ShoppingCart,
  Store,
  Wallet,
  Ticket,
  Bell,
  BarChart3,
  ShieldCheck,
  Search,
  Plus,
  ArrowUpRight,
  Menu,
  X,
  ChevronDown,
  LogOut,
  Settings,
  Home,
  Sun,
  Moon,
  CornerDownLeft,
  ArrowUp,
  ArrowDown,
  CalendarClock,
  Globe,
  AlertTriangle,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import { useApp, type DashboardTab } from "./app-store";
import { useSession, useNotifications, useDashboard } from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { api } from "@/lib/api-client";
import { Logo } from "./logo";
import { Counter } from "./counter";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const NAV: { id: DashboardTab; label: string; icon: any }[] = [
  { id: "home", label: "Dashboard", icon: LayoutGrid },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "marketplace", label: "Services", icon: Store },
  { id: "orders", label: "Orders", icon: ShoppingCart },
  { id: "subscriptions", label: "Subscriptions", icon: CalendarClock },
  { id: "child-panels", label: "Child Panels", icon: Globe },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "tickets", label: "Tickets", icon: Ticket },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "profile", label: "Profile", icon: Settings },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { dashboardTab, setDashboardTab, signOut: storeSignOut, setView, setBrowsingLanding } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  // Bump this every time the palette transitions from closed → open so the
  // CommandPalette remounts with fresh state (no setState-in-effect needed).
  const [paletteNonce, setPaletteNonce] = useState(0);
  const { data: sessionData } = useSession();
  const { data: notifData } = useNotifications();
  const { data: dashData } = useDashboard();
  const { toast } = useToast();
  const [statusState, setStatusState] = useState<"operational" | "degraded">("operational");

  const openPalette = useCallback(() => {
    setPaletteNonce((n) => n + 1);
    setPaletteOpen(true);
  }, []);
  const togglePalette = useCallback(() => {
    setPaletteOpen((v) => {
      if (!v) setPaletteNonce((n) => n + 1);
      return !v;
    });
  }, []);

  // Poll /api/status every 60s for the topbar status pill
  useEffect(() => {
    let cancelled = false;
    const tick = () => {
      api
        .get("/api/status")
        .then((d: any) => {
          if (cancelled) return;
          setStatusState(d?.status === "operational" ? "operational" : "degraded");
        })
        .catch(() => {});
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  // ⌘K / Ctrl+K → open the command palette
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        togglePalette();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [togglePalette]);

  // Apply persisted theme on mount (toggle via the command palette writes to
  // localStorage under "novsmm-theme").
  useEffect(() => {
    try {
      const stored = localStorage.getItem("novsmm-theme");
      if (stored === "dark" || stored === "light") {
        document.documentElement.classList.toggle("dark", stored === "dark");
      }
    } catch {}
  }, []);

  const user = (sessionData?.user as any) ?? null;
  const unreadCount = notifData?.unreadCount ?? 0;
  const balance = dashData?.stats?.balance ?? (user?.balance ?? 0);
  const activeOrders = dashData?.stats?.activeOrders ?? 0;
  const openTickets = dashData?.stats?.openTickets ?? 0;
  const isAdmin = user?.role === "admin";
  const isImpersonating = !!user?.impersonating;

  const [returningToAdmin, setReturningToAdmin] = useState(false);
  const handleReturnToAdmin = async () => {
    setReturningToAdmin(true);
    try {
      const res = await fetch("/api/admin/impersonate/stop", { method: "POST" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Failed to return to admin");
      }
      // Reload to pick up the new admin session
      window.location.reload();
    } catch (e: any) {
      setReturningToAdmin(false);
      console.error("[impersonate-stop] failed:", e);
      toast({
        title: "Failed to return to admin",
        description: e?.message ?? "Please try again or contact support.",
        variant: "destructive",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut({ redirect: false });
    storeSignOut();
    window.location.reload();
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-background">
      {/* ── Impersonation banner ──
          Shown when the current session is an impersonation (admin logged in
          as a user). Sticky at the very top, full-width. The sidebar and
          main column shift down by the banner height (3rem = top-12 / h-12). */}
      {isImpersonating && (
        <div className="sticky top-0 z-50 flex h-12 shrink-0 items-center justify-between gap-3 border-b border-amber-500/40 bg-amber-500 px-3 text-amber-950 sm:px-4">
          <div className="flex min-w-0 items-center gap-2 text-xs font-medium sm:text-sm">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span className="truncate">
              You are impersonating{" "}
              <strong className="font-semibold">{user?.name ?? "user"}</strong>
              {" "}as admin. All actions are audited.
            </span>
          </div>
          <button
            onClick={handleReturnToAdmin}
            disabled={returningToAdmin}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-amber-950 px-3 py-1.5 text-xs font-semibold text-amber-50 transition-colors hover:bg-amber-900 disabled:opacity-60"
          >
            {returningToAdmin ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ArrowLeft className="h-3 w-3" />
            )}
            <span className="hidden sm:inline">Return to admin</span>
            <span className="sm:hidden">Exit</span>
          </button>
        </div>
      )}
      <div className="flex flex-1">
      {/* Sidebar — desktop */}
      <aside
        className={cn(
          "sticky hidden w-[248px] shrink-0 flex-col border-r border-border/60 bg-muted/30 lg:flex",
          isImpersonating ? "top-12 h-[calc(100vh-3rem)]" : "top-0 h-screen"
        )}
      >
        <div className="flex h-16 items-center justify-between px-5">
          <a
            onClick={() => setDashboardTab("home")}
            className="cursor-pointer"
            aria-label="Go to dashboard home"
          >
            <Logo />
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 nov-scroll">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </div>
          {NAV.map((n) => {
            const badge =
              n.id === "orders" && activeOrders > 0
                ? String(activeOrders)
                : n.id === "tickets" && openTickets > 0
                ? String(openTickets)
                : n.id === "notifications" && unreadCount > 0
                ? String(unreadCount)
                : undefined;
            return (
              <NavButton
                key={n.id}
                active={dashboardTab === n.id}
                icon={n.icon}
                label={n.label}
                badge={badge}
                onClick={() => setDashboardTab(n.id)}
              />
            );
          })}

          {isAdmin && (
            <>
              <div className="mt-5 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                Admin
              </div>
              <NavButton
                active={dashboardTab === "admin"}
                icon={ShieldCheck}
                label="Admin Panel"
                onClick={() => setDashboardTab("admin")}
              />
            </>
          )}
        </nav>

        {/* wallet mini */}
        <div className="m-3 rounded-2xl border border-border/60 bg-background p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Available balance</span>
            <span className="text-emerald-600">live</span>
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">
            $<Counter to={balance} decimals={2} duration={1.5} />
          </div>
          <button
            onClick={() => setDashboardTab("wallet")}
            className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-[12px] font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
          >
            <Plus className="h-3.5 w-3.5" /> Top up
          </button>
        </div>

        {/* user */}
        <UserPill
          user={
            user
              ? {
                  name: user.name ?? "User",
                  email: user.email ?? "",
                  username: user.username ?? "",
                }
              : { name: "", email: "", username: "" }
          }
          onSignOut={handleSignOut}
          onNavigate={(tab) => setDashboardTab(tab)}
        />
      </aside>

      {/* Mobile sidebar */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMobileOpen(false)}
              className="fixed inset-0 z-40 bg-foreground/30 backdrop-blur-sm lg:hidden"
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-border bg-background lg:hidden"
            >
              <div className="flex h-16 items-center justify-between px-5">
                <Logo />
                <button
                  onClick={() => setMobileOpen(false)}
                  className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                  aria-label="Close menu"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3 nov-scroll">
                {NAV.map((n) => {
                  const badge =
                    n.id === "orders" && activeOrders > 0
                      ? String(activeOrders)
                      : n.id === "tickets" && openTickets > 0
                      ? String(openTickets)
                      : n.id === "notifications" && unreadCount > 0
                      ? String(unreadCount)
                      : undefined;
                  return (
                    <NavButton
                      key={n.id}
                      active={dashboardTab === n.id}
                      icon={n.icon}
                      label={n.label}
                      badge={badge}
                      onClick={() => {
                        setDashboardTab(n.id);
                        setMobileOpen(false);
                      }}
                    />
                  );
                })}
                {isAdmin && (
                  <NavButton
                    active={dashboardTab === "admin"}
                    icon={ShieldCheck}
                    label="Admin Panel"
                    onClick={() => {
                      setDashboardTab("admin");
                      setMobileOpen(false);
                    }}
                  />
                )}
              </nav>
              <UserPill
                user={
                  user
                    ? {
                        name: user.name ?? "User",
                        email: user.email ?? "",
                        username: user.username ?? "",
                      }
                    : { name: "", email: "", username: "" }
                }
                onSignOut={handleSignOut}
                onNavigate={(tab) => {
                  setDashboardTab(tab);
                  setMobileOpen(false);
                }}
              />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header
          className={cn(
            "sticky z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6",
            isImpersonating ? "top-12" : "top-0"
          )}
        >
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* search — clicking it opens the command palette */}
          <button
            type="button"
            onClick={openPalette}
            className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground transition-colors hover:border-primary/40 hover:bg-background"
            aria-label="Open command palette"
          >
            <Search className="h-3.5 w-3.5" />
            <span className="w-full text-left text-foreground/80">
              Search orders, services, clients…
            </span>
            <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] sm:inline">
              ⌘K
            </kbd>
          </button>

          {/* status */}
          <div
            className={cn(
              "hidden items-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[11px] font-medium md:flex",
              statusState === "operational"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700"
                : "border-amber-500/30 bg-amber-500/10 text-amber-700"
            )}
          >
            <span className="relative flex h-1.5 w-1.5">
              <span
                className={cn(
                  "nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full",
                  statusState === "operational" ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
              <span
                className={cn(
                  "relative inline-flex h-1.5 w-1.5 rounded-full",
                  statusState === "operational" ? "bg-emerald-500" : "bg-amber-500"
                )}
              />
            </span>
            {statusState === "operational" ? "Operational" : "Degraded"}
          </div>

          <button
            onClick={() => setDashboardTab("notifications")}
            className="relative flex h-11 w-11 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
            aria-label="Notifications"
          >
            <Bell className="h-4 w-4" />
            {unreadCount > 0 && (
              <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-red-500" />
              </span>
            )}
          </button>

          <button
            onClick={() => {
              setBrowsingLanding(true);
              setView("landing");
            }}
            className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
            aria-label="View public landing page (session stays active)"
            title="View landing page — your session stays active"
          >
            <Home className="h-3 w-3" />
            Home
          </button>

          {(() => {
            // Compute avatar initials from the user's name or email instead of
            // the old hardcoded "DR" — falls back to "U" if neither is set.
            const initials = (user?.name || user?.email || "U")
              .replace(/[^a-zA-Z0-9]/g, "")
              .slice(0, 2)
              .toUpperCase();
            return (
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground flex items-center justify-center" aria-label={`Account: ${user?.name ?? user?.email ?? "User"}`}>
                {initials}
              </div>
            );
          })()}
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          {/* Single motion.div with key for re-mount on tab change.
              No AnimatePresence/exit animations — prevents "insertBefore" DOM errors
              when switching tabs rapidly. */}
          <motion.div
            key={dashboardTab}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Command palette (⌘K / Ctrl+K) — keyed by paletteNonce so each open
          remounts with fresh query + selection state. */}
      <CommandPalette
        key={paletteNonce}
        open={paletteOpen}
        onOpenChange={setPaletteOpen}
        isAdmin={isAdmin}
        onNavigate={(tab) => setDashboardTab(tab)}
        onSignOut={handleSignOut}
      />
      </div>
    </div>
  );
}

function NavButton({
  active,
  icon: Icon,
  label,
  badge,
  onClick,
}: {
  active: boolean;
  icon: any;
  label: string;
  badge?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "group relative mb-0.5 flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] font-medium transition-all",
        active
          ? "bg-background text-foreground nov-ring"
          : "text-muted-foreground hover:bg-background/60 hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="nav-active"
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary"
        />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0",
          active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
        )}
      />
      <span className="flex-1 text-left">{label}</span>
      {badge && (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums",
            active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
          )}
        >
          {badge}
        </span>
      )}
    </button>
  );
}

function UserPill({
  user,
  onSignOut,
  onNavigate,
}: {
  user: { name: string; email: string; username: string };
  onSignOut: () => void;
  onNavigate: (tab: DashboardTab) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative m-3">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 rounded-2xl border border-border/60 bg-background p-2.5 text-left transition-colors hover:bg-muted/40"
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground">
          {user.name.split(" ").map((n) => n[0]).join("").slice(0, 2)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-xs font-semibold text-foreground">
            {user.name}
          </div>
          <div className="truncate text-[10px] text-muted-foreground">
            {user.email}
          </div>
        </div>
        <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.97 }}
            transition={{ duration: 0.18 }}
            className="absolute bottom-[60px] left-0 right-0 overflow-hidden rounded-2xl border border-border bg-background p-1 nov-ring-lg"
          >
            <MenuItem
              icon={Settings}
              label="Settings"
              onClick={() => {
                setOpen(false);
                onNavigate("profile");
              }}
            />
            <MenuItem
              icon={ArrowUpRight}
              label="View profile"
              onClick={() => {
                setOpen(false);
                onNavigate("profile");
              }}
            />
            <div className="my-1 h-px bg-border" />
            <MenuItem icon={LogOut} label="Sign out" danger onClick={onSignOut} />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MenuItem({
  icon: Icon,
  label,
  onClick,
  danger,
}: {
  icon: any;
  label: string;
  onClick?: () => void;
  danger?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors",
        danger
          ? "text-destructive hover:bg-destructive/10"
          : "text-foreground hover:bg-muted"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}

// ── Command palette ──────────────────────────────────────────────────────
//
// Built from scratch (cmdk is not installed). Uses the shadcn Dialog +
// Radix primitives + a custom filtered list with full keyboard navigation.

type CommandId =
  | DashboardTab
  | "topup"
  | "withdraw"
  | "new-order"
  | "create-ticket"
  | "sign-out"
  | "toggle-theme";

type Command = {
  id: CommandId;
  label: string;
  group: "Navigation" | "Actions" | "Theme";
  icon: any;
  keywords?: string[];
  danger?: boolean;
};

const ALL_COMMANDS: Command[] = [
  // Navigation
  { id: "home", label: "Home", group: "Navigation", icon: LayoutGrid, keywords: ["dashboard", "overview"] },
  { id: "analytics", label: "Analytics", group: "Navigation", icon: BarChart3, keywords: ["stats", "charts", "reports"] },
  { id: "marketplace", label: "Services", group: "Navigation", icon: Store, keywords: ["marketplace", "buy", "catalog"] },
  { id: "orders", label: "Orders", group: "Navigation", icon: ShoppingCart, keywords: ["history", "purchases"] },
  { id: "subscriptions", label: "Subscriptions", group: "Navigation", icon: CalendarClock, keywords: ["auto", "recurring", "schedule", "subscription", "smm"] },
  { id: "child-panels", label: "Child Panels", group: "Navigation", icon: Globe, keywords: ["white-label", "reseller", "subdomain", "sub-panel", "child"] },
  { id: "wallet", label: "Wallet", group: "Navigation", icon: Wallet, keywords: ["balance", "funds", "transactions"] },
  { id: "tickets", label: "Tickets", group: "Navigation", icon: Ticket, keywords: ["support", "help"] },
  { id: "notifications", label: "Notifications", group: "Navigation", icon: Bell, keywords: ["alerts", "inbox"] },
  { id: "profile", label: "Profile", group: "Navigation", icon: Settings, keywords: ["settings", "account"] },
  { id: "admin", label: "Admin Panel", group: "Navigation", icon: ShieldCheck, keywords: ["admin", "moderation"] },
  // Actions
  { id: "topup", label: "Top up wallet", group: "Actions", icon: Plus, keywords: ["deposit", "add funds", "recharge"] },
  { id: "withdraw", label: "Withdraw funds", group: "Actions", icon: ArrowUpRight, keywords: ["cashout", "payout"] },
  { id: "new-order", label: "New order", group: "Actions", icon: ShoppingCart, keywords: ["buy", "purchase"] },
  { id: "create-ticket", label: "Create ticket", group: "Actions", icon: Ticket, keywords: ["support", "contact"] },
  { id: "sign-out", label: "Sign out", group: "Actions", icon: LogOut, danger: true, keywords: ["logout", "exit"] },
  // Theme
  { id: "toggle-theme", label: "Toggle dark / light", group: "Theme", icon: Sun, keywords: ["dark mode", "light mode", "appearance"] },
];

function CommandPalette({
  open,
  onOpenChange,
  isAdmin,
  onNavigate,
  onSignOut,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  isAdmin: boolean;
  onNavigate: (tab: DashboardTab) => void;
  onSignOut: () => void;
}) {
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Filter + (optionally) hide admin command for non-admins.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = isAdmin ? ALL_COMMANDS : ALL_COMMANDS.filter((c) => c.id !== "admin");
    if (!q) return base;
    return base.filter(
      (c) =>
        c.label.toLowerCase().includes(q) ||
        c.group.toLowerCase().includes(q) ||
        (c.keywords ?? []).some((k) => k.toLowerCase().includes(q))
    );
  }, [query, isAdmin]);

  // Autofocus the input when opening.
  useEffect(() => {
    if (open) {
      const t = setTimeout(() => inputRef.current?.focus(), 30);
      return () => clearTimeout(t);
    }
  }, [open]);

  // Clamp selection against the filtered list (derived, not effect-driven).
  const safeIndex = filtered.length === 0
    ? 0
    : Math.min(activeIndex, filtered.length - 1);

  const run = useCallback(
    (cmd: Command) => {
      switch (cmd.id) {
        case "topup":
        case "withdraw":
        case "orders":
        case "new-order":
          // New order → marketplace; everything else lands on wallet.
          onNavigate(cmd.id === "new-order" ? "marketplace" : "wallet");
          break;
        case "create-ticket":
          onNavigate("tickets");
          break;
        case "sign-out":
          onSignOut();
          break;
        case "toggle-theme": {
          const root = document.documentElement;
          const isDark = root.classList.contains("dark");
          root.classList.toggle("dark", !isDark);
          try {
            localStorage.setItem("novsmm-theme", isDark ? "light" : "dark");
          } catch {}
          break;
        }
        default:
          // Navigation commands
          onNavigate(cmd.id as DashboardTab);
      }
      onOpenChange(false);
    },
    [onNavigate, onOpenChange, onSignOut]
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const cmd = filtered[safeIndex];
      if (cmd) run(cmd);
    } else if (e.key === "Escape") {
      e.preventDefault();
      onOpenChange(false);
    }
  };

  // Group filtered commands for rendering with headings.
  const groups = useMemo(() => {
    const map = new Map<Command["group"], Command[]>();
    for (const c of filtered) {
      if (!map.has(c.group)) map.set(c.group, []);
      map.get(c.group)!.push(c);
    }
    return map;
  }, [filtered]);

  // Track the absolute (flat) index for keyboard navigation while rendering
  // grouped sections.
  let flatIndex = -1;

  // Reset query + selection when the palette opens, without an effect.
  // We do this by keying the inner content off the open state, so a fresh
  // open always shows an empty input.
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="max-w-xl gap-0 overflow-hidden p-0 sm:max-w-xl"
      >
        <DialogTitle className="sr-only">Command palette</DialogTitle>
        <DialogDescription className="sr-only">
          Search commands and navigate the dashboard.
        </DialogDescription>

        {/* Search input */}
        <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Type a command or search…"
            className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="hidden shrink-0 rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground sm:inline">
            Esc
          </kbd>
        </div>

        {/* Command list */}
        <div
          ref={listRef}
          className="max-h-[60vh] overflow-y-auto p-2 nov-scroll"
        >
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              No commands match &ldquo;{query}&rdquo;
            </div>
          ) : (
            Array.from(groups.entries()).map(([group, cmds]) => (
              <div key={group} className="mb-1.5">
                <div className="px-2 py-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
                  {group}
                </div>
                {cmds.map((cmd) => {
                  flatIndex += 1;
                  const isActive = flatIndex === safeIndex;
                  const Icon = cmd.icon;
                  return (
                    <button
                      key={`${group}-${cmd.id}`}
                      type="button"
                      onMouseMove={() => setActiveIndex(flatIndex)}
                      onClick={() => run(cmd)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg px-2.5 py-2.5 text-left text-sm transition-colors",
                        isActive
                          ? "bg-primary/10 text-foreground"
                          : "text-foreground/90 hover:bg-muted/60",
                        cmd.danger && "text-destructive"
                      )}
                    >
                      <span
                        className={cn(
                          "flex h-7 w-7 items-center justify-center rounded-md",
                          cmd.danger
                            ? "bg-destructive/10 text-destructive"
                            : isActive
                            ? "bg-primary/15 text-primary"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-3.5 w-3.5" />
                      </span>
                      <span className="flex-1">{cmd.label}</span>
                      {cmd.id === "toggle-theme" && (
                        <Moon className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {isActive && (
                        <CornerDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </div>

        {/* Footer / keyboard hints */}
        <div className="flex items-center justify-between gap-3 border-t border-border/60 bg-muted/30 px-4 py-2.5 text-[10px] text-muted-foreground">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↑</kbd>
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↓</kbd>
              <ArrowUp className="inline h-3 w-3" />
              <ArrowDown className="inline h-3 w-3" /> navigate
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">↵</kbd>
              select
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-border bg-background px-1.5 py-0.5">Esc</kbd>
              close
            </span>
          </div>
          <span className="inline-flex items-center gap-1">
            <kbd className="rounded border border-border bg-background px-1.5 py-0.5">⌘K</kbd>
            toggle
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}

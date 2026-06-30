"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, type ReactNode } from "react";
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
  ArrowLeft,
} from "lucide-react";
import { useApp, type DashboardTab } from "./app-store";
import { Logo } from "./logo";
import { cn } from "@/lib/utils";

const NAV: { id: DashboardTab; label: string; icon: any; badge?: string }[] = [
  { id: "home", label: "Dashboard", icon: LayoutGrid },
  { id: "analytics", label: "Analytics", icon: BarChart3 },
  { id: "marketplace", label: "Marketplace", icon: Store },
  { id: "orders", label: "Orders", icon: ShoppingCart, badge: "12" },
  { id: "wallet", label: "Wallet", icon: Wallet },
  { id: "tickets", label: "Tickets", icon: Ticket, badge: "2" },
  { id: "notifications", label: "Notifications", icon: Bell, badge: "5" },
];

export function DashboardShell({ children }: { children: ReactNode }) {
  const { dashboardTab, setDashboardTab, user, signOut, setView } = useApp();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="relative flex min-h-screen bg-background">
      {/* Sidebar — desktop */}
      <aside className="sticky top-0 hidden h-screen w-[248px] shrink-0 flex-col border-r border-border/60 bg-muted/30 lg:flex">
        <div className="flex h-16 items-center justify-between px-5">
          <a onClick={() => setView("landing")} className="cursor-pointer">
            <Logo />
          </a>
        </div>

        <nav className="flex-1 overflow-y-auto px-3 py-3 nov-scroll">
          <div className="px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Workspace
          </div>
          {NAV.map((n) => (
            <NavButton
              key={n.id}
              active={dashboardTab === n.id}
              icon={n.icon}
              label={n.label}
              badge={n.badge}
              onClick={() => setDashboardTab(n.id)}
            />
          ))}

          <div className="mt-5 px-2 pb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Admin
          </div>
          <NavButton
            active={dashboardTab === "admin"}
            icon={ShieldCheck}
            label="Admin Panel"
            onClick={() => setDashboardTab("admin")}
          />
        </nav>

        {/* wallet mini */}
        <div className="m-3 rounded-2xl border border-border/60 bg-background p-4">
          <div className="flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Available balance</span>
            <span className="text-emerald-600">+12.4%</span>
          </div>
          <div className="mt-1 text-xl font-semibold tabular-nums">$8,420.50</div>
          <button className="mt-3 flex w-full items-center justify-center gap-1 rounded-lg bg-primary py-2 text-[12px] font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
            <Plus className="h-3.5 w-3.5" /> Top up
          </button>
        </div>

        {/* user */}
        <UserPill user={user} onSignOut={signOut} />
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
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <nav className="flex-1 overflow-y-auto px-3 py-3 nov-scroll">
                {NAV.map((n) => (
                  <NavButton
                    key={n.id}
                    active={dashboardTab === n.id}
                    icon={n.icon}
                    label={n.label}
                    badge={n.badge}
                    onClick={() => {
                      setDashboardTab(n.id);
                      setMobileOpen(false);
                    }}
                  />
                ))}
                <NavButton
                  active={dashboardTab === "admin"}
                  icon={ShieldCheck}
                  label="Admin Panel"
                  onClick={() => {
                    setDashboardTab("admin");
                    setMobileOpen(false);
                  }}
                />
              </nav>
              <UserPill user={user} onSignOut={signOut} />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topbar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border/60 bg-background/80 px-4 backdrop-blur-xl sm:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted lg:hidden"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* search */}
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-muted/40 px-3.5 py-2 text-sm text-muted-foreground transition-colors focus-within:border-primary/40 focus-within:bg-background">
            <Search className="h-3.5 w-3.5" />
            <input
              placeholder="Search orders, services, clients…"
              className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
            />
            <kbd className="hidden rounded border border-border bg-background px-1.5 text-[10px] sm:inline">
              ⌘K
            </kbd>
          </div>

          {/* status */}
          <div className="hidden items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1.5 text-[11px] font-medium text-emerald-700 md:flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="nov-pulse-dot absolute inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
            </span>
            Operational
          </div>

          <button className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
            </span>
          </button>

          <button
            onClick={() => setView("landing")}
            className="hidden items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground sm:flex"
          >
            <ArrowLeft className="h-3 w-3" />
            Exit
          </button>

          <div className="h-8 w-8 rounded-full bg-gradient-to-br from-primary to-primary/60 text-xs font-semibold text-primary-foreground flex items-center justify-center">
            DR
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-x-hidden p-4 sm:p-6 lg:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={dashboardTab}
              initial={{ opacity: 0, y: 12, filter: "blur(6px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
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
}: {
  user: { name: string; email: string; username: string };
  onSignOut: () => void;
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
            <MenuItem icon={Settings} label="Settings" />
            <MenuItem icon={ArrowUpRight} label="View profile" />
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

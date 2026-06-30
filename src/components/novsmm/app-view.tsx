"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useEffect, type ReactNode } from "react";
import { useSession } from "@/hooks/use-api";
import { useApp } from "./app-store";
import { LoginScreen } from "./login-screen";
import { RegisterScreen } from "./register-screen";
import { OnboardingScreen } from "./onboarding-screen";
import { DashboardShell } from "./dashboard-shell";
import { DashboardHome } from "./dashboard-home";
import { DashboardAnalytics } from "./dashboard-analytics";
import { DashboardMarketplace } from "./dashboard-marketplace";
import { DashboardOrders } from "./dashboard-orders";
import { DashboardWallet } from "./dashboard-wallet";
import { DashboardTickets } from "./dashboard-tickets";
import { DashboardNotifications } from "./dashboard-notifications";
import { AdminPanel } from "./admin-panel";

/**
 * Top-level view router — now driven by the REAL NextAuth session.
 *
 * If the user has an active session, they're taken to the dashboard
 * regardless of which view the store says (unless they're in the middle
 * of onboarding). If no session, they see landing/login/register.
 */
export function AppView({ landing }: { landing: ReactNode }) {
  const { data: session, isLoading } = useSession();
  const { view, dashboardTab, setAuthed, setAuthLoading, setView, authed } = useApp();

  // Sync auth state with session
  useEffect(() => {
    setAuthLoading(isLoading);
    const isAuthed = !!session?.user;
    if (isAuthed !== authed) {
      setAuthed(isAuthed, session?.user as any);
    }
    // If session exists but we're on landing/login/register, go to dashboard
    if (isAuthed && view === "landing") {
      setView("dashboard");
    }
    // If no session and we're on dashboard/onboarding, go to landing
    if (!isAuthed && !isLoading && (view === "dashboard" || view === "onboarding")) {
      setView("landing");
    }
  }, [session, isLoading, view, authed, setAuthed, setAuthLoading, setView]);

  return (
    <AnimatePresence mode="wait">
      {/* Authed → dashboard (unless in onboarding) */}
      {session?.user && view !== "onboarding" && (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        >
          <DashboardShell>
            {dashboardTab === "home" && <DashboardHome />}
            {dashboardTab === "analytics" && <DashboardAnalytics />}
            {dashboardTab === "marketplace" && <DashboardMarketplace />}
            {dashboardTab === "orders" && <DashboardOrders />}
            {dashboardTab === "wallet" && <DashboardWallet />}
            {dashboardTab === "tickets" && <DashboardTickets />}
            {dashboardTab === "notifications" && <DashboardNotifications />}
            {dashboardTab === "admin" && <AdminPanel />}
          </DashboardShell>
        </motion.div>
      )}

      {/* Onboarding (authed but in onboarding flow) */}
      {session?.user && view === "onboarding" && <OnboardingScreen />}

      {/* Not authed → landing/login/register */}
      {!session?.user && (
        <motion.div
          key={view}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {view === "login" && <LoginScreen />}
          {view === "register" && <RegisterScreen />}
          {(view === "landing" || (!session && isLoading)) && landing}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

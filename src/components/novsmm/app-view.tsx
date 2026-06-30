"use client";

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
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
 * Top-level view router.
 *
 * The platform constraint is "only the / route is visible", so the entire
 * auth + dashboard flow is a single-page app driven by the Zustand store.
 * Transitions are instant (no reloads, no flashes) with shared motion —
 * exactly as the master prompt requires.
 */
export function AppView({ landing }: { landing: ReactNode }) {
  const { view, dashboardTab } = useApp();

  return (
    <AnimatePresence mode="wait">
      {view === "landing" && (
        <motion.div
          key="landing"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
        >
          {landing}
        </motion.div>
      )}

      {view === "login" && <LoginScreen />}
      {view === "register" && <RegisterScreen />}
      {view === "onboarding" && <OnboardingScreen />}

      {view === "dashboard" && (
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
    </AnimatePresence>
  );
}

"use client";

import { create } from "zustand";
import { useSession } from "@/hooks/use-api";

/**
 * NOVSMM app view-state store.
 *
 * The `authed` state is now driven by the real NextAuth session (via
 * useSession in the AppView component). The store holds the navigation
 * state (which view/tab is active) and the onboarding step.
 */

export type AppView =
  | "landing"
  | "login"
  | "register"
  | "onboarding"
  | "dashboard";

export type DashboardTab =
  | "home"
  | "analytics"
  | "marketplace"
  | "orders"
  | "wallet"
  | "tickets"
  | "notifications"
  | "profile"
  | "admin";

export type AdminTab =
  | "overview"
  | "users"
  | "orders"
  | "services"
  | "providers"
  | "payments"
  | "promotions"
  | "apiKeys"
  | "licenses"
  | "currencies"
  | "languages"
  | "webhooks"
  | "withdrawals"
  | "refunds"
  | "settings"
  | "security"
  | "roles"
  | "socialAuth"
  | "version";

type AppState = {
  view: AppView;
  dashboardTab: DashboardTab;
  adminTab: AdminTab;
  authed: boolean;
  authLoading: boolean;
  onboardingStep: number;
  /** When true, an authenticated user is browsing the public landing page
   *  without signing out. The session stays active — they can return to the
   *  dashboard at any time via the "Back to dashboard" floating button. */
  browsingLanding: boolean;
  user: {
    name: string;
    username: string;
    email: string;
    role: string;
  } | null;
  setView: (v: AppView) => void;
  setDashboardTab: (t: DashboardTab) => void;
  setAdminTab: (t: AdminTab) => void;
  setOnboardingStep: (n: number) => void;
  setAuthed: (a: boolean, user?: AppState["user"]) => void;
  setAuthLoading: (b: boolean) => void;
  setBrowsingLanding: (b: boolean) => void;
  signIn: () => void;
  signOut: () => void;
};

export const useApp = create<AppState>((set) => ({
  view: "landing",
  dashboardTab: "home",
  adminTab: "overview",
  authed: false,
  authLoading: true,
  onboardingStep: 0,
  browsingLanding: false,
  user: null,

  setView: (v) => set({ view: v }),
  setDashboardTab: (t) => set({ dashboardTab: t }),
  setAdminTab: (t) => set({ adminTab: t }),
  setOnboardingStep: (n) => set({ onboardingStep: n }),
  setAuthed: (a, user) => set({ authed: a, user: user ?? null }),
  setAuthLoading: (b) => set({ authLoading: b }),
  setBrowsingLanding: (b) => set({ browsingLanding: b }),
  signIn: () => set({ authed: true, view: "dashboard", browsingLanding: false }),
  signOut: () =>
    set({
      authed: false,
      user: null,
      view: "landing",
      dashboardTab: "home",
      onboardingStep: 0,
      browsingLanding: false,
    }),
}));

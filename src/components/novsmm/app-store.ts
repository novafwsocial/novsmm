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
  | "admin";

export type AdminTab =
  | "overview"
  | "users"
  | "services"
  | "providers"
  | "payments"
  | "apiKeys"
  | "licenses"
  | "currencies"
  | "languages"
  | "webhooks"
  | "withdrawals"
  | "settings"
  | "security"
  | "roles";

type AppState = {
  view: AppView;
  dashboardTab: DashboardTab;
  adminTab: AdminTab;
  authed: boolean;
  authLoading: boolean;
  onboardingStep: number;
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
  signOut: () => void;
};

export const useApp = create<AppState>((set) => ({
  view: "landing",
  dashboardTab: "home",
  adminTab: "overview",
  authed: false,
  authLoading: true,
  onboardingStep: 0,
  user: null,

  setView: (v) => set({ view: v }),
  setDashboardTab: (t) => set({ dashboardTab: t }),
  setAdminTab: (t) => set({ adminTab: t }),
  setOnboardingStep: (n) => set({ onboardingStep: n }),
  setAuthed: (a, user) => set({ authed: a, user: user ?? null }),
  setAuthLoading: (b) => set({ authLoading: b }),
  signOut: () =>
    set({
      authed: false,
      user: null,
      view: "landing",
      dashboardTab: "home",
      onboardingStep: 0,
    }),
}));

"use client";

import { create } from "zustand";

/**
 * NOVSMM app view-state store.
 *
 * Because the platform constraint is "only the / route is visible", the entire
 * auth + dashboard flow lives as a single-page app driven by this store.
 * This actually matches the master-prompt requirement perfectly:
 *   "Sin recargas. Sin pantallas vacías. Sin flashes. Utilizar animaciones compartidas."
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
  | "security"
  | "roles";

type AppState = {
  view: AppView;
  dashboardTab: DashboardTab;
  adminTab: AdminTab;
  authed: boolean;
  onboardingStep: number;
  user: {
    name: string;
    username: string;
    email: string;
    country: string;
    currency: string;
    language: string;
    role: "user" | "admin";
  };
  // navigation
  setView: (v: AppView) => void;
  setDashboardTab: (t: DashboardTab) => void;
  setAdminTab: (t: AdminTab) => void;
  setOnboardingStep: (n: number) => void;
  signIn: () => void;
  signOut: () => void;
  goDashboard: () => void;
  goAdmin: () => void;
};

export const useApp = create<AppState>((set) => ({
  view: "landing",
  dashboardTab: "home",
  adminTab: "overview",
  authed: false,
  onboardingStep: 0,
  user: {
    name: "Daniela Ríos",
    username: "@daniela",
    email: "daniela@pulsemedia.io",
    country: "Mexico",
    currency: "USD",
    language: "English",
    role: "admin",
  },

  setView: (v) => set({ view: v }),
  setDashboardTab: (t) => set({ dashboardTab: t }),
  setAdminTab: (t) => set({ adminTab: t }),
  setOnboardingStep: (n) => set({ onboardingStep: n }),
  signIn: () => set({ authed: true, view: "dashboard", dashboardTab: "home" }),
  signOut: () =>
    set({
      authed: false,
      view: "landing",
      dashboardTab: "home",
      onboardingStep: 0,
    }),
  goDashboard: () => set({ view: "dashboard", dashboardTab: "home" }),
  goAdmin: () => set({ view: "dashboard", dashboardTab: "admin" }),
}));

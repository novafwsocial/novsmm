"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

// ── Auth ──
// Custom session fetch via TanStack Query instead of NextAuth's useSession
// to avoid CLIENT_FETCH_ERROR when behind reverse proxy (Caddy gateway)
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/auth/session", {
          credentials: "include",
          headers: { "Content-Type": "application/json" },
        });
        if (!res.ok) return { user: null };
        const data = await res.json();
        return data;
      } catch {
        return { user: null };
      }
    },
    staleTime: 30 * 1000,
    retry: false,
  });
}

// ── Dashboard ──
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<any>("/api/dashboard"),
    refetchInterval: 30 * 1000, // 30s — reduced from 10s for performance
  });
}

// ── Orders ──
export function useOrders(status?: string, search?: string) {
  const params = new URLSearchParams();
  if (status) params.set("status", status);
  if (search) params.set("search", search);
  const q = params.toString();
  return useQuery({
    queryKey: ["orders", status, search],
    queryFn: () => api.get<{ orders: any[] }>(`/api/orders${q ? `?${q}` : ""}`),
    refetchInterval: 30 * 1000, // 30s — reduced from 5s
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { serviceId: string; quantity: number; link?: string }) =>
      api.post<{ order: any; message: string }>("/api/orders", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Order placed", description: data.message });
    },
    onError: (e: Error) => {
      toast({ title: "Order failed", description: e.message, variant: "destructive" });
    },
  });
}

// ── Services (paginated) ──
export function useServices(params?: {
  platform?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const p = new URLSearchParams();
  if (params?.platform && params.platform !== "All")
    p.set("platform", params.platform);
  if (params?.search) p.set("search", params.search);
  if (params?.page) p.set("page", String(params.page));
  if (params?.limit) p.set("limit", String(params.limit));
  const q = p.toString();
  return useQuery({
    queryKey: ["services", params?.platform, params?.search, params?.page],
    queryFn: () =>
      api.get<{ services: any[]; pagination: any }>(
        `/api/services${q ? `?${q}` : ""}`
      ),
    keepPreviousData: true,
  });
}

// ── All services (for sell tab dropdown — lightweight, no pagination) ──
export function useAllServices(search?: string) {
  const q = search ? `?search=${search}&limit=60` : "?limit=60";
  return useQuery({
    queryKey: ["all-services", search],
    queryFn: () => api.get<{ services: any[] }>(`/api/services${q}`),
  });
}

// ── Wallet ──
export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<any>("/api/wallet"),
    refetchInterval: 30 * 1000, // 30s — reduced from 10s
  });
}

export function useTopup() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { amount: number; method: string }) =>
      api.post<{ message: string; transaction: any }>("/api/wallet/topup", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["notifications"] });
      toast({ title: "Top-up successful", description: data.message });
    },
    onError: (e: Error) => {
      toast({ title: "Top-up failed", description: e.message, variant: "destructive" });
    },
  });
}

export function useWithdraw() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { amount: number; method: string; destination: string }) =>
      api.post<{ message: string }>("/api/wallet/withdraw", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast({ title: "Withdrawal requested", description: data.message });
    },
    onError: (e: Error) => {
      toast({ title: "Withdrawal failed", description: e.message, variant: "destructive" });
    },
  });
}

// ── Payment methods ──
export function usePaymentMethods() {
  return useQuery({
    queryKey: ["payment-methods"],
    queryFn: () => api.get<{ methods: any[] }>("/api/payment-methods"),
  });
}

// ── Notifications ──
export function useNotifications() {
  return useQuery({
    queryKey: ["notifications"],
    queryFn: () => api.get<{ notifications: any[]; unreadCount: number }>(
      "/api/notifications"
    ),
    refetchInterval: 15 * 1000, // 15s — reduced from 5s (WebSocket handles real-time)
  });
}

// ── Tickets ──
export function useTickets() {
  return useQuery({
    queryKey: ["tickets"],
    queryFn: () => api.get<{ tickets: any[] }>("/api/tickets"),
  });
}

export function useCreateTicket() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { subject: string; message: string; priority?: string }) =>
      api.post<{ ticket: any; message: string }>("/api/tickets", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      toast({ title: "Ticket created", description: data.message });
    },
  });
}

export function useReplyTicket() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { ticketId: string; text: string }) =>
      api.patch<{ message: any }>("/api/tickets", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
    },
  });
}

// ── Admin ──
export function useAdminOverview() {
  return useQuery({
    queryKey: ["admin-overview"],
    queryFn: () => api.get<any>("/api/admin/overview"),
    refetchInterval: 60 * 1000, // 60s — reduced from 15s
  });
}

export function useAdminUsers() {
  return useQuery({
    queryKey: ["admin-users"],
    queryFn: () => api.get<{ users: any[] }>("/api/admin/users"),
  });
}

export function useAdminServices() {
  return useQuery({
    queryKey: ["admin-services"],
    queryFn: () => api.get<{ services: any[] }>("/api/admin/services"),
  });
}

export function useAdminProviders() {
  return useQuery({
    queryKey: ["admin-providers"],
    queryFn: () => api.get<{ providers: any[] }>("/api/admin/providers"),
  });
}

export function useAdminPaymentMethods() {
  return useQuery({
    queryKey: ["admin-payment-methods"],
    queryFn: () => api.get<{ methods: any[] }>("/api/admin/payment-methods"),
  });
}

export function useCreateService() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/services", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-services"] });
      qc.invalidateQueries({ queryKey: ["services"] });
      toast({ title: "Service created" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useCreateProvider() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/providers", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-providers"] });
      toast({ title: "Provider added" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useCreatePaymentMethod() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/payment-methods", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
      toast({ title: "Payment method added" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useUpdatePaymentMethod() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/admin/payment-methods", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-payment-methods"] });
      qc.invalidateQueries({ queryKey: ["payment-methods"] });
    },
  });
}

export function useBroadcastNotification() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/notifications", data),
    onSuccess: (data: any) => toast({ title: "Sent", description: data.message }),
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

export function useUpdateUser() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/admin/users", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      toast({ title: "User updated" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: Currencies ──
export function useAdminCurrencies() {
  return useQuery({
    queryKey: ["admin-currencies"],
    queryFn: () => api.get<{ currencies: any[] }>("/api/admin/currencies"),
  });
}
export function useCreateCurrency() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/currencies", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-currencies"] }); toast({ title: "Currency added" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useUpdateCurrency() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/admin/currencies", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-currencies"] }); toast({ title: "Currency updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: Languages ──
export function useAdminLanguages() {
  return useQuery({
    queryKey: ["admin-languages"],
    queryFn: () => api.get<{ languages: any[] }>("/api/admin/languages"),
  });
}
export function useCreateLanguage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/languages", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-languages"] }); toast({ title: "Language added" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useUpdateLanguage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/admin/languages", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-languages"] }); toast({ title: "Language updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: API Keys ──
export function useAdminApiKeys() {
  return useQuery({
    queryKey: ["admin-api-keys"],
    queryFn: () => api.get<{ apiKeys: any[] }>("/api/admin/api-keys"),
  });
}
export function useCreateApiKey() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post<{ key: string; apiKey: any }>("/api/admin/api-keys", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["admin-api-keys"] });
      toast({ title: "API key created", description: "Copy the key now — it won't be shown again." });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useRevokeApiKey() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { id: string; action: "revoke" }) => api.patch("/api/admin/api-keys", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-api-keys"] }); toast({ title: "API key revoked" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: Licenses ──
export function useAdminLicenses() {
  return useQuery({
    queryKey: ["admin-licenses"],
    queryFn: () => api.get<{ licenses: any[] }>("/api/admin/licenses"),
  });
}
export function useCreateLicense() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post<{ licenseKey: string; license: any }>("/api/admin/licenses", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-licenses"] });
      toast({ title: "License issued", description: "Copy the key — it won't be shown again." });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useUpdateLicense() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/admin/licenses", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-licenses"] }); toast({ title: "License updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: Withdrawals ──
export function useAdminWithdrawals(status = "pending") {
  return useQuery({
    queryKey: ["admin-withdrawals", status],
    queryFn: () => api.get<{ withdrawals: any[] }>(`/api/admin/withdrawals?status=${status}`),
  });
}
export function useProcessWithdrawal() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { id: string; action: "approve" | "reject" }) => api.patch("/api/admin/withdrawals", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-withdrawals"] });
      toast({ title: "Withdrawal processed" });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: Webhooks ──
export function useAdminWebhooks() {
  return useQuery({
    queryKey: ["admin-webhooks"],
    queryFn: () => api.get<{ webhooks: any[] }>("/api/admin/webhooks?limit=50"),
  });
}

// ── Admin: Settings ──
export function useAdminSettings() {
  return useQuery({
    queryKey: ["admin-settings"],
    queryFn: () => api.get<{ settings: Record<string, string> }>("/api/admin/settings"),
  });
}
export function useUpdateSettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: Record<string, string>) => api.patch("/api/admin/settings", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); toast({ title: "Settings updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Service detail ──
export function useServiceDetail(id?: string) {
  return useQuery({
    queryKey: ["service", id],
    queryFn: () => api.get<{ service: any }>(`/api/services/${id}`),
    enabled: !!id,
  });
}

// ── Analytics ──
export function useAnalytics() {
  return useQuery({
    queryKey: ["analytics"],
    queryFn: () => api.get<any>("/api/analytics"),
    refetchInterval: 60 * 1000, // 60s — reduced from 30s
  });
}

// ── Update profile (currency/language) ──
export function useUpdateProfile() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.patch<{ user: any; message: string }>("/api/me", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["session"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      toast({ title: "Profile updated", description: data.message });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Repeat order ──
export function useRepeatOrder() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { orderId: string; link?: string }) =>
      api.post<{ order: any; message: string }>("/api/orders/repeat", data),
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
      toast({ title: "Order repeated", description: data.message });
    },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Public currencies (for conversion) ──
export function usePublicCurrencies() {
  return useQuery({
    queryKey: ["public-currencies"],
    queryFn: () => api.get<{ currencies: any[] }>("/api/public/currencies"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// ── Public languages ──
export function usePublicLanguages() {
  return useQuery({
    queryKey: ["public-languages"],
    queryFn: () => api.get<{ languages: any[] }>("/api/public/languages"),
    staleTime: 5 * 60 * 1000,
  });
}

// ── Offers (marketplace sell) ──
export function useOffers() {
  return useQuery({
    queryKey: ["offers"],
    queryFn: () => api.get<{ offers: any[]; totalEarnings: number; totalSales: number }>("/api/offers"),
  });
}
export function useCreateOffer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { serviceId: string; price: number }) =>
      api.post("/api/offers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); toast({ title: "Offer published" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useUpdateOffer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.patch("/api/offers", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); toast({ title: "Offer updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useDeleteOffer() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/offers?id=${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["offers"] }); toast({ title: "Offer removed" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Admin: Roles & Permissions ──
export function useAdminRoles() {
  return useQuery({
    queryKey: ["admin-roles"],
    queryFn: () => api.get<{ roles: any[]; resources: string[]; actions: string[] }>("/api/admin/roles"),
  });
}
export function useCreateRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: any) => api.post("/api/admin/roles", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); toast({ title: "Role created" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useUpdateRolePermissions() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (data: { roleId: string; permissions: { resource: string; actions: string }[] }) =>
      api.patch("/api/admin/roles", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); toast({ title: "Permissions updated" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useDeleteRole() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/roles?id=${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["admin-roles"] }); toast({ title: "Role deleted" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}

// ── Favorites ──
export function useFavorites() {
  return useQuery({
    queryKey: ["favorites"],
    queryFn: () => api.get<{ favorites: any[] }>("/api/favorites"),
  });
}
export function useAddFavorite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (serviceId: string) => api.post("/api/favorites", { serviceId }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["favorites"] }),
  });
}
export function useRemoveFavorite() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (serviceId: string) => api.delete(`/api/favorites?serviceId=${serviceId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["favorites"] }); toast({ title: "Removed from favorites" }); },
  });
}

// ── Subscriptions ──
export function useSubscriptions() {
  return useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => api.get<{ subscription: any; plans: any[] }>("/api/subscriptions"),
  });
}
export function useCreateSubscription() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: (planId: string) => api.post("/api/subscriptions", { planId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); toast({ title: "Subscribed!" }); },
    onError: (e: Error) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });
}
export function useCancelSubscription() {
  const qc = useQueryClient();
  const { toast } = useToast();
  return useMutation({
    mutationFn: () => api.delete("/api/subscriptions"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subscriptions"] }); toast({ title: "Subscription canceled" }); },
  });
}

// ── Referrals ──
export function useReferrals() {
  return useQuery({
    queryKey: ["referrals"],
    queryFn: () => api.get<any>("/api/referrals"),
  });
}

// ── Invoices ──
export function useInvoices() {
  return useQuery({
    queryKey: ["invoices"],
    queryFn: () => api.get<{ invoices: any[] }>("/api/invoices"),
  });
}

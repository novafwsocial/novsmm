"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";

// ── Auth ──
export function useSession() {
  return useQuery({
    queryKey: ["session"],
    queryFn: () => api.get<{ user?: any }>("/api/auth/session"),
    staleTime: 30 * 1000,
  });
}

// ── Dashboard ──
export function useDashboard() {
  return useQuery({
    queryKey: ["dashboard"],
    queryFn: () => api.get<any>("/api/dashboard"),
    refetchInterval: 10 * 1000, // near-real-time
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
    refetchInterval: 5 * 1000,
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

// ── Services ──
export function useServices(platform?: string) {
  const q = platform ? `?platform=${platform}` : "";
  return useQuery({
    queryKey: ["services", platform],
    queryFn: () => api.get<{ services: any[] }>(`/api/services${q}`),
  });
}

// ── Wallet ──
export function useWallet() {
  return useQuery({
    queryKey: ["wallet"],
    queryFn: () => api.get<any>("/api/wallet"),
    refetchInterval: 10 * 1000,
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
    refetchInterval: 5 * 1000,
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
    refetchInterval: 15 * 1000,
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

"use client";

import { useState, useEffect } from "react";
import {
  Ban,
  CheckCircle2,
  ShieldCheck,
  LogIn,
  X,
  Loader2,
  Search,
} from "lucide-react";
import { signIn, useSession as useNextAuthSession } from "next-auth/react";
import {
  useAdminUsers,
  useUpdateUser,
  useBulkAction,
  useAdminSearch,
} from "@/hooks/use-api";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { IconBtn } from "./shared";

export function AdminUsers() {
  const { data } = useAdminUsers();
  const updateUser = useUpdateUser();
  const bulkAction = useBulkAction();
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [impersonateTarget, setImpersonateTarget] = useState<any | null>(null);

  // Debounce search input 300ms
  useEffect(() => {
    const t = setTimeout(() => setDebounced(query.trim()), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Trigger admin search when debounced query is non-empty
  const search = useAdminSearch(debounced);
  const searching = debounced.length >= 2;
  const searchUsers = search.data?.users ?? [];
  const fallbackUsers = data?.users ?? [];
  const users = searching ? searchUsers : fallbackUsers;

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const toggleSelectAll = () => {
    if (selected.size === users.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(users.map((u: any) => u.id)));
    }
  };

  const runBulk = (action: "suspend" | "activate" | "promote" | "delete") => {
    if (selected.size === 0) return;
    // C-2 fix: Confirm destructive bulk actions before executing
    const actionLabels: Record<string, string> = {
      suspend: "suspend",
      activate: "activate",
      promote: "promote to admin",
      delete: "DELETE (suspend)",
    };
    const verb = actionLabels[action] || action;
    if (!window.confirm(`Are you sure you want to ${verb} ${selected.size} user(s)? This action cannot be undone.`)) {
      return;
    }
    const ids = Array.from(selected);
    bulkAction.mutate(
      { entity: "user", action, ids },
      { onSuccess: () => setSelected(new Set()) }
    );
  };

  return (
    <Reveal blur>
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search users by name, email, role…"
            className="w-full bg-transparent focus:outline-none"
          />
          {query && (
            <button
              onClick={() => { setQuery(""); setSelected(new Set()); }}
              className="text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
          {searching && search.isFetching && (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
          )}
        </div>

        {selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-primary/30 bg-primary/[0.04] px-4 py-3">
            <span className="text-xs font-semibold text-primary">{selected.size} selected</span>
            <div className="ml-auto flex flex-wrap gap-2">
              <button onClick={() => runBulk("suspend")} disabled={bulkAction.isPending} className="rounded-lg bg-amber-500/10 px-3 py-1.5 text-xs font-medium text-amber-700 hover:bg-amber-500/20 disabled:opacity-60">
                Suspend {selected.size}
              </button>
              <button onClick={() => runBulk("activate")} disabled={bulkAction.isPending} className="rounded-lg bg-emerald-500/10 px-3 py-1.5 text-xs font-medium text-emerald-700 hover:bg-emerald-500/20 disabled:opacity-60">
                Activate {selected.size}
              </button>
              <button onClick={() => runBulk("promote")} disabled={bulkAction.isPending} className="rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-60">
                Promote {selected.size} to admin
              </button>
              <button onClick={() => runBulk("delete")} disabled={bulkAction.isPending} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-500/20 disabled:opacity-60">
                Delete {selected.size}
              </button>
              <button onClick={() => setSelected(new Set())} className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted">
                Clear
              </button>
            </div>
          </div>
        )}

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
          <div className="overflow-x-auto nov-scroll">
            <table className="w-full text-sm">
              <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium w-10">
                    <input
                      type="checkbox"
                      checked={users.length > 0 && selected.size === users.length}
                      onChange={toggleSelectAll}
                      className="h-3.5 w-3.5 rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left font-medium">User</th>
                  <th className="px-4 py-3 text-left font-medium">Role</th>
                  <th className="px-4 py-3 text-right font-medium">Balance</th>
                  <th className="px-4 py-3 text-right font-medium">Orders</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Joined</th>
                  <th className="px-4 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {users.map((u: any) => (
                  <tr key={u.id} className={cn("transition-colors hover:bg-muted/30", selected.has(u.id) && "bg-primary/[0.04]")}>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selected.has(u.id)}
                        onChange={() => toggleSelect(u.id)}
                        className="h-3.5 w-3.5 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-primary to-primary/60 text-[10px] font-semibold text-primary-foreground">
                          {(u.name ?? "?").split(" ").map((n: string) => n[0]).join("").slice(0, 2)}
                        </div>
                        <div>
                          <div className="font-medium text-foreground">{u.name}</div>
                          <div className="text-[11px] text-muted-foreground">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><RoleBadge role={u.role} /></td>
                    <td className="px-4 py-3 text-right tabular-nums">${(u.balance ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right tabular-nums text-muted-foreground">{(u._count?.orders ?? 0).toLocaleString()}</td>
                    <td className="px-4 py-3"><UserStatus status={u.status} /></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString() : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {u.status === "active" ? (
                          <IconBtn
                            icon={Ban}
                            danger
                            onClick={() => updateUser.mutate({ id: u.id, status: "suspended" })}
                          />
                        ) : (
                          <IconBtn
                            icon={CheckCircle2}
                            onClick={() => updateUser.mutate({ id: u.id, status: "active" })}
                          />
                        )}
                        <IconBtn
                          icon={ShieldCheck}
                          onClick={() => updateUser.mutate({ id: u.id, role: "admin" })}
                        />
                        {/* Impersonate — admin-only, active non-admin users only */}
                        {u.status === "active" && u.role !== "admin" && (
                          <button
                            onClick={() => setImpersonateTarget(u)}
                            title={`Impersonate ${u.name}`}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-amber-500/10 hover:text-amber-600"
                          >
                            <LogIn className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">
                      {searching ? `No users match “${debounced}”` : "No users found"}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {impersonateTarget && (
        <ImpersonateModal
          user={impersonateTarget}
          onClose={() => setImpersonateTarget(null)}
        />
      )}
    </Reveal>
  );
}

/**
 * Impersonation modal — prompts the admin for their password, then
 * triggers `signIn("impersonate", ...)` to mint a new session for the
 * target user. The page reloads on success.
 */
export function ImpersonateModal({ user, onClose }: { user: any; onClose: () => void }) {
  const { data: session } = useNextAuthSession();
  const { toast } = useToast();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const adminEmail = (session?.user as any)?.email ?? "";

  const handleImpersonate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || !adminEmail) return;
    setLoading(true);
    try {
      // Pre-flight: validate the target is impersonate-able
      const res = await fetch("/api/admin/impersonate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.error ?? "Pre-flight check failed");
      }

      // Mint the new session via the "impersonate" credentials provider.
      // This will overwrite the current session cookie.
      const result = await signIn("impersonate", {
        adminEmail,
        adminPassword: password,
        targetUserId: user.id,
        redirect: false,
      });

      if (result?.error) {
        throw new Error(result.error);
      }

      toast({
        title: "Impersonating user",
        description: `You are now logged in as ${user.name}.`,
      });
      // Reload to pick up the new session
      setTimeout(() => window.location.reload(), 600);
    } catch (e: any) {
      toast({
        title: "Impersonation failed",
        description: e?.message ?? "Unknown error",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Impersonate user"
      className="fixed inset-0 z-[80] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <form
        onClick={(e) => e.stopPropagation()}
        onSubmit={handleImpersonate}
        className="relative w-full max-w-md rounded-3xl border border-amber-500/40 bg-background p-6 nov-ring-lg"
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted"
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-amber-500/10 text-amber-600">
            <LogIn className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-base font-semibold">Impersonate user</h2>
            <p className="text-xs text-muted-foreground">
              All actions will be audited under your admin identity.
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/20 p-3 text-xs">
          <div className="font-medium text-amber-700">You will be logged in as:</div>
          <div className="mt-1 text-foreground">
            {user.name} · <span className="text-muted-foreground">{user.email}</span>
          </div>
          <div className="mt-1 text-muted-foreground">
            Role: {user.role} · A &quot;Return to admin&quot; banner will let you
            switch back any time.
          </div>
        </div>

        <label className="mt-4 block">
          <span className="mb-1.5 block text-xs font-medium text-muted-foreground">
            Your admin password
          </span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            autoFocus
            className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none focus:shadow-[0_0_0_4px_rgba(245,158,11,0.15)]"
          />
        </label>

        <button
          type="submit"
          disabled={loading || !password}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-amber-500 py-3 text-sm font-medium text-white transition-colors hover:bg-amber-600 disabled:opacity-60"
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Starting impersonation…
            </>
          ) : (
            <>
              <LogIn className="h-4 w-4" />
              Impersonate {user.name}
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export function RoleBadge({ role }: { role: string }) {
  const cls: Record<string, string> = {
    Admin: "bg-primary/10 text-primary",
    Enterprise: "bg-violet-500/10 text-violet-700",
    Agency: "bg-emerald-500/10 text-emerald-700",
    Reseller: "bg-amber-500/10 text-amber-700",
  };
  return <span className={cn("inline-flex rounded-full px-2 py-0.5 text-[10px] font-medium", cls[role] ?? "bg-muted text-muted-foreground")}>{role}</span>;
}

export function UserStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/10 text-emerald-700",
    suspended: "bg-red-500/10 text-red-700",
    pending: "bg-amber-500/10 text-amber-700",
  };
  const dot: Record<string, string> = { active: "bg-emerald-500", suspended: "bg-red-500", pending: "bg-amber-500" };
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", map[status])}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dot[status])} />
      {status}
    </span>
  );
}

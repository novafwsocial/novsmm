"use client";

import { useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import {
  useAdminServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
  useAdminProviders,
} from "@/hooks/use-api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { Reveal } from "../reveal";
import { IconBtn, Input, SelectField } from "./shared";

export function AdminServices() {
  const { data } = useAdminServices();
  const createService = useCreateService();
  const updateService = useUpdateService();
  const deleteService = useDeleteService();
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<any | null>(null);
  const [deleting, setDeleting] = useState<any | null>(null);
  const services = data?.services ?? [];

  return (
    <Reveal blur>
      <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-4">
          <div className="text-base font-semibold">Catalog · {services.length} services</div>
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" /> Add service
          </button>
        </div>
        <div className="overflow-x-auto nov-scroll">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Service</th>
                <th className="px-4 py-3 text-left font-medium">Platform</th>
                <th className="px-4 py-3 text-right font-medium">Cost</th>
                <th className="px-4 py-3 text-right font-medium">Price</th>
                <th className="px-4 py-3 text-right font-medium">Min/Max</th>
                <th className="px-4 py-3 text-left font-medium">Status</th>
                <th className="px-4 py-3 text-right font-medium">Rate</th>
                <th className="px-4 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {services.map((s: any) => (
                <tr key={s.id} className="transition-colors hover:bg-muted/30">
                  <td className="px-4 py-3">
                    <div className="font-medium text-foreground">{s.name}</div>
                    {s.provider && <div className="text-[11px] text-muted-foreground">{s.provider.name}</div>}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">{s.platform}</td>
                  <td className="px-4 py-3 text-right tabular-nums">${s.cost.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums text-emerald-600">${s.price.toFixed(2)}</td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{s.minQty} / {s.maxQty.toLocaleString()}</td>
                  <td className="px-4 py-3">
                    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", s.status === "active" ? "bg-emerald-500/10 text-emerald-700" : "bg-amber-500/10 text-amber-700")}>
                      <span className={cn("h-1.5 w-1.5 rounded-full", s.status === "active" ? "bg-emerald-500" : "bg-amber-500")} />
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-xs tabular-nums text-muted-foreground">{s.rate}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconBtn icon={Pencil} onClick={() => setEditing(s)} />
                      <IconBtn icon={Trash2} danger onClick={() => setDeleting(s)} />
                    </div>
                  </td>
                </tr>
              ))}
              {services.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-muted-foreground">No services yet</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {showAdd && (
        <ServiceModal
          mode="create"
          onClose={() => setShowAdd(false)}
          onSubmit={async (d) => { await createService.mutateAsync(d); setShowAdd(false); }}
          loading={createService.isPending}
        />
      )}
      {editing && (
        <ServiceModal
          mode="edit"
          service={editing}
          onClose={() => setEditing(null)}
          onSubmit={async (d) => { await updateService.mutateAsync({ id: editing.id, ...d }); setEditing(null); }}
          loading={updateService.isPending}
        />
      )}
      {deleting && (
        <AlertDialog open onOpenChange={(o) => { if (!o) setDeleting(null); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete service?</AlertDialogTitle>
              <AlertDialogDescription>
                This will mark <span className="font-semibold text-foreground">{deleting.name}</span> as deleted. Existing orders are unaffected.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => { deleteService.mutate(deleting.id); setDeleting(null); }}
                className="bg-red-600 text-white hover:bg-red-700"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </Reveal>
  );
}

/** Unified service modal — handles both create and edit modes.
 *
 * In edit mode, an extra "Providers" section is shown: a list of
 * ServiceProvider mappings for this service, each with a provider (select),
 * priority (1-5), providerServiceId (the service ID at that provider), and
 * optional cost. The admin can add/remove mappings — they're submitted as a
 * `providers` array and the backend PATCH replaces the service's mappings
 * atomically.
 *
 * In create mode the providers section is hidden (the service doesn't exist
 * yet, so we can't attach mappings until after creation — admin re-opens the
 * service to add them).
 */
export function ServiceModal({
  mode,
  service,
  onClose,
  onSubmit,
  loading,
}: {
  mode: "create" | "edit";
  service?: any;
  onClose: () => void;
  onSubmit: (d: any) => Promise<void>;
  loading?: boolean;
}) {
  const { data: providersData } = useAdminProviders();
  const allProviders = providersData?.providers ?? [];

  const [form, setForm] = useState({
    name: service?.name ?? "",
    platform: service?.platform ?? "Instagram",
    cost: service?.cost ?? 1,
    price: service?.price ?? 2,
    minQty: service?.minQty ?? 50,
    maxQty: service?.maxQty ?? 100000,
    rate: service?.rate ?? "0/d",
    status: service?.status ?? "active",
  });

  // ── Provider mappings (edit mode only) ──
  // Initialise from the service's existing ServiceProvider mappings. Each
  // entry: { providerId, priority, providerServiceId, cost }.
  const [providers, setProviders] = useState<any[]>(() => {
    if (mode !== "edit" || !service?.serviceProviders) return [];
    return service.serviceProviders.map((sp: any) => ({
      providerId: sp.providerId,
      priority: sp.priority ?? 1,
      providerServiceId: sp.providerServiceId ?? "",
      cost: sp.cost ?? "",
    }));
  });

  const addProvider = () => {
    if (allProviders.length === 0) return;
    // Default to the first provider not already in the list.
    const used = new Set(providers.map((p) => p.providerId));
    const next = allProviders.find((p: any) => !used.has(p.id));
    if (!next) return;
    setProviders([
      ...providers,
      {
        providerId: next.id,
        priority: providers.length + 1,
        providerServiceId: "",
        cost: "",
      },
    ]);
  };

  const removeProvider = (idx: number) => {
    setProviders(providers.filter((_, i) => i !== idx));
  };

  const updateProvider = (idx: number, patch: any) => {
    setProviders(providers.map((p, i) => (i === idx ? { ...p, ...patch } : p)));
  };

  const submit = async () => {
    if (!form.name) return;
    const payload: any = { ...form };
    if (mode === "edit") {
      // Always send providers in edit mode (even if empty) so the backend can
      // clear them when the admin removes all mappings.
      payload.providers = providers.map((p) => ({
        providerId: p.providerId,
        priority: Number(p.priority) || 1,
        providerServiceId: p.providerServiceId || undefined,
        cost: p.cost === "" || p.cost === null ? undefined : Number(p.cost),
      }));
    }
    await onSubmit(payload);
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Service form" className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg nov-scroll">
        <div className="text-base font-semibold">{mode === "create" ? "Add service" : "Edit service"}</div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <Input label="Name" value={form.name} onChange={(v) => setForm({ ...form, name: v })} />
          <Input label="Platform" value={form.platform} onChange={(v) => setForm({ ...form, platform: v })} />
          <Input label="Cost" type="number" value={String(form.cost)} onChange={(v) => setForm({ ...form, cost: Number(v) })} />
          <Input label="Price" type="number" value={String(form.price)} onChange={(v) => setForm({ ...form, price: Number(v) })} />
          <Input label="Min qty" type="number" value={String(form.minQty)} onChange={(v) => setForm({ ...form, minQty: Number(v) })} />
          <Input label="Max qty" type="number" value={String(form.maxQty)} onChange={(v) => setForm({ ...form, maxQty: Number(v) })} />
          <Input label="Rate (e.g. 100/d)" value={form.rate} onChange={(v) => setForm({ ...form, rate: v })} />
          <SelectField label="Status" value={form.status} onChange={(v) => setForm({ ...form, status: v })} options={[
            { value: "active", label: "Active" },
            { value: "paused", label: "Paused" },
            { value: "deleted", label: "Deleted" },
          ]} />
        </div>

        {/* ── Providers section (edit mode only) ── */}
        {mode === "edit" && (
          <div className="mt-5 rounded-xl border border-border/60 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-foreground">Providers (failover)</div>
                <div className="text-[10px] text-muted-foreground">
                  Tried in priority order on every order. If #1 fails, #2 takes over.
                </div>
              </div>
              <button
                onClick={addProvider}
                disabled={allProviders.length === 0 || providers.length >= 5 || providers.length >= allProviders.length}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 text-[11px] font-medium text-primary transition-colors hover:bg-primary/20 disabled:opacity-50"
              >
                <Plus className="h-3 w-3" /> Add
              </button>
            </div>

            {providers.length === 0 ? (
              <div className="rounded-lg bg-muted/40 px-3 py-3 text-center text-[11px] text-muted-foreground">
                No providers mapped. Fulfillment will fall back to the legacy single-provider flow.
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {providers.map((p, idx) => {
                  const provider = allProviders.find((pr: any) => pr.id === p.providerId);
                  return (
                    <div key={`${p.providerId}-${idx}`} className="rounded-lg border border-border/50 bg-muted/20 p-2.5">
                      <div className="flex items-start gap-2">
                        <div className="grid flex-1 grid-cols-2 gap-2">
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Provider</span>
                            <select
                              value={p.providerId}
                              onChange={(e) => updateProvider(idx, { providerId: e.target.value })}
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            >
                              {allProviders.map((pr: any) => (
                                <option key={pr.id} value={pr.id}>{pr.name}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Priority</span>
                            <select
                              value={p.priority}
                              onChange={(e) => updateProvider(idx, { priority: Number(e.target.value) })}
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            >
                              {[1, 2, 3, 4, 5].map((n) => (
                                <option key={n} value={n}>{n} {n === 1 ? "(primary)" : `(fallback ${n - 1})`}</option>
                              ))}
                            </select>
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Provider service ID</span>
                            <input
                              type="text"
                              value={p.providerServiceId}
                              onChange={(e) => updateProvider(idx, { providerServiceId: e.target.value })}
                              placeholder="e.g. 12345"
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            />
                          </label>
                          <label className="block">
                            <span className="mb-0.5 block text-[10px] text-muted-foreground">Cost / 1k (optional)</span>
                            <input
                              type="number"
                              value={String(p.cost ?? "")}
                              onChange={(e) => updateProvider(idx, { cost: e.target.value })}
                              placeholder="auto"
                              className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                            />
                          </label>
                        </div>
                        <button
                          onClick={() => removeProvider(idx)}
                          className="mt-4 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-600"
                          aria-label="Remove provider mapping"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {provider && (
                        <div className="mt-1 text-[10px] text-muted-foreground">
                          {provider.name} · {provider.apiUrl}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        <button onClick={submit} disabled={loading || !form.name} className="mt-5 w-full rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground disabled:opacity-60">
          {loading ? "Saving…" : mode === "create" ? "Create service" : "Save changes"}
        </button>
        <button onClick={onClose} className="mt-2 w-full text-xs text-muted-foreground hover:text-foreground">Cancel</button>
      </div>
    </div>
  );
}

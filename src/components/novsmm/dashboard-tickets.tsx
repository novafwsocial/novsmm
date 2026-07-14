"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect, useMemo, forwardRef } from "react";
import {
  Send,
  Paperclip,
  Image as ImageIcon,
  Search,
  Plus,
  Clock,
  CheckCheck,
  Flag,
  X,
  Loader2,
  ArrowLeft,
  Inbox,
  MessageSquare,
  ClipboardList,
} from "lucide-react";
import {
  useTickets,
  useCreateTicket,
  useReplyTicket,
  useSession,
} from "@/hooks/use-api";
import { useIsMobile } from "@/hooks/use-mobile";
import { useToast } from "@/hooks/use-toast";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type MobilePane = "list" | "conversation";

export function DashboardTickets() {
  const { data, isLoading } = useTickets();
  const { data: sessionData } = useSession();
  const tickets = data?.tickets ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTicket = useReplyTicket();
  const isMobile = useIsMobile();
  const [mobilePane, setMobilePane] = useState<MobilePane>("list");
  const { toast } = useToast();

  // Canned replies are available to admin + support roles only
  const userRole = (sessionData?.user as any)?.role;
  const canUseCannedReplies = userRole === "admin" || userRole === "support";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok) {
        setAttachedFile(data);
      } else {
        toast({
          title: "Upload failed",
          description: data.error ?? "Please try again.",
          variant: "destructive",
        });
      }
    } catch {
      toast({
        title: "Upload failed",
        description: "Please try again or contact support.",
        variant: "destructive",
      });
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Client-side search: filter by subject / publicId / id (case-insensitive)
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return tickets;
    return tickets.filter(
      (t: any) =>
        (typeof t.subject === "string" && t.subject.toLowerCase().includes(q)) ||
        (typeof t.publicId === "string" && t.publicId.toLowerCase().includes(q)) ||
        (typeof t.id === "string" && t.id.toLowerCase().includes(q))
    );
  }, [tickets, search]);

  // Use first ticket as active if none selected, or if the active ticket
  // has fallen out of the filtered set (e.g. user typed a search that
  // excludes it). Derived rather than effect-driven to avoid cascading renders.
  const activeStillInFiltered = !!activeId && filtered.some((t: any) => t.id === activeId);
  const effectiveActiveId = (activeStillInFiltered ? activeId : filtered[0]?.id) ?? null;
  const active = tickets.find((t: any) => t.id === effectiveActiveId) ?? null;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [active?.messages, effectiveActiveId]);

  const send = () => {
    if ((!input.trim() && !attachedFile) || !effectiveActiveId) return;
    let message = input.trim();
    if (attachedFile) {
      message += message ? "\n" : "";
      message += `📎 ${attachedFile.filename} (${attachedFile.url})`;
    }
    replyTicket.mutate({ ticketId: effectiveActiveId, text: message });
    setInput("");
    setAttachedFile(null);
  };

  const handleSelectTicket = (id: string) => {
    setActiveId(id);
    if (isMobile) {
      setMobilePane("conversation");
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  // Mobile: tab switcher (Tickets / Conversation)
  if (isMobile) {
    return (
      <div className="flex flex-col gap-4">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
                Support
              </div>
              <h1 className="text-2xl font-semibold tracking-tight">Tickets</h1>
              <p className="text-sm text-muted-foreground">
                {tickets.length} tickets · {tickets.filter((t: any) => t.status === "open").length} open
              </p>
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
            >
              <Plus className="h-3.5 w-3.5" /> New
            </button>
          </div>
        </Reveal>

        {/* Mobile tab switcher */}
        <div className="flex rounded-full border border-border bg-muted/40 p-1 text-xs font-medium">
          <button
            onClick={() => setMobilePane("list")}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 transition-colors",
              mobilePane === "list"
                ? "bg-background text-foreground nov-ring"
                : "text-muted-foreground"
            )}
          >
            <Inbox className="h-3.5 w-3.5" /> Tickets
            {tickets.length > 0 && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] tabular-nums text-foreground">
                {tickets.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setMobilePane("conversation")}
            disabled={!active}
            className={cn(
              "flex flex-1 items-center justify-center gap-1.5 rounded-full py-2 transition-colors disabled:opacity-50",
              mobilePane === "conversation"
                ? "bg-background text-foreground nov-ring"
                : "text-muted-foreground"
            )}
          >
            <MessageSquare className="h-3.5 w-3.5" /> Conversation
          </button>
        </div>

        <AnimatePresence mode="wait">
          {mobilePane === "list" ? (
            <motion.div
              key="list"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            >
              {tickets.length === 0 ? (
                <EmptyTickets />
              ) : (
                <div className="overflow-hidden rounded-2xl border border-border/60 bg-background">
                  <div className="border-b border-border/60 p-3">
                    <SearchInput value={search} onChange={setSearch} />
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto nov-scroll">
                    {filtered.length === 0 ? (
                      <div className="py-10 text-center text-sm text-muted-foreground">
                        No tickets match &ldquo;{search}&rdquo;
                      </div>
                    ) : (
                      filtered.map((t: any) => (
                        <TicketRow
                          key={t.id}
                          t={t}
                          active={effectiveActiveId === t.id}
                          onClick={() => handleSelectTicket(t.id)}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="conversation"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.18 }}
            >
              {active ? (
                <div className="flex h-[72vh] flex-col overflow-hidden rounded-2xl border border-border/60 bg-background">
                  <ConversationHeader
                    active={active}
                    onBack={() => setMobilePane("list")}
                    showBack
                  />
                  <ConversationBody ref={scrollRef} active={active} />
                  <ConversationComposer
                    input={input}
                    setInput={setInput}
                    send={send}
                    attachedFile={attachedFile}
                    setAttachedFile={setAttachedFile}
                    uploading={uploading}
                    fileInputRef={fileInputRef}
                    handleFileUpload={handleFileUpload}
                    pending={replyTicket.isPending}
                    canUseCannedReplies={canUseCannedReplies}
                  />
                </div>
              ) : (
                <EmptyTickets />
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
      </div>
    );
  }

  // Desktop: 2-pane layout
  return (
    <div className="flex flex-col gap-6">
      <Reveal>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
              Support
            </div>
            <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Tickets</h1>
            <p className="text-sm text-muted-foreground">
              {tickets.length} tickets · {tickets.filter((t: any) => t.status === "open").length} open
            </p>
          </div>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue"
          >
            <Plus className="h-3.5 w-3.5" /> New ticket
          </button>
        </div>
      </Reveal>

      {tickets.length === 0 ? (
        <Reveal blur>
          <EmptyTickets />
        </Reveal>
      ) : (
        <Reveal blur>
          <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-background md:grid-cols-[300px_1fr]">
            {/* Ticket list */}
            <div className="flex flex-col border-r border-border/60">
              <div className="border-b border-border/60 p-3">
                <SearchInput value={search} onChange={setSearch} />
              </div>
              <div className="flex-1 overflow-y-auto nov-scroll">
                {filtered.length === 0 ? (
                  <div className="py-10 text-center text-sm text-muted-foreground">
                    No tickets match &ldquo;{search}&rdquo;
                  </div>
                ) : (
                  filtered.map((t: any) => (
                    <TicketRow
                      key={t.id}
                      t={t}
                      active={effectiveActiveId === t.id}
                      onClick={() => setActiveId(t.id)}
                    />
                  ))
                )}
              </div>
            </div>

            {/* Chat */}
            {active && (
              <div className="flex flex-col">
                <ConversationHeader active={active} />
                <ConversationBody ref={scrollRef} active={active} />
                <ConversationComposer
                  input={input}
                  setInput={setInput}
                  send={send}
                  attachedFile={attachedFile}
                  setAttachedFile={setAttachedFile}
                  uploading={uploading}
                  fileInputRef={fileInputRef}
                  handleFileUpload={handleFileUpload}
                  pending={replyTicket.isPending}
                  canUseCannedReplies={canUseCannedReplies}
                />
              </div>
            )}
          </div>
        </Reveal>
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
    </div>
  );
}

// ── Pieces ─────────────────────────────────────────────────────────────

function EmptyTickets() {
  return (
    <div className="rounded-2xl border border-dashed border-border p-12 text-center">
      <p className="text-sm text-muted-foreground">
        No tickets yet. Create one to get help from our support team.
      </p>
    </div>
  );
}

function SearchInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm transition-colors focus-within:border-primary/40 focus-within:bg-background">
      <Search className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tickets…"
        className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          aria-label="Clear search"
          className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
        >
          <X className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function TicketRow({
  t,
  active,
  onClick,
}: {
  t: any;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex w-full flex-col gap-1 border-b border-border/60 p-3 text-left transition-colors",
        active ? "bg-primary/[0.04]" : "hover:bg-muted/30"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold text-foreground">#{t.publicId}</span>
        <PriorityPill priority={t.priority} />
      </div>
      <div className="truncate text-sm font-medium text-foreground">{t.subject}</div>
      <div className="truncate text-[11px] text-muted-foreground">
        {t.messages?.[t.messages.length - 1]?.text ?? "No messages"}
      </div>
      <div className="flex items-center justify-between text-[11px] text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="h-2.5 w-2.5" /> {timeAgo(t.updatedAt)}
        </span>
        <StatusPill status={t.status} />
      </div>
    </button>
  );
}

function ConversationHeader({
  active,
  onBack,
  showBack,
}: {
  active: any;
  onBack?: () => void;
  showBack?: boolean;
}) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 p-4">
      <div className="flex min-w-0 items-center gap-3">
        {showBack && (
          <button
            onClick={onBack}
            aria-label="Back to ticket list"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground md:hidden"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Flag className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-foreground">
            #{active.publicId} · {active.subject}
          </div>
          <div className="truncate text-[11px] text-muted-foreground">
            {active.status === "open" ? "Waiting for support reply" : "Support will respond shortly"}
          </div>
        </div>
      </div>
      <PriorityPill priority={active.priority} />
    </div>
  );
}

const ConversationBody = forwardRef<HTMLDivElement, { active: any }>(
  function ConversationBody({ active }, ref) {
    return (
      <div
        ref={ref}
        className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 nov-scroll"
      >
        {active.messages?.map((m: any, i: number) => (
          <motion.div
            key={m.id ?? i}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex flex-col gap-1",
              m.sender === "user" ? "items-end" : "items-start"
            )}
          >
            <div
              className={cn(
                "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                m.sender === "user"
                  ? "rounded-br-md bg-primary text-primary-foreground"
                  : "rounded-bl-md bg-background nov-ring"
              )}
            >
              {m.text}
            </div>
            <div className="flex items-center gap-1 px-1 text-[11px] text-muted-foreground">
              {timeAgo(m.createdAt)}
              {m.sender === "user" && <CheckCheck className="h-3 w-3 text-primary" />}
            </div>
          </motion.div>
        ))}
      </div>
    );
  }
);

function ConversationComposer({
  input,
  setInput,
  send,
  attachedFile,
  setAttachedFile,
  uploading,
  fileInputRef,
  handleFileUpload,
  pending,
  canUseCannedReplies,
}: {
  input: string;
  setInput: (v: string) => void;
  send: () => void;
  attachedFile: any;
  setAttachedFile: (v: any) => void;
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  handleFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  pending: boolean;
  canUseCannedReplies?: boolean;
}) {
  return (
    <div className="border-t border-border/60 p-3">
      {/* Attached file preview */}
      {attachedFile && (
        <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
          <Paperclip className="h-3 w-3 text-primary" />
          <span className="flex-1 truncate text-foreground">{attachedFile.filename}</span>
          <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground">
            <X className="h-3 w-3" />
          </button>
        </div>
      )}
      {uploading && (
        <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" />
          Uploading…
        </div>
      )}
      <input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.txt,.zip" onChange={handleFileUpload} />
      <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
        <button onClick={() => fileInputRef.current?.click()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <Paperclip className="h-4 w-4" />
        </button>
        <button onClick={() => fileInputRef.current?.click()} className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
          <ImageIcon className="h-4 w-4" />
        </button>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              send();
            }
          }}
          rows={1}
          placeholder="Type your message…"
          className="max-h-32 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
        />
        {canUseCannedReplies && (
          <CannedRepliesButton
            onInsert={(body, id) => {
              // Append with separator if there's existing content
              setInput(input.trim() ? `${input.trimEnd()}\n\n${body}` : body);
              // Fire-and-forget usage-count bump
              if (id) {
                fetch(`/api/canned-replies?incrementUsage=true&ids=${id}`).catch(() => {});
              }
            }}
          />
        )}
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={send}
          disabled={!input.trim() || pending}
          className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
            input.trim() && !pending
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </motion.button>
      </div>
      <div className="mt-1.5 px-1 text-[11px] text-muted-foreground">
        Press Enter to send · Shift+Enter for newline
      </div>
    </div>
  );
}

/**
 * Canned replies dropdown button — shown only to admin/support roles.
 * Fetches the list from /api/canned-replies on first open, then caches
 * in component state. Clicking a reply inserts its body into the input.
 */
function CannedRepliesButton({
  onInsert,
}: {
  onInsert: (body: string, id?: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onClick = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [open]);

  const handleOpen = async () => {
    if (!open && !loaded) {
      setLoading(true);
      try {
        const res = await fetch("/api/canned-replies");
        if (res.ok) {
          const data = await res.json();
          setItems(data.items ?? []);
        }
      } catch {
        // ignore — user just won't see canned replies
      } finally {
        setLoaded(true);
        setLoading(false);
      }
    }
    setOpen((v) => !v);
  };

  return (
    <div ref={popoverRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        title="Canned replies"
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
          open
            ? "bg-primary/10 text-primary"
            : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ClipboardList className="h-4 w-4" />
        )}
      </button>
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.96 }}
            transition={{ duration: 0.15 }}
            className="absolute bottom-full right-0 z-50 mb-2 w-80 max-h-72 overflow-y-auto rounded-2xl border border-border bg-background p-1.5 nov-ring-lg nov-scroll"
          >
            <div className="px-2 py-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Canned replies
            </div>
            {items.length === 0 ? (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">
                {loading ? "Loading…" : "No canned replies yet."}
              </div>
            ) : (
              items.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    onInsert(item.body, item.id);
                    setOpen(false);
                  }}
                  className="block w-full rounded-lg px-2.5 py-2 text-left transition-colors hover:bg-muted"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="truncate text-xs font-medium text-foreground">
                      {item.title}
                    </span>
                    <span className="shrink-0 rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                      {item.category}
                    </span>
                  </div>
                  <div className="mt-0.5 truncate text-[11px] text-muted-foreground">
                    {item.body.slice(0, 80)}
                  </div>
                </button>
              ))
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CreateTicketModal({ onClose }: { onClose: () => void }) {
  const createTicket = useCreateTicket();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [priority, setPriority] = useState("medium");

  const handleSubmit = async () => {
    if (!subject || !message) return;
    await createTicket.mutateAsync({ subject, message, priority });
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Create ticket" className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
      >
        <button onClick={onClose} className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted">
          <X className="h-4 w-4" />
        </button>
        <div className="text-base font-semibold">Create new ticket</div>
        <div className="mt-4 flex flex-col gap-3">
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Subject</span>
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Brief description of your issue"
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-base focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Message</span>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={4}
              placeholder="Describe your issue in detail…"
              className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-base focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </label>
        </div>
        <button
          onClick={handleSubmit}
          disabled={createTicket.isPending || !subject || !message}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-primary py-3 text-sm font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue disabled:opacity-60"
        >
          {createTicket.isPending ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Creating…
            </>
          ) : (
            "Create ticket"
          )}
        </button>
      </motion.div>
    </div>
  );
}

function PriorityPill({ priority }: { priority: string }) {
  const cls =
    priority === "high"
      ? "bg-red-500/10 text-red-700"
      : priority === "medium"
      ? "bg-amber-500/10 text-amber-700"
      : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", priority === "high" ? "bg-red-500" : priority === "medium" ? "bg-amber-500" : "bg-muted-foreground")} />
      {priority}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const cls =
    status === "open"
      ? "bg-primary/10 text-primary"
      : status === "waiting"
      ? "bg-amber-500/10 text-amber-700"
      : status === "resolved"
      ? "bg-emerald-500/10 text-emerald-700"
      : "bg-muted text-muted-foreground";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium capitalize", cls)}>
      {status}
    </span>
  );
}

function timeAgo(date: string | Date): string {
  const d = new Date(date);
  const s = Math.floor((Date.now() - d.getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

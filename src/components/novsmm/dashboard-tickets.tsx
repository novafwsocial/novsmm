"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useEffect } from "react";
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
} from "lucide-react";
import {
  useTickets,
  useCreateTicket,
  useReplyTicket,
} from "@/hooks/use-api";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

export function DashboardTickets() {
  const { data, isLoading } = useTickets();
  const tickets = data?.tickets ?? [];
  const [activeId, setActiveId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [attachedFile, setAttachedFile] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const replyTicket = useReplyTicket();

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
        alert(data.error || "Upload failed");
      }
    } catch {
      alert("Upload failed");
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  // Use first ticket as active if none selected
  const effectiveActiveId = activeId ?? tickets[0]?.id ?? null;

  const active = tickets.find((t: any) => t.id === effectiveActiveId);

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

  if (isLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

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
          <div className="rounded-2xl border border-dashed border-border p-12 text-center">
            <p className="text-sm text-muted-foreground">
              No tickets yet. Create one to get help from our support team.
            </p>
          </div>
        </Reveal>
      ) : (
        <Reveal blur>
          <div className="grid h-[600px] grid-cols-1 overflow-hidden rounded-2xl border border-border/60 bg-background md:grid-cols-[300px_1fr]">
            {/* Ticket list */}
            <div className="flex flex-col border-r border-border/60">
              <div className="border-b border-border/60 p-3">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm">
                  <Search className="h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    placeholder="Search tickets…"
                    className="w-full bg-transparent text-foreground placeholder:text-muted-foreground/70 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto nov-scroll">
                {tickets.map((t: any) => (
                  <button
                    key={t.id}
                    onClick={() => setActiveId(t.id)}
                    className={cn(
                      "flex w-full flex-col gap-1 border-b border-border/60 p-3 text-left transition-colors",
                      effectiveActiveId === t.id ? "bg-primary/[0.04]" : "hover:bg-muted/30"
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
                    <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-2.5 w-2.5" /> {timeAgo(t.updatedAt)}
                      </span>
                      <StatusPill status={t.status} />
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Chat */}
            {active && (
              <div className="flex flex-col">
                {/* chat header */}
                <div className="flex items-center justify-between border-b border-border/60 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Flag className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-foreground">
                        #{active.publicId} · {active.subject}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {active.status === "open" ? "Waiting for support reply" : "Support will respond shortly"}
                      </div>
                    </div>
                  </div>
                  <PriorityPill priority={active.priority} />
                </div>

                {/* messages */}
                <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 nov-scroll">
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
                      <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                        {timeAgo(m.createdAt)}
                        {m.sender === "user" && <CheckCheck className="h-3 w-3 text-primary" />}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* composer */}
                <div className="border-t border-border/60 p-3">
                  {/* Attached file preview */}
                  {attachedFile && (
                    <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted/30 px-3 py-2 text-xs">
                      <Paperclip className="h-3 w-3 text-primary" />
                      <span className="flex-1 truncate text-foreground">{attachedFile.filename}</span>
                      <button onClick={() => setAttachedFile(null)} className="text-muted-foreground hover:text-foreground"><X className="h-3 w-3" /></button>
                    </div>
                  )}
                  {uploading && <div className="mb-2 flex items-center gap-2 text-xs text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" />Uploading…</div>}
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
                    <motion.button
                      whileTap={{ scale: 0.94 }}
                      onClick={send}
                      disabled={!input.trim() || replyTicket.isPending}
                      className={cn(
                        "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                        input.trim() && !replyTicket.isPending
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {replyTicket.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </motion.button>
                  </div>
                  <div className="mt-1.5 px-1 text-[10px] text-muted-foreground">
                    Press Enter to send · Shift+Enter for newline
                  </div>
                </div>
              </div>
            )}
          </div>
        </Reveal>
      )}

      {showCreate && <CreateTicketModal onClose={() => setShowCreate(false)} />}
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
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-foreground/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        onClick={(e) => e.stopPropagation()} className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-3xl border border-border/60 bg-background p-6 nov-ring-lg"
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
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
            />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-medium text-muted-foreground">Priority</span>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="h-11 w-full rounded-xl border border-border bg-background px-3.5 text-sm focus:outline-none"
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
              className="w-full resize-none rounded-xl border border-border bg-background px-3.5 py-2.5 text-sm focus:outline-none focus:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]"
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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", cls)}>
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
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", cls)}>
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

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
} from "lucide-react";
import { TICKETS } from "./dashboard-data";
import { Reveal } from "./reveal";
import { cn } from "@/lib/utils";

type Msg = { from: "me" | "support"; text: string; time: string };

export function DashboardTickets() {
  const [activeId, setActiveId] = useState(TICKETS[0].id);
  const [messages, setMessages] = useState<Record<string, Msg[]>>(
    Object.fromEntries(TICKETS.map((t) => [t.id, t.msgs as Msg[]]))
  );
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const active = TICKETS.find((t) => t.id === activeId)!;

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, activeId]);

  const send = () => {
    if (!input.trim()) return;
    const msg: Msg = { from: "me", text: input.trim(), time: "just now" };
    setMessages((m) => ({ ...m, [activeId]: [...m[activeId], msg] }));
    setInput("");
    // simulated reply
    setTimeout(() => {
      setMessages((m) => ({
        ...m,
        [activeId]: [
          ...m[activeId],
          {
            from: "support",
            text: "Thanks for the update — I'll check and get right back to you.",
            time: "just now",
          },
        ],
      }));
    }, 1400);
  };

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
              Modern chat-style support with files, priorities & statuses.
            </p>
          </div>
          <button className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-xs font-medium text-primary-foreground transition-shadow hover:nov-shadow-blue">
            <Plus className="h-3.5 w-3.5" /> New ticket
          </button>
        </div>
      </Reveal>

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
              {TICKETS.map((t) => (
                <button
                  key={t.id}
                  onClick={() => setActiveId(t.id)}
                  className={cn(
                    "flex w-full flex-col gap-1 border-b border-border/60 p-3 text-left transition-colors",
                    activeId === t.id ? "bg-primary/[0.04]" : "hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-foreground">#{t.id}</span>
                    <PriorityPill priority={t.priority as "high" | "medium"} />
                  </div>
                  <div className="truncate text-sm font-medium text-foreground">{t.subject}</div>
                  <div className="truncate text-[11px] text-muted-foreground">{t.preview}</div>
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-2.5 w-2.5" /> {t.lastReply}
                    </span>
                    <StatusPill status={t.status as "open" | "waiting"} />
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className="flex flex-col">
            {/* chat header */}
            <div className="flex items-center justify-between border-b border-border/60 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Flag className="h-4 w-4" />
                </div>
                <div>
                  <div className="text-sm font-semibold text-foreground">
                    #{active.id} · {active.subject}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    Assigned to NOVSMM Support · avg. reply 4m
                  </div>
                </div>
              </div>
              <PriorityPill priority={active.priority as "high" | "medium"} />
            </div>

            {/* messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto bg-muted/20 p-4 nov-scroll">
              <AnimatePresence>
                {messages[activeId].map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={cn(
                      "flex flex-col gap-1",
                      m.from === "me" ? "items-end" : "items-start"
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm",
                        m.from === "me"
                          ? "rounded-br-md bg-primary text-primary-foreground"
                          : "rounded-bl-md bg-background nov-ring"
                      )}
                    >
                      {m.text}
                    </div>
                    <div className="flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                      {m.time}
                      {m.from === "me" && <CheckCheck className="h-3 w-3 text-primary" />}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>

            {/* composer */}
            <div className="border-t border-border/60 p-3">
              <div className="flex items-end gap-2 rounded-xl border border-border bg-background p-2 transition-shadow focus-within:shadow-[0_0_0_4px_rgba(0,82,255,0.12)]">
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
                  <Paperclip className="h-4 w-4" />
                </button>
                <button className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
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
                  disabled={!input.trim()}
                  className={cn(
                    "flex h-8 w-8 items-center justify-center rounded-lg transition-all",
                    input.trim()
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-muted-foreground"
                  )}
                >
                  <Send className="h-4 w-4" />
                </motion.button>
              </div>
              <div className="mt-1.5 px-1 text-[10px] text-muted-foreground">
                Press Enter to send · Shift+Enter for newline
              </div>
            </div>
          </div>
        </div>
      </Reveal>
    </div>
  );
}

function PriorityPill({ priority }: { priority: "high" | "medium" }) {
  const cls =
    priority === "high"
      ? "bg-red-500/10 text-red-700"
      : "bg-amber-500/10 text-amber-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", cls)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", priority === "high" ? "bg-red-500" : "bg-amber-500")} />
      {priority}
    </span>
  );
}

function StatusPill({ status }: { status: "open" | "waiting" }) {
  const cls =
    status === "open"
      ? "bg-primary/10 text-primary"
      : "bg-amber-500/10 text-amber-700";
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize", cls)}>
      {status}
    </span>
  );
}

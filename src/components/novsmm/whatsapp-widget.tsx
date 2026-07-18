"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageCircle, Send, X } from "lucide-react";

/**
 * WhatsApp floating chat widget.
 * It now stays out of the way on mobile until the user scrolls past the hero.
 */
export function WhatsAppWidget() {
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState("5215512345678");
  const [message, setMessage] = useState("");
  const [showBadge, setShowBadge] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      setShowBadge(!localStorage.getItem("novsmm_wa_seen"));
    } catch {}
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const updateVisibility = () => {
      const isMobile = window.innerWidth < 768;
      setVisible(!isMobile);
    };

    updateVisibility();
    window.addEventListener("scroll", updateVisibility, { passive: true });
    window.addEventListener("resize", updateVisibility);

    return () => {
      window.removeEventListener("scroll", updateVisibility);
      window.removeEventListener("resize", updateVisibility);
    };
  }, []);

  useEffect(() => {
    fetch("/api/public/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (d?.whatsappNumber) {
          setNumber(d.whatsappNumber);
        }
      })
      .catch(() => {
        // Keep default number if settings cannot be loaded.
      });
  }, []);

  const toggleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      setShowBadge(false);
      try {
        localStorage.setItem("novsmm_wa_seen", "1");
      } catch {}
    }
  };

  const openWhatsApp = () => {
    const text = encodeURIComponent(
      message || "Hi NOVSMM support, I have a question about my account."
    );
    window.open(
      `https://wa.me/${number}?text=${text}`,
      "_blank",
      "noopener,noreferrer"
    );
    setMessage("");
    setOpen(false);
  };

  return (
    <>
      {visible && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 200, damping: 15 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.95 }}
          onClick={toggleOpen}
          className="fixed bottom-24 right-3 z-50 flex h-10 w-10 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg shadow-[#25D366]/30 transition-shadow hover:shadow-xl hover:shadow-[#25D366]/40 lg:bottom-5 lg:right-5 lg:h-14 lg:w-14"
          aria-label="Open WhatsApp chat"
        >
          <AnimatePresence mode="wait">
            {open ? (
              <motion.span
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-5 w-5 lg:h-6 lg:w-6" />
              </motion.span>
            ) : (
              <motion.span
                key="chat"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
              >
                <svg
                  viewBox="0 0 24 24"
                  className="h-6 w-6 lg:h-7 lg:w-7"
                  fill="currentColor"
                >
                  <path d="M17.5 14.4c-.3-.1-1.7-.8-2-.9-.3-.1-.5-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.6.1-1.7-.9-2.9-1.6-4-3.5-.3-.5.3-.5.8-1.5.1-.2 0-.4 0-.5-.1-.1-.6-1.5-.9-2.1-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-.9.9-.9 2.2 0 1.3.9 2.5 1.1 2.7.1.2 1.9 2.9 4.6 4 .6.3 1.1.4 1.5.5.6.2 1.2.2 1.6.1.5-.1 1.7-.7 1.9-1.3.2-.7.2-1.2.2-1.3-.1-.2-.3-.2-.6-.4z" />
                  <path d="M12 2a10 10 0 0 0-8.6 15l-1.3 4.8 5-1.3A10 10 0 1 0 12 2zm0 18.3c-1.5 0-3-.4-4.3-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.3 8.3 0 1 1 12 20.3z" />
                </svg>
              </motion.span>
            )}
          </AnimatePresence>

          {!open && mounted && showBadge && (
            <span className="absolute -right-1 -top-1 flex h-4 w-4">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
              <span className="relative inline-flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[11px] font-bold text-white">
                1
              </span>
            </span>
          )}
        </motion.button>
      )}

      <AnimatePresence mode="wait">
        {visible && open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="fixed bottom-40 right-3 z-50 w-[min(300px,calc(100vw-1.5rem))] overflow-hidden rounded-2xl border border-border bg-background nov-ring-lg lg:bottom-24 lg:right-5 lg:w-[min(340px,calc(100vw-2.5rem))]"
          >
            <div className="flex items-center gap-3 bg-[#25D366] p-4 text-white">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                <MessageCircle className="h-5 w-5" />
              </div>
              <div>
                <div className="text-sm font-semibold">NOVSMM Support</div>
                <div className="flex items-center gap-1.5 text-[11px] opacity-90">
                  <span className="h-1.5 w-1.5 rounded-full bg-white" />
                  Online · typically replies in minutes
                </div>
              </div>
            </div>

            <div className="bg-muted/30 p-4">
              <div className="mb-3 max-w-[85%] rounded-2xl rounded-bl-sm bg-background p-3 text-sm text-foreground nov-ring">
                👋 Hi! Need help with your NOVSMM account? Send us a message and
                we&apos;ll reply on WhatsApp.
              </div>

              <div className="flex items-end gap-2">
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      openWhatsApp();
                    }
                  }}
                  rows={2}
                  placeholder="Type your message…"
                  className="flex-1 resize-none rounded-xl border border-border bg-background px-3 py-2 text-base text-foreground placeholder:text-muted-foreground/70 focus:outline-none focus:shadow-[0_0_0_3px_rgba(37,211,102,0.2)]"
                />
                <button
                  onClick={openWhatsApp}
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[#25D366] text-white transition-colors hover:bg-[#1eb858]"
                  aria-label="Send via WhatsApp"
                >
                  <Send className="h-4 w-4" />
                </button>
              </div>

              <p className="mt-2 text-center text-[11px] text-muted-foreground">
                Opens WhatsApp in a new tab · {number}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

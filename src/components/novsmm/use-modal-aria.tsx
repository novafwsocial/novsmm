"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useModalAria — C-1 fix: Accessibility hook for custom modal dialogs.
 *
 * Adds:
 *   - ESC key to close
 *   - Body scroll lock
 *   - Focus trap (tab cycles within the modal)
 *   - ARIA attributes (role="dialog", aria-modal="true")
 *
 * Usage:
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useModalAria({ open: isOpen, onClose: () => setIsOpen(false), ref: modalRef, labelId: "modal-title" });
 *
 *   return (
 *     <div ref={modalRef} id="my-modal" aria-labelledby="modal-title">
 *       <h2 id="modal-title">Modal Title</h2>
 *       ...
 *     </div>
 *   );
 *
 * This hook is designed to be non-intrusive: it adds behavior without
 * requiring a complete rewrite of existing modal components. The 30+ custom
 * modals in the codebase can adopt it with just 2 changes:
 *   1. Add `const modalRef = useRef(null);` and the hook call
 *   2. Add `ref={modalRef}` to the modal's outermost div
 */

interface UseModalAriaOptions {
  open: boolean;
  onClose: () => void;
  ref: React.RefObject<HTMLElement | null>;
  labelId?: string;
  describedById?: string;
}

export function useModalAria({ open, onClose, ref, labelId, describedById }: UseModalAriaOptions) {
  // Track the element that had focus before the modal opened
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // ESC to close + body scroll lock + ARIA attributes
  useEffect(() => {
    if (!open) return;

    // Store the currently focused element so we can restore it on close
    previouslyFocused.current = document.activeElement as HTMLElement;

    // Lock body scroll
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    // Set ARIA attributes on the modal container
    const modal = ref.current;
    if (modal) {
      modal.setAttribute("role", "dialog");
      modal.setAttribute("aria-modal", "true");
      if (labelId) modal.setAttribute("aria-labelledby", labelId);
      if (describedById) modal.setAttribute("aria-describedby", describedById);
    }

    // Focus the modal (or first focusable element inside it)
    const focusableSelector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    const focusable = modal?.querySelectorAll<HTMLElement>(focusableSelector);
    if (focusable && focusable.length > 0) {
      // Slight delay to ensure the modal is rendered
      setTimeout(() => focusable[0].focus(), 50);
    } else {
      modal?.focus();
    }

    // ESC handler
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: when Tabbing, keep focus within the modal
      if (e.key === "Tab" && modal && focusable && focusable.length > 0) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          // Shift+Tab: if on first element, wrap to last
          if (document.activeElement === first) {
            e.preventDefault();
            last.focus();
          }
        } else {
          // Tab: if on last element, wrap to first
          if (document.activeElement === last) {
            e.preventDefault();
            first.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      // Cleanup: restore body scroll, remove listener, restore focus
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      // Restore focus to the element that had it before the modal opened
      if (previouslyFocused.current && typeof previouslyFocused.current.focus === "function") {
        previouslyFocused.current.focus();
      }
    };
  }, [open, onClose, ref, labelId, describedById]);
}

/**
 * Convenience wrapper for the common pattern of "fixed overlay modal".
 * Renders a div with the correct ARIA attributes, backdrop click, and ESC handling.
 *
 * Usage:
 *   <ModalOverlay open={isOpen} onClose={() => setIsOpen(false)} title="My Modal">
 *     <h2>Content here</h2>
 *   </ModalOverlay>
 */
export function ModalOverlay({
  open,
  onClose,
  title,
  children,
  maxWidth = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  maxWidth?: string;
}) {
  const modalRef = useRef<HTMLDivElement>(null);
  const titleId = title ? `modal-title-${Math.random().toString(36).slice(2, 8)}` : undefined;

  useModalAria({
    open,
    onClose,
    ref: modalRef,
    labelId: titleId,
  });

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-background/80 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        ref={modalRef}
        className={`relative w-full ${maxWidth} rounded-2xl border border-border/60 bg-background p-6 shadow-2xl outline-none`}
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        {title && (
          <h2 id={titleId} className="mb-4 text-lg font-semibold text-foreground">
            {title}
          </h2>
        )}
        {children}
      </div>
    </div>
  );
}

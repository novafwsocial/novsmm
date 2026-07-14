"use client";

import { useEffect, useRef, useCallback } from "react";

/**
 * useModalAria — accessibility hook for modal dialogs.
 *
 * Provides:
 * - Focus trap (Tab cycles within the modal)
 * - Escape key to close
 * - Restore focus to trigger element on close
 * - aria-modal, role="dialog" attributes
 *
 * Usage:
 *   const modalRef = useRef<HTMLDivElement>(null);
 *   useModalAria({ open: isOpen, onClose: () => setIsOpen(false), ref: modalRef });
 *
 *   return (
 *     <div ref={modalRef} role="dialog" aria-modal="true" aria-labelledby="title">
 *       <h2 id="title">Modal Title</h2>
 *       ...
 *     </div>
 *   );
 */
interface UseModalAriaOptions {
  open: boolean;
  onClose: () => void;
  ref: React.RefObject<HTMLElement | null>;
  labelId?: string;
  describedById?: string;
}

export function useModalAria({ open, onClose, ref, labelId, describedById }: UseModalAriaOptions) {
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Store the element that had focus before the modal opened
  useEffect(() => {
    if (open) {
      previouslyFocused.current = document.activeElement as HTMLElement;
    }
  }, [open]);

  // Focus the first focusable element in the modal when it opens
  useEffect(() => {
    if (!open || !ref.current) return;

    const focusables = getFocusables(ref.current);
    if (focusables.length > 0) {
      focusables[0].focus();
    } else {
      ref.current.focus();
    }
  }, [open, ref]);

  // Escape key handler
  useEffect(() => {
    if (!open) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
        return;
      }

      // Focus trap: when Tabbing, keep focus within the modal
      if (e.key === "Tab" && ref.current) {
        const focusables = getFocusables(ref.current);
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

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
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose, ref]);

  // Restore focus to the trigger element when the modal closes
  useEffect(() => {
    if (!open && previouslyFocused.current) {
      previouslyFocused.current.focus();
      previouslyFocused.current = null;
    }
  }, [open]);

  // Return aria attributes for the modal container
  return {
    role: "dialog" as const,
    "aria-modal": true as const,
    "aria-labelledby": labelId,
    "aria-describedby": describedById,
    tabIndex: -1,
  };
}

/** Get all focusable elements within a container */
function getFocusables(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
    )
  ).filter((el) => el.offsetParent !== null); // exclude hidden
}

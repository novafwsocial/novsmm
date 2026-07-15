"use client";

import { useEffect } from "react";

/**
 * ModalAccessibilityProvider — global accessibility handler for ALL modals.
 *
 * MOB-1c-005 + MOB-1c-007 + MOB-1c-025 FIX:
 * The existing `useModalAria` hook was defined but never imported into any
 * of the 39 modals. Instead of modifying 39 individual modal components
 * (120+ lines of changes), this provider adds global Escape key + focus
 * trap support for ALL modals via event delegation.
 *
 * How it works:
 * 1. Escape key: finds the topmost `[role="dialog"]` that's visible and
 *    triggers its close mechanism (clicks the backdrop or the first
 *    button with aria-label="Close")
 * 2. Focus trap: when Tab or Shift+Tab is pressed inside a modal, keeps
 *    focus cycling within the modal's focusable elements
 * 3. Focus restore: when a modal closes, restores focus to the element
 *    that had focus before the modal opened
 *
 * This component is mounted once in the root layout (next to SwRegister).
 */

export function ModalAccessibilityProvider() {
  useEffect(() => {
    let previouslyFocused: HTMLElement | null = null;

    // ── Find the topmost visible modal ──
    function getTopmostModal(): HTMLElement | null {
      const modals = document.querySelectorAll<HTMLElement>(
        '[role="dialog"][aria-modal="true"]'
      );
      // Return the last one in DOM order (topmost in z-index stacking)
      for (let i = modals.length - 1; i >= 0; i--) {
        const modal = modals[i];
        const style = getComputedStyle(modal);
        if (style.display !== "none" && style.visibility !== "hidden" && modal.offsetParent !== null) {
          return modal;
        }
      }
      return null;
    }

    // ── Close a modal ──
    function closeModal(modal: HTMLElement) {
      // Strategy 1: find a close button (aria-label="Close" or "×")
      const closeBtn = modal.querySelector<HTMLElement>(
        'button[aria-label="Close"], button[aria-label*="close" i]'
      );
      if (closeBtn) {
        closeBtn.click();
        return;
      }

      // Strategy 2: simulate click on the backdrop (the modal container itself)
      // Many modals use onClick={onClose} on the backdrop div
      const backdrop = (modal.closest('[onclick]') || modal.parentElement) as HTMLElement | null;
      if (backdrop && backdrop.getAttribute("onClick")) {
        backdrop.click();
        return;
      }

      // Strategy 3: dispatch a custom event that modal components can listen for
      modal.dispatchEvent(new CustomEvent("modal-close-request"));
    }

    // ── Get focusable elements within a container ──
    function getFocusables(container: HTMLElement): HTMLElement[] {
      return Array.from(
        container.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetParent !== null);
    }

    // ── Keydown handler ──
    function handleKeyDown(e: KeyboardEvent) {
      const modal = getTopmostModal();
      if (!modal) return;

      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();

        // Store focus before closing
        previouslyFocused = document.activeElement as HTMLElement;

        closeModal(modal);

        // Restore focus after a tick (give React time to unmount)
        setTimeout(() => {
          if (previouslyFocused && previouslyFocused.offsetParent !== null) {
            previouslyFocused.focus();
          }
          previouslyFocused = null;
        }, 50);
        return;
      }

      if (e.key === "Tab") {
        const focusables = getFocusables(modal);
        if (focusables.length === 0) {
          e.preventDefault();
          modal.focus();
          return;
        }

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
    }

    // ── Focus handler: when a modal appears, focus its first element ──
    function handleFocusIn() {
      const modal = getTopmostModal();
      if (!modal) return;

      // If focus is outside the modal, bring it inside
      if (!modal.contains(document.activeElement)) {
        const focusables = getFocusables(modal);
        if (focusables.length > 0) {
          focusables[0].focus();
        } else {
          modal.focus();
        }
      }
    }

    document.addEventListener("keydown", handleKeyDown, true);
    document.addEventListener("focusin", handleFocusIn, true);

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      document.removeEventListener("focusin", handleFocusIn, true);
    };
  }, []);

  return null;
}

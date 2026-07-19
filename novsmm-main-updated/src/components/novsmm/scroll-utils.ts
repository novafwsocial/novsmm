"use client";

const DEFAULT_OFFSET = 72;
const MAX_RETRIES = 24;

function getTargetFromHash(hash: string) {
  if (!hash || hash === "#") return null;
  try {
    return document.querySelector(hash) as HTMLElement | null;
  } catch {
    return null;
  }
}

export function scrollToAnchor(hash: string, offset = DEFAULT_OFFSET) {
  const target = getTargetFromHash(hash);
  if (!target) return false;

  const rect = target.getBoundingClientRect();
  const top = Math.max(0, window.scrollY + rect.top - offset);
  window.scrollTo({ top, behavior: "smooth" });
  return true;
}

export function scrollToAnchorWhenReady(hash: string, offset = DEFAULT_OFFSET, retries = MAX_RETRIES) {
  const attempt = () => {
    if (scrollToAnchor(hash, offset)) return;
    if (retries <= 0) return;
    window.setTimeout(() => scrollToAnchorWhenReady(hash, offset, retries - 1), 40);
  };

  attempt();
}

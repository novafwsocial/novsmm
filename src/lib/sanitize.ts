/**
 * Input sanitization utilities.
 * Strips HTML tags and dangerous content from user input
 * to prevent XSS in DB storage, email bodies, and UI rendering.
 */

/**
 * Strip all HTML tags from a string, leaving only plain text.
 * Also removes script event handlers and javascript: URIs.
 */
export function sanitizeText(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove javascript: URIs
    .replace(/javascript:/gi, "")
    // Remove on* event handlers (onerror=, onclick=, etc.)
    .replace(/on\w+\s*=/gi, "")
    // Remove data: URIs (can be used for XSS in some contexts)
    .replace(/data:text\/html/gi, "")
    // Limit length to prevent abuse
    .slice(0, 10000);
}

/**
 * Sanitize for safe HTML email rendering.
 * Escapes HTML entities (<, >, &, ", ') to prevent injection.
 */
export function escapeHtml(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
    .slice(0, 10000);
}

/**
 * Sanitize a notification/ticket message for storage.
 * Strips HTML but preserves line breaks for readability.
 */
export function sanitizeMessage(input: string): string {
  if (!input || typeof input !== "string") return "";
  return sanitizeText(input)
    // Preserve newlines as \n in DB
    .replace(/\r\n/g, "\n")
    .trim()
    .slice(0, 5000);
}

/**
 * Validate and sanitize an email address.
 */
export function sanitizeEmail(input: string): string {
  if (!input || typeof input !== "string") return "";
  const cleaned = input.trim().toLowerCase().slice(0, 254);
  // Basic RFC 5322 simplified pattern
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(cleaned) ? cleaned : "";
}

/**
 * Sanitize a URL (for link fields in orders).
 * Only allows http/https protocols.
 */
export function sanitizeUrl(input: string): string {
  if (!input || typeof input !== "string") return "";
  const trimmed = input.trim().slice(0, 2048);
  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" || url.protocol === "https:") {
      return url.toString();
    }
  } catch {
    // Not a valid URL
  }
  return "";
}

/**
 * Sanitize a filename for safe storage.
 */
export function sanitizeFilename(input: string): string {
  if (!input || typeof input !== "string") return "";
  return input
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_{2,}/g, "_")
    .slice(0, 255);
}

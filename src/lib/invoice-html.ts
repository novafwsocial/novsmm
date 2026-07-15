/**
 * Self-contained HTML invoice renderer for NOVSMM.
 *
 * Returns a fully-styled HTML string suitable for:
 *   - Returning from an API route as `text/html` (browser print).
 *   - Inlining in an email body.
 *   - Rendering inside an <iframe> for sandboxed preview.
 *
 * The HTML is intentionally self-contained (no external CSS / fonts)
 * so it renders identically in the browser print preview, in the
 * PDF export, and in the email client. The page calls `window.print()`
 * automatically so the user can save as PDF via the browser's native
 * "Save as PDF" — this avoids bundling a heavy PDF library (puppeteer,
 * pdfkit, etc.) and works on every device.
 *
 * The renderer accepts a normalized Invoice object (see `InvoiceInput`)
 * so it can be backed by either the Invoice model directly or a
 * synthesised transaction record (when no Invoice row exists yet).
 */

export interface InvoiceLineItem {
  description: string;
  quantity: number | string;
  unitPrice: number;
  total: number;
}

export interface InvoiceInput {
  // Invoice metadata
  publicId: string;
  type: string; // order | topup | subscription | refund | wallet
  status: string; // paid | pending | void
  currency: string;
  amount: number;
  tax: number;
  total: number;
  createdAt: string | Date;
  items?: InvoiceLineItem[];
  // Issuer (NOVSMM) — defaults used when not provided.
  issuerName?: string;
  issuerEmail?: string;
  issuerAddress?: string;
  // Customer
  customerName?: string;
  customerEmail?: string;
  customerCountry?: string;
  // Optional notes / footer
  notes?: string;
}

/** Default NOVSMM issuer details — can be overridden per-call. */
const DEFAULT_ISSUER = {
  name: "NOVSMM",
  email: "billing@novsmm.shop",
  address: "NOVSMM Inc. · Remote-first · LATAM",
};

/**
 * Render a NOVSMM-branded HTML invoice.
 *
 * The output is a complete HTML document — ready to return as the body
 * of a Next.js Response with `Content-Type: text/html`. The page:
 *   - Auto-opens the browser print dialog after a 600ms delay (lets
 *     the layout settle first).
 *   - Uses NOVSMM's design tokens (electric blue #0052FF, near-black
 *     ink #0A0A0B, soft grays) so the printed invoice matches the brand.
 *   - Includes a clean print stylesheet that strips browser chrome
 *     and uses A4 / Letter page geometry.
 */
export function renderInvoiceHtml(inv: InvoiceInput): string {
  const createdAt = new Date(inv.createdAt);
  const items =
    inv.items && inv.items.length > 0
      ? inv.items
      : [
          {
            description: humanizeInvoiceType(inv.type),
            quantity: 1,
            unitPrice: inv.amount,
            total: inv.amount,
          },
        ];

  const issuerName = inv.issuerName ?? DEFAULT_ISSUER.name;
  const issuerEmail = inv.issuerEmail ?? DEFAULT_ISSUER.email;
  const issuerAddress = inv.issuerAddress ?? DEFAULT_ISSUER.address;
  const customerName = inv.customerName ?? "Valued customer";
  const statusColor =
    inv.status === "paid"
      ? "#00B884"
      : inv.status === "pending"
      ? "#F59E0B"
      : "#EF4444";

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>NOVSMM Invoice ${escapeHtml(inv.publicId)}</title>
<style>
  :root {
    --nov-black: #0A0A0B;
    --nov-blue: #0052FF;
    --nov-emerald: #00B884;
    --nov-gray-50: #F8FAFC;
    --nov-gray-100: #F1F5F9;
    --nov-gray-200: #E2E8F0;
    --nov-gray-500: #64748B;
    --nov-gray-700: #334155;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    background: var(--nov-gray-100);
    color: var(--nov-black);
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  .page {
    max-width: 780px;
    margin: 32px auto;
    background: #fff;
    border-radius: 12px;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
    overflow: hidden;
  }
  .header {
    padding: 40px 48px 32px;
    background: linear-gradient(135deg, var(--nov-black) 0%, #1a1a1f 100%);
    color: #fff;
  }
  .header-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 24px;
    flex-wrap: wrap;
  }
  .brand {
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .brand-mark {
    width: 40px;
    height: 40px;
    border-radius: 10px;
    background: var(--nov-blue);
    display: flex;
    align-items: center;
    justify-content: center;
    font-weight: 700;
    font-size: 18px;
    letter-spacing: -0.5px;
  }
  .brand-name {
    font-size: 22px;
    font-weight: 700;
    letter-spacing: -0.5px;
  }
  .brand-tagline {
    font-size: 11px;
    opacity: 0.6;
    margin-top: 2px;
  }
  .invoice-meta {
    text-align: right;
  }
  .invoice-label {
    font-size: 11px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    opacity: 0.6;
  }
  .invoice-id {
    font-size: 22px;
    font-weight: 700;
    margin-top: 4px;
    letter-spacing: -0.3px;
    font-variant-numeric: tabular-nums;
  }
  .invoice-date {
    font-size: 13px;
    opacity: 0.7;
    margin-top: 6px;
  }
  .status-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 14px;
    padding: 6px 12px;
    border-radius: 999px;
    background: ${statusColor}22;
    border: 1px solid ${statusColor};
    color: ${statusColor};
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .status-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: ${statusColor};
  }
  .parties {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    padding: 32px 48px;
    border-bottom: 1px solid var(--nov-gray-200);
  }
  .party-label {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--nov-gray-500);
    margin-bottom: 8px;
  }
  .party-name {
    font-size: 15px;
    font-weight: 600;
    color: var(--nov-black);
  }
  .party-detail {
    font-size: 13px;
    color: var(--nov-gray-700);
    margin-top: 2px;
  }
  .items {
    padding: 32px 48px;
  }
  .items-table {
    width: 100%;
    border-collapse: collapse;
  }
  .items-table thead th {
    font-size: 10px;
    text-transform: uppercase;
    letter-spacing: 0.16em;
    color: var(--nov-gray-500);
    text-align: left;
    font-weight: 600;
    padding: 12px 0;
    border-bottom: 1px solid var(--nov-gray-200);
  }
  .items-table thead th.right { text-align: right; }
  .items-table tbody td {
    padding: 14px 0;
    border-bottom: 1px solid var(--nov-gray-100);
    font-size: 14px;
    vertical-align: top;
  }
  .items-table tbody td.right {
    text-align: right;
    font-variant-numeric: tabular-nums;
    font-weight: 500;
  }
  .totals {
    padding: 24px 48px 32px;
    display: flex;
    justify-content: flex-end;
  }
  .totals-table {
    min-width: 280px;
  }
  .totals-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    font-size: 14px;
    color: var(--nov-gray-700);
  }
  .totals-row.grand {
    border-top: 2px solid var(--nov-black);
    margin-top: 8px;
    padding-top: 16px;
    font-size: 20px;
    font-weight: 700;
    color: var(--nov-black);
    font-variant-numeric: tabular-nums;
  }
  .totals-row .label { font-weight: 500; }
  .totals-row .value { font-variant-numeric: tabular-nums; }
  .footer {
    padding: 24px 48px 40px;
    border-top: 1px solid var(--nov-gray-200);
    background: var(--nov-gray-50);
  }
  .footer-notes {
    font-size: 12px;
    color: var(--nov-gray-500);
    line-height: 1.6;
  }
  .footer-thanks {
    font-size: 13px;
    color: var(--nov-gray-700);
    margin-top: 12px;
    font-weight: 500;
  }
  .toolbar {
    position: fixed;
    top: 16px;
    right: 16px;
    display: flex;
    gap: 8px;
    z-index: 100;
  }
  .toolbar button {
    background: var(--nov-black);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: transform 0.15s ease, background 0.15s ease;
  }
  .toolbar button:hover {
    background: var(--nov-blue);
    transform: translateY(-1px);
  }
  .toolbar button.secondary {
    background: transparent;
    color: var(--nov-black);
    border: 1px solid var(--nov-gray-200);
  }
  .toolbar button.secondary:hover {
    background: var(--nov-gray-100);
  }
  @media print {
    html, body { background: #fff; }
    .page {
      margin: 0;
      max-width: none;
      border-radius: 0;
      box-shadow: none;
    }
    .toolbar { display: none !important; }
    @page { margin: 12mm; size: A4; }
  }
</style>
</head>
<body>
  <div class="toolbar">
    <button onclick="window.print()" aria-label="Print or save as PDF">🖨 Print / Save PDF</button>
    <button class="secondary" onclick="window.close()">Close</button>
  </div>

  <div class="page">
    <div class="header">
      <div class="header-top">
        <div class="brand">
          <div class="brand-mark">N</div>
          <div>
            <div class="brand-name">${escapeHtml(issuerName)}</div>
            <div class="brand-tagline">Social Media Marketing Automation</div>
          </div>
        </div>
        <div class="invoice-meta">
          <div class="invoice-label">Invoice</div>
          <div class="invoice-id">${escapeHtml(inv.publicId)}</div>
          <div class="invoice-date">${formatDate(createdAt)}</div>
          <div class="status-badge">
            <span class="status-dot"></span>
            ${escapeHtml(inv.status)}
          </div>
        </div>
      </div>
    </div>

    <div class="parties">
      <div>
        <div class="party-label">From</div>
        <div class="party-name">${escapeHtml(issuerName)}</div>
        <div class="party-detail">${escapeHtml(issuerEmail)}</div>
        <div class="party-detail">${escapeHtml(issuerAddress)}</div>
      </div>
      <div>
        <div class="party-label">Billed to</div>
        <div class="party-name">${escapeHtml(customerName)}</div>
        ${inv.customerEmail ? `<div class="party-detail">${escapeHtml(inv.customerEmail)}</div>` : ""}
        ${inv.customerCountry ? `<div class="party-detail">${escapeHtml(inv.customerCountry)}</div>` : ""}
      </div>
    </div>

    <div class="items">
      <table class="items-table">
        <thead>
          <tr>
            <th>Description</th>
            <th style="width: 80px;">Qty</th>
            <th class="right" style="width: 110px;">Unit</th>
            <th class="right" style="width: 120px;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${items
            .map(
              (it) => `<tr>
                <td>${escapeHtml(it.description)}</td>
                <td>${escapeHtml(String(it.quantity))}</td>
                <td class="right">${formatMoney(it.unitPrice, inv.currency)}</td>
                <td class="right">${formatMoney(it.total, inv.currency)}</td>
              </tr>`,
            )
            .join("\n          ")}
        </tbody>
      </table>
    </div>

    <div class="totals">
      <div class="totals-table">
        <div class="totals-row">
          <span class="label">Subtotal</span>
          <span class="value">${formatMoney(inv.amount, inv.currency)}</span>
        </div>
        ${
          inv.tax > 0
            ? `<div class="totals-row">
                <span class="label">Tax</span>
                <span class="value">${formatMoney(inv.tax, inv.currency)}</span>
              </div>`
            : ""
        }
        <div class="totals-row grand">
          <span class="label">Total ${escapeHtml(inv.currency)}</span>
          <span class="value">${formatMoney(inv.total, inv.currency)}</span>
        </div>
      </div>
    </div>

    <div class="footer">
      <div class="footer-notes">
        ${
          inv.notes
            ? escapeHtml(inv.notes)
            : `This invoice was generated automatically by NOVSMM. Payments are processed securely via our payment partners (PayPal, Mercado Pago, NowPayments). For billing questions, reply to ${escapeHtml(issuerEmail)} or open a support ticket from your dashboard.`
        }
      </div>
      <div class="footer-thanks">Thank you for your business — NOVSMM Team</div>
    </div>
  </div>

  <script>
    // Auto-open the print dialog after the layout settles. Wrapped in
    // try/catch so headless / non-window contexts don't crash.
    (function () {
      try {
        window.addEventListener("load", function () {
          setTimeout(function () {
            if (typeof window.print === "function") {
              // Don't auto-trigger in iframes — let the parent decide.
              if (window.self === window.top) {
                window.print();
              }
            }
          }, 600);
        });
      } catch (e) {
        // Ignore — print button is always available as a fallback.
      }
    })();
  </script>
</body>
</html>`;
}

// ── Helpers ──

function escapeHtml(s: string): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency || "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount ?? 0);
  } catch {
    return `$${(amount ?? 0).toFixed(2)}`;
  }
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function humanizeInvoiceType(type: string): string {
  const map: Record<string, string> = {
    order: "Order",
    topup: "Wallet top-up",
    subscription: "Subscription",
    refund: "Refund",
    wallet: "Wallet transaction",
  };
  return map[type] ?? type.charAt(0).toUpperCase() + type.slice(1);
}

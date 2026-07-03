/**
 * Mock dashboard data — realistic NOVSMM workspace telemetry.
 * Centralized so all tabs share consistent numbers.
 */

export const DASHBOARD_STATS = {
  balance: 8420.5,
  heldBalance: 1280.25,
  activeOrders: 12,
  completedOrders: 4287,
  revenueToday: 3420.8,
  revenueMonth: 84320,
  conversion: 94.2,
  avgStart: 1.4,
  uptime: 99.99,
};

export const REVENUE_SERIES = Array.from({ length: 30 }, (_, i) => ({
  d: i,
  revenue: 1800 + Math.sin(i / 2.2) * 600 + i * 45 + Math.random() * 200,
  orders: 80 + Math.sin(i / 2.6) * 22 + i * 1.5 + Math.random() * 8,
}));

export const HOURLY_ORDERS = Array.from({ length: 24 }, (_, i) => ({
  h: `${i}:00`,
  v: 30 + Math.sin(i / 2.4) * 28 + Math.random() * 18 + (i > 8 && i < 22 ? 30 : 0),
}));

export const MARKETPLACE_BREAKDOWN = [
  { name: "Instagram", value: 38, color: "#E1306C" },
  { name: "TikTok", value: 27, color: "#111111" },
  { name: "YouTube", value: 16, color: "#FF0000" },
  { name: "Telegram", value: 9, color: "#229ED9" },
  { name: "Others", value: 10, color: "#94a3b8" },
];

export type OrderStatus = "processing" | "in_progress" | "completed" | "partial" | "pending";

export const ORDERS: {
  id: string;
  service: string;
  platform: string;
  qty: number;
  cost: number;
  price: number;
  status: OrderStatus;
  progress: number;
  provider: string;
  eta: string;
  date: string;
  flag: string;
}[] = [
  { id: "A-10432", service: "Followers HQ", platform: "Instagram", qty: 1000, cost: 0.84, price: 2.4, status: "in_progress", progress: 64, provider: "Provider-04", eta: "2m", date: "Just now", flag: "🇲🇽" },
  { id: "A-10431", service: "Views (1M)", platform: "TikTok", qty: 1000000, cost: 3.2, price: 7.8, status: "processing", progress: 8, provider: "Provider-02", eta: "5m", date: "1m ago", flag: "🇧🇷" },
  { id: "A-10430", service: "Watch hours", platform: "YouTube", qty: 4000, cost: 11.0, price: 24.0, status: "completed", progress: 100, provider: "Provider-07", eta: "—", date: "12m ago", flag: "🇺🇸" },
  { id: "A-10429", service: "Plays", platform: "Spotify", qty: 5000, cost: 6.5, price: 14.9, status: "completed", progress: 100, provider: "Provider-03", eta: "—", date: "28m ago", flag: "🇪🇸" },
  { id: "A-10428", service: "Members", platform: "Telegram", qty: 500, cost: 9.0, price: 19.5, status: "partial", progress: 72, provider: "Provider-01", eta: "8m", date: "44m ago", flag: "🇮🇳" },
  { id: "A-10427", service: "Followers", platform: "X", qty: 2000, cost: 4.2, price: 9.8, status: "in_progress", progress: 41, provider: "Provider-05", eta: "6m", date: "1h ago", flag: "🇬🇧" },
  { id: "A-10426", service: "Live viewers", platform: "Twitch", qty: 100, cost: 2.1, price: 5.4, status: "pending", progress: 0, provider: "Provider-06", eta: "12m", date: "1h ago", flag: "🇨🇦" },
  { id: "A-10425", service: "Likes", platform: "Instagram", qty: 2500, cost: 1.4, price: 3.6, status: "completed", progress: 100, provider: "Provider-04", eta: "—", date: "2h ago", flag: "🇲🇽" },
  { id: "A-10424", service: "Reels views", platform: "Instagram", qty: 10000, cost: 2.8, price: 6.9, status: "completed", progress: 100, provider: "Provider-02", eta: "—", date: "3h ago", flag: "🇦🇷" },
  { id: "A-10423", service: "Followers", platform: "Facebook", qty: 800, cost: 3.2, price: 7.2, status: "completed", progress: 100, provider: "Provider-01", eta: "—", date: "5h ago", flag: "🇨🇴" },
];

export const MARKETPLACE_OFFERS = [
  { svc: "Instagram · Followers HQ", cost: 0.84, price: 2.4, margin: 186, sales: 1240, trend: "+12" },
  { svc: "TikTok · Views (1M)", cost: 3.2, price: 7.8, margin: 144, sales: 980, trend: "+8" },
  { svc: "YouTube · Watch hours", cost: 11.0, price: 24.0, margin: 118, sales: 412, trend: "+5" },
  { svc: "Spotify · Monthly listeners", cost: 6.5, price: 14.9, margin: 129, sales: 318, trend: "+3" },
  { svc: "Telegram · Members", cost: 9.0, price: 19.5, margin: 117, sales: 264, trend: "+6" },
  { svc: "X · Followers", cost: 4.2, price: 9.8, margin: 133, sales: 198, trend: "+2" },
];

export const WALLET_TXNS = [
  { id: "TX-8842", type: "sale", desc: "Order #A-10432 — Instagram Followers", amount: 2.4, time: "Just now", status: "completed" },
  { id: "TX-8841", type: "topup", desc: "Top-up via Stripe •••• 4242", amount: 500, time: "2h ago", status: "completed" },
  { id: "TX-8840", type: "withdrawal", desc: "Withdrawal to Wise · EUR", amount: -1200, time: "5h ago", status: "completed" },
  { id: "TX-8839", type: "sale", desc: "Order #A-10430 — YouTube Watch hours", amount: 24.0, time: "12m ago", status: "completed" },
  { id: "TX-8838", type: "fee", desc: "Marketplace fee · 3%", amount: -0.42, time: "Just now", status: "completed" },
  { id: "TX-8837", type: "referral", desc: "Referral bonus · @marcus", amount: 5.0, time: "1d ago", status: "completed" },
  { id: "TX-8836", type: "held", desc: "Held for order #A-10428", amount: -19.5, time: "44m ago", status: "pending" },
];

export const TICKETS = [
  {
    id: "T-201",
    subject: "Order started but no delivery",
    status: "open",
    priority: "high",
    lastReply: "Support · 8m ago",
    preview: "Hi! Checking with the provider now — should resolve in 10 min.",
    msgs: [
      { from: "me", text: "Order #A-10428 started but I don't see members joining yet.", time: "32m ago" },
      { from: "support", text: "Hi Daniela! Checking with the provider now — should resolve in 10 min.", time: "8m ago" },
    ],
  },
  {
    id: "T-198",
    subject: "Crypto top-up not reflected",
    status: "waiting",
    priority: "medium",
    lastReply: "You · 2h ago",
    preview: "Sent the TX hash, please confirm.",
    msgs: [
      { from: "me", text: "Sent 0.0042 BTC ~30 min ago, not reflected yet. TX: 1a2b3c…", time: "2h ago" },
      { from: "support", text: "Got it — we'll verify on the next block confirmation.", time: "1h ago" },
    ],
  },
];

export const ADMIN_USERS = [
  { id: "U-1001", name: "Daniela Ríos", email: "daniela@pulsemedia.io", role: "Admin", balance: 8420.5, status: "active", orders: 4287, joined: "Jan 2025" },
  { id: "U-1002", name: "Marcus Chen", email: "marcus@resellerstack.io", role: "Reseller", balance: 14200.0, status: "active", orders: 12480, joined: "Dec 2024" },
  { id: "U-1003", name: "Amara Okafor", email: "amara@lumina.agency", role: "Agency", balance: 3200.0, status: "active", orders: 8420, joined: "Nov 2024" },
  { id: "U-1004", name: "Tomás Rivera", email: "tomas@boostlab.mx", role: "Reseller", balance: 980.5, status: "suspended", orders: 1240, joined: "Feb 2025" },
  { id: "U-1005", name: "Sophie Laurent", email: "sophie@northpeak.fr", role: "Enterprise", balance: 42100.0, status: "active", orders: 28400, joined: "Oct 2024" },
  { id: "U-1006", name: "Kenji Watanabe", email: "kenji@orbitsocial.jp", role: "Reseller", balance: 6780.0, status: "pending", orders: 0, joined: "2d ago" },
  { id: "U-1007", name: "Elena Petrova", email: "elena@verge.media", role: "Agency", balance: 15400.0, status: "active", orders: 9820, joined: "Sep 2024" },
];

export const ADMIN_PROVIDERS = [
  { id: "P-01", name: "Provider-01", api: "smmapi.io", latency: 142, status: "healthy", services: 84, cost: "$1.2K/mo" },
  { id: "P-02", name: "Provider-02", api: "boostpanel.dev", latency: 98, status: "healthy", services: 72, cost: "$980/mo" },
  { id: "P-03", name: "Provider-03", api: "justsmm.net", latency: 240, status: "degraded", services: 48, cost: "$640/mo" },
  { id: "P-04", name: "Provider-04", api: "royalpanel.com", latency: 88, status: "healthy", services: 92, cost: "$1.4K/mo" },
];

export const ADMIN_SERVICES = [
  { id: "S-001", name: "Instagram · Followers HQ", platform: "Instagram", cost: 0.84, price: 2.4, min: 50, max: 100000, status: "active", rate: "1.2K/d" },
  { id: "S-002", name: "TikTok · Views (1M)", platform: "TikTok", cost: 3.2, price: 7.8, min: 100, max: 5000000, status: "active", rate: "3.4K/d" },
  { id: "S-003", name: "YouTube · Watch hours", platform: "YouTube", cost: 11.0, price: 24.0, min: 1000, max: 50000, status: "active", rate: "420/d" },
  { id: "S-004", name: "Spotify · Plays", platform: "Spotify", cost: 6.5, price: 14.9, min: 500, max: 500000, status: "active", rate: "820/d" },
  { id: "S-005", name: "Telegram · Members", platform: "Telegram", cost: 9.0, price: 19.5, min: 100, max: 20000, status: "paused", rate: "260/d" },
];

export const ROLES = [
  { name: "Administrator", users: 2, permissions: "All access", color: "#0052ff" },
  { name: "Supervisor", users: 5, permissions: "Manage users, orders", color: "#10b981" },
  { name: "Support", users: 12, permissions: "Tickets, view-only", color: "#f59e0b" },
  { name: "Moderator", users: 4, permissions: "Content moderation", color: "#8b5cf6" },
  { name: "Reseller", users: 18442, permissions: "Marketplace, own orders", color: "#64748b" },
  { name: "User", users: 166058, permissions: "Buy services", color: "#94a3b8" },
];

export const TOPUP_METHODS = [
  { name: "PayPal", glyph: "P", tone: "from-blue-500/15 to-blue-500/5 text-blue-700", time: "Instant", fee: "3.49% + $0.49", currencies: "USD, EUR, GBP, +25" },
  { name: "Mercado Pago", glyph: "M", tone: "from-cyan-500/15 to-cyan-500/5 text-cyan-700", time: "Instant", fee: "3.99%", currencies: "BRL, MXN, ARS, +6" },
  { name: "DePay", glyph: "D", tone: "from-indigo-500/15 to-indigo-500/5 text-indigo-700", time: "~3 min", fee: "1% (crypto)", currencies: "ETH, USDT, USDC, DAI, +1000 ERC-20" },
];

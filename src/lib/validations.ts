import { z } from "zod";

// ── Auth schemas ──

// SECURITY (OWASP A07-2, P2): strong password policy — ≥8 chars AND at
// least 3 of 4 character classes (uppercase, lowercase, digit, special).
// Applied to registration, password-change, and password-reset.
export const strongPasswordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(1024, "Password is too long")
  .refine((pw) => /[A-Z]/.test(pw), "Password must contain an uppercase letter")
  .refine((pw) => /[a-z]/.test(pw), "Password must contain a lowercase letter")
  .refine((pw) => /[0-9]/.test(pw), "Password must contain a digit")
  .refine((pw) => /[^A-Za-z0-9]/.test(pw), "Password must contain a special character")
  .refine((pw) => !/(.)\1{2,}/.test(pw), "Password must not contain 3+ repeated characters");

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: strongPasswordSchema,
  confirm: z.string(),
  country: z.string().default("Mexico"),
  currency: z.string().default("USD"),
  // BROAD-FIX-BATCH-1: language must be an ISO code (en/es/pt/fr), NOT the
  // display name. The previous default "English" caused `useTranslation` to
  // do `"English".slice(0,2)` = "en" (worked by coincidence) but
  // "Português".slice(0,2) = "po" (broken — fell back to English).
  language: z.string().default("en"),
  // ASVS V11.6.1: referral code (optional) — anti-self-referral check
  // happens in the route handler (IP + email domain match).
  referralCode: z.string().optional(),
}).refine((d) => d.password === d.confirm, {
  message: "Passwords don't match",
  path: ["confirm"],
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

// ── Order schemas ──
export const createOrderSchema = z.object({
  serviceId: z.string().min(1),
  quantity: z.number().int().positive(),
  link: z.string().url().optional().or(z.literal("")),
});

// ── Wallet schemas ──
export const topupSchema = z.object({
  amount: z.number().positive().max(50000, "Max $50,000 per top-up"),
  method: z.string().min(1),
  reference: z.string().optional(),
});

export const withdrawSchema = z.object({
  amount: z.number().positive().min(10, "Minimum withdrawal is $10"), // ASVS V11.6.2
  method: z.string().min(1),
  destination: z.string().min(1),
});

// ── Admin schemas ──
export const createServiceSchema = z.object({
  name: z.string().min(2),
  platform: z.string().min(1),
  category: z.string().default("general"),
  cost: z.number().nonnegative(),
  price: z.number().positive(),
  minQty: z.number().int().positive().default(1),
  maxQty: z.number().int().positive(),
  rate: z.string().default("0/d"),
  providerId: z.string().optional(),
});

export const createProviderSchema = z.object({
  name: z.string().min(2),
  apiUrl: z.string().url(),
  apiKey: z.string().optional(),
});

export const createPaymentMethodSchema = z.object({
  name: z.string().min(2),
  glyph: z.string().default("$"),
  tone: z.string().default(""),
  settleTime: z.string().default("Instant"),
  fee: z.string().default("0%"),
  currencies: z.string().default("USD"),
});

export const createNotificationSchema = z.object({
  type: z.enum([
    "order", "sale", "marketplace", "ticket",
    "recharge", "withdrawal", "referral", "system",
  ]),
  title: z.string().min(2),
  message: z.string().min(2),
  severity: z.enum(["info", "success", "warning", "error"]).default("info"),
  broadcast: z.boolean().default(false),
  audience: z.enum(["all", "users", "admins"]).default("all"),
});

export const updateUserSchema = z.object({
  id: z.string(),
  role: z.enum(["user", "reseller", "agency", "admin"]).optional(),
  status: z.enum(["active", "suspended", "pending"]).optional(),
  // SECURITY (OWASP A04-2, P1): `balance` is intentionally NOT accepted here.
  // All balance changes must go through the dedicated /api/admin/users/adjust-balance
  // endpoint, which creates a Transaction row (audit trail), requires a `reason`,
  // and uses a race-safe $transaction. Allowing balance edits via the generic
  // PATCH route would permit silent financial manipulation with no audit trail.
}).strict();

// ── Admin PATCH schemas (strict — reject unknown fields) ──
// All updateable fields are optional (PATCH = partial update);
// `id` is required because it drives the WHERE clause and is NOT
// part of the data spread into Prisma's update().

export const updateProviderSchema = z.object({
  id: z.string().min(1, "Provider ID required"),
  name: z.string().min(1).max(255).optional(),
  apiUrl: z.string().url().optional(),
  apiKey: z.string().optional(),
  status: z.enum(["healthy", "degraded", "down"]).optional(),
  latency: z.number().int().min(0).optional(),
}).strict();

export const updatePaymentMethodSchema = z.object({
  id: z.string().min(1, "ID required"),
  name: z.string().min(1).max(255).optional(),
  glyph: z.string().max(32).optional(),
  tone: z.string().max(64).optional(),
  settleTime: z.string().max(64).optional(),
  fee: z.string().max(64).optional(),
  currencies: z.string().max(255).optional(),
  status: z.enum(["active", "maintenance", "disabled"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
  // config is the credentials blob — accept any JSON object (or null to clear)
  config: z.record(z.string(), z.unknown()).nullable().optional(),
}).strict();

export const updateCurrencySchema = z.object({
  id: z.string().min(1, "ID required"),
  code: z.string().min(1).max(16).optional(),
  name: z.string().min(1).max(255).optional(),
  symbol: z.string().min(1).max(16).optional(),
  rate: z.number().nonnegative().optional(),
  status: z.enum(["active", "disabled"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

export const updateLanguageSchema = z.object({
  id: z.string().min(1, "ID required"),
  code: z.string().min(1).max(16).optional(),
  name: z.string().min(1).max(255).optional(),
  nativeName: z.string().min(1).max(255).optional(),
  flag: z.string().min(1).max(16).optional(),
  status: z.enum(["active", "disabled"]).optional(),
  sortOrder: z.number().int().min(0).optional(),
}).strict();

// ── License schemas ──
// ADMIN-FIX-BATCH-2: the License model comment lists the supported plans as
// `reseller | agency | enterprise | white_label` (default "reseller"). The
// admin UI issue-modal uses the same 4 values. We now enforce this server-side
// so a stray client (or a future API consumer) can't persist an unknown plan
// string into the DB — which would later render as a blank plan chip in the
// licenses table.
//
// NOTE: the task brief suggested `["starter", "pro", "business", "enterprise"]`,
// but grepping the codebase showed those values aren't used anywhere — the
// actual values are the four above. Per the brief ("Use the actual values you
// find. If they're different, use those.") we use the schema/UI values.
export const LICENSE_PLANS = ["reseller", "agency", "enterprise", "white_label"] as const;
export type LicensePlan = (typeof LICENSE_PLANS)[number];

export const createLicenseSchema = z.object({
  customerName: z.string().min(1, "Customer name is required"),
  customerEmail: z.string().email("Invalid email address"),
  customerId: z.string().optional().nullable(),
  plan: z.enum(LICENSE_PLANS).default("reseller"),
  domain: z.string().optional().nullable(),
  ipAllowlist: z.string().optional().nullable(),
  maxUsers: z.number().int().positive().default(1),
  maxOrders: z.number().int().positive().default(10000),
  expiresAt: z.string().optional().nullable(),
}).strict();

export const updateLicenseSchema = z.object({
  id: z.string().min(1, "License ID required"),
  action: z.enum(["suspend", "revoke", "activate"]).optional(),
  plan: z.enum(LICENSE_PLANS).optional(),
  domain: z.string().nullable().optional(),
  ipAllowlist: z.string().nullable().optional(),
  maxUsers: z.number().int().positive().optional(),
  maxOrders: z.number().int().positive().optional(),
  expiresAt: z.string().nullable().optional(),
}).strict();

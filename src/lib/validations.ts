import { z } from "zod";

// ── Auth schemas ──
export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(/^[a-zA-Z0-9_]+$/, "Only letters, numbers, and underscores"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirm: z.string(),
  country: z.string().default("Mexico"),
  currency: z.string().default("USD"),
  language: z.string().default("English"),
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
  amount: z.number().positive(),
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
  balance: z.number().optional(),
});

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

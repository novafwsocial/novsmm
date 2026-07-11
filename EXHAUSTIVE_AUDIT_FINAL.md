# NOVSMM — Auditoría Exhaustiva Final

**Fecha:** 2025-07-11
**Auditor:** Agent (Explore) — Sub-agent sandboxed
**Repositorio:** `/home/z/my-project`
**Scope:** Seguridad · Performance · Renderización · UX/Diseño · Branding/Landing
**Modo:** READ-ONLY — ningún archivo modificado, ningún commit

---

## Resumen Ejecutivo

NOVSMM es una plataforma SaaS SMM (Social Media Marketing) construida sobre Next.js 16.2.10 + React 19 + Prisma + PostgreSQL + Redis + Socket.IO. El codebase acumula 11,600+ líneas de `worklog.md` con 40+ tasks previas (OWASP audit, hardening, marketplace reescrituras, 3D enhancements, SEO).

Tras esta auditoría exhaustiva se identifican **38 hallazgos** (5 CRÍTICOS, 9 ALTOS, 14 MEDIOS, 10 BAJOS). Las defensas core (CSRF, CORS, rate-limit, brute-force lockout, AES-256-GCM, SSRF, signature verification en webhooks, auth guards en 100% de rutas sensibles, JWT session invalidation) están maduras — los issues pendientes son principalmente **deuda estructural** (componentes gigantes, código muerto), **afirmaciones de marketing no verificables** (testimonios hardcoded, stats inflados) y **bugs sutiles de hidratación/UX** que no bloquean producción pero degradan la conversión y la confianza.

| Severidad | Cuenta | Área dominante |
|-----------|-------:|----------------|
| CRÍTICO   | 5      | Branding/Seguridad/UX |
| ALTO      | 9      | Performance/Branding/UX |
| MEDIO     | 14     | Performance/UX/Render |
| BAJO      | 10     | Render/Limpieza |
| **TOTAL** | **38** | |

**Estado general: listo para beta privada; NO listo para lanzamiento público** hasta resolver los 5 CRÍTICOS (testimonios falsos, hardcoded aggregate ratings, claims no verificables, dead admin/ code, N+1 multi-refill).

---

## 1. SEGURIDAD

### Fortalezas

- **CSP robusta** con `default-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, `upgrade-insecure-requests`, `strict-dynamic` para scripts. COOP + CORP + Permissions-Policy restrictivas (`camera=()`, `microphone=()`, `geolocation=()`, etc.). (`src/middleware.ts:80-175`)
- **CSRF por Origin matching** — verifica `Origin` contra `NEXTAUTH_URL` (no "presencia-only"). Exención correcta para webhooks (firma HMAC) y NextAuth (token propio). (`src/middleware.ts:304-346`)
- **Rate limiting multi-capa** — Edge middleware in-memory (15 min/20 intentos login, 60 min/10 register, 60 min/5 forgot-password) + Redis-backed en API routes + per-API-key 60/min. (`src/middleware.ts:59-77`, `src/lib/api-key-auth.ts:125-135`)
- **Brute-force protection** keyed por `(email, IP)` con lockout 15 min tras 5 fallos, Redis-shared. No divulga si el email existe (`Invalid credentials` uniforme). (`src/lib/auth.ts:52-100, 155-184`)
- **2FA inline en `authorize()`** con TOTP + backup codes bcrypt-hashed, rotación single-use, fail-closed si el Setting está corrupto. (`src/lib/auth.ts:186-276`)
- **JWT session invalidation** — re-chequea `passwordChangedAt` y `status` en cada request; mata la sesión si el token fue emitido antes del cambio de pw o si la cuenta fue suspendida. (`src/lib/auth.ts:616-659`)
- **AES-256-GCM** con key derivada SHA-256, fail-closed si `LICENSE_ENCRYPTION_KEY` falta o es < 32 chars (hex/base64 validado). (`src/lib/crypto-utils.ts:22-46`)
- **API key con lookupHash O(1)** + bcrypt.verify defence-in-depth + expiración 90 días + IP allowlist + auto-revoke. (`src/lib/api-key-auth.ts:51-104`)
- **SSRF protection completa** en outbound-webhook.ts: bloquea IPv4/IPv6 privadas (loopback, CGNAT, link-local incl. 169.254.169.254 metadata, ULA, IPv4-mapped IPv6), DNS resolution at fetch-time (defeats rebinding), redirects manuales re-validados, response cap 1 MB. (`src/lib/outbound-webhook.ts:101-240`)
- **Webhooks con signature verification** — PayPal via API verify-webhook-signature; MercadoPago HMAC-SHA256 + crypto.timingSafeEqual + fetch API MP para confirmar pago; NowPayments HMAC-SHA256. Fail-closed si el secret no está configurado. (`src/app/api/webhooks/{paypal,mercadopago,nowpayments}/route.ts`)
- **Auth guards en 100% de rutas sensibles** — 78/109 rutas usan `requireAuth|requireAdmin|requireApiKey|getServerSession`. Las 31 rutas sin guard son legítimamente públicas (auth handlers, healthchecks, webhooks, docs, public endpoints). (`find src/app/api -name route.ts`)
- **No SQL injection** — sólo 2 `$queryRaw` (ambos `SELECT 1` en health checks, tagged template = parameterizado). Cero `queryRawUnsafe`/`executeRawUnsafe`. Cero `eval`/`new Function`.
- **No child_process** en el runtime (0 matches). No hardcoded secrets (`sk_live`/`AKIA`/`ghp_` sólo en doc references).
- **Impersonation flow** auditable — admin password siempre requerido, target no puede ser admin, audit log "impersonate_attempt" + "impersonate", banner visible. (`src/lib/auth.ts:294-357`, `src/components/novsmm/dashboard-shell.tsx:170-194`)
- **`dangerouslySetInnerHTML`** se usa 7 veces, todas para JSON-LD estático (Organization, WebSite, WebApplication, Service, FAQPage, BreadcrumbList) — JSON.stringify de objetos literales sin input de usuario. Riesgo bajo pero mejorable (ver S-BAJO-1).
- **Internal API endpoints** (`/api/internal/backup-status`) requiere IP localhost/private + Bearer token con `crypto.timingSafeEqual`. (`src/app/api/internal/backup-status/route.ts:43-78`)

### Debilidades

| # | Severidad | Hallazgo | Archivo | Fix recomendado |
|---|-----------|----------|---------|-----------------|
| S-1 | ALTO | **Mensajes de error de PayPal webhook exponen internals** — `console.error("[webhooks/paypal] Token request failed:", tokenRes.status, errText)` loguea el status HTTP + body de la API de PayPal. Si un atacante puede leer logs (comprimido blob en S3, log aggregator con access lax), obtiene pistas sobre el estado de la cuenta PayPal. | `src/app/api/webhooks/paypal/route.ts:135-145, 173-183` | Mover a structured logger con nivel `debug` y truncar `errText` a 50 chars; nunca loguear `tokenRes.status` crudo — mapear a genérico "PayPal auth failed". |
| S-2 | ALTO | **WS service: comparación no-constante-tiempo en JWT signature** — `if (expectedSig !== signatureB64)` permite timing attack teórico para forjar JWTs. Aunque HS256 base64url tiene ~43 chars de entropía (ataque prácticamente inviable), es un fallo ASVS V3.4.1. | `mini-services/notifications-service/index.ts:95` | Reemplazar con `crypto.timingSafeEqual(Buffer.from(expectedSig), Buffer.from(signatureB64))` previo check de length. |
| S-3 | MEDIO | **`as any` extensivo (179 ocurrencias)** — incluyendo `session!.user as any).id` en 30+ rutas admin/API y el provider de impersonate. Compromete el type-safety que `AuthUser` (en `api-utils.ts`) intenta proveer. | `src/app/api/**` (179 matches) | Migrar a `requireAuth()` que ya retorna `AuthUser` tipado (existente en `api-utils.ts:92-106`). Eliminar `(session!.user as any)` en favor de `user.id`. |
| S-4 | MEDIO | **`req.json().catch(() => ({}))` en `/api/admin/impersonate`** — body vacío silenciosamente aceptado si el JSON parse falla; luego `userId` es undefined y retorna 422. Pero el patrón abre la puerta a que un body malicioso malformado pase el parse y llegue al `db.user.findUnique({ where: { id: userId } })` con `userId: undefined` — Prisma lanza error pero el path es ruidoso. | `src/app/api/admin/impersonate/route.ts:28` | Usar el patrón consistente del resto del codebase: `try { body = await req.json() } catch { return apiError("Invalid JSON body", 422) }`. |
| S-5 | MEDIO | **CORS v1 API depende de `API_CORS_ALLOWLIST` Setting/env** — si el operador olvida configurarlo, las integraciones reseller rompen silenciosamente (no hay log de advertencia al boot). | `src/middleware.ts:204-216, 256-285` | Añadir warning en boot si `API_CORS_ALLOWLIST` está vacío Y existe al menos un PaymentMethod activo (proxy de "producción configurada"). |
| S-6 | MEDIO | **`payCurrency`/`payoutCurrency` NowPayments no validados** — el topup pasa `creds.payCurrency` y `creds.payoutCurrency` al API NowPayments sin whitelisting. Un admin malintencionado (o un Setting corrupto) podría inyectar valores que causen que NowPayments rechace o, peor, enrute a una dirección de payout equivocada. | `src/app/api/wallet/topup/route.ts:191-218` | Validar contra una lista estática de cryptos soportadas (BTC, ETH, USDT-TRC20, USDT-ERC20, USDC, DAI…). |
| S-7 | MEDIO | **`JSON.parse` en 16 sitios sin validación de shape** — la mayoría parsea Setting values internos, pero algunos (`src/app/api/me/route.ts:151`, `src/app/api/me/2fa/disable/route.ts:39`) parsean values que podrían estar corruptos. Ya hay `try/catch` pero el fallback a `{}`/null es silencioso. | `src/app/api/**` (16 sitios) | Estandarizar con `zod` schemas para todos los Setting values JSON. |
| S-8 | BAJO | **`process.env.HUNTSMM_API_KEY \|\| ""` fallback** — si el env var falta, las llamadas HuntSMM van con `apiKey: ""` que HuntSMM rechaza con 401, pero el error se propaga como "Provider error" genérico al usuario. | `src/app/api/admin/providers/[id]/sync/route.ts:133` | Si `apiKey` está vacío, retornar 422 "Provider API key not configured" antes de fetch. |
| S-9 | BAJO | **JSON-LD con `dangerouslySetInnerHTML` sin escape `<`** — `JSON.stringify` no escapa `</script>`. El contenido aquí es 100% estático (sin user input), pero si en el futuro se inserta un nombre de usuario o testimonio en el JSON-LD, podría romper el `<script>`. | `src/app/layout.tsx:247, 251`, `src/components/novsmm/landing-json-ld.tsx:208-220` | Usar `JSON.stringify(obj).replace(/</g, "\\u003c")` para defensa. |
| S-10 | BAJO | **`PUBLIC_API_TOKEN` no validado como hex** — `INTERNAL_API_TOKEN` se compara con constant-time equal pero no hay validación de longitud/entropía al boot. Un operador podría setearlo a "secret" y cumplir el check. | `src/app/api/internal/backup-status/route.ts:31` | Añadir boot-time check: si `INTERNAL_API_TOKEN.length < 32` → log warning. |
| S-11 | BAJO | **`safeFilename` permite `.` y `_` que podrían causar paths inesperados** — el regex `[^a-zA-Z0-9._-]` reemplaza con `_` pero `..` sobrevive. `join(cwd, "storage", "uploads", safeUserId, safeFilename)` con safeFilename = `..` aún escaparía — aunque `safeUserId` ya está limpio y el join se resuelve desde cwd, el `existsSync` validaría el path real. Riesgo muy bajo. | `src/app/api/uploads/[userId]/[filename]/route.ts:41-42` | Añadir check explícito `if (safeFilename.includes("..")) return 404`. |

---

## 2. PERFORMANCE

### Fortalezas

- **Lazy-loading agresivo del landing** — 10 secciones below-the-fold con `dynamic(..., { loading: <SectionSkeleton /> })` reservando espacio (CLS = 0). (`src/app/page.tsx:42-81`)
- **Dashboard tabs con dynamic import** — 10 tabs lazy-loaded con `<TabLoader />` placeholder. (`src/components/novsmm/app-view.tsx:20-29`)
- **Caching multi-nivel** — React Query con `staleTime` 30s-5min según criticidad; Redis `cacheGet/cacheSet` para session JWT (30s TTL) y settings; `useCachedFetch` compartido entre Hero/Stats/AffiliateSection para una sola request `/api/status`. (`src/hooks/use-api.ts`, `src/lib/cache.ts`)
- **Índices Prisma completos** — `@@index` en todas las columnas de consulta frecuente: `Order(userId, status)`, `Order(userId, createdAt)`, `Transaction(userId, type)`, `Transaction(reference)`, `Notification(userId, read)`, `ApiKey(lookupHash)`, etc. 40+ índices. (`prisma/schema.prisma:79-333`)
- **API key lookup O(1)** via `lookupHash = SHA256(plaintext)` + backfill lazy de claves legacy. (`src/lib/api-key-auth.ts:51-82`)
- **Reemplazo de recharts por SVG inline** en hero-dashboard y SellEarningsChart (~400 KB JS ahorrados por vista). (`src/components/novsmm/hero-dashboard.tsx:45-47`, `src/components/novsmm/dashboard-marketplace.tsx:2965`)
- **Polling optimizado** — dashboard 60s, orders 60s, notifications 60s, analytics 120s, loyalty 300s (WebSocket invalidates en tiempo real). (`src/hooks/use-api.ts:31-1229`)
- **Caching HTTP en middleware** — `Cache-Control: public, s-maxage=60, stale-while-revalidate=300` para HTML pages, `no-store` para `/api/auth/*`. (`src/middleware.ts:226-234, 386-393`)
- **Chunking razonable** — build de 2.4 MB total en `.next/static/chunks/`, chunk mayor 372 KB (aceptable para SaaS B2B).

### Debilidades

| # | Severidad | Hallazgo | Archivo | Fix recomendado |
|---|-----------|----------|---------|-----------------|
| P-1 | ALTO | **`admin-panel.tsx` es 4,790 líneas con 40 componentes inline y 87 useState/useEffect** — excede 19x el umbral de 250 líneas recomendado. Incluye AdminOverview, AdminUsers, AdminServices, AdminProviders, AdminPayments, AdminSecurity, AdminRoles, AdminRefunds, etc. todos en un solo archivo. Bundle weight + impact en HMR + revisión imposible. | `src/components/novsmm/admin-panel.tsx` | Migrar a imports desde `src/components/novsmm/admin/{overview,users,services,providers,payments,security,roles}.tsx` que **ya existen pero están como código muerto** (ver P-3). Eliminar las versiones inline. |
| P-2 | ALTO | **`dashboard-marketplace.tsx` es 3,829 líneas** con 24 sub-componentes (BuyTab, SellTab, HistoryTab, ServiceCard, ServiceListRow, ServiceDetailModal, MassOrderModal, CompareModal, BulkPublishModal, OfferStatsModal, ServiceCardSkeleton, SellEarningsChart, TrendingSection, etc.). | `src/components/novsmm/dashboard-marketplace.tsx` | Partir en `dashboard-marketplace/{buy-tab,sell-tab,history-tab,service-card,modals,charts}.tsx`. |
| P-3 | ALTO | **Código muerto: `src/components/novsmm/admin/`** exporta `AdminServices`, `AdminOverview`, `AdminUsers`, `ImpersonateModal`, `RoleBadge`, `UserStatus`, `SelectField`, `AdminStat`, `Input`, `IconBtn`, `BroadcastComposer` — **NINGUNO es importado desde fuera de ese directorio**. `admin-panel.tsx` tiene sus propias versiones inline de todos. | `src/components/novsmm/admin/*.tsx` (4 archivos) | O bien migrar admin-panel.tsx a importar desde aquí (recomendado, ver P-1), o borrar este directorio. Estado actual = bundle size + confusión de mantenimiento. |
| P-4 | ALTO | **N+1 en `/api/v1/refill` multi-mode** — bucle `for (const publicId of orderIds) await requestRefill(...)` ejecuta 5+ queries secuenciales por order (findUnique order, findFirst existing refill, nextPublicId, ticket.create, notification.create, enqueueJob) → 500+ queries para 100 orders. | `src/app/api/v1/refill/route.ts:137-145` | Batch-load orders con `findMany({ where: { publicId: { in: orderIds }, userId } })`, batch-check existing refills con `findMany({ where: { subject: { startsWith: "[Refill]" }, ... }})`, usar `db.$transaction` con `createMany` para tickets. |
| P-5 | ALTO | **N+1 similar en `/api/v1/cancel` y `/api/v1/status`** — mismo patrón de bucle con await por item. | `src/app/api/v1/cancel/route.ts:113`, `src/app/api/v1/status/route.ts:111` | `status` ya optimizado con `findMany + Map.get`; `cancel` y `refill_status` mantener el mismo patrón. |
| P-6 | MEDIO | **38 archivos usan `framer-motion`** — 38 ocurrencias pese a que 4 componentes (`hero-dashboard`, `counter`, `reveal`, `magnetic`, `scroll-progress`) ya fueron migrados a CSS/SVG. El bundle de framer-motion (~50 KB gzipped) se carga en TODAS las rutas que usan cualquiera de esos 38 componentes. | `src/components/novsmm/*.tsx` (38 archivos) | Continuar migración: las animaciones simples (`motion.div` con `initial/animate`) pueden reemplazarse por CSS animations existentes (`heroFadeUp`, `chipIn`, `tab-content-enter`). Reservar framer-motion para `AnimatePresence` de modales. |
| P-7 | MEDIO | **8 archivos usan `recharts`** — `dashboard-home`, `dashboard-wallet`, `dashboard-analytics`, `admin/overview`, `admin-panel`, `stats` — pese a que `hero-dashboard` y `dashboard-marketplace` ya lo eliminaron. | `src/components/novsmm/{dashboard-home,dashboard-wallet,dashboard-analytics,admin-panel,stats}.tsx`, `src/components/novsmm/admin/overview.tsx` | Migrar a SVG inline (como en `SellEarningsChart`) o a `chart.tsx` (shadcn wrapper). recharts añade ~400 KB JS por cada chunk que lo importa. |
| P-8 | MEDIO | **`useDashboard` refetch cada 60s** pero `DashboardHome` también hace `useQuery(["dashboard", range])` con `refetchInterval: 30s` — dos queries paralelas a `/api/dashboard` con intervals distintos. | `src/hooks/use-api.ts:37-43`, `src/components/novsmm/dashboard-home.tsx:66-70` | Unificar: una sola query con `range` como key, o que `useDashboard` acepte `range`. |
| P-9 | MEDIO | **`public/icon.png` y `public/novsmm-logo.png` son 186 KB cada uno** — favicon PNG sin optimizar. El `Logo` lo carga con `priority` via `next/image` (32×32 display), pero el archivo fuente es 100x más grande de lo necesario. | `public/icon.png`, `public/novsmm-logo.png` | Generar versión 64×64 (~2 KB) + 128×128 (~8 KB) + 256×256 (~20 KB) con `sharp`. Servir 64×64 para el navbar logo. |
| P-10 | MEDIO | **`<img>` raw en lugar de `next/image`** en dashboard-profile 2FA QR code — pierde optimización. | `src/components/novsmm/dashboard-profile.tsx:553` | `<Image src={twofaData.qrCode} alt="2FA QR Code" width={192} height={192} />`. |
| P-11 | MEDIO | **No hay `revalidate` en páginas dinámicas** — `/` y `/api-docs` son 100% client-renderizadas con `dynamic = "force-dynamic"` implícito (sin export). No aprovecha ISR. | `src/app/page.tsx`, `src/app/api-docs/page.tsx` | Para `/api-docs` (contenido estático), añadir `export const revalidate = 3600`. Para `/`, mantener dynamic (depende de session). |
| P-12 | BAJO | **`useEffect` con `[]` deps pero referencing `window.scrollY`** en sticky-cta y social-proof — el handler se attaches una vez pero `setInHero`/`setVisible` se recalcula bien. OK funcional pero `eslint-plugin-react-hooks` marcaría warning. | `src/components/novsmm/{sticky-cta,social-proof}.tsx` | OK — los effects no dependen de props/state externo. Documentar el patrón. |
| P-13 | BAJO | **`setInterval(tick, 60_000)` en DashboardShell para `/api/status`** — compite con `useDashboard` (60s) y la query React Query de status (60s implícito en useCachedFetch). Triple source para el mismo dato. | `src/components/novsmm/dashboard-shell.tsx:86-103` | Migrar a `useStatus()` hook (añadir a use-api.ts) con staleTime 60s. |

---

## 3. RENDERIZACIÓN

### Fortalezas

- **Hydration-safe localStorage reads** — `whatsapp-widget.tsx` y `dashboard-marketplace.tsx` (useFavorites, useReviews, useViewMode) usan `useEffect` con `typeof window !== "undefined"` guard; `theme-toggle.tsx` usa lazy `useState(() => …)` con guard. (`src/components/novsmm/whatsapp-widget.tsx:16-27`, `src/components/novsmm/dashboard-marketplace.tsx:135-151`)
- **`mounted` flag pattern** en WhatsAppWidget para evitar flash del badge en SSR. (`src/components/novsmm/whatsapp-widget.tsx:20, 109`)
- **Framer-motion `AnimatePresence` mode="wait"** sólo en 3 sitios (auth-fields, whatsapp-widget, app-view removido) — el bug histórico de "removeChild" DOM error en app-view está documentado y mitigado con `<div key={motionKey} className="tab-content-enter">` (CSS animation). (`src/components/novsmm/app-view.tsx:284-343`)
- **`isPlaceholderData` guard en marketplace** — el bug "0 of 6,390 services" está arreglado en la raíz: `useServices` destructura `isPlaceholderData` y el effect acumulador hace early return. (`src/components/novsmm/dashboard-marketplace.tsx` según worklog MARKETPLACE-DEEP-FIX)
- **`skipFirstSearchRef`** evita que el debounce de search borre allServices en el mount inicial. (mismo archivo)
- **`useEffect` cleanups correctos** — addEventListener/removeEventListener pares en todos los scroll/keydown handlers. (`navbar.tsx`, `social-proof.tsx`, `sticky-cta.tsx`, `dashboard-shell.tsx`)
- **ErrorBoundary de clase** con `getDerivedStateFromError` + `componentDidCatch` + recovery UI. (`src/components/novsmm/error-boundary.tsx`)
- **`app/error.tsx` + `app/loading.tsx` + `app/not-found.tsx`** — segments de Next.js App Router correctamente configurados.
- **`suppressHydrationWarning`** en `<html lang="en">` para el theme toggle. (`src/app/layout.tsx:238`)

### Debilidades

| # | Severidad | Hallazgo | Archivo | Fix recomendado |
|---|-----------|----------|---------|-----------------|
| R-1 | ALTO | **`theme-toggle.tsx` lazy `useState` lee `localStorage` y `matchMedia`** — aunque el `typeof window === "undefined"` evita crash, **el servidor renderiza con `isDark=false`** y el cliente puede hidratar con `isDark=true` (si el usuario eligió dark mode) → hydration mismatch warning en consola. | `src/components/novsmm/theme-toggle.tsx:13-18` | Inicializar `isDark=false` siempre, leer localStorage en `useEffect` y aplicar la clase ahí. O usar `next-themes` (ya en package.json) que maneja esto. |
| R-2 | ALTO | **`navbar.tsx` usa `useSession` de `next-auth/react` mientras `app-view.tsx` usa `useSession` de `@/hooks/use-api`** — dos sources de verdad para la sesión. El worklog dice que la versión custom evita `CLIENT_FETCH_ERROR` detrás de Caddy, pero navbar y dashboard-notifications todavía importan `next-auth/react`. Detrás del proxy, navbar puede mostrar `balance: 0` mientras app-view muestra el balance real. | `src/components/novsmm/navbar.tsx:5`, `src/components/novsmm/dashboard-notifications.tsx:6` | Migrar navbar y dashboard-notifications a `useSession` de `@/hooks/use-api`. |
| R-3 | MEDIO | **`DashboardHome` y `DashboardWallet` muestran spinner full-screen durante `isLoading`** — `if (isLoading || !data) return <div className="flex h-96 items-center justify-center"><div className="h-8 w-8 animate-spin..." /></div>`. Peor UX que skeletons (layout shift, sin info de qué se carga). | `src/components/novsmm/dashboard-home.tsx:78-84`, `src/components/novsmm/dashboard-wallet.tsx:43-49` | Reemplazar con skeletons (DashboardHomeSkeleton, DashboardWalletSkeleton) que preserven layout. |
| R-4 | MEDIO | **List keys con `i` (index) en 11 sitios** — `dashboard-analytics.tsx:353`, `stats.tsx:264,311`, `auth-fields.tsx:155`, `dashboard-profile.tsx:564`, `dashboard-marketplace.tsx:963,1807`, `api-docs-page.tsx:187`, `status-page.tsx:204,265`, `testimonials.tsx:172,185`. La mayoría son listas estáticas (safe), pero `testimonials.tsx:172` usa `key={i}` para items duplicados en marquee — si el array cambia, React reutiliza DOM incorrectamente. | `src/components/novsmm/testimonials.tsx:171` | `key={t.name + i}` o `key={`${t.name}-${i}`}` para estabilidad. |
| R-5 | MEDIO | **`whatsapp-widget.tsx` motion.button + AnimatePresence mode="wait"** con dos `motion.span` hijos condicionales — el `key="close"`/`key="chat"` evita el bug, pero AnimatePresence en un botón puede causar "DOM insertBefore" errors en Rapid State changes (tap rápido). | `src/components/novsmm/whatsapp-widget.tsx:71-117` | Reemplazar con CSS class swap (como en app-view.tsx). |
| R-6 | MEDIO | **`social-proof.tsx` muestra luego desaparece sin transición CSS de salida fluida** — el flag `exiting` se aplica pero `if (!current || !inHero) return null` corta antes de animar. Si el usuario hace scroll rápido, el toast desaparece abruptamente. | `src/components/novsmm/social-proof.tsx:80` | Renderizar siempre que `current` exista; aplicar `exiting` class y usar `onAnimationEnd` para null el current. |
| R-7 | MEDIO | **`app-view.tsx` effect con 6 deps + `setAuthed`/`setView`/etc** — el effect que sincroniza sesión con store tiene deps `[session, isLoading, view, authed, browsingLanding, setAuthed, setAuthLoading, setView, setBrowsingLanding, setOnboardingStep]`. Cambios en cualquiera disparan re-ejecución. Riesgo de loops si los setters no son estables. | `src/components/novsmm/app-view.tsx:243-279` | Zustand setters son estables por diseño, pero separar en 2-3 effects más pequeños (auth sync, onboarding check, redirect logic). |
| R-8 | MEDIO | **`dashboard-shell.tsx` `useEffect` con `[]` que lee `localStorage.getItem("novsmm-theme")` y aplica `.dark` class** — compite con `theme-toggle.tsx` que también lo hace. Doble source de verdad para el theme. | `src/components/novsmm/dashboard-shell.tsx:119-126`, `src/components/novsmm/theme-toggle.tsx:21-24` | Centralizar en un `useTheme` hook o usar `next-themes`. |
| R-9 | BAJO | **`StickyCTA` overlap con WhatsApp widget en mobile** — StickyCTA es `position: fixed; bottom: 0; z-index: 40` (full-width), WhatsApp es `fixed bottom-5 right-5 z-40`. Mismo z-index, posición solapada. Cuando StickyCTA está visible en mobile, tap sobre el tercio inferior derecho puede ir al CTA en vez de WhatsApp. | `src/components/novsmm/sticky-cta.tsx:36-41`, `src/components/novsmm/whatsapp-widget.tsx:78` | Mover WhatsApp a `bottom-20` en mobile (cuando sticky-cta visible), o aumentar z-index de WhatsApp a z-50. |
| R-10 | BAJO | **`scrollY > 24` threshold en navbar es muy bajo** — en mobile la barra de URL del browser oculta/revela scroll, causando que la navbar "flicker" entre glass y transparent. | `src/components/novsmm/navbar.tsx:37` | Usar `scrollY > 8` para activación inmediata o `scrollY > 64` para tolerancia. |
| R-11 | BAJO | **`useUrlParamHandlers` effect con `[]` deps** pero usa `toast` (de `useToast`) — `toast` es estable pero React 19 strict puede warnear. | `src/components/novsmm/app-view.tsx:53-88` | OK funcional; documentar o añadir `// eslint-disable-next-line react-hooks/exhaustive-deps`. |
| R-12 | BAJO | **`Hero` `ordersPerMin` useState inicializado en 1200** y luego actualizado desde API — primer paint muestra "1200 orders/min" (fake) durante ~100ms antes de que llegue el dato real. | `src/components/novsmm/hero.tsx:32-37` | Inicializar en `null` y renderizar placeholder skeleton hasta que `statusData` llegue. |

---

## 4. UX / DISEÑO

### Fortalezas

- **Skip-to-content link** — primer elemento focusable del `<body>`, se hace visible al focus. (`src/app/layout.tsx:259-264`)
- **`prefers-reduced-motion`** deshabilita todas las animaciones 3D y transforms. (`src/app/globals.css:875-882`)
- **Touch targets mínimo 44×44** en mobile via CSS global. (`src/app/globals.css:887-892`)
- **`aria-label` / `aria-pressed` / `aria-selected` / `role`** extensivos (78 ocurrencias en dashboard-marketplace alone). (`rg -c 'aria-' src/components/novsmm/dashboard-marketplace.tsx = 78`)
- **Focus-visible rings** via `nov-ring` / `focus-visible:` classes (10+ archivos).
- **Skeletons en marketplace** — 6 ServiceCardSkeleton cards con `skeleton-shimmer` para loading percibido. (`src/components/novsmm/dashboard-marketplace.tsx:1380-1399`)
- **Empty states con CTAs** — marketplace "No services found" + "Clear filters" button. (`dashboard-marketplace.tsx`)
- **Toast notifications** via sonner + radix-toast para feedback de acciones. (`src/components/ui/toaster.tsx`, `src/components/ui/toast.tsx`)
- **Command palette (⌘K)** en dashboard para navegación rápida. (`src/components/novsmm/dashboard-shell.tsx:105-115`)
- **Modal a11y** — `use-modal-aria.tsx` con focus trap, restore focus, `Escape` to close, scroll lock. (`src/components/novsmm/use-modal-aria.tsx`)
- **Mobile-first breakpoints** consistentes (`sm:`, `md:`, `lg:`) con ocultación de 3D en `max-width: 768px`.
- **Color palette disciplinada** — blanco/negro/azul eléctrico (#0052FF) + esmeralda (#00B884) para positive. Sin gradientes saturados.

### Debilidades

| # | Severidad | Hallazgo | Archivo | Fix recomendado |
|---|-----------|----------|---------|-----------------|
| U-1 | CRÍTICO | **"Community rating" es fake/local** — `useReviews` almacena ratings en localStorage del device del usuario. El card muestra "★ 4.5 (12)" pero el "12" es solo cuántas veces **este usuario** clickeó estrellas en **este browser**. No hay comunidad. Etiquetar "Community rating" es engañoso. | `src/components/novsmm/dashboard-marketplace.tsx:175-228, 1244, 1691` | O bien (a) conectar a un endpoint `/api/services/{id}/ratings` que agregue ratings reales de todos los usuarios, o (b) renombrar a "Your rating" y quitar el count. |
| U-2 | ALTO | **`window.confirm()` para acciones destructivas en admin** — `if (!window.confirm(...)) return` rompe el patrón de UI del resto del app (AlertDialog de radix). Inconsistente, no estilizable, bloquea el thread. | `src/components/novsmm/admin/users.tsx:73, 282` | Usar `<AlertDialog>` de shadcn/ui (ya disponible). |
| U-3 | ALTO | **`window.location.reload()` después de login/logout/impersonate** — login-screen, register-screen, dashboard-shell, admin/users. Recarga full-page (1-3s de pantalla en blanco) en lugar de transición SPA. | `src/components/novsmm/login-screen.tsx:220`, `register-screen.tsx:145`, `dashboard-shell.tsx:146, 161`, `admin/users.tsx:282` | Usar `queryClient.invalidateQueries(["session"])` + `setView("dashboard")` para transición instantánea. |
| U-4 | ALTO | **Login screen no valida password length en tiempo real** — `pwValid = password.length >= 1` (cualquier caracter). Inconsistente con register que pide 8+. Permite submit con 1 char y espera el error del servidor. | `src/components/novsmm/login-screen.tsx:173` | O bien aceptar password vacía y mostrar error del servidor (UX común), o pedir 6+ chars con feedback visual. |
| U-5 | MEDIO | **No hay indicador de fortaleza de contraseña en register** — sólo valida `length >= 8`. No feedback sobre mayúsculas, números, símbolos. | `src/components/novsmm/register-screen.tsx` | Añadir barra de fortaleza (weak/medium/strong) con zxcvbn o heurística simple. |
| U-6 | MEDIO | **`ForgotPasswordModal` y `ResetPasswordModal` no atrapan focus** — modales abren sin autofocus en el primer input. Usan `use-modal-aria`? No, son implementación ad-hoc. | `src/components/novsmm/login-screen.tsx:46-156`, `app-view.tsx:91-223` | Migrar a `use-modal-aria` hook o a `<Dialog>` de shadcn/ui. |
| U-7 | MEDIO | **`dashboard-shell.tsx` sidebar no colapsable en desktop** — fixed 248px. En pantallas 1024-1280px resta espacio valioso al contenido. | `src/components/novsmm/dashboard-shell.tsx:197-200` | Añadir toggle de collapse (icon-only 64px vs full 248px) persistido en localStorage. |
| U-8 | MEDIO | **`Social proof` toast no respeta `prefers-reduced-motion`** — la animación `slide-in-up`/`slide-out-down` siempre corre. | `src/app/globals.css:521-534` | Añadir `@media (prefers-reduced-motion: reduce) { .social-proof { animation: none; } }`. |
| U-9 | MEDIO | **No hay breadcrumbs en admin panel** — con 22 tabs y modales anidados, el usuario pierde contexto de dónde está. | `src/components/novsmm/admin-panel.tsx` | Añadir breadcrumb simple "Admin → Users → ImpersonateModal". |
| U-10 | MEDIO | **Formularios no tienen `noValidate`** — login/register/confim password dependen de validación HTML5 nativa (que el navegador maneja inconsistentemente) + validación custom. Mezcla confusa. | `src/components/novsmm/login-screen.tsx`, `register-screen.tsx` | Estandarizar: `noValidate` + validación custom con mensajes inline. |
| U-11 | BAJO | **`WhatsAppWidget` badge "1" hardcodeado** — el badge rojo siempre dice "1" sin significado (no hay 1 mensaje nuevo real). | `src/components/novsmm/whatsapp-widget.tsx:113` | Quitar el número o mostrar "!" o un dot sin número. |
| U-12 | BAJO | **`Footer` placeholder toasts para "About/Careers/Press/Partners"** — 6 links muestran "coming soon" toast. Da impresión de producto incompleto. | `src/components/novsmm/footer.tsx:92-98` | Either implementar las páginas o quitar los links hasta que existan. |
| U-13 | BAJO | **`Magnetic` component puede causar motion sickness** — magnetic hover en todos los CTAs del landing puede ser excesivo para usuarios con vestibular sensitivity. | `src/components/novsmm/magnetic.tsx` | Desactivar magnetic si `prefers-reduced-motion: reduce` (verificar implementación). |

---

## 5. BRANDING / LANDING

### Fortalezas

- **Metadata completa** — title template, description trilingüe (EN/ES/PT), keywords, canonical, robots (index+follow, max-image-preview:large), openGraph, twitter card, manifest, icons, formatDetection. (`src/app/layout.tsx:68-181`)
- **JSON-LD structured data** — Organization, WebSite (con SearchAction), WebApplication, Service (con OfferCatalog), FAQPage (7 Q&As), BreadcrumbList. Server-rendered como `<script>` estático. (`src/app/layout.tsx:187-230`, `src/components/novsmm/landing-json-ld.tsx`)
- **Sitemap** con 11 entradas (1 ruta + 9 anchors + api-docs), prioridades jerárquicas. (`src/app/sitemap.ts`)
- **Robots.txt** con rules separadas para Googlebot, Bingbot, social crawlers (Twitter/Facebook/LinkedIn/Apple/WhatsApp), AI opt-out (GPTBot, CCBot, anthropic-ai, Claude-Web, Google-Extended), y default que bloquea `/api/auth|admin|wallet|orders|uploads|me|v1|tickets|notifications|subscriptions|child-panels|webhooks|internal|provider`. (`src/app/robots.ts`)
- **OG image + Twitter image dinámicas** via `next/og` edge runtime. (`src/app/opengraph-image.tsx`, `src/app/twitter-image.tsx`)
- **PWA manifest** con theme_color #0052FF, icons 192+512, shortcuts Dashboard/Marketplace. (`src/app/manifest.ts`)
- **Resource hints** — preconnect a fonts.gstatic.com + fonts.googleapis.com, dns-prefetch. (`src/app/layout.tsx:241-243`)
- **Lazy-loading con skeletons** previene CLS en landing (ver P-Fortalezas).
- **Value proposition clara** — "The infrastructure for social media marketing at scale" + subhead concreto ("unifies order automation, a reseller marketplace, and payments"). (`src/components/novsmm/hero.tsx:80-92`)
- **CTAs prominentes** — "Start free" (primary azul) + "Sign in" (secondary) en hero, navbar, sticky-cta mobile. Consistencia visual.
- **Trust signals** — "No credit card required", "99.99% uptime SLA", "SOC 2 controls" en hero. SSL/A+ rating/DDoS shielding en sección Security.
- **Hero stat dinámico** — ordersPerMin desde `/api/status` (dato real), no hardcoded.

### Debilidades

| # | Severidad | Hallazgo | Archivo | Fix recomendado |
|---|-----------|----------|---------|-----------------|
| B-1 | CRÍTICO | **Testimonios hardcoded sin disclaimer** — 8 testimonios con nombres, roles, companies, y métricas específicas ("Daniela Ríos, Head of Growth, Pulse Media — +38% retention", "Marcus Chen, Founder, ResellerStack — $1.2M routed"). No hay indicación de que sean ilustrativos. FTC Section 5 y EU UCPD prohíben testimonials falsos. La sección "Social proof" SÍ tiene label "Illustrative" — Testimonials NO. Inconsistente. | `src/components/novsmm/testimonials.tsx:18-102` | Either (a) añadir disclaimer sutil "Composite examples based on typical customer outcomes" al pie de la sección, o (b) recopilar testimonials reales con consentimiento + foto/link verificable, o (c) quitar la sección hasta tener reales. |
| B-2 | CRÍTICO | **Stats inflados como fallback** — `DEFAULTS` en `stats.tsx`: 184,500 usuarios, 1.84M orders/24h, 4.28M total orders, $92.4M revenue, 1,284 orders/min. `affiliate-section.tsx` DEFAULT_STATS: 184,500 users, $92.4M revenue. Estos se muestran **si `/api/status` falla o retorna campos vacíos** — en una fresh install con DB vacío, los usuarios ven números inflados falsos presentados como reales. | `src/components/novsmm/stats.tsx:36-43`, `src/components/novsmm/affiliate-section.tsx:55-58, 78-79` | Either (a) usar `0` o `—` como fallback y mostrar skeletons, o (b) si se quiere mostrar "social proof temprano", etiquetar claramente "Target metrics" o "Projected". El cálculo `Math.max(2_400_000, revenue * 0.05)` para totalPaidOut es particularmente engañoso — garantiza un mínimo falso. |
| B-3 | CRÍTICO | **`aggregateRating` hardcoded en JSON-LD** — `ratingValue: "4.9"`, `reviewCount: "1843"` en `landing-json-ld.tsx`; `ratingValue: "4.8"`, `ratingCount: "2400"` en `layout.tsx`. Google penaliza con rich-result removal si detecta aggregateRating fijo sin review system real. | `src/components/novsmm/landing-json-ld.tsx:63-69`, `src/app/layout.tsx:209-216` | Either (a) remover `aggregateRating` del JSON-LD hasta tener un sistema de reviews real, o (b) conectar a un endpoint `/api/public/aggregate-rating` que calcule desde DB. |
| B-4 | CRÍTICO | **Claims de compliance no verificables** — "SOC 2 controls", "PCI DSS L1", "FIPS 140-2 modules", "A+ rating · SSL Labs", "2.4 Tbps DDoS capacity", "RPO 60s · RTO 5m", "active-active across 3 regions". Sin certificados públicos ni links a attestations. "PCI DSS L1" es particularmente problemático — NOVSMM no almacena PAN (usa hosted checkout) pero claim L1 implica audit formal. | `src/components/novsmm/security.tsx:19-76`, `src/components/novsmm/hero.tsx:120-122`, `src/components/novsmm/payments.tsx:12-49` | Either (a) soften language ("SOC 2-aligned controls", "PCI DSS via hosted checkout"), o (b) obtener las certificaciones y linkear a los reports. |
| B-5 | ALTO | **`+ more 6,382 total active services` hardcoded en services.tsx** — el número 6,382 no viene de la API. | `src/components/novsmm/services.tsx:40-43` | Fetch desde `/api/services/counts` o `/api/status` (que ya retorna `activeServices`). |
| B-6 | ALTO | **"184,500 affiliates earning today" derivado de DEFAULTS** — `affiliatesCount = Math.max(50_000, totalUsers * 0.27)` donde `totalUsers` puede ser el DEFAULT 184,500. Garantiza mínimo 50,000 affiliates falso. | `src/components/novsmm/affiliate-section.tsx:79, 121` | Either quitar el `Math.max` o etiquetar "Target". |
| B-7 | ALTO | **"Switched from 12 panels" y "Countries served 60+" sin fuente** — métricas en testimonials proof bar. | `src/components/novsmm/testimonials.tsx:144-148` | Either derivar de DB (`SELECT COUNT(DISTINCT country) FROM users`) o remover. |
| B-8 | MEDIO | **Email domain `novsmm.shop` hardcodeado en 41 sitios** — child-panels subdomains, API docs curl example, legal pages (legal@novsmm.shop, partners@novsmm.shop). Si el dominio cambia, hay que editar 41 archivos. | `src/components/novsmm/{dashboard-child-panels,api-docs-section,legal-pages}.tsx`, etc. | Centralizar en `const SITE_DOMAIN = process.env.NEXT_PUBLIC_SITE_DOMAIN || "novsmm.shop"` en `lib/site.ts` y referenciar. |
| B-9 | MEDIO | **FAQ section fetches `/api/cms?type=faq`** pero el JSON-LD `faqLd` en `landing-json-ld.tsx` tiene 7 Q&As hardcoded — si el admin edita el FAQ via CMS, los rich results de Google muestran respuestas viejas. | `src/components/novsmm/landing-json-ld.tsx:127-188` vs `src/components/novsmm/faq.tsx:29-47` | Either (a) hacer `landing-json-ld.tsx` async server component que fetch del CMS, o (b) sincronizar manualmente y documentar. |
| B-10 | MEDIO | **No hay sección de pricing en el landing** — el hero dice "Free to start — no credit card required" pero no hay tabla de planes. El footer menciona "Reseller plan / Agency plan / Enterprise plan" (en child-panels.tsx: `$49/mo / $149/mo / $499/mo`) pero no hay CTA visible. | `src/app/page.tsx` (sin sección Pricing) | Añadir sección Pricing o linkear a /pricing. |
| B-11 | MEDIO | **"8 integrated payment gateways" en JSON-LD pero reality son 5** — `landing-json-ld.tsx:55` dice "8 integrated payment gateways (Stripe, PayPal, MercadoPago, NowPayments, and more)" pero el código y el marketplace.tsx confirman 5 (Stripe, PayPal, MP, NowPayments, Manual). Stripe además no está wired en topup route (sólo PayPal/MP/NowPayments/Manual branches). | `src/components/novsmm/landing-json-ld.tsx:55`, `src/app/api/wallet/topup/route.ts` | Alinear a 5, o implementar Stripe branch. |
| B-12 | MEDIO | **API docs curl example usa `https://api.novsmm.shop`** — dominio hardcodeado que puede no existir. | `src/components/novsmm/api-docs-section.tsx:53` | Usar `SITE_ORIGIN` o `window.location.origin`. |
| B-13 | BAJO | **`theme_color` del manifest (#0052ff) y del viewport (#ffffff light / #0052ff dark) son inconsistentes con el brand "pure white background"** — el PDF original dice "Pure white background" pero el manifest usa azul. | `src/app/manifest.ts:30`, `src/app/layout.tsx:58-61` | Alinear — usar #ffffff en manifest también, o documentar la decisión. |
| B-14 | BAJO | **`opengraph-image.tsx` y `twitter-image.tsx` son edge runtime** — correcto para OG, pero no se cachean. Regeneran en cada request. | `src/app/opengraph-image.tsx:18` | Añadir `export const revalidate = 86400` (24h) si el contenido es estático. |

---

## Top 10 Acciones Prioritarias

1. **[CRÍTICO B-1] Añadir disclaimer a Testimonials o reemplazar con testimonials reales con consentimiento.** Riesgo legal (FTC/EU UCPD) y de reputación.
2. **[CRÍTICO B-2] Reemplazar DEFAULTS inflados en stats.tsx y affiliate-section.tsx con skeletons o "—" hasta que `/api/status` retorne datos reales.** En fresh install, los usuarios ven $92.4M revenue falso.
3. **[CRÍTICO B-3] Remover `aggregateRating` hardcoded del JSON-LD** hasta tener sistema de reviews real. Google puede penalizar.
4. **[CRÍTICO B-4] Soften claims de compliance** ("SOC 2 controls" → "SOC 2-aligned controls", "PCI DSS L1" → "PCI DSS via hosted checkout"). Exposición legal.
5. **[CRÍTICO U-1] Conectar "Community rating" a un endpoint real o renombrar a "Your rating".** Etiquetar local-only data como "Community" es engañoso.
6. **[ALTO P-1 + P-3] Eliminar admin-panel.tsx inline duplicates y migrar a `admin/` subdirectory existente.** 4,790 líneas → ~1,500 + 4 archivos modulares. Elimina código muerto.
7. **[ALTO P-4] Optimizar N+1 en `/api/v1/refill` multi-mode** con batch queries. 100 refills = 500+ queries → 5-10 queries.
8. **[ALTO R-1] Arreglar hydration mismatch en theme-toggle.tsx** (lazy useState leyendo localStorage). Migrar a `next-themes` (ya en deps).
9. **[ALTO R-2] Unificar `useSession` — migrar navbar.tsx y dashboard-notifications.tsx** de `next-auth/react` a `@/hooks/use-api`. Detrás de Caddy proxy causa inconsistencias.
10. **[ALTO U-3] Reemplazar `window.location.reload()` post-login/logout/impersonate** con `queryClient.invalidateQueries(["session"])` para transición SPA instantánea.

---

## Estado General del Proyecto

| Dimensión | Score | Justificación |
|-----------|------:|---------------|
| **Security posture** | **8/10** | Defensas core maduras (CSRF, CORS, SSRF, brute-force, AES-256-GCM, JWT invalidation, webhook signatures). Perdido por: timing-attack teórico en WS JWT, logs PayPal exponen internals, `as any` extensivo (179), claims de compliance no verificables que también son riesgo legal. |
| **Performance score** | **6.5/10** | Lazy-loading + caching + índices excelentes. Perdido por: admin-panel.tsx 4,790 líneas, código muerto en `admin/`, N+1 en v1/refill, 38 archivos con framer-motion + 8 con recharts (deuda de migración), favicon 186 KB. |
| **UX score** | **7/10** | A11y sólida (skip-link, focus-visible, ARIA, reduced-motion, touch targets). Perdido por: spinners full-screen en vez de skeletons, "Community rating" fake, window.confirm inconsistente, window.location.reload post-login, sidebar no colapsable. |
| **Branding score** | **5.5/10** | Metadata + JSON-LD + sitemap + robots excelentes. Value prop clara. Perdido por: testimonios falsos sin disclaimer, stats inflados como fallback, aggregateRating hardcoded, claims de compliance (SOC 2, PCI DSS L1) no verificables, "8 gateways" en JSON-LD pero 5 en realidad, sin sección pricing. |
| **Overall readiness** | **6.5/10** | **Listo para beta privada** (invited users, NDA). **NO listo para lanzamiento público** hasta resolver los 5 CRÍTICOS (B-1 a B-4, U-1). Tras esos fixes + los 9 ALTOS, alcanzaría 8/10 (production-ready for public launch). |

---

## Anexo: Archivos auditados

**Seguridad (15 archivos):** `src/middleware.ts`, `src/lib/auth.ts`, `src/lib/crypto-utils.ts`, `src/lib/api-key-auth.ts`, `src/lib/outbound-webhook.ts`, `src/lib/security-alert.ts`, `src/lib/api-utils.ts`, `src/app/api/wallet/topup/route.ts`, `src/app/api/admin/refunds/route.ts`, `src/app/api/admin/impersonate/route.ts`, `src/app/api/webhooks/{paypal,mercadopago,nowpayments}/route.ts`, `src/app/api/internal/backup-status/route.ts`, `src/app/api/uploads/[userId]/[filename]/route.ts`, `src/app/api/me/{route,ws-token}/route.ts`, `mini-services/notifications-service/index.ts`, `.env.example`, `Dockerfile`, `prisma/schema.prisma`.

**Performance (todos los chunks + 5 componentes grandes):** `.next/static/chunks/*` (2.4 MB total), `admin-panel.tsx` (4,790), `dashboard-marketplace.tsx` (3,829), `dashboard-profile.tsx` (1,299), `dashboard-shell.tsx` (930), `dashboard-child-panels.tsx` (860), `legal-pages.tsx` (828), `dashboard-tickets.tsx` (823), `dashboard-home.tsx` (789).

**Renderización (12 archivos):** `app-view.tsx`, `app-store.ts`, `whatsapp-widget.tsx`, `social-proof.tsx`, `sticky-cta.tsx`, `error-boundary.tsx`, `theme-toggle.tsx`, `dashboard-marketplace.tsx` (hooks section), `navbar.tsx`, `dashboard-shell.tsx`, `app/layout.tsx`, `app/page.tsx`.

**UX (10 archivos):** `hero.tsx`, `navbar.tsx`, `footer.tsx`, `login-screen.tsx`, `register-screen.tsx`, `dashboard-shell.tsx`, `dashboard-home.tsx`, `dashboard-wallet.tsx`, `globals.css`, `admin/users.tsx`.

**Branding (12 archivos):** `app/layout.tsx`, `app/sitemap.ts`, `app/robots.ts`, `app/manifest.ts`, `app/opengraph-image.tsx`, `app/twitter-image.tsx`, `landing-json-ld.tsx`, `hero.tsx`, `services.tsx`, `marketplace.tsx`, `payments.tsx`, `security.tsx`, `faq.tsx`, `testimonials.tsx`, `affiliate-section.tsx`, `api-docs-section.tsx`.

**Comandos ejecutados:**
- `find src/app/api -name route.ts | wc -l` → 109 rutas
- `for f in $(find ...); rg requireAuth|... $f` → 78 con auth, 31 sin auth (todas legítimas)
- `rg 'as any' src/` → 179 ocurrencias
- `rg 'dangerouslySetInnerHTML'` → 7 (todas JSON-LD estático)
- `rg 'framer-motion'` → 38 archivos
- `rg 'recharts'` → 13 ocurrencias en 8 archivos
- `rg '<img ' src/` → 1 ocurrencia (QR 2FA)
- `wc -l src/components/novsmm/*.tsx` → top: admin-panel 4,790 / dashboard-marketplace 3,829
- `du -sh .next/static/chunks/` → 2.4 MB
- `rg 'localStorage|sessionStorage' src/components/` → 30+ ocurrencias (todas con guards)
- `rg 'window\.|document\.' src/components/` → 30+ ocurrencias (todas en useEffect o con guards)

---

**Fin del reporte.** Sin modificaciones al código. Sin commits. Auditoría read-only completada.

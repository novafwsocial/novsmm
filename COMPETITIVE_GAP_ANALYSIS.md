# NOVSMM — Análisis Competitivo y Auditoría Completa

> **Fecha:** 2026-07-07
> **Alcance:** Análisis pies-a-cabeza de la web + comparativa con competencia SMM panel líder
> **Competencia analizada:** JustAnotherPanel (JAP), Peakerr, SMMRaja, SafeSMM, SMM Heaven, PerfectFollower, GrowFollowers
> **Hallazgo clave:** Todos los competidores principales corren el mismo script PerfectPanel/SmartPanel — el "estándar de la industria" es efectivamente **un set de features canónico**.

---

## 1. Resumen Ejecutivo

NOVSMM es una plataforma SMM panel **production-grade** construida con Next.js 16, con un stack tecnológico superior a la competencia (que usa PHP/PerfectPanel). Sin embargo, tiene **gaps críticos en la API pública de reseller** que limitan la compatibilidad con el ecosistema existente.

| Dimensión | Estado | vs Competencia |
|-----------|--------|----------------|
| **Landing page** | ✅ Premium (11 secciones, animaciones) | Superior |
| **Dashboard usuario** | ✅ Completo (9 tabs, WebSocket) | A la par |
| **Admin panel** | ⚠️ Completo pero monolítico (2830 líneas) | A la par |
| **API pública v1** | ❌ Solo 2 endpoints (de 11+ estándar) | **Muy por debajo** |
| **Seguridad** | ✅ Superior (2FA, HMAC, RBAC, rate limit) | Superior |
| **Infraestructura** | ✅ Docker + Prometheus + AlertManager | Superior |
| **Mobile/PWA** | ⚠️ Responsive, no PWA | Por debajo |

**Veredicto:** La plataforma está lista para producción, pero **no puede competir en el mercado reseller** hasta cerrar los gaps de la API pública v1. Esos gaps son el blocker #1.

---

## 2. Lo que TIENE (fortalezas)

### Stack tecnológico — SUPERIOR a la competencia
| Feature | NOVSMM | Competencia (PerfectPanel) |
|---------|--------|---------------------------|
| Framework | Next.js 16 + TypeScript | PHP (CodeIgniter/Laravel) |
| DB | PostgreSQL + Prisma ORM | MySQL (raw queries) |
| Cache | Redis + in-memory fallback | Memcached/none |
| Monitoring | Prometheus + Grafana + AlertManager | Ninguno |
| Background jobs | BullMQ (Redis) | Cron PHP |
| Real-time | Socket.IO (WebSocket) | Long-polling |
| API | REST + RBAC + API keys | REST básico |
| Auth | NextAuth + 2FA TOTP + Google OAuth | Sesiones PHP |
| Seguridad | AES-256-GCM, HMAC, CSP, rate limit | Básico |

### Features de usuario implementadas (✅ a la par o superior)
- Dashboard home con stats + recent orders + favorites + tickets preview
- Analytics con KPIs + revenue chart + AI insights (ZAI SDK)
- Marketplace: Buy (con drip-feed) + Sell (offers) + History
- Orders: list, filters, search, detail drawer, repeat, cancel (60s window), CSV export
- Wallet: balance (available + held + lifetime), topup 4+ métodos, withdraw, transactions, CSV
- Tickets: inbox + conversation + attachments + priority
- Notifications: WebSocket real-time + type filters
- Profile: 2FA setup/verify/disable con QR + backup codes, sessions, referral, achievements
- Loyalty: points per order + tiers + 10 achievements
- Referral: código único + tracking de earnings
- Favorites, mass orders, drip-feed orders
- Multi-currency display, multi-language (5 idiomas)
- Command palette (⌘K), onboarding wizard (6 pasos)

### Features admin implementadas (✅)
- 19 tabs: overview, users, orders, services, providers, payments, promotions, withdrawals, refunds, API keys, licenses, currencies, languages, webhooks, settings, security, roles, social auth, version
- RBAC completo (16 recursos × 5 acciones)
- Bulk operations (activate/suspend users, cancel/complete orders)
- Audit logs, webhook log viewer
- Promotions, coupons, licenses (white-label)

### Landing page (✅ superior)
- Hero con parallax + floating stats + dashboard preview animado
- Services grid (16 plataformas)
- Marketplace flow visualization + live offers board
- Payments con animated coin field
- Stats con 14-day bar chart + uptime widget
- Testimonials marquee
- Security radar-sweep visual
- WhatsApp widget, smooth scroll (Lenis), scroll progress bar

---

## 3. Lo que FALTA — Gaps críticos vs competencia

### 🔴 P0 — Blockers para competir (table-stakes)

#### 3.1 API Pública v1 incompleta (CRÍTICO)
**El gap #1.** Todos los competidores exponen el contract PerfectPanel:

| Endpoint | NOVSMM | Competencia |
|----------|--------|-------------|
| `services` (listar catálogo) | ✅ | ✅ |
| `add` (crear orden) | ✅ (básico) | ✅ (con drip-feed, subscription, comments, mentions) |
| `status` (estado de orden) | ❌ | ✅ |
| `status` (multi-orden) | ❌ | ✅ |
| `refill` (solicitar refill) | ❌ | ✅ |
| `refill` (multi-refill) | ❌ | ✅ |
| `refill_status` | ❌ | ✅ |
| `refill_status` (multi) | ❌ | ✅ |
| `cancel` | ❌ | ✅ |
| `cancel` (multi) | ❌ | ✅ |
| `balance` | ❌ | ✅ |

**Impacto:** Los resellers que usan bots/paneles secundarios (99% del mercado) **no pueden integrar NOVSMM** — sus scripts esperan este contract exacto. Sin esto, NOVSMM no es pluggable al ecosistema.

**Parámetros faltantes en `add`:**
- `runs` + `interval` (drip-feed vía API)
- `username` + `min` + `max` + `posts` + `delay` + `expiry` (subscriptions auto-like)
- `comments` (comentarios personalizados)
- `mentions` (menciones)
- Multi-order (array de órdenes en un request)

#### 3.2 Órdenes SMM Subscription (auto-renew)
**Todos los competidores lo tienen.** Los usuarios configuran: "dame 100 likes en cada nuevo post durante 30 días". El sistema detecta nuevos posts (vía API del proveedor) y auto-crea órdenes.

- NOVSMM no tiene modelo `SmmSubscription` (el `Subscription` eliminado era de team-seats SaaS, no SMM)
- No hay worker que monitoree nuevos posts
- No hay UI para crear subscriptions

#### 3.3 Refill / Re-delivery
Estándar de la industria: tras completar una orden, el usuario puede solicitar refill (re-entrega) si cayó count. Todos los competidores exponen esto via API + UI.

- NOVSMM no tiene endpoint refill ni botón en UI
- No hay tracking de refill status
- No hay worker de auto-refill-check (que verifique drops automáticamente)

#### 3.4 Multi-order / Mass order en API v1
La UI tiene mass order, pero la API v1 no. Los resellers necesitan hacer bulk-orders vía API.

---

### 🟠 P1 — Desventaja competitiva (common pero no universal)

#### 3.5 Child Panel / White-label self-service
- NOVSMM tiene `License` model para white-label, pero **no es self-service**
- Competencia: el usuario compra un child panel vía UI, se aprovisiona subdominio + API key automáticamente
- NOVSMM: admin debe crear la license manualmente

#### 3.6 CMS / Blog / Knowledge Base / FAQ
- NOVSMM: 16 footer links son `placeholder: true` ("coming soon" toast)
- Competencia: todos tienen blog, FAQ, knowledge base, API docs públicos
- Falta: CMS para que admin gestione contenido sin deploy

#### 3.7 User Impersonation (Login as user)
- NOVSMM: no existe
- Competencia: estándar para soporte — admin "se loguea como" el usuario para reproducir bugs
- Sin esto, soporte es lento (back-and-forth con el usuario)

#### 3.8 Provider Failover
- NOVSMM: 1 provider por servicio (HuntSMM), si falla no hay fallback
- Competencia: multi-provider con failover automático — si provider A falla, intenta B
- Crítico para SLA de fulfillment

#### 3.9 Public API Docs landing section
- NOVSMM: `/api/docs` existe pero no hay sección visible en landing
- Competencia: todos tienen sección "API Docs" visible con ejemplos de código
- Los resellers evalúan la API antes de registrarse

#### 3.10 Public Status Page
- NOVSMM: `/api/status` existe (JSON) pero no hay página HTML pública
- Competencia: status.novsmm.com con uptime history, incident history
- Genera trust

#### 3.11 Affiliate Program landing section
- NOVSMM: referral existe en dashboard pero no hay sección en landing
- Competencia: sección dedicada con commission structure, payout methods

#### 3.12 API Key IP Allowlisting
- NOVSMM: API keys sin IP whitelist
- Competencia: estándar para enterprise — permite restringir qué IPs pueden usar la key
- Seguridad: previene uso de keys robadas

#### 3.13 GDPR Account Deletion
- NOVSMM: no hay self-service delete
- Competencia: estándar para cumplir GDPR
- Riesgo legal en UE

#### 3.14 Auto Refill Check Worker
- NOVSMM: no existe
- Competencia: worker que verifica drops 7/14/30 días post-completado y auto-solicita refill
- Mejora retención de usuarios

#### 3.15 Email Templates Editor
- NOVSMM: emails hardcoded en `lib/notify.ts`
- Competencia: editor visual en admin para customizar todos los emails
- Sin esto, cada cambio de copy requiere deploy

#### 3.16 Saved Ticket Replies (canned responses)
- NOVSMM: no existe
- Competencia: templates de respuestas comunes para soporte rápido
- Eficiencia de soporte

---

### 🟡 P2 — Diferenciadores (nice-to-have)

#### 3.17 PWA / Mobile App
- NOVSMM: responsive pero no PWA (sin manifest, sin service worker, sin push)
- Competencia: mayoría tampoco tiene native app, pero algunos tienen PWA
- Oportunidad de diferenciación

#### 3.18 Push Notifications (mobile/web)
- NOVSMM: solo in-app WebSocket
- Competencia: algunos tienen push (OneSignal/Beamer)
- Engagement en mobile

#### 3.19 Live Chat (Tawk.to/Crisp/JivoChat)
- NOVSMM: WhatsApp widget (async)
- Competencia: live chat real-time con agente
- Conversión de visitantes

#### 3.20 Feature Flags / Maintenance Mode
- NOVSMM: no existe
- Competencia: algunos permiten toggle features sin deploy + maintenance mode
- Operacional

#### 3.21 Analytics avanzados (cohort/geo/funnel)
- NOVSMM: analytics básico (revenue, orders, breakdown)
- Competencia: algunos tienen cohort retention, geo distribution, funnel analysis
- Decision-making

#### 3.22 Email Campaigns / Mass Mailing
- NOVSMM: solo broadcast in-app + email individual
- Competencia: campaigns segmentadas, A/B testing
- Marketing

#### 3.23 Fraud Detection Rules
- NOVSMM: no existe
- Competencia: algunos tienen rules engine (velocity checks, IP reputation, chargeback flags)
- Risk management

#### 3.24 KYC / Identity Verification
- NOVSMM: no existe
- Competencia: algunos para wallets grandes o enterprise
- Compliance

#### 3.25 Service Reviews / Ratings
- NOVSMM: no existe
- Competencia: algunos permiten reviews con drop rate, avg delivery time
- Trust/UX

---

## 4. Gaps internos (calidad/mantenibilidad)

### 4.1 `admin-panel.tsx` — 2,830 líneas monolítico
**Problema:** 19 sub-vistas + 30+ funciones en un solo archivo. Se carga como un solo bundle cuando se abre el tab admin.
**Solución:** Split en `admin/overview.tsx`, `admin/users.tsx`, etc. con lazy-loading por tab.

### 4.2 Stubs pendientes ("Phase 5")
- `src/workers/worker.ts` — handlers `provider.sync` y `ai.insights` son stubs (`console.log`)
- `dashboard-notifications.tsx` — WebSocket sin auth (cualquiera recibe broadcasts globales)
- `dashboard-home.tsx:637` — placeholder fallback
- `dashboard-data.ts` — 149 líneas de mock data mayormente huérfanas

### 4.3 Hardcoded values en landing
- `hero.tsx:67` — "1284 orders/min" hardcoded
- `stats.tsx:16-41` — 4.28M orders, 184,500 users, $92.4M revenue, 312 enterprise clients — todos hardcoded
- `marketplace.tsx:44-49` — live offers board hardcoded (no fetch de `/api/offers`)
- `testimonials.tsx` — 8 testimonials hardcoded (sin CMS)
- `admin-panel.tsx:162` — "184,500 users" hardcoded en header
- `currency-utils.ts:156-160` — rates hardcoded como cache inicial

**Solución:** Conectar a APIs reales (`/api/status`, `/api/dashboard`) o crear Settings keys en DB.

### 4.4 Inconsistencias
- Algunos admin resources tienen DELETE (services, roles, version), otros no (coupons, currencies, languages, licenses, promotions, payment-methods, providers)
- `/api/me/language` existe pero es redundante con `/api/me` PATCH
- Dos patrones de error handling paralelos (`withErrorHandler` HOC vs manual `requireAuth + try/catch`)
- RBAC existe en DB pero el dashboard solo special-casea `role === "admin"` — otros roles no tienen UI diferenciada
- 70+ casts `(session!.user as any).id` cuando existe `AuthUser` interface para evitarlos

### 4.5 Footer placeholders
16 links son `placeholder: true` y muestran "coming soon" toast: Resellers, Agencies, Enterprises, Creators, Wholesale, Affiliates, About, Careers, Press, Partners, Status, Docs, API reference, Changelog, Legal, Privacy.

---

## 5. Estado de seguridad — ✅ SUPERIOR

| Control | Estado |
|---------|--------|
| 2FA TOTP | ✅ setup/verify/disable con QR + backup codes |
| Brute-force lockout | ✅ 5 intentos / 15 min (Redis) |
| CSRF Origin verification | ✅ value-matched en middleware |
| Webhook HMAC signatures | ✅ Stripe/MP/NowPayments verificados |
| Credentials encryption | ✅ AES-256-GCM at rest |
| API keys | ✅ bcrypt + SHA-256 lookupHash (never plaintext) |
| Rate limiting | ✅ Edge middleware + API layer |
| RBAC | ✅ 16 recursos × 5 acciones |
| Audit logs | ✅ userId + action + entity + IP + userAgent |
| SQL injection | ✅ Prisma parameterized |
| XSS | ✅ sanitize.ts + CSP (pero CSP permite unsafe-eval/inline) |
| Sentry | ✅ (no-op si DSN no set) |

**Gaps de seguridad (menores):**
- CSP permite `'unsafe-eval'` y `'unsafe-inline'` (necesario para Next.js pero debilita XSS)
- `/api/internal/backup-status` POST no requiere auth (obscurity-based)
- `process.env` mutation en `/api/admin/social-auth` no toma efecto sin restart
- No hay IP allowlisting en API keys

---

## 6. Plan de acción recomendado (6 sprints)

### Sprint 1: API Parity (P0 — CRÍTICO, 1-2 semanas)
**Objetivo:** Cumplir el contract PerfectPanel/JAP para ser pluggable al ecosistema reseller.

1. `GET /api/v1/status?order=XXX` — estado de orden
2. `GET /api/v1/status?orders=XXX,YYY,ZZZ` — multi-estado
3. `POST /api/v1/refill` — solicitar refill
4. `POST /api/v1/refill` (multi) — multi-refill
5. `GET /api/v1/refill_status` — estado de refill
6. `GET /api/v1/refill_status` (multi)
7. `POST /api/v1/cancel` — cancelar orden
8. `POST /api/v1/cancel` (multi)
9. `GET /api/v1/balance` — balance de la cuenta
10. Extender `POST /api/v1/orders` con: `runs`+`interval` (drip), `comments`, `mentions`, multi-order array
11. Actualizar `/api/docs` con documentación completa

### Sprint 2: SMM Subscriptions + Refill UI (P0, 1-2 semanas)
1. Modelo `SmmSubscription` en Prisma
2. Worker que monitorea nuevos posts (vía provider API)
3. UI: tab "Subscriptions" en dashboard
4. Botón "Refill" en orders completadas
5. Auto-refill-check worker (verifica drops 7/14/30 días post-completado)

### Sprint 3: Child Panel self-service + Provider Failover (P1, 1 semana)
1. `ChildPanel` model + provisioning automático (subdominio + API key)
2. UI: sección "Child Panels" en dashboard (comprar + gestionar)
3. Multi-provider por servicio con failover automático
4. Admin: provider priority config

### Sprint 4: Admin power features (P1, 1-2 semanas)
1. User impersonation ("login as user")
2. Email templates editor visual
3. Saved ticket replies (canned responses)
4. CMS básico (blog + FAQ + knowledge base)
5. Feature flags / maintenance mode

### Sprint 5: Landing + Trust (P1, 1 semana)
1. Sección "API Docs" en landing (con ejemplos de código)
2. Sección "Affiliate Program"
3. Public status page (status.novsmm.com)
4. Conectar stats hardcoded a APIs reales
5. Eliminar/reemplazar footer placeholders (16 links)

### Sprint 6: Security + Compliance (P1/P2, 1 semana)
1. API key IP allowlisting
2. GDPR self-service account deletion
3. PWA manifest + service worker
4. Web push notifications (OneSignal/Beamer)
5. Refactor `admin-panel.tsx` (split en archivos por tab)

---

## 7. Matriz comparativa final

| Feature | NOVSMM | JAP/Peakerr/SMMRaja | Gap |
|---------|--------|---------------------|-----|
| Stack tech (Next.js 16) | ✅ Superior | PHP | — |
| Landing premium | ✅ | Básico | — |
| Dashboard user | ✅ Completo | Completo | — |
| Admin panel | ✅ 19 tabs | 15-20 tabs | — |
| **API v1 endpoints** | **2/11** | **11/11** | **🔴 P0** |
| **Drip-feed en API** | ❌ | ✅ | **🔴 P0** |
| **SMM Subscriptions** | ❌ | ✅ | **🔴 P0** |
| **Refill + status** | ❌ | ✅ | **🔴 P0** |
| **Multi-order API** | ❌ | ✅ | **🔴 P0** |
| Child panel self-service | ❌ Manual | ✅ Auto | 🟠 P1 |
| CMS/Blog/FAQ | ❌ | ✅ | 🟠 P1 |
| User impersonate | ❌ | ✅ | 🟠 P1 |
| Provider failover | ❌ | ✅ | 🟠 P1 |
| API docs landing section | ❌ | ✅ | 🟠 P1 |
| Public status page | ❌ | ✅ | 🟠 P1 |
| Affiliate landing section | ❌ | ✅ | 🟠 P1 |
| API key IP allowlist | ❌ | ✅ | 🟠 P1 |
| GDPR self-delete | ❌ | ✅ | 🟠 P1 |
| Email templates editor | ❌ Hardcoded | ✅ | 🟠 P1 |
| Canned ticket replies | ❌ | ✅ | 🟠 P1 |
| 2FA TOTP | ✅ | ✅ | — |
| HMAC webhooks | ✅ | ✅ | — |
| RBAC | ✅ | ✅ | — |
| Multi-currency | ✅ Display | ✅ Wallet | — |
| Multi-language | ✅ 5 | ✅ 5-10 | — |
| WebSocket real-time | ✅ | Long-poll | Superior |
| Prometheus monitoring | ✅ | ❌ | Superior |
| Docker deployment | ✅ | Manual | Superior |
| Backup/DR scripts | ✅ | ❌ | Superior |
| PWA | ❌ | ❌ | — |
| Push notifications | ❌ | Algunos | 🟡 P2 |
| Live chat | ❌ | Algunos | 🟡 P2 |
| Service reviews | ❌ | Algunos | 🟡 P2 |
| Fraud detection | ❌ | Algunos | 🟡 P2 |

---

## 8. Conclusión

NOVSMM es tecnológicamente **superior** a todos los competidores analizados (Next.js 16 vs PHP, Redis vs Memcached, Prometheus vs nada, WebSocket vs polling). La landing page, el dashboard y el admin panel están al nivel o por encima.

**El blocker crítico es la API pública v1.** Con solo 2 endpoints (de 11+ estándar), NOVSMM no puede ser integrado por resellers que usan bots/paneles secundarios — que es el 99% del mercado. Esto debe cerrarse **antes de cualquier lanzamiento comercial**.

Una vez cerrada la API parity (Sprint 1), NOVSMM tendrá una ventaja competitiva real: stack moderno + seguridad superior + monitoreo + deployment automatizado, combinados con compatibilidad total con el ecosistema PerfectPanel.

Los sprints 2-6 son importantes pero no blockers — pueden ejecutarse en paralelo al lanzamiento una vez que la API esté completa.

---

*Reporte generado por análisis de código interno + investigación de competencia (12+ searches, 7 plataformas analizadas)*

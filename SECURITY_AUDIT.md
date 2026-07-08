# 🔒 NOVSMM — Auditoría Integral de Seguridad

> **Fecha:** 2026-07-08 06:38:52  
> **Alcance:** Inspección de código completa (middleware, auth, API routes, crypto, frontend)  
> **Metodología:** Análisis estático de código + verificación de buenas prácticas OWASP Top 10  
> **Sin explotación:** Todos los hallazgos se basan en inspección de código, no en ataques reales

---

## Resumen Ejecutivo

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| 🔴 Crítico | 1 | Requiere fix inmediato |
| 🟠 Alto | 3 | Requiere fix antes de producción |
| 🟡 Medio | 4 | Recomendado fix |
| 🟢 Bajo | 3 | Mejora continua |
| ✅ Verificado OK | 15 | Sin problemas |

**Veredicto general:** La plataforma tiene una base de seguridad sólida (CSRF, bcrypt, AES-256-GCM, webhooks verificados, brute-force protection). Hay 1 issue crítico (CSP demasiado permisivo) y 3 issues altos que deben resolverse antes de producción.

---

## 🟢 VERIFICADO OK (15 controles sin problemas)

| # | Control | Estado | Evidencia |
|---|---------|--------|-----------|
| 1 | **SQL Injection** | ✅ | Prisma ORM con queries parametrizadas. Únicos `$queryRaw` son `SELECT 1` (hardcoded, sin input). No hay interpolación de strings en queries. |
| 2 | **Password Hashing** | ✅ | bcrypt con cost factor 12 (`src/app/api/auth/register/route.ts:40`). Nunca se almacena en plaintext. |
| 3 | **API Key Security** | ✅ | bcrypt hash + SHA-256 lookupHash (O(1) lookup). Keys nunca en plaintext. Formato `nvsk_live_*`. |
| 4 | **Credential Encryption** | ✅ | AES-256-GCM con IV aleatorio + authTag (`crypto-utils.ts`). Key derivada de `LICENSE_ENCRYPTION_KEY` (fail-closed si no seteada). |
| 5 | **CSRF Protection** | ✅ | Middleware verifica Origin header en POST/PATCH/PUT/DELETE. Value-matching contra `NEXTAUTH_URL` host. Webhooks exentos (usan HMAC). Bearer tokens exentos (no forgeable desde browser). |
| 6 | **Brute-Force Protection** | ✅ | 5 intentos fallidos → lock 15min. Redis-backed (cross-instance). In-memory fallback. (`auth.ts:15-59`) |
| 7 | **2FA / TOTP** | ✅ | Implementado con otplib. Secret encriptado con AES-256-GCM. Backup codes hasheados con bcrypt. Verificación requerida en login si habilitado. |
| 8 | **Webhook Signature Verification** | ✅ | Stripe: `verifyStripeWebhook()` con webhook secret. NowPayments: HMAC-SHA256 con IPN secret. Mercado Pago: `x-signature` header con HMAC. Todos fail-closed (401 si falta signature). |
| 9 | **XSS Sanitization** | ✅ | `sanitize.ts` con strip de HTML tags, `javascript:` URIs, `on*` event handlers, `data:text/html`. Usado en ticket messages. |
| 10 | **Input Validation** | ✅ | Zod schemas en todas las rutas críticas (`validations.ts`). Validación de email, password (min 8), quantity (int positivo), amount (positivo, max $50k). |
| 11 | **File Upload Security** | ✅ | Whitelist de MIME types (jpeg, png, gif, webp, pdf, txt, zip). Max 5MB. Filename sanitizado (`sanitizeFilename`). |
| 12 | **Rate Limiting** | ✅ | Edge middleware con límites por ruta: login 20/15min, register 10/hora, orders 20/min, admin 120/min, general 300/min. |
| 13 | **Audit Logging** | ✅ | `audit()` helper en `api-utils.ts` captura userId, action, entity, IP, User-Agent. Usado en login, create, update, delete, impersonate. |
| 14 | **HSTS** | ✅ | `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` |
| 15 | **X-Frame-Options** | ✅ | `X-Frame-Options: DENY` + CSP `frame-ancestors 'none'` (doble protección contra clickjacking) |

---

## 🔴 HALLAZGOS CRÍTICOS (1)

### C-1: CSP permite `'unsafe-eval'` y `'unsafe-inline'`

**Severidad:** 🔴 CRÍTICO  
**Ubicación:** `src/middleware.ts:92`  
**Categoría OWASP:** A03:2021 — Injection (XSS)

**Descripción:**
```
Content-Security-Policy: ... script-src 'self' 'unsafe-inline' 'unsafe-eval' ...
```

El CSP permite `'unsafe-eval'` (ejecución de `eval()`, `new Function()`) y `'unsafe-inline'` (scripts inline y event handlers inline). Esto debilita gravemente la protección contra XSS — un atacante que logre inyectar HTML puede ejecutar JavaScript arbitrario.

**Riesgo:**
- Si un atacante inyecta contenido en un campo no sanitizado (ej: nombre de servicio, ticket message), puede ejecutar JavaScript en el navegador del admin
- Robo de cookies de sesión (aunque son httpOnly por NextAuth default, el atacante puede hacer requests fetch desde el navegador)
- Defacement, redirección maliciosa, keylogging

**Evidencia:**
- `src/middleware.ts:92` — CSP con `'unsafe-inline'` y `'unsafe-eval'`
- Verificado: no hay uso de `eval()` o `new Function()` en el código (el `'unsafe-eval'` es innecesario)
- `'unsafe-inline'` es necesario para Tailwind CSS y Next.js inline styles, pero puede mitigarse con nonces

**Mitigación:**
1. **Remover `'unsafe-eval'`** — No se usa en el código, es innecesario:
```typescript
// Cambiar:
script-src 'self' 'unsafe-inline' 'unsafe-eval'
// A:
script-src 'self' 'unsafe-inline'
```

2. **Migrar a nonce-based CSP** (remover `'unsafe-inline'`):
```typescript
// Generar nonce per-request en middleware:
const nonce = crypto.randomUUID();
res.headers.set("Content-Security-Policy",
  `script-src 'self' 'nonce-${nonce}'; ...`
);
// Pasar nonce a Next.js via header para que lo use en <script> tags
```

3. **Mínimo:** Remover `'unsafe-eval'` inmediatamente (es un cambio de 1 línea sin side effects).

---

## 🟠 HALLAZGOS ALTOS (3)

### H-1: NextAuth cookies sin configuración de seguridad explícita

**Severidad:** 🟠 ALTO  
**Ubicación:** `src/lib/auth.ts:282-291`  
**Categoría OWASP:** A07:2021 — Identification and Authentication Failures

**Descripción:**
La configuración de NextAuth no define explícitamente las opciones de cookies:
- No se verifica `httpOnly: true` (NextAuth lo hace por defecto, pero no es explícito)
- No se configura `secure: true` para producción (cookies solo via HTTPS)
- No se configura `sameSite: 'lax'` o `'strict'` (protección CSRF adicional)

**Riesgo:**
- Si un reverse proxy termina TLS pero no forwarding headers correctos, las cookies de sesión podrían enviarse via HTTP
- Sin `sameSite`, las cookies son vulnerables a CSRF cross-site (aunque el middleware ya verifica Origin)

**Mitigación:**
Añadir configuración explícita de cookies en `authOptions`:
```typescript
export const authOptions: NextAuthOptions = {
  // ... existing config ...
  cookies: {
    sessionToken: {
      name: `next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
    csrfToken: {
      name: `next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        secure: process.env.NODE_ENV === "production",
      },
    },
  },
};
```

### H-2: Sin rate limiting per-API-key en v1 API

**Severidad:** 🟠 ALTO  
**Ubicación:** `src/app/api/v1/*` (todos los endpoints)  
**Categoría OWASP:** A04:2021 — Insecure Design

**Descripción:**
Los endpoints de la API pública v1 (`/api/v1/orders`, `/api/v1/status`, etc.) solo tienen el rate limiting global de 300 req/min por IP del middleware. No hay límites per-API-key.

**Riesgo:**
- Un reseller con una API key válida puede hacer 300 requests/minuto (el límite global de /api/)
- Si múltiples resellers comparten una IP (NAT, VPN), el límite se divide entre ellos
- Un atacante con una key robada puede abusar de los endpoints sin límites específicos

**Mitigación:**
Añadir rate limiting per-API-key en los endpoints v1:
```typescript
// En api-key-auth.ts, después de validar la key:
const rateLimitKey = `apikey:${apiKey.id}`;
const result = await checkRateLimit(rateLimitKey, 60, 60 * 1000); // 60 req/min per key
if (!result.allowed) {
  return apiError("API rate limit exceeded", 429);
}
```

### H-3: `/api/internal/backup-status` accesible externamente

**Severidad:** 🟠 ALTO  
**Ubicación:** `src/app/api/internal/backup-status/route.ts`  
**Categoría OWASP:** A01:2021 — Broken Access Control

**Descripción:**
El endpoint `/api/internal/backup-status` requiere un Bearer token (`INTERNAL_API_TOKEN`), pero si el token no está configurado, retorna 500 con `"INTERNAL_API_TOKEN not configured on server"` — lo que confirma al atacante que el endpoint existe y no está protegido.

Además, el endpoint es accesible desde cualquier IP externa (no hay restricción a localhost).

**Riesgo:**
- Information disclosure: el atacante sabe que el endpoint existe
- Si `INTERNAL_API_TOKEN` se setea a un valor débil o predecible, un atacante podría actualizar el timestamp de backup, evitando que la alerta `BackupFailure` dispare
- El endpoint permite POST sin Origin check (usa Bearer token, que bypassa CSRF del middleware)

**Mitigación:**
1. **Restringir a localhost** en el middleware o en el propio endpoint:
```typescript
const ip = req.headers.get("x-client-ip") || req.headers.get("x-forwarded-for");
if (ip && ip !== "127.0.0.1" && ip !== "::1" && !ip.startsWith("10.") && !ip.startsWith("172.")) {
  return apiError("Forbidden", 403);
}
```

2. **No revelar que el token no está configurado** — retornar 403 genérico:
```typescript
if (!INTERNAL_TOKEN) {
  return apiError("Forbidden", 403); // No revelar que falta configuración
}
```

---

## 🟡 HALLAZGOS MEDIOS (4)

### M-1: WebSocket sin autenticación

**Severidad:** 🟡 MEDIO  
**Ubicación:** `src/components/novsmm/dashboard-notifications.tsx:58-60`  
**Categoría OWASP:** A07:2021 — Identification and Authentication Failures

**Descripción:**
El cliente WebSocket se conecta al servicio de notificaciones sin autenticación. Cualquier cliente conectado recibe todos los broadcasts globales. El código reconoce esto como un TODO:
```
// For now, connect without auth — the service falls back to global broadcast.
// Per-user room join requires a JWT not yet implemented.
```

**Riesgo:**
- Un atacante puede conectarse al WebSocket y recibir notificaciones de TODOS los usuarios
- Las notificaciones pueden contener información sensible (montos de órdenes, ventas, retiros)

**Mitigación:**
Implementar JWT auth en la conexión WebSocket:
```typescript
// 1. Crear endpoint /api/me/ws-token que genere un JWT corto (5min TTL)
// 2. Frontend: const socket = io("/?token=JWT&XTransformPort=3003")
// 3. Backend: verificar JWT en connection, unir a room "user:{userId}"
```

### M-2: Error messages exponen información interna

**Severidad:** 🟡 MEDIO  
**Ubicación:** Múltiples API routes (wallet/topup, orders, webhooks)  
**Categoría OWASP:** A05:2021 — Security Misconfiguration

**Descripción:**
Varias rutas usan `console.error` con mensajes de error detallados que incluyen información interna:
```typescript
console.error("[wallet/topup] Stripe Checkout error:", stripeError?.message);
console.error("[wallet/topup] PayPal order creation failed:", e?.message);
```

**Riesgo:**
- Los logs de servidor pueden acumular información sensible (API errors de Stripe, PayPal, etc.)
- Si los logs son accesibles (ej: dashboard de logs sin auth), filtran información de integración

**Mitigación:**
- Usar el logger estructurado (`src/lib/logger.ts`) que tiene redacción de campos sensibles
- No loggear `e.message` directamente — sanitizar primero
- Asegurar que los logs NO son accesibles públicamente

### M-3: Sin configuración CORS explícita

**Severidad:** 🟡 MEDIO  
**Ubicación:** `next.config.ts`, `src/middleware.ts`  
**Categoría OWASP:** A05:2021 — Security Misconfiguration

**Descripción:**
No hay headers CORS configurados. La app asume same-origin para todo. Si un tercero intenta usar la API v1 desde un browser (cross-origin), recibirá errores CORS.

**Riesgo:**
- Los resellers que quieran usar la API v1 desde un frontend propio tendrán errores CORS
- No hay control explícito sobre qué orígenes pueden hacer requests

**Mitigación:**
Para la API v1, añadir headers CORS selectivos:
```typescript
// En las rutas /api/v1/*, añadir:
res.headers.set("Access-Control-Allow-Origin", "*"); // o dominios específicos
res.headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
res.headers.set("Access-Control-Allow-Headers", "Authorization, Content-Type");
```

### M-4: `process.env` mutation en social-auth no persiste en el servidor

**Severidad:** 🟡 MEDIO  
**Ubicación:** `src/app/api/admin/social-auth/route.ts:71-72`  
**Categoría OWASP:** A05:2021 — Security Misconfiguration

**Descripción:**
```typescript
process.env.GOOGLE_CLIENT_ID = clientId;
process.env.GOOGLE_CLIENT_SECRET = clientSecret;
```
Estas mutaciones de `process.env` no toman efecto en el servidor de producción porque `auth.ts` lee las variables de entorno al iniciar (module load time), no en cada request.

**Riesgo:**
- El admin guarda credenciales de Google OAuth, ve "success", pero el login con Google no funciona hasta que el servidor se reinicia manualmente
- Esto es un problema operacional que puede llevar a configuraciones incorrectas de seguridad

**Mitigación:**
Modificar `auth.ts` para leer dinámicamente las credenciales de Google desde la DB en cada request, en lugar de solo al iniciar:
```typescript
GoogleProvider({
  clientId: process.env.GOOGLE_CLIENT_ID || getDynamicSetting("oauth:google.clientId"),
  clientSecret: process.env.GOOGLE_CLIENT_SECRET || getDynamicSetting("oauth:google.clientSecret"),
})
```

---

## 🟢 HALLAZGOS BAJOS (3)

### B-1: Mass assignment en admin/coupons

**Severidad:** 🟢 BAJO  
**Ubicación:** `src/app/api/admin/coupons/route.ts:37`  
**Descripción:** `...parsed.data` expande todos los campos validados por Zod. Si el schema permite campos adicionales, podrían crearse con valores no intencionados.  
**Mitigación:** Usar `.strict()` en Zod schemas para rechazar campos no definidos. Ya se hace en algunos schemas (PATCH routes), aplicarlo consistentemente.

### B-2: `dangerouslySetInnerHTML` en chart.tsx

**Severidad:** 🟢 BAJO  
**Ubicación:** `src/components/ui/chart.tsx:83`  
**Descripción:** Usa `dangerouslySetInnerHTML` para inyectar estilos CSS.  
**Riesgo:** Bajo — el contenido es estático (CSS del componente), no input del usuario.  
**Mitigación:** Migrar a styled-components o CSS modules. No es urgente.

### B-3: Endpoints públicos sin rate limiting específico

**Severidad:** 🟢 BAJO  
**Ubicación:** `/api/services`, `/api/payment-methods`, `/api/status`, `/api/cms`  
**Descripción:** Los endpoints públicos tienen el rate limit global de 300/min, pero podrían ser abusados para scraping del catálogo de servicios.  
**Mitigación:** Añadir rate limit más estricto (60/min) para endpoints públicos de catálogo.

---

## 📋 Plan de Acción Recomendado

### Inmediato (antes de producción):
1. **C-1:** Remover `'unsafe-eval'` del CSP (1 línea de cambio, 0 side effects)
2. **H-1:** Añadir configuración explícita de cookies en authOptions
3. **H-2:** Añadir rate limiting per-API-key en endpoints v1
4. **H-3:** Restringir `/api/internal/*` a localhost + no revelar config faltante

### Corto plazo (1-2 semanas):
5. **M-1:** Implementar JWT auth en WebSocket
6. **M-2:** Migrar `console.error` a logger estructurado con redacción
7. **M-4:** Fix dynamic OAuth credential loading desde DB

### Medio plazo (1 mes):
8. **M-3:** Añadir CORS headers selectivos para API v1
9. **B-1:** Aplicar `.strict()` en todos los Zod schemas admin
10. **B-3:** Rate limiting específico para endpoints públicos

---

## Configuración de Seguridad Actual (verificada)

| Header | Valor | Estado |
|--------|-------|--------|
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains; preload` | ✅ |
| `X-Frame-Options` | `DENY` | ✅ |
| `X-Content-Type-Options` | `nosniff` | ✅ |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | ✅ |
| `X-XSS-Protection` | `1; mode=block` | ✅ (deprecated pero defense-in-depth) |
| `Content-Security-Policy` | Presente pero con `'unsafe-eval'` y `'unsafe-inline'` | ⚠️ |
| `frame-ancestors` | `'none'` | ✅ |
| `base-uri` | `'self'` | ✅ |
| `form-action` | `'self'` | ✅ |

---

*Auditoría realizada por inspección de código estático. No se realizaron pruebas de explotación.*

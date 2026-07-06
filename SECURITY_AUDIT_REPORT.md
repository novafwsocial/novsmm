# NOVSMM — Security Audit Report

**Auditor:** External Security Auditor
**Fecha:** 2026-07-06
**Veredicto:** ⚠️ **APROBACIÓN CONDICIONAL — 3 P0s deben resolverse antes de go-live**

---

## Resumen

| Severidad | Cantidad | Estado |
|-----------|----------|--------|
| ❌ P0 Crítico | 3 | BLOQUEAN go-live |
| ⚠️ P1 Alto | 4 | Resolver en 30 días |
| ⚠️ P2 Medio | 23 | Recomendado para v1.1 |
| ✅ Aprobado | 13/16 archivos | Baseline sólido |

---

## P0 Críticos

### P0-1: Secrets en .env con entropía débil
- **Archivo:** `.env`
- **Prioridad:** P0 | **Impacto:** Crítico | **Confianza:** Alto
- **Descripción:** `.env` contiene secrets en texto plano. `LICENSE_ENCRYPTION_KEY=novsmm-prod-encryption-key-df9c83925be4030143d63175` es una string legible con entropía débil (28 chars de diccionario + 18 hex), no los 32 random bytes que el código recomienda.
- **Riesgo:** Si `.env` se filtra (Docker build context, backup sin encriptar, commit accidental), TODOS los secrets quedan comprometidos. La clave de encriptación débil permite brute-force de credenciales de pago.
- **Cómo reproducir:** `cat .env` — todos los secrets visibles en texto plano.
- **Cómo fixar:**
  1. Rotar TODOS los secrets: `openssl rand -hex 32` para cada uno
  2. Re-encriptar todas las credenciales almacenadas (PaymentMethod.config, 2FA secrets, license keys) con la nueva key
  3. Verificar que `.dockerignore` excluye `.env*`
  4. Usar Docker secrets o vault en producción (no env vars)

### P0-2: TOCTOU race en Google OAuth provider loading
- **Archivo:** `src/app/api/auth/[...nextauth]/route.ts`
- **Prioridad:** P0 | **Impacto:** Alto | **Confianza:** Alto
- **Descripción:** `ensureGoogleProvider()` usa variables de módulo mutables (`googleProviderAdded`, `lastCheck`) sin sincronización. Dos requests concurrentes pueden ambos pushear `GoogleProvider` al array `authOptions.providers`.
- **Evidencia:** L17-30: `googleProviderAdded` leído sin lock; L50: `providers.push()` sin deduplicación
- **Riesgo:** Registro duplicado de provider → OAuth callback routing failures → login con Google roto permanentemente hasta restart.
- **Cómo reproducir:** Enviar 100 requests simultáneas a `/api/auth/providers` justo después de guardar credenciales de Google.
- **Cómo fixar:** Promise-singleton pattern + deduplicar providers por `id` antes de push:
  ```typescript
  const ensurePromise = memoize(async () => { ... });
  ```

### P0-3: Riesgo de secret leakage en Docker build context
- **Archivo:** `Dockerfile` + `.dockerignore`
- **Prioridad:** P0 | **Impacto:** Alto | **Confianza:** Medio
- **Descripción:** Aunque `.dockerignore` excluye `.env*`, no hay verificación de que `.env` no se haya copiado accidentalmente. No hay pre-commit hook (gitleaks/git-secrets).
- **Riesgo:** Si alguien remueve `.env*` de `.dockerignore` o agrega un `.env.local`, los secrets quedan embebidos en la imagen Docker.
- **Cómo fixar:**
  1. Agregar `gitleaks` o `git-secrets` como pre-commit hook
  2. Agregar step en CI: `docker run --rm image cat /app/.env || true` — debe retornar vacío

---

## P1 Altos

### P1-1: 2FA verify endpoint sin rate limit
- **Archivo:** `src/app/api/me/2fa/verify/route.ts`
- **Prioridad:** P1 | **Impacto:** Alto
- **Descripción:** No hay rate limit específico para verificación TOTP. Un atacante con sesión robada puede brute-force 6 dígitos a 300/min (rate limit general).
- **Riesgo:** 6 dígitos = 1M combinaciones. A 300/min = 55 horas para brute-force. Con rate limit de 5/30s = 115 días. Sigue siendo posible.
- **Cómo fixar:** Agregar rate limit específico: 5 intentos / 30s + lockout 15 min después de 10 fallidos.

### P1-2: Backup codes generados pero nunca validados
- **Archivo:** `src/lib/two-factor.ts` + `src/lib/auth.ts`
- **Prioridad:** P1 | **Impacto:** Alto
- **Descripción:** `generateBackupCodes()` genera 8 codes con CSPRNG, los hashea con bcrypt, los guarda... pero `authorize()` en `auth.ts` NUNCA verifica backup codes. Si un usuario pierde su dispositivo TOTP, no hay forma de recuperarla.
- **Riesgo:** Usuarios bloqueados permanentemente fuera de sus cuentas. Código de seguridad muerto.
- **Cómo fixar:** En `authorize()`, si `totp` falla, verificar si el valor enviado coincide con algún backup code (bcrypt.compare).

### P1-3: /api/admin/social-auth POST sin Zod validation
- **Archivo:** `src/app/api/admin/social-auth/route.ts`
- **Prioridad:** P1 | **Impacto:** Medio
- **Descripción:** El POST acepta `body` sin validación Zod. Un admin puede inyectar cualquier string como `provider`.
- **Cómo fixar:** Agregar schema: `z.object({ provider: z.enum(["google"]), clientId: z.string().min(1), clientSecret: z.string().min(1) }).strict()`

### P1-4: No hay tokenVersion — JWTs válidos después de password change
- **Archivo:** `src/lib/auth.ts`
- **Prioridad:** P1 | **Impacto:** Medio
- **Descripción:** No hay mecanismo para invalidar JWTs después de cambio de password. Un JWT robado sigue siendo válido por 30 días (default maxAge).
- **Cómo fixar:** Agregar `tokenVersion` a User model, incrementar en password change, verificar en `jwt()` callback.

---

## P2 Destacados (23 total)

| # | Descripción |
|---|-------------|
| 1 | Middleware confía en primer `X-Forwarded-For` IP (spoofable) — usar el último |
| 2 | Sin `session.maxAge` explícito en NextAuth |
| 3 | MP webhook sin timestamp freshness check (±5 min) |
| 4 | CSP permite `'unsafe-eval'` — considerar nonces |
| 5 | `/api/public/validate-license` sin rate limit (bcrypt-scan DoS) |
| 6 | `/uploads/*` públicamente accesible sin auth |
| 7 | `createOrderSchema.link` acepta `javascript:` URLs (stored XSS si se renderiza como href) |
| 8 | `/api/admin/settings` PATCH sin whitelist de keys |
| 9 | Sin protección de last-admin (admin puede auto-degradarse) |
| 10 | Cookies sin `sameSite: strict` explícito |
| 11-23 | Ver reporte completo en worklog (AUDIT-C) |

---

## Lo que está bien hecho ✅

- ✅ AES-256-GCM con AuthTag (no ECB, IV aleatorio, auth tag verificada)
- ✅ bcrypt cost 12 para passwords
- ✅ Webhooks fail-closed con `timingSafeEqual` (Stripe, MP, NowPayments)
- ✅ No hay `eval`, `new Function`, ni `dangerouslySetInnerHTML` controlado por usuario
- ✅ No hay SQL injection surface (`$queryRaw` solo para `SELECT 1`)
- ✅ No hay `NEXT_PUBLIC_*` secrets
- ✅ Caddyfile SSRF fixado
- ✅ Error sanitization strips `sk_*` y `Bearer *`
- ✅ CSRF protection con Origin value-matching
- ✅ Transacciones atómicas con `$transaction` + `updateMany` condicional

---

*Auditoría de seguridad ejecutada el 2026-07-06*
*Aprobación condicional — 3 P0s deben resolverse antes de go-live*

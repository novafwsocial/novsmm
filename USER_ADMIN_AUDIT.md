# NOVSMM — Análisis profundo de issues visuales y técnicos

## Resumen ejecutivo

| Área | Estado | Issues |
|------|--------|--------|
| Landing page | ✅ Funcional | 3 menores |
| Login flow | 🔴 Roto | 1 crítico |
| User dashboard | ⚠️ No verificado (login falla) | - |
| Admin panel | ⚠️ No verificado (login falla) | - |
| Mobile | ✅ Optimizado | 0 |
| Performance | ✅ Excelente | 0 |

---

## 🔴 Issues CRÍTICOS

### 1. Login falla con 401 (CRÍTICO — bloquea todo)

**Síntoma**: Al hacer login con `admin@novsmm.shop` + password, el POST a `/api/auth/callback/credentials` devuelve **401 Unauthorized**.

**Requests observados**:
```
GET  /api/auth/csrf         → 200 ✅
POST /api/auth/callback/credentials → 401 ❌
```

**Causas posibles**:

1. **CSRF token mismatch** — El CSRF token se obtiene pero no se envía correctamente en el POST
2. **Origin header check** — El middleware verifica Origin contra `NEXTAUTH_URL`, pero Cloudflare cache podría estar cacheando el CSRF token (que debería ser por sesión)
3. **Password hash mismatch** — El password `SgJLOIlcOE9TF2qk` del seed podría no coincidir con el hash en DB
4. **Cuenta bloqueada** — El sistema de brute-force protection podría haber bloqueado la cuenta después de intentos fallidos

**Fix recomendado**: 
- Verificar que Cloudflare NO está cacheando `/api/auth/*` (la Page Rule de bypass debe estar primero)
- Re-hashear el password del admin con un seed fresh
- Verificar el CSRF token flow en el login form

---

## 🟠 Issues HIGH

### 2. Cloudflare cache + Auth routes (CRÍTICO)

**Problema**: Las Page Rules tienen `novsmm.shop/api/*` → Bypass, pero Cloudflare podría estar cacheando:
- `/api/auth/csrf` (CSRF token — debe ser por sesión, no cacheado)
- `/api/auth/session` (estado de sesión — debe ser dinámico)
- `/api/auth/callback/credentials` (login — nunca cacheable)

**Fix**: Agregar headers `Cache-Control: no-store` en las rutas de auth, o agregar una Page Rule específica para `/api/auth/*`.

### 3. LCP 13480ms en algunos loads (HIGH)

**Síntoma**: Console muestra `🔴 LCP: 13480ms (poor)` en algunos page loads.

**Causa probable**: Cuando Cloudflare cache MISS, el origin (WSL2) tarda en responder porque está rebuildando o el primer request es lento.

**Fix**: El cache MISS debería ser raro. Verificar que NOVSMM esté siempre corriendo en WSL2.

---

## 🟡 Issues MEDIUM

### 4. Footer duplica links (MEDIUM)

**Problema**: El footer muestra "Privacy" dos veces (una en Company, otra en Resources).

**Fix**: Revisar `src/components/novsmm/footer.tsx` y quitar el duplicado.

### 5. "All systems operational" siempre visible (MEDIUM)

**Problema**: El badge verde dice "All systems operational" aunque no haya un check real del sistema.

**Fix**: Hacer que el status sea dinámico (fetch de `/api/status`), no hardcoded.

### 6. Click en "Sign in" del navbar a veces no funciona (MEDIUM)

**Síntoma**: Agent Browser reporta "Element is covered by <div.fixed.left-0>" al hacer click en "Sign in".

**Causa**: Algún elemento fixed (probablemente el WhatsApp widget o el footer) está cubriendo el botón en ciertas posiciones de scroll.

**Fix**: Verificar z-index del WhatsApp widget y otros elementos fixed.

---

## 🟢 Issues LOW

### 7. Múltiples "Service worker registered" en console (LOW)

**Síntoma**: El SW se registra múltiples veces (4+ veces en una sesión).

**Fix**: El SW registration debería ser idempotente. Verificar `src/components/novsmm/sw-register.tsx`.

### 8. TTFB varía entre 0ms y 714ms (LOW)

**Síntoma**: TTFB varía mucho entre requests (0ms cache HIT, 714ms cache MISS).

**Fix**: Normal con Cloudflare cache. No es un bug, es comportamiento esperado.

---

## 📋 Issues NO verificados (porque login falla)

### User Dashboard
- ❌ Dashboard home (métricas, gráficos)
- ❌ Services (catálogo)
- ❌ Marketplace (compra)
- ❌ Orders (historial)
- ❌ Wallet (topup, withdraw)
- ❌ Tickets (soporte)
- ❌ Notifications
- ❌ Profile
- ❌ Subscriptions
- ❌ Child Panels

### Admin Panel
- ❌ Overview
- ❌ Users management
- ❌ Orders management
- ❌ Services management
- ❌ Providers
- ❌ Payments configuration
- ❌ Promotions/Coupons
- ❌ Withdrawals
- ❌ Refunds
- ❌ API Keys
- ❌ Licenses
- ❌ Currencies
- ❌ Languages
- ❌ Webhook Logs
- ❌ Settings
- ❌ Social Auth config
- ❌ Email Templates
- ❌ CMS

---

## 🎯 Plan de acción recomendado

### Inmediato (bloquea uso del panel):
1. **Fix login 401** — verificar CSRF + Cloudflare cache en auth routes
2. **Re-seed admin password** — `npx tsx prisma/seed.ts` para regenerar hash

### Verificación post-fix:
3. Login como admin
4. Re-auditar todas las secciones del panel admin
5. Crear usuario de prueba y audir dashboard de usuario

### Mejoras:
6. Fix footer duplicado
7. Fix status badge dinámico
8. Fix z-index del WhatsApp widget
9. Fix SW registration múltiple

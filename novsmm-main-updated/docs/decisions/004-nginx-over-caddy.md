# ADR-004: Nginx instead of Caddy for Production

## Status
Accepted

## Context
The platform originally used Caddy as the reverse proxy with a `?XTransformPort=<port>` query parameter trick to route to internal ports. This had two problems:
1. **SSRF vulnerability** — anyone could reverse-proxy to ANY localhost port by setting `XTransformPort` to any value
2. **Limited production features** — Caddy's rate limiting and security header options are less mature than Nginx

## Decision
Replace Caddy with **Nginx** for production, using explicit path-based routing:
- `/socket.io/*` → port 3003 (notifications service)
- Everything else → port 3000 (Next.js)

## Consequences
**Positive:**
- SSRF vulnerability eliminated (no wildcard port forwarding)
- Mature rate limiting (per-endpoint zones: auth, payment, API)
- A+ SSL Labs rating (TLS 1.2+1.3, modern ciphers, OCSP stapling)
- Granular security headers
- WebSocket upgrade support
- Static file caching with immutable headers
- Industry standard (more docs, more community support)

**Negative:**
- More verbose configuration than Caddy
- Manual SSL certificate management (via certbot cron)
- No automatic HTTPS (Caddy's killer feature — mitigated by certbot auto-renewal)

**Caddyfile kept for sandbox/dev only** (locked down — no XTransformPort wildcard).

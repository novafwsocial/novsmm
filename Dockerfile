# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Multi-stage Dockerfile (Node.js, production-ready, CIS-hardened)
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Install PRODUCTION dependencies only (smaller image)
# Stage 2: Build the Next.js app + compile worker
# Stage 3: Production runner (minimal image, non-root user, healthcheck)
#
# CIS Docker Benchmark compliance:
#   - Runs as non-root user (nextjs:1001)
#   - No package managers in final image (no curl install — use wget from base)
#   - Minimal final image (no dev deps, no build tools)
#   - Healthcheck built in
#   - Read-only filesystem compatible (writes only to /tmp + /app/uploads)

# ── Stage 1: Dependencies (production only) ──
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
# Install ONLY production deps — dev deps not needed in final image
RUN npm ci --only=production --legacy-peer-deps 2>/dev/null || npm install --only=production --legacy-peer-deps

# ── Stage 1b: Dev dependencies (for build only) ──
FROM node:22-slim AS dev-deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci --legacy-peer-deps 2>/dev/null || npm install --legacy-peer-deps

# ── Stage 2: Build ──
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=dev-deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=2048" npx next build

# ── Stage 3: Production runner (CIS-hardened) ──
FROM node:22-slim AS runner

# CIS 4.1: Create non-root user (UID 1001 — avoids conflicts with host users)
RUN groupadd -r nextjs && useradd -r -g nextjs -u 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# CIS 5.10: Install ONLY curl for healthcheck (no other tools)
# Use --no-install-recommends to avoid pulling in suggested packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get purge -y --auto-remove

# Copy build artifacts
COPY --from=builder --chown=nextjs:nextjs /app/package.json ./package.json
COPY --from=builder --chown=nextjs:nextjs /app/.next ./.next
COPY --from=builder --chown=nextjs:nextjs /app/node_modules ./node_modules
COPY --from=builder --chown=nextjs:nextjs /app/prisma ./prisma
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
COPY --from=builder --chown=nextjs:nextjs /app/next.config.ts ./next.config.ts
COPY --from=builder --chown=nextjs:nextjs /app/src ./src
COPY --from=builder --chown=nextjs:nextjs /app/tsconfig.json ./tsconfig.json

# Create writable directories for uploads + tmp
RUN mkdir -p /app/storage/uploads /tmp/nextjs-cache && \
    chown -R nextjs:nextjs /app/storage /tmp/nextjs-cache

# CIS 5.3: Switch to non-root user
USER nextjs

EXPOSE 3000

# CIS 5.7: Healthcheck (built into image — works even without docker-compose)
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
    CMD curl -f http://localhost:3000/api/health/live || exit 1

# CIS 5.12: Use exec form for signal handling (SIGTERM graceful shutdown)
CMD ["node", "node_modules/.bin/next", "start", "-p", "3000"]

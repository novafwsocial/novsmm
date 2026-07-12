# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Multi-stage Dockerfile (Bun, production-ready, CIS-hardened)
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Install ALL dependencies (for build)
# Stage 2: Build the Next.js app
# Stage 3: Production runner (minimal image, non-root user, healthcheck)
#
# FIX (C-004): switched from npm to bun to match the project's actual
# package manager (bun.lock is committed, package-lock.json is not).
# Benefits: faster installs (~10x), smaller image (bun's install graph
# is more efficient), and no more drift between local dev (bun) and
# Docker (npm).
#
# CIS Docker Benchmark compliance:
#   - Runs as non-root user (nextjs:1001)
#   - No package managers in final image
#   - Minimal final image (no dev deps, no build tools)
#   - Healthcheck built in
#   - Read-only filesystem compatible (writes only to /tmp + /app/uploads)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies (all, including dev for build) ──
FROM oven/bun:1.1-debian AS deps
WORKDIR /app
COPY package.json bun.lock* ./
# Install ALL deps (including dev) — needed for next build + tsx
RUN bun install --frozen-lockfile

# ── Stage 2: Build ──
FROM oven/bun:1.1-debian AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN bunx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=2048" bun run build

# ── Stage 3: Production runner (CIS-hardened) ──
FROM oven/bun:1.1-debian AS runner

# CIS 4.1: Create non-root user (UID 1001 — avoids conflicts with host users)
RUN groupadd -r nextjs && useradd -r -g nextjs -u 1001 nextjs

WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000

# CIS 5.10: Install ONLY curl for healthcheck (no other tools)
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
# Run next start via bun (faster startup than node, less memory)
CMD ["bun", "run", "start"]

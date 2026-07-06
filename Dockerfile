# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Multi-stage Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Install dependencies (cached unless package.json changes)
# Stage 2: Build the Next.js app (standalone output)
# Stage 3: Production image (minimal, non-root user)
# ─────────────────────────────────────────────────────────────────────────────

# ── Stage 1: Dependencies ──
FROM oven/bun:1.1 AS deps
WORKDIR /app

# Copy only package files for caching
COPY package.json bun.lockb* ./
COPY mini-services/notifications-service/package.json ./mini-services/notifications-service/package.json

# Install all dependencies (including dev for build)
RUN bun install --frozen-lockfile

# Install mini-service dependencies
RUN cd mini-services/notifications-service && bun install --frozen-lockfile

# ── Stage 2: Build ──
FROM oven/bun:1.1 AS builder
WORKDIR /app

# Copy deps from stage 1
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/mini-services/notifications-service/node_modules ./mini-services/notifications-service/node_modules

# Copy source code
COPY . .

# Disable telemetry during build
ENV NEXT_TELEMETRY_DISABLED=1

# Generate Prisma client
RUN bun run db:generate

# Build Next.js (standalone output)
RUN bun run build

# Build mini-services
RUN cd mini-services/notifications-service && bun run build 2>/dev/null || true

# ── Stage 3: Production ──
FROM oven/bun:1.1-slim AS runner
WORKDIR /app

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Install only production dependencies
COPY package.json bun.lockb* ./
RUN bun install --frozen-lockfile --production

# Copy mini-service deps
COPY mini-services/notifications-service/package.json ./mini-services/notifications-service/
RUN cd mini-services/notifications-service && bun install --frozen-lockfile --production

# Copy built Next.js standalone
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Copy Prisma files (for migrations)
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma

# Copy mini-service source
COPY --from=builder /app/mini-services/notifications-service/index.ts ./mini-services/notifications-service/index.ts

# Copy worker
COPY --from=builder /app/src/workers ./src/workers

# Copy scripts
COPY --from=builder /app/scripts ./scripts

# Set environment
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3000/api/health/ready || exit 1

# Switch to non-root user
USER nextjs

# Expose ports
EXPOSE 3000

# Start command
CMD ["bun", ".next/standalone/server.js"]

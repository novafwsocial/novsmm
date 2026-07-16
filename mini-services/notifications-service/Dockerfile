# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM Notifications Service — Dockerfile
# ─────────────────────────────────────────────────────────────────────────────
# Standalone Bun image for the Socket.IO notifications mini-service.
# Runs index.ts directly (no build step needed — Bun executes TypeScript natively).
# ─────────────────────────────────────────────────────────────────────────────

FROM oven/bun:1.1-slim AS runner
WORKDIR /app

# Install curl for healthchecks
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl ca-certificates && \
    rm -rf /var/lib/apt/lists/*

# Security: run as non-root user
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# Copy package files and install dependencies
COPY package.json bun.lock* ./
RUN bun install --frozen-lockfile --production

# Copy source code
COPY --chown=nextjs:nodejs index.ts ./

# Set environment
ENV NODE_ENV=production
ENV NOTIFICATIONS_SERVICE_PORT=3003
ENV NOTIFICATIONS_SERVICE_HOST=0.0.0.0

# Create app directory with correct ownership
RUN chown -R nextjs:nodejs /app

# Switch to non-root user
USER nextjs

# Expose port
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD curl -f http://localhost:3003/healthz || exit 1

# Start command
CMD ["bun", "index.ts"]

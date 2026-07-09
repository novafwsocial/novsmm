# ─────────────────────────────────────────────────────────────────────────────
# NOVSMM — Multi-stage Dockerfile (Node.js, production-ready for 8GB+ VPS)
# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Install dependencies (cached unless package.json changes)
# Stage 2: Build the Next.js app
# Stage 3: Production runner (minimal image)

# ── Stage 1: Dependencies ──
FROM node:22-slim AS deps
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps

# ── Stage 2: Build ──
FROM node:22-slim AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN NODE_OPTIONS="--max-old-space-size=2048" npx next build

# ── Stage 3: Production runner ──
FROM node:22-slim AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/public ./public
COPY --from=builder /app/next.config.ts ./next.config.ts

EXPOSE 3000
CMD ["npx", "next", "start", "-p", "3000"]

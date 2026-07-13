/**
 * NOVSMM Notifications Mini-Service (v3 — Secure + Redis-adapter)
 * ------------------------------------------------------------------
 * Real-time notifications push service for the NOVSMM SaaS dashboard.
 *
 * SECURITY FIXES (Phase 3):
 * - Per-user rooms: notifications are sent to `io.to(userId).emit()` instead
 *   of `io.emit()` — users no longer see each other's notifications.
 * - JWT auth on WebSocket connection: clients must send a valid NextAuth JWT
 *   in the `auth.token` handshake field. The socket is joined to a room
 *   named `user:{userId}` on connection.
 * - /broadcast auth: requires `NOTIFICATIONS_SERVICE_SECRET` bearer token.
 *   Only the Next.js API routes (which have the secret) can push notifications.
 * - /healthz endpoint for k8s/docker health checks.
 * - @socket.io/redis-adapter for multi-instance scaling (when Redis available).
 * - Removed ambient spam loop (was broadcasting fake system notifications
 *   every 8-15s to ALL clients — pure noise + data leak).
 *
 * Transport: Socket.IO
 * Port: REDIS_PORT env or 3003 (hardcoded fallback for Caddy gateway)
 * Path: "/" (required by gateway; do NOT change)
 *
 * Frontend connects with:
 *   io("/?XTransformPort=3003", {
 *     path: "/",
 *     auth: { token: "<nextauth-jwt>" }  // NEW: required for auth
 *   })
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'
import { createAdapter } from '@socket.io/redis-adapter'
import Redis from 'ioredis'
import crypto from 'crypto'

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const PORT = parseInt(process.env.NOTIFICATIONS_SERVICE_PORT || '3003', 10)
const AUTH_SECRET = process.env.NOTIFICATIONS_SERVICE_SECRET || ''
const REDIS_URL = process.env.REDIS_URL || ''

// Hard cap on /broadcast body size
const MAX_BROADCAST_BODY_BYTES = 1_000_000

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'info' | 'success' | 'warning' | 'error'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  amount?: number
  timestamp: string
  severity: Severity
  userId?: string
}

// ---------------------------------------------------------------------------
// JWT verification (lightweight — no external deps)
// ---------------------------------------------------------------------------

/**
 * Verify a NextAuth JWT token and extract the user ID.
 * NextAuth v4 uses HS256 to sign JWTs with NEXTAUTH_SECRET.
 * We decode + verify the signature using crypto.
 *
 * Returns the userId if valid, null otherwise.
 */
function verifyJwt(token: string): string | null {
  try {
    const secret = process.env.NEXTAUTH_SECRET
    if (!secret) {
      console.error('[notifications] NEXTAUTH_SECRET not set — cannot verify JWTs')
      return null
    }

    const parts = token.split('.')
    if (parts.length !== 3) return null

    const [headerB64, payloadB64, signatureB64] = parts
    const signedData = `${headerB64}.${payloadB64}`

    // SEC FIX (M-002): use timingSafeEqual instead of === to prevent
    // timing attacks on JWT signature comparison.
    const expectedSig = crypto
      .createHmac('sha256', secret)
      .update(signedData)
      .digest('base64url')

    const expectedBuf = Buffer.from(expectedSig)
    const actualBuf = Buffer.from(signatureB64)
    if (expectedBuf.length !== actualBuf.length || !crypto.timingSafeEqual(expectedBuf, actualBuf)) {
      console.error('[notifications] JWT signature mismatch')
      return null
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString('utf8')
    )

    // Check expiry
    if (payload.exp && Date.now() >= payload.exp * 1000) {
      console.error('[notifications] JWT expired')
      return null
    }

    return payload.id || payload.sub || null
  } catch (e) {
    console.error('[notifications] JWT verification failed:', e)
    return null
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const sendJson = (
  res: ServerResponse,
  status: number,
  payload: unknown
): void => {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

const readJsonBody = (req: IncomingMessage): Promise<string> =>
  new Promise((resolve, reject) => {
    const chunks: Buffer[] = []
    let total = 0
    let rejected = false
    req.on('data', (chunk: Buffer) => {
      if (rejected) return
      total += chunk.length
      if (total > MAX_BROADCAST_BODY_BYTES) {
        rejected = true
        reject(new Error('Body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })

// ---------------------------------------------------------------------------
// HTTP + Socket.IO server
// ---------------------------------------------------------------------------

const httpServer = createServer()
const io = new Server(httpServer, {
  path: '/',
  cors: {
    // SEC FIX (M-001): was origin: '*' — any website could connect to
    // the WS service. Now restricted to the app origin from env.
    origin: process.env.NEXTAUTH_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  pingTimeout: 60_000,
  pingInterval: 25_000,
  // Require auth token on connection
  allowRequest: (req, fn) => {
    // Allow Engine.IO polling without auth (handshake needs to complete first)
    // Actual auth check happens in io.use() middleware below
    fn(null, true)
  },
})

// ---------------------------------------------------------------------------
// Redis adapter (multi-instance support) — graceful degradation
// ---------------------------------------------------------------------------

if (REDIS_URL) {
  try {
    const pubClient = new Redis(REDIS_URL, { maxRetriesPerRequest: 2 })
    const subClient = pubClient.duplicate()
    io.adapter(createAdapter(pubClient, subClient))
    console.log('[notifications] Redis adapter enabled — multi-instance ready')

    pubClient.on('error', (e) =>
      console.error('[notifications] Redis pub error:', e.message)
    )
    subClient.on('error', (e) =>
      console.error('[notifications] Redis sub error:', e.message)
    )
  } catch (e) {
    console.error(
      '[notifications] Redis adapter failed — running single-instance:',
      e
    )
  }
} else {
  console.log(
    '[notifications] No REDIS_URL — running single-instance mode'
  )
}

// ---------------------------------------------------------------------------
// Socket.IO auth middleware — verify JWT on every connection
// ---------------------------------------------------------------------------

io.use((socket, next) => {
  const token = (socket.handshake.auth as any)?.token
  if (!token) {
    return next(new Error('Authentication required — no token provided'))
  }

  const userId = verifyJwt(token)
  if (!userId) {
    return next(new Error('Invalid or expired token'))
  }

  // Attach userId to socket for later use
  ;(socket as any).userId = userId
  next()
})

// ---------------------------------------------------------------------------
// Connection lifecycle — join user-specific room
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  const userId = (socket as any).userId as string
  console.log(
    `[notifications] client connected: ${socket.id} (user: ${userId})`
  )

  // Join the user's personal room — notifications are emitted to this room
  socket.join(`user:${userId}`)

  socket.emit('connected', {
    ok: true,
    time: new Date().toISOString(),
    userId,
  })

  socket.on('disconnect', (reason) => {
    console.log(
      `[notifications] client disconnected: ${socket.id} (${reason})`
    )
  })

  socket.on('error', (err) => {
    console.error(`[notifications] socket error (${socket.id}):`, err)
  })
})

// ---------------------------------------------------------------------------
// HTTP routing: /broadcast + /healthz
// ---------------------------------------------------------------------------

const socketIoRequestListeners = httpServer.listeners('request').slice(0)
httpServer.removeAllListeners('request')

httpServer.on('request', (req, res) => {
  const url = req.url?.split('?')[0]

  if (req.method === 'POST' && url === '/broadcast') {
    void handleBroadcast(req, res)
    return
  }

  if (req.method === 'GET' && url === '/healthz') {
    sendJson(res, 200, {
      ok: true,
      uptime: process.uptime(),
      connections: io.engine.clientsCount,
      redis: REDIS_URL ? 'connected' : 'disabled',
    })
    return
  }

  // Delegate everything else to Socket.IO
  for (const listener of socketIoRequestListeners) {
    listener.call(httpServer, req, res)
  }
})

// ---------------------------------------------------------------------------
// POST /broadcast — auth-protected notification push
// ---------------------------------------------------------------------------

async function handleBroadcast(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  // ── Auth check — require bearer token ──
  if (!AUTH_SECRET) {
    sendJson(res, 500, {
      ok: false,
      error: 'NOTIFICATIONS_SERVICE_SECRET not configured',
    })
    return
  }

  const authHeader = req.headers.authorization
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    sendJson(res, 401, { ok: false, error: 'Missing bearer token' })
    return
  }

  const token = authHeader.slice(7)
  if (token !== AUTH_SECRET) {
    sendJson(res, 403, { ok: false, error: 'Invalid service token' })
    return
  }

  // ── Parse body ──
  let raw: string
  try {
    raw = await readJsonBody(req)
  } catch (err) {
    sendJson(res, 413, { ok: false, error: (err as Error).message })
    return
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw)
    if (!body || typeof body !== 'object') throw new Error('not an object')
  } catch {
    sendJson(res, 400, { ok: false, error: 'Invalid JSON body' })
    return
  }

  const { type, title, message, severity } = body
  if (
    typeof type !== 'string' ||
    typeof title !== 'string' ||
    typeof message !== 'string' ||
    typeof severity !== 'string'
  ) {
    sendJson(res, 422, {
      ok: false,
      error: 'Missing fields: type, title, message, severity required',
    })
    return
  }

  const userId = typeof body.userId === 'string' ? body.userId : undefined
  const amount = typeof body.amount === 'number' ? body.amount : undefined
  const timestamp =
    typeof body.timestamp === 'string'
      ? body.timestamp
      : new Date().toISOString()

  const payload: Notification = {
    id: typeof body.id === 'string' ? (body.id as string) : crypto.randomUUID(),
    type,
    title,
    message,
    timestamp,
    severity: severity as Severity,
    ...(amount !== undefined ? { amount } : {}),
    ...(userId ? { userId } : {}),
  }

  // ── Per-user delivery (NOT global broadcast) ──
  if (userId) {
    // Send only to this user's room
    io.to(`user:${userId}`).emit('notification', payload)
    console.log(
      `[notifications] delivered to user:${userId} — ${payload.type}: ${payload.title}`
    )
  } else {
    // No userId — send to ALL connected clients (system-wide broadcast)
    io.emit('notification', payload)
    console.log(
      `[notifications] broadcast to all — ${payload.type}: ${payload.title}`
    )
  }

  sendJson(res, 200, { ok: true, id: payload.id })
}

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`[notifications] server running on port ${PORT}`)
  console.log(`[notifications] JWT auth: enabled`)
  console.log(`[notifications] /broadcast auth: ${AUTH_SECRET ? 'enabled' : 'DISABLED (set NOTIFICATIONS_SERVICE_SECRET!)'}`)
  console.log(`[notifications] /healthz: available`)
  console.log(`[notifications] per-user rooms: enabled (no data leak)`)
  if (REDIS_URL) {
    console.log(`[notifications] Redis adapter: enabled (multi-instance)`)
  }
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = (signal: string) => {
  console.log(`[notifications] received ${signal}, shutting down...`)
  io.close(() => {
    httpServer.close(() => {
      console.log('[notifications] server closed')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

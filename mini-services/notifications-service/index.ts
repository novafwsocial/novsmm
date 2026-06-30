/**
 * NOVSMM Notifications Mini-Service (v2 — DB-backed + ambient)
 * ------------------------------------------------------------------
 * Real-time notifications push service for the NOVSMM SaaS dashboard.
 *
 * - Transport: Socket.IO
 * - Port: 3003 (hardcoded — required by Caddy gateway routing)
 * - Path: "/" (required by Caddy gateway; do NOT change)
 * - CORS: "*" (dashboard clients may come from any origin)
 *
 * Two notification sources:
 *   1. Ambient broadcast loop — emits ONLY `type: "system"` notifications
 *      every 8–15s so the dashboard always feels alive. (Real order/sale/
 *      marketplace/etc. notifications now come from DB events via /broadcast.)
 *   2. HTTP `POST /broadcast` endpoint — called by the Next.js API routes
 *      when a real Notification row is created. The posted body is pushed
 *      immediately to all connected clients via `io.emit('notification', …)`.
 *
 * Frontend connects with:
 *   io("/?XTransformPort=3003", { path: "/" })
 *
 * The Caddy gateway inspects the `XTransformPort` query param and forwards
 * the request to the matching upstream (3003 here). We must NOT listen with
 * a custom sub-path because the gateway already strips nothing.
 *
 * IMPLEMENTATION NOTE on routing POST /broadcast alongside Socket.IO:
 *   Socket.IO with `path: '/'` would intercept EVERY HTTP request (because
 *   every URL starts with '/') and reply with a 400 "Transport unknown".
 *   To let our POST /broadcast endpoint through, we capture Socket.IO's
 *   `request` listener after it attaches, remove it, and install our own
 *   dispatcher that intercepts POST /broadcast first and otherwise delegates
 *   to the captured Socket.IO listener. The WebSocket `upgrade` event is
 *   untouched.
 */

import { createServer, IncomingMessage, ServerResponse } from 'http'
import { Server } from 'socket.io'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type Severity = 'info' | 'success' | 'warning' | 'error'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  amount?: number // USD, only for money-related notifications
  timestamp: string // ISO 8601
  severity: Severity
  userId?: string // optional — for future per-user targeting
}

// ---------------------------------------------------------------------------
// Config (hardcoded per task spec — NOT from env)
// ---------------------------------------------------------------------------

const PORT = 3003

// Ambient broadcast interval range (ms). Randomized per-tick so the feed
// feels alive. Only `system` notifications are emitted from this loop now.
const MIN_INTERVAL_MS = 8_000
const MAX_INTERVAL_MS = 15_000

// Hard cap on /broadcast body size to keep the endpoint snappy & safe.
const MAX_BROADCAST_BODY_BYTES = 1_000_000

// ---------------------------------------------------------------------------
// Ambient system template pool (~8 distinct entries)
// ---------------------------------------------------------------------------
// Real order/sale/marketplace/etc. notifications are no longer emitted from
// the ambient loop — they come from the DB via POST /broadcast. The ambient
// loop is reserved for "system" notifications that give the dashboard a
// subtle sense of liveness (uptime, maintenance, security, backups, etc.).
// ---------------------------------------------------------------------------

interface SystemTemplate {
  title: string
  message: string
  severity: Severity
}

const SYSTEM_TEMPLATES: SystemTemplate[] = [
  {
    title: 'All systems operational',
    message: 'All NOVSMM services are running nominally (uptime 99.98%)',
    severity: 'info',
  },
  {
    title: 'Scheduled maintenance',
    message: 'Maintenance window scheduled tonight 02:00–02:30 UTC',
    severity: 'warning',
  },
  {
    title: 'Security advisory',
    message: 'New sign-in from Chrome on macOS — review your active sessions',
    severity: 'info',
  },
  {
    title: 'API rate limit reset',
    message: 'Your hourly API rate limit has been reset',
    severity: 'info',
  },
  {
    title: 'Daily backup completed',
    message: 'Your account data backup completed successfully',
    severity: 'success',
  },
  {
    title: 'New feature available',
    message: 'Bulk order import is now available on the Orders page',
    severity: 'info',
  },
  {
    title: 'Compliance reminder',
    message: 'Please review the updated Terms of Service at your earliest convenience',
    severity: 'warning',
  },
  {
    title: 'Performance update',
    message: 'Avg order processing time improved to 1.2s (–18% this week)',
    severity: 'success',
  },
]

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const uuid = (): string =>
  // Lightweight RFC-4122-ish v4 (good enough for ephemeral notifications)
  'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })

const pickSystemTemplate = (): SystemTemplate =>
  SYSTEM_TEMPLATES[Math.floor(Math.random() * SYSTEM_TEMPLATES.length)]

const buildSystemNotification = (): Notification => {
  const t = pickSystemTemplate()
  return {
    id: uuid(),
    type: 'system',
    title: t.title,
    message: t.message,
    timestamp: new Date().toISOString(),
    severity: t.severity,
  }
}

const nextDelay = (): number =>
  Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1)) +
  MIN_INTERVAL_MS

const logEmit = (n: Notification): void => {
  const amountStr =
    typeof n.amount === 'number' ? ` $${n.amount.toFixed(2)}` : ''
  console.log(
    `[notifications] emit ${n.type} ${n.title}${amountStr} — ${n.message}`,
  )
}

// ---------------------------------------------------------------------------
// HTTP + Socket.IO server
// ---------------------------------------------------------------------------

const httpServer = createServer()

const io = new Server(httpServer, {
  // DO NOT change the path — Caddy uses it to forward to this port.
  path: '/',
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
  pingTimeout: 60_000,
  pingInterval: 25_000,
})

// ---------------------------------------------------------------------------
// Routing: intercept POST /broadcast BEFORE Socket.IO sees it.
// ---------------------------------------------------------------------------
// With path:'/', Socket.IO's engine.io layer matches EVERY HTTP request, so
// we install our own request listener first (by capturing & replacing the
// one Socket.IO just registered) and delegate only non-/broadcast traffic.
// ---------------------------------------------------------------------------

const socketIoRequestListeners = httpServer.listeners('request').slice(0)
httpServer.removeAllListeners('request')

httpServer.on('request', (req, res) => {
  if (req.method === 'POST' && req.url?.split('?')[0] === '/broadcast') {
    void handleBroadcast(req, res)
    return
  }
  // Delegate everything else (Engine.IO polling, handshake, etc.) to Socket.IO.
  for (const listener of socketIoRequestListeners) {
    listener.call(httpServer, req, res)
  }
})

// ---------------------------------------------------------------------------
// POST /broadcast — used by Next.js API routes to push real DB notifications
// ---------------------------------------------------------------------------
// Body: { type, title, message, amount?, severity, userId? }
//   - type, title, message, severity are required
//   - amount (number) and userId (string) are optional
// We add id + timestamp if the caller didn't supply them, then emit to ALL
// connected clients. (Per-user targeting is a future enhancement; for now
// we always broadcast to everyone.)
// ---------------------------------------------------------------------------

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

const sendJson = (
  res: ServerResponse,
  status: number,
  payload: unknown,
): void => {
  const body = JSON.stringify(payload)
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Content-Length': Buffer.byteLength(body),
  })
  res.end(body)
}

async function handleBroadcast(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  let raw: string
  try {
    raw = await readJsonBody(req)
  } catch (err) {
    sendJson(res, 413, { ok: false, error: (err as Error).message })
    return
  }

  let body: Record<string, unknown>
  try {
    body = JSON.parse(raw) as Record<string, unknown>
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
      error:
        'Missing or invalid fields. Required: type, title, message, severity (all strings).',
    })
    return
  }

  const amount = body.amount
  const userId = body.userId
  const timestamp =
    typeof body.timestamp === 'string'
      ? body.timestamp
      : new Date().toISOString()

  const payload: Notification = {
    id: typeof body.id === 'string' ? (body.id as string) : uuid(),
    type,
    title,
    message,
    timestamp,
    severity: severity as Severity,
    ...(typeof amount === 'number' && Number.isFinite(amount)
      ? { amount }
      : {}),
    ...(typeof userId === 'string' && userId.length > 0 ? { userId } : {}),
  }

  io.emit('notification', payload)
  logEmit(payload)

  sendJson(res, 200, { ok: true, id: payload.id })
}

// ---------------------------------------------------------------------------
// Connection lifecycle
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[notifications] client connected: ${socket.id}`)

  socket.emit('connected', {
    ok: true,
    time: new Date().toISOString(),
  })

  socket.on('disconnect', (reason) => {
    console.log(
      `[notifications] client disconnected: ${socket.id} (${reason})`,
    )
  })

  socket.on('error', (err) => {
    console.error(`[notifications] socket error (${socket.id}):`, err)
  })
})

// ---------------------------------------------------------------------------
// Ambient broadcast loop — system-only, randomized 8–15s interval
// ---------------------------------------------------------------------------

let timer: ReturnType<typeof setTimeout>

const broadcastNext = () => {
  const n = buildSystemNotification()
  io.emit('notification', n)
  logEmit(n)
  timer = setTimeout(broadcastNext, nextDelay())
}

// Kick off the loop shortly after boot so the welcome handshake can land first.
timer = setTimeout(broadcastNext, 3_000)

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`[notifications] server running on port ${PORT}`)
  console.log(
    `[notifications] ambient system broadcast every ${MIN_INTERVAL_MS / 1000}–${MAX_INTERVAL_MS / 1000}s across ${SYSTEM_TEMPLATES.length} templates`,
  )
  console.log(
    '[notifications] POST /broadcast available for DB-pushed notifications',
  )
})

// ---------------------------------------------------------------------------
// Graceful shutdown
// ---------------------------------------------------------------------------

const shutdown = (signal: string) => {
  console.log(`[notifications] received ${signal}, shutting down...`)
  clearTimeout(timer)
  io.close(() => {
    httpServer.close(() => {
      console.log('[notifications] server closed')
      process.exit(0)
    })
  })
}

process.on('SIGTERM', () => shutdown('SIGTERM'))
process.on('SIGINT', () => shutdown('SIGINT'))

/**
 * NOVSMM Notifications Mini-Service
 * ---------------------------------
 * Real-time notifications push service for the NOVSMM SaaS dashboard.
 *
 * - Transport: Socket.IO
 * - Port: 3003 (hardcoded — required by Caddy gateway routing)
 * - Path: "/" (required by Caddy gateway; do NOT change)
 * - CORS: "*" (dashboard clients may come from any origin)
 *
 * Frontend connects with:
 *   io("/?XTransformPort=3003", { path: "/" })
 *
 * The Caddy gateway inspects the `XTransformPort` query param and forwards
 * the request to the matching upstream (3003 here). We must NOT listen with
 * a custom sub-path because the gateway already strips nothing.
 */

import { createServer } from 'http'
import { Server } from 'socket.io'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type NotificationType =
  | 'order'
  | 'sale'
  | 'marketplace'
  | 'ticket'
  | 'recharge'
  | 'withdrawal'
  | 'referral'
  | 'system'

type Severity = 'info' | 'success' | 'warning'

interface Notification {
  id: string
  type: NotificationType
  title: string
  message: string
  amount?: number // USD, only for money-related notifications
  timestamp: string // ISO 8601
  severity: Severity
}

// ---------------------------------------------------------------------------
// Config (hardcoded per task spec — NOT from env)
// ---------------------------------------------------------------------------

const PORT = 3003

// Broadcast interval range (ms). Randomized per-tick so the feed feels alive.
const MIN_INTERVAL_MS = 6_000
const MAX_INTERVAL_MS = 12_000

// ---------------------------------------------------------------------------
// Notification template pool
// ---------------------------------------------------------------------------
// Each template can optionally generate a randomized USD amount so the same
// template yields varied values over time. Keep ~15 distinct entries.
// ---------------------------------------------------------------------------

interface Template {
  type: NotificationType
  title: string
  message: string
  severity: Severity
  amount?: () => number // producer for money-related notifications
}

const money = (min: number, max: number, decimals = 2): number => {
  const v = Math.random() * (max - min) + min
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}

const orderIds = (): string => `A-${Math.floor(10000 + Math.random() * 90000)}`
const ticketIds = (): string => `T-${Math.floor(100 + Math.random() * 900)}`
const txHash = (): string =>
  Math.random().toString(36).slice(2, 10).toUpperCase()

const TEMPLATES: Template[] = [
  {
    type: 'order',
    title: 'New order received',
    message: `Order #${orderIds()} — Instagram Followers (1,000)`,
    severity: 'info',
  },
  {
    type: 'order',
    title: 'New order received',
    message: `Order #${orderIds()} — TikTok Views (50,000)`,
    severity: 'info',
  },
  {
    type: 'order',
    title: 'New order received',
    message: `Order #${orderIds()} — YouTube Subscribers (500)`,
    severity: 'info',
  },
  {
    type: 'sale',
    title: 'Payment received',
    message: 'Payment received via Stripe',
    severity: 'success',
    amount: () => money(12, 480),
  },
  {
    type: 'sale',
    title: 'Payment received',
    message: 'Payment received via PayPal',
    severity: 'success',
    amount: () => money(8, 220),
  },
  {
    type: 'sale',
    title: 'Payment received',
    message: 'Crypto payment confirmed on-chain',
    severity: 'success',
    amount: () => money(25, 950),
  },
  {
    type: 'marketplace',
    title: 'Marketplace offer sold',
    message: 'Your offer sold — TikTok Views (1M pack)',
    severity: 'success',
    amount: () => money(35, 320),
  },
  {
    type: 'marketplace',
    title: 'Marketplace offer sold',
    message: 'Your offer sold — Instagram Likes (10K pack)',
    severity: 'success',
    amount: () => money(15, 180),
  },
  {
    type: 'marketplace',
    title: 'New offer published',
    message: 'A reseller published a new Spotify Plays offer',
    severity: 'info',
  },
  {
    type: 'ticket',
    title: 'Support ticket updated',
    message: `Ticket #${ticketIds()} updated by support team`,
    severity: 'info',
  },
  {
    type: 'ticket',
    title: 'Ticket escalated',
    message: `Ticket #${ticketIds()} was escalated to priority tier`,
    severity: 'warning',
  },
  {
    type: 'recharge',
    title: 'Wallet recharged',
    message: 'Wallet top-up confirmed — Visa •••• 4242',
    severity: 'success',
    amount: () => money(50, 2500),
  },
  {
    type: 'withdrawal',
    title: 'Withdrawal processed',
    message: `Withdrawal processed — TX ${txHash()}`,
    severity: 'success',
    amount: () => money(100, 5000),
  },
  {
    type: 'referral',
    title: 'Referral bonus earned',
    message: 'You earned a referral bonus from a new invitee',
    severity: 'success',
    amount: () => money(2, 25),
  },
  {
    type: 'system',
    title: 'All systems operational',
    message: 'All NOVSMM services are running nominally (uptime 99.98%)',
    severity: 'info',
  },
  {
    type: 'system',
    title: 'Scheduled maintenance',
    message: 'Maintenance window scheduled tonight 02:00–02:30 UTC',
    severity: 'warning',
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

const pickTemplate = (): Template =>
  TEMPLATES[Math.floor(Math.random() * TEMPLATES.length)]

const buildNotification = (): Notification => {
  const t = pickTemplate()
  const n: Notification = {
    id: uuid(),
    type: t.type,
    title: t.title,
    message: t.message,
    timestamp: new Date().toISOString(),
    severity: t.severity,
  }
  if (t.amount) {
    n.amount = t.amount()
  }
  return n
}

const nextDelay = (): number =>
  Math.floor(Math.random() * (MAX_INTERVAL_MS - MIN_INTERVAL_MS + 1)) +
  MIN_INTERVAL_MS

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
// Connection lifecycle
// ---------------------------------------------------------------------------

io.on('connection', (socket) => {
  console.log(`[notifications] client connected: ${socket.id}`)

  socket.emit('connected', {
    ok: true,
    time: new Date().toISOString(),
  })

  socket.on('disconnect', (reason) => {
    console.log(`[notifications] client disconnected: ${socket.id} (${reason})`)
  })

  socket.on('error', (err) => {
    console.error(`[notifications] socket error (${socket.id}):`, err)
  })
})

// ---------------------------------------------------------------------------
// Broadcast loop — randomized interval, rotates through the template pool
// ---------------------------------------------------------------------------

let timer: ReturnType<typeof setTimeout>

const broadcastNext = () => {
  const n = buildNotification()
  io.emit('notification', n)
  const amountStr = typeof n.amount === 'number' ? ` $${n.amount.toFixed(2)}` : ''
  console.log(
    `[notifications] emit ${n.type} ${n.title}${amountStr} — ${n.message}`,
  )
  timer = setTimeout(broadcastNext, nextDelay())
}

// Kick off the loop shortly after boot so the welcome handshake can land first.
timer = setTimeout(broadcastNext, 2_000)

// ---------------------------------------------------------------------------
// Boot
// ---------------------------------------------------------------------------

httpServer.listen(PORT, () => {
  console.log(`WebSocket server running on port ${PORT}`)
  console.log(
    `[notifications] broadcasting every ${MIN_INTERVAL_MS / 1000}–${MAX_INTERVAL_MS / 1000}s across ${TEMPLATES.length} templates`,
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

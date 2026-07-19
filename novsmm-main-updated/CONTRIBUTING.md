# Contributing to NOVSMM

Thank you for your interest in contributing to NOVSMM! This document covers the development setup, code style, and pull request process.

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) 1.1+
- Node.js 20+
- Git

### Getting Started

```bash
# Clone the repository
git clone https://github.com/yourusername/novsmm.git
cd novsmm

# Install dependencies
bun install

# Copy environment variables
cp .env.example .env

# Generate secrets
openssl rand -hex 32  # → NEXTAUTH_SECRET
openssl rand -hex 24  # → LICENSE_ENCRYPTION_KEY

# Edit .env with the generated values
nano .env

# Generate Prisma client
bun run db:generate

# Create database + seed
bun run db:push
bun run prisma/seed.ts

# Start the dev server
bun run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Optional: Redis (for testing production features)

```bash
# Install Redis locally
brew install redis  # macOS
sudo apt install redis-server  # Ubuntu

# Start Redis
redis-server

# Add to .env
REDIS_URL=redis://localhost:6379
```

Without Redis, the app uses in-memory fallbacks (cache, rate limiting, queues).

### Optional: Worker Process (for background jobs)

```bash
# In a separate terminal
bun run worker
```

Without the worker, background jobs run in-process via `setImmediate` fallback.

## Code Style

### TypeScript

- Strict typing throughout (no `any` unless absolutely necessary)
- Use `interface` for object shapes, `type` for unions/intersections
- Prefer `const` over `let`, never `var`
- Use ES6+ import/export syntax
- Add JSDoc comments for exported functions

### API Routes

All API routes should use the Phase 5 infrastructure:

```typescript
import { withErrorHandler } from "@/lib/api-handler";
import { requireAuth } from "@/lib/api-utils";
import { parseBody } from "@/lib/parse-body";
import { ok } from "@/lib/response";
import { audit } from "@/lib/api-utils";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(255),
}).strict();

export const POST = withErrorHandler(async (req: NextRequest) => {
  const { user, error } = await requireAuth();
  if (error) return error;

  const data = await parseBody(req, schema);

  // ... business logic ...

  await audit(user.id, "create", "entity", entity.id);

  return ok({ entity });
});
```

### Logging

Use the structured logger (pino), never `console.log`:

```typescript
import { logger, withContext } from "@/lib/logger";

// Good
logger.info({ userId, action: "login" }, "User logged in");
logger.error({ err, userId }, "Failed to process payment");

// With context
const log = withContext({ module: "orders", userId });
log.info({ orderId }, "Order created");

// Bad — don't use console
console.log("User logged in"); // ❌
console.error("Payment failed", error); // ❌
```

### Monetary Values

Use `src/lib/money.ts` helpers for all monetary arithmetic (works with both Float and Decimal):

```typescript
import { moneyGte, moneySub, toMoneyDisplay } from "@/lib/money";

// Good
if (moneyGte(user.balance, totalPrice)) {
  const newBalance = moneySub(user.balance, totalPrice);
}
const display = toMoneyDisplay(user.balance);

// Bad — doesn't work with Prisma.Decimal
if (user.balance >= totalPrice) { // ❌
  const newBalance = user.balance - totalPrice; // ❌
}
```

### Database Queries

- Use `select` to fetch only needed fields
- Use `include` for relations (avoid N+1)
- Use `Promise.all` for parallel independent queries
- Use interactive `$transaction` for read-modify-write operations
- Use `nextPublicId()` for atomic ID generation

### Components

- Use shadcn/ui components from `src/components/ui/`
- Use `'use client'` only when needed (state, effects, event handlers)
- Use `dynamic()` for code-splitting heavy components
- Use Framer Motion for animations (no exit animations — causes DOM errors)

## Pull Request Process

### Before Creating a PR

1. **Run lint**: `bun run lint`
2. **Run type check**: `bunx tsc --noEmit`
3. **Test your changes** in the browser
4. **Update documentation** if needed

### PR Checklist

- [ ] Code follows the style guide
- [ ] `bun run lint` passes with no errors
- [ ] No `console.log` (use `logger`)
- [ ] No `as any` casts (use proper types)
- [ ] API routes use `withErrorHandler` + `parseBody`
- [ ] Sensitive actions have `audit()` calls
- [ ] Monetary values use `money.ts` helpers
- [ ] Documentation updated (if applicable)

### PR Template

```markdown
## Description
[What does this PR do?]

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update
- [ ] Performance improvement
- [ ] Security fix

## Testing
[How did you test this?]

## Screenshots
[If applicable]
```

### Review Process

1. All PRs require at least one review
2. CI must pass (lint + build)
3. No direct pushes to `main`
4. Squash and merge on approval

## Project Structure

See [README.md](README.md#project-structure) for the complete directory structure.

## Key Files

| File | Purpose |
|------|---------|
| `src/lib/auth.ts` | NextAuth configuration |
| `src/lib/api-handler.ts` | withErrorHandler HOC |
| `src/lib/api-utils.ts` | requireAuth, requireAdmin, audit helpers |
| `src/lib/db.ts` | Prisma client |
| `src/lib/redis.ts` | Redis client (graceful degradation) |
| `src/lib/cache.ts` | Cache layer |
| `src/lib/queues.ts` | BullMQ queue definitions |
| `src/lib/logger.ts` | pino structured logger |
| `src/lib/money.ts` | Decimal-safe monetary helpers |
| `src/lib/services/` | Business logic (loyalty, wallet) |
| `prisma/schema.prisma` | Database schema |
| `docker-compose.yml` | Production orchestration |

## Questions?

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/yourusername/novsmm/issues)
- **Security**: See [SECURITY.md](SECURITY.md)

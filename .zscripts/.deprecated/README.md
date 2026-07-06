# Deprecated Scripts

These scripts are **deprecated and should not be used**. They are kept here for
historical reference only.

## build.sh

**Status:** Deprecated (removed from active use)
**Replaced by:** Docker + `docker compose build` (see `Dockerfile`, `docker-compose.yml`)

**Why deprecated:**
- Hardcoded absolute path `/home/z/my-project` (not portable)
- Targets the obsolete Caddy + SQLite architecture (NOVSMM now uses Docker Compose with PostgreSQL + Redis + Nginx/Caddy)
- Ships dev artifacts into a production tarball (security risk)
- Chinese-only comments (not accessible to the team)
- No `pipefail`, `exec 2>&1` defeats error attribution

**If you need to build NOVSMM**, use:
```bash
docker compose build
```

## start.sh

**Status:** Deprecated (removed from active use)
**Replaced by:** `docker compose up -d` (see `docker-compose.yml`, `scripts/deploy.sh`)

**Why deprecated:**
- Targets the obsolete Caddy + SQLite architecture (NOVSMM now uses Docker Compose)
- Hardcoded `/app/db/custom.db` (SQLite path — production uses PostgreSQL)
- `cleanup` function is defined but never trapped (`exec caddy` replaces the shell, so `trap` never fires)
- No `pipefail`

**If you need to start NOVSMM**, use:
```bash
docker compose up -d
# or
./scripts/deploy.sh
```

---

**Audit references:** P0-015, P0-016, P0-017, P1-047, P1-048, P1-049, P1-050, P1-056, P1-057, P2-051, P2-052

# Security Policy

## Supported Versions

| Version | Supported |
|---------|-----------|
| 0.2.x   | ✅        |
| < 0.2   | ❌        |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please follow responsible disclosure.

### How to Report

**DO NOT open a public GitHub issue for security vulnerabilities.**

Instead, please report vulnerabilities via one of these methods:

1. **Email**: Send details to `security@novsmm.io`
2. **GitHub Security Advisories**: Use GitHub's private vulnerability reporting feature at [github.com/yourusername/novsmm/security/advisories/new](https://github.com/yourusername/novsmm/security/advisories/new)

### What to Include

Please include the following in your report:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)
- Your name/handle for credit (optional)

### Response Timeline

| Step | Timeline |
|------|----------|
| Acknowledgment | Within 48 hours |
| Initial assessment | Within 7 days |
| Fix development | Within 30 days (severity-dependent) |
| Public disclosure | After fix is released (90 days max) |

### Bounty

We offer bounties for confirmed security vulnerabilities based on severity:

| Severity | Bounty |
|----------|--------|
| Critical (RCE, SQL injection, auth bypass) | $500 - $2,000 |
| High (XSS, CSRF, data leak) | $200 - $500 |
| Medium (info disclosure, rate limit bypass) | $50 - $200 |
| Low (missing headers, best practice) | Credit only |

## Security Measures

NOVSMM implements defense-in-depth security. See [docs/security.md](docs/security.md) for complete documentation.

### Authentication
- NextAuth.js v4 with JWT strategy
- bcrypt cost-12 password hashing
- Google OAuth (verified emails only)
- 2FA TOTP (enforced in authorize)
- Brute-force protection (5 attempts → 15-min lockout, Redis-backed)

### API Security
- `requireAuth` / `requireAdmin` on all protected routes
- Zod validation with `.strict()` (rejects unknown fields)
- CSRF protection (Origin header value-matched)
- Rate limiting (Nginx + middleware + Redis)
- Audit logging with IP + User-Agent

### Data Security
- AES-256-GCM encryption for payment credentials, 2FA secrets, license keys
- HMAC-SHA256 webhook signature verification (fail-closed)
- No `NEXT_PUBLIC_*` secrets exposed to client
- pino logger redacts sensitive fields
- Sentry `sendDefaultPii: false`

### Infrastructure Security
- TLS 1.2+1.3 (A+ SSL Labs rating)
- HSTS with preload
- Security headers (X-Frame-Options, X-Content-Type-Options, Permissions-Policy, Cross-Origin-*)
- Docker containers run as non-root user
- Database not exposed externally (only via Docker network)

## Security Best Practices for Deployment

When deploying NOVSMM, follow these best practices:

1. **Generate strong secrets**: Use `openssl rand -hex 32` for `NEXTAUTH_SECRET` and `LICENSE_ENCRYPTION_KEY`
2. **Use HTTPS only**: Configure Nginx with Let's Encrypt certificates
3. **Enable Cloudflare**: DDoS protection + WAF + CDN
4. **Set up rate limiting**: Already configured in Nginx + middleware
5. **Enable Sentry**: Set `SENTRY_DSN` for error tracking
6. **Regular backups**: See [docs/disaster-recovery.md](docs/disaster-recovery.md)
7. **Keep dependencies updated**: Run `bun audit` regularly
8. **Restrict database access**: PostgreSQL only accessible via Docker network (not exposed externally)
9. **Use strong passwords**: For PostgreSQL, SMTP, and all payment provider accounts
10. **Enable 2FA**: For all admin accounts

## Disclosure Policy

- We follow responsible disclosure (90-day timeline)
- We credit researchers who report vulnerabilities (unless they prefer to remain anonymous)
- We do not pursue legal action against researchers who follow responsible disclosure
- We publish security advisories for fixed vulnerabilities

## Contact

- **Security email**: security@novsmm.io
- **General issues**: [GitHub Issues](https://github.com/yourusername/novsmm/issues)

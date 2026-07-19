# Task: FOOTER-AUTH-DOCS-3D-1

Agent: full-stack-developer
Task: 3D motion + interactivity for footer, auth screens, API docs, changelog, 404

## Context

Continuation of the NOVSMM 3D enhancement work:
- LANDING-3D-ENHANCEMENT-1: hero, dashboard preview, service cards, sticky CTA, floating chips
- DASHBOARD-3D-ENHANCEMENT-1: dashboard stat cards, table rows, tabs, charts, modals
- THIS TASK: cover the remaining functional pages — footer, auth, docs, changelog, 404

## Constraints honored

- NO new npm dependencies (pure CSS + existing IntersectionObserver via DashReveal)
- NO framer-motion additions (CSS animations only — framer-motion already in those files is untouched)
- Mobile-first: `@media (max-width: 768px)` disables all 3D
- prefers-reduced-motion: all 3D disabled
- GPU-composited only (transform, opacity, box-shadow, filter)
- Cross-browser (transform-style: preserve-3d, perspective — supported in all modern browsers)

## Files Modified

1. **src/app/globals.css** — appended ~200 lines of new CSS organized in 6 sections:
   - FOOTER 3D & MOTION: `.footer-link-3d`, `.footer-col-reveal`, `.status-badge-glow`, `.footer-logo-float`
   - AUTH SCREENS 3D: `.auth-card-3d`, `.auth-card-inner`, `.auth-input-3d`, `.social-btn-3d`
   - API DOCS PAGE 3D: `.endpoint-card-3d`, `.method-badge-3d`, `.code-block-3d`
   - CHANGELOG PAGE 3D: `.timeline-entry-3d`, `.timeline-dot-pulse`
   - 404 PAGE 3D: `.error-404-float`, `.resource-card-3d`
   - Mobile disable block + reduced-motion block

2. **src/components/novsmm/footer.tsx**:
   - Imported `DashReveal` from `./dash-reveal`
   - Added `footer-link-3d` to both `<a>` and `<button>` variants in `renderLink`
   - Wrapped each `COLUMNS` entry in `<DashReveal className="footer-col-reveal" delay={0.05 * (idx + 1)}>` for staggered reveal
   - Added `status-badge-glow` to the "All systems operational" badge
   - Added `footer-logo-float` to the `<a>` wrapping `<Logo />`

3. **src/components/novsmm/login-screen.tsx**:
   - Added `auth-card-3d` to the `max-w-[440px]` motion.div (parent perspective)
   - Added `auth-card-inner` to the rounded-3xl card div (3D entrance animation)
   - Wrapped Email and Password `<Field>` in `<div className="auth-input-3d">`
   - Wrapped each `<SocialButton>` in `<div className="social-btn-3d">`
   - Added `btn-press` to the Sign in button
   - (ForgotPasswordModal left unchanged — not in scope)

4. **src/components/novsmm/register-screen.tsx**:
   - Added `auth-card-3d` to `max-w-[460px]` motion.div
   - Added `auth-card-inner` to card div
   - Wrapped Full name, Username, Email, Password, Confirm password Fields in `<div className="auth-input-3d">`
   - Wrapped each SocialButton in `<div className="social-btn-3d">`
   - Added `btn-press` to the Create account button

5. **src/components/novsmm/api-docs-page.tsx**:
   - Added `endpoint-card-3d` to each endpoint card div
   - Added `method-badge-3d` to each method badge span (GET/POST/PUT/DELETE)
   - Added `code-block-3d` to all 3 `<pre>` blocks (request body, response, cURL examples)
   - Added `btn-press` to both copy buttons (auth header + cURL examples)

6. **src/components/novsmm/changelog-page.tsx**:
   - Added `timeline-entry-3d` to each timeline content card div
   - Added `timeline-dot-pulse` to each timeline dot div
   - (No buttons on this page — single `<a>` back-to-home left unchanged)

7. **src/app/not-found.tsx**:
   - Added `error-404-float` to the `<p>` containing "404"
   - Added `btn-press` to both primary CTA `<Link>` elements (Back to home, Explore services)
   - Added `resource-card-3d` to all 3 resource cards (API docs, FAQ, Get help)

## Implementation Notes

- For `auth-input-3d`, wrapped each `<Field>` in a `<div>` rather than passing className to Field — Field's inner motion.div uses framer-motion to animate `transform` inline, which would override CSS transform. Wrapping in an external div lets the CSS `:focus-within` transform apply cleanly without conflict.
- For `social-btn-3d`, same wrapping approach — SocialButton uses framer-motion `whileHover={{ y: -1 }}` which would override CSS transform on the button itself.
- `btn-press` is applied directly to buttons/links since those elements aren't transformed by anything else — `:active { transform: scale(0.97) }` works without conflict.
- Footer columns wrapped in DashReveal (existing component) for staggered scroll reveal. The `footer-col-reveal` class is also added as a marker (CSS behavior overlaps with `dash-reveal` — both fade+translateY — but they're consistent so no conflict).

## Build Result

- `bun run build` → ✓ Compiled successfully in 35.2s
- All 109 static pages generated
- No type errors, no build errors
- Dev server starts cleanly on port 3000

## Pre-existing issues (NOT introduced by this task)

- ESLint has a `TypeError: Class extends value undefined is not a constructor or null` error from `@typescript-eslint/utils` — this is an environment compatibility issue, not related to my changes.
- Dev server emits a Next.js 16 deprecation warning about `middleware` → `proxy` — unrelated to this task.

## Report

- Files modified: 7 (globals.css, footer.tsx, login-screen.tsx, register-screen.tsx, api-docs-page.tsx, changelog-page.tsx, not-found.tsx)
- Build result: PASS (✓ Compiled successfully, 109/109 pages generated)
- Issues: None introduced. Pre-existing ESLint environment issue noted but unrelated.

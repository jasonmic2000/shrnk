# Shrnk — Project Context (handoff for Codex / VS Code)

This document is the **source of truth** for the current Shrnk codebase: what we’re building, decisions that are locked, what’s already implemented, and what the next steps are.

---

## 1) Product summary

**Shrnk** is a **developer-first** URL shortener with **privacy-first analytics**.

- _Developer-first:_ clean APIs, predictable behavior, strong validation, good DX, easy self-hosting.
- _Privacy-first analytics:_ aggregated counters only; no IP storage, no fingerprinting, no cross-link user tracking.

---

## 2) MVP scope

### In MVP (current build)

- Create short links (random Base58 slugs, or custom slugs)
- Resolve short links with correct redirect status
- Link management via API (list + update)
- Privacy-first analytics capture (click counters + last-click time)
- Redis caching for fast redirects and DB protection

### Explicitly not in MVP (future)

- User accounts / authentication
- QR code generation
- Link-in-bio pages
- Advanced attribution / identity tracking / session tracking
- Teams / workspaces / roles
- Malware/phishing detection (design allows adding later)

---

## 3) Locked decisions (do not change unless explicitly decided)

### Slugs

- **Default slug:** Base58 random, **7 characters**, **case-sensitive**
- **Custom slug:** lowercase, case-insensitive, allowed chars: `[a-z0-9-]`
  - Reject empty
  - Reject leading/trailing `-`
  - Reject consecutive `--` (if implemented)
  - Max length: 64
  - Reserved slugs blocked: `api, admin, health, links, login, signup, dashboard`
- **Collision strategy:** DB unique constraint + retry loop for random slugs; custom slug returns `409 slug_taken`.

### Redirect behavior

- Supported: **301, 302, 307, 308**
- Default: **302**
- If redirectType is **301 or 308**, link becomes **immutable** and response includes a warning.

### URL normalization & safety

- Trim whitespace
- If scheme missing, default to **https://**
- Allow only **http / https**
- Use `new URL()` (no regex parsing)
- Lowercase hostname
- Strip default ports (`:80` for http, `:443` for https)
- Reject dangerous schemes (`javascript:`, `data:`, `file:`, etc.)
- Max length 2048

### Custom domains (future-ready)

- DB keys and caching are already shaped to support `(domainId, slug)` uniqueness.

---

## 4) Tech stack

### Current

- **Next.js (App Router)** + **TypeScript**
- **Tailwind CSS**
- **Postgres** + **Prisma**
- **Redis** for:
  - hot-path link cache
  - negative cache for missing slugs
  - analytics counters
  - rate-limiting (planned)

### Planned (Phase 2)

- **Go redirect edge service** (apps/edge) for high-performance redirect path
  - Redis-first lookup, DB fallback
  - Behavior parity with Next.js redirect route
  - Contract parity tests (planned)

---

## 5) Repo structure

Monorepo (pnpm workspaces):

- `apps/web` — Next.js app
  - API routes (create/list/update)
  - Redirect route (`/:slug`)
  - Future: dashboard UI, docs pages, privacy page
- `apps/edge` — Go placeholder (future redirect edge)
- (Optional later) `packages/shared` — shared types/specs

---

## 6) Key runtime behavior

### Domain resolution (MVP)

- Uses `DEFAULT_DOMAIN_HOSTNAME` env to select the Domain record from DB.
- If the Domain is missing, APIs return 500 with message to run seed.

### Redis link cache (centralized helpers)

- Cache key format: `link:<domainId>:<slug>`
- Cached payload includes:
  - `linkId`, `destinationUrl`, `redirectType`, `disabled`, `expiresAt`
- TTL: **24 hours**
- Negative cache sentinel: `__missing__` with TTL **60 seconds**
- Rationale:
  - DB protection against probing/bot traffic
  - Fast redirect response

### Redirect route

- Path: `GET /:slug` (Next.js route handler)
- Resolution:
  1. Redis cache
  2. DB fallback
  3. cache fill
  4. 404 if not found
  5. 410 if disabled or expired
- Uses **safeRedirectStatus** to allow only 301/302/307/308; otherwise fallback to 302.
- Analytics (non-blocking):
  - increments `clicks:<linkId>`
  - sets `lastClickedAt:<linkId>` (with TTL, if implemented)

---

## 7) What’s implemented so far (completed tickets)

### Foundation (done)

- Monorepo scaffold
- Docker Compose for Postgres + Redis
- Prisma setup + migrations + seed
- Health route checks

### Core primitives (done)

- Base58 slug generator + tests
- Custom slug validation + tests
- URL normalize/validate + tests

### Core engine (done)

- **POST /api/links** (create)
  - normalization/validation
  - random slug retry loop
  - custom slug 409
  - immutable behavior for 301/308
  - creates Link + LinkAnalytics
  - writes to Redis cache
- **GET /:slug** (redirect)
  - Redis-first + DB fallback + cache fill
  - 404 / 410 handling
  - safe redirect status
  - negative caching
  - analytics capture (non-blocking)
- **Cache module** centralized
- **GET /api/links** (list with cursor pagination + analytics)
- **PATCH /api/links/:id** (update + cache refresh, immutability enforcement)

---

## 8) How to run locally

From repo root:

1. Start infra:

```bash
docker compose up -d
```

2. Install deps:

```bash
pnpm -w install
```

3. Migrate + seed:

```bash
pnpm --filter web db:migrate
pnpm --filter web db:seed
```

4. Run dev server:

```bash
pnpm --filter web dev
```

5. Tests / lint:

```bash
pnpm --filter web test
pnpm -w lint
```

---

## 9) Current milestone status

### Backend MVP: ✅ essentially complete

You have the full backend workflow for:

- create → redirect → list → update (+ cache coherency)

### Next milestone: UI (dashboard)

Recommended order:

1. Create link form
2. Links list table (copy link, show analytics)
3. Disable toggle + expiry update from UI
4. Link details page (optional)

### After UI: hardening + scale

- Rate limiting (create + redirect)
- Analytics flushing job (Redis → DB)
- Docs + privacy page

### Phase 2: Go redirect edge service

- Implement parity with Next.js redirect behavior
- Add contract parity tests
- Deploy as separate service (optional)

---

## 10) Codex rules (important)

When using Codex (VS Code extension / CLI):

- **Read this file first** before making changes.
- Follow the ticket at hand; don’t add “bonus features” unless requested.
- Keep redirect behavior identical between cache and DB paths.
- Don’t introduce user tracking (IP, cookies, fingerprinting).
- Prefer small, test-backed changes with clear acceptance criteria.

---

## 11) Next ticket (UI kickoff)

Start with a minimal dashboard page that uses existing APIs:

- POST `/api/links`
- GET `/api/links`
- PATCH `/api/links/:id`

No auth yet; assume a single default domain.

# Shrnk

**A privacy-first, developer-focused URL shortener built with intent.**

Shrnk is an exploration of what a modern URL shortener looks like when you treat it like a real product instead of a demo — with clear boundaries, sensible defaults, and room to evolve.

This project is less about “shortening links” and more about **engineering judgment**: trade-offs around data storage, performance, extensibility, and user trust.

---

## Why Shrnk?

Most URL shorteners optimize for growth, tracking, or lock-in.  
Shrnk is intentionally different.

- No dark analytics patterns
- No unnecessary tracking
- Clear separation between core functionality and optional features
- Designed to scale _conceptually_ before scaling technically

---

## Core ideas

- **Privacy-first by default**  
  Short links should not automatically imply invasive tracking.

- **Developer-focused design**  
  Clean APIs, predictable behavior, and room for extension.

- **Pragmatic architecture**  
  Built to reflect real-world constraints, not tutorial simplicity.

---

## What’s implemented (and evolving)

- URL creation with deterministic and custom slugs
- Redirect handling with performance in mind
- Clear data model and API boundaries
- Foundation for optional features (analytics, QR codes, etc.)

> This project is actively evolving as I explore deeper architectural and product decisions.

---

## Tech stack (intentionally boring)

- TypeScript
- Node.js
- Modern backend tooling
- Storage chosen based on access patterns, not trends

Specific implementation details may change as the project evolves — the focus is on **decisions**, not tools.

---

## Design decisions

This section documents the _why_ behind the system — the trade-offs, not just the implementation.

### 1) Privacy-first defaults

**Decision:** Keep analytics optional and explicitly enabled, not on by default.  
**Why:** URL shorteners are frequently used as tracking infrastructure. Shrnk is intentionally different: predictable behavior and user trust first.  
**Trade-off:** Fewer “growth” features out of the box. More work to build analytics the right way.

### 2) Slug strategy: readable + collision-safe

**Decision:** Use short, URL-safe slugs (Base62) with a collision strategy, and support custom slugs with validation.  
**Why:** Short links must be compact and easy to share; custom slugs are a real user need.  
**Trade-off:** Requires careful uniqueness constraints + good error messages.

### 3) Separate _redirect path_ from _management API_

**Decision:** Treat redirects as a performance-critical path with strict latency goals, separate from link creation/management APIs.  
**Why:** Most traffic is redirects. Keeping this path lean makes scaling and caching much easier.  
**Trade-off:** Slightly more moving pieces and operational overhead.

### 4) Data model optimized for the read path

**Decision:** Model storage around fast lookups by `slug` and minimal redirect-time computation.  
**Why:** Redirect is the hot path; everything else is secondary.  
**Trade-off:** Some queries (reporting, backfills) become more complex.

### 5) Explicit boundaries for “optional modules”

**Decision:** Treat analytics, QR codes, and link-in-bio pages as modules layered on top of a stable core.  
**Why:** Keeps the core small and reliable while still allowing product expansion.  
**Trade-off:** Requires discipline to prevent “core” from becoming a dumping ground.

### 6) Opinionated API behavior

**Decision:** Prefer predictable, explicit API responses and error codes (e.g., slug taken, invalid URL, unsafe protocol).  
**Why:** Dev-focused product → developer ergonomics matters.  
**Trade-off:** More upfront work in validation and API design.

> If you're reviewing this repo for hiring/interview context: this project is intentionally designed to surface engineering judgment and real-world trade-offs.

---

## Status

Shrnk is an **active, evolving project** and part of my effort to rebuild my public work around production-style systems rather than isolated demos.

---

## Author

Built by Jason Michael  
Senior Frontend / Software Engineer

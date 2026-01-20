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
- Designed to scale *conceptually* before scaling technically

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

## Status

Shrnk is an **active, evolving project** and part of my effort to rebuild my public work around production-style systems rather than isolated demos.

---

## Author

Built by Jason Michael  
Senior Frontend / Software Engineer

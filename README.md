# shrnk

Monorepo for the shrnk project.

## Apps

- `apps/web`: Next.js App Router + TypeScript
- `apps/edge`: Go placeholder service

## Local infra

1. Start dependencies: `docker compose up -d`
2. Create `apps/web/.env` from `apps/web/.env.example`
3. Run migrations: `pnpm --filter web db:migrate`
4. Seed default domain: `pnpm --filter web db:seed`
5. Run the app: `pnpm --filter web dev`

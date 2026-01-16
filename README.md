# shrnk

Monorepo for the shrnk project.

## Apps

- `apps/web`: Next.js App Router + TypeScript
- `apps/edge`: Go placeholder service

## Local infra

1. Start dependencies: `docker compose up -d`
2. Run migrations: `pnpm --filter web db:migrate`
3. Run the app: `pnpm --filter web dev`

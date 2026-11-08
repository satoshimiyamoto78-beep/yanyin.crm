# Engineering conventions

## 1. Stack (ADR-001)
TypeScript (strict) · Next.js App Router · React Server Components by default, client components only for interactivity · Tailwind + shadcn/ui · Supabase (Postgres, Auth, Realtime, Storage) · Zod for all input validation · TanStack Query on the client where needed · Vitest (unit) + Playwright (e2e) · pnpm workspaces + Turborepo · ESLint + Prettier · Sentry.

## 2. Layout
See `docs/02-architecture.md` §5. Rules:
- `packages/domain` is **pure**: no DB, no fetch, no React. Formulas, state machines, quest evaluation, loyalty rules. 100% unit-tested.
- `packages/db` owns schema, migrations, RLS policies, generated types and seeds. Nobody writes SQL elsewhere except in migrations.
- Surfaces live in `apps/web/app/(core|hq|crew|kitchen|menu)/`. Shared UI lives in `packages/ui`.
- Server actions / route handlers are thin: validate (Zod) → authorize → call domain → persist → emit event.

## 3. Database rules
- `id uuid primary key default gen_random_uuid()`, plus `created_at timestamptz default now()` and `updated_at` on every table.
- Every tenant-owned table: `organization_id uuid not null references organizations(id)` with an index. Location-scoped tables also get `location_id`.
- **Money:** `bigint` minor units + `currency char(3)`. Never `float`/`numeric` for stored money. Quantities in stock: `numeric(14,4)` with an explicit `unit`.
- Ledgers are append-only: `stock_movements`, `payments`, `loyalty_ledger`, `xp_ledger`, `domain_events`. Balances are derived (views or materialized aggregates).
- Soft delete (`archived_at`) for menu items, ingredients and staff, because history must keep resolving.
- Snapshot prices and names into `order_items` at order time (menus change, history must not).
- Migrations are forward-only and reviewed; every migration that adds a table adds its RLS policies in the same file.

## 4. RLS pattern

```sql
alter table menu_items enable row level security;
alter table menu_items force row level security;

create policy "members read" on menu_items for select
  using (organization_id in (select private.user_org_ids()));

create policy "managers write" on menu_items for all
  using  (private.has_role(organization_id, array['owner','manager']))
  with check (private.has_role(organization_id, array['owner','manager']));
```
- Helper functions live in a `private` schema, are `security definer`, `stable`, and pin `set search_path = ''`.
- Wrap `auth.uid()` as `(select auth.uid())` inside helpers so Postgres caches it per statement.
- Application queries still filter by `organization_id` explicitly (helps the planner use indexes).
- Public guest menu: read through a dedicated view or RPC that exposes only published fields for a location slug, never the raw tables.
- **Every table gets an isolation test:** user of org A cannot select, insert, update or delete org B's rows.

## 5. Events
`domain_events(id, organization_id, location_id, type, actor_id, subject_type, subject_id, payload jsonb, occurred_at)`.
Types are dotted past tense: `order.placed`, `order_item.served`, `order.paid`, `order_item.voided`, `stock.counted`, `waste.logged`, `review.created`, `shift.started`, `quest.completed`, `loyalty.points_earned`.
Consumers: quest evaluator, analytics aggregates, Yan's daily report, notifications. Consumers must be idempotent (keyed on event id).

## 6. Realtime
- Use Supabase Realtime channels per location: `loc:{id}:kds`, `loc:{id}:floor`, `loc:{id}:waiter:{staffId}`.
- Clients treat realtime as a hint and re-fetch authoritative state; never trust a realtime payload for money.
- Crew and KDS keep an offline outbox (IndexedDB) of mutations with idempotency keys; replay on reconnect.

## 7. Integrations (adapters)
`packages/payments` and `packages/fiscal` expose one interface each, with a provider adapter per vendor:
```ts
interface PaymentProvider { createPayment(input): Promise<PaymentIntent>; handleWebhook(req): Promise<PaymentEvent>; refund(id, amount): Promise<void>; status(id): Promise<PaymentStatus> }
interface FiscalProvider  { registerReceipt(order): Promise<FiscalReceipt>; refundReceipt(receipt): Promise<FiscalReceipt>; closeShift(locationId): Promise<ZReport> }
```
Credentials are per location, stored encrypted. Each adapter gets a sandbox/mock implementation for tests and demos.

## 8. Quality bar
- `pnpm typecheck && pnpm lint && pnpm test` must pass before every commit; e2e for the critical path (QR → order → KDS → pay).
- Performance: guest menu LCP < 2 s on throttled 4G; JS for `(menu)` and `(kitchen)` routes kept small (no heavy chart libs there).
- Accessibility: keyboard and screen-reader usable in hq/core; contrast AA everywhere.
- Commit messages in English, imperative mood, and explain *why*.

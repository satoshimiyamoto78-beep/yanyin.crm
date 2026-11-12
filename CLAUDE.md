# yanyin.crm — project memory

yanyin.crm is a SaaS platform for HoReCa (restaurants, cafés, bars, hotels). It
combines POS, digital menu, stock, finance, staff and loyalty, and sets itself
apart with **fun**: game mechanics for staff (quests, XP, bonuses), playful
ordering for guests (Food Roulette and similar), and one AI assistant, **Yan**,
that runs through every role.

Pitch: *"The restaurant operating system your staff actually want to open."*

## Communication rules

- **Reply to the owner in Russian**, even when they write in English. Code,
  identifiers, commit messages and code comments stay in English.
- Product docs in `docs/` are written in Russian, keeping English technical terms
  where they are standard (MRR, KDS, food cost, RLS…).
- The owner is the founder and platform owner (the `yanyin.core` role). Give
  recommendations, not long lists of options.

## Before working on anything product-related

Load the project skill **`yanyin-product`** (`.claude/skills/yanyin-product/`).
It holds the HoReCa domain knowledge, SaaS rules, UX standards and engineering
conventions that every task in this repo follows.

## Product map (one platform, six surfaces)

| Surface | Who uses it | Form |
|---|---|---|
| `yanyin.core` | Platform owner (the founder) | Web super-admin |
| `yanyin.hq` | Venue owner and managers | Web console, mobile-first |
| `yanyin.crew` | Waiters, cooks, bartenders | PWA on a phone |
| `yanyin.kitchen` | Kitchen and bar | KDS on a wall tablet |
| `yanyin.menu` | Guests | PWA opened from a QR code, no install |
| `yanyin.engine` | Shared core | AI Yan, recommendations, realtime, payments |

Sub-brands: `yanyin.quest` (staff quests), `yanyin.club` (guest loyalty).
"yanyin.crm" is the wordmark; `.crm` is not a real TLD, so domains will be
something like `yanyin.app` (not decided yet, see `docs/04-decisions.md`).

## Key documents

- `docs/00-vision-brainstorm.md`: the founder's original feature list and the full brainstorm
- `docs/01-market-research.md`: competitors, Central Asia market, fiscal rules, payments, benchmarks
- `docs/02-architecture.md`: system tree, process chains, access levels, tech stack
- `docs/03-roadmap.md`: MVP scope and phased backlog
- `docs/04-decisions.md`: decision log (ADR) and open questions for the founder
- `docs/07-design-audit.md`: current guest design rules (v3): white, black, one blue #2F5BFF, Onest, no emoji, text category tabs, photo cards vs list rows (ADR-013)
- `docs/06-design-direction.md`: earlier design directions (history only)
- `packages/seed/src/*.menu.json`: real pilot menus (Samarkand, Zabey), used as demo and seed data
- `docs/08-roles-ids-checklists.md`: roles and stations (tickets go to a station, one person claims), staff @IDs and mentions, shift checklists, the bar/kitchen/admin screens
- `docs/05-pilot-vietnam.md`: first launch country (Vietnam, Da Nang), pilot venues Samarkand and Zabey, e-invoice and payments
- Interactive architecture scheme: https://claude.ai/artifact/SG8DvbBNPCJQNdibfwJ7WQ

## Where the project lives outside the repo

- **Notion** (task tracking, the founder's view of progress): project page
  https://app.notion.com/p/412e2f5cf96881a693cbcff41402d2ac with the «Задачи» database
  (data source `collection://6d0a817b-c956-49a0-b4f9-e2ffb25ef39b`). When you finish or
  start a roadmap task, update its status there. New tasks go into the same database.
  After every batch of work (not only roadmap tasks), update Notion before replying:
  task status, a short note of what changed, and the «Дизайн-система» page when a
  design rule changed.
- **Google Drive** folder `yanyin.crm` (id `1-TiMYVOR4wqbfOeQDRL0cHrOMLTt9Irn`): files,
  mockups, contracts and copies of key docs for the founder.
- The repo stays the source of truth for docs; Notion and Drive mirror it.

## One visual system

The founder approved the current look. Every new screen follows the canon in
`.claude/skills/yanyin-product/references/visual-system.md` (sky header,
illustrated scene cards, quick-action strip, widgets, island, motion rules).

The guest menu and the waiter app are one product. Shared visual building blocks
(header sky, theme, quick-action strip, notifications, loading blur, pages,
haptics, colour tokens) live in `apps/web/src/components/system/`,
`components/guest/motion.tsx` and `app/globals.css`. Change them there, never copy
them into one app, and check every visual change in both apps (light and dark).
Our theme uses `data-scheme` on `<html>`, not `data-theme` (the artifact viewer sets that).

## Default tech stack (decided, see ADR-001)

TypeScript everywhere · Next.js (App Router) + Tailwind + shadcn/ui · Supabase
(Postgres, Auth, Realtime, Storage) with Row Level Security for multi-tenancy ·
Claude API for Yan · pgvector · Vercel hosting · Sentry · GitHub Actions.
Monorepo layout is planned in `docs/02-architecture.md`.

## Git

Work on the branch the session gives you. Never push to `main` directly.

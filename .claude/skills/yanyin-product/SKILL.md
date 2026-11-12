---
name: yanyin-product
description: Full product-team skill for yanyin.crm, the gamified HoReCa SaaS platform (yanyin.core, yanyin.hq, yanyin.crew, yanyin.kitchen, yanyin.menu, AI assistant Yan). Use for ANY task in this repo — features, bugs, database schema, UI/UX, copy, pricing, roadmap, research, docs, prompts for Yan, or decisions. Triggers on mentions of yanyin, the CRM, the platform, restaurant/cafe/HoReCa features, menu, orders, KDS, stock, recipes (техкарты), food cost, staff, quests, XP, loyalty, guests, payments, fiscalization, dashboards, or "the product".
---

# yanyin.crm product skill

You are the whole product team for yanyin.crm: product manager, HoReCa domain
expert, SaaS architect, senior full-stack engineer, product designer, and AI
engineer. Every output should be good enough to ship to a real restaurant.

## 0. Ground rules

1. **Talk to the founder in Russian.** Code, identifiers, commits and code comments stay in English. Product docs in `docs/` are in Russian.
2. **Recommend, don't list.** The founder is not an engineer. Give one clear recommendation, the reason, and the trade-off.
3. **Read the docs before deciding:** `docs/02-architecture.md` (system), `docs/03-roadmap.md` (scope and phase), `docs/04-decisions.md` (ADRs and open questions). Never contradict an ADR silently: propose a new ADR instead.
4. **Stay in phase.** If a request belongs to a later roadmap phase, say so and either build the minimal version or confirm before expanding scope.
5. **Record decisions.** Any architectural or product decision you make goes into `docs/04-decisions.md` as a new ADR.

## 1. What makes yanyin different (protect this in every feature)

- **Fun for staff:** quests, XP, levels, badges, real rewards, all counted automatically from system events.
- **Fun for guests:** Food Roulette, Mystery Dish, Table Battle, Taste Quiz, scratch card.
- **One AI, Yan,** across every role, grounded in the venue's real data.
- **Modern UX** at Linear or Stripe quality, where competitors (iiko, r_keeper, Poster, Jowi) look like 2010.
- **Self-onboarding in one day,** where competitors need an integrator and weeks.

When designing any feature, ask: *how does this feed the game layer, the AI, or the
dashboards?* Every meaningful action emits a `domain_event`.

## 2. The six surfaces and their users

| Surface | User | Device and context | Design priority |
|---|---|---|---|
| `yanyin.core` | Founder, platform team | Desktop | Density, overview of all tenants, MRR, AI cost |
| `yanyin.hq` | Owner, manager | Desktop and phone, often remote | Clarity, insights, from anywhere |
| `yanyin.crew` | Waiter, cook, bartender | Own phone, standing, busy | Speed, big targets, one hand, motivation |
| `yanyin.kitchen` | Kitchen and bar | Wall tablet, often old Android, greasy hands, noise | Huge type, dark, glanceable, zero typing |
| `yanyin.menu` | Guest | Own phone via QR, 4G, no install | Appetite (photos), joy, < 2 s load |
| `yanyin.engine` | Everyone, invisibly | — | Reliability, realtime, cost control |

## 3. Reference files — load the one you need

| File | Load when working on |
|---|---|
| `references/horeca-domain.md` | Menu, orders, KDS, stock, recipes, food cost, finance, staff, loyalty, fiscal rules, payments in UZ/TJ, the glossary |
| `references/saas-platform.md` | Multi-tenancy, roles, billing, plans, feature flags, metrics (MRR, churn, NRR), yanyin.core |
| `references/engineering.md` | Code, schema, migrations, RLS, API, realtime, testing, folder layout, conventions |
| `references/visual-system.md` | **Any screen or visual change (load first): the approved yanyin look — sky, illustrated scene cards, strip, widgets, island, motion** |
| `references/ux-design.md` | Any UI: design tokens, per-surface rules, components, states, accessibility, i18n, copy |
| `references/game-and-ai.md` | Quests, XP, badges, rewards, guest games, recommendations, AI Yan prompts, tools and guardrails |

Market facts (competitors, laws, payment providers, benchmarks) live in
`docs/01-market-research.md`.

## 4. Definition of done (every task)

- [ ] Fits the current roadmap phase and doesn't break an ADR
- [ ] Tenant isolation: every new table has `organization_id` + RLS + an isolation test
- [ ] Money is in integer minor units with a currency code; no floats
- [ ] Roles and permissions are checked on the server, not only hidden in the UI
- [ ] Emits `domain_events` for meaningful actions (feeds quests, analytics, Yan)
- [ ] UI has loading, empty, error and offline states; works at 360 px width; ru/uz/tg/en strings via i18n
- [ ] Domain logic is in `packages/domain` with unit tests
- [ ] Docs updated if behaviour or decisions changed
- [ ] New screens follow `references/visual-system.md`
- [ ] Notion «Задачи» updated: task status set (or a new task added); design rule changes mirrored on the «Дизайн-система» page
- [ ] Summary to the founder in Russian: what changed, how to check it, what's next

# UX / UI standards

## 1. Brand feel

> **Guest UI rules live in `docs/07-design-audit.md` (ADR-013) and override everything below for yanyin.menu:** one platform look for every venue — white #FFFFFF, fills #F3F4F6, ink #0B0B0F, one blue #2F5BFF only for the primary action, Onest font, scale 28/22/17/15/13, no emoji or third-party 3D icons, Lucide line icons at 1.75, text category tabs (black active pill), photo dishes as 2-column cards, dishes without photos as list rows, one scrolling menu with sheets and a floating black cart. Venues bring logo, name, photos and copy only.

Playful but professional: "a game studio that understands restaurants". The architecture artifact sets the visual language: dark, high-contrast boards, one colour per surface, display font **Unbounded**, body **Manrope**, numbers and code in **JetBrains Mono**.

Surface colours (also used in charts, chips and navigation accents):
| Surface | Token | Hex |
|---|---|---|
| core | `--c-core` | #F2C14E (gold) |
| hq | `--c-hq` | #6AA8FF (blue) |
| crew | `--c-crew` | #B48CFF (violet) |
| kitchen | `--c-kitchen` | #FF8A4C (orange) |
| menu | `--c-menu` | #FF6B9A (pink) |
| engine / AI Yan | `--c-engine` | #4FD1C5 (teal) |

All colours are tokens on `:root` with light and dark variants; components never use raw hex. The guest menu is **white-label**: venue brand colour, logo and cover replace yanyin's palette.

## 2. Per-surface rules

**yanyin.menu (guest)**: image-first like Instagram; one thumb; sticky cart; the language switcher is always visible; prices with currency; allergen icons; games are one tap away and never block plain ordering; micro-animations at 60 fps; respect `prefers-reduced-motion`; LCP < 2 s on 4G.

**yanyin.crew (staff)**: touch targets ≥ 48 px; the main action reachable by thumb; three taps or fewer to add an item to a table's order; the quest progress bar is always visible; celebratory feedback (confetti, level-up sound, which the user can mute); works offline.

**yanyin.kitchen (KDS)**: dark by default; ticket text ≥ 20 px, readable from 2 m; colour by age (fresh → warning → late); bump with one big tap; no keyboard input ever; sound on a new ticket.

**yanyin.hq (manager)**: clean SaaS look like Linear or Stripe; a command palette (⌘K); Yan's chat one click away on every page; every dashboard number is clickable down to the underlying orders; tables with filters, saved views and CSV export; mobile layout for owners abroad.

**yanyin.core (founder)**: dense data tables, tenant search, health colours, MRR chart; impersonation clearly bannered.

## 3. Every screen must have
Loading (skeletons, not spinners, for content) · empty state with a next action ("Добавьте первое блюдо") · error state with retry · offline indicator (crew, kitchen, menu) · permission-denied state · works at 360 px · no horizontal page scroll.

## 4. Dashboards
- Lead with 3–5 KPI tiles: value, delta vs the previous period, sparkline.
- One question per chart. Time-series charts are line or area charts; for category ranking, use horizontal bars sorted by value.
- Show Yan's "insight of the day" at the top of hq home: one sentence plus one action.
- Use the `dataviz` skill when building charts.

## 5. Copy and i18n
- All strings through i18n keys (ru, uz, tg, en). No string concatenation; use ICU plurals (Russian has three plural forms).
- Tone: friendly and short, and "ты" for staff gamification ("Ещё 3 десерта до награды! 🔥"). For owners use formal-neutral; for guests use warm and appetising.
- Numbers: locale formatting; UZS without decimals; TJS with 2 decimals.
- Dates in the venue's timezone (Asia/Tashkent, Asia/Dushanbe), not the browser's.

## 6. Accessibility
WCAG AA contrast; focus rings visible; ARIA on custom controls (games, drag-and-drop); never rely on colour alone (KDS late tickets also show a timer and an icon).

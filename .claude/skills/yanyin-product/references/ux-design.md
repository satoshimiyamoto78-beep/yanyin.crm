# UX / UI standards

## 1. Brand feel

> **Read `docs/06-design-direction.md` first.** The guest app follows the founder's own guest-order design: one yanyin platform look (light #F1F2F5 background, white grouped cards, Inter, one accent per venue, floating pill bottom nav, home/menu/detail/cart/orders/about screens), white-labelled only by accent, mark, copy and photos — like every store on Grab or Yandex Eda. Earlier note, kept for staff/HQ: the guest side is warm, light and photo-first with an orange CTA (#FF6A1A); the staff, HQ and core side is a dark bento with a neon lime accent (#B8F35A) and violet for rewards, plus a light SaaS theme for HQ and core. Glassy 3D neon icons are for sections and rewards, Lucide line icons for actions. The per-surface colours below remain only as identification accents (charts, chips, navigation).

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

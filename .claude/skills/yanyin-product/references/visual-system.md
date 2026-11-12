# yanyin visual system — the current canon

The founder approved this look (November 2026, after `docs/07-design-audit.md`
sections 1–60). **Every new screen, in any surface, is built in this language.**
The history and reasons live in `docs/07-design-audit.md`; this file is the
short, current rule set. When the founder changes a rule, update this file too.

## 1. One product, one kit

- Guest menu (`yanyin.menu`) and waiter app (`yanyin.crew`) are one product. `yanyin.hq`, `yanyin.kitchen` and `yanyin.core` reuse the same kit.
- Shared building blocks live in `apps/web/src/components/system/` (Art, NorthSky, Strip, Widgets, PeekParts, SlideToConfirm, WheelPicker, ThemeToggle), `components/guest/motion.tsx` (Island, PeekCard, sheets, pages, loading blur) and `app/globals.css` (tokens). Extend them there; never copy a piece into one app.
- Check every visual change in both apps, light and dark. Theme switch is `data-scheme` on `<html>` (not `data-theme`).

## 2. Base

- Font **Onest**. Scale about 28 / 22 / 17 / 15 / 13; numbers big and semibold, labels small and muted.
- Tokens `--g-*` in `globals.css`. Light: white page, `--g-fill` #f4f5f8, ink #0b0b0f. Dark: page #0c0d10, cards #17191e.
- One brand blue **#2F5BFF** (dark #6c96ff) for the main action and the active state. Green, orange and red only for meaning (money in, waiting, late). **No violet or purple in the brand palette.** No emoji anywhere in the UI.
- Lots of air: 16 px side gutters, generous radii (cards 22–28 px, rows and badges fully round when they are a single line), no hard borders; separation by fill and soft shadow.

## 3. Header sky

- Top of every main screen: the `NorthSky` — soft blue northern-light gradient with slowly drifting white mist. It fades into the page with no band; never paint a solid colour under it.

## 4. Illustrations (the signature)

- One illustration kit: `components/system/Art.tsx`. Tones: blue, sunset, teal, green, coral, night. Each subject has its own drawing; **never repeat the same picture on two cards of one screen**, and never use rings or "generated-looking" ornaments.
- `ArtScene` — the main plaque: the card is filled by a soft, blurred, low-contrast scene; one small sharp subject; the title and the number sit **on one level to the right of the subject**; extra info goes in the footer. Dark mode: neutral #17191e with two soft tone glows, no muddy full tint.
- `ArtTile bare` — just the drawn subject, no tile behind it: the icon on quick-action cards and list leaders. **No square colour pads behind icons** (the founder rejected them).
- Line icons (Lucide, 1.75–2.2 stroke) only for small UI controls (back, close, chevrons, row meta).
- When a new section needs a picture, draw a new `SUBJECT` and add it to `ART`; don't reuse an unrelated one.

## 5. Patterns

- **Quick-action strip** (`Strip`): `StripBig` (scene card), `StripWide` (wide card with an ArtTile, title and sub), round edge fade. Guest: Start order, Waiter, Bill, Roulette, Half & half, Categories, Wi-Fi, Yan — all wide cards.
- **Dashboards** (`Widgets.tsx`): one question per card. `IconStat` / `HallCard` for a number, `InsightCard` for a timeline, after the Sales-history reference: plain card, title and number on top, thin round bars for the whole shift over a dashed grid with a short axis, past hours pale in the card colour, the picked hour solid with a bubble "hour · value", future grey; fits the width without scrolling; one line of facts; ⓘ explains, `LineWidget`, `BarsWidget`, `DaysCompareWidget`, `ActionListWidget` (fully round rows with a round badge and one action).
- **Island** (`motion.tsx`): Dynamic-Island-style notice at the top; can expand into details with one action; then it goes to Notifications. It lives in its own store and never re-renders the whole app.
- **Hold for a peek** (`PeekCard`), always centred. Full-screen pages slide in; sheets for short choices; `SlideToConfirm` for sending an order or taking a payment; `WheelPicker` for times.
- Guest dish lists: photo cards in the venue's `imageFormat` (landscape 4:3, portrait 3:4, square); dishes without photos as plain rows; the dish page shows the whole photo.

## 6. Motion and feel

- Native-app feel: no zoom, no text selection on controls, haptics on every meaningful tap, `press` scale on buttons, 60 fps.
- Morphing shapes (island pill ↔ card) always animate between explicit pixel width, height and radius, never from `auto` or `rounded-full`; the content inside keeps a fixed width.
- Decorations that move on their own (Yan's orb, idle wheel, aurora) pause while the page scrolls and while off screen (`AppFeel` + `.deco-off`, `html[data-scrolling]`); new ones go into the `DECO` list.
- Never a blocking (`passive: false`) touch or wheel listener on the document; zoom is blocked by CSS `touch-action`.
- Run `apps/web/scripts/stress-test.cjs` after big UI changes: zero page errors is the bar.
- Performance first: animate only `transform` and `opacity` (never `clip-path`, `filter: blur` or size for entrances); no `backdrop-blur` on full-screen dims, no blend modes on grain, `contain: paint` on scene cards, transitions for non-urgent state (`startTransition`). Respect `prefers-reduced-motion`.

## 7. Copy

- Short and human. Waiter app in RU / EN / VI via `tr()` keys (`components/crew/strings.ts`), guest via `ui()`. Money compact on cards (4.53M ₫), full in checks.

## 8. Every visual batch is done when

1. Built in the shared kit, checked light and dark in both apps, phone width.
2. `tsc` and `eslint` clean; demo rebuilt; screenshots reviewed.
3. A new section in `docs/07-design-audit.md`; this canon updated if a rule changed.
4. Committed and pushed; demo artifact republished.
5. **Notion updated**: the matching task in «Задачи» set to its status (new task if none), and the «Дизайн-система» page updated when a rule changed.
6. Reply to the founder in Russian, point by point.

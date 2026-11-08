# HoReCa domain knowledge

## 1. Glossary (EN / RU / meaning)

| Term | RU | Meaning |
|---|---|---|
| Front of house (FOH) | Зал | Guest-facing: hosts, waiters, bar |
| Back of house (BOH) | Кухня, склад | Kitchen, prep, storage, dishwashing |
| Cover | Гость / куверт | One guest served; "120 covers" = 120 guests |
| Check / bill | Чек / счёт | A table's order total |
| Average check | Средний чек | Revenue ÷ number of checks (also per guest: revenue ÷ covers) |
| Table turn | Оборачиваемость стола | How many seatings a table gets per service |
| RevPASH | Выручка на место-час | Revenue ÷ (seats × open hours) |
| Ticket | Тикет | Order sent to kitchen; shown on KDS |
| KDS | Кухонный экран | Kitchen display system replacing paper tickets |
| Course / fire | Подача / «отдать» | Courses are held and "fired" when the waiter says |
| 86 / 86'd | Стоп-лист | Item unavailable; must disappear from the guest menu instantly |
| Modifier | Модификатор | Option on an item: size, extra cheese, no onion, doneness |
| Comp | Комплимент | Item given free (still costs stock; must be logged with a reason) |
| Void | Отмена позиции | Item removed after sending; a classic fraud vector, so watch void patterns |
| Discount | Скидка | Price reduction; needs a reason and permission |
| Recipe card / tech card | Техкарта / ТТК | Ingredients, gross/net grams, yield, steps, photo |
| Gross / net weight | Брутто / нетто | Before / after cleaning; waste % = (gross − net) ÷ gross |
| Yield | Выход | Final portion weight |
| Semi-finished (prep) | Полуфабрикат (п/ф) | A recipe used inside other recipes (sauce, dough); recipes are recursive |
| Par level | Минимальный остаток | Stock level that triggers a reorder |
| FIFO | FIFO | First in, first out; use the oldest stock first |
| Stock count | Инвентаризация | Physical count compared to the system's theoretical stock |
| Variance | Расхождение | Theoretical − actual; reveals waste, theft or bad recipes |
| Waste log | Журнал списаний | Spoiled, dropped, staff meal, comp, with reason and cost |
| Purchase order (PO) | Заявка поставщику | Order to a supplier; on receipt it becomes a stock-in (приход) |
| Shift | Смена | Work period; cash drawer opened/closed per shift |
| Z-report | Z-отчёт | End-of-day fiscal close of the cash register |
| Fiscal receipt | Фискальный чек | Receipt registered with the tax authority via the fiscal data operator |
| OFD | ОФД | Fiscal data operator that relays receipts to the tax authority |
| IKPU (UZ) | ИКПУ | Uzbek product/service classification code required on fiscal receipts |
| Tip | Чаевые | Must be tracked per staff member and kept apart from revenue |
| Service charge | Обслуживание | % added to the bill (e.g. 10–15% in Central Asia); counts as revenue |

## 2. Core formulas (implement these in `packages/domain`)

```
dish_cost            = Σ (ingredient_net_qty / (1 − waste_pct) × ingredient_unit_cost)   // recursive for preps
food_cost_pct        = dish_cost / net_price            // net of VAT; target 25–35%
contribution_margin  = net_price − dish_cost            // per item
theoretical_usage    = Σ sold_qty × recipe_qty          // per ingredient, per period
actual_usage         = opening_stock + purchases − closing_stock
variance             = actual_usage − theoretical_usage // > 0 means loss
variance_pct         = variance / theoretical_usage     // alert above ~2–3%
labor_cost_pct       = labor_cost / revenue             // target 25–35%
prime_cost           = COGS + labor_cost                // target ≤ 60–65% of revenue
gross_profit         = revenue − COGS
avg_check            = revenue / checks
revpash              = revenue / (seats × open_hours)
reorder_qty          = max(0, par_level − on_hand − on_order)
```

### Menu engineering (Kasavana & Smith)
For one category and one period, with N items:
- **Popularity threshold** = (1 / N) × 70% of total units sold in the category.
- **Margin threshold** = the category's weighted average contribution margin.

| | High margin | Low margin |
|---|---|---|
| **High popularity** | ⭐ Star: keep, feature, protect quality | 🐴 Plowhorse: raise price carefully, cut portion cost |
| **Low popularity** | 🧩 Puzzle: reposition, rename, promote, get Yan to suggest it | 🐶 Dog: remove or rework |

## 3. Order lifecycle (state machine)

```
draft → placed → accepted → (per item: queued → cooking → ready → served)
      → bill_requested → paid (fully | partially) → fiscalized → closed
side branches: item.voided (reason + permission), order.cancelled, order.comped, refund
```
Rules:
- A table can hold one open order with items from several guests (shared bill) and supports splitting by item, by guest or by equal parts.
- Item-level status drives the KDS; order-level status drives the floor map.
- Stock is deducted when an item is **accepted by the kitchen** (configurable: or on payment). Voids after cooking still log waste.
- Every money change creates an immutable ledger row; nothing is edited in place.
- **Offline:** crew and KDS must queue actions locally and sync when the connection returns (idempotency keys on every mutation).

## 4. Roles and permissions (default)

| Role | Key permissions |
|---|---|
| Platform owner / platform staff | Everything across tenants (yanyin.core); impersonation is logged |
| Org owner | Everything in the organization, billing, delete |
| Manager | Menu, stock, staff, quests, reports, discounts, voids |
| Location manager | Same, but limited to their locations |
| Waiter | Own tables and orders, request discount/void (needs approval) |
| Cook / bartender | KDS, recipe cards, waste log, stop-list |
| Host | Floor map, seating, reservations |
| Accountant | Finance read, exports |
| Guest | Public menu, own orders, own loyalty profile |

## 5. Central Asia specifics

- **Currencies:** UZS (Uzbek so'm; no minor units in practice, but still store integers), TJS (somoni, 100 diram). Multi-currency menus for tourist areas.
- **Languages:** ru (lingua franca of business), uz (Latin script official; Cyrillic still common), tg (Cyrillic), en (tourists). Menu items need per-language names and descriptions.
- **Payments:** UZ uses Payme, Click, Uzum, Paynet and Uzcard/Humo cards. TJ uses Korti Milli, Alif, DC and the national QR standard. Plus cash, which is still very common, so cash handling and the cash drawer matter.
- **Fiscalization is mandatory** in both countries (UZ: online kassa → OFD → soliq.uz, IKPU codes, PKCS#7 signing. TJ: Resolution 638 of 22.11.2025, OFD, heavy fines). Integrate through virtual-kassa providers (ADR-004).
- **VAT:** TJ 14% for non-cash. UZ has VAT cashback programmes for HoReCa, which is a selling point for transparent fiscal sales.
- **Service charge** of 10–15% is common; show it explicitly on the guest bill.
- **Culture:** large group tables, shared dishes (plov, kebabs, salads for the table), tea service, long celebrations (тои). Table Battle and shared-bill flows fit this well. Halal flags are needed; alcohol may be absent in many venues.
- **Hardware:** cheap Android tablets and phones, unstable Wi-Fi, so keep bundles light and offline-tolerant.

## 6. What restaurant owners actually care about (sell on these)

1. Theft and leakage: voids, comps, cash, stock variance
2. Food cost creeping up when supplier prices change
3. Staff turnover and lazy service
4. Knowing what's happening when they are not in the venue
5. Tax compliance without pain
6. More repeat guests

## 7. Vietnam country pack (first launch: Da Nang pilots, see `docs/05-pilot-vietnam.md`)

- **Pilots:** Samarkand (Central Asian restaurant) and Zabey (shisha lounge), mostly foreign guests.
- **Guest languages:** en, ru, ko, zh, vi. **Currency:** VND (no minor units in practice), with an optional "≈" display in the guest's currency.
- **E-invoice:** cash-register (POS) e-invoices to the GDT are mandatory for F&B (Decree 70/2025; possibly superseded by Decree 254/2026 and Circular 91/2026, to be verified). Integrate through a licensed e-invoice provider via `packages/fiscal`.
- **Payments:** VietQR (NAPAS) dynamic QR first, then MoMo, ZaloPay, VNPay, plus card terminals and cash.
- **Shisha lounge specifics:** a hookah is a menu item with modifiers (tobacco, mix, strength, bowl); a "change coals" guest call; timed sessions; 18+ confirmation; dark night-mode UI.
- **Hardware (ADR-012):** ESC/POS printers (LAN/USB/BT), built-in printers on Sunmi/iMin Android POS, a cash drawer through the printer, KDS tablets. Access goes through the Capacitor app or yanyin Bridge, behind `packages/devices`.

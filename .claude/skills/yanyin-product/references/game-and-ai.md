# Game layer and AI Yan

## 1. Staff quests (yanyin.quest)

**Quest definition**
```ts
type Quest = {
  title: string; description: string;
  metric: 'items_sold' | 'category_sold' | 'avg_check' | 'upsell_rate' | 'reviews_5star'
        | 'orders_served' | 'ticket_time_avg' | 'waste_cost' | 'shifts_on_time' | 'custom_event_count';
  filter?: { categoryIds?: string[]; itemIds?: string[]; roles?: Role[]; locationIds?: string[] };
  target: number; comparator: 'gte' | 'lte';
  window: { startsAt: Date; endsAt: Date } | { recurring: 'shift' | 'day' | 'week' };
  mode: 'solo' | 'team' | 'race';       // race = first N to finish win
  reward: { xp: number; money?: Money; perk?: string; badgeId?: string };
  maxParticipants?: number; requiresOptIn: boolean;
};
```
- Progress is evaluated **only** from `domain_events` (ADR-005), in `packages/domain/quests` as a pure function `evaluate(quest, events) → progress`.
- Money rewards create `payroll_items` when the quest completes and need manager approval before payout.
- Templates come from the global library: "Sell 15 desserts this shift", "Zero waste on the bar this week", "Average check +10% vs last week", "5 five-star reviews", "Team boss fight: weekly revenue target".

**XP and levels**: XP is an append-only ledger. Levels: Rookie → Pro → Master → Legend, with the curve `xp_for_level(n) = 100 × n^1.5`. Perks unlock by level (shift preference, bigger bonus multiplier).

**Badges**: Upsell King, Speed Demon, Guest Favorite, Zero Waste Hero, Night Owl, Perfect Week.

**Guardrails (learned from the research)**
- Real rewards beat virtual ones; combine both.
- Team quests matter where turnover is high.
- Leaderboards can be switched off per venue and are never shown to guests.
- No punishment mechanics, no public shaming, and quests never push staff to oversell to guests against their interest (no "sell X to every table").
- Built-in impact analytics: upsell rate, average check, turnover and review score before and after quests are enabled. This is our sales proof.

## 2. Guest games (yanyin.menu)

| Game | Mechanic | Business purpose |
|---|---|---|
| **Food Roulette** | Budget + mood (hungry / light / adventurous) + group size → spin → a full set (main + side + drink) within budget | Faster decisions, higher check, push Puzzles and high-margin items |
| **Mystery Dish** | Chef's surprise at a discount, revealed after ordering | Uses stock that is near expiry |
| **Table Battle** | Slot machine assigns who orders what / who pays | Fun for groups, fits Central Asian group dining |
| **Taste Quiz** | Five swipe questions → matched dish | Onboarding for new guests and tourists |
| **Scratch card** | After payment: chance of a dessert or points next visit | Return visits, loyalty sign-up |

Rules: games always respect allergies, halal and dietary filters, the stop-list and the budget. Odds for prize games are configured by the manager, with a cost cap per day. Never fake randomness that is promised as random. Respect local rules on lotteries: prizes are discounts/points, never cash.

**Recommendation scoring (v1, rules-based)**
```
score = w1·relevance(context, guest_prefs) + w2·popularity + w3·margin_norm
      + w4·stock_pressure(expiring) − penalty(allergen/diet/stop-list = −∞)
```
Context: time of day, weather, group size, what's already in the cart. Later this moves to collaborative filtering ("guests who ordered X also loved Y").

## 3. AI Yan

**One persona, three modes.**
| Mode | Audience | Tone | Can do |
|---|---|---|---|
| Guest | Guests in yanyin.menu | Warm, appetising, in the guest's language | Explain dishes, recommend, pair drinks, filter allergens, add to cart (with confirmation) |
| Crew | Staff | Short, practical, "ты" | Recipe card lookup, upsell tip for this table, quest status |
| Manager | Owner / manager | Analytical, concise, actionable | Answer data questions, daily report, pricing / menu engineering advice, forecasts, draft menu copy |

**Architecture**
- Claude API with **tool use**. Yan never sees raw SQL access. Tools are typed, tenant-scoped server functions: `get_menu`, `get_item_details`, `search_menu(semantic)`, `get_sales(period, groupBy)`, `get_stock_levels`, `get_food_cost(itemId)`, `get_staff_kpis`, `get_quests`, `add_to_cart` (guest, needs confirmation).
- The organization and location are injected server-side from the session; the model can never choose a tenant.
- pgvector embeddings of menu items and recipes for semantic search.
- Use the `claude-api` skill for current model IDs, prompt caching and tool-use patterns. Cache the static system prompt and the menu context.

**Guardrails**
- **Allergies are safety-critical:** Yan must answer only from structured allergen data, say clearly when data is missing, and advise the guest to confirm with staff. It never guesses.
- Yan never invents prices, dishes or numbers; everything comes from tools.
- Yan never reveals other staff's earnings or other tenants' data; tools enforce this, the prompt is not the security layer.
- Per-organization monthly AI budget (entitlement) with graceful degradation: Yan says it's unavailable rather than failing.
- Log every conversation's token usage to `ai_usage` for yanyin.core.

**Daily report (manager mode)**: every morning in the venue's timezone, built from yesterday's aggregates. Structure: headline (one sentence), three numbers vs the same weekday last week, what's off (variance, voids, late tickets), one recommended action, quest highlights. Delivered in hq and by Telegram.

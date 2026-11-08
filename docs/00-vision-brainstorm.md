# yanyin.crm: исходное видение и брейншторм

> Перенесено из чата «Digital menu platform brainstorm» (8 ноября 2026). Текст брейншторма сохранён без изменений, на английском, как в оригинале.

## 1. Исходный запрос основателя

Brain Storm for the digital menu platform

Main idea; It is a fully fun CRM system for horeca

some details about functions: 

* Ai assiten for customer and the management
* Digital Menu 
* order from phone customer and stuff 
* finance analitics 
* stock 
* stock calculations 
* stuff list 
* loyalty program for the customers 
* full menu editions 
* online access from anywhere of the world for the management 
* metrics and analitics 
* dashboards for all sections 
* full professional modern ux/ui 
* stock check up 
* food and drinks recipy database 
* menu categories and filters. 
* personal page of the stuff with metrics and income and dashboard 
* motivational and bonus program for stuff 
* kvest program for the stuff like in the game. management can put terms and the time... and prize in the app and the stuff can take the quest and go with fullfilling 
* algorithms for the advising the food 
* food order randomized for customers with game flow type

---

## 2. Брейншторм


### 1. The core idea

Most restaurant software (POS, stock, HR) is dull, and staff only use it because they have to. Your edge is **fun**: game mechanics for staff, playful ordering for guests, and an AI layer that runs through everything.

**One-line pitch:** *"The restaurant operating system your staff actually want to open."*

A few name directions: **Plat·Play**, **Kitchn Quest**, **Tablo**, **MenuVerse**, **Servd**, **HoReQuest**.

---

### 2. Four apps on one platform

| App | User | Device | Purpose |
|---|---|---|---|
| **Guest App** | Customers | Phone, by scanning a QR code at the table. No install needed. | Menu, ordering, games, loyalty |
| **Staff App** | Waiters, cooks, bartenders | Phone or tablet | Orders, quests, their own stats, bonuses |
| **Manager Console** | Owner and managers | Web, from anywhere | Dashboards, finance, stock, menu, staff |
| **Kitchen/Bar Display (KDS)** | Kitchen and bar | Wall tablet | Live order queue, prep timers |

All four share one backend and one database, and update each other in real time.

---

### 3. Modules in detail

#### 🍽 A. Digital menu and ordering
- **Menu editor:** drag-and-drop categories, photos and videos, variants (size, add-ons), allergens, calories, multiple languages and currencies.
- **Smart filters:** vegan, gluten-free, spicy level, under 500 kcal, "kid-friendly", "pairs with wine".
- **Time-based menus:** breakfast, lunch, happy hour and dinner switch automatically.
- **"86" button:** when an item runs out, it disappears from the guest menu immediately. This is linked to stock.
- **Ordering flows:** guests order from their phone at the table, waiters order from their phone, or both on one shared table bill.
- **Split bill, tips and pay at the table**, with integrations for Stripe, Apple Pay, Google Pay and local payment providers.
- **Call waiter / ask for the bill** buttons, which push to the waiter's phone.

#### 🎲 B. Game-style ordering for guests (your stand-out feature)
- **Food Roulette:** set a budget and a mood (hungry, light, adventurous) and spin. It picks a full meal that fits the budget.
- **Mystery Dish:** a discounted "surprise" dish the chef chooses. It's also good for using up stock that is about to expire.
- **Table Battle:** each guest at a group table spins, and the slot machine assigns who orders what.
- **Taste Quiz:** five swipe questions ("crispy or creamy?") lead to a matched dish.
- **Tasting Path:** a progress map where you "unlock" a dish after trying related ones, building toward a badge.
- **Scratch card after payment:** a chance to win a dessert or points on the next visit.

#### 🤖 C. AI assistants
**For guests**
- A chat sommelier or waiter: "What's good with steak under $20?", allergy-safe suggestions, works in any language.
- Explains dishes, ingredients and their origin.

**For management**
- Questions in plain language: "Why did profit drop last Tuesday?", "Which dishes should I remove?", "How much salmon do I need for Saturday?"
- Automatic insights each morning: a short daily report on what happened, what's off, and what to do.
- Help with menu engineering: pricing suggestions and copy that sells.
- Demand forecasts based on the weather, holidays, local events and history.

**For staff**
- "How do I make the house Negroni?" brings up the recipe card instantly.
- Upselling tips for the current table.

#### 🧠 D. Recommendation algorithms
- **Collaborative filtering:** "Guests who ordered X also loved Y."
- **Context:** time of day, weather, group size, past orders from the loyalty profile.
- **Margin-aware:** among equally good matches, prefer dishes with higher profit.
- **Stock-aware:** push dishes whose ingredients expire soon.
- **Menu engineering matrix:** sorts dishes into Stars, Plowhorses, Puzzles and Dogs, with automatic advice for each.

#### 📦 E. Stock and recipes
- **Recipe database:** each dish breaks down into ingredients, grams, yield, waste % and prep steps (with photo or video).
- **Automatic stock deduction:** each sale subtracts the recipe's ingredients in real time.
- **Food cost per dish**, recalculated whenever a supplier's price changes.
- **Stock check flow:** count with a phone (barcode or photo). The system shows expected vs actual and the variance, which highlights theft or waste.
- **Low-stock alerts and automatic purchase orders** to suppliers.
- **Expiry tracking:** first in, first out (FIFO), plus links to Mystery Dish and AI-promoted dishes.
- **Waste log:** reason codes (spoiled, dropped, comp'd) and their cost.
- **Multi-location:** a central kitchen and branches, with transfers between them.

#### 💰 F. Finance and analytics
- Revenue, costs, gross margin, P&L by day, week or month.
- Food cost %, labor cost %, prime cost.
- Average check, table turnover, revenue per seat-hour.
- Payment method split, tips, discounts and voids (with alerts for suspicious void patterns).
- Comparisons by branch, shift and waiter.
- Exports for accountants, plus tax and fiscal integrations by country.

#### 👥 G. Staff management
- **Staff list:** roles, contracts, documents, certifications (e.g. a food safety certificate with an expiry reminder).
- **Shift scheduling** with drag and drop, and clock in/out by QR code or geofence.
- **Each staff member's personal page:**
  - Earnings (salary, tips and bonuses), live and projected
  - KPIs: sales, average check, upsell rate, guest ratings, speed
  - XP level, badges, active quests
  - Personal dashboard with goals ("you're $120 from your monthly bonus")
- Permissions by role: owner, manager, chef, waiter, bartender, host.

#### 🏆 H. Quests, motivation and bonuses (the game layer)
- **Quest builder for managers:**
  - Condition: "Sell 15 desserts", "Get 5 five-star reviews", "Zero waste on the bar this week"
  - Time window: a shift, a day, a week, or custom
  - Reward: cash, XP, a day off, a gift, a better shift
  - Type: solo, team, or competitive (first to complete wins)
- **Staff choose quests** from a quest board, see a progress bar, and get a celebration animation when they finish.
- **XP and levels:** Rookie → Pro → Master → Legend. Higher levels unlock perks.
- **Leaderboards:** daily, weekly, by role. These can be switched off to avoid toxic competition.
- **Badges:** "Upsell King", "Speed Demon", "Guest Favorite", "Zero Waste Hero".
- **Automatic tracking:** progress counts from real POS data, so there's no cheating and no manual checking.
- **Team boss fight:** a big weekly team goal, such as a revenue target. If the team hits it, everyone gets a reward.
- **Peer kudos:** staff give each other points.

#### 💎 I. Guest loyalty
- Points, cashback, or a stamp card, whichever the venue chooses.
- **Tiers:** Bronze, Silver, Gold, VIP, with perks per tier.
- Guest profile with visit history, favorite dishes, allergies and birthday. The waiter sees it when the guest checks in.
- Automatic campaigns: a birthday gift, a "we miss you" message after 30 days, a reward on the 10th visit.
- Referral codes, and guest challenges ("try all 5 burgers").
- Apple Wallet and Google Wallet cards, so guests don't need to install an app.

#### 📊 J. Dashboards (one per module)
- **Owner home:** today's revenue, live tables, alerts, AI insight of the day.
- **Live floor map:** tables colored by status (ordering, eating, waiting for the bill, too long).
- **Kitchen:** queue, average prep time, late orders.
- **Stock, Finance, Staff, Loyalty, Menu performance:** each has its own dashboard.
- Mobile-first, so an owner abroad can check everything from their phone.

---

### 4. UX/UI principles
- **Guest side:** a bold, image-led menu (Instagram-like), one-thumb use, playful micro-animations, loads in under 2 seconds on 4G.
- **Staff side:** big touch targets, dark mode for the kitchen, works with greasy fingers, game-style rewards (confetti, level-up sounds).
- **Manager side:** a clean SaaS look (Linear or Stripe style), command palette, and an AI chat always one click away.
- **Offline mode:** orders must keep working when the Wi-Fi drops, then sync afterwards. This is critical in HoReCa.
- **White-label:** each venue's own branding, colors and logo on the guest side.

---

### 5. Suggested tech stack
| Layer | Option |
|---|---|
| Frontend | Next.js + React, Tailwind, shadcn/ui; PWA for guest and staff |
| Mobile (later) | React Native / Expo |
| Backend | Node (NestJS) or Supabase / Postgres |
| Real-time | WebSockets / Supabase Realtime (orders, KDS, floor map) |
| AI | Claude API (assistants, insights, natural-language analytics) + pgvector for menu search |
| Recommendations | Rules + collaborative filtering at first, ML later |
| Payments | Stripe + local providers |
| Analytics | Postgres + ClickHouse or Tinybird at scale |
| Hosting | Vercel + managed Postgres |

**Core data entities:** Venue, Location, Table, MenuItem, Category, Recipe, Ingredient, StockMovement, Supplier, Order, OrderItem, Payment, Guest, LoyaltyAccount, Staff, Shift, Quest, QuestProgress, Reward, Badge.

---

### 6. MVP roadmap

**Phase 1: MVP (≈3 months).** Get guests ordering and showcase the fun.
- QR digital menu and editor, ordering from guest and staff phones, KDS
- Basic stock with recipe-based deduction
- Basic dashboard (sales, top dishes)
- **Food Roulette** and **staff quests v1** (the differentiators, so include them from day one)

**Phase 2: Operate (months 4–6)**
- Stock checks, suppliers, food cost, finance and P&L
- Staff pages, shifts, bonuses, XP and badges
- Loyalty v1

**Phase 3: Intelligence (months 7–9)**
- AI assistant for guests and management, daily AI report
- Recommendation engine, menu engineering, demand forecasting

**Phase 4: Scale**
- Multiple locations and franchises, marketplace integrations (delivery apps), open API

---

### 7. Business model
- **SaaS tiers:** Starter (menu + orders) → Pro (stock, staff, loyalty) → Ultimate (AI, multiple locations)
- Per-location monthly fee, plus optional transaction fees on payments
- Add-ons: AI credits, extra locations, white-label guest app
- **Free tier:** digital menu only, as the entry point that leads to upgrades

---

### 8. Risks to plan for
- **POS and fiscal compliance** differs by country. Decide early whether to integrate with existing POS systems or replace them.
- **Gamification can backfire** if quests feel like surveillance. Keep them optional, positive and transparent.
- **Rough edges at launch:** stock accuracy depends on clean recipes, so build onboarding and recipe templates.
- **Hardware variety:** old Android tablets in kitchens, so the platform must be light.

---

### 9. Extra ideas to consider
- 🎤 **Voice orders** for staff ("Table 4, two Margheritas, no basil")
- 📸 **Snap & count:** photograph a shelf and the AI counts the stock
- 🌍 **Tourist mode:** automatic translation plus "what is this dish?" explanations with photos
- 🎉 **Event mode:** a special menu, pre-orders and a table timer for parties
- ⭐ **Review booster:** after a happy payment, prompt the guest to leave a Google review, linked to staff quests
- 🧾 **Supplier price watch:** the AI flags when an ingredient's price jumps

---

## 3. Название и бренд-структура

**yanyin.crm** is a good choice: it's short, memorable, and the `.crm` style makes the category obvious. Here's how the name could carry through the product.

### Brand structure

| Product | Name |
|---|---|
| Platform | **yanyin.crm** |
| Guest app (QR menu) | **yanyin.menu** |
| Staff app | **yanyin.crew** |
| Manager console | **yanyin.hq** |
| Kitchen display | **yanyin.kitchen** |
| AI assistant | **Yan**, a single AI character for guests, staff and managers |
| Quest system | **yanyin.quest** |
| Loyalty program | **yanyin.club** |

Naming every module with the same dot pattern makes it read as one ecosystem. It also gives you natural subdomains, such as `menu.yanyin.app` and `hq.yanyin.app`.

### Tagline ideas
- *"Run your restaurant like a game."*
- *"The fun side of HoReCa."*
- *"Serve. Play. Grow."*
- *"Where guests play and staff level up."*

### Things to check
- **Domains:** `.crm` isn't a real top-level domain, so keep "yanyin.crm" as the brand wordmark. Register something like `yanyin.app`, `yanyincrm.com` or `yanyin.io`.
- **Meaning:** if "Yanyin" comes from a word in another language, the meaning could become your brand story.
- **Trademark and app store search** before you commit to the name.

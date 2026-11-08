# SaaS platform knowledge (yanyin.core)

## 1. Tenancy model

```
Platform (yanyin)
└── Organization  ← tenant, billing entity, legal entity (INN/STIR)
    ├── Membership (user × org × role [× locations])
    ├── Subscription → Plan → Feature entitlements
    └── Location (branch)  ← fiscal settings, payment accounts, tables, stock
```
- One user can belong to several organizations (a manager working for two venues). The active org is chosen at login and stored in the session.
- Guests are **not** members. A guest profile is per organization (loyalty is per brand), linked by phone.
- Platform staff access tenants only through audited **impersonation** with a reason.

## 2. Plans and entitlements

- Plans: Free → Starter → Pro → Ultimate (see `docs/03-roadmap.md`). Price is **per location per month**.
- Never hard-code `if plan === 'pro'`. Use **entitlements**: `can(org, 'quests.create')`, plus limits such as `limit(org, 'locations')` and `limit(org, 'ai_credits_month')`.
- Entitlements resolve as: plan defaults → org overrides (set in yanyin.core) → feature flags (rollouts).
- Downgrading never deletes data. Features become read-only or hidden.
- Trial: 14 days of Pro. At the end, the account falls back to Free, not lockout, so guests' QR menus keep working.

## 3. Billing

- Subscription invoices in local currency through local providers; Stripe for foreign clients.
- Dunning: reminder on day 0/3/7, then read-only at day 14, but **never break the guest menu or open orders** mid-service.
- Revenue streams to track separately: subscription, payment take-rate, AI credits, add-ons (extra locations, white-label).

## 4. Metrics the founder sees in yanyin.core

| Metric | Definition |
|---|---|
| MRR / ARR | Sum of active subscription monthly value / ×12 |
| New / expansion / contraction / churned MRR | MRR movement by cause |
| Logo churn % | Orgs lost in the month ÷ orgs at month start |
| NRR | (Start MRR + expansion − contraction − churn) ÷ start MRR, cohort-based; Toast benchmark ≈ 109% |
| GMV | Total order value processed through yanyin |
| Take rate | Payment revenue ÷ online-paid GMV (Toast ≈ 0.48%) |
| Activation | % of new orgs that reach the "first real order paid" milestone within 7 days |
| Active locations | Locations with ≥ 1 paid order in the last 7 days |
| AI cost per org | Model tokens × price, compared against that org's AI entitlement |
| Health score | Combination of activity, staff logins, quest participation, tickets, payment failures; drives churn alerts |

Benchmarks to plan against: SMB restaurant annual churn of 25–40%, mostly from closures (low confidence). Expansion (locations, payments) is the main way to keep NRR above 100%.

## 5. Onboarding (goal: first order on day one)

1. Sign up with a phone number → create the org and first location
2. Menu import: upload photos of the paper menu, an Excel file, or a link, and Yan parses it into categories and items (with review)
3. Choose recipe and quest templates from the global library
4. Add tables → print the QR PDF
5. Invite staff by phone or link
6. Connect payments and fiscalization (can be done later; cash first)
7. "Test order" walkthrough
Track each step as an activation funnel in yanyin.core.

## 6. Platform features checklist

Audit log (who, what, when, before/after) · impersonation with a reason · feature flags · global libraries (recipes, menu templates, quests, badges) · support tickets and in-app chat · status page and health checks · backups and point-in-time recovery · data export per tenant (owners own their data) · GDPR-style deletion on request · per-tenant rate limits · usage metering (orders, AI tokens, SMS).

## 7. Security baseline

- RLS on every tenant table; the service-role key is used only in server code and never shipped to clients.
- Server-side permission check on every mutation (the UI hiding a button is not security).
- PII (guest phones, staff documents) encrypted at rest; minimum retention; masked in logs.
- Secrets in environment variables only. Webhooks verified (signature / basic auth per provider). Idempotency keys on payment callbacks.
- Check data-localization laws in UZ/TJ before choosing a hosting region (open question Q8).

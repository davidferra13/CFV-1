# External Directory Gap Analysis: Manual + Programmatic Access

> Every input/output point in ChefFlow must be accessible both manually (UI settings) and programmatically (API/automation). This document maps what exists, what's missing, and what to build.

---

## Executive Summary

ChefFlow has **deep manual controls** (40+ settings pages, 105 dashboard widgets, configurable automations) but **almost zero programmatic access**. The public REST API has only 2 read-only endpoints. Hundreds of server actions that power the UI have no external-facing API equivalent.

Simultaneously, several critical business parameters (pricing rates, holiday premiums, deposit percentages, notification tiers) are **hardcoded in constants files** with no UI settings page, meaning neither manual nor programmatic configuration exists.

---

## Gap Categories

### Category A: No Manual Control AND No Programmatic Access (Hardcoded)

These parameters are baked into `constants.ts` files. Changing them requires a code deploy.

| Parameter                        | Current Value                       | File                                 | Impact                               |
| -------------------------------- | ----------------------------------- | ------------------------------------ | ------------------------------------ |
| Base couples rate (1-2 guests)   | $200-$300/person                    | `lib/pricing/constants.ts`           | Every quote for small parties        |
| Base group rate (3+)             | $155-$215/person                    | `lib/pricing/constants.ts`           | Every quote for groups               |
| Weekly standard rate             | $400-$500/day                       | `lib/pricing/constants.ts`           | Weekly service pricing               |
| Weekly commitment rate (5+ days) | $300-$350/day                       | `lib/pricing/constants.ts`           | Long-term client pricing             |
| Pizza experience rate            | $150/person                         | `lib/pricing/constants.ts`           | Specialty event pricing              |
| Global deposit percentage        | 50%                                 | `lib/pricing/constants.ts`           | Every quote deposit                  |
| Minimum booking floor            | $300                                | `lib/pricing/constants.ts`           | Quote minimum enforcement            |
| Balance due window               | 24 hours before                     | `lib/pricing/constants.ts`           | Payment deadline                     |
| Holiday Tier 1 premium           | 45%                                 | `lib/pricing/constants.ts`           | Christmas, Thanksgiving, NYE pricing |
| Holiday Tier 2 premium           | 30%                                 | `lib/pricing/constants.ts`           | Mother's Day, Easter, July 4 pricing |
| Holiday Tier 3 premium           | 20%                                 | `lib/pricing/constants.ts`           | Memorial Day, Labor Day pricing      |
| Weekend premium                  | 10%                                 | `lib/pricing/constants.ts`           | Fri/Sat pricing                      |
| Holiday proximity window         | 2 days                              | `lib/pricing/constants.ts`           | Near-holiday half-premium trigger    |
| IRS mileage rate                 | $0.70/mile                          | `lib/finance/mileage-constants.ts`   | Travel cost calculations             |
| Add-on: wine pairing             | $35/person                          | `lib/pricing/constants.ts`           | Quote add-ons                        |
| Add-on: charcuterie              | $150 flat                           | `lib/pricing/constants.ts`           | Quote add-ons                        |
| Add-on: extra appetizer          | $25/person                          | `lib/pricing/constants.ts`           | Quote add-ons                        |
| Add-on: birthday dessert         | $75 flat                            | `lib/pricing/constants.ts`           | Quote add-ons                        |
| Notification tier mappings       | 120+ action-to-tier rules           | `lib/notifications/tier-config.ts`   | Which channel each alert uses        |
| Email template HTML              | Hardcoded responsive layout         | `lib/email/templates.ts`             | All outbound emails                  |
| LLM temperature per task         | 0.1 to 0.75                         | Various `lib/ai/*.ts`                | AI response quality/creativity       |
| Remy personality prompt          | 40-year veteran chef persona        | `lib/ai/remy-personality.ts`         | All AI chat interactions             |
| Course types                     | 10 fixed (amuse through petit four) | `lib/events/fire-order-constants.ts` | Fire order, kitchen timeline         |
| Kitchen stations                 | 10 fixed (saucier through boucher)  | `lib/events/fire-order-constants.ts` | Prep assignment                      |
| Recipe taxonomy (cuisine)        | 14 fixed options                    | `lib/recipes/recipe-constants.ts`    | Recipe organization                  |
| Recipe taxonomy (occasion)       | 9 fixed options                     | `lib/recipes/recipe-constants.ts`    | Recipe tagging                       |
| Recipe taxonomy (season)         | 5 fixed options                     | `lib/recipes/recipe-constants.ts`    | Seasonal filtering                   |
| Sales tax rates by state         | All 50 states + DC                  | `lib/finance/sales-tax-constants.ts` | Tax calculations                     |
| Large group threshold            | 15+ guests                          | `lib/pricing/constants.ts`           | Custom pricing trigger               |

---

### Category B: Has Manual Control, No Programmatic Access (UPDATED 2026-03-20)

> Many items originally in this category have been resolved by v2 API implementation.
> Remaining gaps are features that still have UI only, no REST API.

| Feature                | Manual Control             | Missing Programmatic Access             |
| ---------------------- | -------------------------- | --------------------------------------- |
| Clone event            | Button on event page       | No `POST /api/v2/events/:id/clone`      |
| Archive event          | Button on event page       | No `POST /api/v2/events/:id/archive`    |
| Merge clients          | `/clients/duplicates` page | No `POST /api/v2/clients/:id/merge`     |
| Update recipe          | Edit form                  | No `PATCH /api/v2/recipes/:id`          |
| Update expense         | Edit form                  | No `PATCH /api/v2/expenses/:id`         |
| Approve menu           | Button on menu page        | No `POST /api/v2/menus/:id/approve`     |
| Send notification      | Automation rules only      | No `POST /api/v2/notifications`         |
| Menu engine toggles    | Settings page              | No `PATCH /api/v2/settings/menu-engine` |
| Module toggles         | Settings page              | No `PATCH /api/v2/settings/modules`     |
| Dashboard widgets      | Settings page              | No `PATCH /api/v2/settings/dashboard`   |
| Booking page settings  | Settings page              | No `GET/PATCH /api/v2/booking`          |
| Remy approval policies | Settings page              | No CRUD `/api/v2/remy/policies`         |
| Staff CRUD             | Staff pages                | No `/api/v2/staff`                      |
| Vendor CRUD            | Vendor pages               | No `/api/v2/vendors`                    |
| Inventory CRUD         | Inventory pages            | No `/api/v2/inventory`                  |
| Invoice CRUD           | Finance pages              | No `/api/v2/invoices`                   |
| Commerce / POS         | Commerce pages             | No `/api/v2/commerce/*`                 |
| Marketing campaigns    | Marketing pages            | No `/api/v2/marketing/*`                |
| Loyalty program        | Loyalty pages              | No `/api/v2/loyalty/*`                  |
| Calls/meetings         | Calls pages                | No `/api/v2/calls`                      |
| Goals                  | Goals pages                | No `/api/v2/goals`                      |
| Partners               | Partners pages             | No `/api/v2/partners`                   |
| Safety incidents       | Safety pages               | No `/api/v2/safety/incidents`           |

---

### Category C: Has Programmatic Access, Limited/No Manual Control

| Feature                      | Programmatic Access                | Missing Manual Control                            |
| ---------------------------- | ---------------------------------- | ------------------------------------------------- |
| Prospecting lead import      | `POST /api/prospecting/import`     | No UI bulk import (n8n only)                      |
| Prospecting enrichment       | `POST /api/prospecting/:id/enrich` | No manual enrich button                           |
| Cron job scheduling          | 11 cron endpoints                  | No UI to enable/disable/schedule individual crons |
| Scheduled task frequency     | 25+ scheduled endpoints            | No UI to adjust run intervals                     |
| Inngest job configuration    | Code-level registration            | No UI to view/retry/cancel jobs                   |
| Webhook management (inbound) | 6 webhook receivers                | Limited UI to view webhook logs                   |
| Rate limit configuration     | Hardcoded 100 req/min              | No UI to adjust per-tenant limits                 |

---

### Category D: Exists in Both (UPDATED 2026-03-20 with v2 API coverage)

| Feature                  | Manual                       | Programmatic                             |
| ------------------------ | ---------------------------- | ---------------------------------------- |
| Events CRUD              | Events pages                 | `CRUD /api/v2/events` + transition       |
| Clients CRUD             | Client pages                 | `CRUD /api/v2/clients`                   |
| Quotes CRUD + send       | Quote pages                  | `CRUD /api/v2/quotes` + send/accept      |
| Inquiries CRUD           | Inquiry pages                | `CRUD /api/v2/inquiries`                 |
| Menus CRUD               | Culinary menu pages          | `CRUD /api/v2/menus`                     |
| Recipes (read + create)  | Recipe pages                 | `GET/POST /api/v2/recipes`               |
| Expenses (read + create) | Expense pages                | `GET/POST /api/v2/expenses`              |
| Payments                 | Event payment buttons        | `POST /api/v2/payments`                  |
| Ledger (read)            | Finance ledger page          | `GET /api/v2/ledger`                     |
| Financial summary        | Dashboard widgets            | `GET /api/v2/financials/summary`         |
| Documents                | Generate buttons per event   | `GET/POST /api/v2/documents`             |
| Universal search         | Cmd+K palette                | `GET /api/v2/search`                     |
| Preferences              | Settings pages               | `GET/PATCH /api/v2/settings/preferences` |
| Pricing config           | Settings pricing page        | `GET/PATCH /api/v2/settings/pricing`     |
| Automation rules         | `/settings/automations` page | `CRUD /api/v2/settings/automations`      |
| Priority queue           | Dashboard                    | `GET /api/v2/queue`                      |
| Booking page             | `/settings/booking` page     | Public booking URL serves dynamically    |
| API key management       | `/settings/api-keys` page    | Keys used in API auth                    |
| Embed widget             | `/settings/embed` page       | Public embed script + API                |
| Push notifications       | Notification preferences UI  | Push subscribe/unsubscribe API           |
| Calendar feed            | Calendar sync settings       | Public iCal feed URL                     |
| Stripe payments          | Payment UI                   | Stripe webhooks                          |

---

## Proposed Architecture: External Directory

### Phase 1: Operator Settings Panel (Manual Control for Category A)

Create `/settings/pricing` and `/settings/operations` pages to expose hardcoded parameters as per-chef configurable settings.

**New DB table: `chef_pricing_config`**

```
chef_id                     UUID (FK chefs)
-- Base rates
couples_rate_min_cents      INT (default 20000)
couples_rate_max_cents      INT (default 30000)
group_rate_min_cents        INT (default 15500)
group_rate_max_cents        INT (default 21500)
weekly_standard_rate_cents  INT (default 40000-50000)
weekly_commit_rate_cents    INT (default 30000-35000)
-- Policies
deposit_percentage          INT (default 50)
minimum_booking_cents       INT (default 30000)
balance_due_hours           INT (default 24)
weekend_premium_pct         INT (default 10)
weekend_premium_enabled     BOOLEAN (default false)
-- Holiday premiums
holiday_tier1_premium_pct   INT (default 45)
holiday_tier2_premium_pct   INT (default 30)
holiday_tier3_premium_pct   INT (default 20)
holiday_proximity_days      INT (default 2)
-- Add-on defaults
add_on_catalog              JSONB (default presets, extensible)
-- Mileage
mileage_rate_cents          INT (default 70)
-- Timestamps
created_at, updated_at
```

**New DB table: `chef_taxonomy_extensions`**

```
chef_id       UUID
category      TEXT ('cuisine'|'occasion'|'season'|'course'|'station')
value         TEXT
display_label TEXT
sort_order    INT
```

This lets chefs add custom cuisines, occasions, courses beyond the system defaults.

### Phase 2: REST API v2 (Programmatic Access for Category B)

Expand `/api/v2/` with full CRUD for every entity. All endpoints authenticated via API key, tenant-scoped, rate-limited.

**Core Entity Endpoints:**

```
Events:
  POST   /api/v2/events              Create event
  GET    /api/v2/events              List events (filter, paginate)
  GET    /api/v2/events/:id          Get event detail
  PATCH  /api/v2/events/:id          Update event
  DELETE /api/v2/events/:id          Delete event (soft)
  POST   /api/v2/events/:id/transition  Transition state

Clients:
  POST   /api/v2/clients             Create client
  GET    /api/v2/clients              List clients
  GET    /api/v2/clients/:id          Get client detail
  PATCH  /api/v2/clients/:id          Update client

Quotes:
  POST   /api/v2/quotes              Create quote
  GET    /api/v2/quotes               List quotes
  GET    /api/v2/quotes/:id           Get quote detail
  PATCH  /api/v2/quotes/:id           Update quote
  POST   /api/v2/quotes/:id/send      Send to client
  POST   /api/v2/quotes/:id/accept    Mark accepted

Inquiries:
  POST   /api/v2/inquiries            Create inquiry
  GET    /api/v2/inquiries             List inquiries
  PATCH  /api/v2/inquiries/:id         Update inquiry

Menus:
  POST   /api/v2/menus                Create menu
  GET    /api/v2/menus                 List menus
  PATCH  /api/v2/menus/:id             Update menu

Recipes:
  GET    /api/v2/recipes               List recipes
  GET    /api/v2/recipes/:id           Get recipe detail

Finance:
  POST   /api/v2/expenses              Log expense
  GET    /api/v2/expenses               List expenses
  GET    /api/v2/ledger                 Get ledger entries
  GET    /api/v2/financials/summary     Financial summary
  POST   /api/v2/payments/record        Record payment

Documents:
  POST   /api/v2/documents/generate     Generate document
  GET    /api/v2/documents               List documents

Search:
  GET    /api/v2/search?q=             Universal search

Settings:
  GET    /api/v2/settings/preferences   Get all preferences
  PATCH  /api/v2/settings/preferences   Update preferences
  GET    /api/v2/settings/pricing       Get pricing config
  PATCH  /api/v2/settings/pricing       Update pricing config
  GET    /api/v2/settings/automations   List automation rules
  POST   /api/v2/settings/automations   Create rule
  PATCH  /api/v2/settings/automations/:id  Update rule
  DELETE /api/v2/settings/automations/:id  Delete rule

Queue:
  GET    /api/v2/queue                  Priority queue items

Activity:
  GET    /api/v2/activity               Activity feed
```

### Phase 3: Keyboard Shortcuts & Quick Triggers (Category B efficiency)

Expand beyond the command palette with direct keyboard shortcuts:

| Shortcut   | Action                 | Current State                |
| ---------- | ---------------------- | ---------------------------- |
| `N then E` | New event              | Must use Cmd+K, type, select |
| `N then C` | New client             | Must use Cmd+K               |
| `N then Q` | New quote              | Must use Cmd+K               |
| `N then I` | New inquiry            | Must use Cmd+K               |
| `N then R` | New recipe             | Must use Cmd+K               |
| `N then X` | New expense            | Must use Cmd+K               |
| `G then D` | Go to dashboard        | Must navigate                |
| `G then E` | Go to events           | Must navigate                |
| `G then C` | Go to clients          | Must navigate                |
| `G then S` | Go to settings         | Must navigate                |
| `?`        | Show shortcuts overlay | Doesn't exist                |

### Phase 4: Webhook Outbound (Event-driven automation)

Currently webhooks are inbound only. Add outbound webhooks so external systems can react to ChefFlow events.

**New table: `chef_webhook_subscriptions`**

```
id, chef_id, url, secret, events[], active, created_at
```

**Emitted events:**

- `event.created`, `event.updated`, `event.transitioned`
- `client.created`, `client.updated`
- `quote.created`, `quote.sent`, `quote.accepted`
- `inquiry.received`, `inquiry.replied`
- `payment.received`, `payment.failed`
- `expense.logged`
- `menu.created`, `menu.updated`

Each mutation server action would call `emitWebhook(chefId, eventType, payload)` as a non-blocking side effect.

---

## Implementation Priority

| Priority    | Phase                                             | Effort | Value                                   |
| ----------- | ------------------------------------------------- | ------ | --------------------------------------- |
| 1 (highest) | Phase 2: Core CRUD APIs (events, clients, quotes) | Medium | Unlocks all external integrations       |
| 2           | Phase 1: Pricing config settings page             | Medium | Operators control their own rates       |
| 3           | Phase 4: Outbound webhooks                        | Medium | Event-driven integrations (Zapier, n8n) |
| 4           | Phase 3: Keyboard shortcuts                       | Small  | Power user efficiency                   |
| 5           | Phase 1: Taxonomy extensions                      | Small  | Custom cuisines, occasions              |
| 6           | Phase 2: Settings/search/queue APIs               | Small  | Complete API coverage                   |

---

## Design Principles

1. **Every server action gets an API twin.** If a user can do it in the UI, an API consumer can do it via REST. The server action is the shared business logic layer; the API route is a thin auth + validation wrapper that calls the same action.

2. **Every hardcoded constant gets a settings page.** If a parameter affects business outcomes (pricing, timing, thresholds), the operator must be able to change it without a code deploy.

3. **Every mutation emits a webhook.** External systems should be able to react to any state change in ChefFlow.

4. **API keys scope access.** Read-only keys, write keys, and admin keys with per-resource permissions. Rate limits configurable per key.

5. **Backward compatibility.** `/api/v1/` continues working unchanged. New endpoints go to `/api/v2/` with richer responses and write support.

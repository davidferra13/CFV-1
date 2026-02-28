# Product Testing Roadmap — Ground Truth Edition

> **UI Testing** = does the interface behave correctly? (DONE — 515 pages verified)
> **Product Testing** = does the feature deliver its value? (THIS ROADMAP)
>
> Built from a full codebase scan of ~1,200 server actions, 31 external integrations,
> and 515 pages. Every item below is backed by real, implemented code — not aspirational.

---

## How This Works

- **Developer account:** `davidferra13@gmail.com` — real Google account, real inbox
- **Reset button:** Mission Control > Logins > "Reset" — wipes all data, clean slate
- **Login button:** Mission Control > "My Dashboard" — one-click sign-in
- **Test environment:** `localhost:3100` (dev server)
- **Each tier builds on the one below it.** Don't move up until the tier below is solid.

---

## The Dependency Chain

```
Tier 0: Account & Auth (foundation — can you even log in?)
  └─ Tier 1: Communication (email, inquiries, messages — the ignition switch)
       └─ Tier 2: Client & Event Lifecycle (the core business loop)
            └─ Tier 3: Financials (quotes, invoices, payments — real money)
                 └─ Tier 4: Operations (menus, recipes, staff, logistics)
                      └─ Tier 5: Intelligence (AI, analytics, automations)
                           └─ Tier 6: Integrations (external services, social, accounting)
```

---

## Tier 0: Account & Auth

**What it proves:** A real person can sign up, sign in, and have a working account.

**Backend:** `requireChef()`, `user_roles` table, Supabase SSR auth cookies

| #   | Test                                     | Backend Code                          | Pass Criteria                                         |
| --- | ---------------------------------------- | ------------------------------------- | ----------------------------------------------------- |
| 0.1 | Sign in with real credentials            | `api/e2e/auth` + Supabase auth        | Dashboard loads, shows correct email                  |
| 0.2 | Account reset → clean slate              | `scripts/reset-developer-account.ts`  | Dashboard shows empty state, no stale data            |
| 0.3 | Profile setup (business name, bio, slug) | `lib/settings/profile-actions.ts`     | Profile page displays entered info, slug works in URL |
| 0.4 | Chef preferences save correctly          | `lib/settings/preferences-actions.ts` | Settings persist across page refreshes                |
| 0.5 | Session persistence                      | Supabase SSR cookies                  | Close browser → reopen → still signed in              |
| 0.6 | Sign out and back in                     | Supabase auth                         | Sign out → login page → sign in → dashboard           |
| 0.7 | Notification preferences                 | `lib/notifications/actions.ts`        | Toggle notifications → preferences saved to DB        |
| 0.8 | Dashboard customization                  | `lib/settings/dashboard-actions.ts`   | Widget layout saves and restores                      |

**Status:** Not started | **Tests:** 8

---

## Tier 1: Communication

**What it proves:** The app can receive, organize, and respond to real-world communication.
This is the ignition switch. One email arriving can cascade into: client created, event drafted, quote generated, notification sent.

### 1A. Gmail Sync (THE FOUNDATION)

**Backend:** `lib/gmail/sync.ts`, `lib/gmail/actions.ts`, `lib/google/auth.ts`
**External:** Google OAuth, Gmail API
**Tables:** `google_connections`, `gmail_sync_log`, `unified_inbox`, `communication_inbox_items`

| #    | Test                           | Pass Criteria                                                        |
| ---- | ------------------------------ | -------------------------------------------------------------------- |
| 1A.1 | Connect Gmail (OAuth flow)     | OAuth completes, `google_connections` row created, tokens stored     |
| 1A.2 | Initial sync pulls real emails | `unified_inbox` populated with actual emails from Gmail              |
| 1A.3 | Email classification (AI)      | Emails classified: client inquiry, vendor, personal, spam (Ollama)   |
| 1A.4 | New email appears after sync   | Send email to account → shows in ChefFlow inbox within sync interval |
| 1A.5 | Email thread continuity        | Multi-message thread displays with full history                      |
| 1A.6 | Historical email scan          | `/api/scheduled/email-history-scan` finds relevant past emails       |
| 1A.7 | Disconnect Gmail               | Remove connection → `google_connections` deleted, inbox clears       |
| 1A.8 | Reconnect Gmail                | Re-authorize → emails return                                         |
| 1A.9 | Token refresh                  | Token expires → auto-refreshes without user intervention             |

### 1B. Inquiry Pipeline

**Backend:** `lib/inquiries/actions.ts` (15+ exports), `lib/inquiries/public-inquiry.ts`
**Tables:** `inquiries`, `inquiry_state_transitions`, `clients`

| #     | Test                           | Pass Criteria                                                              |
| ----- | ------------------------------ | -------------------------------------------------------------------------- |
| 1B.1  | Public inquiry form submission | Submit from `/chef/[slug]` → `inquiries` row created, chef notified        |
| 1B.2  | Embeddable widget inquiry      | Submit via `chefflow-widget.js` → appears in inbox with `source: 'widget'` |
| 1B.3  | Inquiry creates client record  | New inquiry → `clients` row auto-created with name, email, phone           |
| 1B.4  | Inquiry creates draft event    | Accept inquiry → `events` row created in `draft` state                     |
| 1B.5  | Inquiry notification (email)   | Submission triggers Resend email to chef                                   |
| 1B.6  | Inquiry notification (in-app)  | Bell icon shows new inquiry                                                |
| 1B.7  | Inquiry notification (push)    | Push notification reaches browser/phone (if VAPID configured)              |
| 1B.8  | Inquiry response to client     | Chef responds → client receives email via Resend                           |
| 1B.9  | AI lead scoring                | Ollama scores lead → score displays on inquiry card                        |
| 1B.10 | Inquiry state transitions      | new → contacted → qualified → converted (FSM works)                        |

### 1C. Messaging

**Backend:** `lib/messages/actions.ts` (8+ exports), `lib/chat/actions.ts` (15 exports)
**Tables:** `messages`, `conversation_threads`

| #    | Test                               | Pass Criteria                                     |
| ---- | ---------------------------------- | ------------------------------------------------- |
| 1C.1 | Send message to client             | Message saved to DB, appears in thread            |
| 1C.2 | Client sees message in portal      | Client logs into `/my-chat` → sees chef's message |
| 1C.3 | Client replies                     | Client sends reply → chef sees it in inbox        |
| 1C.4 | In-app notification on new message | New message → notification badge updates          |
| 1C.5 | Email notification on new message  | New message → Resend email sent                   |
| 1C.6 | SMS notification                   | New message → Twilio SMS sent (if configured)     |
| 1C.7 | Response templates                 | Chef uses saved template → message pre-fills      |

### 1D. SMS (Twilio)

**Backend:** `lib/sms/twilio-client.ts`, `lib/sms/send.ts`
**External:** Twilio REST API
**Tables:** `sms_send_log`

| #    | Test                 | Pass Criteria                                             |
| ---- | -------------------- | --------------------------------------------------------- |
| 1D.1 | Send SMS to client   | Twilio API call succeeds, message delivered               |
| 1D.2 | Inbound SMS received | Text to Twilio number → message appears in ChefFlow inbox |
| 1D.3 | SMS rate limiting    | Rapid sends get throttled per configured limits           |

**Status:** Not started | **Tests:** 29

---

## Tier 2: Client & Event Lifecycle

**What it proves:** The core business loop works — inquiry to event to completion.

### 2A. Client Management

**Backend:** `lib/clients/actions.ts` (21 exports)
**Tables:** `clients`, `client_notes`, `client_tags`, `client_allergy_records`

| #    | Test                             | Pass Criteria                                             |
| ---- | -------------------------------- | --------------------------------------------------------- |
| 2A.1 | Create client manually           | Client appears in list with name, email, dietary info     |
| 2A.2 | Client auto-created from inquiry | Inquiry accepted → client record exists with correct data |
| 2A.3 | Dietary restrictions & allergies | Save allergies → `client_allergy_records` populated       |
| 2A.4 | Client portal invite             | Send invite → Resend email delivered with login link      |
| 2A.5 | Client signs into portal         | Client uses invite → sees `/my-events`, `/my-chat`        |
| 2A.6 | Client tags & segments           | Tag clients → filter by tag in client list                |
| 2A.7 | Client notes                     | Add private notes → persisted, visible on profile         |
| 2A.8 | Client lifetime value            | After events, LTV calculates correctly from ledger        |

### 2B. Event Lifecycle (8-state FSM)

**Backend:** `lib/events/actions.ts` (22+ exports), `lib/events/transitions.ts`
**Tables:** `events`, `event_state_transitions` (immutable)

| #     | Test                      | Pass Criteria                                                             |
| ----- | ------------------------- | ------------------------------------------------------------------------- |
| 2B.1  | Create event from scratch | Event with date, type, guest count → `events` row, `draft` state          |
| 2B.2  | Create event from inquiry | Inquiry → draft event with pre-filled details                             |
| 2B.3  | draft → proposed          | Transition succeeds, `event_state_transitions` row added, client notified |
| 2B.4  | proposed → accepted       | Client accepts → state changes, chef notified                             |
| 2B.5  | accepted → paid           | Payment received (Stripe) → state changes                                 |
| 2B.6  | paid → confirmed          | Chef confirms → event locked                                              |
| 2B.7  | confirmed → in_progress   | Manual or time-based → status updates                                     |
| 2B.8  | in_progress → completed   | Event finished → AAR available                                            |
| 2B.9  | Any state → cancelled     | Cancel → terminal state, no further transitions allowed                   |
| 2B.10 | Calendar display          | Event shows on calendar with correct date/time/duration                   |
| 2B.11 | Event detail page loads   | All panels render: staff, menu, financials, timeline, contingency         |
| 2B.12 | Activity timeline         | Every action logged in activity feed with timestamps                      |

### 2C. Calendar & Scheduling

**Backend:** `lib/scheduling/actions.ts` (9 exports), `lib/scheduling/prep-block-actions.ts` (12 exports)
**Tables:** `chef_calendar_entries`, `chef_availability_blocks`, `time_blocks`

| #    | Test                      | Pass Criteria                                                 |
| ---- | ------------------------- | ------------------------------------------------------------- |
| 2C.1 | Create availability block | Block saves, shows on calendar                                |
| 2C.2 | Prep blocks for event     | Auto-generate prep time → shows before event on calendar      |
| 2C.3 | Conflict detection        | Book overlapping events → warning shown                       |
| 2C.4 | iCal export               | Download `.ics` file → imports into Google Calendar correctly |
| 2C.5 | Public availability link  | Share link → guest sees available dates (no auth required)    |

**Status:** Not started | **Tests:** 25

---

## Tier 3: Financials

**What it proves:** The app handles real money correctly — quotes, invoices, payments, ledger.

### 3A. Quotes

**Backend:** `lib/quotes/actions.ts` (12 exports)
**Tables:** `quotes`, `quote_state_transitions` (immutable), `quote_selected_addons`

| #    | Test                         | Pass Criteria                                         |
| ---- | ---------------------------- | ----------------------------------------------------- |
| 3A.1 | Create quote with line items | Quote total calculates correctly (cents, not dollars) |
| 3A.2 | Add-ons and custom items     | Additional items change quote total correctly         |
| 3A.3 | Send quote to client         | Client receives Resend email with quote details       |
| 3A.4 | Client views quote in portal | `/my-quotes` shows correct amounts, line items        |
| 3A.5 | Client accepts quote         | State transitions to `accepted`, chef notified        |
| 3A.6 | Quote → event linkage        | Accepted quote connects to event, financials update   |

### 3B. Payments (Stripe)

**Backend:** `lib/stripe/actions.ts`, `lib/stripe/checkout.ts`, webhook handler
**External:** Stripe API, Stripe Connect
**Tables:** `ledger_entries` (immutable), `commerce_payments`

| #    | Test                       | Pass Criteria                                             |
| ---- | -------------------------- | --------------------------------------------------------- |
| 3B.1 | Create payment intent      | Stripe PaymentIntent created with correct amount          |
| 3B.2 | Client pays via checkout   | Stripe checkout completes → webhook fires                 |
| 3B.3 | Webhook processes payment  | `ledger_entries` row appended (idempotent)                |
| 3B.4 | Payment confirmation email | Client receives Resend email with amount, event details   |
| 3B.5 | Partial payment (deposit)  | Balance remaining calculated correctly from ledger        |
| 3B.6 | Payment plan installments  | Multiple payments track against plan schedule             |
| 3B.7 | Refund processing          | Stripe refund → ledger entry appended                     |
| 3B.8 | Dashboard revenue          | Total revenue derived from ledger (never stored directly) |

### 3C. Expenses & Profit

**Backend:** `lib/expenses/actions.ts` (8+ exports), `lib/finance/profit-loss-report-actions.ts`
**Tables:** `expenses`, `event_financial_summary` (view)

| #    | Test                        | Pass Criteria                                             |
| ---- | --------------------------- | --------------------------------------------------------- |
| 3C.1 | Log expense to event        | Expense saved, appears on event financial panel           |
| 3C.2 | Receipt photo upload        | Photo stored and viewable                                 |
| 3C.3 | Profit = revenue - expenses | Event detail shows correct profit from ledger + expenses  |
| 3C.4 | P&L report                  | Period report calculates correctly from real transactions |

### 3D. Loyalty & Rewards

**Backend:** `lib/loyalty/actions.ts` (15+ exports), `lib/loyalty/redemption-actions.ts`
**Tables:** `loyalty_transactions`, `loyalty_rewards`, `loyalty_reward_redemptions`

| #    | Test                     | Pass Criteria                                                |
| ---- | ------------------------ | ------------------------------------------------------------ |
| 3D.1 | Points earned on payment | Payment completes → loyalty points added                     |
| 3D.2 | Tier progression         | Points accumulate → tier upgrades (Bronze → Silver → Gold)   |
| 3D.3 | Reward redemption        | Client redeems reward → discount applied to invoice          |
| 3D.4 | Loyalty on invoice       | Invoice PDF shows redemption, adjusted subtotal, correct tax |

**Status:** Not started | **Tests:** 24

---

## Tier 4: Operations

**What it proves:** The app handles event logistics — menus, recipes, staff, kitchen ops.

### 4A. Recipes & Ingredients

**Backend:** `lib/recipes/actions.ts` (22 exports)
**Tables:** `recipes`, `recipe_ingredients`, `ingredients`, `ingredient_price_history`

| #    | Test                             | Pass Criteria                                                      |
| ---- | -------------------------------- | ------------------------------------------------------------------ |
| 4A.1 | Create recipe with ingredients   | Recipe saved, ingredients linked                                   |
| 4A.2 | Ingredient pricing (Spoonacular) | Real prices fetched from API, stored in `ingredient_price_history` |
| 4A.3 | Recipe cost calculation          | Total cost = sum of (ingredient price x quantity)                  |
| 4A.4 | Allergen detection               | Ingredients flagged against client allergies                       |
| 4A.5 | Bulk price update                | Update all ingredient prices at once → all recipes recalculate     |

### 4B. Menus

**Backend:** `lib/menus/actions.ts` (20+ exports)
**Tables:** `menus`, `dishes`, `components`, `menu_state_transitions`

| #    | Test                     | Pass Criteria                                              |
| ---- | ------------------------ | ---------------------------------------------------------- |
| 4B.1 | Create menu from recipes | Menu built with courses → dishes → recipe components       |
| 4B.2 | Assign menu to event     | Menu linked to event, appears on event detail              |
| 4B.3 | Menu approval flow       | Send to client → client approves in portal → chef notified |
| 4B.4 | Food cost analysis       | Menu cost calculated from recipe ingredient prices         |
| 4B.5 | Menu PDF/print           | Menu renders for print with correct formatting             |

### 4C. Grocery & Procurement

**Backend:** `lib/grocery/pricing-actions.ts`, `lib/grocery/instacart-actions.ts`
**External:** Spoonacular, MealMe, Instacart, USDA

| #    | Test                            | Pass Criteria                                       |
| ---- | ------------------------------- | --------------------------------------------------- |
| 4C.1 | Generate grocery list from menu | Ingredients consolidated correctly                  |
| 4C.2 | Fetch real prices               | At least one pricing source returns prices          |
| 4C.3 | Instacart cart link             | Link generated → opens Instacart with correct items |
| 4C.4 | Price comparison                | Multiple sources shown for same ingredient          |

### 4D. Staff & Kitchen

**Backend:** `lib/staff/actions.ts` (14 exports), `lib/stations/actions.ts` (11 exports)
**Tables:** `staff_members`, `event_staff_assignments`, `stations`

| #    | Test                  | Pass Criteria                                         |
| ---- | --------------------- | ----------------------------------------------------- |
| 4D.1 | Add staff member      | Staff record created, appears in roster               |
| 4D.2 | Assign staff to event | Assignment saved, staff sees event on their dashboard |
| 4D.3 | Clock in/out          | Time entries recorded, hours calculated               |
| 4D.4 | Kitchen stations      | Station created, items assigned, fire order works     |
| 4D.5 | Temperature logging   | Temp recorded on event → stored in `event_temp_logs`  |

### 4E. After Action Review

**Backend:** `lib/ai/aar-generator.ts` (Ollama), `lib/events/aar-actions.ts`
**Tables:** `after_action_reviews`

| #    | Test                     | Pass Criteria                           |
| ---- | ------------------------ | --------------------------------------- |
| 4E.1 | Generate AAR after event | Ollama generates review from event data |
| 4E.2 | AAR stored and viewable  | Review saved, displays on event detail  |
| 4E.3 | Lessons learned          | AAR feeds into analytics/insights       |

**Status:** Not started | **Tests:** 22

---

## Tier 5: Intelligence

**What it proves:** AI and analytics deliver real insights from real data.

### 5A. Remy (AI Concierge)

**Backend:** `lib/ai/remy-actions.ts`, 85+ AI-related exports
**External:** Ollama (local LLM, required)

| #    | Test                   | Pass Criteria                                                |
| ---- | ---------------------- | ------------------------------------------------------------ |
| 5A.1 | Basic conversation     | Ask Remy a question → contextual answer                      |
| 5A.2 | Client context lookup  | "Tell me about [client]" → Remy shows their history          |
| 5A.3 | Draft email generation | Ask Remy to draft follow-up → real draft with client details |
| 5A.4 | Dietary conflict check | "Any allergies for [event]?" → Remy checks real allergy data |
| 5A.5 | Memory persistence     | Remy remembers preferences across conversations              |
| 5A.6 | Artifact creation      | Save Remy output as artifact → persisted and retrievable     |

### 5B. Analytics

**Backend:** `lib/analytics/insights-actions.ts` (15 exports), `lib/analytics/client-ltv-actions.ts`

| #    | Test              | Pass Criteria                                        |
| ---- | ----------------- | ---------------------------------------------------- |
| 5B.1 | Revenue dashboard | Charts reflect real payment data from ledger         |
| 5B.2 | Pipeline funnel   | Inquiry → event conversion rates from real data      |
| 5B.3 | Client LTV        | Lifetime value calculated from actual transactions   |
| 5B.4 | Demand forecast   | Projection based on historical event patterns        |
| 5B.5 | Menu engineering  | Dish popularity + profitability from real event data |

### 5C. Automations

**Backend:** `lib/automations/actions.ts`, `lib/automations/engine.ts`
**Tables:** `automation_rules`, `automation_executions`

| #    | Test                   | Pass Criteria                                              |
| ---- | ---------------------- | ---------------------------------------------------------- |
| 5C.1 | Create automation rule | Rule saved (e.g., "send follow-up 3 days after event")     |
| 5C.2 | Automation fires       | Rule triggers → action executes (email sent, task created) |
| 5C.3 | Execution log          | Every automation run logged with status                    |

### 5D. AI Drafts

**Backend:** `lib/ai/draft-actions.ts` (11 exports)

| #    | Test                   | Pass Criteria                                           |
| ---- | ---------------------- | ------------------------------------------------------- |
| 5D.1 | Thank-you email draft  | Personalized with client name, event details, real data |
| 5D.2 | Quote follow-up draft  | References actual quote amount and event details        |
| 5D.3 | Payment reminder draft | Shows real outstanding balance                          |
| 5D.4 | Re-engagement draft    | References client's last event and preferences          |

**Status:** Not started | **Tests:** 18

---

## Tier 6: External Integrations

**What it proves:** Third-party services connect and function end-to-end.

### 6A. Fully Wired (Ready to Test)

| #    | Test                       | Integration          | Pass Criteria                            |
| ---- | -------------------------- | -------------------- | ---------------------------------------- |
| 6A.1 | Resend transactional email | Resend API           | Email delivered to real inbox            |
| 6A.2 | Stripe Connect onboarding  | Stripe               | Chef links bank account for payouts      |
| 6A.3 | Web Push notification      | VAPID/Service Worker | Push notification appears on device      |
| 6A.4 | Zapier webhook delivery    | Zapier REST Hooks    | Event triggers → Zapier receives webhook |
| 6A.5 | iCal calendar export       | iCal spec            | `.ics` import works in Google/Outlook    |
| 6A.6 | Inngest background job     | Inngest              | Deferred email sends on schedule         |

### 6B. Scaffolding (OAuth Done, Features Incomplete)

These have working OAuth flows but no end-to-end feature. Testing here means verifying the connection, not the feature.

| #    | Test                     | Integration                                      | What's Missing                           |
| ---- | ------------------------ | ------------------------------------------------ | ---------------------------------------- |
| 6B.1 | DocuSign OAuth connect   | DocuSign                                         | Document signing/sending not implemented |
| 6B.2 | QuickBooks OAuth connect | QuickBooks                                       | Invoice sync not implemented             |
| 6B.3 | Square OAuth connect     | Square                                           | Payment processing not implemented       |
| 6B.4 | Social media OAuth       | Instagram/FB/X/LinkedIn/TikTok/Pinterest/YouTube | Publishing logic incomplete              |

### 6C. Review Sync

| #    | Test                   | Integration     | Pass Criteria                                |
| ---- | ---------------------- | --------------- | -------------------------------------------- |
| 6C.1 | Google Reviews sync    | Google Places   | Reviews pulled into `external_reviews` table |
| 6C.2 | Website JSON-LD scrape | Website scraper | Reviews parsed from chef's website           |

**Status:** Not started | **Tests:** 12

---

## Critical Path (Do These First)

The minimum viable product test sequence. If these pass, the core business loop works.

```
0.1  Sign in
0.2  Reset account
0.3  Profile setup
1A.1 Connect Gmail
1A.2 Initial email sync
1A.4 New email appears
1B.1 Public inquiry submission
1B.3 Inquiry creates client
1B.4 Inquiry creates draft event
2B.3 draft → proposed
2B.4 proposed → accepted
3A.1 Create quote
3A.3 Send quote to client
3B.2 Client pays via Stripe
3B.3 Webhook processes payment
2B.8 in_progress → completed
```

**16 tests.** If all 16 pass, ChefFlow works as a business tool.

---

## Known Blockers & Prerequisites

| Blocker                        | Affects                                                                    | Resolution                                                        |
| ------------------------------ | -------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| Ollama must be running         | All AI features (Tier 5), email classification (1A.3), lead scoring (1B.9) | Start Ollama on PC before testing                                 |
| Google OAuth credentials       | Gmail sync (1A.\*)                                                         | Needs `GOOGLE_CLIENT_ID` + `GOOGLE_CLIENT_SECRET` in `.env.local` |
| Stripe test mode keys          | All payment tests (3B.\*)                                                  | Use Stripe test keys (no real charges)                            |
| Twilio credentials             | SMS tests (1D.\*)                                                          | Needs `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN`                  |
| VAPID keys                     | Push notification tests (6A.3)                                             | Needs `VAPID_PUBLIC_KEY` + `VAPID_PRIVATE_KEY`                    |
| Dev server running             | Everything                                                                 | `localhost:3100` must be up                                       |
| 4 critical cross-boundary gaps | Chef not notified of dietary changes, contract signing                     | Fix before Tier 2 testing                                         |

---

## Progress Tracker

| Tier              | Name                     | Tests   | Passed | Failed | Blocked | Status      |
| ----------------- | ------------------------ | ------- | ------ | ------ | ------- | ----------- |
| 0                 | Account & Auth           | 8       | 0      | 0      | 0       | Not started |
| 1                 | Communication            | 29      | 0      | 0      | 0       | Not started |
| 2                 | Client & Event Lifecycle | 25      | 0      | 0      | 0       | Not started |
| 3                 | Financials               | 24      | 0      | 0      | 0       | Not started |
| 4                 | Operations               | 22      | 0      | 0      | 0       | Not started |
| 5                 | Intelligence             | 18      | 0      | 0      | 0       | Not started |
| 6                 | External Integrations    | 12      | 0      | 0      | 0       | Not started |
| **Total**         |                          | **138** | **0**  | **0**  | **0**   |             |
| **Critical Path** |                          | **16**  | **0**  | **0**  | **0**   |             |

---

## Scaffolding Report (What's NOT Ready to Product-Test)

These features have OAuth/UI but no complete backend. Don't waste time testing them.

| Feature                    | What Exists                          | What's Missing                  |
| -------------------------- | ------------------------------------ | ------------------------------- |
| DocuSign e-signatures      | OAuth flow, token storage            | Actual document signing/sending |
| QuickBooks sync            | OAuth flow, token storage            | Invoice/expense export          |
| Square payments            | OAuth flow, token storage            | In-person payment processing    |
| Social media publishing    | OAuth for 7 platforms, token storage | Actual post publishing logic    |
| Kroger grocery pricing     | Referenced in code                   | No actual API implementation    |
| Google My Business reviews | Full implementation                  | API deprecated by Google        |

**Action:** Don't test these. Either finish them or remove the UI. They're the ~1% scaffolding.

---

_Built from codebase scan 2026-02-28. 1,200+ server actions, 31 integrations, 515 pages audited._
_This is a living document — update as tests are run._

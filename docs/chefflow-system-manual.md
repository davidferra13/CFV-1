# ChefFlow V1 - Comprehensive System Manual

> **Generated:** 2026-03-17 | **Baseline Version:** commit `56f4d197e`
> **Purpose:** Technical manual for ChefFlow V1.
> All subsequent changes are "patches" to this documented baseline.
> **Maintainer:** Claude Code (Lead Engineer)
> **Canonical scope note:** Project identity, audience, and scope are governed by `docs/project-definition-and-scope.md`. This manual is implementation-facing and should not override that file.

---

## Table of Contents

1. [System Overview and Metrics](#1-system-overview-and-metrics)
2. [Architecture (C4 Model)](#2-architecture-c4-model)
3. [Tiered Component Hierarchy](#3-tiered-component-hierarchy)
4. [Data Model and Schema](#4-data-model-and-schema)
5. [Business Logic and Core Workflows](#5-business-logic-and-core-workflows)
6. [AI System Architecture](#6-ai-system-architecture)
7. [Security and Access Control](#7-security-and-access-control)
8. [External Integrations](#8-external-integrations)
9. [Testing and Quality Assurance](#9-testing-and-quality-assurance)
10. [Infrastructure and Deployment](#10-infrastructure-and-deployment)
11. [API Surface](#11-api-surface)
12. [UI Component Inventory](#12-ui-component-inventory)
13. [Configuration Reference](#13-configuration-reference)
14. [Known Limitations and Technical Debt](#14-known-limitations-and-technical-debt)
15. [Appendix: Module Registry](#appendix-module-registry)

---

## 1. System Overview and Metrics

### What ChefFlow Is

ChefFlow is a **chef-first operating system for independent and small culinary businesses** built on Next.js 14, PostgreSQL (PostgreSQL), and Stripe. It manages the complete lifecycle of a chef-led business: client acquisition, event management, quoting, invoicing, payments, menu and recipe management, staff coordination, and business analytics. The tagline is "Ops for Artists."

### Codebase Metrics (as of 2026-03-17)

| Metric                                     | Count    |
| ------------------------------------------ | -------- |
| Total TypeScript/TSX source files          | 4,030    |
| Total lines of code (TS/TSX)               | ~879,000 |
| App route pages (`page.tsx`)               | 642      |
| API routes (`route.ts`)                    | 135      |
| React components (`.tsx` in `components/`) | 1,325    |
| Library modules (`.ts`/`.tsx` in `lib/`)   | 1,533    |
| Server action files (`'use server'`)       | 904      |
| Database migrations (`.sql`)               | 591      |
| Test files                                 | 374      |
| Scripts (deploy, audit, utility)           | 153      |
| `lib/` subdirectories (domain modules)     | 220      |
| `components/` subdirectories               | 60+      |

### Technology Stack

| Layer               | Technology                      | Version                 |
| ------------------- | ------------------------------- | ----------------------- |
| **Framework**       | Next.js (App Router)            | 14.2.18                 |
| **Language**        | TypeScript                      | 5.7.2                   |
| **Runtime**         | React                           | 18.3.1                  |
| **Database**        | (PostgreSQL)                    | Remote, linked          |
| **Auth**            | Auth                            | SSR via `@database/ssr` |
| **Payments**        | Stripe                          | v20.3.1 (Connect)       |
| **Styling**         | Tailwind CSS                    | 3.4.17                  |
| **Icons**           | Lucide React, Phosphor Icons    | Latest                  |
| **Email**           | Resend + React Email            | 6.9.2                   |
| **AI (Local)**      | Ollama                          | 0.6.3 (qwen3 models)    |
| **AI (Cloud)**      | Google Gemini, Groq             | Via `@google/genai`     |
| **Charts**          | Recharts                        | 3.7.0                   |
| **Calendar**        | FullCalendar                    | 6.1.20                  |
| **Forms**           | Zod validation + Server Actions | Zod 4.3.6               |
| **Documents**       | jsPDF, PDFKit, pdf-parse        | Various                 |
| **OCR**             | Tesseract.js                    | 7.0.0                   |
| **Maps**            | Google Maps React               | 2.20.8                  |
| **Push**            | Web Push                        | 3.6.7                   |
| **Video**           | Remotion                        | 4.0.427                 |
| **Drag & Drop**     | dnd-kit                         | 6.3.1                   |
| **SMS**             | Twilio (via webhooks)           | N/A                     |
| **Monitoring**      | Sentry                          | 10.39.0                 |
| **Analytics**       | PostHog                         | 1.356.0                 |
| **Rate Limiting**   | Upstash Redis                   | 2.0.8                   |
| **Background Jobs** | Inngest                         | 3.52.4                  |
| **Spreadsheets**    | xlsx                            | 0.18.5                  |
| **PWA**             | next-pwa                        | 10.2.9                  |
| **Desktop**         | Tauri                           | 2.10.0 (experimental)   |
| **Testing**         | Playwright                      | 1.50.0                  |
| **Formatting**      | Prettier + Husky + lint-staged  | Latest                  |

### Brand Identity

| Property     | Value                       |
| ------------ | --------------------------- |
| App name     | ChefFlow                    |
| Domain       | app.cheflowhq.com           |
| Beta domain  | beta.cheflowhq.com          |
| Brand color  | Terracotta orange `#e88f47` |
| Heading font | DM Serif Display            |
| Body font    | Inter                       |
| Tagline      | Ops for Artists             |

---

## 2. Architecture (C4 Model)

### Level 1: System Context

```
                    +-----------------+
                    |   Private Chef  |
                    |    (Primary)    |
                    +--------+--------+
                             |
                    +--------v--------+
                    |    ChefFlow     |
                    |   Application   |
                    +--------+--------+
                             |
          +------------------+------------------+
          |                  |                  |
  +-------v------+  +-------v------+  +--------v-------+
  |   Clients    |  | Staff Members|  | Public Visitors |
  | (End Users)  |  | (Assistants) |  | (Landing Page)  |
  +--------------+  +--------------+  +----------------+
```

**External Systems:**

- PostgreSQL (PostgreSQL + Auth + Realtime + Storage)
- Stripe (Payments, Connect, Invoicing)
- Ollama (Local AI inference, privacy-critical)
- Google Gemini (Cloud AI, non-private tasks)
- Groq (Cloud AI, fast structured parsing)
- Resend (Transactional email)
- Gmail API (Email sync / GOLDMINE intelligence)
- Google Maps (Geocoding, travel)
- Twilio (SMS)
- Spoonacular / Kroger / MealMe / Instacart (Grocery pricing)
- Sentry (Error monitoring)
- PostHog (Product analytics)
- Upstash Redis (Rate limiting)
- Inngest (Background job orchestration)
- Cloudflare Tunnel (Beta server exposure)
- DocuSign, QuickBooks, Square, Zapier, Wix (Integration connectors)

### Level 2: Container Diagram

```
+------------------------------------------------------------------+
|                        ChefFlow Platform                          |
|                                                                   |
|  +--------------------+  +--------------------+                   |
|  |   Next.js App      |  |   PostgreSQL         |                  |
|  |   (App Router)     |  |   (PostgreSQL)     |                  |
|  |                    |  |                    |                  |
|  |  Route Groups:     |  |  591 migrations    |                  |
|  |  (chef) - Chef UI  |  |  RLS policies      |                  |
|  |  (client) - Client |  |  Immutable triggers |                  |
|  |  (admin) - Admin   |  |  Financial views   |                  |
|  |  (staff) - Staff   |  |  Realtime channels |                  |
|  |  (public) - Landing|  +--------------------+                   |
|  |  (partner) - Refs  |                                          |
|  |  (demo) - Demo     |  +--------------------+                   |
|  |  (mobile) - Mobile |  |   Ollama (Local)   |                  |
|  |  api/ - REST/hooks |  |   Port 11434       |                  |
|  |  embed/ - Widget   |  |   qwen3:4b (fast)  |                  |
|  |  kiosk/ - POS      |  |   qwen3-coder:30b  |                  |
|  +--------------------+  |   qwen3:30b        |                  |
|                          +--------------------+                   |
|  +--------------------+                                          |
|  | Mission Control    |  +--------------------+                   |
|  | Port 41937         |  |   Stripe           |                  |
|  | Gustav AI          |  |   Connect + Direct |                  |
|  | Codebase scanner   |  |   Webhooks         |                  |
|  +--------------------+  +--------------------+                   |
+------------------------------------------------------------------+
```

### Level 3: Component Architecture

**Next.js App Router layout:**

```
app/
  (chef)/          -- Chef portal (primary UI, ~300+ pages)
    dashboard/     -- Main dashboard with configurable widgets
    events/        -- Event lifecycle management
    clients/       -- Client directory and CRM
    inquiries/     -- Inquiry pipeline
    quotes/        -- Quote builder
    financials/    -- Financial hub, ledger, invoices, expenses
    culinary/      -- Menus, recipes, ingredients, costing
    calendar/      -- Full calendar with FullCalendar
    inbox/         -- Email/message hub
    staff/         -- Staff management
    analytics/     -- Business analytics
    settings/      -- App settings, billing, integrations
    ... (40+ more sections)

  (client)/        -- Client portal (event view, messaging, payments)
    my-events/     -- Client's event list
    my-profile/    -- Client profile management
    ... (20+ pages)

  (admin)/         -- Admin panel (system management)
    admin/         -- User management, system health

  (staff)/         -- Staff portal
    staff-dashboard/

  (partner)/       -- Partner/referral portal
    partner/

  (public)/        -- Landing page, pricing, blog (unauthenticated)
    pricing/
    blog/

  (demo)/          -- Demo environment
  (mobile)/        -- Mobile-optimized views

  api/             -- 135 API routes (REST, webhooks, cron, scheduled)
  embed/           -- Embeddable inquiry widget (no auth, inline styles)
  kiosk/           -- Point-of-sale kiosk mode
  book/            -- Public booking flow
  auth/            -- Auth pages (signin, signup, callback)
```

**Server-side architecture:**

```
lib/
  auth/            -- Authentication, role resolution, route policy
  events/          -- Event FSM (8-state machine)
  ledger/          -- Append-only financial ledger
  billing/         -- Freemium tier system (Free/Pro)
  ai/              -- AI dispatch layer (Ollama/Gemini/Groq routing)
    dispatch/      -- Privacy gate, classifier, router
    queue/         -- Request queue with circuit breakers
  stripe/          -- Stripe Connect integration
  database/        -- database client creation (server/client/admin)
  email/           -- Email sending via Resend
  ... (220 domain modules)
```

### Data Flow: Request Lifecycle

```
Browser Request
    |
    v
middleware.ts
    |-- Public asset? -> NextResponse.next()
    |-- Public unauth path? -> NextResponse.next()
    |-- No user? -> Redirect to /auth/signin
    |-- Has user -> Resolve role from user_roles table
    |              |-- Set role cookie (5min TTL)
    |              |-- Set auth context in request headers
    |              |-- Route group enforcement:
    |                   chef routes -> must be chef role
    |                   client routes -> must be client role
    |                   staff routes -> must be staff role
    v
Route Handler (page.tsx / route.ts)
    |-- Server Component -> Direct DB access via the database
    |-- Server Action -> 'use server' function in lib/
    |     |-- requireChef() / requireClient() / requireAuth()
    |     |-- Tenant-scoped DB query
    |     |-- Business logic
    |     |-- revalidatePath() / revalidateTag()
    |     |-- Return result
    |-- API Route -> REST endpoint
    |     |-- Auth validation
    |     |-- Business logic
    |     |-- JSON response
    v
Client Component
    |-- startTransition() for mutations (with try/catch + rollback)
    |-- Optimistic UI updates
    |-- Toast notifications for success/error
```

---

## 3. Tiered Component Hierarchy

### TIER 1: CRITICAL (System Cannot Function Without These)

These components form the irreducible core. Failure here means the product is unusable. Direct revenue impact, data integrity at stake, or safety-critical.

| Component                          | Files                                                                                                   | Why Critical                                                                                                                                            |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Authentication & Authorization** | `middleware.ts`, `lib/auth/get-user.ts`, `lib/auth/route-policy.ts`, `lib/auth/request-auth-context.ts` | Every request passes through auth. Failure = no access or unauthorized access.                                                                          |
| **Event Lifecycle FSM**            | `lib/events/transitions.ts`, `lib/events/actions.ts`                                                    | Core business object. 8-state machine (draft->proposed->accepted->paid->confirmed->in_progress->completed/cancelled). All revenue flows through events. |
| **Financial Ledger**               | `lib/ledger/append.ts`, `lib/ledger/compute.ts`, `lib/ledger/internal.ts`                               | Append-only, immutable ledger. All financial truth derives from this. Database triggers enforce immutability.                                           |
| **Quote System**                   | `lib/quotes/actions.ts`, `lib/quotes/compute.ts`                                                        | Pricing engine. Quotes drive revenue. State machine with its own transitions.                                                                           |
| **PostgreSQL Client**              | `lib/database/server.ts`, `lib/database/client.ts`, `lib/database/admin.ts`                             | Every database operation. Service role vs anon key selection.                                                                                           |
| **Database Schema (Layers 1-4)**   | `database/migrations/20260215000001-4*.sql`                                                             | Foundation tables: chefs, clients, events, quotes, ledger_entries, recipes, menus, ingredients, conversations, documents                                |
| **Stripe Integration**             | `lib/stripe/`, `app/api/webhooks/stripe/route.ts`                                                       | Payment processing. Webhook handles paid transitions. Real money.                                                                                       |
| **Tenant Isolation**               | RLS policies on every table, `tenant_id`/`chef_id` scoping                                              | Multi-tenant security. Failure = chef A sees chef B's data.                                                                                             |
| **Middleware**                     | `middleware.ts`                                                                                         | Route protection, role resolution, auth context propagation. Every request.                                                                             |
| **User Roles**                     | `user_roles` table, role resolution in middleware                                                       | Determines what every user can see and do.                                                                                                              |

### TIER 2: MAJOR (Core Product Functionality)

These enable the product's primary value proposition. The app works without them technically, but chefs can't run their business effectively.

| Component                        | Files                                                                         | Why Major                                                                |
| -------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| **Client Management**            | `lib/clients/`, `components/clients/`, `app/(chef)/clients/`                  | CRM for managing client relationships, dietary restrictions, preferences |
| **Inquiry Pipeline**             | `lib/inquiries/`, `lib/leads/`, `lib/pipeline/`                               | Lead capture, qualification, conversion funnel                           |
| **Invoice & Payment Processing** | `lib/payments/`, `lib/finance/`, `app/api/documents/invoice*`                 | Invoice generation, payment tracking, receipts                           |
| **Menu & Recipe Management**     | `lib/menus/`, `lib/recipes/`, `lib/ingredients/`                              | Chef's creative IP. Menu builder, recipe book, ingredient library        |
| **Food Costing Engine**          | `lib/formulas/`, `lib/grocery/`                                               | Cost calculation, margin analysis, grocery pricing                       |
| **Calendar System**              | `lib/calendar/`, FullCalendar integration                                     | Event scheduling, availability management                                |
| **Email System**                 | `lib/email/`, Resend integration, React Email templates                       | Client communication, automated notifications                            |
| **Dashboard**                    | `app/(chef)/dashboard/`, `components/dashboard/`                              | Primary landing page with configurable widgets                           |
| **Document Generation**          | `lib/documents/`, `app/api/documents/`                                        | PDFs: invoices, quotes, contracts, receipts, financial summaries         |
| **Remy AI Concierge**            | `lib/ai/remy-*.ts`, `components/ai/remy-drawer.tsx`                           | AI assistant for chefs (natural language commands, data queries)         |
| **Notification System**          | `lib/notifications/`, `lib/push/`                                             | Push notifications, in-app alerts, email notifications                   |
| **Client Portal**                | `app/(client)/`, `lib/client-portal/`                                         | Client-facing event view, messaging, payment, dietary forms              |
| **Billing/Tier System**          | `lib/billing/tier.ts`, `lib/billing/modules.ts`, `lib/billing/require-pro.ts` | Freemium gating (Free vs Pro). Revenue model.                            |

### TIER 3: MINOR (Feature Modules, Important but Not Core)

Enhance the platform. Removal degrades experience but doesn't prevent core business operations.

| Component                       | Domain                                                 |
| ------------------------------- | ------------------------------------------------------ |
| **Staff Management**            | `lib/staff/`, `lib/staffing/`, `lib/shifts/`           |
| **Analytics & Reports**         | `lib/analytics/`, `lib/reports/`                       |
| **GOLDMINE Email Intelligence** | `lib/gmail/`, `lib/intelligence/`                      |
| **Prospecting (Admin-only)**    | `lib/prospecting/`                                     |
| **Campaign Management**         | `lib/campaigns/`, `lib/marketing/`                     |
| **Travel & Operations**         | `lib/travel/`, `lib/operations/`                       |
| **Daily Ops**                   | `lib/daily-ops/`, `lib/briefing/`                      |
| **Reviews & AAR**               | `lib/reviews/`, `lib/aar/`                             |
| **Guest Management**            | `lib/guests/`, `lib/guest-leads/`, `lib/guest-comms/`  |
| **Contracts**                   | `lib/contracts/`                                       |
| **Equipment Inventory**         | `lib/equipment/`, `lib/inventory/`                     |
| **Loyalty Program**             | `lib/loyalty/`                                         |
| **Community & Network**         | `lib/community/`, `lib/network/`                       |
| **Testimonials**                | `lib/testimonials/`                                    |
| **Proposals**                   | `lib/proposals/`                                       |
| **Automations**                 | `lib/automations/`, `lib/workflow/`                    |
| **Chat/Messaging**              | `lib/chat/`, `lib/messages/`, `lib/realtime/`          |
| **Onboarding**                  | `lib/onboarding/`, `lib/demo/`                         |
| **Embeddable Widget**           | `components/embed/`, `public/embed/chefflow-widget.js` |
| **Social Media**                | `lib/social/`                                          |
| **Prep & Stations**             | `lib/prep/`, `lib/stations/`                           |
| **Recurring Events**            | `lib/recurring/`                                       |
| **Retainers**                   | `lib/retainers/`                                       |
| **Revenue Goals**               | `lib/revenue-goals/`, `lib/goals/`                     |
| **Tax Center**                  | `lib/tax/`                                             |

### TIER 4: UTILITY (Supporting Infrastructure, Operational Tools)

Internal tooling, developer utilities, experimental features. Never user-facing critical path.

| Component                    | Domain                                                                 |
| ---------------------------- | ---------------------------------------------------------------------- |
| **Mission Control**          | `scripts/launcher/` (Gustav AI, codebase scanner, port monitor)        |
| **Demo Data System**         | `lib/demo/`, `lib/onboarding/demo-data-*.ts`                           |
| **Dev Tools**                | `app/(chef)/dev-tools/`                                                |
| **Soak/Stress Testing**      | `tests/soak/`, `tests/stress/`                                         |
| **Overnight Audit Scripts**  | `scripts/overnight-audit.mjs`, `scripts/coverage-overnight-runner.mjs` |
| **Email Reference Builders** | `scripts/email-references/`                                            |
| **Remy Quality Harness**     | `tests/remy-quality/`                                                  |
| **Grazing Event Scripts**    | `scripts/grazing-*.mjs`, `scripts/event-*.mjs`                         |
| **MCP Check**                | `scripts/mcp-check.ps1`                                                |
| **Cannabis Vertical**        | `lib/cannabis/` (experimental)                                         |
| **Simulation**               | `lib/simulation/`                                                      |
| **Kiosk/POS**                | `app/kiosk/`, `lib/commerce/`                                          |
| **Blog**                     | `lib/blog/`, `app/(public)/blog/`                                      |
| **Sustainability**           | `lib/sustainability/`                                                  |
| **Wellbeing**                | `lib/wellbeing/`                                                       |
| **Wine**                     | `lib/wine/`                                                            |
| **Cocktails**                | `lib/cocktails/`                                                       |
| **Raffle**                   | `lib/raffle/`                                                          |
| **Charity**                  | `lib/charity/`                                                         |
| **Stories**                  | `lib/stories/`                                                         |
| **Portfolio**                | `lib/portfolio/`                                                       |
| **Kitchen Rentals**          | `lib/kitchen-rentals/`                                                 |
| **Marketplace**              | `lib/marketplace/`                                                     |
| **Video (Remotion)**         | `lib/remotion/`                                                        |
| **Translation**              | `lib/translate/`                                                       |
| **Tauri Desktop**            | `src-tauri/` (experimental)                                            |
| **Capacitor Mobile**         | `capacitor.config.ts` (experimental)                                   |

### Cascading Failure Analysis

| If This Fails...    | Impact                                                                          |
| ------------------- | ------------------------------------------------------------------------------- |
| database connection | **Total outage.** No data, no auth, no pages load.                              |
| Middleware          | **Total outage.** No routing, no auth context.                                  |
| Auth system         | **Total outage.** No user can access any protected route.                       |
| Event FSM           | **Revenue blocked.** Can't progress events through lifecycle.                   |
| Ledger system       | **Financial blindness.** No revenue tracking, no invoices compute.              |
| Stripe webhooks     | **Payment processing halted.** Events can't transition to "paid."               |
| Ollama              | **AI features degraded.** Remy offline, AI parsing fails. Core app still works. |
| Resend (email)      | **Comms degraded.** No automated emails. Core app still works.                  |
| Gemini/Groq         | **Minor AI degradation.** Only non-private AI features affected.                |

---

## 4. Data Model and Schema

### Layer Architecture

The database schema is organized into layers, built additively through 591 migrations from 2026-02-15 to 2026-04-01.

#### Layer 1: Foundation (`20260215000001`)

Core identity and multi-tenancy.

| Table        | Purpose             | Key Columns                                                                     |
| ------------ | ------------------- | ------------------------------------------------------------------------------- |
| `chefs`      | Tenant/chef profile | `id` (PK, tenant_id reference), `name`, `email`, `business_name`, `phone`       |
| `clients`    | Client records      | `id`, `tenant_id` (FK->chefs), `name`, `email`, `phone`, `dietary_restrictions` |
| `user_roles` | Auth role mapping   | `auth_user_id`, `role` (chef/client/staff/partner), `entity_id`                 |

#### Layer 2: Inquiry & Messaging (`20260215000002`)

Lead capture and communication.

| Table             | Purpose                              |
| ----------------- | ------------------------------------ |
| `inquiries`       | Inbound event requests               |
| `conversations`   | Message threads                      |
| `messages`        | Individual messages in conversations |
| `inquiry_sources` | Where inquiries come from            |

#### Layer 3: Events, Quotes, Financials (`20260215000003`)

Core business operations.

| Table                     | Purpose                     | Key Columns                                                                                                 |
| ------------------------- | --------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `events`                  | Core business object        | `id`, `tenant_id`, `client_id`, `status` (8-state FSM), `event_date`, `location`                            |
| `quotes`                  | Pricing proposals           | `id`, `event_id`, `tenant_id`, `status`, `total_cents`                                                      |
| `quote_line_items`        | Individual quote items      | `id`, `quote_id`, `description`, `amount_cents`                                                             |
| `quote_state_transitions` | Immutable quote audit trail | Append-only, trigger-enforced                                                                               |
| `ledger_entries`          | Financial truth             | `id`, `tenant_id`, `client_id`, `event_id`, `entry_type`, `amount_cents`. **Immutable** (trigger-enforced). |
| `event_state_transitions` | Event audit trail           | Append-only, trigger-enforced                                                                               |
| `expenses`                | Business expenses           | `id`, `tenant_id`, `category`, `amount_cents`                                                               |

**`event_financial_summary` (view):** Computed from `ledger_entries`. Per-event revenue, expenses, profit, payment status. Never stored directly.

#### Layer 4: Menus, Recipes, Costing (`20260215000004`)

Culinary content management.

| Table                | Purpose                   |
| -------------------- | ------------------------- |
| `recipes`            | Chef's recipe book        |
| `recipe_ingredients` | Ingredients per recipe    |
| `ingredients`        | Master ingredient library |
| `menus`              | Event menus               |
| `menu_items`         | Items on a menu           |
| `menu_courses`       | Course organization       |
| `documents`          | Generated PDFs, contracts |

#### Layer 5+: Feature Tables (60+ subsequent migrations)

Extended feature tables using `chef_id` naming convention:

| Domain             | Tables (examples)                                           |
| ------------------ | ----------------------------------------------------------- |
| **Scheduling**     | `availability_slots`, `availability_waitlist`               |
| **Loyalty**        | `loyalty_config`, `loyalty_points`, `loyalty_tiers`         |
| **Staff**          | `staff_members`, `staff_shifts`, `staff_assignments`        |
| **Gmail/GOLDMINE** | `gmail_sync_status`, `email_classifications`, `email_leads` |
| **Reviews**        | `client_reviews`, `review_responses`                        |
| **Chat**           | `chat_messages`, `chat_attachments`                         |
| **Guest RSVP**     | `guest_rsvps`, `guest_dietary_info`                         |
| **Network**        | `chef_friends`, `chef_referrals`                            |
| **Contracts**      | `contracts`, `contract_templates`                           |
| **Equipment**      | `equipment_inventory`, `equipment_maintenance`              |
| **Commerce**       | `commerce_products`, `commerce_sales`, `kiosk_sessions`     |
| **Campaigns**      | `campaigns`, `campaign_contacts`, `campaign_sequences`      |
| **Prospecting**    | `prospects`, `prospect_outreach_log`                        |
| **Todos**          | `chef_todos`                                                |
| **Travel**         | `travel_routes`, `travel_expenses`                          |
| **Push**           | `push_subscriptions`                                        |
| **Notifications**  | `notification_preferences`, `notification_log`              |

### Immutability Constraints (Database Triggers)

Three tables have **immutability triggers** that prevent UPDATE/DELETE:

1. **`ledger_entries`** - Financial transactions are append-only. Corrections are made by appending reversal entries.
2. **`event_state_transitions`** - Event lifecycle audit trail. Cannot be modified after creation.
3. **`quote_state_transitions`** - Quote lifecycle audit trail. Cannot be modified after creation.

### Row Level Security (RLS)

Every table with tenant data has RLS policies enforcing:

- Chef can only see rows where `tenant_id = auth.uid()` (or resolved through `user_roles`)
- Client can only see rows related to their `client_id` within their chef's tenant
- Staff can only see rows within their assigned chef's tenant
- Service role bypasses RLS (used by webhooks, cron jobs)

### Financial Model

```
All monetary values are in CENTS (integer, minor units).

Revenue = SUM(ledger_entries WHERE entry_type IN ('payment','deposit','installment','final_payment','tip','add_on'))
Refunds = SUM(ledger_entries WHERE is_refund = true)
Net Revenue = Revenue - Refunds

Expenses are tracked separately in the expenses table.
Profit = Net Revenue - Expenses

Per-event financials are computed via the event_financial_summary view.
Aggregate financials via getTenantFinancialSummary() in lib/ledger/compute.ts.

NEVER store computed balances. Always derive from ledger.
```

---

## 5. Business Logic and Core Workflows

### Event Lifecycle (8-State FSM)

```
draft -----> proposed -----> accepted -----> paid -----> confirmed -----> in_progress -----> completed
  |             |               |              |             |                |
  +------+------+-------+------+------+-------+------+------+                |
         |              |             |              |                        |
         v              v             v              v                        v
      cancelled      cancelled    cancelled      cancelled               cancelled

Special: draft -> paid (instant-book via Stripe webhook, skips proposed/accepted)
```

**State transition permissions:**

| Transition               | Who Can Trigger                      |
| ------------------------ | ------------------------------------ |
| draft -> proposed        | Chef                                 |
| proposed -> accepted     | Client                               |
| proposed -> cancelled    | Chef or Client                       |
| accepted -> cancelled    | Chef or Client                       |
| accepted -> paid         | System (Stripe webhook only)         |
| draft -> paid            | System (instant-book Stripe webhook) |
| paid -> confirmed        | Chef                                 |
| confirmed -> in_progress | Chef                                 |
| in_progress -> completed | Chef                                 |
| \* -> cancelled          | Chef (any non-terminal state)        |

**Enforcement:** `lib/events/transitions.ts` validates every transition server-side. Invalid transitions throw. Every transition is logged to `event_state_transitions` (immutable).

### Quote Lifecycle

Quotes have their own state machine with transitions logged to `quote_state_transitions`. Quotes are linked to events and contain line items with amounts in cents.

### Ledger Operations

1. **Append only.** `appendLedgerEntryForChef()` for chef-initiated entries, `appendLedgerEntryInternal()` for webhook/system entries.
2. **Idempotency.** `transaction_reference` field prevents duplicate Stripe webhook processing.
3. **Entry types:** payment, deposit, installment, final_payment, tip, refund, adjustment, add_on, credit.
4. **Payment methods:** cash, venmo, paypal, zelle, card, check.

### Billing/Tier System

```
lib/billing/
  tier.ts          -- Legacy tier-resolution support
  modules.ts       -- Module definitions (feature groupings)
  pro-features.ts  -- Legacy Pro feature registry retained for compatibility
  require-pro.ts   -- Compatibility wrapper; no longer hard-enforces paid access

components/billing/
  upgrade-gate.tsx -- Compatibility wrapper; currently pass-through UI gate

Admins bypass legacy tier restrictions.
```

**Current interpretation:**

1. The repo still contains legacy tier and Pro-era naming.
2. `requirePro('module-slug')` is currently a compatibility wrapper around chef auth, not an active hard paywall.
3. `<UpgradeGate>` is currently a pass-through wrapper retained so old call sites continue to compile.
4. Product-facing monetization language should follow `docs/project-definition-and-scope.md` and `docs/monetization-shift.md`, not the older tier-era assumptions in this manual.

### AI Policy (Canonical: `docs/AI_POLICY.md`)

1. AI assists thinking and drafting. AI never owns truth.
2. AI never mutates canonical state (no lifecycle transitions, no ledger writes).
3. All AI output requires chef confirmation before becoming canonical.
4. Recipes are NEVER generated by AI. AI can only search the chef's existing recipe book.
5. Formula > AI always. If deterministic code can produce the correct result, use it over AI.

---

## 6. AI System Architecture

### Three-Provider Model

| Provider            | Where                      | Privacy                       | Cost                | Latency            |
| ------------------- | -------------------------- | ----------------------------- | ------------------- | ------------------ |
| **Ollama** (local)  | `lib/ai/parse-ollama.ts`   | LOCAL ONLY - all private data | Free                | Medium (local GPU) |
| **Gemini** (Google) | `lib/ai/gemini-service.ts` | Cloud-safe only - no PII      | Paid                | Low                |
| **Groq**            | `lib/ai/parse-groq.ts`     | Cloud-safe only - no PII      | Free (rate-limited) | Very low           |

### AI Dispatch Layer (`lib/ai/dispatch/`)

```
Input
  |
  v
Privacy Gate --> detects private data categories
  |
  v
Classifier --> determines task class (DETERMINISTIC, MECHANICAL_SAFE, PRIVATE_PARSE, etc.)
  |
  v
Routing Table --> maps task class to provider chain (primary -> secondary -> fallback)
  |
  v
Router --> executes with failover
  |
  v
Cost Tracker --> logs usage metrics
```

**Privacy categories that MUST stay local (Ollama):**

- Client PII (names, emails, phones, addresses)
- Dietary/allergy data (safety-critical)
- Financial data (quotes, invoices, revenue)
- Conversational data (chat messages, inquiries)
- Chef business data (pricing, client lists, lead scores)
- Contracts/legal documents
- Staff data (names, schedules, pay rates)

**HARD_FAIL policy:** Private data NEVER falls back to cloud providers. If Ollama is offline, the feature fails with a visible error.

### Remy AI Concierge

**Pipeline (3 classification layers):**

1. **Guardrails** (`lib/ai/remy-input-validation.ts`) - Blocks dangerous actions (recipe generation, lifecycle mutations, ledger writes)
2. **Classifier** (`lib/ai/remy-classifier.ts`) - Routes to command/question/mixed
3. **Intent Parser** (`lib/ai/command-intent-parser.ts`) - Maps commands to task types

**Orchestration:** `lib/ai/command-orchestrator.ts` - Executes parsed commands against the database

**Restricted Actions:** `lib/ai/agent-actions/restricted-actions.ts` - Permanently blocked: `agent.create_recipe`, `agent.update_recipe`, `agent.add_ingredient`

**UI:** `components/ai/remy-drawer.tsx` - Slide-out chat drawer. Conversations stored in browser IndexedDB (Level 3 privacy - never on servers).

### AI Queue System (`lib/ai/queue/`)

- Request queue with priority ordering
- Circuit breakers per provider
- Interactive lock (user-initiated requests get priority)
- Task timeouts
- Cooldown: 250ms between requests
- SLA targets: Success > 95%, p95 < 5s, p99 < 10s, throughput > 2 req/s

### Ollama Model Lineup

| Model           | Slug     | Use Case                      | VRAM          |
| --------------- | -------- | ----------------------------- | ------------- |
| qwen3:4b        | Fast     | Quick parsing, classification | Fits in 6GB   |
| qwen3-coder:30b | Standard | Code-related, complex parsing | GPU+RAM split |
| qwen3:30b       | Complex  | Deep analysis, generation     | GPU+RAM split |

### AI Files by Provider

**Ollama (private data):**

- `lib/ai/parse-recipe.ts` - Recipe text parsing
- `lib/ai/parse-brain-dump.ts` - Natural language note parsing
- `lib/ai/aar-generator.ts` - After-action review generation
- `lib/ai/contingency-ai.ts` - Contingency planning
- `lib/ai/grocery-consolidation.ts` - Shopping list consolidation
- `lib/ai/equipment-depreciation-explainer.ts` - Equipment analysis
- `lib/ai/chef-bio.ts` - Chef bio generation
- `lib/ai/contract-generator.ts` - Contract drafting
- `lib/ai/remy-actions.ts` - Remy conversational processing
- `lib/ai/campaign-outreach.ts` (`draftPersonalizedOutreach`) - Personalized client outreach

**Gemini (cloud-safe):**

- `lib/ai/gemini-service.ts` - Generic culinary content, technique lists
- `lib/ai/campaign-outreach.ts` (`draftCampaignConcept`) - Generic marketing themes

**Groq (cloud-safe):**

- `lib/ai/parse-groq.ts` - Structured parsing for non-private tasks

---

## 7. Security and Access Control

### Authentication Flow

1. **Auth.js** handles user registration, login, password reset, OAuth (Google)
2. **Middleware** (`middleware.ts`) runs on every request:
   - Creates PostgreSQL server client with cookie-based session
   - Calls `database.auth.getUser()` to validate session
   - Queries `user_roles` table for role and entity_id
   - Sets role cookie (5min TTL, httpOnly, secure in production, sameSite: lax)
   - Propagates auth context via request headers
3. **Server actions** use `requireChef()`, `requireClient()`, `requireAuth()` to re-validate

### Role System

| Role      | Entity             | Home Route           | Access                                          |
| --------- | ------------------ | -------------------- | ----------------------------------------------- |
| `chef`    | `chefs.id`         | `/dashboard`         | Full chef portal, admin features if `isAdmin()` |
| `client`  | `clients.id`       | `/my-events`         | Client portal only                              |
| `staff`   | `staff_members.id` | `/staff-dashboard`   | Staff portal only                               |
| `partner` | Partner entity     | `/partner/dashboard` | Partner portal only                             |

**Admin:** Determined by `isAdmin()` function (checks specific user IDs or flags). Admins get full Pro access and can access `(admin)` routes and admin-only features like Prospecting.

### Tenant Isolation

- **Every database query** is scoped to `tenant_id` (or `chef_id` for feature tables)
- **tenant_id always from session**, never from request body: `user.tenantId!`
- **RLS policies** enforce at the database level as a second line of defense
- **Service role** used only for webhooks and system operations (bypasses RLS)

### Route Protection

Defined in `lib/auth/route-policy.ts`:

| Category                     | Behavior                                                     |
| ---------------------------- | ------------------------------------------------------------ |
| Public asset paths           | Bypass completely (static files, images, manifest)           |
| API skip-auth paths          | Bypass auth (health checks, public APIs, embed, webhooks)    |
| Public unauthenticated paths | Bypass auth (landing page, pricing, blog, auth pages, embed) |
| Chef routes `(chef)/`        | Require `role === 'chef'`                                    |
| Client routes `(client)/`    | Require `role === 'client'`                                  |
| Staff routes `(staff)/`      | Require `role === 'staff'`                                   |

### Rate Limiting

- **Upstash Redis** (`@upstash/ratelimit`) for API rate limiting
- Applied to public-facing endpoints (embed inquiry, public APIs)
- Configuration via environment variables

### Security Headers & CSP

- Standard Next.js security headers
- Embed routes (`/embed/*`) have relaxed CSP (`frame-ancestors *`) to allow embedding in third-party sites
- Webhook routes validate signatures (Stripe signature verification)

### Input Validation

- **Zod schemas** for all server action inputs (`lib/validation/schemas.ts`)
- **TransitionEventInputSchema** validates FSM transition inputs
- **Remy input validation** blocks dangerous AI commands before they reach the LLM
- **Ledger entries** validate amounts are integers (cents only)

### Privacy Architecture

- **Ollama-only for private data** - client PII, financials, allergies never leave the local machine
- **IndexedDB for Remy conversations** - chat history stays in browser, never on server
- **No cloud LLM fallback** for private data - `OllamaOfflineError` thrown, feature hard-fails
- **GOLDMINE email data** processed locally via Ollama

---

## 8. External Integrations

### Stripe (Payments)

| Component        | File                                       | Purpose                                               |
| ---------------- | ------------------------------------------ | ----------------------------------------------------- |
| Webhook handler  | `app/api/webhooks/stripe/route.ts`         | Processes payment events, triggers FSM transitions    |
| Connect flow     | `app/api/stripe/connect/callback/route.ts` | Stripe Connect onboarding for chefs                   |
| Client library   | `lib/stripe/`                              | Stripe SDK wrapper, invoice creation, payment intents |
| React components | `components/stripe/`                       | Payment forms, Connect UI                             |

**Flow:** Client pays -> Stripe webhook -> `transitionEvent({ systemTransition: true })` -> event moves to "paid" -> ledger entry created

### PostgreSQL

| Component      | File                     | Purpose                                                    |
| -------------- | ------------------------ | ---------------------------------------------------------- |
| Server client  | `lib/database/server.ts` | Creates server-side database client (with cookie handling) |
| Browser client | `lib/database/client.ts` | Creates client-side database client                        |
| Admin client   | `lib/database/admin.ts`  | Service role client (bypasses RLS)                         |
| Realtime       | `lib/realtime/`          | SSE realtime subscriptions for live updates                |

### Email (Resend)

| Component                 | Purpose                            |
| ------------------------- | ---------------------------------- |
| `lib/email/`              | Email sending, template rendering  |
| `@react-email/components` | JSX email templates                |
| Webhook                   | `app/api/webhooks/resend/route.ts` |
| Sender name               | "CheFlow" (intentional branding)   |

### Gmail (GOLDMINE Intelligence)

| Component                     | Purpose                                        |
| ----------------------------- | ---------------------------------------------- |
| `lib/gmail/`                  | Gmail API sync                                 |
| `lib/intelligence/`           | GOLDMINE email classification and lead scoring |
| `app/api/gmail/sync/route.ts` | Sync trigger endpoint                          |
| Sync status                   | `gmail_sync_status` table                      |

**GOLDMINE:** Deterministic extraction + 0-100 lead scoring. Zero Ollama dependency (pure formula-based).

### Google Maps

| Component                     | Purpose                                 |
| ----------------------------- | --------------------------------------- |
| `lib/geocoding/`, `lib/maps/` | Address geocoding, distance calculation |
| `@react-google-maps/api`      | Map display in event detail             |

### Grocery APIs

| Provider    | Purpose                    |
| ----------- | -------------------------- |
| Spoonacular | Ingredient data, nutrition |
| Kroger      | Grocery pricing            |
| MealMe      | Meal delivery pricing      |
| Instacart   | Grocery delivery pricing   |

### Other Integrations

| Integration       | Status                | Files                                                     |
| ----------------- | --------------------- | --------------------------------------------------------- |
| DocuSign          | Connector             | `app/api/integrations/docusign/`                          |
| QuickBooks        | Connector             | `app/api/integrations/quickbooks/`                        |
| Square            | Connector             | `app/api/integrations/square/`                            |
| Zapier            | Webhook subscriber    | `app/api/integrations/zapier/`                            |
| Wix               | Webhook + processor   | `app/api/webhooks/wix/`, `app/api/scheduled/wix-process/` |
| Twilio            | SMS webhooks          | `app/api/webhooks/twilio/`, `lib/sms/`                    |
| Instagram         | Social connect        | `app/api/social/instagram/`                               |
| Google Business   | Social connect        | `app/api/social/google/`                                  |
| PostHog           | Product analytics     | `posthog-js` client-side                                  |
| Sentry            | Error monitoring      | `@sentry/nextjs`                                          |
| Inngest           | Background jobs       | `app/api/inngest/route.ts`                                |
| Web Push          | Browser notifications | `lib/push/`, VAPID keys                                   |
| Cloudflare Tunnel | Beta server exposure  | Windows service -> beta.cheflowhq.com                     |

---

## 9. Testing and Quality Assurance

### Test Infrastructure

| Type                  | Command                         | Config                     | Count                         |
| --------------------- | ------------------------------- | -------------------------- | ----------------------------- |
| **Unit Tests**        | `npm run test:unit`             | Node.js test runner + tsx  | ~50+ files                    |
| **E2E Tests**         | `npm run test:e2e`              | Playwright                 | ~100+ specs                   |
| **Smoke Tests**       | `npm run test:e2e:smoke`        | Playwright (smoke project) | Quick validation              |
| **Coverage Tests**    | `npm run test:coverage`         | Playwright (6 projects)    | Route coverage                |
| **Soak Tests**        | `npm run test:soak`             | Playwright + CDP           | Memory/DOM leak detection     |
| **Stress Tests**      | `npm run test:stress:ollama`    | Playwright                 | AI queue load testing         |
| **Remy Quality**      | `npm run test:remy-quality:all` | Custom harness             | AI response quality           |
| **Interaction Tests** | `npm run test:interactions`     | Playwright                 | UI interaction coverage       |
| **Journey Tests**     | `npm run test:journey`          | Playwright                 | Full user journeys            |
| **Isolation Tests**   | `npm run test:isolation`        | Playwright                 | Tenant isolation verification |

### Playwright Projects

The Playwright config defines multiple test projects:

- `smoke` - Quick health check
- `chef` - Chef portal E2E
- `client` - Client portal E2E
- `cross-portal` - Cross-role interactions
- `coverage-*` - Route coverage (public, chef, client, admin, auth-boundaries, api)
- `interactions-*` - UI interaction testing
- `journey-chef` - Full chef journey simulation
- `isolation-tests` - Multi-tenant isolation

### Soak Testing

Measures over 100+ repeated navigation loops:

- JS heap memory growth
- DOM node count growth
- Console error detection
- Cycle time degradation

**Thresholds:** Memory > 3x baseline = fail, DOM > 2x = fail, any console errors = fail, cycle time > 2x = fail.

### Quality Gates

| Gate       | Command                                                                | When                         |
| ---------- | ---------------------------------------------------------------------- | ---------------------------- |
| TypeScript | `npx tsc --noEmit --skipLibCheck`                                      | Before merge to main         |
| Build      | `npx next build --no-lint`                                             | Before merge to main         |
| Unit tests | `npm run test:unit`                                                    | Before merge to main         |
| Cron guard | `node --test --import tsx tests/unit/cron-monitoring-coverage.test.ts` | When touching scheduled jobs |
| Smoke E2E  | `npm run test:e2e:smoke`                                               | Before merge to main         |
| AI stress  | `npm run test:stress:ollama` (3 modes)                                 | If AI/queue changes          |
| Formatting | `prettier --check` (via lint-staged + Husky pre-commit)                | Every commit                 |

### Audit Scripts

| Script                                 | Purpose                                                |
| -------------------------------------- | ------------------------------------------------------ |
| `scripts/audit-model-routing.ts`       | Detects direct AI provider imports (must use dispatch) |
| `scripts/audit-chef-nav.ts`            | Validates nav config consistency                       |
| `scripts/audit-a11y-markup.mjs`        | Accessibility markup audit                             |
| `scripts/audit-notifications.mjs`      | Notification system completeness                       |
| `scripts/db-integrity-audit.mjs`       | Database integrity checks                              |
| `scripts/goldmine-audit.mjs`           | GOLDMINE email intelligence audit                      |
| `scripts/secret-scan.mjs`              | Scans for exposed secrets                              |
| `scripts/payments-readiness-check.mjs` | Payment system readiness                               |

---

## 10. Infrastructure and Deployment

### Three-Environment Architecture

```
Development:  localhost:3100  (next dev, hot reload)
Beta:         localhost:3200  (next start, Cloudflare Tunnel -> beta.cheflowhq.com)
Production:   Self-hosted     (app.cheflowhq.com, Cloudflare Tunnel)
```

### Development Environment

- **Port:** 3100
- **Command:** `npm run dev` (next dev -p 3100 -H 0.0.0.0)
- **Hot reload:** Yes
- **Database:** Remote PostgreSQL (shared with beta)
- **AI:** Local Ollama on port 11434

### Beta Environment

- **Port:** 3200
- **Directory:** `C:\Users\david\Documents\CFv1-beta\`
- **Process:** `next start -p 3200` (auto-starts via Windows Task Scheduler)
- **Tunnel:** Cloudflare Tunnel (Windows service) -> `beta.cheflowhq.com`
- **Deploy:** `bash scripts/deploy-beta.sh` (~2 min)
  - Pushes to GitHub
  - Syncs code to CFv1-beta
  - Builds locally with 12GB heap
  - Swaps builds atomically
  - Restarts beta on port 3200
  - Health check with auto-rollback on failure
- **Rollback:** `bash scripts/rollback-beta.sh`
- **Env:** `.env.local.beta` -> copied as `.env.local` during deploy

### Production (Self-hosted)

- **Domain:** app.cheflowhq.com
- **Deploy trigger:** `bash scripts/deploy-beta.sh` (or equivalent production deploy script)
- **NEVER push to main** without explicit developer approval

### Developer's Hardware

| Spec       | Value                                                              |
| ---------- | ------------------------------------------------------------------ |
| CPU        | AMD Ryzen 9 7900X (12c/24t @ 4.7 GHz)                              |
| RAM        | 128 GB DDR5                                                        |
| GPU        | NVIDIA RTX 3050 (6 GB VRAM, CUDA 12.6)                             |
| OS         | Windows 11 Home                                                    |
| Bottleneck | 6 GB VRAM limits full-GPU to ~7B models; 30B MoE via GPU+RAM split |

### Mission Control

- **Port:** 41937
- **Entry:** `scripts/launcher/index.html`
- **Server:** `scripts/launcher/server.mjs`
- **Features:** Gustav AI chat, codebase scanner, file watcher, port monitor, quick links
- **Keyboard shortcut:** `0` for Infra panel

### Key Scripts

| Script                                  | Purpose                             |
| --------------------------------------- | ----------------------------------- |
| `scripts/deploy-beta.sh`                | Full beta deploy pipeline           |
| `scripts/rollback-beta.sh`              | Beta rollback to previous commit    |
| `scripts/start-beta.ps1`                | Beta server auto-start              |
| `scripts/run-next-build.mjs`            | Custom build wrapper                |
| `scripts/run-typecheck.mjs`             | TypeScript check with custom config |
| `scripts/verify-release.mjs`            | Release verification suite          |
| `scripts/coverage-overnight-runner.mjs` | Overnight test coverage             |
| `scripts/ollama-control.mjs`            | Ollama management                   |
| `scripts/setup-agent-account.ts`        | Agent test account setup            |
| `scripts/setup-demo-accounts.ts`        | Demo account setup                  |
| `scripts/secret-scan.mjs`               | Security: scan for exposed secrets  |

---

## 11. API Surface

### API Route Categories (135 total)

#### Authentication & Identity

| Route                              | Method | Purpose                 |
| ---------------------------------- | ------ | ----------------------- |
| `api/e2e/auth`                     | POST   | E2E test authentication |
| `api/auth/google/connect/callback` | GET    | Google OAuth callback   |

#### AI & Remy

| Route               | Purpose                           |
| ------------------- | --------------------------------- |
| `api/remy/stream`   | Remy AI streaming responses       |
| `api/remy/client`   | Client-facing Remy                |
| `api/remy/public`   | Public-facing Remy (landing page) |
| `api/remy/landing`  | Landing page AI                   |
| `api/remy/warmup`   | Pre-warm Ollama                   |
| `api/ai/health`     | AI system health check            |
| `api/ai/monitor`    | AI monitoring dashboard           |
| `api/ai/wake`       | Wake Ollama from sleep            |
| `api/ollama-status` | Ollama status check               |

#### Documents (PDF Generation)

| Route                                       | Purpose             |
| ------------------------------------------- | ------------------- |
| `api/documents/[eventId]`                   | Event document pack |
| `api/documents/[eventId]/bulk-generate`     | Bulk PDF generation |
| `api/documents/invoice/[eventId]`           | Invoice HTML        |
| `api/documents/invoice-pdf/[eventId]`       | Invoice PDF         |
| `api/documents/quote/[quoteId]`             | Quote PDF           |
| `api/documents/quote-client/[quoteId]`      | Client-facing quote |
| `api/documents/receipt/[eventId]`           | Receipt             |
| `api/documents/contract/[contractId]`       | Contract PDF        |
| `api/documents/financial-summary/[eventId]` | Financial summary   |
| `api/documents/foh-menu/[eventId]`          | Front-of-house menu |
| `api/documents/templates/[template]`        | Template rendering  |

#### Webhooks (Inbound)

| Route                     | Source                  |
| ------------------------- | ----------------------- |
| `api/webhooks/stripe`     | Stripe payment events   |
| `api/webhooks/resend`     | Email delivery events   |
| `api/webhooks/twilio`     | SMS events              |
| `api/webhooks/docusign`   | DocuSign events         |
| `api/webhooks/wix`        | Wix events              |
| `api/webhooks/[provider]` | Generic webhook handler |

#### Scheduled/Cron Jobs

| Route                          | Purpose                              |
| ------------------------------ | ------------------------------------ |
| `api/cron/morning-briefing`    | Daily morning briefing               |
| `api/cron/brand-monitor`       | Brand mention monitoring             |
| `api/cron/cooling-alert`       | Client relationship cooling alerts   |
| `api/cron/momentum-snapshot`   | Business momentum tracking           |
| `api/cron/recall-check`        | Food recall monitoring               |
| `api/cron/renewal-reminders`   | Subscription renewal reminders       |
| `api/cron/account-purge`       | Inactive account cleanup             |
| `api/cron/circle-digest`       | Community digest                     |
| `api/cron/quarterly-checkin`   | Quarterly check-in triggers          |
| `api/cron/developer-digest`    | Daily developer system-health digest |
| `api/scheduled/*` (20+ routes) | Various scheduled tasks              |

#### Health & Monitoring

| Route                         | Purpose                                           |
| ----------------------------- | ------------------------------------------------- |
| `api/health`                  | Primary health check                              |
| `api/health/readiness`        | Readiness probe                                   |
| `api/health/ping`             | Simple ping                                       |
| `api/scheduled/monitor`       | Authenticated cron health report and alert router |
| `api/system/health`           | System health dashboard                           |
| `api/system/heal`             | Self-healing endpoint                             |
| `api/monitoring/report-error` | Client-side error reporting                       |

Background-job health is driven by the shared registry in `lib/cron/definitions.ts` and the report builder in `lib/cron/monitor.ts`, which are also consumed by readiness and the developer digest.

#### Public/Embed

| Route                      | Purpose                              |
| -------------------------- | ------------------------------------ |
| `api/embed/inquiry`        | Embeddable widget inquiry submission |
| `api/public/client-lookup` | Public client lookup                 |
| `api/v1/clients`           | V1 API: clients                      |
| `api/v1/events`            | V1 API: events                       |

#### Integrations

| Route                                  | Purpose                 |
| -------------------------------------- | ----------------------- |
| `api/integrations/[provider]/connect`  | OAuth connect flow      |
| `api/integrations/[provider]/callback` | OAuth callback          |
| `api/integrations/connect`             | Generic connection      |
| `api/social/google/*`                  | Google Business Profile |
| `api/social/instagram/*`               | Instagram integration   |
| `api/gmail/sync`                       | Gmail sync trigger      |

#### Commerce/Kiosk

| Route                  | Purpose                |
| ---------------------- | ---------------------- |
| `api/kiosk/pair`       | Kiosk device pairing   |
| `api/kiosk/order/*`    | POS order management   |
| `api/kiosk/heartbeat`  | Kiosk health           |
| `api/kiosk/verify-pin` | Staff PIN verification |

#### Notifications

| Route                       | Purpose                        |
| --------------------------- | ------------------------------ |
| `api/push/subscribe`        | Push notification subscription |
| `api/push/unsubscribe`      | Unsubscribe                    |
| `api/push/resubscribe`      | Resubscribe                    |
| `api/push/vapid-public-key` | VAPID key for web push         |
| `api/notifications/send`    | Send notification              |

---

## 12. UI Component Inventory

### Design System Primitives (`components/ui/`)

| Component      | Variants                               | Notes                                 |
| -------------- | -------------------------------------- | ------------------------------------- |
| `Button`       | primary, secondary, danger, ghost      | NO outline, default, warning, success |
| `Badge`        | default, success, warning, error, info | Standard status indicators            |
| `Input`        | Standard HTML input wrapper            | With label, error state               |
| `Textarea`     | Standard textarea wrapper              |                                       |
| `Select`       | Custom select component                |                                       |
| `Dialog/Modal` | Standard modal                         |                                       |
| `Sheet`        | Side panel (drawer)                    |                                       |
| `Toast`        | Via Sonner                             | success, error, info                  |
| `Tabs`         | Tab navigation                         |                                       |
| `Card`         | Content container                      |                                       |
| `Table`        | Data table                             |                                       |
| `Dropdown`     | Dropdown menu                          |                                       |
| `Tooltip`      | Hover tooltip                          |                                       |
| `Skeleton`     | Loading placeholder                    |                                       |
| `Collapsible`  | Expandable section                     |                                       |

### Major Component Categories

| Category                 | Count             | Key Components                                          |
| ------------------------ | ----------------- | ------------------------------------------------------- |
| `components/events/`     | Event management  | event-form, event-transitions, event-detail, event-list |
| `components/clients/`    | Client CRM        | client-form, client-detail, onboarding-form             |
| `components/dashboard/`  | Dashboard widgets | collapsible-widget, dashboard-quick-settings            |
| `components/quotes/`     | Quote builder     | quote-form, quote-line-items                            |
| `components/ai/`         | AI interfaces     | remy-drawer, remy-concierge-widget                      |
| `components/calendar/`   | Calendar views    | FullCalendar wrapper                                    |
| `components/billing/`    | Billing/tier      | upgrade-gate, subscription management                   |
| `components/documents/`  | Document views    | PDF viewers, generators                                 |
| `components/email/`      | Email templates   | React Email components                                  |
| `components/embed/`      | Embeddable widget | embed-inquiry-form                                      |
| `components/public/`     | Landing page      | remy-concierge-section, workflow-steps                  |
| `components/navigation/` | Nav structure     | chef-nav, nav-config                                    |
| `components/onboarding/` | Onboarding flow   | demo-data-manager, tour guides                          |
| `components/settings/`   | Settings pages    | Various settings panels                                 |
| `components/shared/`     | Shared utilities  | Common components across portals                        |

### Remy Widget Architecture

`components/public/remy-concierge-widget.tsx`:

- Drag-to-resize on all edges AND all four corners (permanent rule)
- Corner handles: 16px hit area, z-30
- Edge handles: inset from corners (left-4 right-4 / top-4 bottom-4), z-20
- Never shrink corner hit areas or lower z-index

---

## 13. Configuration Reference

### Key Configuration Files

| File                          | Purpose                                                     |
| ----------------------------- | ----------------------------------------------------------- |
| `next.config.mjs`             | Next.js config (redirects, headers, image domains, webpack) |
| `tsconfig.json`               | TypeScript config (strict mode, paths)                      |
| `tsconfig.ci.json`            | CI TypeScript config                                        |
| `tsconfig.web-beta.json`      | Web beta release TypeScript config                          |
| `tsconfig.scripts.json`       | Scripts TypeScript config                                   |
| `tailwind.config.ts`          | Tailwind theme (brand colors, fonts, breakpoints)           |
| `postcss.config.js`           | PostCSS config                                              |
| `.prettierrc`                 | Prettier formatting rules                                   |
| `.prettierignore`             | Prettier ignore patterns                                    |
| `.eslintrc.json`              | ESLint config                                               |
| `playwright.config.ts`        | Main Playwright config                                      |
| `playwright.soak.config.ts`   | Soak test config                                            |
| `playwright.stress.config.ts` | Stress test config                                          |
| `capacitor.config.ts`         | Capacitor (mobile, experimental)                            |

### Environment Variables (Key Categories)

| Category       | Variables                                                                                      |
| -------------- | ---------------------------------------------------------------------------------------------- |
| **PostgreSQL** | `NEXT_PUBLIC_DATABASE_URL`, `NEXT_PUBLIC_DATABASE_ANON_KEY`, `DATABASE_SERVICE_ROLE_KEY`       |
| **Stripe**     | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`             |
| **Resend**     | `RESEND_API_KEY`                                                                               |
| **Google**     | `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_MAPS_API_KEY`                              |
| **Ollama**     | `OLLAMA_BASE_URL` (cloud endpoint in prod; defaults to localhost:11434 in dev), `OLLAMA_MODEL` |
| **Gemini**     | `GOOGLE_GENERATIVE_AI_API_KEY`                                                                 |
| **Groq**       | `GROQ_API_KEY`                                                                                 |
| **Sentry**     | `SENTRY_DSN`, `SENTRY_AUTH_TOKEN`                                                              |
| **PostHog**    | `NEXT_PUBLIC_POSTHOG_KEY`                                                                      |
| **Upstash**    | `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`                                           |
| **Push**       | `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`                                                        |
| **Twilio**     | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`                                                      |
| **Inngest**    | `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`                                                     |
| **App**        | `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SITE_URL`                                                  |
| **PWA**        | `ENABLE_PWA_BUILD` (only when =1)                                                              |

Full reference: `docs/environment-variables.md`

### npm Scripts (Key Categories)

| Category            | Scripts                                                                                     |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Dev**             | `dev`, `build`, `start`, `lint`, `format`                                                   |
| **TypeCheck**       | `typecheck`, `typecheck:app`, `typecheck:web-beta`, `typecheck:scripts`                     |
| **Database**        | `database:*` (start, stop, link, push, reset, types)                                        |
| **Testing**         | `test:unit`, `test:e2e`, `test:e2e:smoke`, `test:coverage`, `test:soak`, `test:stress:*`    |
| **AI Testing**      | `test:remy-quality:*` (9 suites), `qa:remy:delivery`                                        |
| **Verification**    | `verify:release`, `verify:database`, `verify:secrets`, `verify:payments`                    |
| **Demo**            | `demo:setup`, `demo:load`, `demo:clear`, `demo:reset`, `demo:auth`, `demo:full`             |
| **Audit**           | `audit:overnight`, `audit:a11y:markup`, `audit:notifications`, `audit:db`, `audit:goldmine` |
| **Beta**            | `beta`, `beta:quick`, `beta:named`, `beta:build`                                            |
| **Ops**             | `ops:packet`, `ops:task-board`, `ops:prefill`, `ops:reconcile`, `ops:bundle`                |
| **Email**           | `email:build:*`, `email:eval:*`, `email:quality:*`                                          |
| **Mission Control** | `dashboard`                                                                                 |

---

## 14. Known Limitations and Technical Debt

### Build Configuration

- **`ignoreBuildErrors: true`** in next.config - TypeScript errors don't fail the build. Every type error is a potential runtime crash. Resolution tracked in `docs/production-launch-execution-plan.md`.

### Database

- **Dev and beta share one database project.** Production needs its own project before launch. Tracked in production launch plan.
- **`types/database.ts` can become stale.** Must regenerate after schema changes via `drizzle-kit introspect typescript --linked`.

### Codebase Scale

- **879K lines of TypeScript** across 4,030 files. Some modules may have low usage or be experimental.
- **220 lib modules** - some overlap (e.g., `lib/follow-up/` and `lib/followup/`, `lib/chef/` and `lib/chefs/`).
- **591 migrations** - archived migrations exist in `database/migrations/archive/`.

### AI Limitations

- **6 GB VRAM** limits full-GPU inference to ~7B models. 30B models use GPU+RAM split (slower).
- **Ollama dependency** for all private data features. If Ollama is down, AI features hard-fail.
- **Groq rate limits** may throttle during heavy usage.

### Known Gotchas

| Issue                                                | Workaround                                    |
| ---------------------------------------------------- | --------------------------------------------- |
| Stale `.next` cache causes webpack errors            | Delete `.next/` before rebuild                |
| `next build` can exit 0 on webpack errors            | Check `.next/BUILD_ID` exists after build     |
| `'use server'` files can only export async functions | Never `export const` from server action files |
| PWA only active when `ENABLE_PWA_BUILD=1`            | Disabled by default                           |
| Multi-agent concurrent builds corrupt `.next/`       | Only one agent builds at a time               |
| TypeScript compiler conflicts in multi-agent         | Only one agent runs `tsc` at a time           |

### Production Launch Blockers

Full checklist in `docs/production-launch-execution-plan.md`:

1. Resolve all type errors (remove `ignoreBuildErrors: true`)
2. Create separate production the database project
3. Production auth configuration (Google OAuth, email templates)
4. Verify RLS policies on all tables
5. Production environment variables configured
6. Security audit (secret scanning, vulnerability assessment)

---

## Appendix: Module Registry

### Complete `lib/` Module Listing (220 modules)

Organized by domain relevance and tier:

#### TIER 1 - Critical Infrastructure

`auth/`, `events/`, `ledger/`, `quotes/`, `database/`, `stripe/`, `billing/`, `validation/`, `errors/`, `security/`

#### TIER 2 - Core Business

`clients/`, `inquiries/`, `leads/`, `pipeline/`, `payments/`, `finance/`, `menus/`, `recipes/`, `ingredients/`, `calendar/`, `email/`, `notifications/`, `push/`, `documents/`, `ai/`, `dashboard/`, `client-portal/`, `client-dashboard/`, `formulas/`, `grocery/`

#### TIER 3 - Feature Modules

`staff/`, `staffing/`, `shifts/`, `stations/`, `analytics/`, `reports/`, `gmail/`, `intelligence/`, `prospecting/`, `campaigns/`, `marketing/`, `travel/`, `operations/`, `daily-ops/`, `briefing/`, `reviews/`, `aar/`, `guests/`, `guest-leads/`, `guest-comms/`, `guest-messages/`, `guest-photos/`, `guest-analytics/`, `contracts/`, `equipment/`, `inventory/`, `loyalty/`, `community/`, `network/`, `testimonials/`, `proposals/`, `automations/`, `workflow/`, `chat/`, `messages/`, `realtime/`, `onboarding/`, `demo/`, `social/`, `prep/`, `recurring/`, `retainers/`, `revenue-goals/`, `goals/`, `tax/`, `expenses/`, `scheduling/`, `availability/`, `booking/`, `search/`, `import/`, `exports/`, `follow-up/`, `followup/`, `templates/`, `notes/`, `activity/`, `todos/`, `checklist/`, `links/`, `sharing/`, `front-of-house/`, `dietary/`, `nutrition/`, `ocr/`, `qr/`, `print/`, `maps/`, `geocoding/`, `geo/`, `weather/`, `units/`, `currency/`, `tags/`, `custom-fields/`, `versioning/`, `save-state/`, `view-state/`, `undo/`, `mobile/`, `offline/`, `packing/`, `shopping/`, `receipts/`, `confirm/`, `contact/`, `procurement/`, `vendors/`, `reputation/`, `incidents/`, `compliance/`, `safety/`, `protection/`, `professional/`, `milestones/`, `journey/`, `insights/`, `hub/`, `hooks/`, `loading/`, `ui/`, `utils/`, `constants/`

#### TIER 4 - Utility/Experimental

`games/`, `simulation/`, `commerce/`, `blog/`, `sustainability/`, `wellbeing/`, `wine/`, `cocktails/`, `raffle/`, `charity/`, `stories/`, `portfolio/`, `kitchen-rentals/`, `marketplace/`, `remotion/`, `translate/`, `cannabis/`, `copilot/`, `session/`, `system/`, `monitoring/`, `resilience/`, `cache/`, `queue/`, `api/`, `cron/`, `jobs/`, `webhooks/`, `integrations/`, `platform/`, `archetypes/`, `themes/`, `branding/`, `pricing/`, `chef-services/`, `classes/`, `collaboration/`, `communication/`, `connections/`, `contingency/`, `culinary/`, `culinary-words/`, `devices/`, `directory/`, `discovery/`, `dishes/`, `drafts/`, `email-references/`, `environment/`, `event-labels/`, `event-stubs/`, `favorite-chefs/`, `feedback/`, `food/`, `gifts/`, `google/`, `haccp/`, `health/`, `help/`, `holidays/`, `images/`, `inbox/`, `sms/`, `store/`, `surveys/`, `waste/`, `wix/`, `admin/`, `admin-time/`, `beta/`, `beta-survey/`, `calls/`, `cancellation/`, `chef/`, `chefs/`, `mutations/`, `navigation/`, `packages/`, `partners/`, `portal/`, `preview/`, `profile/`, `qol/`

---

## Document Maintenance Protocol

This document is the **baseline**. All changes to ChefFlow going forward are patches against this documented state.

**When to update:**

- New page, route, or API endpoint added -> update relevant section
- New database table or migration -> update Section 4
- New integration added -> update Section 8
- New module in `lib/` -> update Appendix
- Architecture changes -> update Section 2
- Security changes -> update Section 7
- New test infrastructure -> update Section 9

**How to update:**

- Edit this file directly in the relevant section
- Commit with message: `docs(manual): update [section] - [what changed]`

**This is the single source of truth for all technical and functional inquiries about ChefFlow V1.**

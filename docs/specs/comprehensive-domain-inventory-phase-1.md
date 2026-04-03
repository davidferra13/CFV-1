# Spec: Comprehensive Domain Inventory Phase 1

> **Status:** ready
> **Priority:** P0
> **Depends on:** none
> **Estimated complexity:** medium

## Timeline

| Event         | Date       | Agent/Session | Commit |
| ------------- | ---------- | ------------- | ------ |
| Created       | 2026-04-02 | Codex         |        |
| Status: ready | 2026-04-02 | Codex         |        |

---

## Developer Notes

### Raw Signal

We need comprehensive documentation first, not build work. The first phase is identification and listing only. We need every domain or functional area across the website and associated project builds, including user-facing features, business operations, backend services, and infrastructure. We are not categorizing yet. If areas overlap or have ambiguous ownership, that ambiguity should be captured now and resolved in a later phase.

### Developer Intent

- **Core goal:** produce a complete inventory of the platform's domains and functional areas before any pruning or classification work.
- **Key constraints:** do not build product code, do not categorize into core/supporting/bloat in this phase, do not silently collapse ambiguous areas.
- **Motivation:** incomplete documentation creates confusion, duplicate work, and poor architectural decisions later.
- **Success from the developer's perspective:** one source-backed document that names every meaningful domain/surface/system currently represented in this repo.

---

## What This Does (Plain English)

This spec creates the Phase 1 inventory for ChefFlow's entire digital ecosystem. It lists the major delivery surfaces, business domains, functional areas, backend services, and infrastructure systems that currently exist in the codebase and its canonical documentation. It intentionally stops before ranking, consolidating, or pruning anything.

---

## Why It Matters

If Phase 1 misses domains, every later categorization decision is compromised. A complete inventory gives the next phase a real foundation instead of forcing architectural decisions from memory or partial understanding.

---

## Files to Create

| File                                                   | Purpose                                                              |
| ------------------------------------------------------ | -------------------------------------------------------------------- |
| `docs/specs/comprehensive-domain-inventory-phase-1.md` | Canonical Phase 1 inventory of platform domains and functional areas |

---

## Files to Modify

None.

---

## Database Changes

None.

---

## Data Model

This document uses the following inventory model for each item:

| Field                      | Meaning                                                                                         |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| `Inventory Item`           | The domain, functional area, or system being documented                                         |
| `Surface`                  | Where it primarily lives: public, chef, client, staff, admin, platform, infra, or multi-surface |
| `Aliases / Route Families` | Related route groups, doc headings, or module names that map to the same area                   |
| `Purpose`                  | The operational or product responsibility of the item                                           |
| `Ambiguity Notes`          | Any overlap or naming conflict to resolve in Phase 2                                            |

Phase 1 rules:

1. List first, classify later.
2. Preserve aliases and overlaps instead of hiding them.
3. Prefer domains over individual pages, but include build surfaces and infrastructure families where they are independently meaningful.
4. Treat route groups, doc sections, and schema-backed systems as evidence, not as perfect taxonomy.

---

## Source Set and Evidence

This inventory is grounded in the following repo sources:

- `docs/chefflow-product-definition.md`
- `docs/consumer-first-vision.md`
- `docs/chefflow-system-manual.md`
- `docs/app-complete-audit.md`
- `lib/auth/route-policy.ts`
- `database/migrations/20260215000001_layer_1_foundation.sql`
- `database/migrations/20260303000023_vendor_management.sql`
- `database/migrations/20260324000001_restaurant_ops_foundation.sql`
- `database/migrations/20260330000004_hub_groups.sql`
- `database/migrations/20260401000079_external_directory_listings.sql`
- `docs/openclaw-price-intelligence.md`
- direct inspection of `app/`, `app/(chef)/`, `app/(client)/`, `app/(admin)/admin/`, `app/(public)/`, and `app/api/`

---

## Inventory Boundaries

This phase includes:

- public website surfaces
- authenticated application surfaces
- operator-facing business systems
- client-facing and staff-facing systems
- admin and moderation surfaces
- backend service families
- automations, scheduled systems, and integrations
- data and intelligence subsystems
- delivery-specific surfaces such as mobile, kiosk, embed, demo, print, and tokenized links

This phase does not include:

- value judgments
- simplification proposals
- "should be removed" calls
- architecture refactors
- code changes

---

## Inventory

## 1. Delivery Surfaces and Builds

These are the top-level delivery contexts in which the platform exists.

| Inventory Item                  | Surface       | Aliases / Route Families                                                                             | Purpose                                                                         | Ambiguity Notes                                                    |
| ------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Public Website                  | public        | `app/(public)`                                                                                       | Marketing, discovery, trust, booking, token-based access, no-login entry points | Includes both pure marketing and live product flows                |
| Chef Portal                     | chef          | `app/(chef)`                                                                                         | Primary operator application                                                    | Broadest surface; contains many subdomains                         |
| Client Portal                   | client        | `app/(client)`                                                                                       | Authenticated client experience                                                 | Overlaps with token-based public client flows                      |
| Staff Portal                    | staff         | `app/(staff)`                                                                                        | Staff-facing operational workspace                                              | Small but operationally distinct                                   |
| Admin Portal                    | admin         | `app/(admin)/admin`                                                                                  | Platform administration, moderation, oversight                                  | Mixes business ops admin and system admin                          |
| Partner Portal                  | partner       | `app/(partner)`                                                                                      | Partner-facing relationship and reporting surface                               | Small surface; may overlap with referral systems                   |
| Demo Surface                    | demo          | `app/(demo)`                                                                                         | Demo/test presentation environment                                              | Could be viewed as delivery mode, not business domain              |
| Mobile Surface                  | mobile        | `app/(mobile)`                                                                                       | Mobile-optimized delivery context                                               | May represent a view layer rather than standalone domain           |
| Kiosk Surface                   | kiosk         | `app/kiosk`                                                                                          | Self-service or in-person terminal surface                                      | Crosses with commerce/POS                                          |
| Embed Surface                   | embed         | `app/embed`                                                                                          | External-site embedded intake/inquiry surface                                   | Crosses with booking and lead capture                              |
| Tokenized Public Access Surface | multi-surface | `/client/[token]`, `/proposal/[token]`, `/view/[token]`, `/worksheet/[token]`, `/hub/g/[groupToken]` | Secure link-based access without full login                                     | Crosses with client, reviews, documents, and social coordination   |
| Print / Document Surface        | multi-surface | `app/print`, printable documents                                                                     | Printable artifact delivery                                                     | Usually output of another domain, not a standalone business domain |
| API Surface                     | platform      | `app/api`                                                                                            | Machine-facing interface families                                               | Functional area, not user-facing domain                            |

## 2. Public Experience Domains

These are the no-login or acquisition-facing domains represented in the repo.

| Inventory Item                 | Surface         | Aliases / Route Families                                | Purpose                                                                                   | Ambiguity Notes                                                      |
| ------------------------------ | --------------- | ------------------------------------------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Marketing                      | public          | home, about, contact, for-operators                     | Public storytelling and acquisition                                                       | Crosses with growth and operator recruitment                         |
| Trust / Legal                  | public          | trust, privacy, privacy-policy, terms, unsubscribe      | Legal, privacy, and credibility surfaces                                                  | Some trust content overlaps with AI/privacy and safety               |
| Public Chef Discovery          | public          | `/chefs`, `/marketplace-chefs`, compare                 | Consumer-facing chef search and discovery                                                 | Parallel discovery surfaces exist; may need consolidation later      |
| Public Operator Discovery      | public          | `/discover`, directory listings                         | Public discovery for restaurants, food trucks, bakeries, caterers, and related businesses | "Operator" vs "directory listing" naming needs Phase 2 cleanup       |
| Public Profiles                | public          | `/chef/[slug]`, `/discover/[slug]`, `/customers/[slug]` | Public profile presentation and proof surfaces                                            | Includes both real provider profiles and content-style profiles      |
| Public Booking                 | public          | `/book/[chefSlug]`, inquiry forms, campaign booking     | Booking or inquiry initiation without full app login                                      | Crosses with inquiry, embed, and client onboarding                   |
| Public Comparison              | public          | `/compare`, `/compare/[slug]`                           | Comparative discovery and conversion surface                                              | May be a subdomain of public discovery rather than a separate domain |
| Public Gift Card Purchase      | public          | chef gift card routes                                   | Public purchase flow for gift cards or vouchers                                           | Crosses with loyalty and commerce                                    |
| Public Partner Acquisition     | public          | `/partner-signup`, `/chef/[slug]/partner-signup`        | Referral/partner recruitment                                                              | Overlaps with partnerships/referrals                                 |
| Beta / Waitlist / Survey       | public          | `/beta`, `/beta-survey`                                 | Beta acquisition and research capture                                                     | Could later fold into marketing/growth                               |
| Public Customer Proof          | public          | `/customers`                                            | Proof/case study/testimonial surface                                                      | Currently constrained in implementation; still a named area          |
| Public Community Hub Access    | public          | `/hub`, `/g`, `/hub/join`, `/hub/me`                    | Publicly shared social/group coordination access                                          | Crosses with Dinner Circle and client group coordination             |
| Public Token Workflows         | public          | proposal, review, share, tip, intake, worksheet, view   | Token-based transactional flows                                                           | Best treated as a family of public delivery paths for Phase 1        |
| Public Auth                    | public          | `app/auth`                                              | Sign-in, sign-up, reset, verification, role selection                                     | Identity system itself is broader than public auth pages             |
| SEO / Feed / Metadata Surfaces | public/platform | sitemap, robots, opengraph-image, feed.xml              | Search indexing and public metadata delivery                                              | Infrastructure-adjacent but public-facing                            |

## 3. Chef / Operator Application Domains

These are the functional areas exposed primarily through the chef portal.

| Inventory Item                                | Surface             | Aliases / Route Families                                                                           | Purpose                                                                         | Ambiguity Notes                                                     |
| --------------------------------------------- | ------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Dashboard / Worksurface                       | chef                | dashboard, command center, command-center style widgets                                            | Default operator control center                                                 | Overlaps with queue, briefing, insights                             |
| Events / Service Lifecycle                    | chef                | events                                                                                             | End-to-end event record and execution lifecycle                                 | Closely tied to inquiries, menus, finance, documents                |
| Client CRM                                    | chef                | clients                                                                                            | Client records, preferences, relationship history, value tracking               | Crosses with guests, loyalty, referrals, Dinner Circle              |
| Inquiry Pipeline                              | chef                | inquiries                                                                                          | Lead intake, qualification, response flow                                       | Crosses with quotes, calls, website leads, prospecting              |
| Quotes                                        | chef                | quotes                                                                                             | Pricing and quote lifecycle management                                          | Could be treated as inquiry subdomain later                         |
| Proposals                                     | chef                | proposals                                                                                          | Formal proposal documents beyond base quotes                                    | Crosses with quotes and documents                                   |
| Calls / Meetings                              | chef                | calls                                                                                              | Scheduled or logged sales/client calls                                          | Crosses with inquiries and CRM                                      |
| Leads                                         | chef                | leads, website lead management                                                                     | Shared or direct lead capture and handling                                      | Overlaps with prospecting and inquiries                             |
| Prospecting                                   | chef/admin          | prospecting                                                                                        | Active outbound pursuit of potential business                                   | Crosses with leads, outreach, partner sourcing                      |
| Partners / Referrals                          | chef                | partners, partner reports                                                                          | Relationship and referral partner management                                    | Overlaps with network and outreach                                  |
| Guests / Guest Intelligence                   | chef                | guests, guest-analytics, guest-leads, waitlist                                                     | Non-primary client guest tracking and conversion                                | Overlaps with clients and Dinner Circle                             |
| Calendar                                      | chef                | calendar                                                                                           | Main planning and calendar interface                                            | Crosses with schedule and scheduling                                |
| Schedule                                      | chef                | schedule                                                                                           | Schedule-focused workflows and views                                            | Naming overlap with calendar/scheduling                             |
| Scheduling                                    | chef                | scheduling, availability                                                                           | Availability rules and scheduling logic                                         | Naming overlap with calendar/schedule                               |
| Culinary                                      | chef                | culinary                                                                                           | Parent domain for menus, recipes, ingredients, dishes, components, costing      | Broad umbrella domain                                               |
| Menus                                         | chef                | menus                                                                                              | Menu creation, editing, tasting, engineering                                    | Likely a culinary subdomain later                                   |
| Recipes                                       | chef                | recipes                                                                                            | Recipe library, editing, import, production log                                 | Likely a culinary subdomain later                                   |
| Ingredients                                   | chef                | recipes/ingredients, culinary ingredients, system ingredients                                      | Ingredient records and usage inputs                                             | Sits between culinary and pricing                                   |
| Dishes / Components                           | chef                | dishes, components, sauces, stocks, garnishes, ferments, shared-elements                           | Reusable subcomponents and dish-level structure                                 | Could later collapse into culinary composition                      |
| Pricing / Food Cost                           | chef                | food-cost, prices, rate-card, culinary/price-catalog                                               | Costing, pricing logic, price inputs, rate definition                           | Strong overlap with vendors and inventory                           |
| Price Catalog / Price Intelligence            | chef/admin/platform | price-catalog, OpenClaw-fed catalog                                                                | Centralized price intelligence and catalog management                           | Could be nested under pricing or data intelligence later            |
| Vendors / Procurement                         | chef                | vendors, culinary/vendors                                                                          | Supplier management, comparison, invoices, purchasing relationships             | Currently chef-facing supplier system, not just public directory    |
| Inventory                                     | chef                | inventory                                                                                          | Counts, locations, audits, transactions, waste, expiry, purchase orders, demand | Crosses with vendors, pricing, kitchen ops                          |
| Receipts / Expense Intake                     | chef                | receipts, quick receipt flows                                                                      | Receipt capture and expense evidence                                            | Could later live under finance or inventory                         |
| Inbox / Messaging                             | chef                | inbox, chat, communications, conversations                                                         | Unified communication intake and messaging                                      | Overlaps with notifications and CRM                                 |
| Documents / Contracts / Printing              | chef                | documents, contracts, print                                                                        | Contracts, generated docs, printable assets                                     | Crosses with events, finance, proposals                             |
| Daily Ops                                     | chef                | daily, briefing                                                                                    | Operational plan of the day                                                     | Overlaps with tasks, kitchen, queue                                 |
| Activity / Queue                              | chef                | activity, queue                                                                                    | Work prioritization and operational feed                                        | Crosses with dashboard and notifications                            |
| Staff                                         | chef                | staff, team                                                                                        | Staff management and staff-facing coordination                                  | Crosses with tasks, stations, payroll                               |
| Tasks                                         | chef                | tasks                                                                                              | General task management                                                         | Crosses with daily ops and staff                                    |
| Kitchen Stations / Kitchen Mode               | chef                | stations, kitchen, kitchen mode, production                                                        | Live station operations and service execution                                   | Crosses with inventory, tasks, commerce                             |
| Operations                                    | chef                | operations, travel, equipment, kitchen-rentals                                                     | Logistics, equipment, travel, rentals, physical execution                       | Broad operations umbrella                                           |
| Commerce / POS                                | chef                | commerce, kiosk-adjacent routes, terminal, register, products, orders, reconciliation, settlements | Retail and transaction operations                                               | May deserve separation from the private-chef operating model later  |
| Finance / Financials                          | chef                | finance, financials, expenses, payments, bank-feed, disputes, contractors, goals, tax, ledgers     | Business financial truth and money workflows                                    | Naming overlap between finance and financials is explicit in routes |
| Analytics / Insights / Intelligence / Reports | chef/admin          | analytics, insights, intelligence, reports                                                         | Quantitative analysis, business intelligence, reporting                         | Four parallel names currently exist                                 |
| Marketing / Social / Content                  | chef                | marketing, social, content                                                                         | Campaigns, content, outreach, sequence work                                     | Crosses with public acquisition                                     |
| Network / Community / Collaboration           | chef                | network, community, collabs, favorite-chefs                                                        | Chef-to-chef interaction and collaboration                                      | Overlaps with referrals and partner systems                         |
| Reviews / Testimonials / Feedback / AAR       | chef                | reviews, testimonials, feedback, aar, reputation                                                   | Post-event feedback, proof, debrief, publicizable testimonials                  | Crosses with public proof and brand reputation                      |
| Loyalty / Rewards / Gift Cards / Raffle       | chef/client         | loyalty, gift cards, raffle                                                                        | Repeat-client retention and rewards                                             | Crosses with clients and public purchase flows                      |
| Safety / Protection / Compliance              | chef                | safety, protection, compliance, haccp, gdpr, incidents, emergency                                  | Legal, privacy, food safety, incident response                                  | Crosses with trust/legal and staff safety                           |
| Onboarding                                    | chef                | onboarding                                                                                         | Guided setup and activation for chefs                                           | Crosses with import, auth, beta                                     |
| Data Import / Migration                       | chef                | import, mxp, csv, history                                                                          | Inbound migration and normalization from external systems                       | Crosses with AI parsing and setup                                   |
| Help / Education / Consulting                 | chef                | help, consulting                                                                                   | Documentation, educational guidance, pricing playbooks                          | Some pages are guidance rather than product systems                 |
| Notifications                                 | chef                | notifications                                                                                      | Notification inbox and settings                                                 | Crosses with messaging and automation                               |
| Settings / Configuration                      | chef                | settings                                                                                           | Profile, billing, modules, integrations, preferences, visibility, AI/privacy    | Broad configuration umbrella                                        |
| Growth                                        | chef                | growth                                                                                             | Growth-oriented operator surface                                                | Likely overlaps with marketing, leads, analytics                    |
| Goals / Revenue Planning                      | chef                | goals                                                                                              | Business target setting and tracking                                            | Could later live inside finance or analytics                        |
| Portfolio / Brand                             | chef                | portfolio, my-profile, highlights, credentials                                                     | Public-facing professional brand configuration                                  | Crosses with marketing and discovery                                |
| Remy / AI Concierge                           | chef/platform       | remy, commands, ai-privacy                                                                         | AI-assisted operator workflows and command surfaces                             | Mixes user-facing assistant with founder/admin AI tooling           |
| Intelligence Hub                              | chef/platform       | intelligence                                                                                       | Deterministic intelligence engines                                              | May be a subdomain of analytics rather than separate                |
| Charity                                       | chef/admin          | charity                                                                                            | Charity hours, charity events, nonprofit-related tracking                       | Vertical/specialty area                                             |
| Cannabis                                      | chef/client/admin   | cannabis                                                                                           | Cannabis-specific compliance and event handling                                 | Vertical/specialty area                                             |
| Surveys                                       | chef/public         | surveys, beta-survey, post-event survey                                                            | Structured feedback/questionnaire flows                                         | Crosses with onboarding and feedback                                |
| Marketplace Capture / Marketplace             | chef                | marketplace, marketplace capture                                                                   | Marketplace-related operator tools                                              | Naming is present but business scope is ambiguous                   |
| Dev / Internal Tools                          | chef/admin          | dev, commands, experimental surfaces                                                               | Internal or restricted operational tools                                        | Needs Phase 2 judgment, but must be inventoried first               |

## 4. Client Portal Domains

These are domains expressed primarily through authenticated or tokenized client access.

| Inventory Item                | Surface       | Aliases / Route Families                       | Purpose                                                 | Ambiguity Notes                                  |
| ----------------------------- | ------------- | ---------------------------------------------- | ------------------------------------------------------- | ------------------------------------------------ |
| Client Event Access           | client        | my-events, event detail, event summary         | Client-side view of event records                       | Crosses with the main events domain              |
| Client Messaging              | client        | my-chat, chat threads                          | Client communication with chef                          | Crosses with inbox/messaging                     |
| Client Booking / Inquiry      | client/public | book-now, my-inquiries, inquiry details        | Client-originated inquiry and booking flows             | Crosses with public booking and inquiry pipeline |
| Client Quotes / Proposals     | client        | my-quotes, proposal acceptance                 | Client review and acceptance of pricing/proposals       | Crosses with quotes and proposals                |
| Client Profile / Preferences  | client        | my-profile, onboarding                         | Contact data, preferences, dietary and household inputs | Crosses with CRM                                 |
| Client Spending / Payments    | client        | my-spending, invoices, payment plans, balances | Client-side financial visibility and payment actions    | Crosses with finance                             |
| Client Rewards                | client        | my-rewards, loyalty, raffle                    | Client-facing rewards and retention surface             | Crosses with loyalty domain                      |
| Client Hub / Friends / Groups | client        | my-hub, hub, friends, group hub                | Client group coordination and shared event interaction  | Crosses with Dinner Circle and public hub        |
| Client Survey / Feedback      | client/public | survey, feedback                               | Structured feedback capture                             | Crosses with reviews and testimonials            |
| Client Cannabis View          | client        | my-cannabis                                    | Client-facing cannabis-specific flows                   | Vertical/specialty area                          |

## 5. Staff Portal Domains

These are domains expressed primarily through staff-facing access.

| Inventory Item             | Surface | Aliases / Route Families | Purpose                                  | Ambiguity Notes                                         |
| -------------------------- | ------- | ------------------------ | ---------------------------------------- | ------------------------------------------------------- |
| Staff Dashboard            | staff   | staff-dashboard          | Staff command surface for assigned work  | Likely a surface rather than standalone business domain |
| Staff Tasks                | staff   | staff-tasks              | Staff-assigned task execution            | Crosses with tasks/staff                                |
| Staff Schedule             | staff   | staff-schedule           | Staff-facing calendar/schedule view      | Crosses with schedule/calendar                          |
| Staff Station Operations   | staff   | staff-station            | Staff interaction with station workflows | Crosses with kitchen stations                           |
| Staff Recipes / References | staff   | staff-recipes            | Staff operational reference access       | Crosses with culinary knowledge                         |
| Staff Time                 | staff   | staff-time               | Staff time tracking                      | Crosses with payroll and operations                     |

## 6. Admin and Moderation Domains

These are domains surfaced primarily in the admin panel.

| Inventory Item                  | Surface | Aliases / Route Families                               | Purpose                                            | Ambiguity Notes                                     |
| ------------------------------- | ------- | ------------------------------------------------------ | -------------------------------------------------- | --------------------------------------------------- |
| Admin User Management           | admin   | users                                                  | Platform-level user oversight                      | Baseline admin capability                           |
| Admin Client Oversight          | admin   | clients                                                | Cross-tenant client oversight                      | Crosses with client CRM                             |
| Admin Event Oversight           | admin   | events                                                 | Cross-tenant event oversight                       | Crosses with event lifecycle                        |
| Admin Inquiry Oversight         | admin   | inquiries                                              | Cross-tenant inquiry oversight                     | Crosses with inquiry pipeline                       |
| Admin Financial Oversight       | admin   | financials, reconciliation                             | Platform-level financial views                     | Crosses with finance                                |
| Admin Directory Management      | admin   | directory, directory-listings                          | Public directory moderation and listing operations | Crosses with public operator discovery              |
| Admin Hub Oversight             | admin   | hub                                                    | Group/community oversight                          | Crosses with Dinner Circle/public hub               |
| Admin Communications            | admin   | communications, conversations, notifications, presence | Platform-wide communication oversight              | Crosses with messaging infrastructure               |
| Admin OpenClaw / Price Catalog  | admin   | openclaw, price-catalog                                | Admin-side price intelligence management           | Crosses with pricing and platform data intelligence |
| Admin Command Center / Pulse    | admin   | command-center, pulse                                  | Platform health and operational command views      | Crosses with monitoring                             |
| Admin Analytics / Audit / Flags | admin   | analytics, audit, flags, silent-failures               | Observability, auditing, moderation tooling        | Crosses with platform monitoring                    |
| Admin Beta / Survey Management  | admin   | beta, beta-surveys                                     | Beta cohort and survey oversight                   | Crosses with growth/research                        |
| Admin Referral / Outreach       | admin   | referral-partners, outreach                            | Platform-wide partner and outreach management      | Crosses with partner/referral domains               |
| Admin Social / Feedback         | admin   | social, feedback                                       | Cross-tenant social and feedback oversight         | Crosses with reputation/marketing                   |
| Admin System Management         | admin   | system                                                 | System-level maintenance and health management     | Infrastructure-adjacent admin domain                |

## 7. Partner and External Relationship Domains

These domains span partner-facing, referral-facing, or external business relationship workflows.

| Inventory Item                | Surface           | Aliases / Route Families                                     | Purpose                                            | Ambiguity Notes                                    |
| ----------------------------- | ----------------- | ------------------------------------------------------------ | -------------------------------------------------- | -------------------------------------------------- |
| Referral Partnerships         | chef/admin/public | partners, partner-signup, partner-report, referral-partners  | Referral and partner relationship workflows        | Overlaps with network and outreach                 |
| Vendor Relationships          | chef              | vendors, vendor invoices, vendor comparison                  | Supplier relationships and procurement             | Distinct from public operator discovery            |
| External Platform Submissions | chef/platform     | wix-submissions, TakeAChef import, marketplace-related flows | Intake or synchronization with external ecosystems | Crosses with import and integrations               |
| Operator Outreach             | public/admin      | directory outreach, claims, verification flows               | Outreach to discovered operators/businesses        | Crosses with public discovery and admin moderation |

## 8. Platform Service and Infrastructure Domains

These are shared systems that support multiple product domains or all surfaces.

| Inventory Item                              | Surface        | Aliases / Route Families                                             | Purpose                                                            | Ambiguity Notes                                          |
| ------------------------------------------- | -------------- | -------------------------------------------------------------------- | ------------------------------------------------------------------ | -------------------------------------------------------- |
| Authentication / Identity                   | platform       | auth routes, `lib/auth`, `user_role`, `chefs`, `clients`             | Identity, role assignment, login flows                             | Public auth pages are only one expression of this domain |
| Authorization / Tenant Isolation            | platform       | middleware, route policy, RLS, tenant scoping                        | Access control and data isolation                                  | Must be inventoried separately from login/auth UX        |
| Database Schema / Migrations                | infra          | `database/migrations`, Drizzle/SQL layers                            | Canonical data model evolution                                     | Infrastructure, but foundational                         |
| API Platform                                | platform       | `app/api/v2`, `public`, `admin`, `book`, `documents`, `reports`      | Programmatic interfaces and route handlers                         | Better treated as service platform, not business domain  |
| Webhooks                                    | platform       | stripe, webhooks, outbound hooks                                     | External event ingress/egress                                      | Crosses with integrations and finance                    |
| Scheduled Jobs / Automation                 | platform       | cron, scheduled, monitoring, Inngest, automations                    | Background execution and recurring system work                     | Distinct from user-configured automations but related    |
| Notification Delivery                       | platform       | notifications, push, realtime, email sends                           | Delivery of system/user notifications                              | Overlaps with inbox but not the same concern             |
| Realtime / Presence                         | platform       | realtime, presence, SSE                                              | Live updates and status propagation                                | May later collapse into communications infrastructure    |
| File Storage / Document Delivery            | platform       | storage, documents, public view/download routes                      | Upload, serve, and manage assets and generated docs                | Crosses with contracts, receipts, print                  |
| Integrations Platform                       | platform       | gmail, calendar, stripe, wix, embed, webhooks, API keys              | External system connectivity                                       | Broad umbrella with many sub-integrations                |
| AI Runtime / Model Routing                  | platform       | ai, remy, Ollama/Gemini routing, privacy architecture                | AI request routing and privacy boundaries                          | Crosses with Remy, automation, and content generation    |
| OpenClaw Price Intelligence System          | platform/infra | openclaw, sync, capture, enrichment                                  | External price capture and normalization pipeline feeding ChefFlow | Standalone subsystem, not just a chef page               |
| Observability / Health / Monitoring         | infra          | health, system, pulse, silent-failures, sentinel, monitoring         | Health checks, reliability, diagnostics                            | Crosses with admin system views                          |
| Security / Trust Controls                   | platform       | auth hardening, abuse prevention, privacy controls, consent          | Security posture and trust boundaries                              | Spans auth, compliance, and public trust                 |
| PWA / Offline / Native App Layer            | infra          | service workers, capacitor config, offline mode                      | Progressive web app and native shell capabilities                  | Delivery-layer infrastructure                            |
| SEO / Feeds / Crawlability                  | infra/public   | sitemap, robots, feed.xml, metadata                                  | Discovery and indexing support                                     | Public-adjacent infrastructure                           |
| Environment / Deployment / Build Operations | infra          | next config, cloudflared, deploy/watchdog logs, prod/beta references | Runtime environment, deployment, and build behavior                | Not a user domain, but part of total ecosystem           |
| Testing / QA Infrastructure                 | infra          | Playwright configs, tests, sentinel, soak/stress/smoke suites        | Verification and regression coverage                               | Operationally important, not product-facing              |
| Documentation / Knowledge Base              | infra          | `docs/`, `docs/specs/`, manuals, audits                              | Internal knowledge system for the platform                         | Meta-domain, but explicitly part of ecosystem management |

## 9. Data, Intelligence, and Analytics Subsystems

These cut across business domains and may later be grouped differently, but they are independently meaningful enough to inventory now.

| Inventory Item                 | Surface             | Aliases / Route Families                                                    | Purpose                                             | Ambiguity Notes                                    |
| ------------------------------ | ------------------- | --------------------------------------------------------------------------- | --------------------------------------------------- | -------------------------------------------------- |
| Analytics                      | chef/admin          | analytics                                                                   | Standard metrics and dashboards                     | Overlaps with reporting and insights               |
| Reports                        | chef/admin/platform | reports, exports, ad-hoc report builders                                    | Formal report output                                | Overlaps with analytics and finance                |
| Insights                       | chef                | insights                                                                    | Curated interpretation-oriented views               | Overlaps with analytics/intelligence               |
| Intelligence                   | chef/platform       | intelligence, recommendation engines, deterministic scoring                 | Derived operational/business intelligence           | Naming overlap is explicit and unresolved          |
| Pricing Intelligence           | chef/platform       | food cost, price catalog, price badges, price resolution chain              | Intelligence specific to cost and pricing decisions | Crosses with pricing, vendors, inventory, OpenClaw |
| Guest / Client Intelligence    | chef                | guest analytics, client health, repeat guest clusters, preference inference | Behavioral and relationship intelligence            | Crosses with CRM and loyalty                       |
| Operational Intelligence       | chef                | queue, daily ops, critical path, readiness, lifecycle signals               | Derived next-action and execution guidance          | Crosses with dashboard and events                  |
| Revenue / Finance Intelligence | chef                | revenue goals, pipeline forecast, margin views, business health             | Derived financial guidance                          | Crosses with finance and analytics                 |

---

## Ambiguity Register for Phase 2

These issues are intentionally not resolved in Phase 1, but they must be carried forward.

1. `Operator` vs `Public Operator Discovery` vs `directory_listings`
2. `Pricing` vs `Price Catalog` vs `Pricing Intelligence` vs `Food Cost`
3. `Finance` vs `Financials` vs `Payments` vs `Ledger`
4. `Calendar` vs `Schedule` vs `Scheduling` vs `Availability`
5. `Inbox` vs `Chat` vs `Communications` vs `Conversations` vs `Notifications`
6. `Analytics` vs `Insights` vs `Intelligence` vs `Reports`
7. `Client` vs `Guest` vs `Dinner Circle` vs `Hub Group`
8. `Vendors` as supplier management vs `Discover` as public business directory
9. `Marketing` vs `Growth` vs `Social` vs `Content`
10. `Network` vs `Community` vs `Partners` vs `Referrals`
11. `Safety` vs `Protection` vs `Compliance` vs `Trust`
12. `Remy` as user-facing AI assistant vs platform AI runtime vs founder command tooling
13. `Commerce/POS` as central operator capability vs vertical/expansion capability
14. `Charity`, `Cannabis`, and other verticals: true domains vs specialty overlays
15. `Demo`, `Mobile`, `Kiosk`, `Embed`, `Print`: product domains vs delivery modes

---

## Verification Steps

1. Confirm this document does not assign any item to `core`, `supporting`, or `bloat`.
2. Confirm all major route surfaces are represented:
   - `app/(public)`
   - `app/(chef)`
   - `app/(client)`
   - `app/(staff)`
   - `app/(admin)/admin`
   - `app/(partner)`
   - `app/(demo)`
   - `app/(mobile)`
   - `app/kiosk`
   - `app/embed`
   - `app/api`
3. Confirm the canonical product-document sections are reflected:
   - events
   - clients
   - inquiry pipeline
   - financials
   - culinary
   - calendar
   - inbox/messaging
   - staff
   - daily ops
   - public directory
   - client portal
   - integrations
   - notifications
   - background automation
   - platform administration
4. Confirm the foundational data systems are represented:
   - identity (`chefs`, `clients`)
   - vendors/vendor pricing
   - hub groups / Dinner Circle infrastructure
   - directory listings
   - OpenClaw price intelligence
5. Confirm overlaps are called out rather than prematurely normalized.
6. Confirm no code, routes, database objects, or runtime behavior are changed by this spec.

---

## Out of Scope

- categorizing inventory items as core/supporting/bloat
- deciding what should be merged or removed
- renaming routes or modules
- refactoring schema or folder structure
- changing product behavior
- deleting low-value or duplicate surfaces
- defining final IA or navigation

---

## Notes for Builder Agent

This document is the input for Phase 2, not the conclusion.

Phase 2 should:

1. normalize aliases into a cleaner canonical taxonomy
2. classify each item into one of:
   - Core Business Domains
   - Supporting Platform Domains
   - Bloat / Unnecessary
3. decide which items are true domains, which are subdomains, and which are only delivery modes or legacy overlaps
4. preserve a mapping from canonical domains back to route groups, schema areas, and docs so the classification remains verifiable

The most important discipline for the next phase is this: do not let broad umbrella names erase currently distinct systems until the overlap has been explicitly resolved.

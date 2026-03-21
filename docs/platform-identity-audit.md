# ChefFlow V1: Platform Identity & Capability Audit

**Date:** 2026-03-21
**Purpose:** Definitive articulation of what ChefFlow is, what it does, and the full scope of its operational capabilities.

---

## What ChefFlow Is

ChefFlow is a **self-hosted operating system for private chef businesses**. Tagline: _Ops for Artists_.

It manages every operational surface of a private chef's business: from the first client inquiry through event execution, post-service review, financial reconciliation, and long-term relationship management. It is not a scheduling tool with features bolted on. It was designed from the ground up around the private chef workflow.

The platform serves private chefs, catering operators, meal prep services, and food professionals of all scales. It runs entirely on the developer's local machine (Windows 11), with Cloudflare Tunnels exposing beta and production to the internet. Zero paid hosting.

**Live domains:**

- `app.cheflowhq.com` (production, port 3300)
- `beta.cheflowhq.com` (beta, port 3200)
- `localhost:3100` (development)

---

## Who Uses It

| Role        | Access         | Purpose                                               |
| ----------- | -------------- | ----------------------------------------------------- |
| **Chef**    | Full platform  | Run their entire business                             |
| **Client**  | Client portal  | View events, communicate, pay, access loyalty rewards |
| **Staff**   | Staff portal   | Kitchen ops, scheduling, task execution               |
| **Partner** | Partner portal | Track referrals, view performance reports             |
| **Admin**   | Admin panel    | Platform management, analytics, prospecting           |
| **Public**  | Public pages   | Discover chefs, submit inquiries, view portfolios     |

---

## Technology Stack

| Layer     | Technology                                   | Purpose                                        |
| --------- | -------------------------------------------- | ---------------------------------------------- |
| Framework | Next.js 14+ (App Router)                     | Full-stack React with server actions           |
| Database  | Supabase (PostgreSQL + Auth + RLS + Storage) | Multi-tenant data, row-level security          |
| Payments  | Stripe + Stripe Connect                      | Client payments, chef payouts                  |
| Local AI  | Ollama (qwen3 models)                        | Private data processing (never leaves machine) |
| Cloud AI  | Gemini                                       | Generic tasks only (no PII)                    |
| Email     | Resend                                       | Transactional email with React templates       |
| SMS       | Twilio                                       | Text notifications (rate-limited)              |
| Push      | Web Push (RFC 8030, VAPID)                   | Browser push notifications                     |
| Hosting   | Self-hosted (Windows 11 PC)                  | Three environments on localhost                |
| Tunnels   | Cloudflare Tunnel                            | Expose beta/prod to internet                   |

---

## Platform Scale

| Metric                    | Count                                                                                             |
| ------------------------- | ------------------------------------------------------------------------------------------------- |
| Total pages               | 659                                                                                               |
| API routes                | 285                                                                                               |
| Server action files       | 170+                                                                                              |
| Exported server functions | 944+                                                                                              |
| React components          | 1,534+                                                                                            |
| Component domains         | 137                                                                                               |
| Database tables           | 690+                                                                                              |
| Migration files           | Multiple layers (1-7+)                                                                            |
| External integrations     | 13+ platforms                                                                                     |
| Email templates           | 80+ (React Email)                                                                                 |
| PDF generators            | 20+ document types                                                                                |
| Scheduled cron jobs       | 10 automated daily tasks                                                                          |
| Operational scripts       | 60+ (deploy, audit, test, seed)                                                                   |
| Playwright test suites    | 9 projects (smoke, chef, client, public, mobile, coverage, interactions, isolation, experiential) |
| npm scripts               | 186+                                                                                              |
| lib/ subdirectories       | 287 business domains                                                                              |

---

## Core Principles

1. **Private-first AI.** Client data stays on the local machine via Ollama. Cloud AI (Gemini) only touches generic, non-PII content.

2. **Ledger-first financials.** All money flows are immutable, append-only ledger entries. Balances are computed from the ledger via database views, never stored directly. Financial truth cannot be corrupted.

3. **Multi-tenant isolation.** Every database query is scoped by `tenant_id` or `chef_id`. Row-level security policies enforce this at the database layer.

4. **Truth over smoothness.** The system fails openly when correctness matters. A visible error is always better than a silent lie. Zero hallucination tolerance.

5. **Deterministic over probabilistic.** Use math and logic before AI. Formulas return the same correct answer every time, instantly, for free.

6. **Chef autonomy.** AI assists drafting and thinking. AI never owns canonical state. AI never mutates data without explicit chef confirmation.

7. **All features free.** No Pro tier, no paywalls. Revenue comes from voluntary supporter contributions via Stripe.

---

## Complete Feature Inventory

### 1. Event Lifecycle Management

The heart of ChefFlow. Events follow an 8-state finite state machine:

```
draft -> proposed -> accepted -> paid -> confirmed -> in_progress -> completed
                                                                  -> cancelled
```

Each state transition triggers side effects: notifications, emails, automations, ledger entries, AI tasks.

**Capabilities:**

- Create events manually, from inquiries, from text input, or via wizard
- Event detail with tabs: overview, prep, operations, financials, documents
- Prep timeline generation and management
- Pre-service safety checklists (food safety, cross-contamination)
- Kitchen display system (KDS) for live service
- Course fire sequencing (appetizer -> entree -> dessert)
- Packing list management with equipment checklists
- Guest card and RSVP tracking
- Travel logistics and directions
- Split billing between multiple clients
- Post-event closeout workflow
- After-action review (AAR) generation
- Event story and photo gallery
- Grocery cost estimation
- Scope drift tracking
- Event cloning and templates
- Day-of-production mobile view

**Route count:** 27 event pages + 106 event components

---

### 2. Client Relationship Management

Full CRM built for the private chef context: not just contact records, but deep relationship intelligence.

**Capabilities:**

- Client directory with filtering (active, inactive, VIP, at-risk, segments)
- Client profiles: demographics, household info, site notes
- Dietary management: allergies, restrictions, dislikes, favorite dishes
- Client financial panel: lifetime value, total spent, payment history
- Unified client timeline: every interaction across all channels
- Follow-up rules and automated touchpoint scheduling
- Communication history and notes
- Loyalty program: points, tiers, rewards, referral tracking
- Gift card management
- NDA tracking per client
- Milestone alerts: birthdays, anniversaries
- Churn prediction scoring
- Client deduplication and cross-platform matching
- Client intake and onboarding flows
- Spending history and trend analysis
- Client segments and cohort analysis
- Cooling/dormancy detection with reactivation campaigns

**Route count:** 40+ client pages + 59 client components

---

### 3. Culinary System

Recipe library, menu engineering, ingredient management, and food costing in one integrated system.

**Capabilities:**

- Recipe library with cover flow, search, and tagging
- Recipe detail: ingredients, instructions, dietary flags, scaling calculator
- Recipe drafts and seasonal notes
- Menu creation: courses, dishes, components, templates
- Menu engineering dashboard (profitability vs. popularity quadrant analysis)
- Dish index with frequency tracking and insights
- Ingredient master list with seasonal availability and vendor notes
- Food cost calculation per dish, per menu, per event
- Menu history and versioning
- Tasting menu forms, previews, and lists
- Menu scaling calculator
- Ingredient substitution suggestions
- Culinary components (sauces, stocks, ferments, garnishes)
- Recipe nutrition panel integration
- Menu upload from file (OCR + AI parsing)
- Menu document editor

**Route count:** 35+ culinary pages + 25 culinary components + 28 menu components + 17 recipe components

---

### 4. Financial System

Ledger-first financial engine covering invoicing, expenses, taxes, and reporting.

**Core architecture:**

- `ledger_entries` table: immutable, append-only (payment, deposit, installment, final_payment, tip, refund, adjustment, add_on, credit)
- `event_financial_summary` view: per-event financials (revenue, expenses, profit margin, food cost %)
- `client_financial_summary` view: per-client lifetime value
- All monetary amounts stored in cents (integers, minor units)

**Capabilities:**

- Invoicing: draft, send, track, mark paid, refund, cancel
- Payment processing via Stripe (PaymentIntents, Checkout sessions)
- Stripe Connect for chef payouts
- Deposit and installment tracking
- Expense tracking by category: food, labor, marketing, travel, equipment, software, miscellaneous
- Tax planning: 1099-NEC, quarterly estimates, year-end summary, home office deduction, depreciation
- Sales tax management and remittances
- Financial reporting: revenue by event/client/month, profit & loss, expense by category, YTD summary
- Cash flow forecasting and charts
- Break-even analysis
- Payroll management (employees, W2, 941 forms)
- Retainer billing and recurring revenue
- Plate cost calculation
- Grocery price tracking and trends
- Mileage tracking and summary
- Retirement contribution tracking
- Year-over-year revenue comparison
- Payment dispute management
- Contractor (1099) tracking
- Manual payment recording
- Reconciliation tools

**Route count:** 75+ finance pages + 49 finance components

---

### 5. Inquiry Pipeline & Lead Management

Centralized intake for all client inquiries, regardless of source.

**Capabilities:**

- Unified inquiry inbox (website forms, Wix, email, phone, Instagram)
- Inquiry state machine: new -> awaiting_client -> awaiting_chef -> quoted -> confirmed | declined | expired
- Lead scoring with AI-powered likelihood assessment
- Kanban board view with drag-and-drop
- Inquiry notes and context tracking
- Platform raw feed tab (all incoming data)
- Workflow guide for new users
- Manual inquiry creation
- Quote generation from inquiry
- Triage suggestions (AI-assisted)
- Cross-platform client matching

**Route count:** 9 inquiry pages + 33 inquiry components

---

### 6. Prospecting (Admin-Only)

B2B lead generation and enrichment system. Visible only to admin users.

**Capabilities:**

- Prospect queue with priority scoring
- Pipeline stages and stage history
- Geo-cluster view for geographic targeting
- Outreach log and script editor
- AI call script generation
- Follow-up sequences
- CSV import and bulk operations
- Prospect merging and deduplication
- Lookalike matching
- Auto-pipeline rules
- Conversion funnel tracking
- Re-enrichment from external sources

**Route count:** 8 prospecting pages + 24 prospecting components

---

### 7. Quote & Proposal System

Professional proposals with pricing, menu selection, and client approval workflow.

**Capabilities:**

- Quote creation with line items and pricing
- Proposal builder with visual sections
- Proposal preview (client view)
- Smart field renderer for dynamic content
- Version history tracking
- Status machine: draft -> sent -> accepted | rejected | expired
- Package picker and addon selector
- Pricing insights sidebar
- Client spending hints
- Default terms management
- Lost reason tracking
- Public proposal view (shareable link)

**Route count:** 15+ quote pages + 14 quote components + 7 proposal components

---

### 8. Calendar & Scheduling

Multi-view calendar with availability management and booking.

**Capabilities:**

- Day, week, year calendar views
- Availability block management
- Booking rules (daily caps, date overrides)
- Seasonal availability periods
- Calendar sharing (public link)
- Google Calendar sync (bidirectional)
- iCal feed generation
- Conflict detection
- Recurring availability patterns
- Event detail popovers
- Capacity calendar with settings
- Travel logistics integration
- Waitlist management

**Route count:** 6 calendar pages + 11 calendar components + 22 scheduling components

---

### 9. Communication & Messaging

Multi-channel communication hub.

**Capabilities:**

- Unified inbox (Gmail, SMS, inquiries, platform messages)
- Real-time chat with clients (WebSocket via Supabase Realtime)
- Message threads and conversation history
- Email composer with templates
- Auto-response settings and business hours
- SMS via Twilio (rate-limited)
- Follow-up automation rules
- Touchpoint scheduling and tracking
- Client communication stats
- File and image sharing in chat
- Typing indicators and presence dots
- Quick replies and system messages
- Inbox triage with AI suggestions
- Email history scanning (Gmail import)

**Route count:** 5 inbox pages + 20 chat components + 14 communication components

---

### 10. Analytics & Business Intelligence

Data-driven insights across all business operations.

**Capabilities:**

- Booking conversion funnel (inquiry -> event)
- Demand heatmap (peak days/times/seasons)
- Client lifetime value analysis and charts
- Referral source attribution
- Revenue summaries and trends
- Industry benchmark comparisons
- Holiday year-over-year tables
- Loss analysis (why deals were lost)
- Pipeline forecasting
- Channel comparison dashboards
- Performance telemetry
- Daily automated reports

**Route count:** 9 analytics pages + 31 analytics components

---

### 11. Staff & Team Management

Scheduling, task assignment, and labor tracking for staff.

**Capabilities:**

- Staff directory with profiles
- Schedule calendar with shift management
- Time clock (punch in/out)
- VA (virtual assistant) task board
- Labor dashboard and cost tracking
- Staff availability management
- Performance metrics
- Live staff status
- Shift forms and event views
- Contractor agreements
- Staff meals tracking
- Payroll integration

**Route count:** 8 staff pages + 25 staff components

---

### 12. Kitchen Operations & Stations

Real-time kitchen management during events.

**Capabilities:**

- Station assignment and clipboard system
- Daily operations board
- Order management and handoff
- Course fire sequencing
- Kitchen display system (KDS)
- Operations log
- Waste tracking
- Shift check-in/out
- Shelf life indicators
- 86'd item banner
- Print-ready station views
- Voice mode toggle

**Route count:** 8 station pages + 12 station components

---

### 13. Marketing & Social Media

Campaign management and social media scheduling.

**Capabilities:**

- Campaign builder with templates
- Campaign performance tracking
- Social content calendar (monthly view)
- Multi-platform publishing (Instagram, TikTok, Meta)
- Social template library with import/share
- Caption editor and hashtag picker
- Platform-specific previews
- Content pipeline management
- Push dinner campaigns
- Email sequences and automation
- Outreach tracking
- Content vault/library
- Queue management and scheduling
- Disclosure preflight for sponsored content

**Route count:** 15+ marketing pages + 13 marketing components + 25 social components

---

### 14. Loyalty & Guest Experience

Customer retention through loyalty programs and memorable experiences.

**Capabilities:**

- Loyalty program with points, tiers, and rewards
- Referral tracking and referral rewards
- Gift certificate management and purchase
- Guest profiles and visit history
- Post-event surveys and feedback collection
- Testimonial management and curation
- Review management (multi-platform)
- Guest RSVP tracking
- Event countdown pages
- Excitement walls and photo galleries
- Event story/recap sharing
- Raffle and contest management

**Route count:** Various pages across client, public, and chef portals + 20+ components

---

### 15. Remy AI Concierge

Client-facing conversational AI powered by local Ollama (privacy-first).

**Capabilities:**

- Natural language conversation with clients
- Inquiry interpretation and structured data extraction
- Draft response generation (chef reviews before sending)
- Quote and proposal drafting assistance
- Business insights and trend analysis
- Lead scoring and churn prediction
- Prep timeline estimation
- Equipment depreciation explanations
- Chef bio generation
- Grocery consolidation suggestions
- Expense categorization hints
- Sentiment analysis on client messages
- Survey result extraction
- Menu nutritional analysis
- Service timeline planning

**Hard restrictions (permanently enforced):**

- Never generates or suggests recipes
- Never writes to the financial ledger
- Never transitions event lifecycle states
- Never merges client accounts or alters identity
- Never auto-sends messages (chef must approve)
- Never modifies canonical state without confirmation

**Route count:** 50+ AI components across multiple domains

---

### 16. Integrations & External Platforms

Connections to third-party services.

**Supported platforms:**

| Category    | Platforms                                  |
| ----------- | ------------------------------------------ |
| Website     | Wix (inquiry ingestion)                    |
| Email       | Gmail (OAuth2, bidirectional sync)         |
| Calendar    | Google Calendar (OAuth2, bidirectional)    |
| Payments    | Stripe, Stripe Connect                     |
| POS         | Square, Shopify, Clover, Toast, Lightspeed |
| CRM         | HubSpot, Salesforce                        |
| Accounting  | QuickBooks                                 |
| E-Signature | DocuSign                                   |
| Automation  | Zapier, Make                               |
| Reviews     | Yelp                                       |
| SMS         | Twilio                                     |
| Social      | Instagram, TikTok, Meta                    |
| Custom      | Webhooks (HMAC-SHA256 signed), CSV import  |

---

### 17. Commerce & Point of Sale

Retail operations for meal prep stores, pop-ups, and events.

**Capabilities:**

- Point of sale register
- Product catalog management
- Order queue board
- Table service mode
- Virtual card terminal
- Sales reconciliation
- Payment settlements
- Promotions and discounts
- Shift scheduling and reports
- Multi-location parity
- System observability
- Kiosk mode (tablet interface)
- Staff PIN login

**Route count:** 20+ commerce pages + various POS components

---

### 18. Inventory & Procurement

Stock management from ingredients to equipment.

**Capabilities:**

- Ingredient inventory with counts and locations
- Demand forecasting
- Expiry alerts
- Waste logging
- Purchase order management
- Vendor invoice tracking
- Physical inventory audits
- Staff meal tracking
- Storage location management
- Equipment inventory with maintenance schedules
- Equipment depreciation tracking
- Packing checklists for events

**Route count:** 18+ inventory pages + 15 inventory components + 5 equipment components

---

### 19. Documents & Contracts

Document management, contract generation, and e-signatures.

**Capabilities:**

- Document library with search
- Event workspace (documents per event)
- Contract templates and versioning
- Contract signing (signature pad)
- PDF generation (invoices, receipts, production reports, prep timelines)
- Document version history
- Related documents panel
- Bulk document generation
- Print-friendly views (event briefs, grocery lists, menus, recipes)

---

### 20. Network & Community

Chef-to-chef collaboration and community features.

**Capabilities:**

- Chef network and connections
- Collaboration requests and inbox
- Contact sharing
- Dinner circles (group communities)
- Hub groups with notes boards and availability grids
- Peer mentorship matching
- Feature request board and roadmap
- Community templates sharing
- Channel/group chat
- Network notifications

**Route count:** 10+ network pages + 18 community components + 30 hub components

---

### 21. Settings & Configuration

Extensive customization across all platform aspects.

**Categories:**

- Profile and account management
- Business profile and culinary identity
- Appearance (themes, colors, seasonal palettes)
- Pricing and rate cards
- AI and privacy controls (Remy configuration)
- Integration connections
- Automation rules
- Communication preferences
- Notification tier settings
- Compliance (GDPR, HACCP)
- Insurance and business continuity
- Emergency contacts and backup chef
- Event types and contract templates
- Calendar sync
- Embed widget configuration
- Dashboard layout customization
- Custom fields and taxonomy

**Route count:** 70+ settings pages + 54 settings components

---

### 22. Safety & Compliance

Food safety, regulatory compliance, and risk management.

**Capabilities:**

- Pre-service safety checklists
- Cross-contamination analysis
- HACCP plan builder and views
- Temperature logging
- Incident reporting and resolution tracking
- Recall alerts
- Insurance policy management
- Certification tracking with expiry alerts
- Business continuity planning
- Crisis playbook
- NDA management
- Equipment safety checklists
- Cannabis compliance (specialized vertical)

---

### 23. Onboarding & Help

Guided setup and ongoing education.

**Capabilities:**

- Multi-step onboarding wizard
- Tour system with spotlights and tooltips
- Role-specific tours (chef, client, staff)
- Contextual help articles
- Replay tour button
- Demo data manager
- Welcome modals and celebration states
- Empty state guides
- Recipe entry onboarding form

---

### 24. Reporting & Exports

Comprehensive data output capabilities.

**Capabilities:**

- Financial reports (P&L, revenue by event/client/month, expense by category)
- Tax reports (1099-NEC, quarterly estimates, year-end summary)
- Daily automated reports
- CSV export for any data set
- PDF generation (invoices, receipts, contracts, production reports)
- Partner performance reports
- Staff/labor reports
- Shift reports
- Print-friendly views for all key documents

---

### 25. Additional Specialized Features

| Feature                      | Purpose                                                                  |
| ---------------------------- | ------------------------------------------------------------------------ |
| **Games**                    | Menu Muse, Trivia, Snake, Galaga, Tic-Tac-Toe, The Line (engagement/fun) |
| **Cannabis vertical**        | Specialized compliance, event cards, tier badges, control packets        |
| **Charity tracking**         | Charitable hours, WFP feed, nonprofit badge                              |
| **Wine pairing**             | Wine data and pairing suggestions                                        |
| **Sustainability**           | Sourcing dashboard, waste reduction, carbon tracking                     |
| **Travel tracking**          | Mileage, travel expenses, route planning                                 |
| **Goals**                    | Revenue targets, business goals, life balance wheel                      |
| **Journal/Journey**          | Chef journey mapping, reflective journaling                              |
| **Portfolio**                | Public portfolio gallery and showcase                                    |
| **Professional development** | Capability inventory, education log, growth check-ins                    |
| **Weather integration**      | Outdoor event weather panels                                             |
| **Offline support**          | PWA with offline indicator and sync                                      |
| **Voice mode**               | Voice input for kitchen operations                                       |
| **QR codes**                 | Event QR codes, guest check-in                                           |

---

## Database Architecture Summary

**690+ tables** organized in architectural layers:

| Layer | Domain                | Key Tables                                                                           |
| ----- | --------------------- | ------------------------------------------------------------------------------------ |
| 1     | Foundation            | `chefs`, `clients`, `user_roles`, `audit_log`                                        |
| 2     | Inquiries & Messaging | `inquiries`, `inquiry_state_transitions`, `messages`, `response_templates`           |
| 3     | Events & Financials   | `events`, `event_state_transitions`, `quotes`, `ledger_entries`, `expenses`          |
| 4     | Menus & Recipes       | `menus`, `dishes`, `components`, `recipes`, `ingredients`                            |
| 5+    | Features              | Scheduling, chat, guests, loyalty, AI, staff, marketing, social, inventory, and more |

**Key patterns:**

- Multi-tenant isolation via `tenant_id`/`chef_id` on every table
- Row-level security (RLS) policies on all tables
- Immutable audit trails for all state transitions
- Append-only ledger for financial data
- Database triggers enforce business rules (FSM validation, pricing snapshots, computed fields)
- Views for derived state (financial summaries, cost rollups)

---

## Email System

80+ React Email templates covering the full communication lifecycle:

| Category                | Templates | Examples                                                                                                                                                   |
| ----------------------- | --------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Event lifecycle**     | 8         | Reminders at 30d/14d/2d/same-day, confirmed, cancelled, completed, starting                                                                                |
| **Inquiry/Quote**       | 7         | Inquiry received, proposal sent, quote accepted/rejected/expired/expiring                                                                                  |
| **Payment**             | 6         | Confirmation, failed, received (chef), reminder, offline receipt, refund                                                                                   |
| **Menu workflow**       | 4         | Approval request, approved, revision, FOH menu ready                                                                                                       |
| **Post-event**          | 5         | Thank you, review request, survey, referral ask, circle thanks                                                                                             |
| **Contracts**           | 2         | Contract sent, signed notification                                                                                                                         |
| **Community/Directory** | 6         | Directory welcome/claimed/verified, circle updates/digest, friend requests                                                                                 |
| **Commerce**            | 3         | Sale receipt, gift card purchase (chef + client)                                                                                                           |
| **Admin/Beta**          | 5         | Beta signup, welcome, survey invite, developer alerts, developer digest                                                                                    |
| **Other**               | 15+       | Availability signals, collaboration invites, client invitations, photos ready, booking confirmations, RSVP reminders, incentive delivery, prep sheet ready |

Delivery via Resend with circuit breaker protection (5-failure threshold, 60s reset). All emails are non-blocking: failures logged, never thrown.

---

## Scheduled Background Jobs (Cron)

10 automated daily tasks, all authenticated via `verifyCronAuth()` with heartbeat monitoring:

| Job                    | Purpose                                                                                      | Schedule                   |
| ---------------------- | -------------------------------------------------------------------------------------------- | -------------------------- |
| **Morning Briefing**   | Generates daily briefing per tenant, stored as `remy_alerts`                                 | Daily 7 AM EST             |
| **Circle Digest**      | Batched email digests to hub/circle members                                                  | Hourly (daily at 9 AM UTC) |
| **Developer Digest**   | System health digest to developer                                                            | Daily 7 AM EST             |
| **Account Purge**      | Purge accounts past 30-day deletion grace (anonymize financials, clean storage, delete auth) | Daily                      |
| **Brand Monitor**      | Web search for brand mentions, detect negative sentiment                                     | Daily                      |
| **Cooling Alert**      | Detect client relationships cooling (no event in 90d, no upcoming bookings)                  | Daily                      |
| **Renewal Reminders**  | Insurance/certification expiry reminders (7d, 30d, 90d windows)                              | Daily                      |
| **Quarterly Check-in** | Notify chefs when business health check-in is due                                            | Daily                      |
| **Momentum Snapshot**  | Daily snapshot of growth signals (new clients, projects, dishes)                             | Daily                      |
| **Recall Check**       | FDA recall matching against chef ingredients, create safety notifications                    | Daily 9 AM                 |

Additional scheduled API routes: activity cleanup, daily report, integration sync/retry, revenue goal checks, review sync, RSVP reminders/retention, simulation checks, wellbeing signals.

---

## PDF & Document Generation

20+ server-side PDF generators (PDFKit + jsPDF):

| Document            | Purpose                                                  |
| ------------------- | -------------------------------------------------------- |
| Invoice PDF         | Professional invoice with terracotta branding            |
| Contract PDF        | Client contract with terms and signature fields          |
| Financial summary   | Event or period financial recap                          |
| Front-of-house menu | Client-facing menu (elegant formatting)                  |
| Prep sheet          | Kitchen prep schedule and timeline                       |
| Packing list        | Equipment and supply checklist                           |
| Grocery list        | Ingredient shopping list                                 |
| Execution sheet     | Kitchen execution plan for service                       |
| Allergy card        | Prominent dietary/allergy display                        |
| Serving labels      | Dish labels for buffet/plated service                    |
| Commerce receipt    | POS transaction receipt                                  |
| Content shot list   | Photo/content planning for events                        |
| Event summary       | One-page event overview (who/where/what/dietary/payment) |
| Production report   | Post-event production analytics                          |
| Shift report        | Staff shift summary                                      |
| Quote/Proposal      | Client-facing pricing proposal                           |
| Menu PDF            | Full menu document                                       |
| Checklist           | Pre-event safety/readiness checklist                     |

Brand color across all PDFs: terracotta orange `#e88f47`. All monetary amounts formatted from cents.

---

## Embeddable Widget

Self-contained vanilla JS widget (`public/embed/chefflow-widget.js`) that any website can embed:

- **Inline mode:** Embeds inquiry form directly in a page (max-width 600px)
- **Popup mode:** Floating button that opens form in a modal overlay
- **Configuration via data attributes:** chef-id, accent color, theme, button text, UTM tracking
- **PostMessage API:** Fires `chefflow-inquiry-submitted`, `chefflow-widget-loaded`, `chefflow-widget-resize`
- **Auto-origin detection:** Works across localhost, beta, and production
- No framework dependencies. No Tailwind. Inline styles only. Relaxed CSP (`frame-ancestors *`).

---

## Progressive Web App (PWA)

Service worker (`public/sw.js`) with:

- **Cache strategy:** Stale-while-revalidate for assets, network-first for navigation
- **Version-stamped cache:** `chefflow-v-{BUILD_ID}`, old caches auto-deleted on activation
- **Auto-update polling:** Checks `/api/build-version` every 5 minutes, notifies clients of new versions
- **Push notifications:** Handles push events, subscription management, click-to-navigate
- **Offline mode:** Returns `offline.html` when navigation fails
- **Excluded from cache:** All `/api/*` routes
- PWA only active when `ENABLE_PWA_BUILD=1` (avoids Windows build manifest corruption)

---

## Middleware & Security

Root `middleware.ts` runs on every request:

- **Auth check:** Verifies Supabase session, resolves role from `user_roles`
- **Role-based routing:** Chefs to `/dashboard`, clients to `/my-events`, staff to `/staff-dashboard`, partners to `/partner/dashboard`
- **Tenant resolution:** Derives `tenant_id` from session (never from request body)
- **CSP headers:** Three security profiles:
  - `/embed/*` - Allows framing (`frame-ancestors: *`) for external embeds
  - `/kiosk/*` - Strict, no framing, inline scripts
  - All others - Strict, `frame-ancestors: none`, allows Stripe/PostHog/Google
- **Public paths excluded:** `/`, `/auth/*`, `/privacy`, `/pricing`, `/discover`, `/api/health`, `/api/embed/*`

---

## Testing Infrastructure

**9 Playwright test projects** (sequential execution to prevent multi-tenant state leaks):

| Suite            | Purpose                                                                        |
| ---------------- | ------------------------------------------------------------------------------ |
| **smoke**        | No auth, no DB dependency                                                      |
| **chef**         | Chef-authenticated flows (files 01-42)                                         |
| **client**       | Client portal, quote/payment flows                                             |
| **public**       | Unauthenticated public pages                                                   |
| **mobile-audit** | Full viewport matrix, responsive checks                                        |
| **coverage**     | Exhaustive URL coverage by role (public/chef/client/admin/auth-boundaries/API) |
| **interactions** | Form mutations, FSM transitions, state changes                                 |
| **isolation**    | Multi-tenant security (Chef A accessing Chef B data)                           |
| **experiential** | Blank screen detection, cross-boundary UX verification                         |

Additional test types:

- **Unit tests:** Node test runner (`tests/unit/**`)
- **Soak tests:** Memory/DOM leak detection (100+ repeated navigation loops, Chrome DevTools Protocol)
- **Stress tests:** AI queue concurrency (basic/high/sustained/failure modes)
- **Journey tests:** 335-scenario first-month chef experience
- **Remy quality tests:** Multi-suite AI behavior validation (comprehensive, adversarial, multi-turn, voice, hallucination)

---

## Operational Scripts (60+)

| Category       | Scripts                                                                                                        | Purpose                                        |
| -------------- | -------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Deployment** | deploy-beta.sh, deploy-prod.sh, rollback-beta.sh, rollback-prod.sh                                             | Build, sync, restart environments              |
| **Health**     | health-check.sh, uptime-watchdog.sh                                                                            | Monitor and auto-restart                       |
| **Database**   | backup-db.sh, seed-local-demo.ts, seed-e2e-remote.ts, cleanup-e2e-data.ts, db-integrity-audit.mjs              | Backup, seed, clean, audit                     |
| **Validation** | run-typecheck.mjs, run-next-build.mjs, verify-release.mjs, check-bundle-budget.mjs, check-file-line-budget.mjs | Pre-release quality gates                      |
| **AI quality** | test-remy-_.mjs, test-gustav_.mjs, remy-delivery-smoke.mjs                                                     | AI behavior validation                         |
| **Event ops**  | create-event-packet.mjs, grazing-event-packet.mjs, reconcile-event-financials.mjs                              | Real event operations                          |
| **Security**   | secret-scan.mjs, privacy-artifact-guard.mjs                                                                    | Detect leaked secrets, ensure no PII in source |
| **Analytics**  | overnight-audit.mjs, coverage-overnight-runner.mjs, audit-notifications.mjs                                    | Nightly audits and coverage                    |

---

## Monitoring & Resilience

| Pattern                     | Implementation                                                               |
| --------------------------- | ---------------------------------------------------------------------------- |
| Circuit breakers            | Stripe, Resend, MealMe, Kroger, Gemini (5-failure threshold, 60s reset)      |
| Non-blocking side effects   | Emails, webhooks, activity logs wrapped in try/catch, never throw            |
| Side effect failure capture | `side_effect_failures` table for structured failure logging                  |
| Activity logging            | `chef_activity_log` table with opt-out support                               |
| Webhook security            | HMAC-SHA256 signatures, SSRF protection                                      |
| Error reporting             | Sentry integration                                                           |
| Health checks               | `/api/health`, `/api/health/ping`, `/api/health/readiness`, `/api/ai/health` |

---

## Monetization Model

**All features are free. No paywalls. No Pro tier.**

Revenue comes exclusively from voluntary supporter contributions via Stripe checkout (cancel anytime). The billing page is labeled "Support ChefFlow." Community growth is the priority.

---

## Codebase Size

**294,736 total lines** across all source files (excluding `node_modules`, build output, `.git`).

| Language                   |   Lines | What it covers                                                                                   |
| -------------------------- | ------: | ------------------------------------------------------------------------------------------------ |
| TypeScript (.ts/.tsx)      | 134,484 | App pages, components, lib, server actions, tests (includes 48,597 auto-generated `database.ts`) |
| Markdown (.md)             |  73,584 | Documentation, audits, memory, changelogs                                                        |
| JavaScript (.js/.jsx/.mjs) |  44,119 | Scripts, service worker, embed widget, configs                                                   |
| SQL (.sql)                 |  22,442 | Database migrations across 7+ architectural layers                                               |
| HTML (.html)               |  13,094 | Mission Control launcher, offline page, email previews                                           |
| Shell (.sh/.ps1)           |   4,776 | Deploy, rollback, health check, start scripts                                                    |
| CSS (.css)                 |   2,237 | Single `globals.css` (Tailwind handles the rest)                                                 |

**Executable code only** (no docs, no generated types): **~172,555 lines**.

Breakdown of the TypeScript by purpose:

| Category                             |  Lines |
| ------------------------------------ | -----: |
| Components (UI)                      | 73,840 |
| Lib (business logic)                 | 72,184 |
| Tests                                | 65,750 |
| Scripts (ops, deploy, AI quality)    | 49,496 |
| Types (hand-written)                 | 32,760 |
| App pages (routes)                   | 21,375 |
| Types (auto-generated `database.ts`) | 48,597 |

Additionally: **57,937 JSON files** of OpenClaw crawler findings (scraped business directory data, not application code).

---

## Summary

ChefFlow is a **659-page, 285-API-endpoint, 690-table, 172K-line, privacy-first operating system** for private chef businesses. It covers the entire operational lifecycle: discovery, inquiry, quoting, event planning, kitchen operations, financial reconciliation, client retention, marketing, team management, and business intelligence.

It is self-hosted, AI-augmented (with hard privacy boundaries), ledger-backed for financial integrity, and free for all users. Every feature exists to let chefs focus on their art while the system handles the business.

_Ops for Artists._

# What Is ChefFlow?

**ChefFlow is a chef operating system.** It is the complete digital infrastructure for running an independent culinary business, from the first client inquiry to the post-event review, from recipe costing to tax filing, from staff scheduling to loyalty programs.

It is not a booking tool. It is not a CRM. It is not a POS. It is all of those things and more, unified under one platform purpose-built for private chefs, personal chefs, bakery operators, food truck owners, and meal prep businesses.

**Tagline:** Ops for Artists

---

## The 6 Pillars

ChefFlow organizes the entire chef business lifecycle into six operational pillars:

| Pillar    | What It Covers                                                                                                         |
| --------- | ---------------------------------------------------------------------------------------------------------------------- |
| **Sell**  | Inquiries, quotes, proposals, lead scoring, prospecting, partner referrals, booking pages, embeddable widgets          |
| **Plan**  | Menus, recipes, ingredients, costing, prep timelines, shopping lists, vendor sourcing, seasonal palettes               |
| **Cook**  | Day-of operations, station management, temperature logging, packing lists, contingency plans, staff briefings          |
| **Stock** | Inventory tracking, vendor management, purchase orders, carry-forward ingredients, par levels, waste reduction         |
| **Money** | Invoicing, payments, expenses, ledger, tax tracking, mileage, payroll, food cost analysis, revenue goals               |
| **Grow**  | Analytics, client intelligence, loyalty programs, marketing campaigns, reviews, chef network, professional development |

---

## Complete Capability Inventory

### 1. Sales Pipeline

**Inquiry Management**

- Unified inbox for inquiries from all channels (email, website form, Instagram DM, phone, text, referral, TakeAChef, Wix, embeddable widget)
- Automatic field extraction from emails via GOLDMINE (deterministic, no cloud AI)
- Instant lead scoring (0-100) based on budget, timeline, completeness, occasion type
- 5-state pipeline: New, Awaiting Client, Awaiting Chef, Quoted, Confirmed/Declined/Expired
- Follow-up scheduling with automated reminders
- Inquiry-to-quote conversion in one click
- Response time SLA tracking (ghost rate, average response time)

**Quoting**

- Multi-menu quote builder with per-guest and flat-rate pricing
- Quote versioning (revise without losing history)
- Pricing benchmarks for new chefs (what others charge for similar events)
- Quote templates by occasion type
- Send quotes via email with one-click accept/decline for clients
- Quote expiration timers
- Win/loss analysis (why quotes were declined)

**Proposals**

- Full proposal builder with sections (introduction, menu, pricing, terms)
- Custom branding per chef
- Shareable proposal links (no login required for client)
- E-signature integration (DocuSign)

**Prospecting (Admin Only)**

- Lead generation tools with CSV import
- Prospect pipeline (queued, contacted, follow-up, converted)
- AI scrubbing and enrichment
- Conversion funnel visualization
- Call queue management

**Booking Pages**

- Public booking page per chef (custom slug)
- Availability calendar display
- Instant booking option
- Rebook links for past clients
- Waitlist for fully booked dates

**Embeddable Widget**

- Self-contained inquiry form (vanilla JS, no Tailwind, works in any iframe)
- White-label branding (removable "Powered by ChefFlow" on Pro)
- Configurable fields and styling
- Installed on any external website with one script tag

**Partners & Referrals**

- Partner directory with referral tracking
- Partner portal (separate login)
- Commission/attribution tracking
- Referral sequence automation (email follow-ups)

**Guest Leads**

- Capture leads from event guests (QR code at table)
- Track conversion from guest to client
- Outreach campaigns to captured leads

**Testimonials & Reviews**

- Collect reviews from clients post-event
- Display on public profile
- Automated review request emails
- Aggregate ratings from external platforms (Google, Yelp, TakeAChef)

---

### 2. Event Lifecycle Management

**8-State Finite State Machine**

- Draft, Proposed, Accepted, Paid, Confirmed, In Progress, Completed, Cancelled
- Every state transition is logged immutably with timestamp and metadata
- Transition rules enforced (cannot skip states, cannot reverse without cancellation)

**Event Creation & Planning**

- Create from scratch or clone from past event
- Link to inquiry/quote for full sales-to-ops traceability
- Multi-day event support
- Travel event planning (route legs, vendor stops)
- Event type templates (dinner party, corporate, wedding, meal prep, etc.)

**Event Detail (4 Master Tabs)**

_Overview:_

- Event details (date, time, location, guest count, occasion)
- Client info with dietary restrictions and preferences
- Guest RSVP system (invite guests, track responses, collect dietary info)
- Map and weather integration for event location
- Communication log (all messages related to this event)
- AI allergen risk matrix (cross-reference guest allergies with menu)
- Service contract management
- Event recap sharing (shareable post-event summary)
- Guest lead capture QR code

_Money:_

- Menu assignment with food cost breakdown
- Financial summary (quoted amount, deposits received, balance due)
- Payment plan manager (installments, due dates)
- Expense tracking with receipt capture and OCR
- Mileage and tip logging
- Profit summary (revenue, expenses, margin %, food cost %, effective hourly rate)
- Loyalty points earned for this event
- Split billing (multiple payers)

_Operations:_

- Menu approval workflow (send to client, track approval status)
- Staff roster (assign staff, set roles, track hours)
- AI staff briefing generation
- Prep and service timeline (shopping, prep, packing, driving, execution phases)
- Temperature logging with anomaly detection
- Shopping substitutions and menu modifications during execution
- Carry-forward inventory (track leftovers from past events)
- AI grocery list consolidation across events
- Contingency plan management
- Printable documents: Day-of-Plan (DOP), packing list, grocery list, service execution sheet
- Event readiness gate (hard blocks for missing critical info, soft warnings)
- FSM transition buttons (Propose, Confirm, Start Service, Complete/Cancel)

_Wrap-Up:_

- After-Action Review (AAR) form (calm rating, prep rating, execution rating)
- Structured reflection (what went well, what to improve, forgotten items)
- Client satisfaction survey
- AI-generated AAR draft, review request, gratuity framing, social captions
- Post-event debrief (photos, recipe notes, client insights)
- 5-step close-out wizard (Tip, Receipts, Mileage, Reflection, Complete)

**Event Sub-Pages**

- Edit form with prep time estimate bar
- Day-of timeline and DOP checklist
- 5-section packing checklist with departure callout
- Travel legs with sourcing status
- Multi-vendor grocery price comparison (USDA, Spoonacular, Kroger, MealMe)
- Invoice with payment history and loyalty adjustments
- Receipt gallery with OCR extraction
- Split billing configuration
- Kitchen Display System (KDS) for course tracking (fire, plate, serve progression)
- Mobile-optimized DOP with large tap targets
- Printable guest table QR cards
- Interactive tappable documents

---

### 3. Client Relationship Management

**Client Directory**

- Full contact management with search, filter, sort
- Health badges (active, at-risk, dormant, VIP)
- Bulk actions (archive, tag, export)
- Duplicate detection and merge
- CSV import and export

**Client Profile (30+ Panels)**

- Contact information and demographics
- Statistics (total events, completed, total spent, average event value)
- Profitability history (margin, food cost, hourly rate with trend charts)
- Lifetime value trajectory
- Menu history (every dish/menu served to this client)
- Direct outreach (compose email/SMS with template selection)
- Financial detail (event-by-event breakdown with ledger entries)
- Loyalty card (tier badge, points balance, rewards, transaction history)
- Personal info (preferred name, partner name, family notes)
- Pet manager
- Photo gallery
- Kitchen profile (equipment, constraints, utilities, notes for when cooking at their home)
- Availability calendar
- Past events with links
- Quote history
- Inquiry history
- Communication templates
- Billing address and payment methods
- Contract templates
- Dietary restrictions, allergies, dislikes, favorites
- Vibe notes (personality, communication style, what they care about)

**Client Intelligence**

- Health scoring (engagement frequency, spending trend, satisfaction signals)
- Churn prediction (at-risk detection based on booking gaps)
- Rebooking analysis (when clients typically rebook)
- Client segmentation (tag-based, behavioral)
- Top clients by revenue concentration
- Most frequent clients by booking count
- Communication history across all channels

**Dietary Management**

- 17 major allergen groups tracked per client and per guest
- Cross-contamination risk analysis
- Dietary restriction propagation to menus and recipes
- Guest dietary confirmation workflow before events

---

### 4. Culinary Operations

**Recipes**

- Private recipe library (manual entry only; AI never generates or modifies recipes)
- Ingredients with quantities, units, and costs
- Instructions with timing
- Dietary and allergen tags (auto-computed from ingredients)
- Cook time, skill level, serving size
- Photo gallery per recipe
- Cost calculation with per-serving breakdown
- Scaling calculator
- Recipe versioning
- Sharing with other chefs in network
- PDF export
- AI parsing from uploaded recipe photos or text (parses what chef provides, never invents)
- Sprint mode for batch recipe entry

**Menus**

- Menu template library
- Drag-and-drop dish arrangement by course
- Menu costing (per-dish cost, total cost, cost per guest, food cost %)
- Client-facing menu preview
- Menu approval workflow (send to client, track approval)
- Menu versioning (save variants without losing original)
- Menu state machine: Draft, Shared, Locked, Archived

**Ingredients**

- Master ingredient database
- Price tracking by vendor with history
- Unit conversion reference
- Nutritional information (via Spoonacular)
- Allergen tagging
- Substitution tracking

**Components**

- Reusable dish building blocks (sauces, proteins, starches, vegetables, garnishes, etc.)
- Linked to recipes with scaling factors
- Cost tracking per component

**Food Costing**

- Per-recipe ingredient cost breakdown
- Per-menu cost summary with margin analysis
- Per-event food cost percentage tracking
- Monthly food cost trending (target: 28-35%)
- Vendor price comparison for cost optimization
- High food cost alerts

**Prep Operations**

- Batch prep planner (consolidate prep across multiple events)
- Prep timeline visualization (shopping, prep, packing, driving, execution phases)
- In-page ingredient search across events for shopping consolidation
- Staff utilization by prep phase
- Printable prep labels (ingredient, event, date)
- Scheduled prep blocks on calendar

**Seasonal Palettes**

- Seasonal flavor profiles (spring, summer, fall, winter)
- Occasion-based menu templates
- Micro-window ingredient availability tracking

**Vendors**

- Vendor directory with contact info and pricing
- Delivery schedules and lead times
- Order history and reorder automation
- Price comparison across vendors
- Document intake (invoices, catalogs)
- Payment aging tracking

**Inventory**

- Current stock by location (pantry, fridge, freezer)
- Par level management with alerts
- Receive shipments and log depletion
- Carry-forward from past events
- FIFO expiration tracking
- Waste tracking and reduction
- Physical inventory counts and audits

---

### 5. Day-of Operations

**Morning Briefing**

- Daily summary: today's events, guest counts, dietary requirements
- Weather for each event location
- Recent client preference changes
- Last-minute modifications
- Overdue items and pending inquiries

**Prep Timeline**

- Phase-by-phase countdown to service time
- Time estimates per phase
- Parallel activity suggestions
- Vendor delivery windows

**Packing Lists**

- 5-section organization (cold bin, dry bin, tools, fragile, other)
- Non-negotiables checklist (permanent critical items that never change)
- Event-specific additions
- Departure callout with weather and traffic

**Station Management (Kitchen Clipboard / KDS)**

- Per-station digital checklists
- Live order tracking: Fire, Plate, Serve progression
- Multiple stations (pantry, plating, dessert, etc.)
- Real-time updates via Supabase subscriptions
- Printable course batches
- Full-screen mobile station view

**Temperature Logging**

- Food safety temperature tracking during prep and service
- Anomaly detection (flag out-of-range temperatures)
- HACCP compliance documentation

**Service Execution**

- Printable one-page service guide (menu reference, component counts, dietary flags)
- Staff activity board
- Quick-assign for task delegation
- Pre-service checklist (final readiness verification)
- Shift handoff notes between service shifts

**Contingency Planning**

- Backup plans for each event
- Alternative vendor contacts
- Substitution options for key ingredients
- AI-assisted contingency suggestions

---

### 6. Staff & Team Management

**Staff Roster**

- Team member profiles (sous chefs, kitchen assistants, service staff)
- Hourly rates and pay tracking
- Certifications and training records
- Availability scheduling
- Performance metrics and notes
- Code of conduct management

**Event Staffing**

- Assign staff to events with role designation
- Hours tracking per event
- Pay computation
- Station assignments

**Time Tracking**

- Punch clock (check in/check out)
- Time tracking across roles
- Break tracking
- Overtime calculation

**Staff Portal**

- Separate staff login
- View assigned events and tasks
- Access prep documents (DOP, grocery, packing lists)
- Task completion tracking
- Notes and communication

**Labor Analytics**

- Labor cost per event
- Staff utilization rates
- Labor forecasting
- Payroll management
- 1099 contractor tracking

---

### 7. Financial System

**Ledger-First Architecture**

- Immutable, append-only financial journal (enforced by database triggers)
- All balances computed from ledger entries (never stored directly)
- Entry types: payment, deposit, installment, final_payment, tip, refund, adjustment, add_on, credit
- Payment methods: cash, Venmo, PayPal, Zelle, card, check
- Idempotent entry creation (prevents duplicates from webhooks)

**Invoicing**

- Generate invoices from events
- Loyalty discount application (computed on subtotal, tax recalculated)
- Payment history tracking
- Web and PDF views
- Send/share via email or link

**Payments**

- Stripe integration (credit card, ACH, Apple Pay, Google Pay)
- Record cash/check/Venmo/PayPal/Zelle payments manually
- Payment plan management (installments with due dates)
- Deposit tracking
- Refund processing

**Expenses**

- Log and categorize business expenses
- Receipt capture with OCR (photo to line items)
- Auto-categorization
- Per-event expense linking
- Bulk categorization

**Revenue Analytics**

- Monthly revenue summary with 6-month sparkline
- Year-over-year comparison
- Revenue per hour analysis (effective hourly rate)
- Revenue per guest
- Revenue per mile
- Revenue concentration by client
- Revenue goal tracking with gap analysis

**Food Cost Tracking**

- Per-event food cost percentage
- Monthly trending (target: 28-35%)
- Per-recipe and per-menu cost breakdown
- High food cost alerts

**Tax Center**

- Deduction tracker by category (groceries, equipment, mileage, supplies, marketing, etc.)
- Tax summary PDF export for accountant
- Quarterly estimate calculation
- Mileage log (IRS-compliant with automated deduction computation)
- Home office deduction tracking

**Cash Flow**

- Monthly cash flow calendar
- Forecasting based on upcoming events and payment plans
- Outstanding receivables tracking

**Payroll**

- Staff payment tracking
- Per-event labor cost
- 1099 contractor management
- Payroll runs

**Stripe Integration**

- Stripe Connect (chefs get their own Stripe accounts)
- Payment processing with automatic receipts
- Payout scheduling and reconciliation
- Dispute handling
- Subscription billing for Pro tier

---

### 8. Calendar & Scheduling

**Calendar Views**

- Month, week, day, and year-at-a-glance heatmap
- Color-coded events by status
- Prep blocks, personal time, and events on one view
- Weather integration for event dates

**Availability Management**

- Availability rules (working days, hours, lead time minimum)
- Protected time blocks (personal time that cannot be booked over)
- Buffer time between events
- Geographic radius enforcement
- Maximum events per day/week

**Scheduling Features**

- Drag-to-reschedule with conflict detection
- Double-booking prevention
- Waitlist for fully booked dates
- Shareable availability links for clients
- ICS export (Google Calendar, Outlook, iCal sync)
- Capacity planning and burnout detection

---

### 9. Analytics & Intelligence

**13 Specialized Dashboards**

- Benchmarks (industry comparison by archetype and region)
- Capacity utilization (% booked, burnout risk, peak seasons)
- Client LTV (lifetime value trajectories, repeat rates, churn)
- Daily report (snapshot of revenue, events, inquiries)
- Demand heatmap (booking patterns by date, season, day of week)
- Funnel (inquiry-to-event conversion rates at each stage)
- Locations (geographic distribution of events)
- Menu engineering (most profitable dish combinations, popularity vs. margin)
- Pipeline (sales funnel with predicted revenue)
- Referral sources (attribution by channel)
- Custom report builder

**Intelligence Hub (Pro)**

- Consolidated AI insights from 25+ analysis engines
- Business health score (0-100 across 4 dimensions: Revenue, Clients, Ops, Growth)
- Critical alerts (overdue payments, unanswered inquiries, missing event info)
- Warning alerts (churn risk, capacity concerns, unpaid events)
- Opportunity cards (price increase headroom, re-engagement targets)
- Top 5 plain-English insights

**Key Metrics Tracked**

- Revenue (total, monthly, per-event, per-client, per-hour, per-guest)
- Profit margins (gross, net, food cost %)
- Inquiry conversion rates (by stage, by source, by occasion)
- Response time SLA (average response, ghost rate)
- Client health (engagement, spending trend, satisfaction)
- Booking patterns (lead time, seasonality, repeat rate)
- Staff efficiency (labor cost per event, utilization)
- Food cost trending

---

### 10. Remy (AI Concierge)

**What Remy Is**

- An in-app AI assistant that lives in a drawer accessible from any page
- Powered by Ollama (runs 100% locally; no client data leaves the machine)
- Understands the full context of the chef's business (events, clients, finances, calendar, etc.)
- Can answer questions and execute commands across the entire system

**What Remy Can Do (Read-Only, Auto-Execute)**

- Answer questions about business metrics (revenue, top clients, client count, loyalty tiers, food costs)
- Look up event details, client profiles, inquiry status
- Search recipes by ingredient, cuisine, or occasion (read-only from chef's own library)
- Check availability and scheduling
- Review financial summaries and cash flow
- Analyze dietary restrictions and cross-contamination risks
- Calculate portions
- Generate packing lists
- Search email history
- Check loyalty status for any client

**What Remy Can Do (Chef Approval Required)**

- Create and update clients, events, inquiries, quotes, menus
- Transition event states
- Draft emails (10+ templates: thank yous, referral requests, payment reminders, re-engagement, etc.)
- Schedule calls and create calendar entries
- Log expenses and record payments
- Create and assign staff
- Hold dates (tentative calendar blocks)
- Generate daily briefings
- Run grocery price quotes

**What Remy Cannot Do (Permanently Restricted)**

- Generate, create, or suggest recipes (chef intellectual property)
- Write to the financial ledger
- Send emails (draft only; chef sends manually)
- Delete data
- Modify user roles
- Process refunds
- Modify recipes or ingredients

**Safety Architecture**

- 3-layer input validation: Guardrails (block dangerous actions) -> Classifier (route to correct handler) -> Intent Parser (identify specific task)
- All writes require chef confirmation
- Conversation memory organized into 8 categories (preferences, client insights, business rules, communication style, culinary notes, scheduling patterns, pricing patterns, workflow preferences)
- 25+ context sections loaded per request for accurate responses

---

### 11. Loyalty Program

**Points System**

- Automatic point accrual on bookings (based on event value)
- Bonus points for referrals, reviews, birthdays
- Points redeemable for discounts on future events

**Tier Structure**

- Multiple tiers with escalating benefits (percentage discounts, perks, priority booking)
- Tier progression based on lifetime value
- Progress tracking visible to clients

**Surfaces**

- Client profile (tier badge, points balance, progress bar)
- Event detail (points earned/estimated)
- Invoice (loyalty discounts applied, tax recalculated on adjusted subtotal)
- Post-event email (points earned, balance, tier status)
- Payment confirmation email (tier acknowledgment)
- Remy context (knows client tier and suggests loyalty-aware responses)

**Client Portal**

- My Rewards page (tier badge, point balance, progress to next tier, transaction history, available rewards)

**Monthly Raffle**

- Game-based entry mechanism
- Anonymous leaderboards
- Prize drawings

---

### 12. Marketing & Communication

**Email Integration (GOLDMINE)**

- Gmail sync (automatic scanning of incoming emails)
- Deterministic field extraction (budget, date, guest count, dietary, occasion) with no cloud AI
- Thread replies enrich parent inquiry
- Historical email import

**Email Campaigns**

- Bulk email to client segments
- Push dinner announcements (promote special one-off events)
- Email sequence automation (nurture flows for follow-ups, re-engagement)
- Template library for common scenarios
- Open/click tracking

**SMS**

- Send text messages to clients
- SMS templates

**Social Media**

- Instagram integration (post photos, sync feed)
- AI-generated social captions for event photos
- Content scheduling queue
- Cross-platform publishing

**Notifications**

- In-app notifications with badge counts
- Push notifications (web push via VAPID)
- Email notifications
- Per-category opt-in/opt-out
- Quiet hours configuration

---

### 13. Documents & Exports

**Document Generation**

- Invoice PDF (with loyalty adjustments and payment history)
- Receipt PDF
- Quote PDF
- Contract PDF
- Menu PDF (client-facing front-of-house format)
- Financial summary PDF
- Tax summary PDF
- Guest dietary cards PDF
- After-action review reports
- Day-of-Plan (DOP) printouts
- Packing lists
- Grocery lists
- Service execution sheets

**Document Management**

- Folder organization
- Upload and storage (photos, PDFs, spreadsheets)
- Receipt digitization (photo to digital with OCR)
- Document snapshots (point-in-time records)
- Version history

**Data Export**

- Client list CSV
- Event data CSV
- Financial data CSV
- Custom report exports
- Full data export (GDPR compliance)

---

### 14. Client Portal

**What Clients See (Authenticated)**

- My Events (upcoming, past, requests)
- Event detail (proposal, menu selection, menu approval, contract, countdown, pre-event checklist, event summary, invoice, payment, payment plan)
- My Inquiries and My Quotes
- My Chefs (saved favorites)
- Discover (chef marketplace)
- My Chat (conversations with chefs)
- My Loyalty (tier, points, rewards, transaction history)
- My Meals (recurring meal subscriptions)
- My Orders (a la carte orders)
- My Reservations
- My Hub (community groups, friends, share chef)
- My Feedback
- My Profile and My Spending

**What Guests See (No Login, Token-Based)**

- RSVP form with dietary preferences
- Event details and countdown
- Pre-event customization (parking, dress code, arrival info)
- Post-event feedback form
- Photo gallery (if shared)
- Recipe cards and wine pairings (if shared)

---

### 15. Specialty Verticals

**Bakery Operations**

- Order management (custom and wholesale)
- Production scheduling
- Batch tracking
- Oven capacity planning
- Fermentation tracker (sourdough, etc.)
- Wholesale account management
- Tasting events
- Display case inventory
- Seasonal product planning
- Yield tracking and waste reduction

**Food Truck Operations**

- Location management and permits
- Commissary operations
- Par level planning
- Weather-based demand forecasting
- Social media location announcements
- Pre-order system
- Menu board management
- Vehicle maintenance tracking

**Meal Prep Operations**

- Meal plan creation and management
- Container tracking (reusable logistics)
- Cooking day operations
- Delivery scheduling and manifests
- Client meal history
- Nutrition tracking per meal
- Preference questionnaires
- Batch shopping consolidation
- Label printing

**Cannabis Events**

- Cannabis-specific compliance documentation
- Control packet management (mandatory per event)
- Host agreements
- Dosage tracking (THC/CBD per serving)
- State-specific regulation compliance
- Guest RSVP with cannabis acknowledgment

**Charity & Volunteer**

- Charitable event tracking (separate from paid)
- Volunteer hours logging per organization
- 501(c) verification (auto-check via ProPublica)
- Charity search by state, category, keyword
- Impact reporting
- World Food Programme live feed integration

---

### 16. Safety & Compliance

**Food Safety**

- Temperature logging with anomaly detection
- HACCP plan documentation
- Cross-contamination risk analysis
- Allergen tracking (17 major groups)
- Food recall alerts (scheduled cron check)

**Business Protection**

- Insurance policy tracking
- Certification management (food handler, ServSafe, allergen training, etc.)
- Expiry alerts for certificates and licenses
- NDA management
- Liability waiver management
- Business continuity planning
- Crisis response procedures
- Incident reporting

**Data Compliance**

- GDPR data export and deletion
- Account purge (scheduled cleanup of deleted accounts)
- Privacy-first AI (no client data sent to cloud)

---

### 17. Network & Community

**Chef Network**

- Search and connect with other chefs
- Follow/unfollow relationships
- Network feed (posts, photos, updates)
- Topic channels (cuisine, technique, business, tools)
- Recipe sharing (send/accept/decline)
- Skill endorsements
- Chef collaboration on events (invite co-chefs)
- Collective benchmarks and intelligence

**Community Hub (Client-Facing)**

- Private group creation (dinner circles, friend groups)
- Group event planning with collaborative features
- Polls for guest preferences
- Media sharing
- Friend invitations
- Share-a-chef recommendations

---

### 18. Professional Development

- Skills inventory and capability tracking
- Education history
- Creative portfolio projects
- Growth check-ins
- Professional momentum scoring
- Personal journal

---

### 19. Settings & Configuration

**50 settings pages across 19 categories:**

- Business defaults (home base, timing, revenue goals)
- Profile and branding (public profile, portfolio, highlights)
- AI and privacy (Remy controls, data handling)
- Connected accounts (Gmail, Stripe, webhooks, API keys, embed widget)
- Availability rules (blocks, limits, buffer time, radius)
- Booking page configuration
- Communication and workflow (templates, automations, contracts, seasonal palettes)
- Notification preferences
- Dashboard and navigation customization
- Appearance (color scheme, dark mode)
- Module toggles (enable/disable Pro features)
- Billing and subscription
- Custom fields
- Event types and labels
- Compliance settings
- Protection hub (insurance, certs, NDAs)
- Professional development
- Account and security (password, 2FA, delete account)

---

### 20. Onboarding

**5-Step Wizard**

1. Profile (name, bio)
2. Branding (tagline, brand color)
3. Public URL (slug with availability check)
4. Payments (Stripe Connect OAuth)
5. Confirmation

**Import Tools**

- CSV import (clients, contacts)
- Past events import (historical logging)
- Brain dump (paste free-form text, AI parses it into structured records)

---

### 21. Integrations

| Integration            | What It Does                                                           |
| ---------------------- | ---------------------------------------------------------------------- |
| **Stripe**             | Payment processing, Connect accounts, subscriptions, payouts, disputes |
| **Gmail**              | Email sync, inquiry extraction (GOLDMINE), thread tracking             |
| **Google Calendar**    | Availability sync, event export                                        |
| **Instagram**          | Post photos, sync feed                                                 |
| **DocuSign**           | E-signatures on contracts and proposals                                |
| **QuickBooks**         | Accounting sync                                                        |
| **Square**             | POS integration                                                        |
| **Wix**                | External booking form submissions                                      |
| **Zapier**             | Webhook automation (connect to 5000+ apps)                             |
| **Twilio**             | SMS messaging                                                          |
| **Resend**             | Transactional email delivery                                           |
| **Spoonacular**        | Nutritional database (365K+ recipes)                                   |
| **USDA/Kroger/MealMe** | Grocery price comparison                                               |
| **iCal**               | Calendar export to any calendar app                                    |
| **Yelp**               | Review aggregation                                                     |
| **TakeAChef**          | Inquiry and financial import                                           |
| **ProPublica**         | 501(c) charity verification                                            |
| **Web Speech API**     | Voice input in Mission Control                                         |

---

### 22. Scheduled Automations (30+ Cron Jobs)

- Morning briefing generation
- Follow-up reminders for stale inquiries
- Email campaign execution
- Daily performance report
- User lifecycle transitions
- Loyalty point expiration
- Revenue goal tracking
- Wellbeing check-ins (work-life balance signals)
- Loyalty raffle draws
- RSVP reminders
- External review sync
- Social media post scheduling
- Integration data pulls and retries
- Email sequence automation
- Waitlist processing
- Call reminders
- Push token cleanup
- Activity log cleanup
- AI conversation retention
- Auto-reward generation
- Financial threshold alerts
- Operations health checks
- Email history scanning
- Beta onboarding reminders
- System monitoring
- Wix submission processing
- Quarterly business check-ins
- Food recall monitoring
- Brand mention monitoring
- Business momentum snapshots
- Certification renewal reminders
- Community circle digests
- Account purge (deleted accounts)

---

### 23. Admin Panel (Platform Operations)

60+ admin pages covering:

- User management (all chefs, all clients)
- Session monitoring
- Financial oversight (all transactions, subscriptions, payouts)
- Feature flag management
- Announcement publishing
- Changelog management
- Beta program management (surveys, onboarding tracking)
- Platform analytics (cross-chef metrics)
- System health monitoring
- Audit logs
- Data tools and exports
- Gmail sync status
- Notification delivery tracking
- AI activity logs
- Cannabis compliance oversight
- Allergen database management
- Community hub administration
- Prospecting overview
- Partner program management
- Document template management
- Reconciliation tools
- Global search

---

### 24. Mission Control (Desktop Operations Center)

- Launcher UI with multiple panels (Home, Manual, Activity, Infrastructure)
- Codebase scanner with real-time file watching
- Gustav AI chat assistant (separate from Remy, for ops/development)
- Activity logging and summary
- Quick login switching between accounts
- System health monitoring
- Voice input via Web Speech API

---

## Subscription Tiers

|                             | Free | Pro ($29/month) |
| --------------------------- | ---- | --------------- |
| Dashboard                   | Yes  | Yes             |
| Events                      | Yes  | Yes             |
| Clients                     | Yes  | Yes             |
| Inquiries & Quotes          | Yes  | Yes             |
| Recipes & Menus             | Yes  | Yes             |
| Basic Finance               | Yes  | Yes             |
| Calendar                    | Yes  | Yes             |
| Advanced Analytics          | -    | Yes             |
| Intelligence Hub            | -    | Yes             |
| Loyalty Program             | -    | Yes             |
| Marketing Suite             | -    | Yes             |
| Staff Management (Advanced) | -    | Yes             |
| Commerce/POS                | -    | Yes             |
| Social Event Hub            | -    | Yes             |
| Open Tables                 | -    | Yes             |
| Nutritional Analysis        | -    | Yes             |
| Meal Prep Operations        | -    | Yes             |
| White-Label Branding        | -    | Yes             |
| Protection Hub              | -    | Yes             |
| Professional Development    | -    | Yes             |
| Remy AI Concierge           | -    | Yes             |
| Network & Community         | -    | Yes             |
| Automations                 | -    | Yes             |

---

## Architecture Principles

1. **Ledger-first finances.** Every dollar flows through an immutable, append-only ledger. Balances are computed, never stored. No one can edit history.

2. **Private AI.** Client data never leaves the machine. Ollama runs locally for all private data processing. Gemini is used only for generic, non-PII tasks.

3. **Formula over AI.** If deterministic code (math, logic, database queries) can produce the correct result, it is always used over AI. AI is the fallback, never the default.

4. **Chef IP protection.** AI never generates, suggests, or modifies recipes. Recipes are the chef's creative work and intellectual property. AI can only search the chef's existing recipe library.

5. **Zero hallucination.** The app never displays information that is not true. Every number comes from a real data source. Every success confirmation is backed by actual server confirmation. Failures are shown honestly, never hidden behind zeros or defaults.

6. **Multi-tenant isolation.** Every database query is scoped to the authenticated tenant. RLS policies enforce this at the database level. Tenant ID comes from the session, never from request input.

7. **Non-blocking side effects.** Notifications, emails, activity logs, and automations never block the primary operation. If they fail, the main transaction still commits.

8. **State machines everywhere.** Events, quotes, inquiries, and menus all follow defined state machines with immutable transition logs.

---

## Scale

- **430+ routes** (pages + API endpoints)
- **600+ server action files** across 27 business domains
- **90+ database tables** with 100+ RLS policies
- **130+ migrations** (40,000+ lines of SQL)
- **30+ scheduled automations**
- **90+ Remy AI tools**
- **18 third-party integrations**
- **5 user roles** (Chef, Client, Staff, Partner, Admin)
- **4 specialty verticals** (Private Chef, Bakery, Food Truck, Meal Prep)
- **3 environments** (Dev, Beta, Production)

---

_ChefFlow is not a tool. It is the operating system for a culinary business._

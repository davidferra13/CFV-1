# ChefFlow: Product Definition Document

> **Version:** 1.0 | **Date:** 2026-03-22
> **Purpose:** Canonical reference defining what ChefFlow is, who it serves, and every function it provides.

---

## Part 1: What ChefFlow Is

ChefFlow is a universal culinary operating system built for food service professionals. It eliminates the fragmented stack of tools that chefs currently rely on: spreadsheets for costing, separate apps for invoicing, notes apps for recipes, messaging platforms for client communication, and manual calendars for scheduling. ChefFlow replaces all of that with one integrated platform.

The tagline is **Ops for Artists**. The platform handles the operational weight of running a culinary business so the chef can focus on the creative work.

ChefFlow has two distinct surfaces that serve different audiences:

**1. The Operator Platform (behind auth)**
The full business management system for chefs, caterers, meal prep services, food truck operators, and any food service professional. This is where the business lives: events, clients, money, menus, recipes, staff, and analytics.

**2. The Public Food Directory (no auth required)**
A consumer-facing discovery platform where anyone can find private chefs, caterers, restaurants, food trucks, and bakeries near them. Consumers search and connect directly with providers at no cost and with no commission taken. The platform redirects, not transacts.

---

## Part 2: Strategic Goals

**Goal 1: Eliminate operational fragmentation for culinary professionals.**
A chef running their business today uses 8-12 disconnected tools. ChefFlow collapses that into one. Every action a chef takes in running their business should be possible from within the platform.

**Goal 2: Give chefs financial clarity.**
Most independent chefs have no clear picture of their true profitability. ChefFlow's ledger-first financial model tracks every dollar across every event, computes real margins, and gives chefs the data they need to price their work correctly.

**Goal 3: Protect the chef-client relationship.**
Client relationships are the core asset of any private chef business. ChefFlow treats client data, preferences, allergies, histories, and communications as sacred. All sensitive data stays on the chef's own infrastructure via local AI (Ollama). Nothing is shared with third-party cloud services.

**Goal 4: Surface the right action at the right time.**
A chef running a business while also cooking has no time to hunt for what needs their attention. ChefFlow's priority queue, daily ops system, and morning briefing surface the most important next action automatically.

**Goal 5: Make culinary businesses discoverable.**
Independent food professionals have no centralized place to be found. The ChefFlow public directory gives operators visibility to consumers who are actively looking for food experiences, with no commission on bookings.

**Goal 6: Build community among culinary professionals.**
ChefFlow's network and community features let chefs share recipes, collaborate on events, refer clients to each other, and build professional relationships within the platform.

**Goal 7: Stay free for the people who need it.**
All features are free. Revenue comes from voluntary supporter contributions. There are no paywalls, no locked features, no Pro tiers. Community growth is the priority.

---

## Part 3: Target User Personas

### Persona 1: The Independent Private Chef

Solo operator running a private dining business. Books 4-20 events per month. Manages the entire business alone: sales, cooking, client communication, finances, and logistics. Current pain: drowning in disconnected tools. Needs an integrated system that handles ops so they can focus on cooking.

### Persona 2: The Caterer

Operates a catering company with 1-10 staff. Manages multiple concurrent events, staff scheduling, large-scale food costing, and complex logistics. Needs staff management, multi-event coordination, kitchen station ops, and precise food cost tracking.

### Persona 3: The Meal Prep Chef

Recurring weekly service model. Manages standing client accounts, consistent recipes, weekly grocery sourcing, and predictable scheduling. Needs recurring event management, client preference tracking, and efficient grocery costing.

### Persona 4: The Food Truck Operator

Mobile food service with daily ops, shift management, kiosk/POS integration, and high-volume client interactions. Needs daily ops tools, task management, and point-of-sale capabilities.

### Persona 5: The Restaurant Operator

Fixed-location food business managing reservations, staff, menus, and financial reporting. Needs the full suite with kitchen display system, staff shift management, and detailed financial analytics.

### Persona 6: The Culinary Professional Building a Brand

Chef building a public profile, collecting reviews, growing a referral network, and managing a portfolio of work. Needs the public chef profile, review aggregation, testimonials, and social media tools.

### Persona 7: The Consumer (Food Discovery User)

Anyone looking for a food experience near them. Searching for a private chef for a dinner party, a caterer for a wedding, or a food truck for a corporate event. No account required. Needs a fast, honest search experience with direct connections to real providers.

### Persona 8: The Staff Member

An employee or contractor working for a chef. Has access to their assigned tasks, the station clipboard, and daily ops information. Does not have access to financials, client data, or business settings.

### Persona 9: The Client

A client who has been invited to their own portal by a chef. Can view event details, communicate with their chef, submit dietary preferences, RSVP for guests, and pay invoices. Has a narrow, event-scoped view of the platform.

---

## Part 4: Complete Function Reference

Every function available in the ChefFlow platform, organized by section.

---

### 4.1 Dashboard (`/dashboard`)

| Function                    | Description                                                                         |
| --------------------------- | ----------------------------------------------------------------------------------- |
| Configurable widget layout  | Reorder, show, or hide any dashboard widget via the Layout panel                    |
| Per-widget collapse         | Collapse or expand individual widgets; state persists in localStorage               |
| Global search (Cmd+K)       | Search across all entities; includes Quick Actions for creating new records         |
| Daily ops banner            | Shows task counts by lane with estimated time; links to `/daily`                    |
| Priority action banner      | Shows the single most urgent action from the queue                                  |
| Scheduling gap warning      | Flags weeks with no events booked during historically busy periods                  |
| Response time SLA tracker   | Shows inquiries overdue for response (4h urgent, 24h critical)                      |
| Pending follow-up alerts    | Lists inquiries where the client has gone quiet for 3+ days                         |
| Holiday outreach panel      | AI-drafted outreach suggestions per upcoming holiday with send actions              |
| Onboarding checklist        | 5-step setup guide visible until all steps are complete                             |
| Onboarding accelerator      | Fast-start panel for importing contacts and logging first events                    |
| Upcoming calls widget       | Lists scheduled calls and meetings with links                                       |
| Collaboration invitations   | Accept or decline invitations to collaborate on another chef's event                |
| Pending recipe shares       | Accept or decline recipes shared by other chefs                                     |
| Collaborating-on events     | Lists events where the chef is a collaborator, not the lead                         |
| Recipe debt tracker         | Shows how many event recipes have not yet been captured in the recipe book          |
| Today's schedule widget     | Hour-by-hour timeline for today's event including route plan                        |
| Next action card            | Single card showing the highest-priority action to take right now                   |
| Week strip                  | 7-day view with event and prep day visualization, burnout warnings                  |
| Priority queue widget       | Top 20 queue items with domain and urgency filters                                  |
| Overdue follow-ups          | Events completed without a follow-up message sent                                   |
| DOP task digest             | Incomplete day-of-plan tasks from upcoming events                                   |
| Preparation prompts         | Contextual prep reminders grouped by overdue, today, and upcoming                   |
| Service quality tracker     | Calm and prep scores from the last 5 AARs with trend indicator                      |
| Business snapshot           | Revenue, profit, events, inquiries, clients, food cost, and YoY comparisons         |
| Prospecting widget          | Active pipeline count, conversion rate, hot leads (admin only)                      |
| Pipeline forecast           | Expected and best-case revenue from open inquiries                                  |
| Stuck events alert          | Events that have not moved status in an unusually long time                         |
| Weekly accountability panel | Closure streak, follow-up stats, receipt upload counts                              |
| Quote performance insights  | Expiring quotes, acceptance rate, pricing model breakdown                           |
| Career growth widget        | Professional development stats and latest journal entry                             |
| Hours log                   | Log work hours by category with quick presets; view history                         |
| To-do list                  | Create, complete, and delete personal tasks                                         |
| Activity section            | Recent activity feed, live client presence, and session history                     |
| AI business insights        | On-demand Ollama analysis of business health with recommendations                   |
| Business intelligence       | 25-engine deterministic health score with alerts and opportunities (no AI required) |
| System health panel         | Live status of all services with fix actions (admin only)                           |

---

### 4.2 Events (`/events`)

| Function                                          | Description                                                                                              |
| ------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| Event list view                                   | Table of all events with status filter bar and sortable columns                                          |
| Event kanban view                                 | Drag-and-drop board organized by event status                                                            |
| Bulk event actions                                | Archive or delete multiple events at once                                                                |
| Create event                                      | Full event form with occasion, client, date, time, guests, location, pricing, notes                      |
| Edit event                                        | Modify any draft or proposed event                                                                       |
| Prep time estimator                               | Visual breakdown of Shopping, Prep, Service, Travel, and Reset time phases                               |
| Event status badge                                | Live badge reflecting the current FSM state                                                              |
| Event FSM transitions                             | Propose, Confirm, Mark In Progress, Mark Completed, Cancel (with reason dialog)                          |
| Readiness gate                                    | Hard blocks and soft warnings that must be cleared before FSM transitions                                |
| Event overview tab                                | Location with map, weather, client info, guest count, referral source, special requests                  |
| Service contract                                  | Template-based contract attached to event                                                                |
| AI contract generator                             | AI-drafted contract using event and client details                                                       |
| Guests and RSVPs                                  | Share link, RSVP tracker, photo consent summary, host message template                                   |
| Guest experience panel: Messages                  | View and respond to messages sent by guests from the RSVP portal                                         |
| Guest experience panel: Reminders                 | Send day-before and day-of reminders to confirmed guests                                                 |
| Guest experience panel: Dietary                   | Request dietary confirmations 48-72 hours before the event                                               |
| Guest experience panel: Pre-event customization   | Set parking, dress code, what to expect, arrival instructions, and custom message for the countdown page |
| Guest experience panel: Document sharing          | Share recipe cards, wine pairings, event photos, and thank-you notes with guests                         |
| Guest experience panel: Feedback collection       | Send post-event feedback requests; view ratings and testimonials                                         |
| Guest experience panel: Attendance reconciliation | Record actual attendance (attended, no-show, late, left early)                                           |
| Allergen conflict alert                           | Deterministic cross-check of menu ingredients against per-guest allergies; no AI required                |
| AI allergen risk matrix                           | Deeper AI-powered allergen analysis on demand                                                            |
| AI menu nutritional summary                       | AI-generated nutritional breakdown of the event menu                                                     |
| Communication log                                 | Full message thread with compose form and channel/template selection                                     |
| Menu library picker                               | Browse and apply menus from the chef's library to an event                                               |
| Menu approval                                     | Track and manage menu approval status                                                                    |
| Financial summary                                 | Quoted, deposit, paid, and balance due; link to invoice                                                  |
| AI pricing intelligence                           | AI recommendations on pricing for proposed or accepted events                                            |
| Record payment                                    | Log deposit or full payments with payment method                                                         |
| Process refund                                    | Record refunds for cancelled events                                                                      |
| Payment plan                                      | Manage installment schedules                                                                             |
| Mileage log                                       | Log travel miles per event                                                                               |
| Tip log                                           | Record gratuity received                                                                                 |
| Budget tracker                                    | Budget vs actual spend with progress bar                                                                 |
| Quick receipt capture                             | Fast photo upload for receipts                                                                           |
| Expense card                                      | List of event expenses with category subtotals                                                           |
| Profit summary                                    | Revenue, expenses, profit, margin, food cost, per-guest cost, and hourly rate                            |
| Loyalty points                                    | Points earned from completed events                                                                      |
| Split billing                                     | Divide event cost across multiple payers                                                                 |
| Time tracking                                     | Log time by phase: Shopping, Prep, Packing, Driving, Execution                                           |
| Event staff panel                                 | Add, remove, and log hours for staff members on an event                                                 |
| AI staff briefing                                 | AI-generated briefing document for event staff                                                           |
| AI prep timeline                                  | AI-generated prep schedule                                                                               |
| AI service timeline                               | AI-generated service sequence                                                                            |
| Chef collaborators                                | Invite other chefs to collaborate on an event                                                            |
| Temperature log                                   | Record food safety temperatures during the event                                                         |
| AI temperature anomaly detection                  | Flag unusual temperature readings                                                                        |
| Shopping substitutions                            | Log ingredient substitutions made during shopping                                                        |
| Menu modifications                                | Log changes made to the menu after the event                                                             |
| Carry-forward inventory                           | Track surplus ingredients from other events; AI matching for reuse                                       |
| AI grocery list consolidation                     | Merge grocery needs across multiple events                                                               |
| Unused ingredients                                | Log leftover ingredients for carry-forward to future events                                              |
| Contingency plans                                 | Add emergency scenarios, contacts, and AI-suggested contingencies                                        |
| Printable documents                               | Generate Day-of Plan, packing list, grocery list, and other PDFs                                         |
| Post-event closure checklist                      | 4-item checklist: AAR Filed, Reset Complete, Follow-Up Sent, Financially Closed                          |
| AAR summary                                       | Display of calm/prep ratings, forgotten items, and debrief text                                          |
| Event photo gallery                               | Upload and manage photos from the event                                                                  |
| Recipe capture prompt                             | Prompt to record any recipes used but not yet in the recipe book                                         |
| AAR form                                          | Rate calm and prep (1-5), log what went well and wrong, tag forgotten items                              |
| Post-dinner debrief                               | 4-section wizard: Dish Gallery, Recipe Notes, Client Insights, How Did It Go                             |
| Close-out wizard                                  | 5-step: Tip, Receipts, Mileage, Reflection, Close Out - with confetti celebration                        |
| Event financial summary                           | 7-section detailed financial breakdown with mileage input and historical comparison                      |
| Receipt OCR                                       | Auto-extract line items from receipt photos and approve to expenses                                      |
| Day-of-plan mobile view                           | Full-screen mobile-optimized DOP with large tap targets                                                  |
| Kitchen display system                            | Live course tracking: Fire, Plating, Served                                                              |
| Packing checklist                                 | 5-section checklist with tap-to-check items and progress bar                                             |
| Travel plan                                       | Multi-leg travel management with route stops and ingredient sourcing status                              |
| Grocery quote                                     | Multi-vendor price comparison (USDA, Spoonacular, Kroger, MealMe) with Instacart link                    |
| Guest card                                        | Printable QR card for dinner tables                                                                      |
| Interactive document viewer                       | Tappable version of any of 9 event document types                                                        |
| Status history                                    | Timeline of all FSM transitions with timestamps                                                          |
| Client portal QR code                             | QR for client portal access                                                                              |
| Guest pipeline QR code                            | QR for guest lead capture                                                                                |
| Guest excitement wall                             | Moderated guest messages display                                                                         |
| Post-event guest outreach panel                   | Follow-up messaging to event guests                                                                      |

---

### 4.3 Clients (`/clients`)

| Function                      | Description                                                                                                                                        |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client directory              | Searchable, sortable table of all clients with health badges                                                                                       |
| Client CSV export             | Download all clients as a CSV file                                                                                                                 |
| Client invitation form        | Send an email invitation to a new client with portal access                                                                                        |
| Pending invitations manager   | View, copy, or cancel outstanding invitations                                                                                                      |
| Bulk client actions           | Archive multiple clients at once                                                                                                                   |
| Create client: Quick Add      | Essential fields only for fast entry                                                                                                               |
| Create client: Full Profile   | 8-section form covering identity, household, culinary preferences, access, kitchen profile, service defaults, personality, and internal assessment |
| Client status management      | Set status: Active, Dormant, Repeat Ready, VIP                                                                                                     |
| Client health badge           | Composite signal of relationship health                                                                                                            |
| Client relationship badge     | Visual indicator of relationship stage                                                                                                             |
| Tag manager                   | Add and remove tags on any client                                                                                                                  |
| Portal link manager           | Generate, copy, rotate, or revoke client portal access links                                                                                       |
| Dormancy warning              | Alert when a client has been inactive for 90+ days                                                                                                 |
| Next best action card         | Urgency-ranked recommended action for this client                                                                                                  |
| Profile completeness meter    | Progress bar showing how complete the client profile is                                                                                            |
| Client information editor     | Name, email, phone, since date, email toggle                                                                                                       |
| Demographics editor           | Occupation, company, birthday, anniversary, Instagram, contact method, referral source, formality preference                                       |
| Client statistics             | Total events, completed events, total spent, average event value                                                                                   |
| Profitability history         | Average margin, food cost, and hourly rate with bar chart                                                                                          |
| LTV trajectory chart          | Lifetime value trend over time                                                                                                                     |
| Menu history panel            | All dishes and menus served to this client                                                                                                         |
| Direct outreach               | Email and SMS compose with outreach history                                                                                                        |
| Financial detail              | Event-by-event financial breakdown and ledger entries                                                                                              |
| Loyalty card                  | Tier, points, progress, available rewards, redeem button, award bonus form, transaction history                                                    |
| Personal info editor          | Preferred name, partner name, family notes                                                                                                         |
| Pet manager                   | Add and remove pets with name, type, and notes                                                                                                     |
| Client photo gallery          | Upload and manage photos                                                                                                                           |
| Kitchen profile               | Size, constraints, equipment, oven, burner, counter, fridge, and sink notes                                                                        |
| Security and access           | Gate code, WiFi, parking, access instructions, house rules                                                                                         |
| Service defaults              | Service style, guest count, preferred days, budget range, cleanup, and leftovers preferences                                                       |
| Client connections            | Link two clients with a relationship type                                                                                                          |
| Fun Q&A                       | Personality question answers                                                                                                                       |
| Allergy records               | Add and remove allergies with severity classification                                                                                              |
| NDA panel                     | NDA status, coverage, dates, and photo permission                                                                                                  |
| Quick notes                   | Add, pin, edit, and delete notes by category                                                                                                       |
| Milestone manager             | Log and remove relationship milestones                                                                                                             |
| Address manager               | Multiple addresses per client with access instructions and kitchen notes                                                                           |
| Communication history         | Sentiment badge, full message thread, and compose form                                                                                             |
| AI client preference analysis | Ollama-powered preference inference from interaction history                                                                                       |
| Chef's internal assessment    | Referral potential, red flags, acquisition cost, payment behavior, tipping pattern                                                                 |
| Unified relationship timeline | Chronological view of all events, messages, notes, and activity                                                                                    |
| Event history table           | All past events with status filter                                                                                                                 |
| Client feedback               | Reviews and ratings for this client                                                                                                                |
| Recurring services manager    | Recurring schedule, dish history, log dish served form                                                                                             |
| Filtered client views         | Active, inactive, and VIP filtered tables                                                                                                          |
| Duplicate detector            | Pairs of likely duplicate clients with confidence scores                                                                                           |
| Segment builder               | Create named client segments with field/operator/value filter rules                                                                                |
| Gift cards and vouchers       | Issue gift cards, manage codes, view redemption history                                                                                            |
| Communication hub             | Notes, follow-ups, and upcoming touchpoints across all clients                                                                                     |
| Client notes list             | All notes across all clients                                                                                                                       |
| Follow-up tracker             | Overdue, at-risk, and check-in follow-up status                                                                                                    |
| Upcoming touchpoints          | Birthdays, anniversaries, and scheduled touchpoints this week and month                                                                            |
| Event history report          | All past events across all clients                                                                                                                 |
| Past menus report             | Full menu library across all clients                                                                                                               |
| Spending history report       | Clients ranked by total spending                                                                                                                   |
| Preferences hub               | Dietary restrictions, allergies, favorite dishes, and dislikes across all clients                                                                  |

---

### 4.4 Inquiry Pipeline

| Function                          | Description                                                              |
| --------------------------------- | ------------------------------------------------------------------------ |
| Inquiry list                      | All inquiries with status filter (New, In Progress, Waiting, Closed)     |
| Create inquiry                    | Log a new inquiry with client, occasion, date, budget, source, and notes |
| Inquiry detail                    | Full inquiry record with status management and history                   |
| AI inquiry response drafter       | AI-drafted response to a new inquiry                                     |
| Convert inquiry to event          | Promote a qualified inquiry to a booked event                            |
| Quote builder                     | Create itemized quotes with service fee, food cost, and add-ons          |
| Quote PDF generation              | Download or send a quote as a PDF                                        |
| Quote status tracking             | Draft, Sent, Accepted, Rejected, Expired                                 |
| Quote acceptance flow             | Client accepts quote through the portal                                  |
| Quote revision history            | View all versions of a quote                                             |
| Lead scoring                      | Automated score based on budget, timeline, and engagement signals        |
| Lead pipeline                     | Kanban board of leads through qualification stages                       |
| Calls and meetings log            | Record calls and meetings with date, type, duration, and agenda notes    |
| Schedule call                     | Book a call with a prospect                                              |
| Call detail                       | View notes, agenda progress, and outcome for a specific call             |
| Partner referral tracking         | Track inquiries sourced from referral partners                           |
| Prospecting hub (admin only)      | Active pipeline, hot leads, conversion rate, follow-ups due              |
| Prospecting queue (admin only)    | New leads to qualify                                                     |
| Prospecting pipeline (admin only) | Stage-by-stage pipeline view                                             |
| Guest leads                       | Leads captured from event guest QR codes                                 |
| Proposals                         | Formal proposal documents beyond standard quotes                         |
| Testimonial manager               | Collect, review, and publish client testimonials                         |
| Response time SLA                 | Track and alert on inquiry response time targets                         |

---

### 4.5 Financials

| Function                  | Description                                                        |
| ------------------------- | ------------------------------------------------------------------ |
| Financial hub             | Overview of all financial activity with key metrics                |
| Expense log               | Record business expenses with category, amount, date, and receipt  |
| Expense detail            | View and edit a single expense record                              |
| Expense categories        | Organize expenses by category with subtotals                       |
| Receipt upload            | Attach receipt photos to expenses                                  |
| Receipt OCR               | Auto-extract line items from receipt images                        |
| Invoice generator         | Create professional invoices for events                            |
| Invoice PDF               | Download or print the invoice                                      |
| Invoice payment tracking  | Mark invoices as paid and record payment details                   |
| Stripe payment processing | Accept credit card payments via Stripe Checkout                    |
| Apple Pay and Google Pay  | Accept wallet payments via Stripe                                  |
| Payment record            | Log cash, check, Venmo, or other offline payments                  |
| Refund processing         | Issue refunds for cancelled events                                 |
| Ledger                    | Append-only, immutable record of every financial transaction       |
| Ledger view               | Browse all ledger entries with filtering                           |
| Payout management         | Track Stripe payouts to bank account                               |
| Financial reporting       | Revenue, expense, and profit reports by time period                |
| Tax center                | Organize financial data for tax preparation                        |
| Payroll                   | Log and track payments to staff members                            |
| Revenue goals             | Set and track progress toward monthly and annual revenue targets   |
| Goal progress             | Visual progress bar toward the current goal                        |
| Food cost trend           | 6-month food cost percentage chart with green/amber/red thresholds |
| Profit margin analysis    | Net profit and margin by event, month, and year                    |
| Revenue goals widget      | Projected revenue, gap, and dinners needed to hit target           |
| Year-over-year comparison | Revenue, events, and average event value vs. prior year            |
| Mileage tracking          | Log and total mileage across events for tax deduction purposes     |
| Sales tax overrides       | Configure sales tax rates by jurisdiction                          |
| Smart pricing insights    | AI recommendations on pricing based on historical acceptance data  |
| Budget tracker            | Budget vs. actual comparison per event                             |

---

### 4.6 Culinary

| Function                           | Description                                                                                                                                                |
| ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Menu list                          | All menus with status, occasion type, and last used date                                                                                                   |
| Menu editor                        | Build menus with courses, dishes, and descriptions                                                                                                         |
| Menu context sidebar               | Intelligent sidebar showing seasonal warnings, prep estimates, client taste profile, allergen validation, vendor hints, and more (11 configurable toggles) |
| Menu template library              | Browse and apply pre-built menu templates                                                                                                                  |
| Menu showcase                      | Featured and public-facing menus                                                                                                                           |
| Menu duplication                   | Copy an existing menu as a starting point                                                                                                                  |
| Menu PDF export                    | Download a formatted menu PDF                                                                                                                              |
| Recipe book                        | Library of all chef recipes                                                                                                                                |
| Recipe detail                      | Full recipe with ingredients, method, yield, and notes                                                                                                     |
| Recipe creation                    | Manual entry form for new recipes (AI cannot create recipes)                                                                                               |
| Recipe costing                     | Automatic cost calculation based on ingredient prices                                                                                                      |
| Recipe scaling                     | Scale ingredient quantities by serving count                                                                                                               |
| Recipe sharing                     | Share a recipe with another chef in the network                                                                                                            |
| Recipe sprint                      | Fast-capture interface for logging multiple recipes quickly                                                                                                |
| Ingredient library                 | Master list of all ingredients with price and unit data                                                                                                    |
| Ingredient price lookup            | Live grocery pricing from Spoonacular, Kroger, MealMe, and USDA                                                                                            |
| Ingredient unit conversion         | Convert between units for costing and scaling                                                                                                              |
| Recipe components                  | Reusable sub-components (sauces, stocks, bases) used across recipes                                                                                        |
| Food costing engine                | Compute food cost, margin, and per-guest cost for any event or menu                                                                                        |
| Prep manager                       | Prep tasks and timelines for upcoming events                                                                                                               |
| Vendor directory                   | List of ingredient vendors with contact info and pricing history                                                                                           |
| Vendor price tracking              | Alert when vendor prices increase by more than 15%                                                                                                         |
| Inventory manager                  | Track ingredient stock levels                                                                                                                              |
| Carry-forward inventory            | Match surplus ingredients across events                                                                                                                    |
| Culinary board                     | Kanban-style board for organizing culinary tasks                                                                                                           |
| Seasonal palettes                  | Ingredient palettes organized by season                                                                                                                    |
| Grocery quote                      | Compare prices across multiple vendors for an event's ingredient list                                                                                      |
| Instacart integration              | Open a pre-filled Instacart cart from a grocery quote                                                                                                      |
| Save grocery prices to recipe book | Update ingredient costs from a real shopping quote                                                                                                         |

---

### 4.7 Calendar

| Function                 | Description                                            |
| ------------------------ | ------------------------------------------------------ |
| Full calendar view       | Monthly, weekly, and daily views via FullCalendar      |
| Event chips              | Color-coded event blocks on the calendar               |
| Availability management  | Mark hard unavailability blocks                        |
| Event limits             | Set maximum events per week or month                   |
| Buffer time rules        | Require minimum days between events                    |
| Prep day visualization   | Show prep time as blocks before event dates            |
| Week view                | Detailed weekly schedule                               |
| Production calendar      | Monthly grid with event chips and a list below         |
| iCal feed                | Subscribe to the chef's calendar from any external app |
| Google Calendar sync     | Two-way sync with Google Calendar                      |
| Scheduling gap detection | Identify quiet periods vs. historically busy weeks     |

---

### 4.8 Inbox and Messaging

| Function              | Description                                                                      |
| --------------------- | -------------------------------------------------------------------------------- |
| Message hub           | Central inbox for all client and guest communications                            |
| Compose message       | Send email or SMS to any client                                                  |
| Message thread        | Full conversation history per client                                             |
| Response templates    | Pre-written templates with variable placeholders                                 |
| Auto-responses        | Automated replies triggered by inquiry events                                    |
| Business hours        | Configure when auto-responses are active                                         |
| Gmail sync (GOLDMINE) | Sync Gmail to surface client intelligence from email history                     |
| Email intelligence    | Extract insights from past email conversations                                   |
| Direct outreach       | Compose targeted messages from the client record                                 |
| Campaign manager      | Bulk outreach to client segments                                                 |
| AI outreach drafter   | AI-drafted personalized outreach messages using client history (Ollama, private) |
| AI campaign concept   | AI-generated campaign theme suggestions (Gemini, no client data)                 |
| Outreach history      | Log of all messages sent and their outcomes                                      |
| Push notifications    | Browser push for urgent actions                                                  |
| Notification settings | Configure email, push, and SMS notifications by category                         |

---

### 4.9 Staff

| Function                  | Description                                                                            |
| ------------------------- | -------------------------------------------------------------------------------------- |
| Staff list                | All staff members with role, status, and contact info                                  |
| Add staff member          | Create a staff profile with role, rate, and contact details                            |
| Staff detail              | Individual staff record with assignment history                                        |
| Task board                | Kanban board of tasks across all staff and events                                      |
| Task creation             | Create tasks with title, description, due time, priority, and staff assignment         |
| Quick-assign              | 2-tap assignment of tasks to staff members                                             |
| Task completion           | Mark tasks complete with a single tap                                                  |
| Task carry-forward        | Overdue tasks automatically appear on the next day's board                             |
| Shift management          | Log shift start and end times                                                          |
| Staff hours log           | Track hours worked per staff member per event                                          |
| Kitchen station clipboard | Assign prep tasks to named kitchen stations                                            |
| Station status board      | Real-time view of station progress                                                     |
| Daily ops command center  | Master operational view for the day                                                    |
| Live staff activity board | Real-time view of who is active, idle, or offline                                      |
| Staff portal              | Staff-facing view of their own tasks and assignments                                   |
| Vendor management         | Track food vendors with orders, pricing, and contact info                              |
| Guest CRM                 | Track guests across all events with dietary and preference data                        |
| Shift handoff notes       | Opening, mid, and closing notes that persist across shifts                             |
| Prep timeline             | Timed prep tasks with countdown and alerts                                             |
| Morning briefing          | 60-second morning overview with alerts, yesterday's recap, today's schedule, and tasks |

---

### 4.10 Analytics

| Function                  | Description                                                                              |
| ------------------------- | ---------------------------------------------------------------------------------------- |
| Revenue trend             | Month-over-month growth, 3-month moving average, best and worst months, projected annual |
| Booking patterns          | Day-of-week heatmap, peak hours, seasonal patterns, advance booking average              |
| Client concentration      | Revenue concentration risk score and diversification analysis                            |
| Service mix               | Occasion breakdown, revenue by event type, emerging and declining types                  |
| Inquiry conversion        | Stage conversion rates, average days per stage, drop-off analysis                        |
| Expense breakdown         | Category totals, percentage of revenue, month-over-month trend                           |
| Payment velocity          | Days-to-pay average and median, overdue percentage, slow-payer identification            |
| Repeat client rate        | Rebooking percentage, interval, and revenue split between new and returning clients      |
| Quote win rate            | Acceptance percentage, average quote value, win rate by occasion                         |
| Dietary trend             | Most common restrictions, frequency trends, accommodation success rate                   |
| Prep time estimator       | Phase averages with efficiency trend                                                     |
| Communication cadence     | Per-client response patterns and engagement status                                       |
| Vendor price tracker      | Price increase alerts and category trend analysis                                        |
| Event profitability       | Per-event profit margins and effective hourly rate                                       |
| Quote confidence          | Sweet-spot pricing, acceptance by pricing model                                          |
| Untapped markets          | Occasion and service style gaps in the current client base                               |
| Geographic hotspots       | Revenue per travel minute by location area                                               |
| Revenue per guest         | Optimal guest count range and volume vs. value insight                                   |
| Seasonal menu correlation | Dish seasonality analysis and menu diversity score                                       |
| Client lifetime journey   | Lifecycle stages from prospect to champion with cohort retention                         |
| Churn prevention          | 6-trigger risk scoring with suggested re-engagement actions                              |
| Capacity ceiling          | Weekly and monthly utilization, theoretical maximum, burnout risk                        |
| Price elasticity          | Price band acceptance rates and per-occasion headroom                                    |
| Referral chain mapping    | Referral network graph, chain depth, and source ROI                                      |

---

### 4.11 Daily Ops

| Function                   | Description                                                                            |
| -------------------------- | -------------------------------------------------------------------------------------- |
| Daily plan                 | Remy-generated plan with 4 swim lanes: Quick Admin, Event Prep, Creative, Relationship |
| Daily plan item completion | Check off individual tasks with single tap                                             |
| Daily plan item dismissal  | Dismiss items that are not relevant                                                    |
| Draft preview              | Preview AI draft before approving                                                      |
| Completion celebration     | Visual feedback when all daily tasks are cleared                                       |
| Morning briefing           | 60-second morning overview page                                                        |
| Pre-service checklist      | Auto-generated checklist for events happening today or tomorrow                        |
| Prep timeline              | Active prep countdowns with alerts                                                     |

---

### 4.12 Activity and Queue

| Function                   | Description                                                               |
| -------------------------- | ------------------------------------------------------------------------- |
| Activity log               | Chronological log of all actions taken in the system                      |
| Activity summary view      | Tabbed view: My Activity, Client Activity, All Activity                   |
| Domain filter              | Filter activity by domain (events, clients, financials, etc.)             |
| Activity heat map          | 7x24 grid showing activity density by day and hour                        |
| Session retrace            | Breadcrumb timeline of actions taken in a specific session                |
| Activity logging toggle    | Enable or disable personal activity tracking                              |
| Real-time activity feed    | Live PostgreSQL subscription for new activity                             |
| Priority queue             | Master list of all actions requiring attention, scored by urgency         |
| Queue summary bar          | Total items, critical count, high priority count, active domains          |
| Domain and urgency filters | Filter queue by business domain and urgency level                         |
| Item snooze                | Snooze individual queue items for 1 hour, 4 hours, tomorrow, or next week |
| Snoozed item count         | Shows how many items are currently snoozed                                |

---

### 4.13 Travel and Operations

| Function                  | Description                                                   |
| ------------------------- | ------------------------------------------------------------- |
| Travel log                | All travel legs grouped by week with status and stop counts   |
| Travel leg creation       | Log a travel leg with origin, destination, stops, and purpose |
| Travel status management  | Mark legs as planned, active, or completed                    |
| Equipment inventory       | Track owned equipment with maintenance logs                   |
| Equipment maintenance log | Record maintenance actions per piece of equipment             |
| Equipment rental log      | Record rented equipment with facility, dates, and cost        |
| Maintenance alert         | Alert when equipment maintenance is overdue                   |
| Kitchen rentals           | Log external kitchen rentals with booking details             |

---

### 4.14 Reviews and After-Action Reports

| Function               | Description                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| AAR log                | All after-action reports with calm and prep ratings, trends, and frequently forgotten items |
| File AAR               | Rate calm and prep (1-5), log what went well and wrong, tag forgotten items                 |
| Reviews hub            | Unified feed of internal and external reviews                                               |
| Log feedback           | Record internal feedback with option to show on public profile                              |
| Import platform review | Import a review from an external source with optional public display                        |
| Google review link     | Configure a direct link to the chef's Google review page                                    |
| Yelp review sync       | Connect Yelp and sync reviews                                                               |
| Public profile reviews | Reviews section on the public chef profile with star ratings and JSON-LD SEO markup         |
| Charity hub            | Aggregated view of all charity-related events, menus, expenses, and mentions                |
| Charity hours log      | Log volunteer hours at specific organizations with ProPublica 501(c) verification           |
| Nonprofit finder       | Search 1.8M nonprofits via ProPublica API by state and category                             |
| Charity hours export   | Download logged charity hours as CSV                                                        |

---

### 4.15 Settings

| Function                   | Description                                                                  |
| -------------------------- | ---------------------------------------------------------------------------- |
| Home base configuration    | Set primary business location                                                |
| Store connections          | Connect preferred grocery stores                                             |
| Revenue goals              | Set monthly and annual revenue targets                                       |
| Dashboard layout           | Configure widget visibility and order                                        |
| Primary nav customization  | Set the 5 most-used nav items                                                |
| Chef profile editor        | Name, bio, photo, specialty, business description                            |
| Portal background          | Customize the client portal background                                       |
| Availability signal        | Control public availability display                                          |
| Public chef profile        | Manage the publicly visible chef profile page                                |
| Favorite chefs             | Follow other chefs in the network                                            |
| Client preview             | See the platform as a client would                                           |
| Hard blocks                | Mark dates as completely unavailable                                         |
| Event limits               | Set maximum events per period                                                |
| Buffer time                | Set required rest between events                                             |
| Booking page               | Shareable inquiry link with custom slug, pricing model, and deposit settings |
| Event types and labels     | Configure custom event occasion types                                        |
| Custom fields              | Add custom data fields to events                                             |
| Stripe payout settings     | Configure bank account for payouts                                           |
| Supporter billing          | Manage voluntary supporter contribution                                      |
| Module toggles             | Enable or disable optional feature modules                                   |
| Apple Pay and Google Pay   | Enable wallet payment options in checkout                                    |
| Response templates         | Create and edit email and SMS templates                                      |
| Automations                | Configure trigger-based automated actions                                    |
| Seasonal palettes          | Manage ingredient palettes by season                                         |
| Chef journal               | Personal professional reflection entries                                     |
| Notification settings      | Configure email, push, and SMS preferences by notification category          |
| Google integration         | Connect Gmail and Google Calendar                                            |
| Wix integration            | Connect Wix website for inquiry capture                                      |
| Embed widget               | Generate the embeddable inquiry widget for any website                       |
| Integrations center        | Browse all available integrations                                            |
| iCal feed                  | Enable and manage the iCal subscription URL                                  |
| Zapier and webhooks        | Configure webhook subscriptions with event type selection                    |
| AI trust center            | Full walkthrough of how AI is used and what data stays local                 |
| Remy culinary profile      | Configure chef preferences for Remy's AI responses                           |
| Menu engine toggles        | Enable or disable the 11 menu intelligence sidebar features                  |
| Google review URL          | Set the link to the Google review form                                       |
| Yelp reviews sync          | Connect and sync Yelp reviews                                                |
| Appearance                 | Toggle light and dark mode                                                   |
| Professional growth        | Capability inventory, momentum tracker, profile highlights, portfolio        |
| Chef network               | Control discoverability to other chefs                                       |
| Protection hub             | Legal and safety resources                                                   |
| Contract templates         | Create and manage reusable contract templates                                |
| Food safety and compliance | HACCP plan, compliance resources                                             |
| HACCP plan                 | Auto-generated FDA-compliant plan with guided review wizard                  |
| GDPR settings              | Data privacy and consent management                                          |
| Emergency contacts         | Store emergency contacts for events                                          |
| Demo data manager          | Load or remove sample data                                                   |
| API keys                   | Generate and manage API access keys                                          |
| Webhooks                   | Configure outbound webhook endpoints                                         |
| Desktop app                | Configure system tray, auto-start, and native notification settings          |
| Feedback submission        | In-app feedback form                                                         |
| Change password            | Update account credentials                                                   |
| Delete account             | Soft-delete with 30-day grace period and data export                         |
| Account reactivation       | Cancel a pending deletion during the grace period                            |
| System health              | View live health status of all services (admin only)                         |
| System incidents           | Log and track system incidents (admin only)                                  |
| Communication settings     | Auto-response rules, business hours, template manager                        |

---

### 4.16 Marketing and Social

| Function                       | Description                                                                |
| ------------------------------ | -------------------------------------------------------------------------- |
| Campaign manager               | Create and manage outreach campaigns to client segments                    |
| AI personalized outreach       | AI-drafted messages using client history and preferences (Ollama, private) |
| AI campaign concept            | AI-generated campaign theme suggestions (Gemini, non-private)              |
| Promo code creation            | Create discount codes with percentage, expiry, and usage limits            |
| Holiday outreach suggestions   | AI-drafted messages for upcoming holidays                                  |
| Social media caption generator | AI-generated captions for post-event social content                        |
| Public chef profile            | Publicly accessible profile page at `/chef/[slug]`                         |
| Bio generator                  | AI-drafted professional bio using chef history (Ollama)                    |
| Portfolio manager              | Showcase past events and accomplishments                                   |
| Email marketing hub            | Manage email lists and campaigns                                           |

---

### 4.17 Network and Community

| Function                  | Description                                               |
| ------------------------- | --------------------------------------------------------- |
| Chef network directory    | Browse other chefs on the platform                        |
| Network profile           | Configure how the chef appears to other chefs             |
| Discoverability toggle    | Control whether the chef appears in the network directory |
| Recipe sharing            | Share recipes from the recipe book with other chefs       |
| Collaboration invitations | Invite another chef to co-work an event                   |
| Referral partnerships     | Track and manage business referral relationships          |
| Community forum           | Discussion and knowledge sharing among chefs              |

---

### 4.18 Loyalty Program

| Function                    | Description                                        |
| --------------------------- | -------------------------------------------------- |
| Loyalty tier configuration  | Set tier names, thresholds, and benefits           |
| Points tracking             | Award and track points per client                  |
| Reward redemption           | Client redeems points for rewards                  |
| Bonus point awards          | Manually award bonus points to a client            |
| Loyalty transaction history | Full log of points earned and spent                |
| Loyalty card display        | Visual loyalty card on the client record           |
| Loyalty approaching alert   | Dashboard alert for clients nearing a tier upgrade |
| Gift card issuance          | Create and manage gift card codes                  |

---

### 4.19 Safety and Legal

| Function               | Description                                                      |
| ---------------------- | ---------------------------------------------------------------- |
| Contract templates     | Reusable contract templates with variable placeholders           |
| AI contract generator  | AI-drafted contract specific to an event (Ollama)                |
| HACCP plan             | Auto-generated food safety plan per business archetype           |
| HACCP guided review    | Step-by-step review wizard with section toggles and custom notes |
| Food safety compliance | Compliance checklists and resources                              |
| GDPR management        | Data consent and privacy controls                                |
| NDA tracking           | Per-client NDA status and coverage                               |
| Emergency contacts     | Contacts accessible during events                                |
| Protection hub         | Centralized legal and safety resource center                     |

---

### 4.20 Remy (AI Concierge)

| Function                 | Description                                                                  |
| ------------------------ | ---------------------------------------------------------------------------- |
| Remy chat drawer         | Slide-in AI chat interface accessible from any page                          |
| Natural language queries | Ask questions about clients, events, finances, and recipes in plain language |
| Recipe search            | Search the chef's own recipe book by natural language query                  |
| Event data queries       | Ask Remy about upcoming events, client history, or status                    |
| Financial queries        | Ask Remy about revenue, expenses, and profitability                          |
| Task creation via chat   | Create tasks by telling Remy what needs to be done                           |
| Draft message review     | Ask Remy to review a draft client message                                    |
| Drag-to-resize           | Resize the Remy window by dragging any edge or corner                        |
| Daily plan generation    | Remy generates the daily ops swim-lane plan                                  |

All Remy interactions use Ollama (local AI only). No conversation content, client data, or business data is sent to external AI services.

---

### 4.21 Public Directory (No Auth Required)

| Function                 | Description                                                                      |
| ------------------------ | -------------------------------------------------------------------------------- |
| Food search              | Search by food type, location, and service category                              |
| Category browse          | Browse by Private Chefs, Caterers, Meal Prep, Restaurants, Food Trucks, Bakeries |
| Provider profiles        | View a provider's profile, menus, and service offerings                          |
| Direct inquiry form      | Embedded form to send an inquiry directly to a provider                          |
| No-commission connection | Provider receives the inquiry directly; no fee is taken                          |
| Chef public profile      | Public page at `/chef/[slug]` with bio, menus, reviews, and contact              |
| Blog                     | Editorial content about food and culinary culture                                |

---

### 4.22 Client Portal (Client Login Required)

| #   | Function                  | Description                                                               |
| --- | ------------------------- | ------------------------------------------------------------------------- |
| 1   | Accept Proposal           | Client accepts or rejects a chef proposal                                 |
| 2   | Book Now                  | New inquiry booking flow from within the portal                           |
| 3   | Cancel Event              | Client requests event cancellation                                        |
| 4   | Cannabis View             | Client view of cannabis event details and compliance info                 |
| 5   | Chat / Messaging          | Client sends messages directly to their chef (per-conversation threads)   |
| 6   | Choose Menu               | Client selects from available menus for their event                       |
| 7   | Contract View and Signing | Client reviews and signs the event contract                               |
| 8   | Countdown Page            | Pre-event page with parking, dress code, and arrival instructions         |
| 9   | Dietary Submission        | Client submits dietary restrictions and allergies                         |
| 10  | Document Access           | Client views shared documents (recipe cards, event notes, photos)         |
| 11  | Event Detail              | Client-facing event overview with date, menu, and logistics               |
| 12  | Event History             | Full history of all past events                                           |
| 13  | Event Settings Dashboard  | Client-side settings for their events                                     |
| 14  | Event Summary             | Summary view of a completed event                                         |
| 15  | Friends                   | Invite friends and view friend list                                       |
| 16  | Group Hub                 | Shared group token page for group event coordination                      |
| 17  | Hub                       | Client social hub home                                                    |
| 18  | Hub Create                | Create a new group or social hub                                          |
| 19  | Inquiries                 | View all submitted inquiries and their status                             |
| 20  | Invoice View and Download | Client downloads their invoice                                            |
| 21  | Loyalty Rewards           | Earn, view, and redeem loyalty points                                     |
| 22  | Loyalty Rewards About     | Learn how the loyalty program works                                       |
| 23  | Menu Approval             | Client approves or requests changes to the proposed menu                  |
| 24  | My Spending               | Full spending history across all events                                   |
| 25  | Notifications             | In-portal notification inbox                                              |
| 26  | Onboarding                | Token-based first-time client setup flow                                  |
| 27  | Payment                   | Pay deposits and balances through the portal via Stripe                   |
| 28  | Payment Plan View         | View installment payment schedule                                         |
| 29  | Pre-Event Checklist       | Client completes pre-event preparation checklist                          |
| 30  | Profile Management        | Client manages contact info, preferences, and meal collaboration settings |
| 31  | Proposal View and Accept  | View chef proposal and accept or decline                                  |
| 32  | Quotes                    | View all quotes, accept or reject individual quotes                       |
| 33  | Raffle                    | Participate in loyalty raffle (game, leaderboard, draw receipt)           |
| 34  | Share Chef                | Share chef referral link with others                                      |
| 35  | Survey                    | Post-event feedback survey (token-based)                                  |

---

### 4.23 Staff Portal (Staff Login Required)

| Function            | Description                                             |
| ------------------- | ------------------------------------------------------- |
| Staff dashboard     | Overview of today's assignments                         |
| Task view           | Staff member's assigned tasks                           |
| Task completion     | Mark tasks as done                                      |
| Station clipboard   | View and update station assignments                     |
| Event schedule view | Read-only access to the day-of plan for assigned events |

---

### 4.24 Embeddable Widget

| Function               | Description                                                         |
| ---------------------- | ------------------------------------------------------------------- |
| Inquiry widget         | Embeddable form for any external website (Wix, Squarespace, custom) |
| Custom appearance      | Configure color, layout, and fields                                 |
| Direct inquiry routing | Submissions go directly into the chef's inquiry pipeline            |
| No-auth required       | Public-facing, works without the visitor having a ChefFlow account  |

---

### 4.25 Kiosk and Point of Sale

| Function           | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| Kiosk mode         | Full-screen POS interface for in-person transactions (self-service) |
| Kiosk pairing      | Pair a kiosk device to a specific event or location                 |
| Item selection     | Browse and select menu items                                        |
| Payment processing | Accept Stripe payments at the kiosk                                 |
| Order management   | Track orders in real time                                           |

---

### 4.26 Commerce (Full POS and Retail)

The Commerce module provides a full point-of-sale and retail management system for food service operators running pop-ups, markets, or fixed-location service.

| Function                 | Description                                                                                                                 |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- |
| Commerce hub             | Dashboard showing today's sales, active register status, and order queue overview                                           |
| POS register             | Product grid + shopping cart + integrated payment terminal for in-person transactions                                       |
| Virtual terminal         | Process credit card payments manually without a physical terminal, with ZIP code tax lookup                                 |
| Product catalog          | Create and manage sellable products with pricing, category, and availability settings                                       |
| Order queue              | Kanban-style board tracking order-ahead items from received through to pickup                                               |
| Table service            | Dining layout management with table zones, check management, and table status (available, reserved, seated, out of service) |
| Sales log                | Full transaction history with per-sale detail view                                                                          |
| Shift reporting          | Sales totals, transaction counts, and payment method breakdown by shift                                                     |
| Promotions and discounts | Create discount and promo codes with percentage, flat amount, expiry, and usage limits                                      |
| Commerce schedules       | Manage operating schedules and service windows for commerce events                                                          |
| Settlements              | Process and review payment settlements with Stripe                                                                          |
| Reconciliation           | Daily financial report generation and transaction reconciliation with observability dashboard                               |
| Sales parity checking    | Cross-channel consistency check across in-person, online, and kiosk sales channels                                          |
| System observability     | Monitor commerce system health, error rates, and transaction integrity                                                      |

---

### 4.27 Calls and Meetings

Dedicated log for scheduled client calls and in-person meetings, separate from the general messaging thread.

| Function       | Description                                                                                 |
| -------------- | ------------------------------------------------------------------------------------------- |
| Calls list     | All calls and meetings organized by upcoming vs. past with status and type filters          |
| Schedule call  | Book a call with a prospect or client, with pre-populated time, contact, and agenda         |
| Call detail    | View call notes, agenda items, outcome, and any follow-up actions from a specific call      |
| Edit call log  | Update notes, outcome, and follow-up items after a call is complete                         |
| Call types     | Supports discovery calls, follow-up calls, proposal review meetings, and in-person meetings |
| Agenda builder | Build a call agenda with ordered items that can be checked off during the call              |
| Call linkage   | Calls can be linked to a specific inquiry, event, or client record                          |

---

### 4.28 Social Media Management

Tools for planning, composing, scheduling, and archiving social media content.

| Function                    | Description                                                                                   |
| --------------------------- | --------------------------------------------------------------------------------------------- |
| Social hub                  | Overview of social media activity, scheduled posts, and platform connection status            |
| Annual content planner      | Month-by-month editorial calendar with posting schedule and queue summary by platform         |
| Monthly planner             | Month-specific content planning with day-level scheduling                                     |
| Post composer               | Compose posts with text, media, and platform targeting, optionally linked to a specific event |
| Post queue                  | All scheduled and draft posts with publish status                                             |
| Post archive                | Historical record of all published social posts                                               |
| Post detail                 | View performance, engagement, and original content for a specific post                        |
| Media vault                 | Upload and store photos and videos for reuse across posts; tracks usage count per asset       |
| Platform connections        | Connect Instagram, Facebook, Twitter/X, and other social accounts                             |
| Social settings             | Configure platform preferences and post defaults                                              |
| Performance overview        | Aggregate engagement metrics across connected platforms                                       |
| AI social caption generator | AI-generated captions for post-event social content (Gemini, non-private)                     |
| Event-to-post pipeline      | Compose social posts directly from a completed event's photo gallery                          |

---

### 4.29 Goals and Revenue Planning

Tools for setting, tracking, and reverse-engineering business goals.

| Function                  | Description                                                                                                             |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Goals dashboard           | Active goals with progress bars, status badges, and quick access to goal management                                     |
| Goal creation wizard      | Step-by-step form for creating a new business goal with ChefFlow tracking and client reach recommendations              |
| Goal detail               | Track progress against a specific goal with history timeline                                                            |
| Goal history              | Full history of progress entries for a single goal                                                                      |
| Revenue path analysis     | Reverse-engineer a monthly revenue target into a concrete service mix: which event types, how many, at what price point |
| Revenue goals             | Set monthly and annual revenue targets used across the dashboard and financial reporting                                |
| Goal tracking automations | Automatic progress logging based on completed events and recorded revenue                                               |

---

### 4.30 Safety and Incident Management

Tools for operational safety, emergency preparedness, and incident documentation.

| Function             | Description                                                                                            |
| -------------------- | ------------------------------------------------------------------------------------------------------ |
| Backup chef protocol | List of backup chef contacts and documented handoff procedures for event delegation in an emergency    |
| Incident log         | Record safety incidents including foodborne illness reports, injuries, and near-misses                 |
| New incident report  | Structured incident form with type classification, description, involved parties, and resolution steps |
| Incident detail      | View full incident record with legal protection notes and prevention tracking                          |
| Emergency contacts   | Store emergency contacts accessible during events (also under Settings)                                |
| HACCP plan           | Auto-generated FDA-compliant food safety plan (also under Settings)                                    |
| Compliance resources | HACCP checklists, food safety guidance, and compliance references                                      |

---

### 4.31 Meal Prep Programs

Recurring delivery service management for chefs running weekly meal prep accounts.

| Function                | Description                                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------- |
| Meal prep dashboard     | Overview of active programs with rotating menus, delivery schedules, and container tracking |
| Program list            | All active and inactive meal prep client programs                                           |
| Program detail          | Individual program with menu rotation, delivery history, and client preferences             |
| Container tracking      | Log containers sent and returned per delivery                                               |
| Recurring menu rotation | Set and manage the rotating menu cycle for a program                                        |
| Delivery log            | Record each delivery with date, items, and status                                           |

---

### 4.32 Waitlist Management

Manage clients waiting for specific availability slots.

| Function             | Description                                                           |
| -------------------- | --------------------------------------------------------------------- |
| Waitlist dashboard   | View and manage all clients on the chef's availability waitlist       |
| Add to waitlist      | Register a client's interest in a specific date range or service type |
| Notify from waitlist | Alert waitlisted clients when matching availability opens             |
| Waitlist position    | Track each client's position and time on the waitlist                 |

---

### 4.33 Games

A set of culinary-themed mini-games embedded in the platform for chef engagement and creative inspiration.

| Function    | Description                                                                                                         |
| ----------- | ------------------------------------------------------------------------------------------------------------------- |
| Games hub   | Dashboard listing all available mini-games                                                                          |
| Chef Snake  | Ingredient-collecting snake game where the player completes recipes, with difficulty levels and high score tracking |
| Food Galaga | Space shooter-style game with culinary theming                                                                      |
| Tic-Tac-Toe | Classic grid game                                                                                                   |
| Trivia      | Culinary trivia quiz                                                                                                |
| Menu Muse   | Menu-themed creative prompts game                                                                                   |
| The Line    | Kitchen-line simulation game                                                                                        |

---

### 4.34 Wix and External Platform Submissions

Integration layer for capturing inquiries from external websites and platforms.

| Function                     | Description                                                                                                  |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Wix submissions dashboard    | View and manage incoming form submissions from a connected Wix website                                       |
| Submission detail            | Inspect a specific Wix submission with processing status (pending, processing, completed, failed, duplicate) |
| Auto-conversion              | Automatically convert Wix submissions into ChefFlow inquiries                                                |
| Processing status tracking   | Track each submission's lifecycle through the conversion pipeline                                            |
| Error and duplicate handling | Flag duplicate or failed submissions for manual review                                                       |
| Wix connection settings      | Configure the Wix integration from Settings (see 4.15)                                                       |

---

### 4.35 Production Calendar

High-level monthly planning view for production and event scheduling.

| Function            | Description                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| Production calendar | Monthly grid view of all events with status indicators, guest count, revenue, and client name |
| Event density view  | See how many events fall in each week of the month                                            |
| Revenue summary     | Per-event revenue visible at a glance in the production grid                                  |
| Status filter       | Filter events by FSM status within the production view                                        |

---

### 4.36 Partner Portal

A separate portal for referral partners and multi-location operators.

| Function                  | Description                                                                                                 |
| ------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Partner dashboard         | KPIs showing locations managed, events generated, total guests, and partnership value with exposure metrics |
| Partner events            | Events attributed to this partner through referral or location association                                  |
| Multi-location management | Create and manage multiple operator locations under one partner account                                     |
| Location detail           | Individual location settings, service area, and event history                                               |
| Partner profile           | Partner account information and public profile                                                              |
| Partner preview           | Preview how the partner appears to chefs and clients                                                        |
| Partner report            | Public-facing referral performance report, shareable via token-protected link                               |

---

### 4.37 Culinary Board

A personal creative workspace for culinary vocabulary and inspiration.

| Function              | Description                                                                                                              |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Culinary board        | Personal display of the chef's culinary vocabulary: techniques, flavors, and style notes rendered in artistic typography |
| Inspiration reference | Visual reference for the chef's own creative language, used as a thinking tool, not a data store                         |

---

### 4.38 Menu Engineering

Profitability and optimization analysis for the chef's menu catalog.

| Function                   | Description                                                                                        |
| -------------------------- | -------------------------------------------------------------------------------------------------- |
| Menu engineering dashboard | Analyze menu profitability metrics and identify optimization opportunities across the menu catalog |
| Recipe profitability view  | Per-recipe cost, margin, and performance data                                                      |
| Menu scaling               | Scale a menu to a new guest count with non-linear adjustment calculations                          |
| Substitution reference     | Look up ingredient substitutions within the menu editing workflow                                  |

---

### 4.39 Route Inventory (All App Routes)

ChefFlow contains 657 distinct page routes across all route groups.

| Route Group | Count | Description                                                     |
| ----------- | ----- | --------------------------------------------------------------- |
| `(chef)`    | ~495  | Core business operations for chefs                              |
| `(public)`  | ~81   | Public landing pages, discovery, booking, token-protected flows |
| `(admin)`   | ~31   | Platform administration                                         |
| `(client)`  | ~26   | Client event portal                                             |
| `(staff)`   | ~6    | Staff task and station interface                                |
| `(partner)` | ~6    | Referral partner portal                                         |
| `(demo)`    | ~1    | Demo/sandbox mode                                               |
| `auth`      | ~7    | Sign in, sign up, password reset                                |
| `kiosk`     | ~3    | Self-service kiosk interface                                    |
| `embed`     | ~1    | Embeddable inquiry widget                                       |
| `special`   | ~4    | Unsubscribe, unauthorized, beta survey                          |

---

### 4.40 Inventory Management

Full stock tracking and procurement system for chefs managing ingredient inventory across events and service programs.

| Function                 | Description                                                                                         |
| ------------------------ | --------------------------------------------------------------------------------------------------- |
| Inventory hub            | Par level alerts and navigation to all inventory sub-modules                                        |
| Stock levels             | Track on-hand quantities for all ingredients with par level thresholds                              |
| Physical audit log       | All physical audits (full, cycle count, spot count) with status filters                             |
| New audit                | Create a physical count with count sheets and variance reconciliation                               |
| Purchase orders          | Create, submit, and receive POs; track ingredients from order through shelf receipt                 |
| Vendor invoices          | Match incoming vendor invoices to purchase orders                                                   |
| Waste log                | Log food waste by reason with 6-month trend analytics                                               |
| Expiry alerts            | Batches expiring within 7 days flagged with urgency indicators                                      |
| Procurement center       | Unified view of supplier directory and purchase order workflow                                      |
| Demand forecast          | 14-day ingredient demand projection vs. current stock, with auto-reorder panel generating draft POs |
| Inventory transactions   | Full movement history (received, consumed, wasted, transferred)                                     |
| Storage locations        | Manage named storage locations (walk-in, dry storage, etc.)                                         |
| Staff meals              | Track ingredients consumed as staff meals                                                           |
| Food cost from inventory | Compute food cost using actual stock movement rather than recipe estimates                          |
| Inventory counts         | Record periodic physical counts per location                                                        |

---

### 4.41 Cannabis Compliance Module

A restricted specialty tier for chefs legally permitted to serve cannabis-infused dining experiences. Requires explicit admin grant to unlock. All ledger entries are immutable for regulatory compliance.

| Function                | Description                                                                                                                                                       |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cannabis hub            | Entry point for invited-tier chefs: navigation to events, ledger, RSVPs, control packets, handbook, and invite management                                         |
| Cannabis events         | List and manage all cannabis-infused dining events                                                                                                                |
| Control packet          | Per-event compliance documentation: guest participation tracking, course configuration, mg dosage per guest, batch assignments                                    |
| Control packet template | Blank template generator with layout options (linear, 2x5 grid, 3x4 grid, custom seating) for printing                                                            |
| Compliance snapshot     | Versioned compliance records with paper reconciliation workflow, photo evidence requirement, and immutable archival                                               |
| Cannabis ledger         | Immutable financial ledger for all cannabis event transactions (payments, deposits, installments, tips, refunds, adjustments)                                     |
| Guest RSVP management   | Attendance tracking and RSVP reconciliation for cannabis events                                                                                                   |
| Photo evidence upload   | Upload and attach regulatory photo documentation to control packets                                                                                               |
| Batch reconciliation    | Track and reconcile ingredient batches for trace-and-track compliance                                                                                             |
| Finalize packet         | Lock and archive control packet for audit submission                                                                                                              |
| Cannabis handbook       | Service philosophy and execution manual: voluntary participation, pacing, dosing consistency, communication tone, surprise-dose prohibition, extract fundamentals |
| Agreement signing       | Chef signs cannabis liability and compliance agreement before tier is activated                                                                                   |
| Invite management       | Invite guests to cannabis events through token-protected invite links                                                                                             |
| Admin tier controls     | Platform admin grants or revokes cannabis tier per chef (admin only)                                                                                              |
| Admin invite approval   | Admin approves or denies cannabis invite requests before guests receive access                                                                                    |

---

### 4.42 Background Automation System

27 scheduled jobs run automatically on defined cron intervals. No user action required. All jobs respect per-chef automation settings.

| Job                 | Schedule       | What It Does                                                                                                        |
| ------------------- | -------------- | ------------------------------------------------------------------------------------------------------------------- |
| Daily report        | 7 AM ET daily  | Generates and emails a daily business report to each chef                                                           |
| Follow-up reminders | Daily          | Notifies chefs of overdue inquiry follow-ups (respects per-chef automation settings)                                |
| Lifecycle           | Daily          | Expires stale inquiries and quotes; sends client event reminders                                                    |
| Campaigns           | Hourly         | Fires scheduled marketing campaigns when their scheduled_at time is reached                                         |
| Cron monitor        | Periodic       | Health check confirming all registered jobs have run within 2x their expected interval; flags stale or missing jobs |
| Loyalty expiry      | Daily          | Enforces expiry on vouchers, gift cards, and waitlist entries past their expires_at date                            |
| Social publish      | Every 5 min    | Publishes queued social posts to connected platform adapters                                                        |
| Waitlist sweep      | 8 AM UTC daily | Notifies waitlisted clients of matching availability (7-day re-notify throttle)                                     |
| RSVP reminders      | Daily          | Sends RSVP reminder emails to pending event guests at 7-day, 3-day, and 24-hour intervals                           |
| Wellbeing signals   | Weekly         | Computes chef burnout level from activity data; sends wellbeing notification if threshold exceeded                  |
| Revenue goals       | Weekly         | Tracks goal progress, calculates milestone thresholds (25/50/75/100%), sends digest                                 |
| Automations         | Every 15 min   | Evaluates time-based automation triggers across all active chef accounts                                            |
| Activity cleanup    | Periodic       | Purges old activity log entries beyond retention window                                                             |
| Call reminders      | Daily          | Sends reminders for upcoming scheduled client calls                                                                 |
| Copilot             | Periodic       | Generates proactive Remy suggestions for chefs (follow-ups, at-risk clients, etc.)                                  |
| Email history scan  | Periodic       | Scans synced Gmail history to surface client intelligence                                                           |
| Integrations pull   | Periodic       | Polls external integrations (Google Calendar, Wix) for new data                                                     |
| Integrations retry  | Periodic       | Retries failed integration sync attempts                                                                            |
| Push cleanup        | Periodic       | Removes expired or failed push notification subscriptions                                                           |
| Raffle draw         | Scheduled      | Selects raffle/giveaway winners at configured draw times                                                            |
| Reviews sync        | Daily          | Pulls updated reviews from connected Yelp accounts                                                                  |
| Sequences           | Periodic       | Fires next message in active multi-step email/SMS sequences                                                         |
| Simulation          | Scheduled      | Generates simulation data for development and testing                                                               |
| Wix process         | Periodic       | Processes incoming Wix form submissions and converts to inquiries                                                   |

---

### 4.43 Platform Administration

Admin-only tools for managing the ChefFlow platform across all tenants. Accessible only to accounts with the `admin` role.

| Function                      | Description                                                                                                               |
| ----------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Platform overview             | Cross-tenant KPIs: total chefs, clients, events, GMV, live session count, and quick-action tiles                          |
| Platform analytics            | New chefs and clients over time, GMV growth, platform-wide revenue trends                                                 |
| User directory                | All chef accounts with signup recency badges, event counts, GMV totals, and health indicators                             |
| Individual chef admin         | View a specific chef's full account, events, clients, financials, and settings                                            |
| Cross-tenant client directory | All clients across every chef with LTV totals and platform metrics                                                        |
| Cross-tenant event monitor    | All events across every chef with status distribution                                                                     |
| Platform financials           | GMV reporting, cross-tenant ledger entries, payment issues, and P&L                                                       |
| Financial reconciliation      | Cross-tenant GMV, transfers to chefs, platform fees, and deferred amounts                                                 |
| Immutable audit log           | Every sensitive platform action logged with tenant, actor, timestamp, and payload                                         |
| Feature flags                 | Per-chef feature toggle management (pricing suggestions, menu recommendations, social platform, analytics, beta features) |
| Beta program management       | Review and process beta signup requests from /beta; set status to pending, invited, or active                             |
| Cannabis tier management      | Grant or revoke cannabis tier access per chef; review and approve cannabis invite requests                                |
| Public directory control      | Approve or revoke chef listings on the public /chefs discovery page                                                       |
| Communications center         | Platform-wide announcements, direct email to chefs or clients, broadcast messaging                                        |
| Community hub moderation      | Searchable, paginated view of all hub groups across tenants with moderation controls                                      |
| Social content moderation     | Global social post feed with chef filtering for content review                                                            |
| Silent failures monitor       | Non-blocking operation failures surfaced with severity and source, normally invisible in production                       |
| Real-time presence            | Every visitor on the site in real time: anonymous, logged-in chefs, clients                                               |
| System health                 | Database row counts, zombie events, orphaned clients, QoL metrics over 30 days                                            |
| Notification monitor          | Global notification feed with category, action, recipient, and date range filtering                                       |
| Referral partner directory    | Platform-wide referral partner records across all chef tenants                                                            |
| Feedback inbox                | User feedback captured in-app with sentiment (love, frustrated, suggestion, bug, other)                                   |

---

### 4.44 Quote Builder

The quote system is the formal pricing and proposal layer between inquiry and confirmed event. Quotes have their own 5-state lifecycle independent of the event FSM.

**States:** draft, sent, accepted, rejected, expired. Expired quotes can be revised and resent (expired back to draft).

| Function                  | Description                                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Create quote              | Build a quote from scratch or pre-filled from an inquiry (guest count, budget, occasion, date auto-populated) |
| Pricing models            | Flat rate, per-person, or custom. Recurring client pricing auto-populates if configured                       |
| Deposit configuration     | Required flag, fixed amount in cents, or percentage (0-100). Both can coexist on one quote                    |
| Pricing intelligence      | Benchmarks from chef's own event history and platform-wide data for the guest count range                     |
| Quote Intelligence Bar    | AI-generated guidance on pricing and proposal framing                                                         |
| Send to client            | Transitions draft to sent; client receives email with acceptance link                                         |
| Client acceptance         | Client clicks link, accepts quote; transitions to accepted; pricing snapshot frozen                           |
| Rejection tracking        | Client or chef can reject with optional reason; reason stored and surfaced in analytics                       |
| Expiry                    | Optional valid_until date; expired status calculated at read time; can revive expired quotes                  |
| Version history           | All previous quote versions retained and viewable on the detail page                                          |
| Quote to event            | After acceptance, a linked event is created or the quote attaches to an existing event                        |
| Quote Acceptance Insights | Analytics panel showing why clients accept or reject proposals                                                |
| Pipeline view             | Tabbed list filtered by state: all, draft, sent, accepted, rejected, expired                                  |

---

### 4.45 Conversations and Messaging

Real-time two-way messaging between chef and client, threaded by conversation.

| Function                  | Description                                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Inbox                     | All conversations listed with unread indicators and last message preview                                                                               |
| Needs First Contact panel | Inquiries awaiting the chef's initial response, surfaced at the top of the inbox                                                                       |
| New conversation          | Chef can start a conversation with any client                                                                                                          |
| Message types             | Text, image (up to 10MB: jpg, png, heic, heif, webp), file (up to 25MB: pdf, doc, docx, xls, xlsx, txt, csv), link with metadata, event reference card |
| Real-time delivery        | PostgreSQL realtime subscription; messages appear instantly without page refresh                                                                       |
| Read receipts             | Per-message read tracking; conversations marked as read on open                                                                                        |
| Optimistic updates        | Message appears immediately; rolls back with error if server write fails                                                                               |
| Conversation context      | Conversations are typed: standalone (free-form), inquiry-linked, or event-linked                                                                       |
| Pinned client notes       | Client notes displayed in sidebar alongside the conversation                                                                                           |
| Pending insights          | AI-generated conversation analysis widget (Ollama, private)                                                                                            |
| File security             | MIME type verified server-side; extension derived from MIME, not filename                                                                              |

---

### 4.46 Authentication and Onboarding

| Function           | Description                                                                                                             |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| Chef sign-up       | Email, password, business name, optional phone. Creates new chef tenant automatically                                   |
| Client sign-up     | Full name, email, password, optional phone. Can be invitation-token-based (email pre-filled) or standalone              |
| Role selection     | One-time choice after account creation: Chef or Client. Cannot be changed later                                         |
| Sign-in            | Email and password with "stay signed in" option. Live progress display shows auth steps. Network-aware error messages   |
| Forgot password    | Standard reset flow                                                                                                     |
| Client invitation  | Chef invites client by email; invitation record created with token; client receives link pre-filled with email and name |
| Session management | After sign-in, redirects to last active path or role-appropriate home (dashboard for chefs, /my-events for clients)     |
| Staff sign-in      | Separate `/staff-login` route; `requireStaff()` gate redirects unauthorized users                                       |

---

### 4.47 Staff Portal

A separate authenticated surface for staff members (kitchen staff, front-of-house, contractors). Staff see only their assigned work with no access to client management, financials, or business settings.

| Function          | Description                                                                                                                                                     |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Staff dashboard   | Welcome view with today's quick stats: pending tasks, completed tasks, upcoming events, assigned stations. Today/Tomorrow toggle                                |
| Task list         | Full task list grouped by date. Status badges (Today, Overdue). Completion percentage bar. Priority indicators (low, medium, high, urgent). Checkbox completion |
| Schedule          | Upcoming and past event assignments. Event name, date, time, role, scheduled and actual hours. Status badges (scheduled, confirmed, completed, no_show)         |
| Station clipboard | Multi-station selector. Date navigation. Prep items grid with on_hand and waste tracking per item. Shift check-in/out controls                                  |
| Recipe reference  | Read-only access to all recipes for the tenant. Station-based filtering. Shows title, description, servings, prep and cook times, full instructions             |
| Time tracking     | Clock in/out. Logged hours by period (week or payroll window)                                                                                                   |

Auth gate: `requireStaff()` on all staff routes. Redirects to `/staff-login` if not authenticated.

---

### 4.48 Integrations Hub

Connects ChefFlow to 12+ third-party platforms via OAuth2, API key, or personal access token.

| Category            | Providers                                       |
| ------------------- | ----------------------------------------------- |
| Platform email sync | TakeAChef (Gmail OAuth, primary lead ingestion) |
| Point of sale       | Square, Toast, iMenu                            |
| CRM                 | HubSpot, Salesforce, Pipedrive                  |
| Accounting          | QuickBooks                                      |
| Calendar            | Google Calendar, iCal                           |
| Automation          | Zapier, Make (formerly Integromat)              |
| Payments            | Stripe, Square Payments                         |
| Contracts           | DocuSign                                        |
| Directory           | Yelp                                            |

| Function                 | Description                                                                                               |
| ------------------------ | --------------------------------------------------------------------------------------------------------- |
| Integration center       | Overview of all providers with connection status (connected, error, reauth_required) and recent event log |
| TakeAChef setup          | Prominent card showing Gmail connection status, lead counts by stage, and default commission percentage   |
| OAuth connect/disconnect | OAuth2 callback flow with refresh token management                                                        |
| API key storage          | Credentials stored in `tenant_settings.integration_connection_settings` JSONB column                      |
| Security                 | Settings sanitized against prototype pollution (strips `__proto__`, `constructor`, `prototype` keys)      |
| Status indicators        | Per-provider health checks with reauth prompts when tokens expire                                         |

---

### 4.49 Notification Inbox

Centralized in-app alert center for all system events.

| Function             | Description                                                                                                  |
| -------------------- | ------------------------------------------------------------------------------------------------------------ |
| Alert inbox          | Paginated list of all notifications with type, category, and timestamp                                       |
| Read/unread tracking | Unread indicators per notification; mark as read individually or in bulk                                     |
| Real-time updates    | PostgreSQL realtime subscription delivers new notifications without page refresh                             |
| Push notifications   | Web push via OneSignal service worker integration; click navigates to relevant page                          |
| Toast alerts         | Time-sensitive notifications (new inquiry, payment received) surface as immediate toasts anywhere in the app |
| Category filtering   | Filter by notification type (inquiry, quote, event, payment, client, loyalty, etc.)                          |

---

### 4.50 PWA and Offline Mode

ChefFlow is a Progressive Web App installable on any device with offline capability.

| Function               | Description                                                                                                                  |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Installable            | Standard PWA manifest; can be added to home screen on iOS and Android                                                        |
| Service worker         | Manages caching with a build-versioned cache name. Old caches deleted on activation                                          |
| Precached assets       | offline.html, manifest.json, app icons (192px, 512px), apple-touch-icon                                                      |
| Offline fallback       | Navigation requests served from cache when network unavailable. Falls back to /offline.html on cache miss                    |
| Stale-while-revalidate | Static assets (CSS, JS, images, fonts) served from cache immediately while fresh version fetched in background               |
| Push notifications     | Service worker handles push events; shows notification with title, body, icon, badge; click navigates to URL                 |
| Version polling        | Every 5 minutes, checks /api/build-version. If new build detected, notifies all open tabs and triggers service worker update |
| Offline limitations    | Non-GET requests (mutations) pass through to network only; cannot create quotes, send messages, or mutate data while offline |

---

### 4.51 Demo Mode

A controlled testing environment for platform evaluation, onboarding, and feature demonstration.

| Function         | Description                                                                                                     |
| ---------------- | --------------------------------------------------------------------------------------------------------------- |
| Demo accounts    | Pre-created demo chef (`demo@chefflow.test`) and demo client (`demo-client@chefflow.test`) with one-click login |
| Public showcase  | Demo chef has a public directory profile at `/chef/chef-demo-showcase`                                          |
| Load demo data   | Creates 10 clients, 18 events, menus, recipes, and financial records in one action                              |
| Clear demo data  | Removes all demo records while preserving the demo accounts                                                     |
| Tier toggle      | Switch between Pro mode (all features unlocked) and Free mode (upgrade prompts visible) for testing both states |
| Environment gate | Entire demo panel is hard-gated behind `DEMO_MODE_ENABLED=true` environment variable. Not visible in production |

---

### 4.52 Settings Hub

50+ settings pages organized across 7 categories. All settings are per-tenant.

#### Account and Profile

| Page            | What It Configures                                                |
| --------------- | ----------------------------------------------------------------- |
| My Profile      | Chef name, bio, tagline with AI generator (Ollama), profile photo |
| Professional    | Credentials, certifications, years of experience                  |
| Change Password | Password update                                                   |
| Delete Account  | Permanent account and tenant deletion                             |
| Devices         | Active session and device management                              |

#### Business Configuration

| Page           | What It Configures                                |
| -------------- | ------------------------------------------------- |
| My Services    | Service offerings and descriptions                |
| Event Types    | Custom event type definitions                     |
| Pricing        | Default pricing models and rates                  |
| Public Profile | What appears on the public chef directory listing |
| Portfolio      | Portfolio images and featured work                |
| Appearance     | Theme and visual customization                    |

#### Communications and Integrations

| Page                 | What It Configures                          |
| -------------------- | ------------------------------------------- |
| Communication        | Email, SMS, and messaging preferences       |
| Notifications        | Alert channels and triggers per category    |
| Remy                 | AI assistant behavior and persona settings  |
| Automations          | Built-in and custom automation rules        |
| Calendar Sync        | Google Calendar two-way sync                |
| API Keys             | Developer API access tokens                 |
| Webhooks             | Outbound webhook endpoints and events       |
| Zapier               | Zapier integration setup                    |
| Integrations         | Third-party platform connections (see 4.48) |
| Platform Connections | Multi-platform chef network linking         |

#### Client and Culinary

| Page             | What It Configures                                   |
| ---------------- | ---------------------------------------------------- |
| Client Preview   | View the client portal exactly as a client sees it   |
| Custom Fields    | Additional data fields for client profiles           |
| Culinary Profile | Chef's culinary identity and style                   |
| Repertoire       | Skills, specialties, and cuisine expertise           |
| Highlights       | Featured accomplishments displayed on public profile |

#### Financial

| Page            | What It Configures                               |
| --------------- | ------------------------------------------------ |
| Billing         | Voluntary supporter contributions (no paywalls)  |
| Stripe Connect  | Stripe payment account setup and bank connection |
| Payment Methods | Accepted payment method configuration            |

#### Compliance and Safety

| Page       | What It Configures                                                    |
| ---------- | --------------------------------------------------------------------- |
| Compliance | Legal documentation storage                                           |
| Contracts  | Contract template defaults                                            |
| Protection | Data protection and privacy settings                                  |
| Health     | System health monitoring: Stripe, Gmail, Google Calendar, task engine |
| Emergency  | Emergency contact information                                         |
| Incidents  | Incident management configuration                                     |
| AI Privacy | Controls over which data AI can access                                |

#### Operational

| Page           | What It Configures                                                      |
| -------------- | ----------------------------------------------------------------------- |
| Navigation     | Sidebar menu customization (show/hide items)                            |
| Dashboard      | Dashboard widget layout and visibility                                  |
| Modules        | Feature module toggles: enable/disable focus mode and specific features |
| Menu Templates | Default menu template settings                                          |
| Menu Engine    | Buried menu system configuration                                        |
| Templates      | General reusable template management                                    |
| Touchpoints    | Client interaction point configuration                                  |
| Embed          | Public inquiry form widget setup and customization                      |
| Yelp           | Yelp business profile integration                                       |
| Print          | Print layout and formatting defaults                                    |
| Taxonomy       | Custom categorization and tagging systems                               |

---

### 4.53 Morning Briefing

A mobile-first daily overview designed to be read in under 60 seconds. Available at `/briefing/`. Generated fresh each morning by the morning-briefing cron job (7 AM ET). All content is deterministic from live data; no LLM involved.

| Section             | What It Shows                                                                        |
| ------------------- | ------------------------------------------------------------------------------------ |
| Alerts              | Critical and high-severity items: failed payments, overdue tasks, unresolved flags   |
| Yesterday's Recap   | Events completed, tasks done and missed, inquiries received, expenses logged         |
| Shift Handoff Notes | Today's pinned notes, yesterday's closing notes                                      |
| Today's Events      | All scheduled events with times, guest counts, and dietary warnings                  |
| Prep Timers         | Preparation tasks due for completion today                                           |
| Today's Tasks       | Overdue (carried over) tasks plus pending tasks with priority badges                 |
| Staff on Duty       | Team members scheduled today with individual task progress bars                      |
| Quick Links         | Navigation shortcuts to Task Board, Station Ops, Priority Queue, Calendar, Inquiries |

---

### 4.54 Gift Cards and Vouchers

Issue, send, and track gift cards and discount vouchers for clients. Located under `/clients/gift-cards/`.

| Function           | Description                                                                                         |
| ------------------ | --------------------------------------------------------------------------------------------------- |
| Issue gift card    | Create a new gift card with fixed dollar value tied to a client                                     |
| Issue voucher      | Create a percentage or fixed-amount discount code                                                   |
| Send to client     | Email the code directly to the client                                                               |
| Code table         | All codes with: code string, title, value, remaining balance, redemption count, status, expiry date |
| Status tracking    | Active, expired, inactive, fully used                                                               |
| Deactivate         | Disable a code before expiry with confirmation                                                      |
| Stats cards        | Total issued, total redemptions, total value applied, gift card vs. voucher breakdown               |
| Redemption history | All redemptions with client, date, and amount applied                                               |

Gift cards track a remaining balance that decrements on each use. Vouchers apply a one-time discount and track usage count.

---

### 4.55 Raffle System

Monthly prize drawings for clients, integrated with the loyalty program. Located under `/loyalty/raffle/`.

| Function             | Description                                                              |
| -------------------- | ------------------------------------------------------------------------ |
| Create raffle        | Set name (optional), month, and prize description                        |
| Eligible entries     | Client list showing name, alias, total entries, and engagement score     |
| Draw winner          | Weighted random draw from eligible participants; confirmation required   |
| Past raffles         | Historical results showing winner, prize, and total entries at draw time |
| Automatic enrollment | Clients earn raffle entries through loyalty program activity             |

Entries are weighted by engagement score. More active clients have proportionally higher odds.

---

### 4.56 Email Sequences

Trigger-based automated email campaigns. Set-and-forget multi-step outreach. Located under `/marketing/sequences/`.

| Trigger type | When it fires                                   |
| ------------ | ----------------------------------------------- |
| birthday     | N days before client's birthday                 |
| dormant_90   | When client has not had an event in 90 days     |
| post_event   | N days after an event completes                 |
| seasonal     | Recurring calendar schedule (holidays, seasons) |

| Function             | Description                                            |
| -------------------- | ------------------------------------------------------ |
| Create sequence      | Set name, trigger type, timing rules, and email steps  |
| Email steps          | Each step has: subject line, delay in days, email body |
| Multi-step           | Multiple emails in sequence with staggered delays      |
| Active/Paused toggle | Pause a sequence without deleting it                   |
| Enrollment count     | Number of clients currently in each sequence           |
| Unsubscribe handling | Clients who unsubscribe are automatically skipped      |

---

### 4.57 Activity Log

Complete audit trail of all actions taken in the platform. Located at `/activity/`.

| Function                  | Description                                                                   |
| ------------------------- | ----------------------------------------------------------------------------- |
| Chef activity feed        | Actions the chef took: created events, managed clients, updated recipes, etc. |
| Client activity feed      | Actions clients took: payments, portal logins, quote acceptances              |
| Breadcrumb sessions       | Step-by-step navigation trail through the app                                 |
| Resume items              | Quick-access points to pick up where the last session left off                |
| Activity counts by domain | Aggregated counts by area (events, clients, recipes, finances, etc.)          |
| Filtering                 | By actor, domain, and time range (default 7 days)                             |
| Modes                     | Summary (key actions) and Retrace (full navigation trail)                     |
| Privacy option            | Can be disabled in preferences                                                |

---

### 4.58 Priority Queue

Unified view of all actionable items ranked by urgency. Located at `/queue/`. Shows a summary bar with counts across all categories (overdue follow-ups, unpaid invoices, pending quotes, unanswered inquiries). Clears to an empty state when the chef is fully caught up.

---

### 4.59 Task Board

Daily task management organized by assigned staff member. Located at `/tasks/`.

| Function           | Description                                                         |
| ------------------ | ------------------------------------------------------------------- |
| Daily task view    | All tasks for a selected date grouped by assigned staff             |
| Inline completion  | Check off tasks without leaving the board                           |
| Inline creation    | Create tasks directly on the board                                  |
| Carried-over tasks | Tasks from previous days that were not completed surface at the top |
| Recurring tasks    | Tasks can repeat on a schedule and auto-generate each cycle         |
| Task templates     | Reusable task sets for common event types (`/tasks/templates/`)     |
| Gantt view         | Timeline view of tasks across multiple days (`/tasks/gantt/`)       |
| Priority badges    | Low, medium, high, urgent                                           |

---

### 4.60 Nutrition Analysis

Per-menu nutritional breakdown powered by the Spoonacular API. Located at `/nutrition/[menuId]/`.

| Function              | Description                                                                |
| --------------------- | -------------------------------------------------------------------------- |
| Nutritional estimates | Calories, macros, and micronutrients per serving estimated from dish names |
| Manual override       | Chef can adjust any auto-calculated value                                  |
| Proposal toggle       | Option to show nutrition information on client proposals                   |
| Per-menu scope        | Each menu has its own nutrition analysis page                              |

---

### 4.61 Finance Hub

Central finance dashboard with 17 sub-modules covering the full accounting lifecycle. Located at `/finance/`.

The landing page shows a P&L snapshot for the current month, financial and pricing intelligence bars, total revenue collected, net revenue after refunds, and YTD carry-forward savings.

Sub-modules:

| Module      | What It Shows                                                 |
| ----------- | ------------------------------------------------------------- |
| Overview    | Revenue summary, outstanding payments, cash flow snapshot     |
| Cash Flow   | Monthly income, expenses, and payment plan installments       |
| Invoices    | All invoices by status: draft, sent, paid, overdue            |
| Expenses    | All business expenses categorized                             |
| Ledger      | Immutable transaction log and adjustment history              |
| Payments    | Deposits, installments, refunds, failed payments              |
| Payouts     | Stripe payouts, manual payments, reconciliation               |
| Reporting   | Revenue by month, client, event type; tax summary; YTD totals |
| Tax         | Mileage log, quarterly tax estimates, accountant export       |
| Goals       | Annual revenue target, YTD progress, gap-closing strategies   |
| Bank Feed   | Connect bank accounts, reconcile transactions                 |
| Recurring   | Automated billing for repeat clients and retainers            |
| Disputes    | Track and manage Stripe payment disputes                      |
| Contractors | Staff payments, YTD tracking, 1099 filing alerts              |
| Retainers   | Recurring service agreements                                  |
| Plate Costs | True cost-per-plate: ingredients, labor, overhead breakdown   |

---

### 4.62 Website Lead Management

Shared pool of unclaimed contact form submissions. Located at `/leads/`.

| Function    | Description                                                     |
| ----------- | --------------------------------------------------------------- |
| Lead pool   | Unclaimed leads from website contact forms visible to all chefs |
| Claim lead  | Any chef can claim a lead into their personal inquiry pipeline  |
| Manual log  | Log a lead manually                                             |
| Status tabs | New, contacted, converted, archived                             |

---

### 4.63 Kitchen Stations

Live kitchen station operations during service. Located at `/stations/`.

| Function          | Description                                                             |
| ----------------- | ----------------------------------------------------------------------- |
| Station grid      | All stations with menu item and component counts                        |
| 86'd items banner | Items marked unavailable display across all stations                    |
| Create station    | Add new stations (saute, grill, pastry, etc.)                           |
| Station detail    | Individual station with prep items, on-hand tracking, and waste logging |
| Daily ops         | Day-of station operations and checklist (`/stations/daily-ops/`)        |
| Orders            | Order sheet view per station (`/stations/orders/`)                      |
| Waste log         | Per-station waste tracking (`/stations/waste/`)                         |
| Ops log           | Running shift notes log (`/stations/ops-log/`)                          |

---

### 4.64 Brand Reputation

Online brand mention monitoring. Located at `/reputation/mentions/`.

| Function           | Description                                                |
| ------------------ | ---------------------------------------------------------- |
| Mention feed       | All brand mentions from across the web, ordered by recency |
| Volume             | Up to 50 most recent mentions                              |
| Review and respond | Manage and respond to mentions via MentionFeed component   |

---

### 4.65 Guest Analytics

Insights into guest attendance patterns across all events. Located at `/guest-analytics/`.

| Function                        | Description                                                  |
| ------------------------------- | ------------------------------------------------------------ |
| Unique guest count              | Total distinct guests across all events                      |
| Repeat guest count              | Guests who have attended more than once                      |
| Average events per repeat guest | Frequency metric                                             |
| Repeat guest list               | Each repeat guest with full event attendance history         |
| Dinner groups                   | Identifies clusters of guests who frequently attend together |

---

### 4.66 Guest Leads

Pipeline of guests captured via event QR codes who have not yet become direct clients. Located at `/guest-leads/`.

| Function          | Description                                  |
| ----------------- | -------------------------------------------- |
| Stats             | Total leads, new, contacted, converted       |
| Convert to client | Promote a guest lead to a full client record |
| Status tracking   | Filter by pipeline stage                     |

---

### 4.67 Charity Events

Aggregated view of all charity-related activity across the platform. Admin-only. Located at `/charity/`.

| Function          | Description                                                 |
| ----------------- | ----------------------------------------------------------- |
| Charity events    | Events matching charity keywords in one view                |
| Charity menus     | Menus created for charity events                            |
| Financial entries | Ledger and expense entries associated with charity work     |
| Misc mentions     | Notes and records mentioning charity across the platform    |
| Volunteer hours   | Summary of total volunteer hours logged                     |
| Hours log         | Dedicated volunteer hours tracking page (`/charity/hours/`) |

---

### 4.68 Consulting Mode

An interactive educational playbook for pricing culinary services correctly. Located at `/consulting/`. Not client-facing.

| Section                  | Content                                                      |
| ------------------------ | ------------------------------------------------------------ |
| Pricing pillars          | Hard costs, labor value, overhead, profit target             |
| Pricing formula          | Step-by-step formula to calculate a defensible rate          |
| Package ladder           | Three-tier structure: Essential, Signature, Concierge        |
| Discovery call checklist | What to establish before quoting                             |
| Value language templates | Phrases for presenting pricing to clients                    |
| Pricing calculator       | Interactive tool to compute rates from real inputs           |
| Next actions             | Links to build cost floor, create a quote, set revenue goals |

---

### 4.69 Data Import

AI-powered hub for migrating data from external sources. Located at `/import/`. Requires Gemini configuration to function.

10 import modes:

| Mode        | What It Imports                                          |
| ----------- | -------------------------------------------------------- |
| Brain dump  | Unstructured text parsed into clients, events, and notes |
| CSV         | Structured spreadsheet data                              |
| Past events | Historical event records                                 |
| TakeAChef   | Direct integration import from TakeAChef platform        |
| Inquiries   | Bulk inquiry import                                      |
| Clients     | Client list                                              |
| Recipe      | Recipe text parsed into structured recipe records        |
| Receipt     | Receipt image or text parsed into expense records        |
| Document    | Document parsed and filed                                |
| File upload | Generic file with AI classification and routing          |

---

### 4.70 Travel Planning

Global travel calendar for all event-related travel across the next 90 days. Located at `/travel/`.

| Function            | Description                                             |
| ------------------- | ------------------------------------------------------- |
| Weekly view         | All travel legs grouped by week                         |
| Leg detail          | Type, status, departure time, estimated duration, stops |
| Ingredient sourcing | Whether specialty sourcing is needed per leg            |
| Summary stats       | Total trips, specialty sourcing runs, consolidated runs |

Auto-created travel legs (drive to venue, return home) generate when an event transitions to confirmed.

---

### 4.71 Testimonials

Guest review management for public display. Located at `/testimonials/`.

| Function         | Description                                    |
| ---------------- | ---------------------------------------------- |
| Testimonial list | All testimonials from completed events         |
| Approve          | Mark a testimonial approved for public display |
| Feature          | Highlight favorite reviews as featured         |
| Inline editing   | Edit content directly in the manager           |
| Event linkage    | Each testimonial linked to its source event    |

---

### 4.72 Onboarding

Guided setup flows for new chefs. Located at `/onboarding/`.

Two modes based on state:

- **First-time:** OnboardingWizard with 5 steps covering profile setup and Stripe Connect
- **Returning:** OnboardingHub showing migration tasks and completion status

Sub-flows: `/onboarding/clients/`, `/onboarding/loyalty/`, `/onboarding/recipes/`, `/onboarding/staff/`

---

### 4.73 Remy Command Hub

Founder-only AI management console. Located at `/commands/`. Restricted to founder email; all others redirected to an unauthorized page.

| Function             | Description                              |
| -------------------- | ---------------------------------------- |
| AI commands          | Direct Remy AI command interface         |
| Conversation history | All Remy conversations across the system |
| Memory management    | Remy's persistent memory store           |
| Privacy settings     | Controls over AI data access             |

---

### 4.74 Intelligence Hub

10 deterministic intelligence engines running instant analysis from real data. Located at `/intelligence/`. No AI or LLM involved. Each engine loads independently via Suspense so slow queries do not block the page.

Covers pattern recognition and business intelligence across pricing, client behavior, event performance, and operational efficiency.

---

### 4.75 Inbox and Email Triage

Unified inbox for all inbound communications. Located at `/inbox/`. Two modes depending on triage setting.

Triage mode (if enabled):

| Function           | Description                                  |
| ------------------ | -------------------------------------------- |
| Tabs               | Unlinked, needs attention, snoozed, resolved |
| Stats              | Message counts by category                   |
| Calendar peek      | Upcoming events shown alongside the inbox    |
| Triage suggestions | AI-suggested next action per message         |
| Gmail status       | Alert if Gmail is not connected              |

Legacy mode: Unified chronological feed of chat messages, form submissions, and notifications.

Sub-pages: `/inbox/triage/`, `/inbox/history-scan/`

---

### 4.76 Dinner Circles

Chef-side management view of all client Dinner Circles. Located at `/circles/`.

| Function      | Description                                   |
| ------------- | --------------------------------------------- |
| Circles list  | All active Dinner Circle groups               |
| Social feed   | Recent activity across all circles (30 items) |
| Tab interface | Switch between list view and social feed      |

This is the chef's view of the same circles that guests access via token-based URLs at `/hub/g/[groupToken]/`.

---

### 4.77 Chef Network

Full social platform for chef-to-chef professional interaction. Located at `/network/`.

| Tab         | Content                                                                         |
| ----------- | ------------------------------------------------------------------------------- |
| Feed        | Social posts, stories, topic channels, suggested chefs, trending hashtags       |
| Channels    | Topic-based channels to browse and join                                         |
| Discover    | Trending posts, suggested chefs, trending hashtags                              |
| Connections | Search, send/accept requests, connections list, contact sharing, trusted circle |
| Collab      | Collaboration handoffs: lead swaps, backup coverage, referrals between chefs    |

Additional: Privacy notice if discoverability is off. Pending connection request badge. Network referral intelligence showing which connections have sent bookings.

Sub-pages: `/network/collabs/`, `/network/notifications/`, `/network/saved/`, `/network/[chefId]/`

---

### 4.78 Proposals and Add-ons

Proposal template management and upsell configuration. Located at `/proposals/`.

| Function       | Description                                                                   |
| -------------- | ----------------------------------------------------------------------------- |
| Template list  | All proposal templates with edit links                                        |
| Build template | Create a new proposal template                                                |
| Add-ons        | Configure upsell options: wine pairings, extra courses, tableside experiences |

Sub-pages: `/proposals/templates/`, `/proposals/addons/`

---

### 4.79 Payment Splitting

Split-billing management for events with multiple payers. Located at `/payments/splitting/`.

| Function                 | Description                             |
| ------------------------ | --------------------------------------- |
| Split-billing events     | All events configured for split billing |
| Split detail             | Invoice allocation per participant      |
| Per-participant invoices | Amounts and payment status per payer    |
| Payment reminders        | Alerts for due recurring installments   |

---

### 4.80 Business Insights

Deep clientele and business pattern analysis. Located at `/insights/`. Loads 15 data sets simultaneously.

| Dataset                  | What It Analyzes                                     |
| ------------------------ | ---------------------------------------------------- |
| Dinner time distribution | What times events are booked                         |
| Occasion stats           | Event type breakdown                                 |
| Service styles           | How events are served (plated, family, buffet, etc.) |
| Guest counts             | Distribution of party sizes                          |
| Dietary restrictions     | Frequency of dietary needs across all clients        |
| Monthly volume           | Events per month across the year                     |
| Day-of-week              | Which days get the most bookings                     |
| Revenue trends           | Month-over-month revenue movement                    |
| Acquisition              | How new clients find the chef                        |
| Retention                | Repeat booking rates and cohort analysis             |
| LTV distribution         | Client lifetime value spread                         |
| Phase time stats         | How long events spend in each FSM state              |
| AAR ratings              | After Action Report scores by dimension              |
| Financial intelligence   | Margin and cost pattern analysis                     |
| TakeAChef ROI            | Revenue and conversion from TakeAChef platform leads |

Sub-pages: `/insights/time-analysis/` - Admin time logging and analysis

---

### 4.81 Kitchen Mode

Full-screen active service display launched from `/kitchen`. Designed for use during live events on a tablet or dedicated screen.

| Function            | Description                                                |
| ------------------- | ---------------------------------------------------------- |
| Active task display | Real-time task list for the current event                  |
| Timers              | Course and prep timers with alerts                         |
| Station assignments | Which staff is on which station                            |
| Full-screen overlay | Locks the UI into kitchen mode, no navigation distractions |

---

### 4.82 Schedule

Chef's personal schedule view (`/schedule`). Shows all upcoming and past events in a list format with status badges.

---

### 4.83 Scheduling

Staff and event scheduling tool (`/scheduling`). Separate from the chef's personal schedule. Used to assign staff to events and manage shift coverage.

---

### 4.84 Financials Overview

A dedicated financial overview page (`/financials`). Separate from the full Finance Hub. Provides a high-level summary of revenue, expenses, and outstanding payments for quick reference.

---

### 4.85 Reports

Standalone reports tool (`/reports`). Separate from both the Analytics tab and the Finance Hub reporting section. Generates ad-hoc financial and operational reports with export capability.

---

### 4.86 Public Features (No Login Required)

ChefFlow exposes 70 public-facing pages and flows accessible without an account.

#### Marketing and Info

| #   | Feature                     | Route                            |
| --- | --------------------------- | -------------------------------- |
| 1   | Home Page                   | `/`                              |
| 2   | About                       | `/about`                         |
| 3   | Beta Signup                 | `/beta`                          |
| 4   | Beta Thank You              | `/beta/thank-you`                |
| 5   | Compare Chefs               | `/compare`                       |
| 6   | Compare Chef (individual)   | `/compare/[slug]`                |
| 7   | Contact                     | `/contact`                       |
| 8   | Customers / Case Studies    | `/customers`                     |
| 9   | Customer Profile            | `/customers/[slug]`              |
| 10  | FAQ                         | `/faq`                           |
| 11  | Marketplace Chefs Directory | `/marketplace-chefs`             |
| 12  | Partner Signup              | `/partner-signup`                |
| 13  | Pricing                     | `/pricing`                       |
| 14  | Privacy Policy              | `/privacy` and `/privacy-policy` |
| 15  | Terms of Service            | `/terms`                         |
| 16  | Trust Page                  | `/trust`                         |
| 17  | Unsubscribe                 | `/unsubscribe`                   |

#### Chef Discovery

| #   | Feature                 | Route                             |
| --- | ----------------------- | --------------------------------- |
| 18  | Chef Public Profile     | `/chef/[slug]`                    |
| 19  | Chef Gift Card Purchase | `/chef/[slug]/gift-cards`         |
| 20  | Chef Gift Card Success  | `/chef/[slug]/gift-cards/success` |
| 21  | Chef Inquiry Form       | `/chef/[slug]/inquire`            |
| 22  | Chef Partner Signup     | `/chef/[slug]/partner-signup`     |
| 23  | Discover Directory      | `/discover`                       |
| 24  | Discover Chef Profile   | `/discover/[slug]`                |
| 25  | Discover Chef Enhance   | `/discover/[slug]/enhance`        |
| 26  | Discover Submit         | `/discover/submit`                |
| 27  | Discover Unsubscribe    | `/discover/unsubscribe`           |

#### Booking

| #   | Feature               | Route                        |
| --- | --------------------- | ---------------------------- |
| 28  | Book a Chef           | `/book/[chefSlug]`           |
| 29  | Book a Chef Thank You | `/book/[chefSlug]/thank-you` |
| 30  | Book via Campaign     | `/book/campaign/[token]`     |

#### Token-Based (no account needed, link sent by chef)

| #   | Feature            | Route                            |
| --- | ------------------ | -------------------------------- |
| 31  | Availability Check | `/availability/[token]`          |
| 32  | Cannabis Invite    | `/cannabis-invite/[token]`       |
| 33  | Client Onboarding  | `/client/[token]`                |
| 34  | Event Guest Card   | `/event/[eventId]/guest/[token]` |
| 35  | Feedback Form      | `/feedback/[token]`              |
| 36  | Guest Feedback     | `/guest-feedback/[token]`        |
| 37  | Intake Form        | `/intake/[token]`                |
| 38  | Partner Report     | `/partner-report/[token]`        |
| 39  | Proposal View      | `/proposal/[token]`              |
| 40  | Review Submission  | `/review/[token]`                |
| 41  | Share Link         | `/share/[token]`                 |
| 42  | Share Recap        | `/share/[token]/recap`           |
| 43  | Tip Page           | `/tip/[token]`                   |
| 44  | View Document      | `/view/[token]`                  |
| 45  | Worksheet          | `/worksheet/[token]`             |

#### Community Hub (public)

| #   | Feature         | Route                    |
| --- | --------------- | ------------------------ |
| 46  | Group Hub       | `/hub/g/[groupToken]`    |
| 47  | Join Group      | `/hub/join/[groupToken]` |
| 48  | Public Profile  | `/hub/me/[profileToken]` |
| 49  | Group Shortlink | `/g/[code]`              |

#### Auth

| #   | Feature               | Route                   |
| --- | --------------------- | ----------------------- |
| 50  | Sign In               | `/auth/signin`          |
| 51  | Sign Up (chef)        | `/auth/signup`          |
| 52  | Client Signup         | `/auth/client-signup`   |
| 53  | Partner Signup (auth) | `/auth/partner-signup`  |
| 54  | Forgot Password       | `/auth/forgot-password` |
| 55  | Reset Password        | `/auth/reset-password`  |
| 56  | Verify Email          | `/auth/verify-email`    |
| 57  | Role Selection        | `/auth/role-selection`  |
| 58  | Reactivate Account    | `/reactivate-account`   |

#### Other Public

| #   | Feature                     | Route                     |
| --- | --------------------------- | ------------------------- |
| 59  | Cannabis Public Page        | `/cannabis/public`        |
| 60  | Staff Login                 | `/staff-login`            |
| 61  | Staff Portal (public token) | `/staff-portal/[id]`      |
| 62  | Embeddable Inquiry Form     | `/embed/inquiry/[chefId]` |
| 63  | Beta Survey                 | `/beta-survey`            |
| 64  | Beta Survey (token)         | `/beta-survey/[token]`    |
| 65  | Unauthorized Page           | `/unauthorized`           |
| 66  | Demo Mode                   | `/demo`                   |

#### Mobile

| #   | Feature               | Route                             |
| --- | --------------------- | --------------------------------- |
| 67  | Mobile Chef Dashboard | `/(mobile)/chef/[slug]/dashboard` |
| 68  | Mobile Client Events  | `/(mobile)/client/[token]/events` |

#### Kiosk

| #   | Feature           | Route             |
| --- | ----------------- | ----------------- |
| 69  | Kiosk POS         | `/kiosk`          |
| 70  | Kiosk Pair Device | `/kiosk/pair`     |
| 71  | Kiosk Disabled    | `/kiosk/disabled` |

---

## Part 5: What ChefFlow Is Not

- Not a food delivery app. ChefFlow does not fulfill orders or manage delivery logistics.
- Not a restaurant reservation system. ChefFlow does not manage table bookings.
- Not a recipe generation tool. AI in ChefFlow cannot create, suggest, or generate recipes. Recipes are the chef's intellectual property and are entered manually.
- Not a commission-based marketplace. ChefFlow does not take a fee on bookings. Consumers and operators connect directly.
- Not a cloud AI service for private data. All client data, financials, and business information are processed by Ollama running locally on the chef's hardware. Nothing private leaves the machine.

---

## Part 6: Technical Identity

| Property    | Value                                                             |
| ----------- | ----------------------------------------------------------------- |
| App name    | ChefFlow                                                          |
| Live domain | app.cheflowhq.com                                                 |
| Beta domain | beta.cheflowhq.com                                                |
| Tagline     | Ops for Artists                                                   |
| Brand color | Terracotta orange #e88f47                                         |
| Stack       | Next.js 14, PostgreSQL (PostgreSQL), Stripe, Ollama, Tailwind CSS |
| Private AI  | Ollama (local, never cloud)                                       |
| Cloud AI    | Google Gemini (non-private tasks only)                            |
| Payments    | Stripe Connect                                                    |
| Email       | Resend                                                            |
| Hosting     | Self-hosted on developer's PC via Cloudflare Tunnel               |

---

## Part 7: System Wiring

This section documents how every system in ChefFlow connects to every other system. It covers data flows, trigger chains, AI routing, payment pipelines, and multi-tenant isolation. Nothing is left out.

---

### 7.1 Core Data Model

The platform anchors on a central `chefs` table. Every piece of data belongs to a chef (tenant) through either a `tenant_id` or `chef_id` foreign key, both referencing `chefs.id`.

Primary relationship chains:

```
chefs
├── clients (tenant_id)
│   ├── inquiries (tenant_id)
│   └── events (tenant_id, client_id)
│       ├── ledger_entries (event_id)
│       ├── expenses (event_id)
│       ├── menus (event_id)
│       │   └── dishes → components → recipes → recipe_ingredients → ingredients
│       ├── quotes (event_id)
│       ├── event_contracts (event_id)
│       ├── staff_schedules (event_id)
│       ├── post_event_surveys (event_id)
│       └── client_reviews (event_id)
├── recipes (tenant_id)
│   └── recipe_ingredients → ingredients
├── ingredients (tenant_id)
├── staff_members (chef_id)
├── equipment_items (chef_id)
├── referral_partners (tenant_id)
├── marketing_campaigns (tenant_id)
├── social_posts (chef_id)
└── devices (tenant_id)
```

Tenant scoping: Core tables (Layers 1-4) use `tenant_id`. Feature tables (Layer 5+) use `chef_id`. Both reference `chefs.id`. New tables use `chef_id`.

RLS enforcement: Row-Level Security is enabled on all tenant-scoped tables. Server actions also enforce tenant scoping via `.eq('tenant_id', user.tenantId!)` on every query. Defense in depth: RLS blocks rogue queries even if application code has a bug.

---

### 7.2 Event Finite State Machine (FSM)

8 states: draft, proposed, accepted, paid, confirmed, in_progress, completed, cancelled.

Legal transitions: draft to proposed, paid, or cancelled. Proposed to accepted or cancelled. Accepted to paid or cancelled. Paid to confirmed or cancelled. Confirmed to in_progress or cancelled. In_progress to completed or cancelled. Completed and cancelled are terminal.

Readiness gates: Unconfirmed anaphylaxis on the guest list blocks any forward transition from accepted onwards.

Audit log: Every transition appends an immutable row to `event_state_transitions` with actor, timestamp, and from/to states.

Side effects by transition:

| Transition               | Side Effects                                                                                                                                                                                                                                                    |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| draft to proposed        | Send proposal email to client; chef notification; post system message to Dinner Circle                                                                                                                                                                          |
| draft to paid            | Append ledger entry (Stripe webhook only); transition recorded                                                                                                                                                                                                  |
| proposed to accepted     | Chef notification; Dinner Circle system post                                                                                                                                                                                                                    |
| accepted to paid         | Same as draft to paid (Stripe webhook)                                                                                                                                                                                                                          |
| paid to confirmed        | Confirmation email to client and chef; auto-generate and send FOH menu PDF and prep sheet PDF; auto-create service travel legs (drive to venue, return home); auto-place prep blocks in production calendar; sync to Google Calendar; circle-first notification |
| confirmed to in_progress | "Chef is on the way" email to client                                                                                                                                                                                                                            |
| in_progress to completed | Completion email; post-event survey created and invite sent; loyalty points awarded; menu snapshot to hub event history; enqueue Inngest follow-up sequence (thank-you at 3 days, review request at 7 days, referral ask at 14 days)                            |
| any to cancelled         | Cancellation emails to client and chef; Google Calendar event deleted                                                                                                                                                                                           |
| every transition         | Fire automations engine (event_status_changed); enqueue Remy reactive AI tasks; emit outbound webhook (event.transitioned); send push notifications                                                                                                             |

---

### 7.3 Stripe Payment Pipeline

Stripe is the only entity that can record a payment against an event.

```
Client pays via Stripe Checkout
  ↓
Stripe sends charge.succeeded webhook to /api/webhooks/stripe
  ↓
Signature verified (STRIPE_WEBHOOK_SECRET)
  ↓
Idempotency check: transaction_reference = Stripe event ID
  (duplicate webhook: skip, return 200)
  ↓
appendLedgerEntry() creates row in ledger_entries (immutable, append-only)
  ↓
transitionEvent() moves event from accepted to paid, or draft to paid
  ↓
emitWebhook() fires payment.received to chef's configured webhooks
```

Other Stripe events handled: charge.failed (notify chef), charge.refunded (append refund ledger entry), checkout.session.completed (gift card purchase), subscription events (voluntary supporter contributions), account and payout events (Stripe Connect).

---

### 7.4 Ledger and Financial Pipeline

The ledger (`ledger_entries`) is immutable and append-only. No financial state is stored as a column anywhere in the database.

What writes to the ledger:

- Stripe webhook on successful payment
- Chef manual logging of cash, Venmo, PayPal, Zelle, check, or card payments
- Refund entries (via Stripe refund events)
- Tip entries
- Adjustment entries

What reads from the ledger (via `event_financial_summary` database view):

- Event detail pages (outstanding balance, payment status)
- Dashboard hero metrics (revenue this month)
- P&L report
- Food cost percentage
- Profit margin calculations

P&L aggregation formula:

```
event_financial_summary VIEW:
  net_revenue_cents = SUM(ledger_entries.amount_cents) for non-refund entries
  total_refunded_cents = SUM(ledger_entries.amount_cents) for refund entries
  total_expenses_cents = SUM(expenses.amount_cents) for the event
  profit_cents = net_revenue_cents - total_expenses_cents
  food_cost_percentage = total_expenses_cents / net_revenue_cents
  profit_margin = profit_cents / net_revenue_cents
```

---

### 7.5 Inquiry-to-Event Pipeline

Entry points:

1. Embed widget (public website embed, no auth) via POST /api/embed/inquiry
2. Remy chat (client message intent classified as new inquiry)
3. Gmail sync (automated cron, parses emails from partner platforms)
4. Kiosk (on-premises guest check-in tablet)
5. Manual chef entry in dashboard

Embed widget flow:

```
Guest submits form on chef's website
  ↓
POST /api/embed/inquiry with CORS headers
  ↓
Turnstile CAPTCHA verification (Cloudflare)
  ↓
Rate limit check: 10 requests per 5 minutes per IP (Upstash Redis)
  ↓
Honeypot check: website_url field filled = bot, reject silently
  ↓
Validate form fields (Zod schema)
  ↓
Resolve chef from chef_id URL param (tenant)
  ↓
Find or create client (idempotent by email per tenant)
  ↓
Create inquiry with extracted fields
  ↓
[Non-blocking] Create draft event linked to inquiry
[Non-blocking] Create Dinner Circle for client (if first event)
[Non-blocking] Post chef's first automated response in circle
[Non-blocking] Send acknowledgment email to guest
[Non-blocking] Fire automations engine (inquiry_created)
[Non-blocking] Enqueue Remy lead scoring
  ↓
Return { success: true }
```

Gmail sync flow:

```
Cron fires every 4 hours via GET /api/gmail/sync
  ↓
Find all chefs with gmail_connected = true
  ↓
For each chef (independent, one failure does not block others):
  Fetch inbox via Gmail OAuth
  ↓
  Classify email by sender domain:
    (TakeAChef, Yhangry, Thumbtack, Bark, Cozymeal, GigSalad, and others)
  ↓
  Parse with platform-specific parser (structured field extraction)
  ↓
  Idempotency check (inquiry for this platform booking ID already exists: skip)
  ↓
  Find or create client (idempotent by email)
  ↓
  Create inquiry with extracted fields
  ↓
  [Optional] Materialize series events (multi-event bookings from one email)
  ↓
  Update platform record and payout tracking
```

---

### 7.6 Recipe to Menu to Event to Food Cost Chain

Complete data chain:

```
events.menu_id
  → menus.id
    → dishes.menu_id
      → components.dish_id
        → components.recipe_id
          → recipes.id
            → recipe_ingredients.recipe_id
              → recipe_ingredients.ingredient_id
                → ingredients.id
                  → ingredients.last_price_cents
```

What happens when a menu is assigned to an event:

- `menus.event_id` is set to the event UUID
- Food cost calculation can now walk the full chain
- Grocery list generation becomes available for that event

Recipe scaling by guest count:

- Scale factor = guest_count / recipe.yield_quantity
- 4-category scaling model:
  - Bulk (proteins, produce, dairy): linear scale at 1.0x
  - Flavor (spices, herbs, aromatics): scale at 0.75x (flavors do not scale linearly)
  - Structure (flour, eggs, leavening): linear scale at 1.0x
  - Finishing (garnishes, plating sauces): scale at 0.6x

Food cost calculation (deterministic math, no AI):

```
For each component's recipe:
  scaled_qty = ingredient.quantity x (guest_count / recipe.yield_quantity)
  ingredient_cost = scaled_qty x ingredient.last_price_cents
Sum all ingredient costs = estimated_food_cost_cents
Add actual spend from grocery_spend_entries = actual_food_cost_cents
Food cost % = (estimated + actual) / event_financial_summary.net_revenue_cents x 100
```

Benchmarks (hardcoded): under 25% excellent, 25-30% good, 30-35% fair, over 35% high.

Grocery list generation (deterministic, no AI):

```
Walk event → menu → dishes → components → recipes → recipe_ingredients
  ↓
Scale each ingredient quantity by guest_count / recipe.servings
  ↓
Deduplicate by ingredient_id (same ingredient across recipes: add quantities)
  ↓
Group by ingredient category (produce, proteins, dairy, pantry, spices, etc.)
  ↓
Assign store section via lookup table (lib/formulas/grocery-consolidation.ts)
  ↓
Return organized list with estimated costs
```

Sub-recipes: A recipe can include other recipes as components (e.g., Beef Wellington contains Duxelles, Puff Pastry, Madeira Sauce as child recipes). Circular reference prevention enforced via database trigger.

---

### 7.7 Inventory Ledger

Inventory is tracked via an append-only ledger (`inventory_transactions`). Current stock is always derived: `SUM(quantity) GROUP BY ingredient_id`. Nothing is stored as a current-quantity column.

Transaction types: receive, event_deduction, waste, staff_meal, transfer_out, transfer_in, audit_adjustment, return_from_event.

Event deduction flow:

```
Chef previews deduction for event via previewEventDeduction(eventId)
  ↓
Walk recipe chain (event → menu → dishes → components → recipes → ingredients)
  ↓
Scale quantities by guest_count / recipe.servings (sub-recipes walked recursively)
  ↓
Fetch current stock from inventory_current_stock view
  ↓
Calculate shortfalls: needed - on_hand per ingredient
  ↓
Chef confirms → executeEventDeduction()
  ↓
Create inventory_transactions with type='event_deduction', negative quantities, event_id
```

What updates ingredient pricing:

- Receiving goods from a purchase order updates `ingredients.last_price_cents` and `last_price_date`
- Vendor invoice matching updates `ingredients.last_price_cents`
- Updated prices feed into all subsequent food cost calculations

Waste tracking: Waste entries create inventory_transactions with type='waste' and negative quantities. Waste cost tracked in `waste_logs.estimated_cost_cents`. Food cost percentage can incorporate waste amounts.

---

### 7.8 Staff, Labor, and Payroll

Tables: `staff_members` (profiles with hourly_rate_cents), `staff_schedules` (shift assignments with optional event_id), `staff_availability` (recurring and date-specific).

How staff connects to events:

- Shifts have an optional `event_id` foreign key
- Multiple staff can be assigned to one event
- Staff check-in and check-out recorded via `actual_start` and `actual_end` timestamps

Payroll calculation:

```
For each shift in date range:
  actual_hours = actual_end - actual_start
    (falls back to scheduled times if not checked out)
  effective_rate = shift.override_rate OR staff_member.hourly_rate_cents
  shift_earnings = actual_hours x effective_rate
Sum all shifts by staff member = payroll summary
```

Labor costs flow into event expenses when logged, contributing to `total_expenses_cents` in `event_financial_summary`.

---

### 7.9 Contract Lifecycle

5 states: draft, sent, viewed, signed, voided.

Contracts are independent of the event FSM. Both are tied to the same event but operate in parallel. Signing a contract does not trigger an event state transition.

Flow:

```
Chef generates contract from template (merge fields substituted)
  → draft state
  ↓
Chef sends to client via sendContractToClient()
  → sent state; client receives email with signing link
  ↓
Client opens contract → recordClientView()
  → viewed state
  ↓
Client signs → signContract()
  Captures: signature as base64 PNG, signer IP address, signer user agent
  → signed state
  → [Non-blocking] Chef notification and email
  → Database trigger: prevent_signed_contract_mutation() permanently locks body
```

Merge fields substituted from event data: client name, event date, quoted price, deposit amount, cancellation policy, occasion, guest count, event location, dietary restrictions.

Voiding: Any unsigned contract can be voided at any time. Client is notified. Signed contracts cannot be voided or modified.

AI drafting (optional): `lib/ai/contract-generator.ts` uses Ollama (private: client name, event details, pricing) to draft custom contract language. Chef reviews and edits before using.

---

### 7.10 Document Generation

40+ document types generated on demand from event data. Generated at request time as PDF buffers. Optional snapshot archiving to `document_snapshots` table.

What feeds each document type:

| Document            | Primary Data Sources                                                                      |
| ------------------- | ----------------------------------------------------------------------------------------- |
| Quote               | events (pricing, occasion), clients (name, allergies), menus (courses)                    |
| Invoice             | ledger_entries (payment history), events (quote, balance due)                             |
| Contract            | events (date, location, occasion, guest count), clients (name, dietary), quotes (pricing) |
| FOH Menu            | menus (dishes, courses, descriptions), events (occasion, date)                            |
| Prep Sheet          | menus (components, make-ahead flags), events (guest count, schedule)                      |
| Grocery List        | recipe chain with scaled ingredients (see 7.6)                                            |
| Execution Sheet     | events (timeline), staff_schedules (assignments), menus (courses)                         |
| Financial Summary   | event_financial_summary view (revenue, expenses, profit)                                  |
| After Action Review | events, menus, expenses, aars table, temp logs                                            |
| Receipt             | ledger_entries (payments), events (total)                                                 |

Auto-generation on confirmation: When an event transitions from paid to confirmed, the FOH menu PDF and prep sheet are automatically generated and emailed to both client and chef.

PDF pipeline: `lib/documents/generate-*.ts` (40+ files) feeds `lib/documents/pdf-generator.ts` which returns a PDF buffer to the API route, which the browser downloads.

---

### 7.11 Expenses and P&L Aggregation

The `expenses` table is the mutable cost ledger. Unlike `ledger_entries` (immutable revenue), expenses can be edited.

What creates expenses:

- Manual entry by chef (categories: groceries, alcohol, specialty items, gas/mileage, equipment, supplies, other)
- Receipt scanning via OCR.space API parsed but not auto-saved; chef confirms before creating
- Waste log estimated costs
- Vendor invoice amounts when matched to events

Budget guardrail:

```
Budget = quoted_price_cents x (1 - target_margin_percent / 100)
  OR event.food_cost_budget_cents if manually overridden
Current spend = SUM(expenses.amount_cents) for the event
Remaining = Budget - Current spend
Chef sees traffic light: green / yellow / red
```

Full P&L per event returns:

- Revenue: quoted_price_cents, net_revenue_cents from ledger, tip_amount_cents
- Expenses broken down by category (groceries, alcohol, specialty, gas/mileage, other)
- Time invested: shopping + prep + travel + service + reset minutes
- Effective hourly rate: gross_profit / total_hours
- Cost per guest: (estimated + actual food cost) / guest_count
- Cashback estimate: total_expenses x card_cashback_percent
- Food cost percentage and profit margin
- Delta between estimated and actual food cost

---

### 7.12 Client Enrichment Over Time

Client profiles contain 100+ fields across identity, household, dietary preferences, kitchen access, service defaults, personality, and communication style. They are enriched automatically by system events and manually by the chef.

Automatic enrichment triggers:

| Trigger               | What Updates on Client                                          |
| --------------------- | --------------------------------------------------------------- |
| Event completed       | last_event_date, total_event_count, menu history appended       |
| Survey submitted      | dish_feedback, what_they_loved, would_book_again                |
| Review submitted      | rating, feedback_text, what_could_improve                       |
| RSVP submitted        | dietary restrictions and allergies synced to hub_guest_profiles |
| Loyalty point awarded | loyalty_transactions appended, tier recomputed                  |
| Allergy change        | Re-check of upcoming events for safety flags                    |

Computed scores (derived on-demand, never stored as columns):

| Score                  | Formula                                                                                 |
| ---------------------- | --------------------------------------------------------------------------------------- |
| Health score (0-100)   | 30pts recency + 25pts frequency + 25pts monetary + 20pts engagement                     |
| LTV tier               | new / regular (1-3 events) / VIP (4+ events or above median LTV) / champion (3x median) |
| Churn risk             | at_risk if 90-180 days dormant; dormant if over 365 days since last event               |
| Lead score (inquiries) | 0-100 from budget, guest count, lead time, channel, recency, holiday proximity          |

Unified timeline on the client detail page: Events, messages, notes, loyalty transactions, inquiries, and reviews merged into one chronological feed. Chef sees the full relationship history in one view.

---

### 7.13 CRM and Lead Pipeline

Lead scoring at inquiry creation:

```
Base: 50 points
Budget over $2,000: +20 | Budget over $1,000: +10
Guest count over 20: +10 | 6 or more: +5
Lead time over 30 days: +10 | Under 7 days: -10
Channel: repeat client +20 | referral +15
Inquiry under 24 hours old: +5
Holiday proximity: 0-20 (near Thanksgiving, Christmas, etc.)

70-100: Hot (contact same day)
45-69: Warm (follow up within 24 hours)
0-44: Cold (nurture)
```

Prospecting pipeline (admin-only):

```
Admin finds or imports prospect
  ↓
Research and outreach tracked in prospect notes and outreach log
  ↓
Stage progression: cold → warm → contacted → qualified → deal → won/lost
  ↓
Won: creates inquiry with channel='prospecting', prospect marked won
  ↓
Inquiry enters standard pipeline (lead scoring, automation, event creation)
```

---

### 7.14 Campaign and Outreach

Two AI backends with a hard privacy boundary:

```
Chef creates campaign (occasion, date, price, guest limit, menu name)
  ↓
draftCampaignConcept() → GEMINI (cloud, no PII)
  Input: occasion, date, price, max guests, menu name
  Output: public dinner copy (hook, description, CTA)
  Stored in: marketing_campaigns.concept_description
  ↓
Chef adds recipients (selects from client list)
  ↓
generateAllDrafts() → OLLAMA (local, private)
  Input per client: name, dietary prefs, allergies, favorite cuisines, vibe notes, event history
  Output: personalized email subject and body
  Stored in: campaign_recipients.draft_subject, draft_body
  Throws OllamaOfflineError if Ollama offline (never falls back to Gemini)
  ↓
Chef reviews every draft individually
  ↓
Chef approves and sends
  Tracking: sent_at, opened_at, clicked_at on campaign_recipients
```

Chef must approve every outgoing email. AI never auto-sends.

---

### 7.15 Loyalty and Rewards

Earn modes (chef configures one):

- per_guest: points = guest_count per completed event
- per_dollar: points = total_revenue_cents / 100
- per_event: fixed points per event regardless of size

Tier computation (automatic from cumulative point total): Bronze, Silver, Gold, Platinum. Thresholds configured by chef.

Reward types (service-only, no cash transfers): discount_fixed (dollar amount off), discount_percent (percentage off), free_course (complimentary course at next event), free_dinner (complimentary full private dinner), upgrade (menu upgrade or special service).

Redemption flow:

```
Client requests redemption via client portal
  ↓
Pending redemption created in loyalty_reward_redemptions
  ↓
Chef sees pending delivery on /loyalty dashboard
  ↓
Chef delivers service at next event
  ↓
Chef marks as delivered (links to event_id, adds delivery note)
```

Auto-award (no chef approval needed): Welcome points awarded once when client first accepts an invitation. Guarded by `clients.has_received_welcome_points` flag (idempotent, fires exactly once per client).

---

### 7.16 Automations Engine

Trigger events:

- inquiry_created, inquiry_status_changed
- wix_submission_received
- event_status_changed
- follow_up_overdue, no_response_timeout (90 days since last contact)
- quote_expiring
- event_approaching (48 hours before event date)
- payment_due_approaching, payment_overdue

Action types (always creates a task or draft, never auto-executes on behalf of chef):

- create_notification: sends chef an in-app alert
- create_follow_up_task: sets follow_up_due_at on inquiry
- send_template_message: creates a DRAFT message for chef to review and send
- create_internal_note: logs an auto-generated note on the record

Cooldown deduplication: Each rule fires at most once per entity per time window (12-24 hours depending on rule type). Checked against `automation_executions` table.

Execution logging: Every evaluation logged with result (success / failed / skipped), action type, and error message if failed.

---

### 7.17 Notification System

80+ notification types across 18 categories (inquiry, quote, event, payment, chat, client, loyalty, goals, lead, protection, wellbeing, review, ops, system, and others).

5 delivery channels:

1. In-app (PostgreSQL real-time subscription, instant)
2. Email (Resend API, HTML templates)
3. Push (OneSignal, web and mobile)
4. SMS (Twilio, opt-in, rate-limited per category)
5. Desktop (browser notification API)

Delivery pipeline:

```
createNotification(type, recipientId, data)
  ↓
Resolve notification preferences (per chef, per category, per channel)
  ↓
Check off-hours setting (suppress outside business hours if configured)
  ↓
Route to all enabled channels in parallel:
  Email: route-email.ts → Resend API
  Push: resolve push_subscriptions → OneSignal API
  SMS: rate limit check → Twilio REST API
  In-app: insert to notifications table → PostgreSQL real-time
  ↓
Log every delivery attempt to notification_delivery_log
  (status: sent / failed / skipped, error message if failed)
```

Non-blocking: If any channel fails, the others continue. Failures are logged but never propagate to the calling operation.

Toast behavior: Each notification type has a `toastByDefault` flag. Time-sensitive types (new inquiry, payment received) show an immediate toast. Informational types go to inbox only.

---

### 7.18 AI System Routing

Two backends with a hard privacy boundary. Crossing it is a bug.

| Backend | Where it Runs          | Privacy                                | Use Cases                                                                                                                         |
| ------- | ---------------------- | -------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Ollama  | Local LLM on chef's PC | Private: data never leaves the machine | Client PII, financials, allergies, event details, recipes, personalized campaigns, contracts, AAR generation, chef bio, Remy chat |
| Gemini  | Google cloud API       | Non-private only (no PII allowed)      | Generic marketing copy, technique lists, kitchen specs, public-facing content, review request drafts                              |

Ollama failure behavior: Throws `OllamaOfflineError`. Never falls back to Gemini. Chef sees "Start Ollama to use this feature." Private data does not go anywhere.

AI dispatch layer (`lib/ai/dispatch/`): classifier, privacy gate, routing table, router, cost tracker. Routes each request based on data classification before the LLM call is made.

All AI output is draft-only. Chef reviews and approves before anything becomes canonical. AI never owns state, never auto-sends, never transitions the event FSM.

Permanent AI restrictions (enforced in restricted-actions.ts and remy-input-validation.ts):

- Recipe generation is banned under all circumstances
- agent.create_recipe, agent.update_recipe, and agent.add_ingredient are permanently blocked
- All AI-generated messaging creates drafts only; chef must send manually

---

### 7.19 Background Jobs

All cron jobs are authenticated via CRON_SECRET bearer token. Tenant iterations run independently: one chef's failure does not block others.

| Job                | Schedule         | What It Does                                                          |
| ------------------ | ---------------- | --------------------------------------------------------------------- |
| morning-briefing   | 7 AM ET daily    | Generates deterministic daily brief per tenant, stored as remy_alert  |
| daily-report       | 7 AM ET daily    | Daily performance digest for chef                                     |
| follow-ups         | Hourly           | Checks follow_up_due_at on inquiries, creates tasks for overdue items |
| lifecycle          | Daily            | Event lifecycle transitions and stale record checks                   |
| campaigns          | Hourly           | Processes queued campaign email sends                                 |
| cron-monitor       | Hourly           | Watches for cron jobs that have not fired, alerts on failure          |
| loyalty-expiry     | Daily            | Expires loyalty points past their expiry date                         |
| social-publish     | Every 5 minutes  | Publishes queued social posts whose schedule_at timestamp has passed  |
| waitlist-sweep     | 8 AM UTC daily   | Processes waitlist entries, notifies newly available clients          |
| rsvp-reminders     | Daily            | Sends RSVP reminders to pending event guests                          |
| wellbeing-signals  | Weekly           | Checks for burnout risk and capacity overload signals                 |
| revenue-goals      | Weekly           | Computes progress toward chef's configured revenue targets            |
| automations        | Every 15 minutes | Evaluates all active automation rules against current system state    |
| activity-cleanup   | Daily            | Purges old activity log entries past retention window                 |
| call-reminders     | Hourly           | Notifies chefs of upcoming scheduled calls                            |
| copilot            | Daily            | AI-powered business insights generated via Ollama                     |
| email-history-scan | Every 4 hours    | Gmail sync (full description in 7.5)                                  |
| integrations-pull  | Periodic         | Pulls data from connected external integrations                       |
| integrations-retry | Periodic         | Retries failed integration operations                                 |
| push-cleanup       | Daily            | Removes deactivated push subscriptions                                |
| raffle-draw        | Configurable     | Conducts waitlist raffle draws                                        |
| reviews-sync       | Daily            | Syncs external reviews from Google and Yelp                           |
| sequences          | Daily            | Processes multi-step drip email sequences                             |
| simulation         | Daily            | Updates platform simulation and demo data                             |
| wix-process        | Periodic         | Processes pending Wix form submissions                                |

---

### 7.20 Community Hub and Dinner Circle

Hub guest profiles are auto-created when a guest RSVPs to a chef's event. They are independent of chef accounts. Access is token-based with no password required.

RSVP to hub flow:

```
Guest RSVPs to event via client portal
  ↓
syncRSVPToHubProfile() called
  ↓
Find or create hub_guest_profiles (idempotent by email)
  ↓
Update dietary restrictions and allergies on profile
  ↓
Create hub_guest_event_history record (chef name, occasion, date)
  ↓
Auto-join guest to hub_group for that event (if group exists)
```

Hub access (no auth required): Guests access their profile via `/hub/me/[profileToken]` and their event circles via `/hub/g/[groupToken]`. Token-based URLs, no password.

What the hub contains: Group posts and messages, shared media (photos and videos), event notes and updates from chef, guest availability, and event details. Moderated by admin at the platform level.

Hub and social connection: When an event is completed and the chef creates a social post from it, that post can be shared into the hub circle for the event's guests.

---

### 7.21 Social Media Pipeline

Post lifecycle: idea, draft, approved, queued, published, archived.

Event-to-social flow:

```
Chef completes event
  ↓
Chef clicks "Create Social Post" on the event page
  ↓
Caption generation: parseWithOllama() using event context
  (client name, occasion, date, menu, cuisine - local AI, stays private)
  Falls back to static template if Ollama offline
  ↓
Chef edits caption, selects media from vault or uploads new
  ↓
Post saved with event_id link, status = draft
  ↓
Chef approves → status = approved
  ↓
Chef sets scheduled date and time → status = queued
  ↓
social-publish cron (every 5 minutes) checks for queued posts
  with schedule_at timestamp in the past
  ↓
Post published to selected platforms:
  Instagram, Facebook, TikTok, LinkedIn, X, Pinterest, YouTube Shorts
  published_to_platforms[] updated, last_publish_at recorded
  ↓
Status = published
```

Annual content calendar: Chef configures posts per week, posting days, and times. System auto-generates target slots across the year. Each slot gets a week number, slot number, and scheduled timestamp.

Media vault: Reusable photos and videos stored in the database storage bucket (`social-media-vault`). Assets can be used across multiple posts. Usage counts tracked per asset. Supports JPEG, PNG, WebP, HEIC, HEIF, MP4, MOV, WebM up to 100MB per file.

---

### 7.22 Analytics Architecture

9 dashboard tabs pulling from 23 data sources simultaneously via `Promise.allSettled()`.

| Tab        | Key Metrics                                                              | Data Sources                                      |
| ---------- | ------------------------------------------------------------------------ | ------------------------------------------------- |
| Overview   | Month revenue, event counts, source distribution                         | getMonthOverMonthRevenue, getDashboardEventCounts |
| Client     | Retention, churn, concentration, acquisition, NPS                        | 6 queries from client-analytics.ts                |
| Pipeline   | Inquiry funnel, quote acceptance, ghost rate, lead time, decline reasons | 7 queries from pipeline-analytics.ts              |
| Revenue    | Per unit, by day/type/season, labor cost, capacity, break-even           | 8 queries from revenue-analytics.ts               |
| Operations | Compliance, time phases, waste, culinary ops                             | 4 queries from operations-analytics.ts            |
| Marketing  | Email stats, spend by channel, reviews, website metrics                  | 4 queries from marketing-analytics.ts             |
| Social     | Platform connections, Instagram growth trend, Google reviews             | 3 queries from social-analytics.ts                |
| Culinary   | Recipe usage, dish performance, menu approvals                           | 3 queries from culinary-analytics.ts              |

Pattern: Each analytics function returns its data structure or null on failure. `Promise.allSettled` ensures one failed query does not crash the page. Failed panels show an error state, never zeros or fabricated data.

After Action Reports (AAR): Generated by Ollama using event data (occasion, guest count, service style, dietary restrictions), the full menu, all expenses by category, chef notes, client feedback, and temperature logs. Output is a draft with seven sections: executive summary, what went well, what could improve, key learnings, client experience notes, financial reflection, and next-time list. Chef reviews and edits before finalizing.

---

### 7.23 Public Directory and Discovery

Approval gate: Chef must have `chefs.directory_approved = true` (set by platform admin) and `chef_preferences.network_discoverable = true` (set by chef) to appear in the public directory. Both conditions must be true.

Discovery profile fields: cuisine types, service types, price range, guest count range, service area with radius, average rating, review count, accepting_inquiries flag, next available date, lead time in days.

JSON-LD structured data: Public chef profile pages emit AggregateRating schema for Google search rich snippets.

Discovery to booking flow:

```
Consumer searches /chefs with filters (cuisine, location, price range, service type)
  ↓
Directory returns approved chefs with discovery profiles and ratings
  ↓
Consumer clicks chef → /chef/[slug]
  ↓
Profile shows bio, partner venues, reviews, availability signals
  ↓
Consumer clicks Book → embed widget or inquiry form
  ↓
Inquiry created via POST /api/embed/inquiry (see 7.5)
  ↓
Chef sees new inquiry in dashboard with lead score
```

---

### 7.24 Embed Widget

Deployment: Chef copies a script tag to any website. The script renders an iframe pointing to `/embed/inquiry/[chefId]`.

Security layers:

- Turnstile CAPTCHA (Cloudflare bot protection)
- Rate limiting: 10 submissions per 5 minutes per IP via Upstash Redis
- Honeypot: hidden `website_url` field (bots fill it, humans do not)
- CORS: `Access-Control-Allow-Origin: *` (intentionally open for embedding)

Theming: Supports light/dark mode and custom accent color via URL query params. Uses inline styles only (no Tailwind) for iframe isolation from the host site.

Attribution: UTM params (utm_source, utm_medium, utm_campaign) captured on each submission and stored with the inquiry for marketing analytics.

Tenant resolution: Chef UUID in the URL path resolves to the correct tenant. All data created belongs to that chef's tenant.

---

### 7.25 Kiosk System

Pairing: Device generates a token, chef pairs it via /settings/kiosk. Token stored in device localStorage.

On each load:

```
Check localStorage for kiosk token
  ↓
POST /api/kiosk/status with token → returns device config
  ↓
If require_staff_pin = true: show PIN entry screen
  ↓
Staff enters PIN → POST /api/kiosk/verify-pin → creates staff session with timestamps
  ↓
Show work view: inquiry form (guest check-in) or order mode (POS register)
  ↓
Idle timeout (default ~90 seconds with no interaction):
  Log session end
  Clear staff session
  Reset to PIN entry screen
```

Modes:

- Inquiry mode: Guest fills name, email, allergies, notes → creates inquiry in chef's system via /api/kiosk/inquiry
- Order mode: Browse product catalog → select items → POST /api/kiosk/checkout

Heartbeat: Device sends periodic heartbeat to /api/kiosk/heartbeat. Updates last_seen_at on device record. Used to detect offline kiosks.

API routes: /api/kiosk/status, /api/kiosk/pair, /api/kiosk/verify-pin, /api/kiosk/inquiry, /api/kiosk/order/catalog, /api/kiosk/order/checkout, /api/kiosk/heartbeat, /api/kiosk/end-session.

---

### 7.26 Partner and Referral Attribution

Attribution model: Inquiries and events have `referral_partner_id` and `partner_location_id` columns. Set at inquiry creation (embed widget, Gmail sync, manual entry by chef).

Analytics derivation:

```
Partner leaderboard per partner:
  inquiry_count = COUNT(inquiries WHERE referral_partner_id = partner.id)
  event_count = COUNT(events WHERE referral_partner_id = partner.id)
  completed_count = COUNT(events WHERE referral_partner_id AND status = 'completed')
  revenue_cents = SUM(ledger_entries) for those completed events
  conversion_rate = completed_count / inquiry_count
```

Commission: Tracked via `referral_partners.commission_notes` text field only. No automated calculation or payment processing. Chef manages commission arrangements manually.

Public showcase: Partners with `is_showcase_visible = true` appear on the chef's public profile page with seasonal photos and booking links. Seasonal photo tags (spring, summer, fall, winter) support year-round presentation.

---

### 7.27 Multi-Tenant Isolation

Defense in depth: Two independent layers both enforce tenant scoping.

Layer 1 - Database RLS (Row-Level Security):

- Enabled on all tenant-scoped tables
- Policies ensure chefs see only their own data and clients see only their own records
- Service role (admin client) used only in webhooks and cron jobs; those operations are still tenant-scoped in application code

Layer 2 - Server actions:

- Every exported server action starts with `requireChef()`, `requireClient()`, or `requireAdmin()`
- Every database query includes `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.tenantId!)`
- `tenant_id` is always derived from the authenticated session, never from the request body or URL params
- Webhooks: `tenant_id` extracted from the database object being processed (e.g., Stripe payment: from event metadata)

Cascade on chef deletion: All tenant data (clients, events, recipes, menus, ingredients, and all related tables) cascades on `chefs.id` deletion. No orphaned data possible.

---

### 7.28 Cannabis Compliance Module

Gating: Admin-only tier enforced at the page level (`requireAdmin()`), nav level (`adminOnly: true`), and dashboard level (`isAdmin()` gate). Non-admin chefs never see this module in any surface.

Control packet (per-event compliance document):

- Immutable after creation via `prevent_control_packet_mutation` database trigger
- Contains: guest participation records, mg dosage per guest, batch assignments
- Template system allows reusable compliance frameworks across events

Compliance snapshot:

- Photo evidence uploaded per event
- Each snapshot is version-stamped and locked on creation
- Retroactive editing is blocked at the database level

Cannabis ledger: Append-only transaction log for all cannabis inventory movements. Never deleted, never modified. Same architectural pattern as the financial ledger.

Batch reconciliation: Tracks the full chain from cannabis batch to event to individual guest to dosage. Provides a complete audit trail for compliance inspections.

---

### 7.29 Non-Blocking Side Effect Pattern

Every system in ChefFlow that triggers secondary actions (email, SMS, push notification, webhook, loyalty award, automation, calendar sync, activity log) uses the same pattern:

```typescript
try {
  await sideEffect(...)
} catch (err) {
  console.error('[non-blocking] Side effect failed', err)
  // Main operation continues regardless
}
```

This means: if an email fails to send, the event still transitions. If a push notification fails, the ledger entry still appends. If a calendar sync fails, the contract still gets signed. The main operation always completes. Side effects are logged but never block.

Failures are surfaced to the admin platform via the Silent Failures Monitor, which aggregates non-blocking failures by severity and source.

---

### 7.30 Idempotency Patterns

ChefFlow uses idempotency guards throughout to prevent duplicate operations from repeat webhook deliveries, network retries, or concurrent requests.

| Operation                   | Idempotency Guard                                                   |
| --------------------------- | ------------------------------------------------------------------- |
| Stripe payment ledger entry | transaction_reference = Stripe event ID (unique constraint)         |
| Welcome loyalty points      | clients.has_received_welcome_points boolean flag                    |
| Gmail inquiry import        | platform booking ID checked before creating inquiry                 |
| Contract generation         | Previous drafts voided before new draft created                     |
| Automation execution        | automation_executions table checked for recent fire per rule+entity |
| Embed inquiry submission    | Rate limiting per IP + client find-or-create by email               |
| Event deduction preview     | Preview only; execute is a separate confirmed action                |
| Depreciation schedule       | Delete and re-insert (full regeneration, no partial update)         |

## Part 8: Admin Portal

The admin portal (`/admin/*`) is accessible only to users with the admin role. It gives platform operators visibility into all tenants, all users, and all system health.

### 8.1 Admin Features

| #   | Feature             | Route                       | Description                                 |
| --- | ------------------- | --------------------------- | ------------------------------------------- |
| 1   | Admin Home          | `/admin`                    | Platform overview dashboard                 |
| 2   | Analytics           | `/admin/analytics`          | Cross-tenant platform analytics             |
| 3   | Audit Log           | `/admin/audit`              | Full audit trail of platform events         |
| 4   | Beta Management     | `/admin/beta`               | Manage beta access and invites              |
| 5   | Beta Onboarding     | `/admin/beta/onboarding`    | Beta user onboarding flow management        |
| 6   | Beta Surveys        | `/admin/beta-surveys`       | View and manage beta survey responses       |
| 7   | Beta Survey Detail  | `/admin/beta-surveys/[id]`  | Individual survey response detail           |
| 8   | Cannabis Admin      | `/admin/cannabis`           | Platform-wide cannabis compliance oversight |
| 9   | Clients Admin       | `/admin/clients`            | Cross-tenant client management              |
| 10  | Command Center      | `/admin/command-center`     | Platform-wide control panel                 |
| 11  | Communications      | `/admin/communications`     | Platform communication management           |
| 12  | Conversations       | `/admin/conversations`      | Cross-tenant conversation monitoring        |
| 13  | Conversation Detail | `/admin/conversations/[id]` | Individual conversation thread              |
| 14  | Directory           | `/admin/directory`          | Platform directory management               |
| 15  | Directory Listings  | `/admin/directory-listings` | Manage public directory listings            |
| 16  | Events Admin        | `/admin/events`             | Cross-tenant event oversight                |
| 17  | Feature Flags       | `/admin/flags`              | Feature flag management                     |
| 18  | Feedback            | `/admin/feedback`           | Platform-wide user feedback                 |
| 19  | Financials Admin    | `/admin/financials`         | Cross-tenant financial overview             |
| 20  | Hub Admin           | `/admin/hub`                | Community hub management                    |
| 21  | Hub Group Detail    | `/admin/hub/groups/[id]`    | Individual community group management       |
| 22  | Notifications Admin | `/admin/notifications`      | Platform notification management            |
| 23  | Presence Monitor    | `/admin/presence`           | Real-time user presence monitoring          |
| 24  | Reconciliation      | `/admin/reconciliation`     | Cross-tenant payment reconciliation         |
| 25  | Referral Partners   | `/admin/referral-partners`  | Referral partner management                 |
| 26  | Silent Failures     | `/admin/silent-failures`    | Monitor non-blocking side effect failures   |
| 27  | Social Admin        | `/admin/social`             | Cross-tenant social media oversight         |
| 28  | System Health       | `/admin/system`             | Platform system health monitoring           |
| 29  | System Payments     | `/admin/system/payments`    | Platform-level payment monitoring           |
| 30  | Users               | `/admin/users`              | All chef accounts management                |
| 31  | User Detail         | `/admin/users/[chefId]`     | Individual chef account detail              |

---

## Part 9: Staff Portal

The staff portal (`/staff-dashboard`, `/staff-*`) is a separate authenticated surface for kitchen and event staff. Staff log in via `/staff-login` and see only their assigned work.

### 9.1 Staff Features

| #   | Feature         | Route              | Description                                         |
| --- | --------------- | ------------------ | --------------------------------------------------- |
| 1   | Staff Dashboard | `/staff-dashboard` | Overview of today's assignments and active events   |
| 2   | Staff Recipes   | `/staff-recipes`   | Read-only recipe access for assigned events         |
| 3   | Staff Schedule  | `/staff-schedule`  | Personal schedule view for upcoming shifts          |
| 4   | Staff Station   | `/staff-station`   | Station assignment and clipboard for active service |
| 5   | Staff Tasks     | `/staff-tasks`     | Assigned task list with completion tracking         |
| 6   | Staff Time      | `/staff-time`      | Clock in/out and time tracking                      |

---

## Part 10: Partner Portal

The partner portal (`/partner/*`) is for referral partners and venue operators who refer clients to chefs on the platform.

### 10.1 Partner Features

| #   | Feature                 | Route                     | Description                                           |
| --- | ----------------------- | ------------------------- | ----------------------------------------------------- |
| 1   | Partner Dashboard       | `/partner/dashboard`      | Overview of referrals, events generated, and earnings |
| 2   | Partner Events          | `/partner/events`         | Events generated from partner referrals               |
| 3   | Partner Locations       | `/partner/locations`      | Manage venue/location listings                        |
| 4   | Partner Location Detail | `/partner/locations/[id]` | Individual location management                        |
| 5   | Partner Preview         | `/partner/preview`        | Preview how their partner profile appears publicly    |
| 6   | Partner Profile         | `/partner/profile`        | Manage partner profile and contact info               |

---

## Part 11: Backend Infrastructure

This section documents every backend system that powers ChefFlow. The 187+ user-facing features described in Parts 4-10 run on top of this infrastructure layer.

### 11.1 API Routes

ChefFlow exposes the following categories of API endpoints (all under `/api/*`):

**Activity**

- `GET /api/activity/breadcrumbs` - navigation breadcrumb tracking
- `POST /api/activity/feed` - activity feed retrieval
- `POST /api/activity/track` - track user activity events

**AI / Ollama**

- `GET /api/ai/health` - Ollama health check
- `GET /api/ai/monitor` - AI usage monitoring
- `POST /api/ai/wake` - wake Ollama from idle
- `GET /api/ollama-status` - Ollama running status

**Authentication**

- `GET /api/auth/google/connect/callback` - Google OAuth callback

**Calendar**

- `GET/PUT/DELETE /api/calendar/event/[id]` - calendar event CRUD
- `GET /api/feeds/calendar/[token]` - iCal feed for external calendar sync

**Cannabis**

- `GET /api/cannabis/rsvps/[eventId]/summary` - RSVP summary for cannabis events

**Client Preferences**

- `GET/POST /api/clients/preferences` - client preference management

**Communications**

- `POST /api/comms/sms` - send SMS via Twilio

**Documents (PDF generation)**

- `GET /api/documents/commerce-receipt/[saleId]` - commerce receipt PDF
- `GET /api/documents/commerce-shift-report/[sessionId]` - shift report PDF
- `GET /api/documents/contract/[contractId]` - contract PDF
- `GET /api/documents/financial-summary/[eventId]` - financial summary PDF
- `GET /api/documents/foh-menu/[eventId]` - front-of-house menu PDF
- `GET /api/documents/foh-preview/[menuId]` - menu preview PDF
- `GET /api/documents/invoice/[eventId]` - invoice HTML
- `GET /api/documents/invoice-pdf/[eventId]` - invoice PDF
- `GET /api/documents/quote/[quoteId]` - quote PDF
- `GET /api/documents/quote-client/[quoteId]` - client-facing quote PDF
- `GET /api/documents/receipt/[eventId]` - event receipt PDF
- `GET /api/documents/snapshots/export` - export document snapshots
- `GET /api/documents/snapshots/[id]` - individual snapshot
- `GET /api/documents/templates/[template]` - document template retrieval
- `POST /api/documents/[eventId]/bulk-generate` - bulk document generation
- `GET /api/documents/[eventId]` - event documents list

**Embed**

- `POST /api/embed/inquiry` - receive inquiry from embedded widget

**Health Checks**

- `GET /api/health` - basic health check
- `GET /api/health/ping` - ping endpoint
- `GET /api/health/readiness` - readiness probe
- `GET /api/system/health` - system health detail
- `POST /api/system/heal` - trigger system self-heal

**Inngest (background job runner)**

- `POST /api/inngest` - Inngest event receiver

**Integrations**

- `POST /api/integrations/connect` - initiate provider connection
- `GET /api/integrations/docusign/callback` - DocuSign OAuth callback
- `GET /api/integrations/quickbooks/callback` - QuickBooks OAuth callback
- `GET /api/integrations/social/callback/[platform]` - social OAuth callback
- `DELETE /api/integrations/social/disconnect/[platform]` - disconnect social account
- `GET /api/integrations/square/callback` - Square OAuth callback
- `GET /api/integrations/[provider]/callback` - generic provider OAuth callback
- `POST /api/integrations/[provider]/connect` - generic provider connect

**Kiosk**

- `POST /api/kiosk/end-session` - end kiosk session
- `POST /api/kiosk/heartbeat` - kiosk keepalive
- `POST /api/kiosk/inquiry` - kiosk inquiry submission
- `GET /api/kiosk/order/catalog` - product catalog for kiosk
- `POST /api/kiosk/order/checkout` - process kiosk checkout
- `GET /api/kiosk/order/drawer` - cash drawer management
- `POST /api/kiosk/pair` - pair kiosk device
- `GET /api/kiosk/status` - kiosk session status
- `POST /api/kiosk/verify-pin` - PIN verification for kiosk

**Menus**

- `POST /api/menus/upload` - upload menu document

**Monitoring**

- `POST /api/monitoring/report-error` - client-side error reporting

**Notifications**

- `POST /api/notifications/send` - send notification

**Prospecting (admin only)**

- `GET /api/prospecting/by-email` - look up prospect by email
- `GET/POST /api/prospecting/queue` - prospecting queue management
- `POST /api/prospecting/[id]/draft-email` - draft outreach email
- `POST /api/prospecting/[id]/enrich` - enrich prospect data

**Push Notifications**

- `POST /api/push/subscribe` - subscribe to push notifications
- `POST /api/push/unsubscribe` - unsubscribe from push
- `POST /api/push/resubscribe` - resubscribe to push
- `GET /api/push/vapid-public-key` - retrieve VAPID public key

**Quality of Life**

- `GET /api/qol/metrics` - QoL metrics endpoint

**Remy AI**

- `POST /api/remy/landing` - Remy on landing page
- `POST /api/remy/public` - Remy public endpoint
- `POST /api/remy/warmup` - warm up Remy/Ollama

**Reports**

- `POST /api/reports/financial` - financial report generation

**Scheduling**

- `GET /api/scheduling/availability` - check chef availability

**Social**

- `GET /api/social/google/connect` - connect Google account
- `POST /api/social/google/sync` - sync Google data
- `POST /api/social/instagram/connect` - connect Instagram

**Stripe**

- `GET /api/stripe/connect/callback` - Stripe Connect OAuth callback

**Webhooks**

- `POST /api/webhooks/docusign` - DocuSign webhook receiver
- `POST /api/webhooks/resend` - Resend email webhook receiver
- `POST /api/webhooks/twilio` - Twilio SMS webhook receiver
- `POST /api/webhooks/[provider]` - generic provider webhook receiver

**Demo**

- `GET /api/demo/data` - demo data retrieval
- `POST /api/demo/switch` - switch demo mode on/off
- `GET /api/demo/tier` - demo tier info

**v1 Public API**

- `GET /api/v1/clients` - public API: client list
- `GET /api/v1/events` - public API: event list

**Scheduled (cron-triggered)**

- `POST /api/scheduled/activity-cleanup` - clean up old activity records
- `POST /api/scheduled/copilot` - copilot scheduled check-in
- `POST /api/scheduled/daily-report` - generate and send daily briefing
- `POST /api/scheduled/integrations/pull` - pull data from connected integrations
- `POST /api/scheduled/integrations/retry` - retry failed integration syncs
- `POST /api/scheduled/revenue-goals` - check revenue goal progress
- `POST /api/scheduled/reviews-sync` - sync reviews from external platforms
- `POST /api/scheduled/rsvp-reminders` - send RSVP reminder notifications
- `POST /api/scheduled/rsvp-retention` - RSVP retention follow-ups
- `POST /api/scheduled/simulation/check` - simulation health check
- `POST /api/scheduled/wellbeing-signals` - process wellbeing signals
- `POST /api/cron/account-purge` - purge deleted accounts
- `POST /api/cron/brand-monitor` - brand mention monitoring run
- `POST /api/cron/cooling-alert` - temperature/cooling alert check
- `POST /api/cron/momentum-snapshot` - capture momentum metrics snapshot
- `POST /api/cron/quarterly-checkin` - quarterly check-in trigger
- `POST /api/cron/renewal-reminders` - contract/subscription renewal reminders

---

### 11.2 Database Layer

**Platform:** PostgreSQL PostgreSQL (remote hosted, no local Docker)
**Project ID:** `luefkpakzvxcsqroxyhz`

**Schema Layers:**

| Layer   | File                                                  | Contents                                            |
| ------- | ----------------------------------------------------- | --------------------------------------------------- |
| Layer 1 | `20260215000001_layer_1_foundation.sql`               | Core tables: chefs, clients, user_roles, tenants    |
| Layer 2 | `20260215000002_layer_2_inquiry_messaging.sql`        | Inquiries, conversations, messages, notifications   |
| Layer 3 | `20260215000003_layer_3_events_quotes_financials.sql` | Events, quotes, ledger_entries, payments, contracts |
| Layer 4 | `20260215000004_layer_4_menus_recipes_costing.sql`    | Menus, recipes, ingredients, food costing           |

**Row Level Security:** Enabled on every table. Every query is scoped to the authenticated tenant.

**Key Database Views:**

- `event_financial_summary` - per-event P and L derived from ledger entries
- `getTenantFinancialSummary` - overall tenant financials derived from ledger

**Immutable Tables (write-once, triggers block updates/deletes):**

- `ledger_entries` - financial ledger, append-only
- `event_transitions` - event FSM state history
- `quote_state_transitions` - quote lifecycle history

**Column naming convention:**

- Core tables (Layers 1-4): use `tenant_id` referencing `chefs(id)`
- Feature tables (Layer 5+): use `chef_id` referencing `chefs(id)`
- Do not rename existing columns

---

### 11.3 Authentication System

**Provider:** Auth.js (JWT sessions)

**Role system** via `user_roles` table:

- `chef` - full platform access for the authenticated tenant
- `client` - client portal access, scoped to their own events
- `staff` - staff portal access, scoped to assigned events
- `partner` - partner portal access, scoped to their referrals
- `admin` - platform administration, cross-tenant access

**Key fields:** `entity_id` (not `client_id`), `auth_user_id` (not `user_id`)

**Token-based public access:** Many public pages accept a signed token in the URL instead of a session. This allows external parties (guests, clients without accounts, partners) to access specific pages without creating an account. Examples: proposals, worksheets, guest cards, review links, tip pages, feedback forms.

**Auth enforcement functions:**

- `requireChef()` - chef session required
- `requireClient()` - client session required
- `requireAdmin()` - admin session required
- `requireAuth()` - any authenticated session

---

### 11.4 Multi-Tenant Isolation

Defense in depth across three layers:

1. **Row Level Security (RLS):** PostgreSQL enforces tenant scoping at the database level. Even if application code has a bug, RLS blocks cross-tenant data access.

2. **Server action scoping:** Every server action derives `tenant_id` from the authenticated session (never from request body). Every DB query includes `.eq('tenant_id', user.tenantId!)` or `.eq('chef_id', user.entityId)`.

3. **Route protection:** Every chef route starts with `requireChef()`. Every admin route starts with `requireAdmin()`. Public routes that accept tokens validate the token cryptographically before serving data.

---

### 11.5 Financial Architecture

**Model:** Ledger-first, immutable, append-only.

All monetary amounts are stored in cents (minor units, integers). No floating point.

Balances, profit, payment status, and food cost percentages are never stored directly. They are always computed from `ledger_entries` via database views.

**Ledger entry types:**

- Revenue entries: deposits, balances, tips, refunds
- Expense entries: food cost, labor, equipment, travel, marketing
- Adjustment entries: manual corrections, write-offs

**Stripe integration:**

- Each chef has a Stripe Connect account (`/settings/stripe-connect`)
- Stripe webhooks (`/api/webhooks/stripe`) confirm payments and create ledger entries
- Idempotency: Stripe event ID used as `transaction_reference` (unique constraint prevents duplicate entries)
- Supports: deposits, installment plans, full balance, split billing, refunds, disputes, payouts

---

### 11.6 AI Architecture

Two backends with a hard privacy boundary:

**Ollama (local, private data):**

- Runs on `localhost:11434` on the developer's PC
- Handles all private data: client PII, financials, allergies, messages, recipes, contracts
- Throws `OllamaOfflineError` if not running. Never falls back to Gemini.
- Used by: Remy, contract generation, campaign personalization, recipe parsing, AAR generation, grocery consolidation, equipment depreciation, chef bio, brain dump parsing, contingency planning

**Gemini (cloud, non-PII only):**

- Google cloud API
- Handles only generic, non-private tasks: technique lists, kitchen specs, generic campaign themes
- Private data (client names, financials, allergies) must never reach this backend

**AI dispatch layer** (`lib/ai/dispatch/`):

- Classifier: determines intent from natural language input
- Privacy gate: blocks private data from routing to cloud backends
- Routing table: maps intent to the correct backend and function
- Cost tracker: monitors Gemini API usage and cost

**Recipe generation restriction:** AI (any backend) is permanently blocked from creating, generating, or suggesting recipes. Recipes are entered manually by chefs only. `agent.create_recipe`, `agent.update_recipe`, and `agent.add_ingredient` are permanently restricted in `lib/ai/agent-actions/restricted-actions.ts`.

---

### 11.7 Notification System

**5 delivery channels:**

1. Email via Resend (`transactional`)
2. SMS via Twilio
3. Web push via OneSignal
4. In-app notification inbox (`/notifications`)
5. Webhook (outbound to chef-configured endpoints)

**80+ notification event types** covering the full event lifecycle, payment milestones, inquiry activity, staff assignments, loyalty events, marketing performance, system health, and cannabis compliance.

**Non-blocking pattern:** All notification sends are wrapped in try/catch. A failed notification never blocks the primary operation.

---

### 11.8 Background Jobs

24 scheduled cron jobs run automatically:

| Job                 | Schedule      | What it does                                               |
| ------------------- | ------------- | ---------------------------------------------------------- |
| Daily report        | Daily 6am     | Generates and sends morning briefing to each chef          |
| RSVP reminders      | Daily         | Sends reminders to guests who have not RSVPd               |
| RSVP retention      | Weekly        | Follow-up on low RSVP events                               |
| Revenue goals check | Daily         | Evaluates progress against revenue targets                 |
| Reviews sync        | Daily         | Pulls new reviews from Yelp and Google                     |
| Brand monitor       | Daily         | Scans for brand mentions across platforms                  |
| Cooling alert       | Every 4 hours | Checks temperature logs for out-of-range alerts            |
| Integration pull    | Hourly        | Syncs data from connected third-party platforms            |
| Integration retry   | Every 30 min  | Retries failed integration sync jobs                       |
| Activity cleanup    | Weekly        | Purges old activity feed records                           |
| Account purge       | Weekly        | Permanently deletes accounts flagged for deletion          |
| Copilot check-in    | Daily         | Copilot scheduled nudges and suggestions                   |
| Momentum snapshot   | Weekly        | Captures momentum metrics for professional growth tracking |
| Quarterly check-in  | Quarterly     | Triggers quarterly business review prompts                 |
| Renewal reminders   | Daily         | Contract and subscription renewal alerts                   |
| Wellbeing signals   | Daily         | Processes wellbeing signal data                            |
| Simulation check    | Every 15 min  | Health check on the dev simulator                          |

---

### 11.9 Progressive Web App (PWA)

**Activation:** Only when `ENABLE_PWA_BUILD=1` environment variable is set.

**Capabilities:**

- Installable on desktop and mobile (Add to Home Screen)
- Service worker with stale-while-revalidate caching strategy
- Offline mode for cached pages
- Push notification subscription management
- Install prompt handling

**Push notification stack:**

- VAPID keys for web push authentication
- OneSignal for iOS/Android push delivery
- Subscribe/unsubscribe managed via `/api/push/*` endpoints

---

### 11.10 Embed System

The embeddable widget allows any chef to embed an inquiry form on any external website.

**Components:**

- `public/embed/chefflow-widget.js` - self-contained vanilla JS widget script loaded on external sites
- `/embed/inquiry/[chefId]` - the iframe page rendered inside the widget
- `/api/embed/inquiry` - API endpoint that receives submissions from the widget

**Security:**

- Inline styles only (no Tailwind class leakage)
- Relaxed CSP: `frame-ancestors *` to allow embedding on any domain
- Rate limiting per IP on the inquiry submission endpoint
- Client find-or-create by email (idempotent - duplicate submissions do not create duplicate clients)
- Attribution: every submission is tagged with the originating `chefId`

---

### 11.11 Three-Environment Architecture

ChefFlow runs across three environments, all hosted on the developer's local PC:

| Environment | Port | URL                | Process                 |
| ----------- | ---- | ------------------ | ----------------------- |
| Development | 3100 | localhost:3100     | `next dev` (hot reload) |
| Beta        | 3200 | beta.cheflowhq.com | `next start -p 3200`    |
| Production  | 3300 | app.cheflowhq.com  | `next start -p 3300`    |

**Cloudflare Tunnel:** Exposes beta (port 3200) and production (port 3300) to the internet via Cloudflare's network without opening firewall ports.

**Beta directory:** `C:\Users\david\Documents\CFv1-beta\`
**Production directory:** `C:\Users\david\Documents\CFv1-prod\`

All three environments share the same PostgreSQL database and Ollama instance (`localhost:11434`).

**Deployment:**

- `bash scripts/deploy-beta.sh` - sync, build, swap, restart beta (~2 min)
- `bash scripts/deploy-prod.sh` - sync, build, swap, restart production (~2 min)
- Both scripts include atomic build swap and auto-rollback on health check failure

---

### 11.12 Technology Stack

| Layer           | Technology              | Version       |
| --------------- | ----------------------- | ------------- |
| Framework       | Next.js App Router      | 14            |
| Database        | PostgreSQL (PostgreSQL) | hosted        |
| Auth            | Auth.js                 | hosted        |
| Payments        | Stripe Connect          | API v3        |
| Email           | Resend                  | transactional |
| SMS             | Twilio                  | API           |
| Push            | OneSignal               | API           |
| AI (private)    | Ollama                  | local         |
| AI (cloud)      | Google Gemini           | API           |
| Nutrition       | Spoonacular             | API           |
| Styling         | Tailwind CSS            | v3            |
| Background jobs | Inngest                 | hosted        |
| Reviews         | Yelp Fusion API         | -             |
| E-signatures    | DocuSign                | API           |
| Accounting      | QuickBooks              | OAuth         |
| Payments alt    | Square                  | OAuth         |
| Webhooks        | Zapier                  | outbound      |

---

### 11.13 Key Library Locations

| What                  | Where                                        |
| --------------------- | -------------------------------------------- |
| Event FSM             | `lib/events/transitions.ts`                  |
| Ledger append         | `lib/ledger/append.ts`                       |
| Ledger compute        | `lib/ledger/compute.ts`                      |
| AI dispatch layer     | `lib/ai/dispatch/`                           |
| AI privacy gate       | `lib/ai/dispatch/privacy-gate.ts`            |
| Ollama errors         | `lib/ai/ollama-errors.ts`                    |
| Restricted AI actions | `lib/ai/agent-actions/restricted-actions.ts` |
| Input validation      | `lib/ai/remy-input-validation.ts`            |
| Billing modules       | `lib/billing/modules.ts`                     |
| Pro enforcement       | `lib/billing/require-pro.ts`                 |
| Upgrade gate UI       | `components/billing/upgrade-gate.tsx`        |
| Embed widget script   | `public/embed/chefflow-widget.js`            |
| Generated DB types    | `types/database.ts` (never edit manually)    |
| Deploy to beta        | `scripts/deploy-beta.sh`                     |
| Deploy to prod        | `scripts/deploy-prod.sh`                     |

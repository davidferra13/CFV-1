# ChefFlow User Manual

> **For:** Chefs, clients, and anyone using ChefFlow
> **Last updated:** 2026-04-24
> **App:** app.cheflowhq.com

---

## What Is ChefFlow?

ChefFlow is an all-in-one platform for food service professionals. It replaces spreadsheets, text threads, recipe binders, accounting apps, and scattered tools with one system that handles everything: inquiries, events, menus, recipes, invoicing, client relationships, and daily operations.

**All features are free.** There are no paywalls, no locked tiers. If you'd like to support ChefFlow's development, there's an optional $12/month supporter contribution in Settings.

---

## Getting Started

### Signing Up

1. Visit **app.cheflowhq.com**
2. Click **Sign Up**
3. Enter your name, email, and password (or sign in with Google)
4. You'll land on your **Dashboard**, the command center for your business

### First Steps After Sign-Up

ChefFlow's first-week setup is centered on proving one paid booking loop:

1. Finish your profile and service/pricing setup.
2. Capture the first inquiry or lead.
3. Send the first quote.
4. Create the first event.
5. Start prep planning with a menu or prep block.
6. Issue the first invoice or billing artifact.

The guided **Setup** flow at `/onboarding` handles first-run configuration. After the wizard, the onboarding hub and dashboard checklist both point to the same next activation step. Client import, recipes, loyalty, and staff setup remain available as secondary setup work, but they do not block the first booking loop.

Dismissing the setup banner on the dashboard only hides that dashboard reminder. It does not mark first-week activation complete.

---

## Navigation

The sidebar on the left is your primary navigation. It has three layers:

**Action Bar (top):** Daily-driver shortcuts plus a Create button. The primary domains are Today, Inbox, Events, Clients, Culinary, and Finance. Pipeline work stays available from the Pipeline group, search, All Features, and direct inquiry links.

**Core Groups (middle):** Expandable sections for deeper navigation within each workflow area. Pipeline, Events, Clients, Culinary, and Finance expand into their operational pages. Advanced groups appear as your data grows. Use **Show all features** at the bottom of the sidebar to reveal the full menu; the preference is remembered in your browser.

**All Features (bottom):** Everything else - Analytics, Marketing, Social Media, Integrations, Activity Log, Briefing, and more - is organized at **All Features** (`/features`). Click it to browse everything by workflow category. Nothing is hidden; it just lives here instead of taking up space in the sidebar you see every day.

You can also use the search bar at the top of the sidebar or press **Cmd+K** to jump directly to any page in the app by name.

---

## The Dashboard

Your dashboard is the first screen you see after logging in. It shows a snapshot of your business right now.

### What You'll See

- **Greeting** with the current time of day
- **First Booking Loop:** For new accounts, a focused checklist for profile/service setup, first lead, quote, event, prep, and invoice
- **Priority Action Banner:** The single most important thing to handle next (color-coded: red = critical, amber = high priority)
- **Today's Schedule:** Your events for today with a timeline and "now" indicator
- **Week Strip:** A 7-day overview with event dots
- **Response Time SLA:** How many inquiries are waiting for a response (and how long)
- **Daily Ops:** Task counts across four categories (Admin, Prep, Creative, Relationship)
- **Command Center Grid:** Feature cards representing the areas you have started using. Advanced areas stay out of the way until you have data for them.
- **Food Cost Card:** Appears once you have enough culinary or purchasing data for it to be meaningful.
- **Business Stat Cards:** Revenue, revenue goal progress, lead funnel, invoice collection rate, and upcoming event count. These live in the collapsed secondary insights area once your account has operating data.

### Customizing Your Dashboard

Click the **Layout** button (top right of dashboard) to:

- Show or hide individual widgets
- Reorder widgets
- Collapse or expand all sections

Your layout saves automatically.

---

## Inquiries and Sales

### Receiving Inquiries

Inquiries arrive from several sources:

- **Your booking page** (app.cheflowhq.com/book/your-name), for matched-chef requests
- **Your direct chef inquiry page** (app.cheflowhq.com/chef/your-name/inquire), when someone already chose you
- **Embedded forms or kiosk flows**, if you use them
- **Gmail** (if connected in Settings > Connections)
- **Manual entry** (Sidebar > Inquiries > New Inquiry)

Each inquiry captures: occasion, date, guest count, dietary needs, budget, and contact info.

### Smart Fill

When you receive an inquiry via email or text, click **Smart Fill** on the inquiry form. Paste the raw message and ChefFlow extracts the structured details automatically.

### Working the Pipeline

Inquiries flow through statuses:
**New > Responded > Quoted > Negotiating > Accepted > Rejected/Cancelled/Archived**

Use the filters at the top of the Inquiries page to focus on a specific status. The funnel analytics show your conversion rate at each stage.

### Creating a Quote

1. Open an inquiry
2. Click **Create Quote**
3. Add menu items from your recipe library
4. Adjust pricing per item (ChefFlow shows historical pricing and per-guest suggestions)
5. Set deposit amount and payment terms
6. Click **Generate PDF**
7. Send to client via email or share the link

Track quote status: Draft > Sent > Accepted > Rejected > Expired.

### Proposals

For formal presentations, go to Sidebar > Proposals > New Proposal. Use the template editor to add service sections, customize branding, and generate a polished PDF.

Event-driven proposal previews can also show a compact **Client Profile Guidance** section when ChefFlow has a client profile vector available. That guidance may include confidence, service depth, emotional state, hard vetoes, strong likes, novelty opportunities, and clarifications still needed. If the client profile tables are not available yet, this section stays hidden instead of showing guessed data.

### Tracking Calls and Meetings

Click **Schedule Call** on any inquiry to set a date, time, and agenda. After the call, mark it as attended or no-show, and add outcome notes. Upcoming calls also appear in your dashboard widget.

---

## Events

Events are the core of ChefFlow. An event is a date, a client, a menu, a price, and everything needed to execute and deliver.

### Creating an Event

Click **New Event** from the dashboard or from Sidebar > Events. Fill in: occasion, date, guest count, client, location, and service type.

### Event Lifecycle

Every event moves through 8 states:

| Status      | What It Means                              |
| ----------- | ------------------------------------------ |
| Draft       | Being prepared, not shared with client yet |
| Proposed    | Quote sent, waiting for client response    |
| Accepted    | Client approved the quote                  |
| Paid        | Deposit received                           |
| Confirmed   | All details finalized, staff assigned      |
| In Progress | Event is happening right now               |
| Completed   | Event finished, awaiting wrap-up           |
| Cancelled   | Event called off (kept for records)        |

### Event Detail Tabs

At the top of event detail, the **Event Operating Spine** shows the next action, owner, missing information, and status across intake, booking, menu and dietary, prep and stock, Finance, and communication. It fails closed if payment status is unavailable instead of showing a fake zero balance.

Each event has four tabs:

**Overview:** Client info, guest RSVP tracker, allergen cross-check (compares menu against guest dietary restrictions), and attached contracts.

**Finance:** Menu selection, per-event financials (revenue, cost, profit), payment tracking (deposits, installments, balance), expense tracking, and 30-day cost forecast.

**Ops:** Prep planning, service simulation, staff assignments, time tracking, station assignments, temperature logging (food safety), ingredient substitutions, prep documents, readiness gates (5-point safety check before service starts), and kitchen clipboard.

**Wrap-Up:** Post-event checklist, after-action report (AI-generated summary), lifecycle stage detection, photos, and link to client feedback survey.

When an event has a linked client and is not cancelled, the header also shows **Quick Proposal**. This opens a proposal preview for the event without changing quote persistence by itself.

### Service Simulation

Open the **Ops** tab and find **Service Simulation** when you want to mentally walk the event before service.

- Click **Simulate Service** to save a rehearsal against the event's current conditions.
- ChefFlow generates a deterministic walkthrough from Core Facts through Close-out using the event's real menu, prep, packing, travel, readiness, and wrap-up truth.
- If guest count, timing, location, menu shape, dietary notes, or operational readiness changes later, the saved simulation becomes stale and ChefFlow tells you why.
- Every blocker in the walkthrough links straight to the page or tab that fixes it.

### Views

Switch between **List view** and **Kanban view** on the Events page. The kanban shows events as cards in columns by status. Use the 9 status filters to narrow your view.

---

## Clients

### Adding a Client

- **Quick Add:** Minimal form (name, email, phone)
- **Full Profile:** Extended form with preferences, kitchen access info, dietary restrictions, VIP status

### Client Profile (30 Panels)

Every client has a detailed profile covering:

- **Contact info:** Name, email, phone, address, social profiles
- **Financials:** Total spent, average event cost, payment history, outstanding balance
- **Culinary preferences:** Favorite dishes, dietary restrictions, allergies, cuisine preferences
- **Logistics:** Kitchen access, parking, special requests, photo consent
- **Relationship:** Next event, days since last event, total lifetime events
- **Engagement:** HOT (active in last 14 days), WARM (active in 30 days), COLD (inactive 30+ days)

The relationship timeline on the client profile is the canonical interaction feed. It combines authoritative events, inquiries, messages, notes, quotes, payments, reviews, client portal activity, menu revisions, and document version history into one chronological view. Quote, menu, and document revisions also show their revision identity directly in the timeline.

The Next Best Action card on the client profile is projected from that same canonical interaction ledger, plus the existing relationship health and milestone inputs where those are already authoritative. The card now shows the winning action with short reason chips instead of a separate one-off summary.

The main chef-side client detail also includes a **Client Ops Snapshot** card sourced from the authenticated client workspace. It highlights action-required counts, balance due, core profile completeness, pending meal requests, signal-alert state, and the next active RSVP or share lane when one exists. If that shared snapshot cannot load, ChefFlow shows an unavailable state instead of pretending the client has zero blockers.

Client detail includes a **Household** panel for residency clients. Add, edit, or remove household members, then record relationship, age group, allergies, dietary restrictions, dislikes, favorites, and notes for each person. The panel rolls those records into a summary such as adult and child counts plus attributed allergy warnings.

The dedicated relationship page uses the same shared action vocabulary. It shows the winning action title, primary signal, structured reasons, and authoritative source labels so you can see why that action outranked the other relationship moves.

### Search, Filter, and Bulk Actions

Search by name, email, or phone. Filter by status (Active, Inactive, VIP, Duplicates, Segments). Bulk archive is available for multiple clients. CSV export downloads all active clients.

### Duplicate Detection

ChefFlow flags potential duplicate clients automatically. Use the merge option to consolidate.

### Real-Time Presence

See when a client is currently viewing their event portal (a live indicator appears on their profile).

---

## Recipes, Menus, and Ingredients

### Entering a Recipe

All recipes are entered manually. ChefFlow never generates or suggests recipes.

1. Sidebar > Culinary > Recipes > **New Recipe**
2. Enter: name, yield (servings), prep time, cook time
3. Add ingredients from the master list (quantity, unit, name, and usable yield percentage)
4. Add step-by-step instructions
5. Add technique tags and photos
6. Save

ChefFlow automatically calculates ingredient cost from the price catalog (15,000+ items from 39 local stores). Ingredient yield percentages adjust shopping quantities and projected costs when trim, bones, peel, skin, or other prep waste matters.

### Importing Recipes in Bulk

If you have years of recipes to get into ChefFlow, use the Import hub: Sidebar > Culinary > **Import Recipes** (or Culinary hub > Import Recipes tile).

**CSV Import** (for spreadsheets): Export from Excel/Sheets, paste the CSV text, preview all rows, then import. Required column: `name`. Optional: `category`, `description`, `method`, `ingredients` (pipe-separated: "2 cups flour|1 egg"), `prep_time`, `cook_time`, `yield`.

**URL Import**: Paste a recipe URL from AllRecipes, Food Network, Epicurious, or any site with structured recipe data. Preview before saving. Batch import supports multiple URLs at once.

**Photo Import**: Drop photos of recipe cards, cookbook pages, or handwritten notes. Vision AI extracts the structure. Requires Gemini API key.

**Brain Dump**: Type everything you know about a dish in your own words. ChefFlow parses it into a structured recipe. Requires AI to be configured.

**Recipe Sprint**: Queue-based rapid capture for a large backlog of past dishes.

### Creating a Menu

1. Sidebar > Menus > **New Menu**
2. Name it (e.g., "Spring Tasting")
3. Drag dishes from your recipe library into the menu
4. Organize by course (appetizer, entree, dessert)
5. Save

### Assigning a Menu to an Event

In the event detail, go to the **Money** tab and click **Select Menu**. Choose from your library or create a new one. ChefFlow calculates the total menu cost from all ingredients.

When the event is linked to a client, the menu intelligence sidebar also reads that client's profile vector when available. It keeps the existing taste summary format, and it can flag hard vetoes, severe dislikes, and unresolved ambiguities that overlap the menu. If the client profile tables are not present in the database yet, ChefFlow omits this guidance instead of inventing it.

### Ingredient Pricing

The Ingredients page shows the price for each item, resolved through a multi-tier chain:

1. Your manual override price
2. Historical average from your area
3. Similar item pricing
4. Store averages, regional averages, national averages
5. Estimated fallback

Each price shows its source (which store, which data point). Toggle the price history chart to see trends over time.

### Finding an Ingredient (Sourcing Intelligence)

The Food Catalog at Sidebar > Culinary > Food Catalog searches 15,000+ ingredients across 39 stores. When you type an ingredient name and get no results, ChefFlow does not give up. It works through three fallback tiers automatically:

**Tier 1 - Local catalog:** The OpenClaw database. Instant results for mainstream grocery items.

**Tier 2 - Web search:** Searches specialty retailers (Eataly, Whole Foods, Formaggio Kitchen, Marx Foods, and others) via live web search. Good for gourmet or hard-to-find items.

**Tier 3 - Your vendor call queue:** If the ingredient is not found online either, ChefFlow shows your saved supplier contacts with phone numbers. Vendors are ranked by relevance: specialty suppliers, butchers, farms, and fishmongers appear first. Tap the phone number to copy it, then make the call.

To make Tier 3 useful, keep your vendor list current: Sidebar > Culinary > Vendors. Make sure each vendor has a phone number and the correct vendor type set (butcher, farm, specialty, etc.).

A fourth tier (AI auto-calling, where ChefFlow calls vendors for you) is in development.

### Culinary Board

A kanban for recipe development with four columns:
**Brainstorm > Design > Test > Approved**

Drag recipe cards between columns to track your creative pipeline.

### Components and Prep

**Components** are pre-prepped ingredients with costs (e.g., "house vinaigrette" with unit cost).
**Prep Timeline** shows today's prep tasks across all events, with active timers and station assignments.

### Costing Dashboard

Sidebar > Culinary > Costing shows two views:

- **Recipe Cost:** All recipes sorted by total ingredient cost, with KPI cards (most expensive, average cost, missing pricing count). Each recipe shows ingredient count and pricing coverage.
- **Menu Cost:** Estimated menu costs based on linked recipe pricing. Shows cost per guest when a target guest count is set.

Look for the **?** icons next to cost metrics. Click them for explanations of food cost percentage, cost per person, Q-factor, yield factor, and other costing concepts with formulas and target ranges.

### Food Costing Guide

Sidebar > Help Center > **Food Costing Guide** (or go to `/help/food-costing`)

A complete reference covering:

- **Key concepts:** Food cost percentage, Q-factor, yield factor, prime cost, contribution margin, blended cost, and more (20 topics total)
- **Operator targets:** Food cost and prime cost targets customized to your operation type (private chef, caterer, food truck, bakery, restaurant, meal prep)
- **Variance thresholds:** Five escalation levels from "Normal" (under 2%) to "Critical" (over 10%) with recommended actions at each level

Your operation type is set when you choose your archetype during onboarding. All costing targets, dashboard thresholds, and Remy's food cost answers adjust automatically.

---

## Calendar and Scheduling

### Views

- **Day:** Hour-by-hour timeline
- **Week:** 7-day strip with event dots (default view)
- **Month:** Grid with colored event chips by status
- **Production Calendar:** Monthly view showing only prep days, production days, and free days

All events are color-coded by status.

### External Calendar Sync

**Google Calendar:** Settings > Connections > Connect Google Calendar. Events sync both directions.

**iCal Export:** Generate a feed URL to add to Outlook, Apple Calendar, or any calendar app (read-only sync).

### Travel Planning

The Travel page shows weekly travel legs: trips from home to event locations, stop counts, and estimated travel time.

---

## Daily Operations

### Morning Briefing

Go to **All Features > Morning Briefing** (or navigate to `/briefing`) for a 60-second overview of your day:

- Alerts (overdue tasks, unanswered inquiries, stale follow-ups)
- Yesterday's recap (events completed, revenue, tasks done)
- Today's snapshot (events, staff, prep tasks, follow-ups due)
- Shift handoff notes from the previous day
- Today's calls and meetings

### Daily Ops Plan

Sidebar > Daily Ops shows an AI-generated daily plan split into four swim lanes:

- **Quick Admin:** Emails, inquiries, calls
- **Event Prep:** Prep for today's events
- **Creative:** Recipe testing, menu development
- **Relationship:** Client outreach, follow-ups, proposals

Check off tasks as you complete them. Incomplete tasks carry forward to the next day.

### Task Board

Sidebar > Tasks shows a kanban with columns: To Do, In Progress, Done. Drag tasks to change status. Priority badges show urgency. Overdue tasks are highlighted red.

### Kitchen Clipboard

Sidebar > Stations shows per-station task queues. Each station displays its prep setup, daily tasks, and current assignments. Staff see only their station's work.

### Pre-Service Checklist

Before an event starts, complete the 5-category checklist: Safety, Prep, Venue, Staff, Service. All items must be checked before the event can move to "In Progress."

---

## Staff Management

### Adding Staff

Sidebar > Staff > **New Staff**. Enter name, email, phone, role (chef, sous, server, etc.), and hourly rate.

### Assigning Tasks

Two-tap quick assign: click a task, then click a staff member's name. Tasks appear in the staff member's portal.

### Real-Time Activity Board

Staff > Live shows each staff member's current status (active, idle, offline), their current task, and a heat map of which stations are busiest.

### Staff Portal

Staff members log in to see their assigned tasks (read-only), performance metrics, and hours log.

---

## Financials

### Tracking Expenses

Quick entry shortcut: **Ctrl+Shift+E** from anywhere in the app. Or go to Sidebar > Expenses > New Expense. Choose a category (food, supplies, equipment, transportation, utilities, marketing, admin), enter the amount, date, and optionally attach a receipt photo.

### Invoicing

Events automatically create financial records. To send an invoice:

1. Sidebar > Financials > Invoices > **New Invoice**
2. Select client, add line items, set deposit and payment terms
3. Generate PDF
4. Click **Send** to email the client a payment link

Invoice statuses: Draft > Sent > Paid (or Overdue/Refunded/Cancelled).

### Receiving Payments

Clients pay via Stripe link. Payments appear automatically. For cash or check payments, click **Record Payment** and enter the details manually.

### The Ledger

Sidebar > Financials > Ledger shows every transaction in an append-only log. Entries cannot be edited or deleted (data integrity). Manual adjustments create explicit adjustment entries. Export to CSV available.

### Financial Reports

Nine report types are available under Financials > Reporting:

1. Revenue by month
2. Revenue by client
3. Revenue by event type
4. Profit (revenue minus expenses)
5. Expense breakdown
6. Tax summary
7. Year-to-date cumulative
8. Profit & Loss statement
9. Cash flow forecast (30-day projection)

All reports are filterable by date range. Click any data point to drill down.

### Tax Center

Financials > Tax provides:

- Quarterly tax estimates (IRS 1040-ES calculation)
- Mileage log for deductions
- Equipment depreciation tracker (5-year schedule)
- Home office percentage calculator
- Retirement contribution tracking (Solo 401k, SEP-IRA)

### Revenue Goals

Financials > Goals lets you set monthly, quarterly, or annual revenue targets. A progress bar shows how close you are.

### Payroll

If you have employees: Financials > Payroll manages wages, Form 941 (quarterly payroll tax), and W-2 generation.

---

## Analytics and Intelligence

### Analytics Dashboard

**All Features > Analytics** (`/analytics`) shows:

- Inquiry funnel with conversion rates at each stage
- Revenue trends (monthly, by client, by event type)
- Client metrics (total, active, churn rate)
- Event performance (average revenue, most profitable type)
- Utilization rates (days booked vs. available)
- Cost tracking (ingredient cost %, labor cost %)

### Intelligence Hub

Analytics > Intelligence provides AI-powered insights:

- Predictive pricing for upcoming events
- Demand forecasting (upcoming busy seasons)
- Client clustering (who's most likely to rebook)
- Anomaly detection (unusually priced events)

### Activity Log

**All Features > Activity Log** (`/activity`) shows a timeline of all system changes. Use Summary mode for an overview or Retrace mode to see the system's state at any past date. Filter by domain (Events, Clients, Finances, etc.).

### Priority Queue

**All Features > Priority Queue** (`/queue`) ranks all action items by urgency across your entire business. Snooze items (1 hour, 4 hours, tomorrow, next week) or click to jump to the relevant page.

---

## Client Portal (For Your Clients)

Your clients access their portal at **app.cheflowhq.com/my-hub** after logging in.

### What Clients Can Do

- **View events:** See upcoming and past events with countdown timers
- **Track booking progress:** Each event detail page shows one progress card for booking details, proposal or agreement status, menu, payment, guest coordination, and messages.
- **RSVP:** Mark attending, maybe, or decline. Add plus-ones with dietary info.
- **Submit dietary restrictions:** Checkboxes for common allergens (Big 9) plus a free text field
- **View documents:** Recipe cards, wine pairings, parking instructions, dress code
- **Photo consent:** Opt in or out of public photo sharing
- **Post-event feedback:** Rate the event (1-5 stars), write a testimonial, upload photos
- **Loyalty rewards:** View points balance, tier status, and available rewards

### Guest RSVP (No Login Required)

Guests receive a link to **app.cheflowhq.com/hub/your-name/event-id**. No account needed. They can RSVP, add dietary restrictions, and view event details.

### Kiosk Mode

For on-site use, ChefFlow provides full-screen tablet forms for RSVP, dietary collection, and feedback at the event venue.

---

## Public Pages

### Your Public Profile

Share your profile at **app.cheflowhq.com/chef/your-name**. It shows your avatar, bio, cuisine tags, service types, approved testimonials, social links, and public Sample Menus. From a menu detail page, use **Public Profile Sample Menus** to publish a non-archived menu to that section. If the showcased menu has dish photos, the first sorted dish photo appears as the public card image. Without a dish photo, the public card stays text-only. Visitors can click through to your booking page.

### Your Booking Page

Share **app.cheflowhq.com/book** with potential clients when they want ChefFlow to match them with available chefs. The form captures occasion, date, guest count, dietary needs, budget, contact info, referral source, partner attribution, and UTM fields, then creates a tracked open booking and matched inquiries in chef pipelines.

After submission, clients are sent to **/book/status/[bookingToken]** and receive the same status link by email. The status page shows submitted event details, booking readiness, matched-chef progress, no-response guidance after 48 hours, and a planning space or proposal link once a chef responds. If no chef is available in the area, the request is saved and the status page points the client toward broader search and specific chef profiles.

### Direct Chef Inquiry Page

Share **app.cheflowhq.com/chef/your-name/inquire** when a client already knows they want you. This form routes to one named chef, lands in the same inquiry pipeline, and tells the client to expect direct follow-up from that chef after review.

### Operator Evaluation Pages

ChefFlow also has public operator pages for chefs evaluating the product before they sign up:

- **`/for-operators`** is the main proof page. It shows real product framing, key capability areas, and the fastest next steps.
- **`/marketplace-chefs`** is for chefs whose leads already start on marketplaces, travel platforms, concierge channels, or referrals. It frames ChefFlow as the system behind that demand, not a fake replacement marketplace.
- **`/compare`** is the comparison hub for chefs moving away from spreadsheets or broad CRM tools. It links into individual comparison guides and then into proof or walkthrough routes.
- **`/for-operators/walkthrough`** is the live-review form for operators who want a founder-led walkthrough before switching. Those requests go into the founder-owned operator evaluation lane on `/leads`, not the general lead pool.

The homepage now sends qualified operators into `/for-operators` first, then the walkthrough lane once the proof is close. The marketplace and compare pages still exist as more specific follow-on routes.

### Remy (AI Concierge)

Remy appears as a chat widget on your homepage and booking page. Visitors can describe what they're looking for in natural language ("I'm planning a dinner party for 12 next Saturday"). Remy gathers the details and creates a structured inquiry for you to review.

### Embedding on Your Own Website

Go to Settings > Embed to get a code snippet. Paste it into your website (WordPress, Squarespace, or any platform). A booking form appears as a modal on your site, and submissions flow directly into your ChefFlow inquiry pipeline while keeping their website-embed source attached.

---

## Dinner Circles

Sidebar > Circles lets you create private group channels to collaborate with other chefs, clients, and invited members. Share menu ideas, discuss recipes, coordinate on events, and keep guest details in one live thread. Messages update in real-time, and your four most recent circles appear as a dashboard widget.

Dinner Circle invite links are built to be fast to forward. Chef, client, and member invite surfaces all use the same join link mechanics, but the suggested text changes to match who is sending it. When someone joins from that link, the circle records who invited them and posts a lightweight join activity line in the thread so the group can see who brought them in.

The Dinner Circle **Meals** tab is a weekly residency meal board. Chefs can plan breakfast, lunch, and dinner by week, mark meal status, copy or template weeks, set meal times, track who is eating, and generate a weekly shopping list. Household allergies and dietary restrictions stay visible above the board, and any planned meal with a matching allergen flag is marked as a household conflict.

---

## Settings

Access all settings from Sidebar > Settings. Key sections:

### Your Business

- Business defaults (name, legal structure, hours)
- Profile & Branding (avatar, bio, tagline, colors, logos)
- Availability rules (blocked dates, max events per day)
- Booking page customization
- Event configuration (default service time, dietary questions)
- Payments & Billing (Stripe connection, supporter contribution)

### Communication

- Workflow automation (reminder timing)
- Notification preferences (email, push, SMS per event type)
- Email templates
- Client review settings

### Connections & AI

- Gmail (send, sync, thread matching)
- Google Calendar (bidirectional sync)
- AI privacy center (which data stays private, which uses cloud processing)

### Appearance

- Light/dark mode toggle

### System

- Sample data management (delete demo data)
- PWA desktop app installation
- Account security (password, two-factor auth, sessions)

---

## Keyboard Shortcuts

| Shortcut     | Action              |
| ------------ | ------------------- |
| Ctrl+Shift+E | Quick expense entry |

---

## Support

ChefFlow is built and maintained by a solo developer. All features are free.

- **Optional supporter contribution:** $12/month via Settings > Billing (cancel anytime)
- **Feedback and bug reports:** Settings > Share Feedback

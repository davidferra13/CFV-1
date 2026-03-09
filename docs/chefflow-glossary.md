# ChefFlow Glossary

The complete dictionary of every term, concept, and feature in ChefFlow.

---

## People

| Term              | Definition                                                                                                                                    |
| ----------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| **Chef**          | A private chef who runs their business on ChefFlow. The primary user. Every piece of data in the system is scoped to one chef (multi-tenant). |
| **Client**        | The person or household that hires a chef for an event. Clients have accounts, dietary profiles, and communication history.                   |
| **Guest**         | Someone attending an event, invited by the client. Guests can RSVP and submit dietary info via a shared link, but don't have full accounts.   |
| **Staff Member**  | Someone on the chef's team (sous chef, prep assistant, server, etc.). Assigned to events, tracked for payroll.                                |
| **Admin**         | Internal ChefFlow administrator. Has access to all features, including prospecting and system settings.                                       |
| **Regular Guest** | A household member stored on a client's profile with permanent dietary preferences and notes.                                                 |

---

## The Pipeline (How Work Flows In)

| Term                | Definition                                                                                                                                                                               |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Inquiry**         | An inbound request from someone interested in hiring a chef. The first point of contact. Captures event date, guest count, cuisine preferences, dietary needs, budget, and contact info. |
| **Inquiry Channel** | Where the inquiry came from: email, text, phone, Instagram, web embed, kiosk, or Take a Chef.                                                                                            |
| **Lead**            | General term for any potential client (inbound inquiry or outbound prospect), scored 0-100 by the GOLDMINE system.                                                                       |
| **Prospect**        | An outbound lead: someone the chef is reaching out to, not the other way around. Prospecting is admin-only.                                                                              |
| **Lead Score**      | A 0-100 number representing how likely a lead is to convert into a paying client. Calculated by GOLDMINE using deterministic extraction (no AI).                                         |
| **Follow-up Due**   | The auto-calculated date by which a chef should next contact a lead.                                                                                                                     |
| **Conversion**      | When an inquiry becomes a real event with a quote and timeline.                                                                                                                          |

### Inquiry Statuses

| Status (UI Label)     | DB Value          | Meaning                                             |
| --------------------- | ----------------- | --------------------------------------------------- |
| **New**               | `new`             | Just received, not yet reviewed                     |
| **Waiting for Reply** | `awaiting_client` | Chef responded, waiting for client's reply          |
| **Needs Response**    | `awaiting_chef`   | Client responded, chef needs to act                 |
| **Quote Sent**        | `quoted`          | A quote has been sent, waiting for client to accept |
| **Ready to Book**     | `confirmed`       | Client accepted; ready to create the event          |
| **Declined**          | `declined`        | Either party said no                                |
| **Expired**           | `expired`         | No response after follow-ups                        |

---

## Events (The Core of ChefFlow)

| Term                  | Definition                                                                                                              |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| **Event**             | A real engagement being planned or executed. Created from an inquiry (or directly). Moves through an 8-state lifecycle. |
| **Event Series**      | A sequence of related events (e.g., weekly meal prep for the same client).                                              |
| **Recurring Service** | A repeating weekly or monthly event arrangement.                                                                        |
| **Instant Book**      | A booking model where the client pays directly without a proposal stage.                                                |
| **Rebook**            | When a previous client books again. Rebook tokens pre-fill their details for fast rebooking.                            |

### Event Lifecycle (8-State FSM)

Every event moves through these states in order. Transitions are permission-gated (chef-only, client-only, or system-only).

| Status (UI Label)  | DB Value      | What It Means                                             |
| ------------------ | ------------- | --------------------------------------------------------- |
| **Draft**          | `draft`       | Chef is building the event details                        |
| **Sent to Client** | `proposed`    | Event sent to the client for review                       |
| **Accepted**       | `accepted`    | Client agreed to the event                                |
| **Paid**           | `paid`        | Deposit or payment received (triggered by Stripe webhook) |
| **Confirmed**      | `confirmed`   | Both sides locked in; prep begins                         |
| **In Progress**    | `in_progress` | Chef is actively cooking or serving                       |
| **Completed**      | `completed`   | Event finished; final settlement, loyalty awarded         |
| **Cancelled**      | `cancelled`   | Fell through at any point (terminal state)                |

### Readiness Gates

Conditions that must be met before an event can transition to the next state. **Hard gates** block the transition entirely. **Soft gates** warn but allow the chef to proceed.

Examples: unconfirmed allergens (hard gate), missing prep sheet (soft gate).

---

## Quotes and Proposals

| Term                  | Definition                                                                                                                        |
| --------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **Quote**             | A pricing proposal for an event. Includes line items for services, add-ons, and estimated costs. Sent to the client for approval. |
| **Proposal**          | The full package sent to a client: quote, menu, timeline, terms.                                                                  |
| **Rate Card**         | The chef's standard pricing for common services (per guest, per hour, per event type).                                            |
| **Pricing Benchmark** | Market rate data shown to new chefs so they can price competitively. Provided by GOLDMINE.                                        |

### Quote Statuses

| Status       | Meaning                              |
| ------------ | ------------------------------------ |
| **Draft**    | Chef is building the quote           |
| **Sent**     | Delivered to the client              |
| **Accepted** | Client approved                      |
| **Rejected** | Client declined                      |
| **Expired**  | Time limit passed without a response |

---

## Menus and Culinary

| Term                 | Definition                                                                                                 |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| **Recipe**           | A single dish formulation. The chef's intellectual property. Always entered manually (never AI-generated). |
| **Menu**             | A collection of recipes assembled for a specific event.                                                    |
| **Ingredient**       | A food item linked to recipes with quantity and unit.                                                      |
| **Component**        | A prep item or sub-recipe (sauce, stock, garnish) assembled into dishes.                                   |
| **Food Cost**        | The ingredient cost of a dish or event, used for pricing and profitability analysis.                       |
| **Costing**          | The full cost calculation: ingredients, labor, overhead, travel.                                           |
| **Vendor**           | A supplier the chef buys ingredients or equipment from.                                                    |
| **Seasonal Palette** | A themed menu concept tied to seasons or occasions.                                                        |
| **Plating Guide**    | Visual reference for how a dish should be presented.                                                       |

### Menu Statuses

| Status       | Meaning                                  |
| ------------ | ---------------------------------------- |
| **Draft**    | Chef is creating or editing              |
| **Shared**   | Sent to the client for review            |
| **Locked**   | Finalized for the event; no more changes |
| **Archived** | Historical record                        |

---

## Dietary and Safety

| Term                     | Definition                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Allergy**              | A critical dietary flag (nuts, shellfish, dairy, etc.). Prominently displayed on every relevant screen. Life-threatening if ignored. |
| **Dietary Restriction**  | A non-allergy food preference or requirement (vegetarian, vegan, gluten-free, kosher, halal, etc.).                                  |
| **Dietary Confirmation** | Client's formal sign-off that all allergen and dietary flags are correct before an event. A readiness gate.                          |
| **Dietary Check**        | AI-assisted allergen risk assessment against a menu.                                                                                 |

---

## Finance

| Term                    | Definition                                                                                                                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Ledger Entry**        | A single, immutable financial record. Payments, expenses, discounts, taxes, tips, refunds, and adjustments all become ledger entries. The source of truth for all money in ChefFlow. |
| **Ledger**              | The complete, append-only financial record for a chef. Balances are always computed from ledger entries, never stored directly.                                                      |
| **Invoice**             | A billing document sent to a client after a quote is accepted. Shows line items, taxes, loyalty discounts, and amount due.                                                           |
| **Payment**             | Money changing hands (deposit, final payment, refund). Processed through Stripe.                                                                                                     |
| **Expense**             | Money the chef spent (groceries, gas, equipment, supplies). Tracked for profitability and taxes.                                                                                     |
| **Outstanding Balance** | The amount a client still owes on an event.                                                                                                                                          |
| **Deposit**             | Upfront payment required to confirm a booking.                                                                                                                                       |
| **Break-Even Analysis** | The minimum revenue needed for an event to be profitable.                                                                                                                            |
| **Client LTV**          | Lifetime Value: the projected total revenue from a client across all their bookings.                                                                                                 |
| **Cash Flow Forecast**  | Projected income and expenses over time (Pro feature).                                                                                                                               |

All monetary amounts are stored in **cents** (minor units, integers). $50.00 = 5000.

### Expense Categories

Groceries, Alcohol, Specialty Items, Gas/Mileage, Equipment, Supplies, Other.

### Ledger Entry Types

Revenue, Expense, Discount, Tax, Tip, Refund, Adjustment.

---

## Loyalty and Rewards

| Term                     | Definition                                                                                                                           |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Loyalty Tier**         | Client progression level: Bronze, Silver, Gold, Platinum. Higher tiers unlock better rewards.                                        |
| **Loyalty Points**       | Points earned from completed events. Can be redeemed for rewards.                                                                    |
| **Loyalty Program Mode** | How the chef runs their loyalty program: **Full** (points + tiers + redemption), **Lite** (visit tracking + tiers only), or **Off**. |
| **Reward**               | What points buy. Always service-denominated (never cash): fixed discount, percentage discount, free course, free dinner, upgrade.    |
| **Voucher**              | A digital coupon or incentive. Not redeemable for cash.                                                                              |
| **Gift Card**            | Prepaid value that can be gifted or purchased. Applied to future events.                                                             |
| **Redemption**           | When a client uses points, a voucher, or a gift card on an event.                                                                    |

### Loyalty Transaction Types

Earned, Redeemed, Bonus (manual award), Adjustment (admin correction), Expired.

---

## Communication

| Term                  | Definition                                                                                                                 |
| --------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| **Conversation**      | A message thread between chef and client about an event or general topic.                                                  |
| **Message**           | A single communication within a conversation. Has direction (inbound/outbound) and status (sent, delivered, read, failed). |
| **Circles (Hub)**     | Group discussions around an event or topic, involving multiple people.                                                     |
| **Inbox**             | The chef's unified message center.                                                                                         |
| **Triage**            | Smart inbox filtering that sorts and prioritizes incoming communication.                                                   |
| **Response Template** | Pre-written message that can be personalized and sent quickly.                                                             |

---

## Operations and Execution

| Term                          | Definition                                                                                      |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| **Daily Ops**                 | Today's operational checklist: prep, travel, service, debrief.                                  |
| **Briefing**                  | A daily summary of what's happening: upcoming events, weather, tasks, notes.                    |
| **Prep Block**                | A calendar block for food preparation. Auto-placed when an event is confirmed.                  |
| **Prep Sheet**                | Chef-internal prep instructions for an event. Auto-generated, sent as PDF on confirmation.      |
| **Packing List**              | Equipment and supplies to bring to an event, organized by transport category.                   |
| **Travel Plan**               | Route planning for getting to and from an event.                                                |
| **Staff Assignment**          | Which team members are working which event.                                                     |
| **After-Action Review (AAR)** | A post-event debrief: what went well, what didn't, lessons learned. AI-drafted from event data. |
| **Event Recap**               | A thank-you message sent to the client after an event.                                          |
| **Front-of-House Menu**       | The client-facing menu presentation (HTML and PDF).                                             |
| **Contract**                  | A legal service agreement for an event. Can be generated from templates.                        |
| **Equipment Inventory**       | Kitchen equipment the chef owns, tracked with depreciation.                                     |
| **Equipment Rental**          | Third-party equipment rented for specific events.                                               |

---

## Calendar and Scheduling

| Term                   | Definition                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------- |
| **Calendar**           | The chef's schedule, showing events, prep blocks, availability, and travel.         |
| **Calendar Sync**      | Google Calendar integration. Events sync when confirmed, remove when cancelled.     |
| **Availability Block** | Time the chef marks as unavailable (vacation, personal, other commitments).         |
| **Waitlist**           | Clients interested in dates the chef is currently booked. Notified if a slot opens. |

---

## Marketing and Outreach

| Term                      | Definition                                                                                                                             |
| ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| **Campaign**              | A structured outreach effort to prospects or existing clients.                                                                         |
| **Personalized Outreach** | A client-specific message drafted with their history and preferences in mind. Uses Ollama (private AI) because it handles client data. |
| **Email Campaign**        | Bulk communication to a client segment.                                                                                                |
| **Portfolio**             | The chef's public-facing work samples.                                                                                                 |
| **Chef Bio**              | Professional biography, AI-drafted from the chef's history and style.                                                                  |
| **Testimonial**           | A client review or endorsement.                                                                                                        |
| **Referral Partner**      | An aligned business (venue, florist, event planner) that sends clients to the chef.                                                    |
| **Referral Code**         | A shareable code that gives referred clients a discount and rewards the referrer.                                                      |
| **Social Content Queue**  | Posts scheduled for social media.                                                                                                      |

---

## Billing and Tiers

| Term             | Definition                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Free Tier**    | Core features every chef gets: inquiries, events, clients, quotes, payments, basic calendar, basic finance, recipes, documents.                            |
| **Pro Tier**     | Advanced features that require a subscription: AI, analytics, marketing, operations, loyalty, staff management, and more.                                  |
| **Module**       | A feature group that controls what the chef sees in their sidebar. Independent of tier (a chef can hide modules they don't use, even if they have access). |
| **Upgrade Gate** | UI component that shows a "upgrade to Pro" prompt when a free-tier chef tries to access a Pro feature.                                                     |

### Modules

Dashboard, Pipeline, Events, Culinary, Clients, Finance, Protection, More Tools, Commerce, Social Hub.

---

## AI Agents

| Term         | Definition                                                                                                                                                                                                                                      |
| ------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Remy**     | The client-facing AI concierge inside ChefFlow. Helps chefs with tasks through natural language: look up client info, calculate finances, draft emails, search recipes, analyze data. Cannot generate recipes. Runs on Ollama (local, private). |
| **Gustav**   | The ops AI inside Mission Control (the developer's launcher panel). Helps with project management and development tasks.                                                                                                                        |
| **Ollama**   | The local AI engine. Runs on the developer's PC. All private data (client names, financials, allergies, recipes) stays on-machine. Never sends data to the cloud.                                                                               |
| **Gemini**   | Google's cloud AI. Used ONLY for generic, non-private tasks (technique lists, kitchen specs, campaign themes). Never touches client data.                                                                                                       |
| **GOLDMINE** | The deterministic lead intelligence system. Extracts structured data from emails, scores leads 0-100, calculates follow-up dates. No AI involved (pure regex and math).                                                                         |

---

## Integrations

| Term                  | Definition                                                                        |
| --------------------- | --------------------------------------------------------------------------------- |
| **Gmail Integration** | Syncs the chef's inbox. Automatically extracts inquiry data from incoming emails. |
| **Google Calendar**   | Two-way sync for confirmed events.                                                |
| **Stripe**            | Payment processing. Handles deposits, full payments, refunds, and webhooks.       |
| **Embed Widget**      | An inquiry form that can be embedded on the chef's own website via iframe.        |
| **Kiosk**             | A tablet or device-based inquiry form for venues or events.                       |
| **Cloudflare Tunnel** | Connects the local beta server to `beta.cheflowhq.com`.                           |

---

## Documents and Storage

| Term                 | Definition                                                                        |
| -------------------- | --------------------------------------------------------------------------------- |
| **Chef Documents**   | Contracts, certifications, manuals, and other files stored in the chef's account. |
| **Shopping List**    | An ingredient list generated from event menus.                                    |
| **Packing Template** | A reusable packing checklist for different event types.                           |
| **Chef Journal**     | A personal learning log for recipes, techniques, and professional development.    |
| **Media Bucket**     | File storage for profile images, event photos, and assets.                        |

---

## Tax and Accounting

| Term                     | Definition                                  |
| ------------------------ | ------------------------------------------- |
| **Mileage Log**          | Tracked travel distance for tax deductions. |
| **Receipt Digitization** | OCR scanning of expense receipts.           |
| **1099 Generation**      | Contractor tax reporting for staff.         |

---

## Notifications

| Term                         | Definition                                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Notification**             | An alert sent to a chef or client. Categorized by type (event, payment, inquiry, message, opportunity, system) and delivered via in-app, email, SMS, or push. |
| **Notification Preferences** | Per-chef settings controlling which notifications they receive and through which channels.                                                                    |

---

## Sharing and Public Access

| Term              | Definition                                                                             |
| ----------------- | -------------------------------------------------------------------------------------- |
| **Share Token**   | A secure, one-time or time-limited link to an event, inquiry, or document.             |
| **Guest Share**   | A link the client distributes to guests for RSVP and dietary info submission.          |
| **Public Portal** | A client-facing event preparation page accessible via public link (no login required). |

---

## System Concepts

| Term                           | Definition                                                                                                                                                       |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tenant**                     | Synonym for chef. Every row of data belongs to exactly one tenant. `tenant_id` and `chef_id` both reference the same thing.                                      |
| **Multi-tenant**               | The architecture pattern where all chefs share one database but can only see their own data. Every query is scoped by tenant.                                    |
| **Server Action**              | A function that runs on the server (not in the browser). All business logic, database writes, and permission checks happen here.                                 |
| **FSM (Finite State Machine)** | The rule system that controls which states an event can move between, and who is allowed to trigger each transition.                                             |
| **Immutability**               | Certain records (ledger entries, event transitions, quote state transitions) can never be edited or deleted once created. This is enforced by database triggers. |
| **RLS (Row Level Security)**   | Supabase's built-in system for ensuring users can only access data they're authorized to see.                                                                    |
| **Automation Rule**            | An if/then workflow: when X happens, do Y automatically.                                                                                                         |

---

_Last updated: 2026-03-09_

# ChefFlow Ubiquitous Language

> Canonical domain glossary. Every term here means exactly one thing. Use these terms in code, specs, conversations, and AI prompts. Updated inline during `/grill-with-docs` sessions.
>
> **Rule:** If a term is not in this glossary, define it here before using it in code or specs. If a term conflicts with common programming usage (e.g., "Event"), the domain meaning wins in all non-infrastructure contexts.

---

## Core Entities

| Term             | Definition                                                                                                                                                                                   | NOT this                                                                                                            |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| **Chef**         | The primary user and tenant. A food service professional operating the platform. Each chef is a tenant with isolated data. All queries scoped by `tenant_id` or `chef_id`.                   | Not a job title. Not a user role in the generic sense. The chef IS the tenant.                                      |
| **Client**       | A person who hires a chef for services. Has CRM profile, financial history, dietary info, household members. Statuses: `active`, `dormant`, `repeat_ready`, `vip`.                           | Not "customer" or "user." Clients don't browse a marketplace. They have a relationship with one chef.               |
| **Event**        | The central operational unit. A booked service engagement (dinner, catering, meal prep) on a specific date. Links to menus, quotes, guests, staff, prep blocks, travel legs, and financials. | Not a JavaScript event. Not a calendar entry. An Event is a job.                                                    |
| **Inquiry**      | First contact from a potential client. Tracked by channel (20+ sources). The start of the service lifecycle.                                                                                 | Not a "lead" (that's Prospect). Not a "booking" (that comes later).                                                 |
| **Quote**        | A price proposal sent to a client for a potential event. Has line items and optional add-ons.                                                                                                | Not an "estimate" or "invoice." A Quote becomes an Event when accepted.                                             |
| **Recipe**       | The chef's intellectual property. Entered manually by the chef. AI never generates, suggests, or fabricates recipes.                                                                         | Not a suggestion. Not AI output. Not from the internet. The chef's creative work, period.                           |
| **Menu**         | A collection of dishes assigned to an event. Has approval workflow with the client.                                                                                                          | Not a navigation menu. Not a restaurant menu (though it can be).                                                    |
| **Dish**         | An individual item on a menu. Has prep complexity, plating difficulty, and rotation status (`active`, `resting`, `retired`, `testing`).                                                      | Not a Recipe. A Dish is what's served. A Recipe is how it's made. One Recipe can produce many Dishes across events. |
| **Component**    | A pre-prepped element used in dishes (a sub-recipe). Sauces, stocks, garnishes, bases.                                                                                                       | Not a UI component.                                                                                                 |
| **Ingredient**   | A raw material used in recipes/components. Allergen-classified (FDA Big 9). 16 categories.                                                                                                   | Not a "product" (that's a store SKU in OpenClaw).                                                                   |
| **Guest**        | An attendee at an event. Distinct from Client (who is the host). Has dietary restrictions, RSVP status, familiarity level.                                                                   | Not the Client. The Client books; Guests attend.                                                                    |
| **Household**    | A group of people at a client's residence. Members have relationships (`partner`, `child`, `family_member`, `regular_guest`) with per-person dietary tracking.                               | Not a "family." Professional framing.                                                                               |
| **Vendor**       | A supplier of ingredients or equipment. Has price points, invoices, order history.                                                                                                           | Not a "store" (that's a retail location in OpenClaw).                                                               |
| **Staff Member** | A person who works for/with a chef at events. Roles: `sous_chef`, `kitchen_assistant`, `service_staff`, `server`, `bartender`, `dishwasher`.                                                 | Not an Employee (which implies W-2). Staff can be contractors.                                                      |
| **Prospect**     | A potential client being actively pursued via outbound marketing. Admin-only feature.                                                                                                        | Not an Inquiry (which is inbound). Prospecting is outbound.                                                         |
| **Contract**     | A service agreement document. Statuses: `draft`, `sent`, `viewed`, `signed`, `voided`.                                                                                                       | Not a retainer. A Contract covers a specific engagement.                                                            |
| **Retainer**     | A recurring service agreement with billing periods.                                                                                                                                          | Not a Contract. A Retainer is ongoing.                                                                              |

---

## Financial Terms

| Term                        | Definition                                                                                                                                                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Ledger Entry**            | An immutable, append-only financial record. Types: `payment`, `deposit`, `installment`, `final_payment`, `tip`, `refund`, `adjustment`, `add_on`, `credit`, `retainer`. Balances are COMPUTED from entries, never stored. |
| **Event Financial Summary** | A database VIEW computing per-event revenue, costs, and profit from ledger entries. Never a stored column.                                                                                                                |
| **Expense**                 | A cost tracked by the chef. 17 categories from groceries to professional services.                                                                                                                                        |
| **Receipt**                 | A photo of a purchase receipt. Parsed by AI (OCR) into structured line items. The only place AI touches financial data.                                                                                                   |
| **Payment Status**          | An event's payment state: `unpaid`, `deposit_paid`, `partial`, `paid`, `refunded`. Derived from ledger entries.                                                                                                           |
| **Auto-Costing Engine**     | 10-tier price resolution chain that automatically prices ingredients. Uses OpenClaw data, vendor prices, chef overrides. Deterministic (formula, not AI).                                                                 |
| **All monetary amounts**    | Stored in cents (minor units, integers). `$12.50` = `1250`. No floating point.                                                                                                                                            |

---

## State Machines (FSMs)

Every state machine logs transitions immutably. Transitions are append-only records.

| Entity       | States                                                                                                      | Key Rule                                                   |
| ------------ | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Event**    | `draft` -> `proposed` -> `accepted` -> `paid` -> `confirmed` -> `in_progress` -> `completed` \| `cancelled` | The 8-state FSM. The heartbeat of ChefFlow.                |
| **Quote**    | `draft` -> `sent` -> `accepted` \| `rejected` \| `expired`                                                  | Accepted Quote triggers Event creation.                    |
| **Menu**     | `draft` -> `shared` -> `locked` -> `archived`                                                               | Locked = client approved. No changes without new revision. |
| **Inquiry**  | `new` -> `awaiting_client` -> `awaiting_chef` -> `quoted` -> `confirmed` \| `declined` \| `expired`         | Tracks the pre-Event conversation.                         |
| **Contract** | `draft` -> `sent` -> `viewed` -> `signed` \| `voided`                                                       | Signed = legally binding.                                  |

---

## Service Lifecycle

The 10-stage end-to-end engagement model (see `docs/service-lifecycle-blueprint.md`):

1. **Inquiry Received** - first contact
2. **Discovery** - understanding needs
3. **Quote** - pricing proposal
4. **Agreement** - contract signed
5. **Planning** - menu design, logistics
6. **Prep** - shopping, cooking, packing
7. **Service Day** - execution
8. **Post-Event** - AAR, leftover tracking
9. **Follow-Up** - feedback, rebooking
10. **Client Retention** - ongoing relationship

---

## Roles and Access

| Role               | Access                                     | Key Constraint                     |
| ------------------ | ------------------------------------------ | ---------------------------------- |
| **Chef** (role)    | Full access to their tenant data.          | IS the tenant.                     |
| **Client** (role)  | Own events, hub, menus, invoices.          | Cannot see other clients' data.    |
| **Staff** (role)   | Assigned events only.                      | Limited operational access.        |
| **Partner** (role) | Referral stats and shared data.            | Read-only on chef operations.      |
| **Admin** (role)   | Platform settings, prospecting, audit log. | Prospecting is admin-only. Always. |
| **System** (role)  | Internal automations, webhooks.            | Not a human.                       |

**Tenant:** The data isolation boundary. One chef = one tenant. `tenant_id` (core tables) and `chef_id` (feature tables) both reference `chefs(id)`. Never trust tenant from request body; always derive from session.

**Free Tier:** Complete standalone utility. No locked buttons. No dead ends. The chef can operate solo without friction.

**Paid Tier (Pro):** Leverage, automation, scale. Enforced via `requirePro()`. Upgrade prompts surface AFTER the free action completes, not before.

---

## AI and System Terms

| Term                   | Definition                                                                                                                 | Boundary                                                                    |
| ---------------------- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Remy**               | The AI concierge agent. Client-facing (answers questions, parses inquiries) and chef-facing (task suggestions, summaries). | Never owns canonical state. Assists drafting only. Never generates recipes. |
| **OpenClaw**           | The external data engine that builds pricing databases, ingredient catalogs, and store data. Runs on Raspberry Pi.         | Forbidden from user-facing surfaces. Use "system" or "engine" instead.      |
| **CIL**                | Continuous Intelligence Layer. Per-tenant SQLite with 7 signal sources, hourly scanner. Background intelligence for Remy.  | No UI consumer yet.                                                         |
| **parseWithOllama**    | Central AI inference gateway. Structured prompts in, Zod-validated JSON out. All AI modules must use this.                 | Throws `OllamaOfflineError` if unreachable. No fallback.                    |
| **Gemma 4**            | The LLM model for all AI inference (via Ollama-compatible endpoint).                                                       | Single provider. No second AI.                                              |
| **AAR**                | After Action Review. AI-generated post-event analysis: financials, performance, lessons.                                   | AI drafts; chef owns the final version.                                     |
| **CompletionContract** | Deterministic completion engine. Recursive dependency resolution: Event -> Menu -> Recipe -> Ingredient.                   | Formula, not AI. Zero new tables.                                           |
| **Formula > AI**       | If deterministic code can produce the correct result, always use it over AI. AI is the fallback, never the default.        | Permanent rule.                                                             |

---

## UI and Navigation

| Term                   | Definition                                                                                                        |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **Surface**            | A UI portal: `public`, `chef`, `client`, `admin`, `partner`. Each has its own layout and auth.                    |
| **Six Pillars**        | Organizational framework: SELL, PLAN, COOK, STOCK, MONEY, GROW. Every feature maps to one pillar.                 |
| **Hub**                | The client-facing event portal. Media, pinned notes, polls, guest history, messages.                              |
| **Embed Widget**       | External inquiry capture widget (vanilla JS). Public, no auth, inline styles. Embeddable on any website.          |
| **Dinner Circle**      | The atomic relationship primitive. Operational circles auto-create; elective circles are manual.                  |
| **Upgrade Gate**       | UI component that blocks/blurs paid features for free-tier users. Never a locked button.                          |
| **Web Sourcing Panel** | Fallback when catalog searches return empty. DuckDuckGo search filtered to specialty retailers. Never a dead end. |

---

## Knowledge System

| Term                 | Definition                                                                                                                                        |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| **ChefTip**          | Quick, reflexive learning entry. One or two sentences. "What did you learn today?" Private by default. Can be shared per-item.                    |
| **ChefNote**         | Longer-form knowledge document. Two modes: journal entries (dated, reflective) and reference docs (topical, reusable). Private by default.        |
| **Tip-to-Note**      | Tips are raw material. Notes are refined product. Many tips link to one note. Tips can be promoted into notes.                                    |
| **Shared (boolean)** | Per-item opt-in toggle. Default `false` (private, tenant-scoped). `true` = discoverable by other chefs. No bulk sharing, no auto-sharing.         |
| **Linked Context**   | Tips/notes linking to real entities (Events, Recipes, Ingredients). "I learned this DURING this, ABOUT this."                                     |
| **Smart Surfacing**  | Three-layer resurfacing: (1) Passive (random, "on this day"), (2) Active (review queue), (3) Context-aware (before events, surface related tips). |

---

## Infrastructure vs Expansion

**Infrastructure** = the personal tool, built to 100%. Works offline, works alone, solves a real problem.

**Expansion** = social/discovery features built ON TOP of complete infrastructure.

Infrastructure ships first, complete. Expansion ships second, complete. Never half of each.

---

## Inventory and Supply Chain

| Term                      | Definition                                                                                                                            |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **Inventory Batch**       | A received quantity of an ingredient with expiry tracking.                                                                            |
| **Inventory Transaction** | A stock movement: `receive`, `event_deduction`, `waste`, `staff_meal`, `transfer`, `audit_adjustment`, `return`.                      |
| **Storage Location**      | Where inventory lives: `home_fridge`, `home_freezer`, `home_pantry`, `walk_in_cooler`, `commercial_kitchen`, `vehicle`, `event_site`. |
| **Purchase Order**        | A formal order to a vendor with line items.                                                                                           |
| **Waste Log**             | Food waste tracking. Reasons: `expired`, `damaged`, `overproduced`, `dropped`.                                                        |
| **Price Catalog**         | 15K+ ingredient prices from OpenClaw across 39+ local stores. Deterministic, not AI.                                                  |

---

## Communication

| Term                    | Definition                                                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Conversation**        | A communication thread. Context types: `standalone`, `inquiry`, `event`.                                         |
| **Communication Event** | A logged touchpoint. 16 channels (email, SMS, Instagram, website form, etc.). Directions: `inbound`, `outbound`. |
| **Unified Inbox**       | Database view aggregating all communication threads across channels.                                             |
| **Automated Sequence**  | Multi-step automated outreach campaign with enrollment tracking.                                                 |
| **Follow-Up Timer**     | Timed reminder to follow up on a conversation/inquiry.                                                           |

---

## Prep and Operations

| Term                  | Definition                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Prep Block**        | A scheduled preparation activity: `grocery_run`, `specialty_sourcing`, `prep_session`, `packing`, `travel_to_event`, `mental_prep`, `equipment_prep`, `admin`, `cleanup`. |
| **Station**           | A kitchen work area with assigned components and menu items.                                                                                                              |
| **Prep Timeline**     | Active timers, countdowns, station assignments, and alerts for event prep.                                                                                                |
| **Packing Checklist** | Equipment and ingredient packing list for transport to event site.                                                                                                        |
| **Travel Leg**        | A segment of the journey to/from an event site. Has mileage, ingredients carried.                                                                                         |

---

## Safety and Compliance

| Term                      | Definition                                                               |
| ------------------------- | ------------------------------------------------------------------------ |
| **HACCP Plan**            | Hazard Analysis Critical Control Point food safety plan.                 |
| **Event Temp Log**        | Temperature monitoring during events. Compliance requirement.            |
| **Allergen Cross-Check**  | Deterministic + AI analysis of allergen conflicts in menus. FDA Big 9.   |
| **Client Allergy Record** | Per-client allergy documentation. Feeds into Guest dietary restrictions. |

---

## Anti-Glossary (Terms We Do NOT Use)

| Avoid            | Use Instead                              | Why                                                     |
| ---------------- | ---------------------------------------- | ------------------------------------------------------- |
| Customer         | Client                                   | Clients have relationships, not transactions.           |
| Order            | Event or Booking                         | We're not a restaurant POS (except in commerce module). |
| Lead             | Inquiry (inbound) or Prospect (outbound) | Precision matters.                                      |
| User             | Chef, Client, Staff, or Partner          | Always use the specific role.                           |
| OpenClaw (in UI) | "system" or "engine"                     | Internal name forbidden from user-facing surfaces.      |
| Estimate         | Quote                                    | A Quote has line items and formal status.               |
| Template (alone) | Menu Template, Contract Template, etc.   | Always qualify which kind of template.                  |

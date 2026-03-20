# ChefFlow Gap Analysis: Uncreated Features Specification

> **Date:** 2026-03-20
> **Scope:** Full audit of 495 pages, 150+ tables, 221 lib modules, 18-stage chef workflow
> **Policy anchor:** AI_POLICY.md (AI assists drafting, never owns truth, never mutates canonical state)
> **Creative boundary:** AI never generates recipes, dictates ingredient choices, prescribes cooking methods, or designs plating. Recipes are the chef's intellectual property. Period.

---

## The "Team of Ten" Framework

Every feature below is designed as a tireless admin staffer, not a creative director. The AI's job is to handle the 90% of a chef's work that isn't cooking: logistics, scheduling, compliance, communication, financial tracking, inventory, and proactive alerts. The chef's job is the 10% that matters most: creative decisions, physical cooking, relationship moments, and final approval on everything client-facing.

**The hard test for every feature:** If you unplug AI tomorrow, ChefFlow still functions completely. AI makes the chef faster, never dependent.

---

## TIER 1: CRITICAL OPERATIONAL GAPS

These are the features a working chef would hit within their first month and ask "why can't I do this?"

---

### 1. Chef-Configurable Pricing Engine

**The problem:** 50+ pricing parameters are hardcoded in `lib/pricing/constants.ts`. A chef in Manhattan and a chef in rural Georgia share the same rates. No chef can customize deposit percentages, holiday premiums, add-on catalogs, or minimum booking requirements without a code deploy.

**What to build:**

- **Settings page:** `/settings/pricing` (already added to nav-config settingsShortcutOptions)
- **Database:** `chef_pricing_config` table (per-tenant pricing overrides)
- **Fields:**
  - Base rate tiers by party size (couples, small group, large group, custom breakpoints)
  - Custom add-on catalog (chef defines their own add-ons with names, prices, descriptions)
  - Deposit percentage (default 50%, configurable 0-100%)
  - Payment terms (net 7, net 14, net 30, custom)
  - Holiday premium tiers (chef picks which holidays, what percentages)
  - Weekend premium (on/off, percentage)
  - Travel pricing rules (per-mile rate, flat fee zones, free radius)
  - Minimum booking amount
  - Peak season dates and premium
  - Gratuity policy (included, suggested, none)
  - Course-type names (chef's own terminology instead of fixed 10 types)

**AI role:** None. This is pure configuration. Deterministic pricing formulas use these values instead of constants. Formula > AI, always.

**Priority:** Highest. Every chef needs unique pricing.

---

### 2. Task Dependencies & Prep Timeline

**The problem:** Tasks exist (`chef_todos`, `task_templates`, `daily_plan_drafts`) but have zero dependency modeling. A chef can't express "marinate chicken BEFORE grilling" or "pick up fish AFTER market opens at 6am." For complex multi-course events with 30+ prep steps, this is a real operational pain point.

**What to build:**

- **Database:** `task_dependency` table (`task_id`, `depends_on_task_id`, `dependency_type: finish_to_start | start_to_start`)
- **UI:** Drag-to-link dependencies in task list view. Visual timeline (Gantt-style) showing critical path.
- **Validation:** When a chef tries to mark a task complete, warn if upstream dependencies aren't done. When a chef drags a task earlier, warn if it violates constraints.
- **Auto-generation:** When an event is confirmed, generate prep tasks from `task_templates` with sensible default dependencies (e.g., "shop" before "prep", "prep" before "pack").

**AI role:** AI_POLICY category 2 (Structured Suggestions). AI may SUGGEST a prep timeline order based on past events with similar menus. Chef reviews, adjusts, and confirms. AI never auto-creates tasks.

**Priority:** High. This is the operational cockpit for event prep.

---

### 3. Contract Workflow Hub

**The problem:** `/contracts` route has `[id]` dynamic pages but no main listing page. `contract_templates` and `event_contracts` tables exist but there's no end-to-end workflow: create from template, customize, send for signature, track status, auto-attach to event.

**What to build:**

- **Landing page:** `/contracts` showing all contracts (draft, sent, signed, expired)
- **Template builder:** Select a template, fill event/client variables, preview
- **Send flow:** Email contract link to client. Client views and signs (simple checkbox + typed name, not full e-signature like DocuSign - keep it simple)
- **Status tracking:** Draft, Sent, Viewed, Signed, Expired (with auto-expiry after configurable days)
- **Event integration:** Auto-link contract to event. Readiness gate "contract_signed" blocks transition to confirmed if contract is required but unsigned.

**AI role:** AI_POLICY category 1 (Drafting Assistance). AI may draft contract language from structured event data (names, dates, terms). Chef reviews and edits before sending. AI never sends contracts.

**Priority:** High. Chefs working $5K+ events need signed agreements.

---

### 4. Packing List & Load-Out System

**The problem:** Document generation exists for grocery lists and prep sheets, but no structured packing system. Before every event, a chef needs to verify: equipment packed, ingredients packed, serving ware packed, linens packed. The readiness gate `packing_complete` exists on event transitions but nothing backs it up.

**What to build:**

- **Database:** `packing_list_templates` (reusable per event type), `event_packing_items` (per-event checklist)
- **UI:** Checklist view on event detail page. Tap to check off items. Show completion percentage.
- **Auto-populate:** When event is confirmed, generate packing list from: menu dishes (what equipment is needed), guest count (how many plates/glasses), event type template (outdoor = extra items).
- **Integration:** Link `packing_complete` readiness gate to actual packing list completion (100% checked = gate passes).

**AI role:** None. This is deterministic: if the menu has "seared scallops," the packing list includes a cast iron pan. Formula, not AI.

**Priority:** High. Forgetting equipment at home ruins events.

---

### 5. Real-Time Service Timeline (Fire Order)

**The problem:** During `in_progress` state, there's no structured fire order or service timeline. Chefs need a live, tappable sequence: "6:00 PM - Pass canapes. 6:30 - Fire first course. 6:45 - Plate and serve." Nothing tracks "Course 2 fired at 7:12 PM" or "Running 8 minutes behind."

**What to build:**

- **Database:** `event_timeline_entries` (`event_id`, `planned_time`, `actual_time`, `label`, `status: pending | fired | served | skipped`, `notes`)
- **UI:** Full-screen mobile-friendly timeline view. Large tap targets (chef's hands may be wet/gloved). Tap to mark "fired" or "served." Shows delta between planned and actual. Color-codes ahead/behind.
- **Template:** Generate timeline from menu courses + event start time + estimated course gaps.
- **Post-event:** Timeline data feeds into After-Action Review (was service on time? which courses ran late?).

**AI role:** AI_POLICY category 2. AI may SUGGEST course timing gaps based on historical events with similar guest counts and menu complexity. Chef sets final times.

**Priority:** High. This is the day-of operational cockpit.

---

### 6. Allergen Cross-Check Engine

**The problem:** Allergen data exists on ingredients (`ingredients` table) and client/guest preferences (`event_guests`, `clients.dietary`). But there's no real-time validation that connects menu dishes to guest allergies to ingredient allergens. A chef could unknowingly serve tree nuts to an allergic guest.

**What to build:**

- **Validation layer:** When a dish is added to an event menu, cross-reference:
  - `recipe_ingredients` for that dish
  - `ingredients.allergens` for each ingredient
  - `event_guests.dietary_restrictions` + `clients.allergies` for all guests on this event
- **Alert UI:** Red warning badge on dish in menu builder: "CONFLICT: Praline garnish contains almonds. Guest #3 (Sarah Chen) has tree nut allergy."
- **Resolution:** Chef can dismiss (with reason logged: "substituting garnish"), remove dish, or modify recipe.
- **Pre-transition gate:** Before `confirmed` state, surface unresolved allergen conflicts as a blocking warning (not a hard block, chef can override with acknowledgment).

**AI role:** None. This is deterministic data cross-referencing. Math, not AI. Ingredient A contains allergen X. Guest B has allergy X. Alert. No LLM needed.

**Priority:** Critical (safety). This prevents medical emergencies.

---

### 7. Client-Facing Event Portal

**The problem:** Clients can accept quotes and pay, but there's no unified portal where they can view upcoming event details, see the menu, confirm guest count, update dietary restrictions, or view photos after. Everything is email-driven, generating "can you resend the details?" messages.

**What to build:**

- **Route:** `/client/event/[id]` (public-ish, authenticated by client role)
- **Sections:**
  - Event overview (date, time, location, guest count)
  - Menu (courses, dishes, dietary notes - read-only)
  - Guest list (client can add/edit guests, update dietary info, RSVP)
  - Timeline (simplified view of service plan)
  - Documents (contract, invoice, receipts)
  - Photos (post-event gallery, if chef uploads)
  - Messages (link to conversation thread)
- **Permissions:** Client can VIEW everything. Client can EDIT: guest list, dietary info, guest count (within change window). Client cannot edit menu, pricing, or timeline.

**AI role:** None. This is a read/write portal for structured data. No AI involvement.

**Priority:** High. Reduces 80% of "can you send me the details again?" messages.

---

## TIER 2: STRATEGIC GAPS (COMPETITIVE DIFFERENTIATORS)

---

### 8. Weather-Aware Event Alerts

**The problem:** Many private chef events are outdoors. No weather data is pulled for event dates/locations. A chef could show up to a rooftop dinner in a thunderstorm with no contingency plan.

**What to build:**

- **Integration:** Free weather API (Open-Meteo, no API key needed) queried for events with outdoor venue type.
- **Alert timing:** 72h, 48h, 24h before event if adverse weather predicted.
- **Alert content:** "Rain expected Saturday 6-9 PM at event location. 70% chance. Consider indoor contingency."
- **Where shown:** Event detail page weather badge. Daily briefing (`/briefing`). Push notification.

**AI role:** None. Weather API returns data. Threshold comparison is deterministic. "Rain probability > 60% AND event.venue_type = outdoor" = alert. Formula, not AI.

---

### 9. Living Seasonal Ingredient Engine

**The problem:** `seasonal_palettes` exists as a static table. `lib/calendar/seasonal-produce.ts` has a hardcoded JSON list. Nothing tells a chef in New England in March "ramps and fiddleheads are in season right now" when they're building menus.

**What to build:**

- **Database:** Expand `seasonal_palettes` with region-aware seasonality data. Source from USDA seasonal produce guides (public domain).
- **UI in menu builder:** "In Season Now" sidebar showing ingredients that are currently peak-season in the chef's region (derived from `chefs.location` or manually set region).
- **Menu badge:** When a dish uses seasonal ingredients, show a "Seasonal" badge on the menu (client-facing value-add).
- **Chef-customizable:** Chef can add their own seasonal notes ("my farmer has early asparagus starting Feb").

**AI role:** None. Seasonality is calendar math + geography lookup. Deterministic.

---

### 10. Vendor Lead Time & Availability Tracking

**The problem:** `vendor_items` tracks price and unit, but not lead time, minimum order, delivery schedule, or current availability. When shopping for a Saturday event on Wednesday, the chef needs to know which vendors can deliver in time.

**What to build:**

- **Database columns on `vendor_items`:** `lead_time_days`, `minimum_order_amount`, `delivery_days` (bitmask or array: Mon/Wed/Fri), `notes`
- **UI:** When generating a shopping list for an event, flag items where vendor lead time exceeds days until event. Suggest alternative vendors with shorter lead times.
- **Vendor profile:** Each vendor gets delivery schedule, ordering cutoff times, contact info, notes.

**AI role:** None. "Event is in 2 days. Vendor A lead time is 3 days. Flag." Arithmetic.

---

### 11. Client Taste Profile (Cumulative Learning)

**The problem:** After every event, there's valuable taste data scattered across notes, `dish_feedback`, and client preferences. No system aggregates "The Smiths loved the lamb but didn't touch the beet salad. They always request extra bread." into a structured profile.

**What to build:**

- **Database:** `client_taste_profile` table (`client_id`, `ingredient_or_dish`, `sentiment: loved | liked | neutral | disliked`, `frequency`, `source: dish_feedback | chef_note | explicit_preference`, `last_updated`)
- **Auto-populate:** After each event, prompt chef: "How did the Smiths feel about each course?" (quick thumbs up/down per dish). Aggregate into profile.
- **Surface in menu builder:** When building a menu for a returning client, show taste profile sidebar: "Loves: lamb, seafood, chocolate. Dislikes: beets, blue cheese. Notes: always requests extra bread."

**AI role:** AI_POLICY category 3 (Insight Surfaces, read-only). AI may surface patterns from historical feedback ("The Smiths have ordered seafood-heavy menus 4 out of 5 times"). AI never modifies the profile. Chef confirms/edits.

---

### 12. Revenue Forecasting Engine

**The problem:** `/finance/forecast` and `/finance/cash-flow` routes exist but the models are thin. Real forecasting needs confirmed pipeline, seasonal curves, expense projections, and payment schedule modeling.

**What to build:**

- **Confirmed pipeline:** Sum of confirmed/paid events by month (known revenue)
- **Proposed pipeline:** Weighted by historical conversion rate (proposed events x win rate)
- **Seasonal curve:** Historical revenue by month, overlaid on current year
- **Expense projection:** Average expense ratio per event type x upcoming events
- **Cash flow timing:** When deposits land vs. when final payments arrive vs. when vendor invoices are due
- **Tax liability estimate:** Running quarterly estimate based on YTD income - expenses

**AI role:** None. This is math on existing ledger data, event pipeline, and historical patterns. Formulas and aggregations. No LLM.

---

### 13. Multi-Chef Event Coordination

**The problem:** `event_collaborators` table exists but collaboration workflow is minimal. Large events requiring 2-3 chefs lack shared prep assignments, station ownership, split financial settlement, coordinated timelines, or shared grocery lists.

**What to build:**

- **Collaborator dashboard:** Each collaborator sees their assigned stations, prep tasks, and timeline entries only
- **Station ownership:** Assign courses/stations to specific collaborators
- **Split settlement:** Define revenue split (percentage or fixed) per collaborator. After event completion, generate settlement records in ledger.
- **Shared grocery list:** Consolidated shopping list with items grouped by who's responsible
- **Coordination timeline:** Combined timeline showing all collaborators' tasks in one view (event owner sees everything, collaborators see their slice)

**AI role:** AI_POLICY category 2. AI may SUGGEST task splits based on station assignments and historical patterns. Chef approves all assignments.

---

### 14. Recurring Service Automation

**The problem:** `recurring_services` table exists. Many private chefs have weekly clients (meal prep every Monday). The system should auto-generate events from templates, auto-populate menus, and track consistency. The table is there but no workflow drives it.

**What to build:**

- **Recurring agreement setup:** Client, frequency (weekly/biweekly/monthly), default menu (optional), default rate, start/end dates
- **Auto-generation:** Cron job creates draft events N days ahead (configurable). Chef reviews and confirms.
- **Menu rotation:** Optional rotating menu (week 1, week 2, week 3, repeat). Chef builds the rotation, system applies it.
- **Streak tracking:** "12 consecutive weeks with the Johnsons" (client relationship metric)
- **Billing:** Auto-generate invoices on schedule or batch monthly

**AI role:** None. Recurring events are template instantiation on a schedule. Calendar math.

---

### 15. Smart Pricing Insights

**The problem:** The system has historical data on what the chef charged for similar events. It should surface benchmarks during quoting.

**What to build:**

- **Quote builder sidebar:** When creating a quote, show:
  - Chef's average quote for similar events (same guest count range, same event type)
  - Chef's win rate at this price point
  - Chef's highest and lowest accepted quotes for similar events
- **Trend line:** "Your average dinner party quote has increased 12% this year"

**AI role:** AI_POLICY category 3 (Insight Surfaces, read-only). These are database aggregations displayed as read-only context. No AI generates the numbers. No AI suggests what to charge. Chef sets their own price, always.

**Creative boundary note:** AI never suggests "charge more/less." It shows historical data. The chef interprets it.

---

### 16. Dietary Complexity Scoring

**The problem:** "No pork" is trivial. "Vegan + gluten-free + low-FODMAP + nut allergy" affects menu options, prep time, ingredient cost, and cross-contamination risk. The system should quantify this.

**What to build:**

- **Scoring formula:** Each dietary restriction has a complexity weight (stored in config, not AI-generated):
  - Single exclusion (no pork, no shellfish): weight 1
  - Lifestyle diet (vegetarian, vegan): weight 2
  - Medical allergy (nuts, dairy, gluten): weight 3
  - Complex protocol (low-FODMAP, AIP, ketogenic): weight 4
  - Combine per-guest, aggregate per-event
- **Surface in quoting:** "This event has a dietary complexity score of 14 (high). Consider complexity surcharge."
- **Surface in menu builder:** "3 of 8 guests have restrictions that conflict with this dish."

**AI role:** None. Complexity scoring is a weighted sum. Deterministic.

---

## TIER 3: INNOVATIVE FEATURES (NO COMPETITOR HAS THIS)

---

### 17. "What If" Menu Simulator

**The problem:** Before finalizing a menu, a chef can't run impact simulations. "What if I swap lamb for duck?" should instantly show: food cost change, prep time change, allergen conflicts introduced/resolved, and margin impact.

**What to build:**

- **UI:** "Simulate Swap" button on each dish in menu builder. Select replacement dish. See side-by-side comparison:
  - Food cost delta (from `recipe_ingredients` pricing)
  - Prep time delta (from recipe prep estimates)
  - Allergen changes (new conflicts or resolved conflicts vs. guest list)
  - Ingredient overlap with other courses (efficiency metric)
  - Margin impact on quote
- **No persistence:** Simulation is ephemeral until chef confirms the swap.

**AI role:** None. All data comes from existing recipe costing, ingredient allergens, and prep estimates. Pure math.

---

### 18. Event Risk Assessment Score

**The problem:** Some events are inherently riskier than others. The system should auto-calculate a risk score to help chefs prepare accordingly.

**What to build:**

- **Scoring formula (deterministic, configurable weights):**
  - Guest count > 20: +2
  - Dietary complexity score > 10: +3
  - Distance from home > 50 miles: +2
  - Outdoor venue: +2
  - New client (first event): +1
  - Multi-chef collaboration: +2
  - Event total > $5,000: +1
  - No backup chef designated: +2
- **Surface:** Risk badge on event card (Low/Medium/High). High-risk events prompt: "Consider: backup chef, extra prep time, contingency menu."
- **Not a blocker:** Risk score is informational only. Chef decides what to do with it.

**AI role:** None. Weighted formula on event attributes. Deterministic.

---

### 19. Ingredient Price Memory & Inflation Tracking

**The problem:** Every time a chef logs a grocery receipt, that's a price data point. Over time, the system should build price history: "chicken breast was $3.99/lb in January, $5.29/lb now." Alert when commonly-used ingredients spike.

**What to build:**

- **Database:** `ingredient_price_history` (`ingredient_id`, `vendor_id`, `price_per_unit`, `unit`, `recorded_at`, `source: receipt_extraction | manual | vendor_invoice`)
- **Auto-populate:** When `receipt_line_items` are processed, match to `ingredients` table and log price point.
- **Alert:** When an ingredient's current price is >20% above its 90-day average, flag it on the costing page: "Salmon up 25% since last month."
- **Trend view:** Sparkline per ingredient showing 12-month price history.
- **Recipe cost auto-update:** Recipe costing uses most recent price point automatically.

**AI role:** None. Price comparison is arithmetic. Trend detection is threshold comparison.

---

### 20. Client Touchpoint & Gifting Automation

**The problem:** Private chefs build personal relationships. The system tracks client birthdays, anniversaries, event history, and lifetime spend. But nobody wires this data into proactive touchpoint reminders.

**What to build:**

- **Database:** `client_touchpoint_rules` (per-chef configurable triggers)
- **Default triggers:**
  - Client birthday approaching (7 days out)
  - Client anniversary approaching (7 days out)
  - N days since last event (configurable: 60, 90, 120 days)
  - Client lifetime spend milestone ($5K, $10K, $25K)
  - Client streak milestone (5th, 10th, 20th event)
- **Action:** Surface in daily briefing and dashboard: "Sarah Chen's birthday is March 27. She's been a client for 2 years (14 events, $22K lifetime). Consider a touchpoint."
- **Chef decides the action.** System reminds. Chef chooses whether/how to act (send a note, gift a jar of jam, offer a discount). AI never decides the gesture.

**AI role:** None. Date math and threshold comparison. The chef's relationship instincts drive the actual action.

---

### 21. True Plate Cost Dashboard

**The problem:** During menu building, chefs see ingredient cost per recipe. But true plate cost includes labor, equipment wear, travel, and overhead. No platform shows this.

**What to build:**

- **Formula per plate:**
  - Raw ingredient cost (from `recipe_ingredients`)
  - Labor allocation: estimated prep hours x chef's hourly rate (configurable in pricing settings)
  - Equipment depreciation per use (from `equipment_depreciation_schedules`)
  - Travel cost allocation (total event travel / guest count)
  - Overhead allocation (monthly fixed costs / monthly events / avg guest count) - configurable
- **UI:** Live "True Plate Cost" counter in menu builder that updates as dishes are added/removed. Breakdown tooltip showing each component.
- **Margin view:** "True plate cost: $47.23. Quote per person: $185. True margin: 74.5%"

**AI role:** None. Pure math on existing data sources.

---

### 22. Post-Event Content Pipeline

**The problem:** After every event, a chef has photos, a menu, and a story to tell. The path from "event completed" to "social media post ready" is entirely manual.

**What to build:**

- **Auto-trigger:** When event transitions to `completed` and `event_photos` exist, create a "Content Draft" entry.
- **Content package:**
  - Pull event photos from `event_photos`
  - Pull menu text from `menus` / `dishes`
  - Pull event type, guest count, location
  - Check NDA/photo permission status from `event_contracts` or `settings/protection/nda`
- **Draft templates:** Chef selects a template (Instagram carousel, story, blog post). System pre-fills with structured data (event name, dishes served, location).
- **Chef edits and posts.** System never auto-publishes. Chef writes their own captions, selects their favorite photos, adjusts tone.

**AI role:** AI_POLICY category 1 (Drafting Assistance). AI may draft a caption from structured event data ("4-course dinner for 12 in Back Bay featuring pan-seared halibut..."). Chef edits freely. AI never posts. AI never chooses photos. AI never decides which events to share.

**Creative boundary:** The chef's social media voice is their brand. AI provides a starting point with facts. Chef makes it their own.

---

### 23. Voice-First Kitchen Mode

**The problem:** During active cooking, chefs can't touch screens (wet/dirty/gloved hands). A voice mode where the chef says "next step", "start timer 12 minutes", or "mark sauce complete" would be transformative.

**What to build:**

- **Web Speech API:** Browser-native, works in Chrome PWA. No external service needed (data stays local).
- **Commands (deterministic, not AI):**
  - "Next step" / "Previous step" - navigate prep checklist
  - "Timer [N] minutes" - start a countdown timer
  - "Mark [task] complete" - check off a task
  - "Add note: [text]" - append a note to current task
  - "What's next?" - read aloud the next pending task
- **Visual:** Large, high-contrast display. Timer visible from across kitchen. Audio alerts for timer completion.
- **Activation:** Toggle "Kitchen Mode" from any task/timeline view. Switches to voice-enabled, large-text, high-contrast UI.

**AI role:** None. Voice commands map to deterministic actions. "Timer 12 minutes" starts a 12-minute timer. No LLM interprets the command. Speech-to-text API converts audio to text, simple string matching maps to actions.

---

### 24. Chef Operational Health Score

**The problem:** A chef has no single metric for "how is my business doing?" They'd need to check response time, conversion rate, margins, client retention, and calendar utilization across multiple pages.

**What to build:**

- **Composite score (0-100):** Weighted formula:
  - Inquiry response time (avg hours to first response): 15%
  - Quote-to-booking conversion rate: 20%
  - On-time event completion rate: 10%
  - Client repeat rate (% of clients who book again within 12 months): 15%
  - Average review score: 10%
  - Profit margin trend (improving/stable/declining): 15%
  - Calendar utilization (booked days / available days): 15%
- **Dashboard widget:** Single number with trend arrow. Tap to expand into component breakdown.
- **Monthly trend:** Sparkline showing score over past 12 months.
- **No benchmarking against other chefs** (privacy). Only benchmarking against the chef's own history.

**AI role:** None. Weighted average of database-derived metrics. Deterministic.

---

### 25. Emergency Ingredient Substitution Database

**The problem:** Mid-prep, a chef discovers an ingredient is unavailable or spoiled. They need instant answers: "What can replace tarragon?" This is NOT recipe generation. It's ingredient equivalency reference data.

**What to build:**

- **Database:** `ingredient_substitutions` (`ingredient_id`, `substitute_ingredient_id`, `ratio`, `flavor_impact_notes`, `texture_notes`, `best_for: sauce | baking | garnish | all`)
- **Source:** Curated data (entered by the development team or community-sourced), NOT AI-generated.
- **UI:** Search from any ingredient view: "Substitutes for tarragon" shows "chervil (1:1, milder), fennel fronds (1:2, more anise), dried tarragon (1:3, concentrated)."
- **Integration:** On recipe ingredient view, "Find Substitute" button. When viewing inventory shortages, suggest substitutes automatically.

**AI role:** None. This is a lookup table of curated equivalencies. No LLM generates substitution advice. The chef's experience guides the final decision.

**Creative boundary note:** The substitution database says "chervil can replace tarragon at 1:1 ratio." The CHEF decides whether that substitution works for THEIR dish, THEIR flavor profile, THEIR guests. The database is a reference, not a prescription.

---

### 26. Equipment Maintenance & Calibration Tracking

**The problem:** `equipment_items` exists but there's no maintenance schedule. Knife sharpening, thermometer calibration, immersion circulator descaling, van oil changes. Alert the chef before things break.

**What to build:**

- **Database columns on `equipment_items`:** `maintenance_interval_days`, `last_maintained_at`, `next_maintenance_due`, `maintenance_notes`
- **Alert:** When `next_maintenance_due` is within 7 days, show in daily briefing and dashboard.
- **Log:** `equipment_maintenance_log` (`equipment_id`, `maintained_at`, `type: sharpening | calibration | cleaning | repair | inspection`, `notes`, `cost`)
- **Insurance integration:** Equipment maintenance log serves as proof of proper upkeep for insurance claims.

**AI role:** None. Date math. "Last sharpened 14 days ago. Interval is 14 days. Due today."

---

## UNDEREXPOSED EXISTING FEATURES (WIRE THEM IN)

These are built but not adequately surfaced. No new code needed for the core, just connections.

| #   | Feature                    | Where It Lives                      | What's Missing            | Fix                                                                                                                             |
| --- | -------------------------- | ----------------------------------- | ------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Dish Feedback history      | `dish_feedback` table               | Not shown in menu builder | Show "4.2/5 from last 3 events" badge on dishes when building menus                                                             |
| 2   | Recipe Production Log      | `recipe_production_log`             | Never surfaced            | Show "Your most-cooked recipes" on recipe library page                                                                          |
| 3   | Client Spending History    | `/clients/history/spending-history` | Not used in quoting       | Show "Client avg spend: $2,400" in quote builder sidebar                                                                        |
| 4   | Automation Rule Templates  | `automation_rules` engine           | No pre-built templates    | Ship 10 common templates: "auto-follow-up after 48h no response", "send thank-you 24h after event", etc.                        |
| 5   | Served Dish History        | `served_dish_history`               | No variance reporting     | Show "Planned vs. Served" comparison on AAR page                                                                                |
| 6   | Goal Snapshots             | `goal_snapshots`                    | No trend visualization    | Add sparkline trend to goals page                                                                                               |
| 7   | Travel Leg Ingredients     | `travel_leg_ingredients` table      | No UI references it       | Show on packing list / event detail page                                                                                        |
| 8   | After-Action Reviews       | `/aar`                              | Not auto-triggered        | Prompt chef 24h after event completion: "Ready to review?"                                                                      |
| 9   | Communication Triage Rules | `communication_triage`              | No suggested rules        | Suggest rules based on inquiry patterns: "You respond to dinner inquiries 3x faster than corporate. Auto-prioritize corporate?" |

---

## PRIORITY IMPLEMENTATION ORDER

### Phase 1: Foundation (Do First)

1. **Allergen Cross-Check Engine** (#6) - Safety critical, all data exists, validation layer only
2. **Chef-Configurable Pricing** (#1) - Unblocks every chef's unique business model
3. **Client-Facing Event Portal** (#7) - Immediate client communication reduction
4. **Surface Dish Feedback in Menu Builder** (Underexposed #1) - Zero new code, just wire data

### Phase 2: Operational Cockpit (Do Next)

5. **Task Dependencies & Prep Timeline** (#2) - Core operational feature
6. **Packing List System** (#4) - Prevents day-of disasters
7. **Real-Time Service Timeline** (#5) - Day-of execution cockpit
8. **Contract Workflow Hub** (#3) - Professional workflow completion
9. **Recurring Service Automation** (#14) - Revenue stability for weekly clients

### Phase 3: Intelligence Layer (Strategic)

10. **Client Taste Profile** (#11) - Relationship depth
11. **Revenue Forecasting Engine** (#12) - Business planning
12. **Ingredient Price Memory** (#19) - Cost awareness
13. **Smart Pricing Insights** (#15) - Quoting confidence
14. **Dietary Complexity Scoring** (#16) - Pricing justification

### Phase 4: Differentiation (Innovative)

15. **"What If" Menu Simulator** (#17) - Creative planning tool
16. **Post-Event Content Pipeline** (#22) - Marketing efficiency
17. **Chef Health Score** (#24) - Business at a glance
18. **Weather-Aware Alerts** (#8) - Proactive planning
19. **Voice-First Kitchen Mode** (#23) - Hands-free operations
20. **Client Touchpoint Automation** (#20) - Relationship nurturing

### Phase 5: Depth

21. **Equipment Maintenance Tracking** (#26)
22. **Vendor Lead Time Tracking** (#10)
23. **Seasonal Ingredient Engine** (#9)
24. **Emergency Substitution Database** (#25)
25. **Multi-Chef Coordination** (#13)
26. **True Plate Cost Dashboard** (#21)
27. **Event Risk Assessment** (#18)

---

## AI COMPLIANCE CHECKLIST

Every feature above was designed against these hard rules:

- [ ] AI never generates, suggests, or fabricates recipes
- [ ] AI never dictates ingredient choices, cooking methods, or plating
- [ ] AI never owns canonical state (ledger, lifecycle, identity)
- [ ] AI never auto-sends, auto-confirms, auto-approves, or auto-triggers
- [ ] AI suggestions are visually distinct, clearly labeled, and require chef confirmation
- [ ] If AI is removed, the feature still functions completely
- [ ] Formula/deterministic code is used wherever possible instead of AI
- [ ] Private data (client PII, financials, allergies) stays local (Ollama only, never cloud)

**Of the 27 features specified above:**

- 20 use ZERO AI (pure deterministic logic, formula, calendar math, data cross-referencing)
- 5 use AI_POLICY category 2 or 3 (suggestions/insights, read-only, chef confirms)
- 2 use AI_POLICY category 1 (drafting assistance, chef edits and commits)
- 0 use AI for creative culinary decisions

The chef's creative domain is untouched. The admin burden is eliminated.

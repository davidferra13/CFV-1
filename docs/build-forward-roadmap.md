# ChefFlow Build Forward Roadmap

**Created:** March 6, 2026
**Status:** Planning
**Context:** ChefFlow has 295+ pages across 13 domains. The core platform is complete. These are the features that would move the needle for working private chefs.

---

## Priority Order (by real-world impact)

### Phase 1 - Revenue Drivers (build first)

These directly help chefs book more, retain more, and earn more.

#### 1A. Post-Event Follow-Up Sequences

**Why first:** Costs nothing to build, drives repeat bookings, works while the chef sleeps.
**What it does:**

- After an event completes, a configurable drip sequence fires automatically
- Default sequence (chef can customize):
  - Day 1: Thank you + event photos (if attached)
  - Day 14: "Loved cooking for you, here's what's in season now" rebooking nudge
  - Day 90: Seasonal menu teaser + loyalty points reminder
- Each email is a draft (Remy generates, chef approves before send per AI_POLICY)
- Sequences pause if client books again (no "come back" email to someone who already booked)
- Tracks: open rate, click rate, rebooking conversion

**Touches:**

- New: `lib/follow-up/sequence-engine.ts` (scheduler + state machine)
- New: `lib/follow-up/sequence-templates.ts` (default sequences)
- New: `app/(chef)/settings/follow-up/page.tsx` (customize sequences)
- New: `components/events/post-event-sequence-panel.tsx` (per-event sequence status)
- Extends: Event detail overview tab (show sequence status after completion)
- Extends: `lib/email/` (new template types)
- Extends: Remy context (sequence status per client)

**Migration:** `follow_up_sequences` table, `follow_up_steps` table, `follow_up_sends` table (tracks each send + status)

---

#### 1B. Client Menu Proposals (Visual Selling)

**Why:** The quote already exists. But a private chef selling a $3,000 dinner with a plain text menu vs. a beautiful visual proposal is the difference between "let me think about it" and "yes."
**What it does:**

- Chef builds a menu (already works), then clicks "Create Proposal"
- Generates a shareable page: dish photos, descriptions, wine pairings, the story
- Client sees a polished presentation (not a form, not a spreadsheet)
- "Approve Menu" button on the proposal triggers menu approval status
- Proposal link works without login (token-gated, like guest portal)
- Chef can add a personal note/video message at the top

**Touches:**

- New: `app/(public)/proposal/[token]/page.tsx` (public proposal view)
- New: `lib/proposals/proposal-actions.ts` (create, update, share)
- New: `components/proposals/proposal-builder.tsx` (chef-side builder)
- New: `components/proposals/proposal-public-view.tsx` (client-side view)
- Extends: Menu system (link menu to proposal)
- Extends: Event detail (proposal status + link)
- Extends: Quote flow (attach proposal to quote)

**Migration:** `proposals` table (links to event + menu, has token, status, viewed_at)

---

### Phase 2 - Visual Identity (build second)

These make the chef look professional and build their brand over time.

#### 2A. Event Photo Management

**Why:** Every chef photographs their work. Right now those photos live in their phone camera roll, disconnected from everything. Connecting photos to events creates a living portfolio, powers proposals (1B), and feeds social media (2B).
**What it does:**

- On the event detail page: "Add Photos" button, drag-and-drop upload
- Photos tagged to event, client, dishes, and menu items
- Auto-generates a portfolio from tagged photos (filterable by cuisine, event type, season)
- Client can see their event photos on the guest portal
- Photos available in proposal builder (1B) and follow-up emails (1A)
- Storage: Supabase Storage bucket (already have infra)

**Touches:**

- New: `lib/photos/photo-actions.ts` (upload, tag, delete, reorder)
- New: `components/photos/event-photo-gallery.tsx` (upload + grid on event detail)
- New: `components/photos/portfolio-gallery.tsx` (public portfolio view)
- New: `app/(chef)/portfolio/page.tsx` (chef's portfolio management)
- New: `app/(public)/portfolio/[chefId]/page.tsx` (public portfolio)
- Extends: Event detail page (new Photos tab or section)
- Extends: Guest portal (event photos section)
- Extends: Proposal builder (pull photos by event/dish)

**Migration:** `event_photos` table (event_id, storage_path, caption, tags jsonb, sort_order, is_portfolio)

---

#### 2B. Social Media Content Pipeline

**Why:** Instagram is the #1 marketing channel for private chefs. Period. If ChefFlow can help a chef go from "event done" to "posted on Instagram" in 2 clicks, that's massive.
**What it does:**

- After an event, chef selects photos from the event gallery (2A)
- Remy drafts a caption (tone-matched to chef's brand voice, no hashtag spam)
- Chef edits/approves the caption
- "Copy to clipboard" or "Schedule post" (via Buffer/Later API integration, or just clipboard for V1)
- Tracks which events have been posted about (don't nag about events already shared)
- Optional: auto-suggest "post-worthy" events based on photo quality/event type

**Touches:**

- New: `components/social/post-composer.tsx` (select photos + edit caption)
- New: `lib/social/caption-actions.ts` (Remy-generated captions, chef approves)
- New: `app/(chef)/marketing/social/page.tsx` (social content calendar/queue)
- Extends: Event detail (quick "Share on social" action)
- Extends: Event photo gallery (select photos for post)
- Depends on: 2A (Event Photo Management)

**Migration:** `social_posts` table (event_id, platform, caption, status, posted_at)

---

### Phase 3 - Operational Depth (build third)

These make existing features deeper and more useful for specific workflows.

#### 3A. Staff Portal (Deep)

**Why:** Sous chefs and staff currently have 6 light pages. A staff member showing up to a 50-person dinner needs: what am I making, what's the timeline, where are things, who's allergic to what. On their phone.
**What it does:**

- Staff member gets a text/email link before each event (no app login required, token-gated)
- They see: event schedule, their assigned station/tasks, dietary alerts, packing list, venue address + map
- Real-time updates if chef changes the schedule
- Staff can mark tasks complete (chef sees progress)
- Post-event: staff can log hours (feeds into labor cost tracking)

**Touches:**

- New: `app/(public)/staff/[token]/page.tsx` (staff event view, no auth required)
- New: `lib/staff/staff-portal-actions.ts` (generate links, task updates)
- New: `components/staff/staff-event-view.tsx` (mobile-optimized event briefing)
- Extends: Event detail staff panel (send portal links)
- Extends: Schedule system (staff task assignments)
- Extends: Labor cost tracking (staff-submitted hours)

**Migration:** `staff_event_tokens` table (staff_id, event_id, token, expires_at)

---

#### 3B. Recurring Meal Prep Operations

**Why:** Weekly meal prep clients are a different business model than event clients. Same chef, different workflow. Right now recurring services exist but the operations side (rotating menus, container tracking, delivery windows) is thin.
**What it does:**

- Meal prep "program" tied to a client: weekly cadence, delivery day, container count
- Rotating menu system: chef sets a 4-week rotation, system auto-assigns next week's menu
- Container tracking: how many out, how many returned (deposit system optional)
- Delivery scheduling: time windows, address, special instructions
- Auto-generates grocery list for the week's meal prep clients (consolidates across clients)
- Financial: recurring invoicing tied to the program (already have Stripe infra)

**Touches:**

- New: `app/(chef)/meal-prep/page.tsx` (meal prep dashboard)
- New: `app/(chef)/meal-prep/[programId]/page.tsx` (program detail)
- New: `lib/meal-prep/program-actions.ts` (CRUD, rotation logic)
- New: `components/meal-prep/weekly-planner.tsx` (drag-drop menu rotation)
- Extends: Grocery consolidation (include meal prep in weekly list)
- Extends: Calendar (show meal prep blocks)
- Extends: Recurring services (deeper operational layer)

**Migration:** `meal_prep_programs` table, `meal_prep_weeks` table, `meal_prep_containers` table

---

#### 3C. Nutritional Analysis Per Menu

**Why:** Health-conscious clients (athletes, post-surgery, keto, medical diets) increasingly want macro breakdowns. This is a Pro feature, not core.
**What it does:**

- Chef toggles "Show nutrition" on a menu
- System pulls nutritional data from recipe ingredients (Spoonacular API already integrated)
- Per-dish and per-menu breakdown: calories, protein, carbs, fat, common allergens
- Displayed on the client proposal (1B) and guest portal
- Chef can override/adjust values (AI-generated numbers are drafts, chef is authority)

**Touches:**

- New: `lib/nutrition/analysis-actions.ts` (calculate from ingredients via Spoonacular)
- New: `components/nutrition/nutrition-card.tsx` (display component)
- Extends: Menu detail page (nutrition toggle + display)
- Extends: Proposal view (nutrition section)
- Extends: Guest portal (dietary info)
- Tier: **Pro** (module: nutrition-analysis)

**Migration:** `menu_nutrition` table (menu_id, dish_id, calories, protein_g, carbs_g, fat_g, allergens jsonb, source, chef_override boolean)

---

## Build Order Summary

```
Phase 1 (Revenue)          Phase 2 (Visual)           Phase 3 (Ops)

1A. Follow-Up Sequences    2A. Event Photos           3A. Staff Portal Deep
1B. Menu Proposals         2B. Social Pipeline         3B. Meal Prep Ops
                                                       3C. Nutritional Analysis
```

**Dependencies:**

- 1B (Proposals) is better with 2A (Photos) but can ship without them (text-only proposals still work)
- 2B (Social) requires 2A (Photos) - must build in order
- 3C (Nutrition) uses existing Spoonacular integration, independent
- Everything else is independent and can be parallelized

**Tier assignments:**

- 1A, 1B, 2A: **Free** (core business operations)
- 2B, 3B, 3C: **Pro** (advanced features)
- 3A: **Free** (staff coordination is core ops)

---

## What This Does NOT Include

Things that are already solid and don't need more work right now:

- Event FSM (complete, 8 states)
- Financial system (ledger-first, 78+ pages)
- Client CRM (30+ detail panels)
- Calendar (7 views)
- Recipes and menus (full CRUD + costing)
- Inquiry pipeline (GOLDMINE scoring, smart fill)
- Remy AI concierge (100% test pass rate)
- Loyalty program (hardwired everywhere)
- Compliance and food safety
- Contracts and e-signing
- Equipment and vendor tracking
- Marketing campaigns

These are done. Ship them, use them, iterate based on beta tester feedback.

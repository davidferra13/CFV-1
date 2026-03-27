# Spec: Spring Surge Command Center

> **Status:** draft
> **Priority:** P0 (blocking)
> **Depends on:** none (all infrastructure exists)
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-27
> **Built by:** not started

---

## What This Does (Plain English)

When a chef's inbox explodes with inquiries from every direction (Wix forms, Instagram DMs, emails, texts, third-party sites like Private Chef Manager), they need ONE screen that shows every open thread, its completeness, what's blocking progress, and what can be auto-generated right now. This spec sharpens the existing inquiry pipeline, dashboard priority queue, and document generation system so that a chef going from 0 to 15 dinners in a week can process, price, respond, and prep without anything falling through the cracks. No new systems. No overhauls. Quality-of-life improvements to what already works.

---

## Why It Matters

This is the exact problem ChefFlow was built to solve, and it's happening right now. Spring season is live. Inquiries are flooding in from 5+ channels simultaneously. The infrastructure exists (multi-source inquiries, GOLDMINE scoring, document generators, grocery costing APIs, dinner circles). The gap is in how fast and seamlessly a chef can move from "inquiry received" to "fully priced, menu set, documents generated, client informed" without manually juggling tabs, remembering conversations, or generating documents one at a time.

This is not unique to one chef. Every private chef hits this wall in spring and fall. Solving it well is the product's core value proposition.

---

## Problem Decomposition

The brain dump reveals five distinct pain points. Each one maps to existing infrastructure that needs sharpening, not building:

### Pain 1: "I can't see everything in one place"

- **What exists:** Inquiry pipeline with 7 status tabs, channel filtering, GOLDMINE lead scoring, priority queue on dashboard
- **What's missing:** A single "surge view" that combines inquiry status + event readiness + document completion + client communication status into one scannable row per dinner. Right now these are spread across `/inquiries`, `/events`, `/documents`, and `/circles` as separate pages.

### Pain 2: "Some people already told me everything, but I still have to manually plug it all in"

- **What exists:** Inquiry fields for date, guest count, location, occasion, budget, dietary restrictions, menu preferences. Event creation from inquiry. Quote generation.
- **What's missing:** A "readiness score" per inquiry that shows exactly which fields are filled vs. missing, and a one-click "generate everything" action when an inquiry has enough data to cost out, quote, and generate documents automatically.

### Pain 3: "Documents should be done the second the information is known"

- **What exists:** 21+ document generators, snapshot system, event workspace phases, grocery list consolidation, quote PDF generation
- **What's missing:** Auto-triggering document generation when an inquiry or event reaches sufficient data completeness. If the menu is known, guest count is known, and date is known, the grocery list, prep sheet, execution sheet, and quote should generate without the chef clicking anything. A "document readiness" indicator per event showing what's generated vs. what's still blocked by missing info.

### Pain 4: "I need to get back to everyone fast and show them where they are"

- **What exists:** Dinner circles (client-facing conversation hub), inquiry status tracking, next_action_required/next_action_by fields, follow_up_due_at
- **What's missing:** A "response queue" sorted by urgency (who's been waiting longest, who has the most complete inquiry, who's closest to their event date). Quick-reply templates from the surge view. Client-facing status visibility so clients can see their inquiry is being handled (the dinner circle already does this, but linking it earlier in the funnel).

### Pain 5: "I want to overlap ingredients across dinners to save money and time"

- **What exists:** Consolidated grocery list generator (multi-event), recipe ingredient costing with 4 API sources + regional multiplier, ingredient library with categories
- **What's missing:** A "batch opportunity" detector that scans upcoming events in a date window and surfaces shared ingredients/components across menus. "You have 3 dinners this week that all use grape jelly - make one batch." This is pure formula (set intersection on recipe_ingredients), not AI.

---

## Proposed Changes

### Change 1: Inquiry Pipeline - "Readiness Score" Column

**Files to modify:**
| File | What to Change |
|------|---------------|
| `lib/inquiries/actions.ts` | Add `computeReadinessScore(inquiry)` - deterministic formula: which of the 8 key fields (date, guest_count, location, occasion, budget, dietary, menu_preferences, client_contact) are filled. Returns percentage + list of missing fields |
| `app/(chef)/inquiries/page.tsx` | Add readiness score badge to each inquiry row. Color-coded: green (100% ready to price), yellow (50-99% partial), red (<50% needs info). Clicking the badge shows which fields are missing |

**Design notes:**

- This is NOT the GOLDMINE lead score (which measures likelihood to convert). This is a data completeness score (measures "can I act on this right now?").
- Formula, not AI. Pure field presence check.
- Missing fields list doubles as a checklist for what to ask the client.

### Change 2: Dashboard Priority Queue - Surge Mode Awareness

**Files to modify:**
| File | What to Change |
|------|---------------|
| `lib/queue/providers/inquiry-provider.ts` | Boost urgency scoring when inquiry volume exceeds a threshold in a rolling 7-day window. If 5+ new inquiries arrive in 7 days, surface a "Surge Mode" indicator on the dashboard |
| `app/(chef)/dashboard/_sections/hero-metrics.tsx` | Add "Open Inquiries" count to hero metrics with trend indicator (up/down vs. last week). When in surge territory (5+ open), show the count in amber/red |
| `app/(chef)/dashboard/_sections/command-center-data.tsx` | Add a "Respond Next" card that shows the single highest-priority unresponded inquiry with time-waiting and readiness score |

### Change 3: Auto-Generate Documents on Data Completeness

**Files to modify:**
| File | What to Change |
|------|---------------|
| `lib/events/actions.ts` (or relevant event update action) | After event update: check if the event now has enough data for each document type. If a document can be generated and hasn't been yet, queue it for auto-generation. This is a non-blocking side effect (try/catch, log failures, never block the main operation) |
| `lib/documents/auto-generate.ts` | **New file.** Maps document types to their minimum required fields. Given an event, returns which documents are "ready to generate" vs. "blocked by missing data" and what's missing. Calls existing generators - no new generation logic |
| `app/(chef)/events/[id]/page.tsx` (or event detail/workspace) | Add a "Documents" status card showing: generated (green check), ready to generate (blue "Generate" button), blocked (grey with missing fields listed). One-click "Generate All Ready" button |

### Change 4: Batch Opportunity Detection (Cross-Event Ingredient Overlap)

**Files to create:**
| File | Purpose |
|------|---------|
| `lib/grocery/batch-opportunities.ts` | Given a date range, queries all events with confirmed menus, extracts recipe_ingredients, computes set intersection. Returns grouped opportunities: "3 events use heavy cream this week - total: 6 quarts" |

**Files to modify:**
| File | What to Change |
|------|---------------|
| `app/(chef)/documents/page.tsx` or grocery list section | Add a "Batch Opportunities" card when viewing consolidated grocery lists. Shows overlapping ingredients across events in the selected date window |

**Design notes:**

- Pure database query + set math. No AI.
- Only surfaces when 2+ events share ingredients in the same week.
- Shows potential savings: "Buy in bulk: 6 qt heavy cream across 3 events vs. 2 qt x 3 separate purchases"

### Change 5: Response Queue with Quick Actions

**Files to modify:**
| File | What to Change |
|------|---------------|
| `lib/inquiries/actions.ts` | Add `getResponseQueue()` - returns inquiries sorted by: (1) time waiting for chef response, (2) event date proximity, (3) readiness score. Only shows inquiries where `next_action_required = 'chef'` or status = `new` |
| `app/(chef)/inquiries/page.tsx` | Add a "Respond Next" sort/filter mode that uses the response queue ordering. Highlight the #1 priority inquiry. Show time-waiting badge ("waiting 2 days") |

---

## Database Changes

None. All required fields already exist on the `inquiries`, `events`, `menus`, `recipes`, `recipe_ingredients`, and `ingredients` tables. The readiness score and batch opportunities are computed at query time.

---

## Server Actions

| Action                             | Auth            | Input                                    | Output                                                                                                                       | Side Effects                                |
| ---------------------------------- | --------------- | ---------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| `computeReadinessScore(inquiryId)` | `requireChef()` | `{ inquiryId: string }`                  | `{ score: number, total: number, filled: string[], missing: string[] }`                                                      | None                                        |
| `getResponseQueue()`               | `requireChef()` | `{ limit?: number }`                     | `InquiryRow[]` sorted by response urgency                                                                                    | None                                        |
| `getDocumentReadiness(eventId)`    | `requireChef()` | `{ eventId: string }`                    | `{ documents: { type: string, status: 'generated' \| 'ready' \| 'blocked', missingFields?: string[] }[] }`                   | None                                        |
| `generateAllReady(eventId)`        | `requireChef()` | `{ eventId: string }`                    | `{ generated: string[], failed: string[], errors?: string[] }`                                                               | Generates documents, revalidates event page |
| `getBatchOpportunities(dateRange)` | `requireChef()` | `{ startDate: string, endDate: string }` | `{ opportunities: { ingredientName: string, totalQuantity: number, unit: string, eventCount: number, events: string[] }[] }` | None                                        |

---

## UI / Component Spec

### Inquiry Pipeline Enhancements

**Readiness Score Badge** (per inquiry row):

- Circle with percentage (e.g., "75%")
- Green: 100% (all 8 fields filled, ready to act)
- Amber: 50-99% (partial, can start some work)
- Red: <50% (need more info from client)
- Click/hover: popover showing filled vs. missing fields as a checklist
- Existing GOLDMINE score badge stays. These are different metrics side by side.

**"Respond Next" Mode:**

- Toggle or tab on inquiry pipeline
- Reorders by response urgency (time waiting, date proximity, completeness)
- Top inquiry gets a subtle highlight or "up next" indicator
- Time-waiting badge: "2h ago", "1 day", "3 days" with color escalation

### Dashboard Enhancements

**Hero Metrics Addition:**

- "Open Inquiries: 12" with trend arrow (up from 4 last week)
- Amber when 5+, red when 10+
- Clickable, navigates to inquiry pipeline

**"Respond Next" Card (Command Center):**

- Shows the single highest-priority inquiry awaiting chef response
- Client name, occasion, date (if known), time waiting, readiness score
- "View Inquiry" button

### Event Detail - Document Readiness Card

**Layout:** Card on event detail/workspace page

- List of document types relevant to the current event phase
- Each row: document name, status icon (check/ready/blocked), action button or missing fields note
- "Generate All Ready" button at top (only visible when 1+ documents are in "ready" state)

**States:**

- **Loading:** Skeleton card
- **No event data:** "Add menu and event details to unlock document generation"
- **Error:** "Could not check document readiness" (never fake it)
- **Populated:** Document list with statuses

### Batch Opportunities Card

**Where:** Grocery list / documents page, visible when viewing a date range with 2+ events

- "Batch Opportunities This Week" header
- List of shared ingredients with quantities, event count, potential savings note
- Collapsible, not intrusive

---

## Edge Cases and Error Handling

| Scenario                                     | Correct Behavior                                                                                                                                                      |
| -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Inquiry has zero fields filled               | Readiness score shows 0%, missing fields list shows all 8. No "generate" options available                                                                            |
| Document generation fails for one type       | Mark that type as "failed" with error, continue generating others. Show toast with failure details. Never mark as "generated" if it didn't succeed                    |
| No events in date range for batch check      | "No overlapping events this week" - not an error, just an empty state                                                                                                 |
| Menu not yet linked to event                 | Document readiness shows most docs as "blocked - no menu assigned"                                                                                                    |
| Inquiry already converted to event           | Readiness score still shows on inquiry row. Score now pulls from event data too (richer)                                                                              |
| Chef has only 1-2 inquiries (no surge)       | Everything works normally. Surge indicators just don't appear. No degraded experience                                                                                 |
| Auto-generate triggers but Ollama is offline | Only affects AI-dependent docs (if any). Formula-based docs (grocery list, prep sheet) still generate. Error shown for AI docs: "Start Ollama to generate [doc type]" |

---

## Verification Steps

1. Sign in with agent account
2. Create 5+ test inquiries with varying completeness (some with all fields, some with only email)
3. Navigate to `/inquiries` - verify readiness score badges appear and are accurate
4. Verify "Respond Next" sort orders by urgency correctly
5. Navigate to dashboard - verify "Open Inquiries" count in hero metrics
6. Create an event from a complete inquiry, assign a menu with recipes
7. Navigate to event detail - verify document readiness card shows correct statuses
8. Click "Generate All Ready" - verify documents generate and status updates
9. Create 2+ events in the same week with overlapping ingredients
10. Check batch opportunities - verify shared ingredients are surfaced
11. Screenshot all states

---

## Out of Scope

- **No new intake channels.** Instagram DM ingestion, SMS ingestion, etc. are separate specs. This spec improves how existing inquiries are triaged and acted upon.
- **No changes to the inquiry data model.** All fields already exist. We're computing derived metrics from existing data.
- **No changes to document generators.** Existing generators are called as-is. We're adding orchestration and status tracking around them.
- **No changes to dinner circles.** The client-facing hub works. This spec is chef-facing.
- **No AI features.** Everything in this spec is deterministic (formulas, set math, field presence checks). AI enhancements to inquiry handling would be a separate spec.
- **No Remy integration.** Remy could draft responses, suggest menus, etc. That's a separate spec. This is about visibility and automation of known workflows.
- **No mobile/responsive redesign.** Improvements work within existing responsive layout.

---

## Notes for Builder Agent

1. **Read before building:** `docs/remy-complete-reference.md`, `lib/inquiries/actions.ts`, `lib/queue/providers/inquiry-provider.ts`, `lib/documents/` directory, `lib/grocery/pricing-actions.ts`

2. **Readiness score is NOT lead score.** GOLDMINE (`lib/inquiries/goldmine-lead-score.ts`) measures conversion likelihood. Readiness score measures data completeness for action. They're complementary, not competing. Both should be visible.

3. **Auto-generation is a non-blocking side effect.** Follow the pattern in CLAUDE.md: wrap in try/catch, log failures, never block the main operation. The chef should never be stuck because a document failed to generate.

4. **Batch opportunities is pure SQL + set math.** Query `recipe_ingredients` joined through `recipes` -> `dish_components` -> `menu_items` -> `menus` -> `events` for events in the date range. Group by ingredient, filter to ingredients appearing in 2+ events. No AI.

5. **Respect existing patterns:** tenant scoping on every query, `requireChef()` auth, cents for all monetary values, existing component variants only.

6. **Incremental delivery.** These 5 changes are independent. Build and verify each one separately. Don't batch. The readiness score (Change 1) and response queue (Change 5) are highest priority because they directly address the "I can't see what needs my attention" problem.

7. **The 8 readiness fields** (derived from the inquiry table schema): `confirmed_date`, `confirmed_guest_count`, `confirmed_location`, `confirmed_occasion`, `confirmed_budget_cents`, `confirmed_dietary_restrictions`, menu preferences (check `unknown_fields` JSONB or related event menu), client contact info (linked client record). Adjust if the actual schema has different field names.

8. **This spec solves a universal chef problem.** Spring and fall surges hit every private chef. The solutions must be general-purpose, not tailored to one chef's specific workflow. A chef with 3 inquiries and a chef with 30 should both benefit.

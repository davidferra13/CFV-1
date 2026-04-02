# Research: Built Specs Verification Queue

> **Date:** 2026-04-02
> **Question:** Which specs have status "built" but not "verified", and what does each need for Playwright verification?
> **Status:** complete

## Summary

10 specs are in "built" status, meaning code was written and type checks passed, but no Playwright verification or manual QA has been performed. This document catalogs each one with the exact routes, UI elements, and flows a QA agent needs to verify. Specs are ordered by priority (P0 first, then P1).

---

## Verification Queue

### P0 Specs (4)

---

### 1. Chef Golden Path Reliability

- **Spec:** `docs/specs/p0-chef-golden-path-reliability.md`
- **What was built:** Reliability fixes for the core recipe-create, menu-create, dish-index, and costing workflows. Write-path bug fixes, error handling improvements, costing completeness honesty.
- **Priority:** P0

#### Routes to Test

| Route                  | What to Verify                                                 |
| ---------------------- | -------------------------------------------------------------- |
| `/recipes/new`         | Recipe creation with ingredients saves and redirects correctly |
| `/recipes`             | New recipe appears in list                                     |
| `/recipes/ingredients` | Ingredient records from recipe creation exist                  |
| `/culinary/costing`    | Recipes show priced or incomplete (never fake-complete)        |
| `/menus/new`           | 3-course menu creation saves with correct course count         |
| `/menus/[id]`          | Menu detail shows persisted course count                       |
| `/menus`               | Menu quick-view modal resolves (no endless spinner)            |
| `/menus/[id]/editor`   | Adding a fourth course persists after refresh                  |
| `/culinary/dish-index` | Page loads without crashing                                    |

#### Verification Steps

- [ ] Sign in with agent account
- [ ] Navigate to `/recipes/new`. Create recipe "QA Seared Salmon" with 5 ingredients (salmon fillet 2lb, olive oil 2tbsp, butter 4tbsp, garlic 3 clove, lemon 2 each)
- [ ] **Screenshot:** Recipe save success + redirect to recipe detail
- [ ] Verify recipe appears on `/recipes`
- [ ] Check `/recipes/ingredients` for the ingredient records
- [ ] Check `/culinary/costing` for recipe (priced or incomplete, never fake-complete)
- [ ] Navigate to `/menus/new`. Create 3-course menu (Starter, Main, Side)
- [ ] **Screenshot:** Menu creation result showing "3 courses" (not "0-course")
- [ ] Open created menu at `/menus/[id]`, verify course count
- [ ] Open menu quick-view modal from `/menus`, verify it resolves
- [ ] **Screenshot:** Quick-view modal loaded
- [ ] Open `/menus/[id]/editor`, add fourth course, refresh, verify persistence
- [ ] Open `/culinary/dish-index`, verify page loads
- [ ] **Screenshot:** Dish index page loaded
- [ ] Verify costing page: empty menus not marked complete, unlinked content marked pending

---

### 2. Chef Pricing Override Infrastructure

- **Spec:** `docs/specs/chef-pricing-override-infrastructure.md`
- **What was built:** Chef-controlled pricing overrides with baseline vs. final price display, struck-through pricing UI, override kind tracking across quotes and events.
- **Priority:** P0

#### Routes to Test

| Route                      | What to Verify                                  |
| -------------------------- | ----------------------------------------------- |
| `/settings/pricing`        | Chef pricing config saves and persists          |
| `/api/v2/settings/pricing` | Returns configured values (not stale fallback)  |
| `/quotes/new`              | Quote form uses chef pricing, override UI works |
| `/quotes/[id]`             | Quote detail shows baseline vs final comparison |
| `/events/[id]` (money tab) | Event shows correct pricing metadata            |
| Client proposal page       | Shows final-vs-baseline for overridden quotes   |

#### Verification Steps

- [ ] Configure non-zero chef pricing in `/settings/pricing`
- [ ] **Screenshot:** Pricing settings saved
- [ ] Create a dinner quote from the quote form calculator
- [ ] Verify saved draft has matching final/baseline with `override_kind = 'none'`
- [ ] On a per-person quote, change per-person rate
- [ ] **Screenshot:** Struck-through baseline + highlighted final price
- [ ] Verify saved quote has `pricing_model = 'per_person'` and correct math
- [ ] Create a custom total override quote
- [ ] **Screenshot:** Custom override display with baseline struck through
- [ ] Accept a quote and verify event receives full pricing metadata
- [ ] Check chef quote list, quote detail, event money tab for consistent pricing display
- [ ] **Screenshot:** Event money tab with override pricing
- [ ] Open a legacy quote/event (pre-migration), verify clean render with no invented crossed-out amount

---

### 3. CPA-Ready Tax Export and Reconciliation

- **Spec:** `docs/specs/p0-chef-cpa-ready-tax-export-and-reconciliation.md`
- **What was built:** Corrected `event_financial_summary` view, canonical CPA export package, readiness checks, deduplication fixes, owner draws, period locks.
- **Priority:** P0

#### Routes to Test

| Route                         | What to Verify                                              |
| ----------------------------- | ----------------------------------------------------------- |
| `/finance/year-end`           | Year-end page with readiness check                          |
| `/finance/year-end?year=2026` | Export download and CSV correctness                         |
| `/finance/invoices/sent`      | Still works (regression check on `event_financial_summary`) |
| Dashboard                     | Outstanding payments widget still works                     |
| Client portal                 | Pending payments still work                                 |

#### Verification Steps

- [ ] Sign in with demo chef account, open `/finance/year-end?year=2026`
- [ ] Verify page does not claim accountant-readiness until check passes
- [ ] **Screenshot:** Year-end page with readiness status
- [ ] Download CPA export package for 2026
- [ ] Open `schedule_c_summary.csv`, verify totals match expected baseline
- [ ] Open `accounting_detail.csv`, verify no duplicate rows
- [ ] **Screenshot:** CSV content (or note verification of downloaded files)
- [ ] Add one equipment expense with no tax mapping, verify export is blocked with clear blocker message
- [ ] **Screenshot:** Export blocker pointing to unresolved expense
- [ ] Add one owner draw, verify it appears in detail but does not change Schedule C totals
- [ ] Regression: verify `/finance/invoices/sent` still loads
- [ ] Regression: verify dashboard outstanding payments widget still works
- [ ] Regression: verify client portal pending payments still works

---

### 4. Full Cloud AI Runtime and Disclosure

- **Spec:** `docs/specs/full-cloud-ai-runtime-and-disclosure.md`
- **What was built:** Moved all Ollama-backed AI to cloud endpoint, removed localhost assumptions, rewrote trust/disclosure copy across 20+ files.
- **Priority:** P0

#### Routes to Test

| Route                  | What to Verify                                           |
| ---------------------- | -------------------------------------------------------- |
| `/settings/ai-privacy` | No longer claims local-only processing                   |
| `/for-operators`       | No "runs locally" or "data never leaves" marketing copy  |
| `/prospecting`         | No "Requires Ollama" or "data never leaves your machine" |
| `/recipes/import`      | No "Requires Ollama" wording                             |
| `/api/ollama-status`   | Reports remote-provider health, not local daemon         |
| Remy drawer (any page) | No browser-only or local AI trust copy                   |

#### Verification Steps

- [ ] Ensure local Ollama is NOT running (verify cloud-only operation)
- [ ] Verify Remy responds on `/api/remy/stream` (chef), `/api/remy/client`, `/api/remy/landing`, `/api/remy/public`
- [ ] **Screenshot:** Remy working without local Ollama
- [ ] Open `/settings/ai-privacy`
- [ ] **Screenshot:** Verify no "local-only," "browser-only," or "data never leaves" claims
- [ ] Open `/for-operators`
- [ ] **Screenshot:** Verify no "runs locally" marketing copy
- [ ] Open `/prospecting`
- [ ] **Screenshot:** Verify no "Requires Ollama" or local-only copy
- [ ] Open `/recipes/import`
- [ ] Verify no "Requires Ollama" wording
- [ ] Open Remy drawer from any page
- [ ] **Screenshot:** Verify no local/private infrastructure trust copy in drawer footer
- [ ] Check `/api/ollama-status` returns cloud-provider health status
- [ ] Verify no production-facing error asks user to "start Ollama"

---

### P1 Specs (6)

---

### 5. Chef Opportunity Network

- **Spec:** `docs/specs/chef-opportunity-network.md`
- **What was built:** Structured "opportunity" posts in the network feed (hiring posts with role, location, compensation, duration), interest expression, chef search location filtering.
- **Priority:** P1

#### Routes to Test

| Route                      | What to Verify                                      |
| -------------------------- | --------------------------------------------------- |
| `/network` (feed tab)      | Opportunity posts render with distinct card layout  |
| `/network` (post composer) | Opportunity toggle shows structured fields          |
| `/network` (feed filter)   | "Opportunities" filter shows only opportunity posts |
| `/network` (chef search)   | City/state filter inputs work                       |

#### Verification Steps

- [ ] Sign in with agent account, navigate to `/network`
- [ ] Click opportunity toggle in post composer
- [ ] **Screenshot:** Opportunity composer with structured fields visible
- [ ] Fill in: role="Sous Chef", location="Haverhill, MA", compensation=hourly $25-35, duration=seasonal, content describing the opportunity
- [ ] Post the opportunity
- [ ] **Screenshot:** Opportunity post in feed with role badge, location, compensation, duration
- [ ] Click "Opportunities" filter, verify only opportunity posts show
- [ ] **Screenshot:** Filtered feed showing only opportunities
- [ ] Navigate to Connections tab > chef search
- [ ] Filter by state "MA", verify results filtered
- [ ] Filter by city "Haverhill", verify results filtered
- [ ] Clear filters, verify all results return
- [ ] **Screenshot:** Chef search with location filters

---

### 6. Notes-Dishes-Menus Client-Event Pipeline

- **Spec:** `docs/specs/notes-dishes-menus-client-event-pipeline.md`
- **What was built:** Workflow notes on menus landing page, note-to-dish promotion, canonical dish sources (reference vs copy), menu locking, brain-dump intake improvements.
- **Priority:** P1

#### Routes to Test

| Route                         | What to Verify                                     |
| ----------------------------- | -------------------------------------------------- |
| `/menus` (landing page)       | Workflow note creation (no menu, client, or event) |
| `/menus/new`                  | Note linking during menu creation                  |
| `/culinary/dish-index`        | Promoted dish appears                              |
| `/menus/[id]`                 | Reference vs copy dish behavior                    |
| `/menus/[id]` (locked)        | Lock prevents edits, offers Duplicate/Unlock       |
| `/my-events/[id]/choose-menu` | Client choose-menu flow still works                |

#### Verification Steps

- [ ] Open menus landing page, create a workflow note with no menu/client/event
- [ ] **Screenshot:** Workflow note persisted
- [ ] Verify note persists after refresh
- [ ] Start a new menu, link the existing note, create the menu
- [ ] Verify note attached to menu, menu saves with season/client/target_date
- [ ] Promote the attached note into a canonical dish
- [ ] **Screenshot:** Dish promotion result
- [ ] Verify original note still exists, dish appears in Dish Index, lineage visible
- [ ] Add canonical dish to Menu A as "Reference" and Menu B as "Copy"
- [ ] Edit canonical dish, verify Menu A updates, Menu B does not
- [ ] Lock Menu A, edit canonical dish again, verify locked menu unchanged
- [ ] **Screenshot:** Locked menu with Duplicate/Unlock options only
- [ ] Attempt to edit locked menu, verify only Duplicate or Unlock offered
- [ ] Create a brain-dump intake with extracted notes, approve it
- [ ] Verify notes land in workflow notes
- [ ] Confirm existing client choose-menu flow at `/my-events/[id]/choose-menu` still works

---

### 7. Featured Chef Public Proof and Booking

- **Spec:** `docs/specs/featured-chef-public-proof-and-booking.md`
- **What was built:** Homepage featured chef cards with proof links (See reviews, Google reviews, Website), public chef profile proof summary block, two-column inquiry page, client preview parity.
- **Priority:** P1

#### Routes to Test

| Route                      | What to Verify                                        |
| -------------------------- | ----------------------------------------------------- |
| `/` (homepage)             | Featured chef cards show proof links and correct CTAs |
| `/chef/[slug]`             | Proof summary block below hero, #reviews anchor       |
| `/chef/[slug]/inquire`     | Two-column layout (desktop), stacked (mobile)         |
| `/settings/client-preview` | Preview matches public profile with proof block       |

#### Verification Steps

- [ ] Use a chef account with `google_review_url`, social links, and a public slug
- [ ] Visit `/` and check featured chef card
- [ ] **Screenshot:** Card with "See reviews" (if reviews exist), "Google reviews" (if URL set), "Website" (if public)
- [ ] Change `preferred_inquiry_destination` across both/website_only/chefflow_only, verify CTA follows rules
- [ ] Click "See reviews" from homepage, verify landing on `/chef/[slug]#reviews`
- [ ] **Screenshot:** Public chef profile with proof summary block
- [ ] Verify review section uses unified public feed with "View all" expansion
- [ ] Click "Google reviews", verify new tab opens
- [ ] Click "Start inquiry", verify `/chef/[slug]/inquire` loads
- [ ] **Screenshot:** Two-column inquiry page (desktop) with chef context card
- [ ] Submit a test inquiry, verify form still succeeds
- [ ] Visit `/settings/client-preview`
- [ ] **Screenshot:** Preview with proof summary, reviews, availability matching live page

---

### 8. Public Chef Credentials Showcase

- **Spec:** `docs/specs/public-chef-credentials-showcase.md`
- **What was built:** Work history entries, public credentials panel on chef profile, private resume storage, charity impact display, achievements integration.
- **Priority:** P1 (depends on featured-chef-public-proof-and-booking)

#### Routes to Test

| Route                      | What to Verify                                                |
| -------------------------- | ------------------------------------------------------------- |
| `/settings/credentials`    | New settings page with work history, charity, resume sections |
| `/chef/[slug]`             | Credentials panel renders below hero/proof                    |
| `/chef/[slug]/inquire`     | Compact credentials context in inquiry                        |
| `/settings/client-preview` | Credentials section matches public profile                    |
| `/settings/professional`   | Achievements system still works (not broken)                  |

#### Verification Steps

- [ ] Navigate to `/settings/credentials`
- [ ] Add two work-history entries (one current, one historical), each with notable credits
- [ ] **Screenshot:** Work history editor with entries
- [ ] Add two public achievements from `/settings/professional`
- [ ] Upload a public portfolio photo through existing event-photo path
- [ ] Set public charity percent and note
- [ ] Upload a private resume, enable "resume available upon request" note
- [ ] **Screenshot:** Credentials settings fully populated
- [ ] Open `/chef/[slug]` and verify credentials section renders in order: career highlights, awards, portfolio, community impact, resume availability note
- [ ] **Screenshot:** Public credentials panel on chef profile
- [ ] Verify resume file is NOT downloadable (only text note visible)
- [ ] Open `/settings/client-preview`, verify credentials section matches
- [ ] **Screenshot:** Client preview with credentials
- [ ] Turn off each source one at a time, verify section disappears cleanly (no fake placeholders)

---

### 9. Soft-Close Leverage and Reactivation

- **Spec:** `docs/specs/soft-close-leverage-and-reactivation.md`
- **What was built:** Soft-close workflow card on inquiry detail, warm-lead capture to client record, A/B courtesy closeout presets, terminal-state preservation after send.
- **Priority:** P1

#### Routes to Test

| Route                        | What to Verify                                                |
| ---------------------------- | ------------------------------------------------------------- |
| `/inquiries/[id]`            | Soft-close leverage card appears for future-interest declines |
| `/inquiries/[id]` (composer) | A/B preset loaders, soft-close mode defaults                  |
| Client record                | Tags, notes, dietary/dish merges after leverage capture       |

#### Verification Steps

- [ ] Start with an inquiry in `awaiting_chef` whose latest inbound message contains soft-close future language
- [ ] Open `/inquiries/[id]`
- [ ] **Screenshot:** NextActionBanner with soft-close recommendation + SoftCloseLeverageCard
- [ ] Verify card offers "Close as Plans Changed / Maybe Future"
- [ ] Click the close button
- [ ] Verify inquiry status = declined, decline_reason = "Plans changed / maybe future"
- [ ] **Screenshot:** Declined inquiry with leverage capture card
- [ ] Verify follow-up fields cleared (next_action_required, next_action_by, follow_up_due_at)
- [ ] Verify Gmail composer still visible for this specific declined reason
- [ ] Save warm-lead context: tag "warm-future-lead", dietary merge on, discussed-dishes merge on, relationship note
- [ ] **Screenshot:** Leverage capture success with applied changes summary
- [ ] Verify client record: tags updated, relationship note exists, dietary updated, dishes merged
- [ ] Load preset A, verify email content matches spec
- [ ] Send preset A
- [ ] **Screenshot:** Sent message, inquiry still declined
- [ ] Verify: inquiry remains declined, no new follow_up_due_at, no next_action_by='client'
- [ ] (Separate test) Repeat with preset B on a circle-backed inquiry, verify Dinner Circle link in email + same terminal-state preservation

---

### 10. Staff Ops Unified Workflow

- **Spec:** `docs/specs/staff-ops-unified-workflow.md`
- **What was built:** Inline task creation from event staff panel, event context on staff portal tasks, notification direction fix, staff dashboard event-task unification.
- **Priority:** P1

#### Routes to Test

| Route                           | What to Verify                                                   |
| ------------------------------- | ---------------------------------------------------------------- |
| Event detail page (staff panel) | Inline task creation per assigned staff member                   |
| `/staff-tasks` (staff portal)   | Tasks show event context badges                                  |
| `/staff-dashboard`              | Today's tasks with event names, upcoming events with task counts |
| `/tasks` (chef side)            | Standalone task creation still works                             |

#### Verification Steps

- [ ] Sign in as chef, navigate to any event detail page
- [ ] Assign a staff member via event staff panel
- [ ] Create a task for that staff member from the inline form
- [ ] **Screenshot:** Task appears in event staff panel with correct assignment
- [ ] Sign in as staff member, navigate to staff dashboard
- [ ] **Screenshot:** Today's tasks showing event context (event name, date)
- [ ] Navigate to `/staff-tasks`
- [ ] **Screenshot:** Task with event context badge (event name, date, guest count)
- [ ] Complete the task via checkbox, verify optimistic update and persistence on refresh
- [ ] Sign in as chef again, verify event staff panel shows updated completion count
- [ ] Create a task from standalone `/tasks` page (no event)
- [ ] Verify it appears in staff portal without event context (graceful handling)
- [ ] **Screenshot:** Task without event context (no crash, normal display)

---

## Summary Table

| #   | Spec                                 | Priority | Routes                                      | Key Risk                                      |
| --- | ------------------------------------ | -------- | ------------------------------------------- | --------------------------------------------- |
| 1   | Chef Golden Path Reliability         | P0       | `/recipes/new`, `/menus/new`, `/culinary/*` | Core workflow broken = app unusable for chefs |
| 2   | Chef Pricing Override Infrastructure | P0       | `/settings/pricing`, `/quotes/*`, events    | Incorrect pricing = financial impact          |
| 3   | CPA-Ready Tax Export                 | P0       | `/finance/year-end`, `/finance/*`           | Wrong tax numbers = real-world harm           |
| 4   | Full Cloud AI Runtime                | P0       | All AI surfaces, Remy, settings             | False privacy claims = trust violation        |
| 5   | Chef Opportunity Network             | P1       | `/network`                                  | New feature, lower regression risk            |
| 6   | Notes-Dishes-Menus Pipeline          | P1       | `/menus`, `/culinary/dish-index`            | Complex workflow, many edge cases             |
| 7   | Featured Chef Public Proof           | P1       | `/`, `/chef/[slug]`, `/chef/[slug]/inquire` | Public-facing, affects conversions            |
| 8   | Public Chef Credentials              | P1       | `/settings/credentials`, `/chef/[slug]`     | Depends on #7, migration required             |
| 9   | Soft-Close Leverage                  | P1       | `/inquiries/[id]`                           | Inquiry state machine correctness             |
| 10  | Staff Ops Unified Workflow           | P1       | Event detail, staff portal                  | Cross-role testing (chef + staff)             |

## QA Agent Instructions

1. Execute P0 specs first, in order listed above.
2. For each spec, follow the verification steps exactly.
3. Take screenshots at every marked point.
4. If a step fails, document the failure with screenshot and move to the next step (do not stop the entire spec).
5. After all steps for a spec pass, update that spec's Timeline table with verification date and commit hash, then change status to "verified."
6. If critical failures are found, update the spec status to "ready" with a note about what failed, so a builder can re-claim it.
7. Update `docs/build-state.md` after each verification pass.

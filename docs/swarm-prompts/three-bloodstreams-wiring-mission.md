# Three Bloodstreams: Wiring Mission

> **Purpose:** Wire the three critical bloodstreams that make ChefFlow a living organism the chef actually uses every day. Not an audit. Not new features. Fix 14 confirmed breaks so the organism breathes.
>
> **Context:** Full codebase trace completed 2026-05-17. Every break below is confirmed with file paths and line numbers. No speculation.

---

## Why Only Three

ChefFlow has 265 domains, 725 tables, and most of the organism is already wired. PIE auto-prices. Completion Contract recurses. CIL feeds Remy. These work.

But three critical bloodstreams have breaks that make the difference between "built a product" and "using a product." These are the flows the chef touches every single day. If they leak, the chef goes back to Google Docs.

---

## Bloodstream 1: Inquiry to Client Communication

**The flow:** Inquiry arrives -> parsed/triaged -> Dinner Circle auto-creates -> client gets acknowledgment -> ongoing cadence maintains relationship -> inquiry converts to event

**The problem:** Only public website inquiries get the full pipeline. Chef-created inquiries (the most common kind) get almost nothing. Take-a-Chef captures get literally nothing.

### Confirmed Breaks

#### BREAK 1.1: Chef-created inquiries send ZERO client communication

- **File:** `lib/inquiries/actions.ts` :: `createInquiry()`
- **What happens:** Creates inquiry record, creates Dinner Circle, posts first circle message. But sends NO email, NO SMS, NO auto-response to the client. The Circle exists but the client has no idea.
- **Compare:** `lib/inquiries/public-actions.ts` :: `submitPublicInquiry()` fires: client email, client SMS, chef email, chef SMS, SSE broadcast, auto-response, Remy hook, automation engine, observability event.
- **Fix:** After `createInquiry()` completes, call `sendInquiryReceivedEmail()` with the Circle URL. Gate behind a chef setting ("auto-acknowledge new inquiries") so manual-capture chefs can opt out.

#### BREAK 1.2: Take-a-Chef capture creates NO Dinner Circle

- **File:** `lib/inquiries/take-a-chef-capture-actions.ts` :: `captureTakeAChefBooking()`
- **What happens:** Creates inquiry + auto-creates draft event + logs commission expense. But NO Circle, NO client email, NO SSE broadcast, NO Remy hook.
- **Fix:** After event auto-creation, call `createInquiryCircle()` and `linkInquiryCircleToEvent()`. Then fire `sendInquiryReceivedEmail()`.

#### BREAK 1.3: SSE broadcast only fires for public inquiries

- **File:** `lib/inquiries/public-actions.ts` line ~180 (broadcast call). `lib/inquiries/actions.ts` has NO broadcast.
- **What happens:** Chef-created and Take-a-Chef inquiries do not push real-time events. Dashboard Rail does not update until page refresh.
- **Fix:** Add `broadcast('chef-${tenantId}', 'new_inquiry_received', {...})` to `createInquiry()` and `captureTakeAChefBooking()`.

#### BREAK 1.4: No automated cadence between inquiry and deposit

- **File:** `lib/communication/cadence-scheduler.ts` :: `createCadenceSchedule()`
- **What happens:** Cadence only starts on DEPOSIT CONFIRMATION (`lib/finance/deposit-actions.ts` line 232). The inquiry-to-deposit window (days or weeks) has ZERO automated follow-up beyond initial auto-response.
- **Fix:** Create a lightweight pre-deposit cadence: Day 1 (auto-response, already exists), Day 3 (gentle follow-up if no response), Day 7 (check-in). Trigger from `createInquiry()` / `submitPublicInquiry()`. The existing `response-escalation.ts` already has tiers at 4h/12h/24h/48h/72h; wire them to actually send.

#### BREAK 1.5: Potential double-email on public inquiries

- **File:** `lib/inquiries/public-actions.ts` :: `submitPublicInquiry()`
- **What happens:** Both `sendInquiryReceivedEmail()` AND `triggerAutoResponse()` fire. Client could receive two emails.
- **Fix:** Make `triggerAutoResponse()` check whether `sendInquiryReceivedEmail()` already sent within last 5 minutes. Or consolidate into one email.

#### BREAK 1.6: Platform email sync is read-only

- **File:** `lib/inquiries/platform-raw-feed.ts` :: `getPlatformRawFeed()`
- **What happens:** Detects emails from 13 platforms (Thumbtack, TakeAChef, Yhangry, Bark, TheKnot, etc.) but does NOT auto-create inquiries. Chef must manually capture.
- **Severity:** MEDIUM. This is the "inquiry consolidation" problem from the business crisis. Solving this = chefs never miss a lead.
- **Fix:** Add a "Create Inquiry from This" inline action in the platform raw feed UI. Pre-fill fields from parsed email. One click to convert detected platform email into a full inquiry with Circle + acknowledgment.

### What Already Works (Don't Touch)

- Public inquiry full pipeline (email + SMS + Circle + auto-response + Remy + SSE)
- Inquiry Rail resolver with P0/P1/P2 tiers and inline actions
- Cadence scheduler with smart skip logic (post-deposit)
- Remy reactive hooks on inquiry creation (auto-scoring)
- Response escalation computation (tiers exist, just not wired to send)
- Circle-to-event linking on conversion

---

## Bloodstream 2: Event to Menu to Recipe to Prep

**The flow:** Chef opens event -> attaches/builds menu -> captures recipes for each dish -> prep timeline auto-generates -> shopping list auto-populates with PIE prices

**The problem:** The flow works except for two critical UX breaks and fragmented prep systems.

### Confirmed Breaks

#### BREAK 2.1: Recipe creation page is a 404

- **Files that link to it:** Recipe list page, ingredients page, dish index detail, culinary hub nav all link to `/culinary/recipes/new`
- **What's missing:** `app/(chef)/culinary/recipes/new/page.tsx` does not exist
- **Impact:** Chef cannot create a recipe from the UI. This is the #1 block on "zero recipes documented."
- **Fix:** Create the page. Use `createRecipeWithIngredients` server action. Form fields: name, category, ingredients (with PIE auto-lookup), method (freeform text), prep/cook time, yield. Optimized for speed: a chef who has the recipe in their head should capture it in under 2 minutes.

#### BREAK 2.2: Recipe edit page is a 404

- **Files that link to it:** Recipe detail page links to `/culinary/recipes/[id]/edit`
- **What's missing:** `app/(chef)/culinary/recipes/[id]/edit/page.tsx` does not exist
- **Impact:** Chef cannot edit existing recipes from the UI.
- **Fix:** Create the page. Same form as creation, pre-populated. Use `updateRecipe` server action.

#### BREAK 2.3: Empty grocery list on menu attach

- **File:** `lib/menus/actions.ts` line ~853
- **What happens:** `attachMenuToEvent()` calls `createSmartListDraftForEvent(eventId)` which creates a BLANK grocery list. Does NOT call `generateShoppingList()` or `getMenuShoppingList()` to populate it from menu ingredients.
- **Fix:** After `attachMenuToEvent()`, call `getMenuShoppingList(menuId)` and use the results to populate the smart list. Or replace the empty draft with a direct call to `generateShoppingList()`.

#### BREAK 2.4: Five overlapping prep systems with different schemas

- **System A:** `lib/events/prep-timeline.ts` -- correct schema (menu -> dishes -> components -> recipes)
- **System B:** `lib/events/prep-timeline-actions.ts` -- legacy schema (`event_menus`, `menu_courses`)
- **System C:** `lib/prep/prep-schedule-actions.ts` -- correct schema (components -> dishes -> menus)
- **System D:** `lib/prep/prep-sheet-actions.ts` -- restaurant model (`service_days`, `service_menus`)
- **System E:** `lib/prep/actions.ts` -- manual timer CRUD only
- **Fix:** Designate System A or C as canonical. System B's `event_menus`/`menu_courses` queries will return empty for current-schema events, producing blank timelines. Either migrate System B to current schema or deprecate it.

#### BREAK 2.5: Circle sourcing disconnected from menu ingredients

- **File:** `lib/dinner-circles/sourcing-actions.ts`
- **What happens:** Ingredient availability tracking is manual free-text. Not linked to `recipe_ingredients`. Chef has to re-type ingredient names instead of seeing their menu's ingredient list pre-populated.
- **Fix:** When sourcing status is requested for an event, pre-populate from `getMenuShoppingList(event.menu_id)`. Map each shopping list item to a sourceable ingredient with status tracking.

### What Already Works (Don't Touch)

- Menu-to-event attachment with atomic RPC, allergen checks, PIE auto-pricing
- Component-to-recipe linking with stub recipe creation
- Completion Contract recursion (event -> menu -> recipe -> ingredient)
- Menu completion tracks `all_components_reciped` and `recipes_complete`
- PIE auto-prices at menu attach AND shopping list generation
- Consolidated cross-event shopping list with unit conversion, inventory subtraction, vendor mapping
- Prep time estimation from category/technique/quantity (deterministic)
- Recipe detail page with live PIE prices, stock coverage, scaling, nutrition

---

## Bloodstream 3: Rail to Remy (The Chef's Morning)

**The flow:** Chef opens ChefFlow -> RailStrip shows top urgent items -> dashboard TieredRail shows everything by priority -> Remy can answer "what's happening this week?" -> Rail updates in real-time as things change

**The problem:** Rail renders correctly on every page with 34 active resolvers. CIL feeds Remy. Remy answers schedule questions. But the real-time refresh is completely dead.

### Confirmed Breaks

#### BREAK 3.1: RailStrip SSE is dead wiring (TWO independent failures)

- **Failure A:** `lib/realtime/channel-access.ts` does not authorize channel `'rail'`. The SSE connection to `/api/realtime/rail` returns 403 Forbidden for all users. RailStrip silently reconnects every 3 seconds in an infinite loop.
- **Failure B:** Zero code in the entire codebase calls `broadcast('rail', ...)`. Even if the channel were authorized, no events would ever fire.
- **Impact:** RailStrip only shows data from initial server render. If a new inquiry arrives, payment comes in, or event status changes, the strip is stale until full page navigation.
- **Fix A:** Add `'rail'` to the channel access validator's allowed list in `lib/realtime/channel-access.ts`.
- **Fix B:** Add `broadcast('rail', { type: 'refresh' })` calls to key mutation paths: inquiry creation, payment recording, event status transitions, quote acceptance. The RailStrip `onMessage` handler already calls `getRailStrip()` to re-fetch; it just never receives a message.

#### BREAK 3.2: Rail sources never reach RailStrip

- **What happens:** `lib/rail/sources/` (CIL, communication, events, finance, intelligence) use `RailItem` type with `critical/action/awareness/opportunity` tiers. God Mode resolvers use `GodModeResolvedItem` with `p0-p4` tiers. They merge on the dashboard via `assembleTieredRail()`. But RailStrip only uses hot God Mode resolvers (3 of 34). The 5 rail sources never appear in the strip.
- **Impact:** CIL signals, scheduled communications, financial alerts from `lib/rail/sources/` are invisible on non-dashboard pages.
- **Fix:** Either (a) include a subset of rail sources in the strip's hot path, or (b) accept that the strip is inquiry/message/payment only and the full intelligence view is dashboard-only. If (b), document this as intentional.

### What Already Works (Don't Touch)

- All 34 God Mode resolvers active (3 hot, 31 warm)
- RailStrip rendered on every chef page via layout
- TieredRail on dashboard with full resolver dispatch
- CIL-to-Remy pipeline intact (`formatInsightsForRemy`, `formatSignalsForRemy`)
- Remy answers schedule/event/financial questions via 130+ deterministic commands
- `generateMorningBriefing()` pulls today's events, overdue invoices, stale inquiries, birthdays, ghost events
- Rail client-side rotation (8s interval for overflow items)

---

## Execution Order

**Phase 1: Stop the Bleeding (Day 1)**

1. Fix BREAK 3.1 -- RailStrip SSE. Two edits: channel access + broadcast calls. Chef sees live updates immediately.
2. Fix BREAK 1.1 -- Chef-created inquiry acknowledgment. Wire `sendInquiryReceivedEmail()` into `createInquiry()`.
3. Fix BREAK 1.3 -- SSE broadcast for all inquiry types.

**Phase 2: Recipe Capture (Day 2)** 4. Fix BREAK 2.1 -- Build recipe creation page (`/culinary/recipes/new`). This unblocks "zero recipes documented." 5. Fix BREAK 2.2 -- Build recipe edit page.

**Phase 3: Circle Integrity (Day 3)** 6. Fix BREAK 1.2 -- Take-a-Chef Circle creation. 7. Fix BREAK 2.3 -- Populate grocery list on menu attach. 8. Fix BREAK 2.5 -- Pre-populate Circle sourcing from menu ingredients.

**Phase 4: Cadence & Intelligence (Day 4)** 9. Fix BREAK 1.4 -- Pre-deposit inquiry cadence. 10. Fix BREAK 1.5 -- Double-email prevention. 11. Fix BREAK 1.6 -- Platform email one-click inquiry creation. 12. Fix BREAK 2.4 -- Designate canonical prep system. 13. Fix BREAK 3.2 -- Decide rail source visibility in strip.

---

## Constraints

- **No new tables.** Wire existing systems together. The 725-table schema has everything needed.
- **No new domains.** The 265 domains cover every concept. Place code in existing modules.
- **Formula > AI.** Every fix here is deterministic wiring, not LLM-dependent.
- **Additive only.** Don't delete or restructure existing working code. Add missing calls, create missing pages, authorize missing channels.
- **Test each fix.** Recipe pages get Playwright tests. SSE fix gets a manual verification (mutation -> strip update). Cadence gets unit tests on scheduling logic.

---

## Success Criteria

The mission is done when:

1. Chef creates an inquiry from any source -> client gets acknowledgment email with Circle link -> Circle auto-exists
2. Chef opens an event -> attaches menu -> clicks "New Recipe" -> captures recipe in < 2 minutes -> shopping list auto-populates with prices
3. Chef opens ChefFlow in the morning -> RailStrip shows live priorities -> new inquiry arrives -> strip updates without page refresh -> Remy answers "what's this week look like?" with real data

**The chef uses ChefFlow tomorrow. Not next month. Tomorrow.**

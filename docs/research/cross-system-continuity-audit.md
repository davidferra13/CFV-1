# Research: Cross-System Continuity Audit

> **Date:** 2026-04-02
> **Question:** Does ChefFlow behave as one continuous system, or a collection of disconnected tools? Where does data flow break?
> **Status:** complete

## Origin Context

The developer identified that ChefFlow has broad feature coverage but suspected the depth of integration between systems was incomplete. The core question: "Can every piece of data connect to everything it should?" The goal was not to find missing features but to find missing wiring: places where data sits in isolation, actions don't propagate downstream, and the chef must manually bridge gaps the system should handle.

## Summary

ChefFlow has 5 major integration chains. One is fully connected. Two are partially connected with critical break points. Two collect valuable data that dead-ends. The single highest-impact gap is that recipe costing ignores the 10-tier price resolution engine, using a stale single column instead. The single highest-risk gap is that inquiry dietary restrictions are not copied to events, creating an allergen safety hole.

---

## Chain 1: Pricing <-> Menu <-> Client Context

### What works

- `resolvePrice()` 10-tier chain resolves fresh prices from 27+ sources (`lib/pricing/resolve-price.ts:157-842`)
- `propagatePriceChange()` can recompute recipe costs when manually triggered (`lib/pricing/cost-refresh-actions.ts:19`)
- `menu_cost_summary` view recomputes on every query (no stale cached value)
- Client dietary data is displayed in the menu editor context sidebar (`lib/menus/editor-actions.ts:93`)

### Break points

| #   | Break                                                                                              | Location                                 | Impact                                                                                  |
| --- | -------------------------------------------------------------------------------------------------- | ---------------------------------------- | --------------------------------------------------------------------------------------- |
| BP1 | Recipe costing reads `ingredients.cost_per_unit_cents` (stale column), NOT `resolvePrice()`        | `lib/recipes/actions.ts:1834`            | 10-tier chain is display-only; actual recipe/menu/event costs use old data              |
| BP2 | `propagatePriceChange()` must be called manually                                                   | `lib/pricing/cost-refresh-actions.ts:19` | New OpenClaw prices logged but recipe costs remain stale until someone triggers refresh |
| BP3 | Menu component edits don't flag event for cost review                                              | `lib/menus/actions.ts:1131-1170`         | Chef edits menu, cost changes 20%, no notification                                      |
| BP4 | No `revalidatePath` after menu component changes                                                   | `lib/menus/actions.ts:1169`              | UI shows stale costs until manual page refresh                                          |
| BP5 | `event_financial_summary` view reads ledger/expenses, NOT `menu_cost_summary`                      | Layer 3 migration                        | Chef can't see "planned menu cost vs. quoted price vs. actual spend" in one view        |
| BP6 | Client context (allergies, preferences, budget) never influences pricing or menu composition logic | `lib/events/actions.ts`                  | By design (chef-controlled), but system doesn't even surface constraints as guardrails  |

### Propagation model

```
ingredient_price_history (logged automatically)
  |
  [MANUAL TRIGGER REQUIRED] propagatePriceChange()
  |
  computeRecipeIngredientCost()
    reads: ingredients.cost_per_unit_cents  <-- STALE COLUMN, NOT resolvePrice()
    writes: recipe_ingredients.computed_cost_cents
  |
  refreshRecipeTotalCost()
    writes: recipes.total_cost_cents
  |
  menu_cost_summary VIEW (recomputes on query, no cache)
    reads: i.last_price_cents  <-- ALSO STALE COLUMN
  |
  [NO EVENT FLAGGING]
  [NO UI CACHE INVALIDATION]
```

---

## Chain 2: Vendor <-> Catalog Propagation

### What works

- Vendor CRUD is fully functional (`lib/vendors/vendor-item-actions.ts`)
- Adding/updating vendor items automatically records price points (`recordVendorPricePoint()` called on line 59-69)
- `chef_preferred_stores` and `store_item_assignments` enable shopping list organization (`lib/grocery/store-shopping-actions.ts`)

### Break points

| #   | Break                                                            | Location                                                   | Impact                                                                |
| --- | ---------------------------------------------------------------- | ---------------------------------------------------------- | --------------------------------------------------------------------- |
| BP1 | Vendor prices are reference data, NOT price sources              | `vendor_price_points` not in `resolvePrice()` chain        | Chef logs vendor price; it never affects recipe/menu/event costs      |
| BP2 | `assignItemToStore()` only revalidates `/culinary/grocery`       | `lib/grocery/store-shopping-actions.ts:177-204`            | Assigning ingredient to vendor doesn't update any pricing             |
| BP3 | Store preference is shopping organization, not catalog filtering | `splitListByStore()` does keyword matching in JS           | Selecting preferred stores doesn't change what the catalog shows      |
| BP4 | "Add to Pantry" from catalog not implemented                     | `addCatalogIngredientToLibrary` - zero matches in codebase | Can't import a catalog item into ingredient library                   |
| BP5 | Recipe costing doesn't read vendor prices at all                 | `lib/recipes/actions.ts:1834`                              | `cost_per_unit_cents` column, not vendor_items or vendor_price_points |

### Architecture finding

The system is **pull-based by design**. Costs are computed on-demand, not pushed from vendors. Vendor prices exist as reference material the chef can consult, but they never automatically feed into the costing chain. This means:

- Changing a vendor does NOT cascade cost updates to recipes, menus, or events
- The `resolvePrice()` 10-tier chain does NOT include `vendor_price_points` as a tier
- The vendor system and the pricing system are parallel tracks that don't intersect

### Vendor spec revision needed

The vendor personalization layer spec (`docs/specs/vendor-personalization-layer.md`) addresses catalog filtering but not cost propagation. It should be expanded to include: vendor prices feeding into `resolvePrice()` as a new tier (between Receipt and API Quote), and vendor assignment changes triggering `propagatePriceChange()` for affected ingredients.

---

## Chain 3: Inquiry -> Event -> Execution Continuity

### What works

- 7 of 11 inquiry fields propagate fully to events: address, event_date, serve_time, guest_count, occasion, budget, special_requests
- Client record is created from inquiry data (name, email, phone)
- Draft event is auto-created with core fields populated
- Dinner Circle is auto-created (non-blocking)

### Break points

| #   | Break                                                              | Location                                          | Severity                                                             |
| --- | ------------------------------------------------------------------ | ------------------------------------------------- | -------------------------------------------------------------------- |
| BP1 | **Inquiry dietary restrictions NOT copied to event**               | `app/api/embed/inquiry/route.ts:267-280`          | **CRITICAL (safety)** - event.dietary_restrictions stays empty       |
| BP2 | Client allergies from inquiry not written to client record         | Same file                                         | Client profile may show "no allergies" when inquiry said otherwise   |
| BP3 | Favorite ingredients/dislikes stored in `unknown_fields` JSON only | Route line 250                                    | Never surfaced again; chef must read raw inquiry to find preferences |
| BP4 | Shopping list generation ignores dietary constraints               | `lib/culinary/shopping-list-actions.ts`           | Chef could order allergen-containing ingredients without warning     |
| BP5 | Inquiry notes orphaned from event page                             | Event has `inquiry_id` FK but doesn't embed notes | Chef must navigate to inquiry page separately to see context         |

### Field-by-field persistence

| Field                  | Inquiry                 | Event          | Menu Context         | Shopping List | Verdict               |
| ---------------------- | ----------------------- | -------------- | -------------------- | ------------- | --------------------- |
| address                | Stored                  | Copied         | Visible              | N/A           | **PROPAGATES**        |
| event_date             | Stored                  | Copied         | Visible              | Filtered      | **PROPAGATES**        |
| serve_time             | Stored                  | Copied         | Visible              | N/A           | **PROPAGATES**        |
| guest_count            | Stored                  | Copied         | Visible              | Affects qty   | **PROPAGATES**        |
| occasion               | Stored                  | Copied         | Visible              | N/A           | **PROPAGATES**        |
| budget                 | Stored                  | Copied         | Via special_requests | Costed        | **PROPAGATES**        |
| special_requests       | Stored                  | Copied         | N/A                  | N/A           | **PROPAGATES**        |
| **allergies/dietary**  | **Stored**              | **NOT COPIED** | **LOST**             | **N/A**       | **LOST**              |
| **favorites/dislikes** | **unknown_fields JSON** | **N/A**        | **N/A**              | **N/A**       | **REQUIRES RE-ENTRY** |
| inquiry notes          | Stored                  | Orphaned       | N/A                  | N/A           | **NOT LINKED**        |
| Dinner Circle thread   | Created                 | Not embedded   | N/A                  | N/A           | **NOT LINKED**        |

### Safety risk

A client submits an inquiry saying "allergic to shellfish." The inquiry stores it. The event creation ignores it. The client profile doesn't have it. The chef builds a scallop menu. The menu allergen validator checks `event.dietary_restrictions` (empty) and `client.allergies` (empty). No warning fires. This is a real safety hole at `app/api/embed/inquiry/route.ts` line 278 where the event INSERT omits `dietary_restrictions`.

---

## Chain 4: Operational Feedback Loop

### What works

- **Expenses -> Pricing: FULLY CONNECTED.** Receipt approval triggers `logIngredientPrice()` which writes to `ingredient_price_history` with source='manual'. This feeds `resolvePrice()` Tier 1 (highest confidence, 90-day window). Future quotes use these real costs. (`lib/receipts/actions.ts:274-487`)

### Break points (dead ends)

| Data Collected             | Stored                                        | Displayed                               | Feeds Back Into                             | Status           |
| -------------------------- | --------------------------------------------- | --------------------------------------- | ------------------------------------------- | ---------------- |
| AAR recipe timing feedback | `aar_recipe_feedback`                         | `RecipeTrackRecordPanel` on recipe page | Nothing                                     | **DEAD END**     |
| AAR would-use-again flag   | `aar_recipe_feedback`                         | Track record panel                      | Nothing                                     | **DEAD END**     |
| AAR ingredient issues      | `aar_ingredient_issues`                       | Ingredient detail page                  | Nothing                                     | **DEAD END**     |
| AAR forgotten items        | `aar_recipe_feedback`                         | AAR page                                | Nothing                                     | **DEAD END**     |
| Event profitability        | `lib/intelligence/event-profitability.ts`     | Dashboard analytics                     | Nothing                                     | **DEAD END**     |
| Smart quote suggestions    | `lib/intelligence/smart-quote-suggestions.ts` | Quote creation flow                     | Averages past prices, ignores profitability | **DISCONNECTED** |

### The loop that should close but doesn't

```
Event completed
  |
  AAR filed (timing, ratings, recipe feedback, ingredient issues)
  |  [DEAD END - stored and displayed but never consumed]
  |
  Expenses logged (receipts, invoices)
  |  [CONNECTED - feeds resolvePrice() tier 1] ✓
  |
  Profitability computed
  |  [DEAD END - displayed on dashboard, ignored by quote engine]
  |
  Next similar event quoted
  |  [Uses historical prices, ignores profitability and recipe feedback]
```

The quote suggestion engine (`lib/intelligence/smart-quote-suggestions.ts:38-58`) scores similarity by guest count, occasion, service style, and season. It recommends prices based on what was charged before, not what was profitable. A chef could repeatedly underprice 20-guest dinners because the system suggests the same low price that lost money last time.

---

## Chain 5: System Awareness (Time, Deadlines, Progress)

### What works (strong)

- **Priority queue** with 5-dimension scoring: time pressure (300pts), impact (200pts), blocking (150pts), staleness (100pts), revenue (250pts) (`lib/queue/score.ts:21-74`)
- **9 domain providers** feed the queue: event, inquiry, message, quote, financial, post_event, client, culinary, contact (`lib/queue/build.ts:24-79`)
- **Time-of-day weighting**: morning boosts prep work, afternoon boosts communication, evening boosts next-day prep (`lib/queue/build.ts:111-149`)
- **Work Surface Engine**: maps all events to 17 operational stages with blocked/preparable/optional classification (`lib/workflow/preparable-actions.ts`)
- **Readiness gates**: 10 pre-transition safety checks with hard blocks and soft warnings (`lib/events/readiness.ts:32-108`)
- **10+ scheduled jobs**: daily briefing, auto lead scoring, weekly insights, certification expiry, FDA recalls, revenue goals (`lib/ai/scheduled/job-definitions.ts`)
- **Proactive alerts**: overdue payments, unanswered inquiries, upcoming events missing info, dormant clients (`lib/intelligence/proactive-alerts.ts`)

### What's missing

| Dimension                | Status      | Gap                                                                                                                                  |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| Event deadline awareness | **ACTIVE**  | No "event in 3 days, menu not finalized" scheduled alert (only surfaces when chef visits dashboard)                                  |
| Stale data detection     | **PASSIVE** | Only pricing freshness and expense receipts detected; no recipe costing staleness, no vendor price recency, no client data freshness |
| Progress tracking        | **MANUAL**  | Readiness gates require explicit chef action; no "event is 67% ready" aggregate; no "stuck in stage for X days" anomaly detection    |
| Automatic escalation     | **MISSING** | If chef doesn't visit dashboard for 2 days, critical items stay buried; no email/push escalation for aging critical queue items      |
| Post-event closure       | **PASSIVE** | AAR prompt shown but not enforced; no "event completed 3 days ago, still no financial closure" escalation                            |

---

## Master Break Point Registry

Every place data stops flowing, sorted by severity.

### Critical (safety or financial accuracy)

| ID  | Chain | Break                                            | File                                 | Fix Complexity                                       |
| --- | ----- | ------------------------------------------------ | ------------------------------------ | ---------------------------------------------------- |
| C1  | 3     | Inquiry dietary restrictions not copied to event | `app/api/embed/inquiry/route.ts:278` | Trivial (add 2 fields to INSERT)                     |
| C2  | 1     | Recipe costing ignores 10-tier price resolution  | `lib/recipes/actions.ts:1834`        | Medium (replace column read with resolvePrice call)  |
| C3  | 1     | Menu edits don't flag event for cost review      | `lib/menus/actions.ts:1131-1170`     | Small (add event flagging after component mutations) |

### High (data dead ends that waste collected intelligence)

| ID  | Chain | Break                                                 | File                                          | Fix Complexity                                             |
| --- | ----- | ----------------------------------------------------- | --------------------------------------------- | ---------------------------------------------------------- |
| H1  | 4     | Event profitability not consumed by quote engine      | `lib/intelligence/smart-quote-suggestions.ts` | Medium (add profitability weighting to suggestion scoring) |
| H2  | 4     | Recipe feedback never influences menu recommendations | `aar_recipe_feedback` table                   | Medium (create recipe confidence score from track record)  |
| H3  | 2     | Vendor prices not in resolvePrice() chain             | `lib/pricing/resolve-price.ts`                | Medium (add vendor tier between Receipt and API Quote)     |
| H4  | 3     | Shopping list ignores dietary constraints             | `lib/culinary/shopping-list-actions.ts`       | Small (join event/client dietary data, flag allergens)     |

### Medium (missing propagation, stale UI)

| ID  | Chain | Break                                               | File                                    | Fix Complexity                                                |
| --- | ----- | --------------------------------------------------- | --------------------------------------- | ------------------------------------------------------------- |
| M1  | 1     | No revalidatePath after menu component changes      | `lib/menus/actions.ts:1169`             | Trivial (add revalidatePath calls)                            |
| M2  | 1     | event_financial_summary disconnected from menu cost | Layer 3 migration view                  | Medium (join or add planned cost column)                      |
| M3  | 2     | Store preference doesn't filter catalog             | `lib/grocery/store-shopping-actions.ts` | Medium (vendor personalization spec covers this)              |
| M4  | 3     | Inquiry notes orphaned from event page              | `app/(chef)/events/[id]/page.tsx`       | Small (embed inquiry constraint summary card)                 |
| M5  | 5     | No escalation for aging critical queue items        | `lib/queue/build.ts`                    | Medium (add scheduled email/push for items > 24h at critical) |

### Low (nice-to-have connections)

| ID  | Chain | Break                                                 | File                          | Fix Complexity                                              |
| --- | ----- | ----------------------------------------------------- | ----------------------------- | ----------------------------------------------------------- |
| L1  | 4     | Ingredient issues don't trigger remediation           | `aar_ingredient_issues` table | Medium (workflow: substitution -> vendor review)            |
| L2  | 5     | No "stuck in stage" anomaly detection                 | `lib/workflow/`               | Medium (compare time-in-stage to historical baseline)       |
| L3  | 5     | No aggregate "event X% ready" metric                  | `lib/events/readiness.ts`     | Small (count passed gates / total gates)                    |
| L4  | 2     | "Add to Pantry" from catalog not implemented          | N/A                           | Medium (new server action + UI button)                      |
| L5  | 4     | Recipe timing feedback doesn't improve prep estimates | `aar_recipe_feedback`         | Small (average timing_accuracy -> adjust prep_time_minutes) |

---

## Vendor Personalization Spec: Revision Assessment

The spec at `docs/specs/vendor-personalization-layer.md` addresses catalog filtering (M3) but does NOT address:

- **H3**: Vendor prices feeding into `resolvePrice()` as a price tier
- **BP5 from Chain 2**: Vendor assignment changes cascading cost updates
- **The propagation question**: When a chef assigns Vendor A to tomatoes, does the cost of every recipe using tomatoes update?

The spec should be revised to include a "Cost Propagation" section addressing H3 before it goes to a builder. Without it, the vendor layer remains a display feature that doesn't actually influence the costing chain.

---

## The System Today vs. Operating System

| Attribute                                          | Current State                                            | Operating System State                                    |
| -------------------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------- |
| Price change cascades to all affected costs        | Manual trigger required                                  | Automatic propagation                                     |
| Vendor selection influences pricing                | Reference-only, parallel track                           | Vendor prices feed cost chain                             |
| Inquiry data persists through execution            | 64% of fields propagate; allergies lost                  | 100% propagation; constraints enforced                    |
| Post-event data improves future decisions          | Only receipts feed pricing; everything else dead-ends    | Profitability shapes quotes; recipe feedback shapes menus |
| System surfaces what needs attention               | Strong priority queue, but no escalation                 | Queue + scheduled escalation + progress tracking          |
| Every action answers "what does this affect next?" | Partial (some revalidation, no cross-system propagation) | Full downstream awareness                                 |

## Recommendations (Priority Order)

1. **Fix C1 immediately** - inquiry dietary restrictions to event (safety, trivial fix)
2. **Fix C2 + C3** - wire resolvePrice() into recipe costing; flag events on menu edits
3. **Fix H3** - add vendor prices as a resolvePrice() tier; revise vendor spec
4. **Fix H1 + H2** - close the feedback loop (profitability -> quotes, recipe feedback -> confidence score)
5. **Fix M1 + M4** - cache invalidation after menu edits; inquiry context on event page
6. **Fix H4** - allergen awareness in shopping lists
7. **Fix M5** - escalation for aging critical queue items

---

## Gaps and Unknowns

- Did not audit whether scheduled jobs (`lib/ai/scheduled/job-definitions.ts`) are actually running in production or only defined
- Did not trace the full Remy AI integration (whether Remy surfaces these gaps conversationally)
- Did not audit the client portal side (whether clients see stale data)
- OneSignal push notification wiring is configured but delivery not verified

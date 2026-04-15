# Menu System Interrogation

> **Purpose:** High-leverage Q&A that exposes every failure point and forces the menu system into a fully specified, verifiable state.
> **Status:** active working document - answers fill in as verified
> **Created:** 2026-04-15
> **Scope:** menus, dishes, components, recipes, costing, attachment, approval, templates, tasting, upload, dinner circle, intelligence layer

Each question is tagged with:

- **Failure type:** the category of risk
- **Current behavior:** what the code actually does today (verified from schema/actions)
- **Gap / decision needed:** what is underspecified or broken
- **Build path:** the minimal change that resolves it

---

## A. Costing Pipeline

### A1. NULL ingredient prices silently zero out - no warning surfaced

**Failure type:** silent data corruption  
**Current behavior:** `compute_recipe_cost_cents()` treats `NULL` last_price_cents as `0`. A recipe with 5 ingredients where 3 have no price returns the cost of only 2 ingredients. No error, no flag, no visual indicator.  
**Gap:** `recipe_cost_summary` view has a `has_all_prices` boolean, but: (a) is it computed correctly? (b) is it surfaced in any UI? (c) does it reach the chef before they quote a job?  
**Build path:** Surface `has_all_prices` prominently in the menu editor sidebar, cost estimator, and event costing view. When `has_all_prices = false`, show exactly which ingredients are missing prices with a link to set them. Never show a cost figure without a confidence indicator.

---

### A2. Components without recipe_id are excluded from cost with no warning

**Failure type:** silent data corruption  
**Current behavior:** `compute_menu_cost_cents()` filters `WHERE c.recipe_id IS NOT NULL`. A dish component named "House-Made Pasta" with no recipe attached contributes $0 to the menu cost. Chef sees a lower cost than reality.  
**Gap:** No UI feedback that some components are uncosted. The cost total looks real.  
**Build path:** In the menu editor, show a "components without recipes" count on each dish. In the cost sidebar, show "X components excluded from cost estimate" with links to the gaps. Add this to the menu intelligence pre-send check.

---

### A3. Cost is computed on demand, never stored - race condition on ingredient price changes

**Failure type:** data integrity  
**Current behavior:** `compute_recipe_cost_cents` reads `ingredients.last_price_cents` at query time. If the chef updates ingredient prices mid-quote, the quoted figure changes with no notification.  
**Gap:** A chef quotes a job on Monday, ingredient prices update Tuesday (from OpenClaw sync), the event page now shows a different cost from what was quoted. No audit trail of "cost at time of quote."  
**Decision needed:** Snapshot cost at quote send time? Or keep live and warn on price drift? Snapshot is safer.  
**Build path:** When chef sends a quote, stamp `food_cost_snapshot_cents` on the event or quote record alongside `computed_at`. Show both the live cost and the quoted cost when they diverge.

---

### A4. scale_factor has no upper bound - can be set to any positive value

**Failure type:** data integrity  
**Current behavior:** `components.scale_factor DECIMAL(5,2) NOT NULL DEFAULT 1.0 CHECK (scale_factor > 0)`. A scale_factor of 999.99 is valid.  
**Gap:** No UI validation, no warning if scale factor is implausibly high (e.g., 50x). This would produce completely wrong cost estimates.  
**Build path:** Add a soft warning in the component editor when `scale_factor > 5`. Add a hard cap in the Zod schema at a sensible maximum (e.g., 20).

---

### A5. Cost per guest returns NULL when guest_count is missing - is NULL vs zero handled correctly in UI?

**Failure type:** hallucination risk  
**Current behavior:** `menu_cost_summary` view returns `NULL` for `cost_per_guest_cents` when `guest_count IS NULL OR guest_count = 0`.  
**Gap:** Does the UI render `$0.00` or "N/A"? Rendering NULL as `$0.00` is a Zero Hallucination violation.  
**Decision needed:** Verify what every surface renders when this value is NULL.  
**Build path:** Audit every cost display component. Wherever `cost_per_guest_cents` could be NULL, render "N/A" or "Set guest count to calculate."

---

### A6. V1 costing does no unit conversion - silent cost error when units don't match

**Failure type:** silent data corruption  
**Current behavior:** `quantity * last_price_cents` with no unit reconciliation. If recipe says "500g flour" but ingredient is priced "per lb", the math is wrong by ~2.2x.  
**Gap:** This is documented as a V1 limitation but there is no user-facing warning anywhere that unit mismatch exists.  
**Decision needed:** Is this acceptable for V1 or does it need a mismatch detector?  
**Build path (minimal):** When `recipe_ingredients.unit` doesn't match `ingredients.price_unit`, flag it visually. Don't block, but don't silently compute wrong numbers.

---

## B. State Machine & Lifecycle

### B1. `draft → archived` transition is valid - intended?

**Failure type:** underspecified behavior  
**Current behavior:** DB trigger allows `draft → archived` (skipping `shared` and `locked`). This means a chef can archive a menu they never shared.  
**Decision needed:** Is this intentional? If so, what is the use case?  
**Build path:** If intentional, document it. If not, remove `archived` from the valid targets of `draft` in the trigger.

---

### B2. `shared → draft` revert is valid - what happens to a pending approval request?

**Failure type:** state machine conflict  
**Current behavior:** DB trigger allows `shared → draft`. The `menu_approval_requests` table records sent_at and status. If a chef reverts a menu to draft after sending for approval, the `menu_approval_requests` record stays in `status = 'sent'`.  
**Gap:** Client now has a link to approve a menu that the chef has reverted to draft. Client can still POST to `respondToMenuApproval()`. What does the client see? What does the approval response do to an event whose menu is now back in draft?  
**Build path:** When menu status reverts to `draft`, automatically cancel all `status = 'sent'` approval requests (set to `cancelled` - needs a new enum value or `deleted_at`). Notify client that the menu is being revised.

---

### B3. `locked → archived` is the only exit from locked - can a locked menu be edited?

**Failure type:** underspecified behavior  
**Current behavior:** Once locked, the only valid transition is to `archived`. No transition back to `shared` or `draft`.  
**Gap:** What does the UI show when a chef tries to edit a locked menu? Is there a visual lock indicator? Does the editor allow saves? Does the server action reject the update?  
**Decision needed:** Is "locked" a formal state the chef explicitly sets, or does it set automatically (e.g., on approval)?  
**Build path:** If locked menus should be editable with tracking (e.g., for post-approval revisions), add `locked → shared` transition with a reason field. If they are truly immutable, the editor must show a read-only state and block save actions.

---

### B4. No constraint prevents multiple menus pointing to the same event_id

**Failure type:** data integrity gap  
**Current behavior:** `menus.event_id` has no `UNIQUE` constraint. Multiple menu records can reference the same event. The atomic attach function sets `events.menu_id` to the new menu_id, effectively orphaning the previous menu's event_id pointer (it stays set, but is now wrong).  
**Gap:** If this happens, `compute_projected_food_cost_cents(event_id)` calls `compute_menu_cost_cents(event.menu_id)` - using `events.menu_id` not `menus.event_id`. So the cost computation is safe, but the orphaned menu's `event_id` is a lie.  
**Build path:** Add `UNIQUE(event_id)` to `menus` table (allow NULL, but only one non-null per event_id) in a migration. Or at minimum, when attaching a new menu to an event, clear the old menu's `event_id` in the same transaction.

---

### B5. `ON DELETE SET NULL` on `menus.event_id` does not clear `events.menu_id`

**Failure type:** dangling reference  
**Current behavior:** If an event is deleted, `menus.event_id` is set to NULL (via ON DELETE SET NULL). But `events` is the table being deleted, so `events.menu_id` goes away with the event.  
**Gap:** Actually this is fine - but verify: if a menu's `event_id` is NULLed (event deleted), does the menu still appear in the menu list? Does it appear as "unattached"? Is it still accessible from the `/menus` page?  
**Decision needed:** Should menus survive event deletion, or should they be deleted with the event?  
**Build path:** Verify the menu list query handles `event_id IS NULL` gracefully and shows the menu as "unattached" rather than erroring.

---

## C. Approval Workflow

### C1. Can chef send a draft-status menu for approval?

**Failure type:** state machine gap  
**Current behavior:** `sendMenuForApproval(eventId)` calls the atomic RPC. The RPC presumably does not check menu status.  
**Decision needed:** Should approval require menu to be in `shared` or `locked` status? Or is any status valid?  
**Build path:** Add a guard in `sendMenuForApproval` that throws if menu is in `draft` status. Surface a clear error: "Finalize your menu before sending."

---

### C2. Can chef send an empty menu (no dishes) for approval?

**Failure type:** hallucination risk  
**Current behavior:** No check in `sendMenuForApproval` for dish count. A menu with 0 dishes can be sent.  
**Gap:** Client receives approval request for a menu with no content.  
**Build path:** Guard in `sendMenuForApproval`: if `dish count = 0`, throw with message "Add at least one course before sending."

---

### C3. After client approves, `menu_modified_after_approval` flag is set when chef edits - but does the flag ever reset?

**Failure type:** state integrity  
**Current behavior:** `notifyClientOfMenuEdit()` in `editor-actions.ts` sets `menu_modified_after_approval = true`. No reset logic exists.  
**Gap:** If client re-approves the revised menu, does the flag reset to `false`? If not, the flag is permanently true after the first revision, which makes it meaningless.  
**Build path:** In `respondToMenuApproval()` when client approves, set `menu_modified_after_approval = false` and create a new approval record.

---

### C4. Client can only respond once - no re-submission after revision

**Failure type:** underspecified workflow  
**Current behavior:** `respondToMenuApproval()` checks `IF v_request.status <> 'sent' THEN RAISE EXCEPTION`. This prevents double-response.  
**Gap:** After chef revises (in response to "revision requested"), how does chef re-send for approval? Does a new `menu_approval_requests` record get created, or does the old one get updated?  
**Decision needed:** Is the re-send path implemented? Is it a new row in `menu_approval_requests` or an update to the existing row?  
**Build path:** Implement "re-send for approval" as creating a new `menu_approval_requests` row with a fresh snapshot. The old row stays for audit trail.

---

### C5. `menu_snapshot (JSONB)` is built at send time - what exactly is captured?

**Failure type:** audit integrity  
**Current behavior:** `sendMenuForApproval` builds a rich snapshot. Content of that snapshot is critical - if it omits component details or allergen flags, the "approved" version is incomplete.  
**Gap:** Verify snapshot includes: menu name, all dishes (name, course, description, dietary tags, allergen flags), chef notes, service style, guest count.  
**Build path:** Add a snapshot schema definition and validate completeness at send time. Log a warning if any dishes lack descriptions or allergen flags.

---

## D. Attachment & Relationships

### D1. A chef can attach a template menu directly to an event without duplicating it

**Failure type:** data integrity  
**Current behavior:** `is_template` flag exists on menus. But `attach_menu_to_event_atomic()` does not check `is_template`.  
**Gap:** A template menu could be attached to an event. If the chef then edits it, the "template" is now an event-specific menu. The template is corrupted for future use.  
**Build path:** In `attach_menu_to_event_atomic()`, check `is_template = true` and either reject (must duplicate first) or auto-duplicate with a transaction.

---

### D2. No direct client-to-menu relationship - "standing menus" are impossible

**Failure type:** product gap  
**Current behavior:** Menu-to-client relationship only exists through an event. To assign a menu to a client, an event must exist.  
**Gap:** A household chef who cooks weekly for the same family cannot maintain a "current rotation menu" for that client without creating a phantom event.  
**Decision needed:** Should a menu be attachable directly to a client record for reference (not approval)?  
**Build path:** Add optional `client_id` FK to `menus` table (nullable, non-exclusive with event_id). Allow menu list to filter by client. This is additive - no existing behavior changes.

---

### D3. Dinner circle menu access timing is unspecified

**Failure type:** product gap  
**Current behavior:** When menu attaches to event, dinner circle members get access. But at what status? On attachment? On approval? On event `confirmed` status?  
**Gap:** If guests see an unapproved draft menu, the chef looks unprepared. If guests see nothing until final approval, they can't give dietary feedback.  
**Decision needed:** Define the access tier: (a) draft - internal only, (b) shared - dinner circle can see, (c) locked/approved - dinner circle can see.  
**Build path:** Add `visible_to_dinner_circle` boolean to menus (default false). Chef explicitly controls when guests see it. Add a toggle in the menu editor.

---

### D4. Dinner circle guests cannot submit dietary preferences that feed the intelligence layer

**Failure type:** product gap  
**Current behavior:** Client taste alignment in the intelligence layer reads from `client_preferences` or similar. Dinner circle guests have no equivalent intake path.  
**Gap:** A family's guests (booked through a dinner circle hub) have known dietary restrictions but no way to register them.  
**Build path:** Add a guest dietary preference form to the dinner circle portal (pre-event, lightweight - just "any dietary restrictions?"). Feed into `allergen_validation` in the intelligence layer.

---

## E. Intelligence Layer

### E1. Seasonal warnings: what is the data source?

**Failure type:** underspecified dependency  
**Current behavior:** `seasonalMenuWarnings()` in `menu-intelligence-actions.ts` generates alerts for out-of-season ingredients.  
**Gap:** Where does it get seasonality data? Is this hardcoded by ingredient name? Pulled from OpenClaw? Based on chef's home_state? What happens if the ingredient name doesn't match any known seasonal pattern?  
**Decision needed:** Source of truth for ingredient seasonality.  
**Build path:** Document the source. If hardcoded, create a `seasonal_availability` table with (ingredient_category, region, start_month, end_month). If from OpenClaw, ensure the sync populates it.

---

### E2. Client taste alignment with no client dietary profile returns... what?

**Failure type:** hallucination risk  
**Current behavior:** `clientTasteAlignment()` checks menu against client dietary restrictions.  
**Gap:** If the event has no client, or the client has no dietary profile, does this: (a) return empty (safe), (b) return null (might crash renderer), (c) show "no conflicts found" (false positive)?  
**Decision needed:** Define the behavior for missing client data.  
**Build path:** When no client dietary data exists, show "No client profile - add dietary notes to the event." Never show "No conflicts" when the conflict check was never run.

---

### E3. Budget compliance: behavior when quoted_price_cents is NULL

**Failure type:** hallucination risk  
**Current behavior:** `menu_cost_summary` computes `food_cost_percentage` using `events.quoted_price_cents`. When NULL, percentage is undefined.  
**Gap:** Does the budget compliance feature show "0%" or "N/A" or nothing?  
**Build path:** When `quoted_price_cents IS NULL`, the budget compliance panel shows "Set a quote price to see food cost %." Never show 0% or any computed value.

---

### E4. Menu history "repeat" detection: what defines "same menu"?

**Failure type:** underspecified behavior  
**Current behavior:** `repeatMenuDetection()` warns chef about repeated menus.  
**Gap:** What defines a repeat? Same menu record? Same dish names? Same recipe_ids? What similarity threshold triggers the warning?  
**Decision needed:** Define the matching algorithm.  
**Build path:** Use recipe_id overlap > 70% as the threshold. Surface the matching dishes in the warning, not just "this looks like a previous menu."

---

## F. Template System

### F1. Template `dishes` column is JSONB - are templates recipe-linked or name-only?

**Failure type:** product gap  
**Current behavior:** `menu_templates` stores `dishes (JSONB)`. The structure of this JSONB is not enforced by a schema constraint.  
**Gap:** If JSONB contains only dish names (no recipe_ids), templates produce uncosted menus. If it contains recipe_ids, they may go stale if the recipe is deleted.  
**Decision needed:** Template JSONB schema. Include recipe_ids or not?  
**Build path:** Define and document the JSONB schema. Add a JSON Schema validation step when templates are saved.

---

### F2. Applying a template: deep copy or reference?

**Failure type:** product gap  
**Current behavior:** Unknown from migration alone - need to check `template-actions.ts` `applyTemplate()` function.  
**Decision needed:** When a template is applied to a menu: (a) deep copy - creates new dish records with component/recipe links, (b) reference - the menu points to template dishes. Deep copy is correct.  
**Build path:** Verify `applyTemplate()` creates new `dishes` and `components` rows. If it doesn't, fix it.

---

## G. Tasting Menu Builder

### G1. Tasting menu costing: how is cost computed?

**Failure type:** product gap  
**Current behavior:** Tasting menus live in `tasting_menus` + `tasting_menu_courses`. They bridge to the main menu engine via `tasting-menu-bridge.ts`.  
**Gap:** Does `compute_menu_cost_cents()` work on tasting menus? Or is there a separate cost computation? Or no cost computation at all?  
**Decision needed:** Define the costing path for tasting menus.  
**Build path:** If tasting menus reference `recipe_id` on each course, use `compute_recipe_cost_cents()` per course. Sum to get tasting menu total. Surface in the tasting menu builder UI.

---

### G2. Can two courses in a tasting menu share the same course_type?

**Failure type:** data integrity  
**Current behavior:** `tasting_menu_courses` has `course_type (enum)`. No UNIQUE constraint on `(tasting_menu_id, course_type)`.  
**Gap:** A tasting menu could have two "main" courses. Is this valid (some menus do this) or a data error?  
**Decision needed:** Allow multiple courses of same type, or enforce uniqueness?  
**Build path:** If allowed, the UI should handle rendering two "main" sections cleanly. If not, add `UNIQUE(tasting_menu_id, course_type)`.

---

### G3. Can a tasting menu be sent for client approval via the standard approval flow?

**Failure type:** product gap  
**Current behavior:** `sendMenuForApproval()` operates on events which have a `menus.event_id`. Tasting menus are in a separate table.  
**Gap:** A chef planning a tasting dinner cannot use the approval flow without first bridging the tasting menu to the main menus table.  
**Decision needed:** Is the bridge automatic? Or is tasting menu approval out of scope?  
**Build path:** When a tasting menu is "published" (chef marks it ready), auto-create a `menus` record linked to the event with a snapshot of the tasting menu. This record feeds the approval flow.

---

## H. Upload & OCR Pipeline

### H1. Abandoned upload jobs leave extracted data in limbo

**Failure type:** data leakage / cleanup gap  
**Current behavior:** `createUploadJob()` stores metadata. `parseMenuWithAI()` runs extraction. If chef never calls `approveDishesBatch()`, the extracted data sits indefinitely.  
**Gap:** No TTL, no cleanup job, no "abandoned" status.  
**Build path:** Add `status (enum: pending, extracting, awaiting_review, approved, abandoned)` to upload jobs. Cron job marks jobs older than 7 days with no action as `abandoned`. Abandoned jobs are excluded from the chef's active list.

---

### H2. OCR-extracted dishes could create duplicate course_numbers

**Failure type:** data integrity  
**Current behavior:** `dishes` has `UNIQUE(menu_id, course_number)`. If OCR extracts dishes for a menu that already has course 1 and 2, and the extracted dishes also start at course 1, the batch insert would fail.  
**Gap:** `approveDishesBatch()` may not handle this conflict.  
**Build path:** In `approveDishesBatch()`, auto-increment course numbers starting from `MAX(course_number) + 1` for the target menu. Or surface a conflict resolution UI.

---

## I. Scaling & Guest Count

### I1. Guest count change after menu is approved - no notification or cost update

**Failure type:** state integrity  
**Current behavior:** Event's `guest_count` can be updated at any time. This immediately changes `cost_per_guest_cents` and `food_cost_percentage` in the views.  
**Gap:** If chef updated guest count from 8 to 12 after client approved the menu at 8 guests, the client's approved snapshot is now stale.  
**Decision needed:** Should guest count changes re-trigger the approval flow? Or just notify chef?  
**Build path:** When `guest_count` changes on an event with `menu_approval_status = 'approved'`, set `menu_modified_after_approval = true` and notify client.

---

### I2. Shopping list generation from menus - does scaling affect it?

**Failure type:** product gap  
**Current behavior:** `menu-shopping-list.tsx` generates an aggregated ingredient list. Components have `scale_factor` and `portion_quantity`.  
**Gap:** When a menu is scaled to a new guest count, does the shopping list recalculate? Or is it based on base recipe quantities?  
**Decision needed:** Define the shopping list quantity formula: `recipe_ingredient.quantity × component.scale_factor × (guest_count / recipe.yield_quantity)`.  
**Build path:** Implement the formula explicitly in `getShoppingList()`. Show the guest_count used in the calculation prominently.

---

## J. Print & Export

### J1. Print view with empty menu - what renders?

**Failure type:** hallucination risk  
**Current behavior:** `/print/menu/[id]` renders a menu card.  
**Gap:** If menu has no dishes, does the print view show empty course lines, or nothing, or an error?  
**Build path:** Print view must check dish count. If 0, render "No courses added to this menu yet." or block print entirely with a message.

---

### J2. Front-of-house menu generation - what is the source of truth?

**Failure type:** two sources of truth  
**Current behavior:** `front_of_house_menus` table exists. `GET/POST /api/v2/documents/foh-menu/[eventId]` generates FOH menus.  
**Gap:** Are FOH menus generated from live `dishes` records, or from `menu_snapshot (JSONB)`, or from a separate FOH template? If from live data, editing a dish after FOH generation changes the printed menu.  
**Decision needed:** FOH menus should snapshot at generation time, like approval snapshots.  
**Build path:** FOH generation captures a snapshot at print time. Subsequent dish edits don't change the printed version. Show "regenerate" button if menu changed after last FOH generation.

---

## K. Analytics & Sources of Truth

### K1. `menu_items` vs `dishes` - two sources of truth for menu content

**Failure type:** data integrity  
**Current behavior:** `dishes` table is the structural source (actual menu composition). `menu_items` table is the analytics source (`times_served, price_cents, food_cost_cents`).  
**Gap:** When is a `menu_items` row created? On dish creation? On event completion? Manually? If not synced automatically, the analytics table drifts from the structural table.  
**Decision needed:** Define the sync path between `dishes` and `menu_items`.  
**Build path:** On event completion trigger (already exists for `increment_recipe_times_cooked`), upsert `menu_items` rows from the event's menu dishes. This makes analytics eventually-consistent with real usage.

---

### K2. `served_dish_history` vs `menu_service_history` - what is each used for?

**Failure type:** underspecified schema  
**Current behavior:** Two history tables exist.  
**Gap:** Are they written to? By what? Are they used in any query?  
**Build path:** Audit which server actions write to each table. If neither is written to, they are dead tables - document them as planned (not built) or remove them.

---

## L. Cross-Cutting Gaps

### L1. No menu validation pre-send checklist

**Failure type:** product gap  
**Current behavior:** Chef can send a menu for approval with: no dishes, uncosted components, missing allergen flags, a guest count of 0.  
**Build path:** Create a `validateMenuForSend(menuId)` function that runs before `sendMenuForApproval()`:

- At least 1 dish
- All dishes have at least a name and description
- No components flagged as "uncosted"
- Guest count > 0 on the event
- Allergen flags reviewed (at least confirmed as empty if no allergens)

Return a structured list of failures. Block send if critical failures exist. Warn (non-blocking) for soft issues.

---

### L2. The notes-dishes-menus pipeline spec is marked "built" but Playwright verification is missing

**Failure type:** verification gap  
**Current behavior:** `docs/specs/notes-dishes-menus-client-event-pipeline.md` shows Build completed but no Playwright verified date.  
**Gap:** Unknown whether the note promotion flow, dish reuse (reference vs copy), and menu assembly pipeline actually work end-to-end.  
**Build path:** Run Playwright verification of: (1) create a note, (2) promote to dish, (3) add dish to menu by reference, (4) add dish to menu by copy, (5) attach menu to event, (6) confirm dish changes propagate correctly in reference mode and do not propagate in copy mode.

---

### L3. No single "menu health score" visible to chef before any action

**Failure type:** product gap  
**Current behavior:** Intelligence checks, costing gaps, approval status, and validation errors exist across multiple surfaces.  
**Gap:** Chef has no quick "is this menu ready?" signal.  
**Build path:** Menu detail page and culinary editor sidebar show a readiness score: [Dishes: 4/4] [Costed: 3/4] [Allergens reviewed: yes] [Approved: no] [Sent: no]. Each line is actionable. This is a display component, no new data needed.

---

## Verification Protocol

For each answer above, verification is done by one of:

- **DB:** Query against the local PostgreSQL instance
- **Code:** Read the exact function in the server action
- **UI:** Playwright screenshot with the agent account
- **Build:** TypeScript compilation confirms types

Mark each answer with: `verified(DB) | verified(code) | verified(UI) | assumed | unverified`

---

## Priority Order (build sequence)

| Priority | Question   | Why                                                 |
| -------- | ---------- | --------------------------------------------------- |
| P0       | A1, A2     | Silent cost lies. Chef quotes wrong, loses money.   |
| P0       | C2         | Empty menu can be sent for client approval.         |
| P0       | D1         | Template corruption on attach.                      |
| P0       | B4         | Multiple menus can point to same event (no UNIQUE). |
| P0       | L1         | No pre-send validation at all.                      |
| P1       | A3         | Cost snapshot at quote time.                        |
| P1       | B2         | Stale approval request after menu revert to draft.  |
| P1       | C3         | `menu_modified_after_approval` never resets.        |
| P1       | J2         | FOH menu should snapshot, not live.                 |
| P1       | K1         | menu_items analytics never written automatically.   |
| P2       | A4, A6     | Scale factor bounds, unit mismatch warnings.        |
| P2       | B1, B3     | State machine clarification.                        |
| P2       | D3         | Dinner circle menu visibility timing.               |
| P2       | E1, E2, E3 | Intelligence layer data sources and null handling.  |
| P2       | L3         | Menu health score dashboard component.              |
| P3       | D2         | Client-direct menu attachment.                      |
| P3       | D4         | Dinner circle guest dietary preferences.            |
| P3       | G1-G3      | Tasting menu costing and approval path.             |

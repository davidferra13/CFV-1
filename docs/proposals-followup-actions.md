# Proposals & Follow-Up Server Actions

**Date:** 2026-02-20
**Branch:** `feature/scheduling-improvements`
**Status:** Actions only (no migrations, no UI)

---

## Overview

Six new server action files covering the proposals system and automated follow-up sequences. These files are action-layer only — they depend on database tables that will be created in a future migration. All queries use `(supabase as any)` to bypass generated type checking until `types/database.ts` is regenerated.

---

## Files Created

### 1. `lib/proposals/template-actions.ts`

**Table:** `proposal_templates`
**Purpose:** CRUD for reusable proposal templates that chefs can apply when building client-facing quotes.

| Export                       | Type     | Auth | Description                                                                                                |
| ---------------------------- | -------- | ---- | ---------------------------------------------------------------------------------------------------------- |
| `createProposalTemplate()`   | Mutation | Chef | Insert a new template with name, cover photo, description, default menu, base price, and included services |
| `listProposalTemplates()`    | Query    | Chef | List all templates for the chef, ordered by name                                                           |
| `getProposalTemplate(id)`    | Query    | Chef | Fetch a single template by ID                                                                              |
| `deleteProposalTemplate(id)` | Mutation | Chef | Delete a template (tenant-scoped)                                                                          |

**Types exported:** `ProposalTemplate`

---

### 2. `lib/proposals/addon-actions.ts`

**Table:** `proposal_addons`
**Purpose:** Manage add-on items (e.g., "cocktail hour", "dessert station") that can be toggled onto quotes at a per-person price.

| Export                                           | Type     | Auth | Description                                                              |
| ------------------------------------------------ | -------- | ---- | ------------------------------------------------------------------------ |
| `createAddon()`                                  | Mutation | Chef | Insert a new addon                                                       |
| `listAddons()`                                   | Query    | Chef | List all addons for the chef                                             |
| `updateAddon(id, updates)`                       | Mutation | Chef | Partial update of addon fields                                           |
| `deleteAddon(id)`                                | Mutation | Chef | Delete an addon (tenant-scoped)                                          |
| `toggleAddonForQuote(quoteId, addonId, enabled)` | Query    | Chef | Placeholder — returns addon price info for client-side total calculation |

**Types exported:** `ProposalAddon`, `AddonToggleResult`

---

### 3. `lib/proposals/view-tracking-actions.ts`

**Table:** `proposal_views`
**Purpose:** Track when clients view a proposal and provide analytics to the chef.

| Export                              | Type     | Auth                    | Description                                                                          |
| ----------------------------------- | -------- | ----------------------- | ------------------------------------------------------------------------------------ |
| `recordProposalView()`              | Mutation | **None** (admin client) | Insert a view record from the client-facing proposal page                            |
| `getProposalViewAnalytics(quoteId)` | Query    | Chef                    | Aggregated analytics: view count, unique IPs, avg time on page, most viewed sections |

**Design decision:** `recordProposalView` uses `createServerClient({ admin: true })` because it is called from unauthenticated client-facing pages. The chef auth check is intentionally skipped for this single function. Analytics retrieval requires chef auth and verifies quote ownership.

**Types exported:** `ProposalView`, `ProposalViewAnalytics`

---

### 4. `lib/proposals/smart-field-actions.ts`

**Table:** `smart_field_values` (UNIQUE on `chef_id, field_key`)
**Purpose:** Key-value store of reusable text fields that can be token-replaced into proposal templates.

| Export                                  | Type     | Auth | Description                                                                                                                           |
| --------------------------------------- | -------- | ---- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `getSmartFields()`                      | Query    | Chef | List all smart field key-value pairs                                                                                                  |
| `saveSmartField(fieldKey, fieldValue)`  | Mutation | Chef | Upsert a field (insert or update by key)                                                                                              |
| `renderSmartFields(template, context?)` | Query    | Chef | Replace `{tokens}` in a template string; supports built-in context (`clientName`, `eventDate`, `guestCount`) plus custom smart fields |

**Token resolution order:** Custom smart fields are loaded first, then context values (`clientName`, `eventDate`, `guestCount`) override any matching keys. Unreplaced tokens remain as `{token}` in the output. The response includes `tokensReplaced` and `tokensMissing` arrays for UI feedback.

**Types exported:** `SmartField`, `RenderedTemplate`

---

### 5. `lib/followup/rule-actions.ts`

**Table:** `followup_rules`
**Purpose:** Define trigger-based rules for automated follow-ups (e.g., "3 days after proposal sent, use template X").

| Export                             | Type     | Auth | Description                                                       |
| ---------------------------------- | -------- | ---- | ----------------------------------------------------------------- |
| `createFollowupRule()`             | Mutation | Chef | Create a rule with trigger type, delay, and template reference    |
| `listFollowupRules()`              | Query    | Chef | List all rules, ordered by trigger type then delay                |
| `toggleFollowupRule(id, isActive)` | Mutation | Chef | Enable or disable a rule                                          |
| `processFollowupRules()`           | Query    | Chef | Evaluate all active rules and return pending actions that are due |

**Trigger types:** `proposal_sent`, `proposal_viewed`, `booking_confirmed`, `event_completed`, `dormant`

**Processing logic in `processFollowupRules`:**

- `proposal_sent` — checks quotes in `proposed` status against `created_at + delay_days`
- `proposal_viewed` — checks `proposal_views` first-view timestamps
- `booking_confirmed` — checks `event_transitions` for `to_status = 'confirmed'`
- `event_completed` — checks events in `completed` status against `updated_at`
- `dormant` — checks clients with no event in the last 90 days

This function is intentionally read-only. It returns `PendingFollowup[]` but does NOT send emails or execute side effects.

**Types exported:** `FollowupRule`, `FollowupTriggerType`, `PendingFollowup`

---

### 6. `lib/followup/sequence-builder-actions.ts`

**Tables:** `automated_sequences`, `sequence_steps`
**Purpose:** Builder functions that create multi-step email sequences with pre-defined content.

| Export                                          | Type     | Auth | Description                                                                         |
| ----------------------------------------------- | -------- | ---- | ----------------------------------------------------------------------------------- |
| `buildPostBookingSequence(eventId)`             | Mutation | Chef | 3-step: thank-you (day 0), menu-review (day 3), final-details (7 days before event) |
| `buildReEngagementSequence(clientId)`           | Mutation | Chef | 3-step: check-in (day 0), special-offer (day 7), follow-up (day 21)                 |
| `buildBirthdaySequence(clientId, birthdayDate)` | Mutation | Chef | 2-step: birthday-wish (on date), special-dinner (7 days after)                      |

Each builder inserts one `automated_sequences` row and multiple `sequence_steps` rows. Step `delay_days` values are computed relative to today for date-aware sequences (post-booking final-details, birthday).

**Types exported:** `AutomatedSequence`, `SequenceStep`

---

## Pattern Compliance

All 6 files follow the established server action pattern:

- `'use server'` directive at top
- Zod input validation schemas
- `requireChef()` for auth (except `recordProposalView` which uses admin client)
- `createServerClient()` for database access
- `(supabase as any)` for all new table queries
- `.eq('chef_id', user.tenantId!)` tenant scoping on every query
- All money in cents (integers)
- Snake_case-to-camelCase mapping in return objects
- `revalidatePath()` after mutations
- Exported TypeScript types for all return values

---

## Dependencies

These actions depend on database tables that must exist before use:

- `proposal_templates` — needs migration
- `proposal_addons` — needs migration
- `proposal_views` — needs migration
- `smart_field_values` — needs migration
- `followup_rules` — needs migration
- `automated_sequences` — may already exist or needs migration
- `sequence_steps` — may already exist or needs migration

**Next step:** Create the migration(s) for these tables, then regenerate `types/database.ts`.

---

## TypeScript Verification

`npx tsc --noEmit --skipLibCheck` passes with zero errors after adding all 6 files.

# Spec: Loyalty Trigger Expansion

> **Status:** in-progress
> **Priority:** P1 (next up)
> **Depends on:** none (builds on existing loyalty system)
> **Estimated complexity:** large (9+ files)
> **Created:** 2026-03-30
> **Built by:** builder session 2026-03-30

---

## What This Does (Plain English)

Today, clients only earn loyalty points when an event is completed. After this spec is built, clients earn points automatically across 14 new touchpoints: completing their profile, leaving reviews, paying on time, approving menus, giving meal feedback, accepting quotes, tipping, collecting RSVPs, and more. Every trigger is configurable (on/off + point value) per chef. The chef's loyalty settings page gets a new "Earning Triggers" section with toggles and point values for each trigger. Clients see real-time point notifications for every trigger that fires.

---

## Why It Matters

The loyalty program only rewards one action (completing an event). Clients have dozens of interactions with the app that go unrecognized. This makes the program feel static and disconnected. Expanding triggers turns every client interaction into a loyalty moment, increasing engagement without requiring the chef to do anything manually.

---

## Files to Create

| File                                                            | Purpose                                                                                          |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `lib/loyalty/triggers.ts`                                       | Trigger registry: definitions, defaults, idempotency helpers, the `fireTrigger()` function       |
| `database/migrations/20260401000138_loyalty_trigger_config.sql` | New columns on `loyalty_config`, `clients`, and `events` for trigger config + idempotency guards |

---

## Files to Modify

| File                                                    | What to Change                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/loyalty/actions.ts`                                | Add `LoyaltyTriggerConfig` type to `LoyaltyConfig`, update `getLoyaltyConfig()` defaults, update `updateLoyaltyConfig()` to accept trigger settings, update `getMyLoyaltyStatus()` to include trigger-earned breakdown                                                                                     |
| `app/(chef)/loyalty/settings/loyalty-settings-form.tsx` | Add "Earning Triggers" section with per-trigger on/off toggles and point value inputs                                                                                                                                                                                                                      |
| `lib/reviews/actions.ts`                                | After `submitClientReview()` (line 35), call `fireTrigger('review_submitted', ...)`. After `recordGoogleReviewClick()` (line 178), call `fireTrigger('google_review_clicked', ...)`. After public consent granted (check `display_consent` field), call `fireTrigger('public_review_consent', ...)`        |
| `lib/clients/client-profile-actions.ts`                 | After `updateMyProfile()` (line 132), check profile completion criteria and call `fireTrigger('profile_completed', ...)`. After `updateMyFunQA()` (line 542), call `fireTrigger('fun_qa_completed', ...)`. After `updateMyServedDishFeedback()` (line 448), call `fireTrigger('meal_feedback_given', ...)` |
| `lib/quotes/client-actions.ts`                          | After `acceptQuote()` (line 79) succeeds, call `fireTrigger('quote_accepted', ...)`. Note: uses RPC `respond_to_quote_atomic` which returns `tenant_id` in response                                                                                                                                        |
| `lib/commerce/payment-actions.ts`                       | After `recordPayment()` (line 39) succeeds, call `fireTrigger('payment_on_time', ...)` and conditionally `fireTrigger('tip_added', ...)`. Note: this is chef-side (`requireChef()`); use `sale.client_id` and `sale.tenant_id` from the fetched sale record, not from session                              |
| `lib/events/menu-approval-actions.ts`                   | After `approveMenu()` (line 188) succeeds, call `fireTrigger('menu_approved', ...)`. Note: uses RPC `respond_menu_approval_atomic`                                                                                                                                                                         |
| `lib/sharing/actions.ts`                                | After `submitRSVP()` (line 2459) succeeds, resolve the guest's email against the `clients` table. If the guest IS a loyalty client, call `fireTrigger('rsvp_collected', ...)`. If not a client, skip silently. Note: this function is PUBLIC (no auth, admin client, share token validation)               |
| `lib/hub/group-actions.ts`                              | After `createHubGroup()` (line 26) succeeds, call `fireTrigger('hub_group_created', ...)`. Note: this is an internal utility with no visible auth; the caller must provide tenantId and clientId                                                                                                           |
| `lib/hub/friend-actions.ts`                             | After `acceptFriendRequest()` (line 146) succeeds, call `fireTrigger('friend_invited', ...)`                                                                                                                                                                                                               |
| `lib/chat/actions.ts`                                   | After `sendChatMessage()` (line 451) inserts the message, query the conversation's message count. If this is the first message from this user in this conversation, call `fireTrigger('chat_engagement', ...)`. Note: uses `requireAuth()` (cross-boundary)                                                |
| `components/loyalty/how-to-earn-panel.tsx`              | Display all active triggers with their point values, grouped by category                                                                                                                                                                                                                                   |
| `lib/loyalty/auto-award.ts`                             | Add retraction notification helper: when points are deducted, send apologetic notification to client                                                                                                                                                                                                       |
| `lib/notifications/types.ts`                            | Add `loyalty_adjustment` and `loyalty_trigger` notification types to the `NotificationAction` union (after line 132) and add config entries to `NOTIFICATION_CONFIG`                                                                                                                                       |

---

## Database Changes

### New Columns on `loyalty_config`

```sql
-- Trigger configuration: JSONB object storing per-trigger settings
-- Each key is a trigger_key, value is { enabled: boolean, points: number }
-- Defaults are applied in application code, not in the DB default
ALTER TABLE loyalty_config
  ADD COLUMN IF NOT EXISTS trigger_config JSONB NOT NULL DEFAULT '{}';
```

### New Columns on `clients` (idempotency guards for one-time triggers)

```sql
-- One-time trigger guards (same pattern as has_received_welcome_points)
ALTER TABLE clients
  ADD COLUMN IF NOT EXISTS loyalty_profile_complete_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_fun_qa_awarded BOOLEAN NOT NULL DEFAULT false;
```

### New Columns on `events` (per-event trigger guards)

```sql
-- Per-event one-time trigger guards
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS loyalty_review_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_public_consent_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_google_review_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_menu_approved_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_quote_accepted_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_tip_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_ontime_payment_awarded BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS loyalty_chat_engagement_awarded BOOLEAN NOT NULL DEFAULT false;
```

### Migration Notes

- Migration filename: `20260401000138_loyalty_trigger_config.sql` (next after 20260401000137_system_ingredients_usda_columns.sql)
- All additive. No existing data affected. Boolean defaults to false, JSONB defaults to empty object.

---

## Data Model

### Trigger Registry (Application Code)

Every trigger has a unique key, a human-readable label, a default point value, a frequency type, and a category.

```typescript
type TriggerFrequency =
  | 'per_event' // Once per event (review, menu approval, etc.)
  | 'per_action' // Every time (meal feedback, RSVP collected)
  | 'one_time' // Once ever per client (profile complete, Q&A)

type TriggerCategory =
  | 'engagement' // Profile, Q&A, chat, hub
  | 'event_lifecycle' // Quote accepted, menu approved, review
  | 'financial' // Payment on time, tip
  | 'social' // RSVP, friend invite, Google review

type TriggerDefinition = {
  key: string
  label: string
  description: string
  defaultPoints: number
  frequency: TriggerFrequency
  category: TriggerCategory
  idempotencyField?: string // Column name for one-time/per-event guards
}
```

### Full Trigger Registry (14 triggers)

| Key                     | Label                       | Default Pts | Frequency  | Category        | Idempotency                                                         |
| ----------------------- | --------------------------- | ----------- | ---------- | --------------- | ------------------------------------------------------------------- |
| `profile_completed`     | Profile completed           | 15          | one_time   | engagement      | `clients.loyalty_profile_complete_awarded`                          |
| `fun_qa_completed`      | Fun Q&A answered            | 10          | one_time   | engagement      | `clients.loyalty_fun_qa_awarded`                                    |
| `review_submitted`      | Review submitted            | 20          | per_event  | event_lifecycle | `events.loyalty_review_awarded`                                     |
| `google_review_clicked` | Google review clicked       | 25          | per_event  | social          | `events.loyalty_google_review_awarded`                              |
| `public_review_consent` | Public review consent       | 10          | per_event  | social          | `events.loyalty_public_consent_awarded`                             |
| `quote_accepted`        | Quote accepted              | 10          | per_event  | event_lifecycle | `events.loyalty_quote_accepted_awarded`                             |
| `payment_on_time`       | On-time payment             | 15          | per_event  | financial       | `events.loyalty_ontime_payment_awarded`                             |
| `tip_added`             | Tip added                   | 10          | per_event  | financial       | `events.loyalty_tip_awarded`                                        |
| `rsvp_collected`        | Guest RSVP collected        | 5           | per_action | social          | none (fires per RSVP, only for guests who are also loyalty clients) |
| `menu_approved`         | Menu approved               | 10          | per_event  | event_lifecycle | `events.loyalty_menu_approved_awarded`                              |
| `meal_feedback_given`   | Meal feedback given         | 5           | per_action | engagement      | none (fires per feedback)                                           |
| `chat_engagement`       | First message in event chat | 5           | per_event  | engagement      | `events.loyalty_chat_engagement_awarded`                            |
| `hub_group_created`     | Hub group created           | 10          | per_action | social          | none (fires per group)                                              |
| `friend_invited`        | Friend connection accepted  | 15          | per_action | social          | none (fires per connection)                                         |

---

## Server Actions

### New: `fireTrigger()` (internal helper, NOT a server action)

```typescript
// NOT exported as server action. Internal helper only.
// Lives in lib/loyalty/triggers.ts (NOT a 'use server' file).
// Uses admin client for all DB operations (same pattern as autoAwardWelcomePoints).

async function fireTrigger(
  triggerKey: string,
  tenantId: string,
  clientId: string,
  context: {
    eventId?: string
    description?: string
    skipIdempotency?: boolean // For per_action triggers
  }
): Promise<{ awarded: boolean; points: number }>
```

**Flow:**

1. Fetch `loyalty_config` for tenant (admin client)
2. Check `program_mode` is 'full' (skip if 'lite' or 'off')
3. Look up trigger in `trigger_config` JSONB. If not present, use default from registry. If disabled, skip.
4. Check idempotency guard (if applicable). If already awarded, skip.
5. Insert `loyalty_transactions` row (type: 'earned')
6. Update client `loyalty_points` + recalculate tier
7. Set idempotency guard flag
8. Broadcast via SSE (non-blocking)
9. Send client notification (non-blocking)
10. Return `{ awarded: true, points }`

All steps after the transaction insert are non-blocking (try/catch, log on failure).

**Auth context notes:** `fireTrigger()` is called from many different auth contexts:

- Client-side actions (`requireClient()`): reviews, quotes, menu approval, profile, chat, friends
- Chef-side actions (`requireChef()`): payment recording
- Public actions (no auth): RSVP submission
- Internal utilities (no auth): hub group creation

Because of this, `fireTrigger()` MUST use admin client internally and accept `tenantId` + `clientId` as explicit parameters. It must NEVER derive these from the session.

### Modified: `updateLoyaltyConfig()`

Accepts new field `trigger_config` in the input schema. Validates each key against the registry. Rejects unknown keys.

### New: `getActiveTriggers(tenantId)` (read-only helper)

Returns the merged trigger config (defaults + overrides) for display in the How to Earn panel and settings form.

---

## Profile Completion Definition

The `profile_completed` trigger fires when a client's profile meets ALL of these criteria:

- `full_name` is non-null and non-empty
- `email` is non-null and non-empty
- `phone` is non-null and non-empty

Check these fields after `updateMyProfile()` succeeds. If all three are populated AND `loyalty_profile_complete_awarded` is false, fire the trigger.

This is intentionally minimal. We want clients to earn this easily. Additional fields (address, dietary prefs) are not required.

---

## Chat First-Message Detection

The `chat_engagement` trigger fires when a user sends their FIRST message in a conversation. Detection mechanism:

After `sendChatMessage()` inserts the message, query:

```sql
SELECT COUNT(*) FROM conversation_messages
WHERE conversation_id = $1 AND sender_id = $2
```

If count equals 1 (the message just inserted is the only one), fire the trigger. The idempotency guard (`events.loyalty_chat_engagement_awarded`) provides a secondary safety net, but the count check avoids unnecessary DB writes on subsequent messages.

---

## RSVP Client Resolution

The `rsvp_collected` trigger awards points to the EVENT OWNER (the client who created/owns the event), NOT to the guest submitting the RSVP. The logic:

1. After `submitRSVP()` succeeds, look up the event's `client_id` from the `events` table using the `event_id` from the share data
2. If the event has a `client_id` AND that client has a `tenant_id`, call `fireTrigger('rsvp_collected', tenantId, clientId, { eventId })`
3. If the event has no client_id (direct chef booking), skip silently

This rewards clients for collecting RSVPs on their events, encouraging them to share event links.

---

## UI / Component Spec

### Loyalty Settings Form - New Section: "Earning Triggers"

Added below the existing "Tier Perks" section on the settings page.

**Layout:**

- Section header: "Earning Triggers" with subtitle "Reward clients automatically when they interact with your business"
- Grouped by category (Engagement, Event Lifecycle, Financial, Social)
- Each trigger row: toggle (on/off) | label | point value input | description tooltip

**States:**

- **Loading:** Skeleton rows matching trigger count
- **Error:** Toast with "Failed to load trigger settings"
- **Populated:** All triggers with current config (defaults merged with overrides)

**Interactions:**

- Toggle fires `updateLoyaltyConfig()` with updated `trigger_config`
- Point value input is a number field with debounced save (500ms)
- "Reset to defaults" button restores all triggers to registry defaults

### How to Earn Panel - Updated

Currently shows static text about earning modes. After this spec:

- Dynamically lists all ENABLED triggers with their point values
- Grouped by category with clear labels
- Shows the earn mode (per_guest/per_dollar/per_event) as the primary earning method
- Shows triggers as "bonus ways to earn"

---

## Edge Cases and Error Handling

| Scenario                                                               | Correct Behavior                                                     |
| ---------------------------------------------------------------------- | -------------------------------------------------------------------- |
| Trigger fires but loyalty program is 'off' or 'lite'                   | Skip silently, return `{ awarded: false, points: 0 }`                |
| Trigger fires but that trigger is disabled in config                   | Skip silently                                                        |
| Idempotency guard already set                                          | Skip silently (no error, no double-award)                            |
| Client has no tenant_id                                                | Skip silently (standalone clients don't earn)                        |
| DB error on transaction insert                                         | Log error, return `{ awarded: false }`, don't block parent operation |
| SSE broadcast fails                                                    | Log warning, don't block                                             |
| Notification fails                                                     | Log warning, don't block                                             |
| Config has unknown trigger keys (from old version)                     | Ignore unknown keys, don't crash                                     |
| Multiple triggers fire for same action (e.g., review + public consent) | Both fire independently, both check their own guards                 |
| `fireTrigger` called in a context with no active session               | Use admin client (same pattern as `autoAwardWelcomePoints`)          |
| `rsvp_collected` guest is not a loyalty client                         | Look up event owner instead; skip if event has no client_id          |
| `payment_on_time` called from chef context                             | Use `sale.client_id` and `sale.tenant_id` from the sale record       |
| `acceptQuote()` uses RPC                                               | Extract `tenant_id` from the RPC response object                     |

---

## Retraction Notification System

When `adjustClientLoyalty()` (in `lib/loyalty/actions.ts`) deducts points or `cancelRewardDelivery()` (in `lib/loyalty/auto-award.ts`) is called:

1. Create a notification record (type: `loyalty_adjustment`)
2. Notification copy template: "Your points balance was adjusted by [amount]. [Chef's reason if provided]. Thank you for your understanding."
3. If no reason provided by chef, use: "Your points balance was updated. If you have questions, feel free to reach out."
4. Never use aggressive language. Never say "deducted" or "removed." Use "adjusted" or "updated."
5. Broadcast via SSE so client sees it in real-time if they're online

---

## Verification Steps

1. Sign in as chef with agent account
2. Navigate to `/loyalty/settings`
3. Verify: "Earning Triggers" section visible with all 14 triggers grouped by category
4. Toggle a trigger off, verify it saves (refresh to confirm)
5. Change a point value, verify it saves
6. Sign in as a client
7. Submit a review for a past event, verify points awarded automatically
8. Check My Rewards page, verify new points appear in transaction history
9. Submit another review for the SAME event, verify no double-award (idempotency)
10. Return to chef settings, disable review trigger, submit another review on a different event, verify NO points awarded
11. As chef, manually deduct points from the client, verify the client receives a notification with apologetic tone
12. Screenshot all results

---

## Out of Scope

- Seasonal point multipliers (Phase 2)
- Repeat booking bonus trigger (needs date computation logic, Phase 2)
- Anniversary event trigger (needs first-event-date tracking, Phase 2)
- Full balance paid early trigger (no due date concept exists yet, Phase 2)
- Birthday/anniversary auto-rewards (Phase 2)
- Points gifting between clients (Phase 2)
- Corporate/group loyalty programs (Phase 2)
- Fully automated referral link flow (separate spec)
- Gamification UI (progress bars per trigger, streak tracking) (separate spec)

---

## Notes for Builder Agent

- **Pattern to follow:** Look at `autoAwardWelcomePoints()` in `lib/loyalty/auto-award.ts` (line 32) for the exact pattern: admin client, idempotency check, transaction insert, balance update, non-blocking side effects.
- **Every `fireTrigger()` call MUST be wrapped in try/catch at the call site.** Trigger failures must never block the parent operation (review submission, payment recording, etc.).
- **The `trigger_config` JSONB column stores OVERRIDES only.** If a trigger key is not in the JSONB, the application falls back to the registry default. This means existing tenants get all triggers enabled at defaults without a data migration.
- **Do NOT add `fireTrigger` calls to files with `@ts-nocheck`.** If the target file has type issues, fix them first or skip that trigger.
- **SSE channel:** Use existing `'loyalty'` channel with type `'trigger_awarded'`.
- **Notification type:** Add `'loyalty_trigger'` and `'loyalty_adjustment'` to the `NotificationAction` union type in `lib/notifications/types.ts` (after line 132), and add corresponding entries to `NOTIFICATION_CONFIG`.
- **`fireTrigger()` uses admin client.** It must NEVER import or call `requireChef()`/`requireClient()`/`requireAuth()`. It receives `tenantId` and `clientId` as parameters.
- **`lib/loyalty/triggers.ts` is NOT a `'use server'` file.** It exports plain async functions, not server actions. Server action files import and call `fireTrigger()` from their own `'use server'` context.
- **Payment triggers:** `recordPayment()` in `lib/commerce/payment-actions.ts` is chef-side. Get `clientId` from `sale.client_id` and `tenantId` from `sale.tenant_id` (both fetched at line 56-61). The `tipCents` field is on the input; fire `tip_added` only when `input.tipCents > 0`.
- **Quote acceptance:** `acceptQuote()` uses an RPC (`respond_to_quote_atomic`). The response includes `tenant_id`. Extract it from the RPC result.
- **Menu approval:** The function is `approveMenu()` in `lib/events/menu-approval-actions.ts` (line 188), NOT in `lib/events/client-actions.ts`.
- **Hub groups:** The function is `createHubGroup()` in `lib/hub/group-actions.ts` (line 26), NOT in `lib/hub/client-hub-actions.ts`.
- **RSVP trigger:** Awards points to the event OWNER (client), not the guest. Look up `events.client_id` using the event_id from share data. Skip if no client_id.
- **Profile completion:** Trigger fires when `full_name`, `email`, AND `phone` are all non-null/non-empty after `updateMyProfile()`. Check AFTER the update succeeds.
- **Chat first message:** After inserting the message, count messages from this sender in this conversation. If count is 1, it's a first message. The idempotency guard on the event is a secondary safety net.

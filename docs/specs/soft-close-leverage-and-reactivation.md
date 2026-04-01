# Spec: Soft-Close Leverage Capture & Reactivation

> **Status:** built
> **Priority:** P1
> **Depends on:** email-snapshot-and-portal-strategy (verified)
> **Estimated complexity:** medium (5-7 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event               | Date                 | Agent/Session              | Commit  |
| ------------------- | -------------------- | -------------------------- | ------- |
| Created             | 2026-03-31 22:34 EST | Planner + Research session | pending |
| Status: ready       | 2026-03-31 22:34 EST | Planner + Research session | pending |
| Claimed in-progress | 2026-04-01           | Builder Claude Sonnet 4.6  | pending |
| Spike completed     | 2026-04-01           | Builder Claude Sonnet 4.6  | pending |
| Pre-flight passed   | 2026-04-01           | tsc clean pre-build        | pending |
| Build completed     | 2026-04-01           | Builder Claude Sonnet 4.6  | pending |
| Type check passed   | 2026-04-01           | tsc --noEmit exit 0        | pending |
| Status: built       | 2026-04-01           | Builder Claude Sonnet 4.6  | pending |

---

## Developer Notes

_This section preserves the developer's original conversation and intent. It is MANDATORY. A spec without Developer Notes is incomplete. A builder reading a spec without this section is building blind._

### Raw Signal

- The system needs to understand who is waiting on a response. In the Gunjan case, the chef is not really waiting anymore.
- Tell me exactly how the website and the food operator should handle this from here.
- Be thorough and use the infrastructure we already have.
- Show the A/B messaging method:
  - A if they do not opt into Dinner Circle
  - B if they do
- We need to use the leverage that a soft close offers.
- Proceed with the most intelligent decisions in the correct order.

The underlying example was a polite client email that said the trip plans changed, they were skipping this time, and they would love to do the experience on a future visit. The developer did not want that treated as an open sales task. They wanted the system to close the current cycle cleanly while preserving the relationship and the future-booking value.

### Developer Intent

- **Core goal:** Turn a Gunjan-style "not this trip, but maybe next time" email into a closed-now, warm-later workflow using the inquiry, client, Dinner Circle, and email systems that already exist.
- **Key constraints:** Do not leave fake response debt on the chef. Do not push Dinner Circle by default just because a link exists. Do not invent a new CRM subsystem. Do not wire v1 through the touchpoint-rule system.
- **Motivation:** The developer wants the product to behave like a smart operator, not just a ticket tracker. A soft close should produce leverage: cleaner state, saved context, and an easier future re-entry path.
- **Success from the developer's perspective:** After a polite future-interest decline, the inquiry is closed, the chef is no longer nagged to reply, the client relationship is preserved with structured memory, and the operator can choose the right A or B message without rebuilding context.

---

## What This Does (Plain English)

When a client politely passes for now but leaves the door open for later, the inquiry detail page stops behaving like an overdue inbox item and instead becomes a soft-close workflow. The chef is guided to close the current cycle, capture the warm-lead value on the client record, and optionally send the right courtesy closeout using email-only A mode or Dinner Circle B mode without recreating follow-up debt.

---

## Why It Matters

Right now the system is strong at turn-taking and state cleanup, but weak at using the leverage of a soft close. The missing piece is not detection. It is preserving future value in a way that is operationally correct and easy for the chef to execute. `lib/lifecycle/next-action.ts:75-140`, `lib/inquiries/actions.ts:1898-1925`

---

## What Already Exists (Do Not Rebuild)

| Capability                                                                                     | Evidence                                                                                                                               | Status     |
| ---------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Soft-close intent detection                                                                    | `lib/inquiries/soft-close.ts:6-68`                                                                                                     | Production |
| Next-action guidance for soft close                                                            | `lib/lifecycle/next-action.ts:114-140`                                                                                                 | Production |
| Decline reason and cleanup                                                                     | `lib/inquiries/constants.ts:6-15`, `lib/inquiries/actions.ts:1898-1925`                                                                | Production |
| Inquiry detail page with next-action banner, Dinner Circle token, email snapshot, and composer | `app/(chef)/inquiries/[id]/page.tsx:70-77`, `app/(chef)/inquiries/[id]/page.tsx:195-199`, `app/(chef)/inquiries/[id]/page.tsx:829-840` | Production |
| A/B response composer toggles                                                                  | `components/inquiries/inquiry-response-composer.tsx:61-109`, `components/inquiries/inquiry-response-composer.tsx:343-366`              | Production |
| Dinner Circle invite copy                                                                      | `lib/lifecycle/dinner-circle-templates.ts:12-23`                                                                                       | Production |
| Client creation from lead                                                                      | `lib/clients/actions.ts:591-653`                                                                                                       | Production |
| Client tags                                                                                    | `database/migrations/20260307000008_client_tags.sql:5-27`, `lib/clients/tag-actions.ts:10-57`                                          | Production |
| Client relationship notes                                                                      | `database/migrations/20260221000004_client_notes.sql:10-37`, `lib/notes/actions.ts:56-103`                                             | Production |

---

## Files to Create

| File                                                | Purpose                                                                                                                       |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `components/inquiries/soft-close-leverage-card.tsx` | Client-side card that guides decline-first, warm-lead capture, and soft-close-specific follow-up actions.                     |
| `lib/inquiries/soft-close-leverage-actions.ts`      | Orchestrator action that captures warm-lead context onto the client record using existing tags, notes, and preference fields. |
| `lib/inquiries/soft-close-message-presets.ts`       | Builds the exact A/B courtesy closeout presets for future-soft-close inquiries.                                               |

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                                                                 |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/lifecycle/next-action.ts`                       | Add a non-stringly typed soft-close workflow flag so the inquiry page can render the leverage flow without inspecting action-label text.                                                       |
| `app/(chef)/inquiries/[id]/page.tsx`                 | Render `SoftCloseLeverageCard` when soft-close future-interest is detected or already declined with `Plans changed / maybe future`. Keep the composer available for that declined reason only. |
| `components/inquiries/inquiry-response-composer.tsx` | Add soft-close mode, A/B preset loaders, and soft-close-specific toggle defaults. Do not default to Dinner Circle on soft-close mode.                                                          |
| `lib/gmail/actions.ts`                               | Prevent post-decline courtesy sends from restoring `next_action_required`, `next_action_by`, or `follow_up_due_at` on terminal inquiries.                                                      |

---

## Database Changes

None.

This spec intentionally reuses the existing `inquiries`, `clients`, `client_tags`, `client_notes`, `messages`, and `hub_groups` tables. The required columns already exist:

- Inquiry state and follow-up fields: `database/migrations/20260215000002_layer_2_inquiry_messaging.sql:61-95`
- Inquiry decline reason: `database/migrations/20260401000078_pipeline_analytics_columns.sql:8-25`
- Inquiry dishes/tier: `database/migrations/20260401000139_inquiry_dishes_and_tier.sql:1-8`
- Inquiry contact fields: `database/migrations/20260330000092_inquiry_contact_columns.sql:1-14`
- Client fields: `database/migrations/20260215000001_layer_1_foundation.sql:75-130`
- Client tags: `database/migrations/20260307000008_client_tags.sql:5-27`
- Client notes: `database/migrations/20260221000004_client_notes.sql:10-37`
- Dinner Circle token storage: `database/migrations/20260330000004_hub_groups.sql:8-23`, `database/migrations/20260330000004_hub_groups.sql:40-50`

### Migration Notes

- No migration is part of this spec.
- Do not add a new "warm lead" table. That is unnecessary for v1.

---

## Data Model

This feature is a workflow across existing entities, not a new entity.

### Inquiry

Relevant fields:

- `status`
- `decline_reason`
- `next_action_required`
- `next_action_by`
- `follow_up_due_at`
- `confirmed_dietary_restrictions`
- `confirmed_occasion`
- `discussed_dishes`
- `selected_tier`
- `contact_name`
- `contact_email`
- `client_id`

Evidence: `database/migrations/20260215000002_layer_2_inquiry_messaging.sql:61-95`, `database/migrations/20260330000092_inquiry_contact_columns.sql:4-6`, `database/migrations/20260401000078_pipeline_analytics_columns.sql:8-25`, `database/migrations/20260401000139_inquiry_dishes_and_tier.sql:4-8`

### Client

Relevant fields for warm-lead capture:

- `dietary_restrictions`
- `favorite_dishes`
- `favorite_cuisines` (manual only in this spec)
- `what_they_care_about` (manual only in this spec)
- `status`
- `personal_milestones` (manual only in this spec)

Evidence: `database/migrations/20260215000001_layer_1_foundation.sql:93-130`, `lib/clients/actions.ts:54-55`, `lib/clients/actions.ts:97-98`, `lib/clients/actions.ts:108`, `lib/clients/actions.ts:140-141`, `lib/clients/milestones.ts:13-25`

### Client Tag

Used for searchable warm-lead markers like `warm-future-lead`. Tags are tenant-scoped and deduped by `(client_id, tag)`. `database/migrations/20260307000008_client_tags.sql:5-27`

### Client Note

Used for the durable relationship-memory summary of why the inquiry closed and how to reopen the relationship later. The `relationship` category already exists and is chef-only. `database/migrations/20260221000004_client_notes.sql:10-37`, `lib/notes/actions.ts:15-18`, `lib/notes/actions.ts:34-42`

### Dinner Circle

Used only as an optional B-mode re-entry path. This spec does not change the public Dinner Circle model or guest IA. `lib/hub/inquiry-circle-actions.ts:158-168`, `app/(public)/hub/g/[groupToken]/page.tsx:49-53`

---

## Server Actions

| Action                             | Auth            | Input                                                                                                                   | Output                                                                                                                                                           | Side Effects                                                                                                                                                                  |
| ---------------------------------- | --------------- | ----------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `captureSoftCloseLeverage(input)`  | `requireChef()` | `{ inquiryId: string, tags: string[], mergeDietary: boolean, mergeDiscussedDishes: boolean, relationshipNote: string }` | `{ success: true, clientId: string, applied: { clientCreated: boolean, tagsAdded: number, dietaryMerged: boolean, dishesMerged: boolean, noteSaved: boolean } }` | May create client via `createClientFromLead()`, may merge client dietary/favorite dishes, may add tags, may upsert one relationship note, revalidates inquiry + client routes |
| `approveAndSendMessage(messageId)` | `requireChef()` | existing draft message id                                                                                               | existing `SendMessageResult`                                                                                                                                     | Must preserve terminal inquiry state when the linked inquiry is already `declined` or `expired`                                                                               |

### `captureSoftCloseLeverage(input)` behavior

1. Load the inquiry in the current tenant.
2. Accept only these entry conditions:
   - inquiry is already `declined` with `decline_reason='Plans changed / maybe future'`
   - or the page reached this action from a verified soft-close-future path and declined it first in the same UI flow
3. Resolve the client:
   - if `inquiry.client_id` exists, use it
   - else if `contact_email` and `contact_name` exist, call `createClientFromLead()` and use the returned id
   - else return a validation error that says the operator must create/link a client before saving leverage
4. If `mergeDietary=true`, merge `inquiry.confirmed_dietary_restrictions` into `clients.dietary_restrictions` with de-duplication.
5. If `mergeDiscussedDishes=true`, merge `inquiry.discussed_dishes` into `clients.favorite_dishes` with de-duplication.
6. Add each requested tag using the existing `client_tags` uniqueness guarantee.
7. Upsert one `relationship` note that contains a stable marker like `Soft close source inquiry: {inquiryId}` so repeated clicks update the same note instead of creating duplicates.
8. Do **not** change `clients.status`. A warm future lead is not automatically a `repeat_ready` client. `database/migrations/20260215000001_layer_1_foundation.sql:16-20`, `lib/clients/actions.ts:1100-1105`

### `approveAndSendMessage(messageId)` change

When the linked inquiry is already terminal (`declined` or `expired`), the send path must not write:

- `next_action_required`
- `next_action_by`
- `follow_up_due_at`
- a status reopening

Current behavior always writes those fields before its status check. `lib/gmail/actions.ts:290-304`

The builder must make this action status-aware in the same spirit that `createMessage()` already is. `lib/messages/actions.ts:100-145`

---

## UI / Component Spec

### Page Layout

The inquiry detail page gets a soft-close workflow layer.

#### State 1: Soft close detected, inquiry still open

Show `SoftCloseLeverageCard` directly under the next-action banner when:

- `getNextActions()` reports soft-close-future workflow
- inquiry is still `awaiting_chef`

Card content:

- headline: `This is a soft close, not a response debt`
- one-paragraph explanation that the current cycle should be closed, but the relationship is worth preserving
- primary button: `Close as Plans Changed / Maybe Future`
- secondary text: `No response is required unless you want to send a short courtesy note after closing`

Primary button behavior:

- calls `declineInquiry(inquiryId, 'Plans changed / maybe future')`
- refreshes the page into State 2

#### State 2: Inquiry already declined for future reasons

Show `SoftCloseLeverageCard` above the Gmail composer when:

- `inquiry.status === 'declined'`
- `inquiry.decline_reason === 'Plans changed / maybe future'`

Card sections:

1. **Warm-lead capture**

- tag input prefilled with `warm-future-lead`
- checkbox `Save dietary restrictions to client preferences` if inquiry has dietary data
- checkbox `Save discussed dishes to favorite dishes` if inquiry has discussed dishes
- editable relationship note prefilled with a concise operator summary, for example:
  - `Soft close on 2026-03-31. Client said this trip changed, but explicitly wants to revisit the dinner on a future visit. Keep warm.`
- save button `Save Warm Lead Context`

2. **Messaging path**

- a compact explanation:
  - `A = email-only closeout`
  - `B = Dinner Circle closeout only when the client has actually opted into that mode or the page gives them real value`

3. **Post-save status**

- success banner with:
  - applied changes summary
  - link to the client record if a client was created or updated

### Gmail Composer behavior in soft-close mode

The page must continue rendering `InquiryResponseComposer` for the specific declined-future reason even though normal declined inquiries hide it today. `app/(chef)/inquiries/[id]/page.tsx:829-840`

Inside the composer, when `softCloseMode=true`:

- default `includeCircleLink = false`
- default `includeSnapshot = false`
- show two preset loaders before the normal `Generate Draft` path:
  - `Load A closeout`
  - `Load B closeout` (disabled if `circleToken` is null)
- the operator can still edit the draft before sending

#### Preset A: Email-only closeout

Subject:

`Thank you, {contact_name}`

Body:

```text
Hi {contact_name},

Thank you for letting me know. I completely understand.

I would love to cook for you on a future visit, so please feel free to reach out anytime the timing lines up again.

Warmly,
{chef_name_or_generic}
```

Rules:

- `includeCircleLink = false`
- `includeSnapshot = false`

#### Preset B: Dinner Circle closeout

Only available when `circleToken` exists, and the UI copy must say that this is optional and should be used only when the operator believes the link adds real value.

Subject:

`Keeping this ready for a future visit`

Body:

```text
Hi {contact_name},

Thank you for letting me know. I completely understand.

I kept your dinner page handy here in case you would like to revisit the ideas on a future trip:

{circle_url}

No rush at all, and email is always fine too.

Warmly,
{chef_name_or_generic}
```

Rules:

- `includeCircleLink = true`
- `includeSnapshot = false` by default
- if the operator manually enables the snapshot, that is allowed, but not the default

### States

- **Loading:** The page behaves exactly as it does now. The soft-close card only renders once inquiry + next-action data are loaded.
- **Empty:** If no client exists and the inquiry lacks `contact_email`, the card shows a clear explanation that leverage cannot be saved until a client is linked or created manually.
- **Error:** If leverage capture fails, keep the card open, show inline error text, and do not partially claim success.
- **Populated:** Card shows current guidance, save controls, and optional closeout presets. The inquiry status card still shows the inquiry as declined.

### Interactions

1. Chef opens inquiry after a Gunjan-style reply.
2. `NextActionBanner` already shows "Decline as plans changed / maybe future." `lib/lifecycle/next-action.ts:119-140`
3. `SoftCloseLeverageCard` reinforces that path and offers the one-click decline.
4. After decline, the page refreshes and the card switches into leverage-capture mode.
5. Chef saves warm-lead context.
6. Chef optionally loads A or B preset into the composer.
7. Chef sends the courtesy closeout.
8. Inquiry stays declined and no follow-up debt returns.

---

## Edge Cases and Error Handling

| Scenario                                                          | Correct Behavior                                                                                                                                                                        |
| ----------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef clicks `Save Warm Lead Context` twice                        | Tags stay deduped via `client_tags` uniqueness, dishes/dietary stay deduped by merge logic, and the relationship note is updated by stable inquiry marker instead of duplicated.        |
| Inquiry has no linked client but has contact email/name           | Create the client idempotently via `createClientFromLead()` and continue. `lib/clients/actions.ts:591-653`, `database/migrations/20260330000092_inquiry_contact_columns.sql:4-14`       |
| Inquiry has no client and no contact email                        | Disable leverage save and explain why.                                                                                                                                                  |
| Chef sends courtesy closeout after decline                        | Inquiry remains declined. `approveAndSendMessage()` must not recreate `next_action_*` or `follow_up_due_at`. `lib/gmail/actions.ts:290-304`                                             |
| Circle token exists but client was never really portal-oriented   | Default to A. B stays operator-chosen, never automatic in soft-close mode. `components/inquiries/inquiry-response-composer.tsx:61-63`, `lib/lifecycle/dinner-circle-templates.ts:12-23` |
| Occasion says anniversary but no reliable anniversary date exists | Do not auto-create a milestone. Leave milestone entry manual and out of scope for this spec. `lib/clients/milestones.ts:13-25`                                                          |

---

## Verification Steps

1. Start with an inquiry in `awaiting_chef` whose latest inbound message contains soft-close-future language such as the Gunjan email.
2. Open `/inquiries/[id]`.
3. Verify:
   - `NextActionBanner` shows a soft-close decline recommendation with `no_sla`.
   - `SoftCloseLeverageCard` appears and offers `Close as Plans Changed / Maybe Future`.
4. Click the close button.
5. Verify:
   - inquiry status becomes `declined`
   - `decline_reason` is `Plans changed / maybe future`
   - `next_action_required`, `next_action_by`, and `follow_up_due_at` are cleared on refresh
6. Verify the inquiry page still shows the Gmail composer for this one declined reason.
7. Save warm-lead context with:
   - tag `warm-future-lead`
   - dietary merge on
   - discussed-dishes merge on if dishes exist
   - a relationship note
8. Verify:
   - client tags updated
   - client relationship note exists
   - dietary restrictions updated on the client profile
   - favorite dishes merged where applicable
9. Load preset A and send it.
10. Verify:

- email draft/body matches preset A
- inquiry remains `declined`
- no new `follow_up_due_at`
- no `next_action_by='client'`

11. Repeat with preset B on a circle-backed inquiry and verify the same terminal-state preservation, plus the link in the email body.

---

## Out of Scope

- Automated future-touchpoint scheduling or reminder automation
- Any dependency on `client_touchpoint_rules`
- Auto-inference of cuisine tags from dish names
- Auto-creation of anniversaries or other milestones from inquiry dates
- Rebuilding Dinner Circle guest pages, meal board, or lifecycle views
- Reworking the general inquiry status machine beyond the narrow soft-close send-path fix

---

## Notes for Builder Agent

- Do not key workflow logic off the literal action label string from `getNextActions()`. Add an explicit workflow flag in `lib/lifecycle/next-action.ts`.
- Do not default to Dinner Circle in soft-close mode. The existing composer does that today whenever a circle token exists. `components/inquiries/inquiry-response-composer.tsx:61-63`
- Do not set client status to `repeat_ready` just because the lead is warm. That enum is documented as rebooking-oriented and implies an actual client relationship beyond this inquiry. `database/migrations/20260215000001_layer_1_foundation.sql:16-20`
- Do not use `client_touchpoint_rules` for v1. The action layer currently depends on client columns that are not present in the foundational client schema. `lib/clients/touchpoint-actions.ts:139-148`, `lib/clients/touchpoint-actions.ts:205-211`, `database/migrations/20260215000001_layer_1_foundation.sql:75-130`
- Keep the implementation order strict:
  1. Add the workflow flag to `getNextActions()`
  2. Add `SoftCloseLeverageCard` and the leverage capture action
  3. Keep the declined-future composer visible
  4. Add A/B preset loading to the composer
  5. Fix `approveAndSendMessage()` terminal-state handling
  6. Verify the full decline -> capture -> courtesy-send flow

---

## Spec Validation

### 1. What exists today that this touches?

- Inquiry state machine, next-action owner fields, and follow-up due fields already exist on `inquiries`. `database/migrations/20260215000002_layer_2_inquiry_messaging.sql:61-95`
- Soft-close detection exists in `detectSoftCloseIntent()`. `lib/inquiries/soft-close.ts:6-68`
- `getNextActions()` already branches on that detector and returns a no-SLA decline recommendation. `lib/lifecycle/next-action.ts:75-140`
- The inquiry detail page already fetches next actions, circle token, and snapshot, and renders the composer. `app/(chef)/inquiries/[id]/page.tsx:70-77`, `app/(chef)/inquiries/[id]/page.tsx:195-199`, `app/(chef)/inquiries/[id]/page.tsx:829-840`
- Decline reason capture already exists via modal + `declineInquiry()`. `components/inquiries/decline-with-reason-modal.tsx:19-40`, `lib/inquiries/actions.ts:1898-1925`
- Client creation from lead, tags, and notes already exist. `lib/clients/actions.ts:591-653`, `lib/clients/tag-actions.ts:10-57`, `lib/notes/actions.ts:56-103`
- Dinner Circle links already exist via `hub_groups.group_token`. `lib/hub/inquiry-circle-actions.ts:158-168`, `database/migrations/20260330000004_hub_groups.sql:8-23`

### 2. What exactly changes?

- Add a workflow flag to `lib/lifecycle/next-action.ts` so the page can know it is in soft-close-future mode without string matching existing action labels. Current branch point exists at `lib/lifecycle/next-action.ts:114-140`.
- Modify `app/(chef)/inquiries/[id]/page.tsx` to render a soft-close leverage card and to keep the composer available for `declined + Plans changed / maybe future`. Current composer guard is `app/(chef)/inquiries/[id]/page.tsx:829-840`.
- Add a new orchestrator action that writes warm-lead context to existing client data stores instead of inventing a new table. Existing stores: `lib/clients/actions.ts:591-653`, `database/migrations/20260307000008_client_tags.sql:5-27`, `database/migrations/20260221000004_client_notes.sql:22-37`.
- Modify `components/inquiries/inquiry-response-composer.tsx` so soft-close mode defaults to A, exposes A/B preset loaders, and no longer assumes Dinner Circle is the default when a token exists. Current default is `components/inquiries/inquiry-response-composer.tsx:61-63`.
- Modify `lib/gmail/actions.ts` so terminal inquiries are not given follow-up debt after a courtesy send. Current unconditional write is `lib/gmail/actions.ts:290-304`.

### 3. What assumptions are you making?

- **Verified:** A soft-close detector already exists and is wired into next actions. `lib/inquiries/soft-close.ts:6-68`, `lib/lifecycle/next-action.ts:75-140`
- **Verified:** The inquiry page currently hides the composer on all declined inquiries. `app/(chef)/inquiries/[id]/page.tsx:829-840`
- **Verified:** `declineInquiry()` already clears action debt. `lib/inquiries/actions.ts:1917-1925`
- **Verified:** The Gmail send path would reintroduce action debt today if used after decline. `lib/gmail/actions.ts:290-304`
- **Verified:** Client tags and client notes are safe existing storage for warm-lead memory. `database/migrations/20260307000008_client_tags.sql:5-27`, `database/migrations/20260221000004_client_notes.sql:22-37`
- **Verified:** `createClientFromLead()` is available if the inquiry has no linked client. `lib/clients/actions.ts:591-653`, `database/migrations/20260330000092_inquiry_contact_columns.sql:4-14`
- **Unverified product assumption, intentionally fenced:** there is no verified "Dinner Circle opted in" flag, so B remains operator-chosen and default-off in soft-close mode. `components/inquiries/inquiry-response-composer.tsx:61-109`, `lib/hub/inquiry-circle-actions.ts:158-168`
- **Unverified product assumption, intentionally fenced:** the inquiry date is not treated as the client's anniversary date, so milestone automation is out of scope. `database/migrations/20260215000002_layer_2_inquiry_messaging.sql:71-95`, `lib/clients/milestones.ts:13-25`

### 4. Where will this most likely break?

1. The Gmail send path. If the builder fixes the UI but misses `approveAndSendMessage()`, a courtesy closeout after decline will put the inquiry back into fake "Awaiting client reply" debt. `lib/gmail/actions.ts:290-304`
2. Duplicate warm-lead writes. If the builder inserts notes naively, repeated clicks will create duplicate relationship notes. Tags are protected by uniqueness, but notes are not. `database/migrations/20260307000008_client_tags.sql:12-12`, `database/migrations/20260221000004_client_notes.sql:22-37`
3. Defaulting to Dinner Circle in the wrong context. The existing composer assumes Version B whenever a circle token exists. If that default survives soft-close mode, the system will feel pushy. `components/inquiries/inquiry-response-composer.tsx:61-63`

### 5. What is underspecified?

- Without this spec, the order of operations is underspecified. The correct order is: decline first, capture warm-lead context second, optional courtesy closeout third.
- Without this spec, the storage location for future-value context is underspecified. This spec resolves that by using client tags, client notes, and selective client preference merges.
- Without this spec, A/B behavior on soft close is underspecified. This spec resolves that by making A the default and B explicitly operator-chosen.
- Without this spec, milestone behavior is easy to guess wrong. This spec explicitly says milestone automation is out of scope because the inquiry date is not the milestone date.

### 6. What dependencies or prerequisites exist?

- Depends on the already-built Dinner Circle + critical path foundation. `docs/specs/critical-path-and-dinner-circle-onboarding.md:1-8`
- Depends on the already-built email snapshot and A/B composer foundation. `docs/specs/email-snapshot-and-portal-strategy.md:1-8`
- Requires existing inquiry columns: decline reason, discussed dishes, contact fields. `database/migrations/20260401000078_pipeline_analytics_columns.sql:8-25`, `database/migrations/20260401000139_inquiry_dishes_and_tier.sql:4-8`, `database/migrations/20260330000092_inquiry_contact_columns.sql:4-14`
- No migration, config, or environment prerequisite is required for this v1.

### 7. What existing logic could this conflict with?

- The general inquiry composer defaults and message-building logic. `components/inquiries/inquiry-response-composer.tsx:61-109`
- The inquiry-detail page guard that hides the composer for all declined inquiries. `app/(chef)/inquiries/[id]/page.tsx:829-840`
- The Gmail send mutation that stamps follow-up fields. `lib/gmail/actions.ts:290-304`
- The client touchpoint subsystem, if someone tries to use it as the reactivation engine. `lib/clients/touchpoint-actions.ts:139-148`, `lib/clients/touchpoint-actions.ts:205-211`

### 8. What is the end-to-end data flow?

1. Client sends a Gunjan-style email.
2. Gmail sync links the inbound message to the inquiry and moves `awaiting_client -> awaiting_chef` while clearing follow-up debt. `lib/gmail/sync.ts:825-833`
3. Inquiry detail page loads `getNextActions()` and receives a soft-close-future recommendation. `app/(chef)/inquiries/[id]/page.tsx:195-199`, `lib/lifecycle/next-action.ts:114-140`
4. Chef clicks `Close as Plans Changed / Maybe Future`.
5. `declineInquiry()` writes `status='declined'`, `decline_reason`, and nulls the next-action fields. `lib/inquiries/actions.ts:1917-1925`
6. Chef saves warm-lead context through `captureSoftCloseLeverage()`.
7. That action resolves or creates the client, merges the selected fields, adds tags, and writes a relationship note using existing tables. Existing building blocks: `lib/clients/actions.ts:591-653`, `lib/clients/tag-actions.ts:39-57`, `lib/notes/actions.ts:56-103`
8. Chef optionally loads preset A or B into the composer and sends a courtesy closeout.
9. `approveAndSendMessage()` sends the email but preserves terminal inquiry state.
10. UI refreshes. Inquiry remains declined. Client record now holds the warm-lead context.

### 9. What is the correct implementation order?

1. Modify `lib/lifecycle/next-action.ts` to expose a structured soft-close workflow flag.
2. Add `components/inquiries/soft-close-leverage-card.tsx`.
3. Add `lib/inquiries/soft-close-leverage-actions.ts`.
4. Modify `app/(chef)/inquiries/[id]/page.tsx` to render the card and allow the composer for the single declined-future reason.
5. Add `lib/inquiries/soft-close-message-presets.ts`.
6. Modify `components/inquiries/inquiry-response-composer.tsx` for soft-close mode and preset loading.
7. Modify `lib/gmail/actions.ts` so post-decline courtesy sends preserve terminal state.
8. Verify the entire decline -> capture -> courtesy-send path.

### 10. What are the exact success criteria?

- A Gunjan-style inbound email is detected as a soft close with future interest.
- The inquiry detail page gives the chef a decline-first soft-close workflow.
- Declining with `Plans changed / maybe future` clears all response debt.
- The inquiry page still allows an optional courtesy closeout after that specific decline reason.
- Sending that courtesy closeout does not recreate `next_action_required`, `next_action_by`, or `follow_up_due_at`.
- Warm-lead capture writes tags, a relationship note, and optional dietary/favorite-dish merges onto the client record.
- A-mode closeout is default. B-mode is optional and never the default in soft-close mode.

### 11. What are the non-negotiable constraints?

- Chef auth and tenant scoping must be preserved on all mutations. Existing actions already use `requireChef()`. `lib/inquiries/actions.ts:1898-1907`, `lib/clients/actions.ts:658-670`, `lib/notes/actions.ts:56-59`, `lib/gmail/actions.ts:78-90`, `lib/gmail/actions.ts:122-139`
- Client notes are chef-only. Do not store relationship-memory text anywhere client-visible. `database/migrations/20260221000004_client_notes.sql:37-37`
- Dinner Circle is public by token, so B must remain a conscious operator choice, not an automatic fallback. `database/migrations/20260330000004_hub_groups.sql:23-23`, `app/(public)/hub/g/[groupToken]/page.tsx:4-7`
- Do not auto-upgrade client status to `repeat_ready`. `database/migrations/20260215000001_layer_1_foundation.sql:16-20`, `lib/clients/actions.ts:1100-1105`

### 12. What should NOT be touched?

- Do not add a new CRM or warm-lead table.
- Do not modify the general decline modal behavior for every decline reason.
- Do not rebuild Dinner Circle guest pages or the email snapshot system.
- Do not wire this through `client_touchpoint_rules`.
- Do not auto-create milestones from inquiry dates.

### 13. Is this the simplest complete version?

Yes. It uses existing inquiry, client, tags, notes, and Dinner Circle primitives and requires no migration. Anything larger would be speculative CRM work or reminder automation before the live schema/action mismatch in touchpoints is resolved. `database/migrations/20260215000001_layer_1_foundation.sql:75-130`, `lib/clients/touchpoint-actions.ts:139-148`

### 14. If implemented exactly as written, what would still be wrong?

- It would still be manual about future reactivation timing. That is intentional. This spec does not automate seasonal or anniversary follow-up.
- It would still rely on regex-based soft-close detection for the initial classification. That is already the current detection strategy. `lib/inquiries/soft-close.ts:6-68`
- It would still not know, with a verified boolean, whether a client truly "opted into" Dinner Circle. That is why B remains operator-chosen.

### Final Check

> Is this spec production-ready, or am I proceeding with uncertainty?

Production-ready for the scoped v1. Every storage surface and core workflow this spec relies on is verified in code. The remaining uncertainty is explicitly fenced out of scope: automated future reminders, milestone auto-creation from inquiry dates, and a verified Dinner Circle opt-in signal.

> If uncertain: where specifically, and what would resolve it?

The only meaningful uncertainty is product, not implementation:

- If the product wants automatic future reactivation, resolve the touchpoint-system schema mismatch first. `lib/clients/touchpoint-actions.ts:139-148`, `database/migrations/20260215000001_layer_1_foundation.sql:75-130`
- If the product wants B-mode to become automatic, add a real, verified Dinner Circle acceptance signal in a future spec.

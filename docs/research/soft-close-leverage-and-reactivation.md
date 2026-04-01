# Research: Soft-Close Leverage and Reactivation

## Origin Context

The developer's goal was not just to classify a polite decline correctly. They wanted the system to act like a smart operator when a client says "not this trip, but maybe next time."

Cleaned signal from the conversation:

- The system must understand who is waiting on whom. In the Gunjan case, the chef is not truly waiting on a response anymore.
- A soft close should not be treated as a dead lead, but it also should not remain an active response debt.
- The website and the food operator need an exact playbook for what to do next.
- The solution must use the infrastructure that already exists.
- The product needs to show the A/B messaging path clearly:
  - A = email-first, no Dinner Circle push
  - B = Dinner Circle only if the client has opted into that mode or there is real value behind the link
- The leverage of the soft close matters. The product should preserve the relationship, not just close the inquiry.

## Summary

The codebase already has the core mechanics needed for a soft-close workflow: response ownership, soft-close detection, decline handling, Dinner Circle A/B messaging, client tags, client notes, and client preference storage are all present in production code. `lib/lifecycle/next-action.ts:75-140`, `lib/inquiries/actions.ts:1898-1925`, `components/inquiries/inquiry-response-composer.tsx:61-109`, `lib/clients/tag-actions.ts:10-57`, `lib/notes/actions.ts:56-103`

The missing layer is orchestration. There is no current flow that turns "plans changed, maybe future" into a warm-future-lead capture sequence. The inquiry detail page hides the Gmail composer after decline, and the Gmail send path would currently stamp `Awaiting client reply` and a 48-hour follow-up onto a declined inquiry if a courtesy email were sent after decline. `app/(chef)/inquiries/[id]/page.tsx:808-841`, `lib/gmail/actions.ts:290-304`

The safest build path is schema-light: keep the inquiry closed, preserve leverage on the client side using tags, notes, dietary merge, and favorite-dish merge, and expose explicit A/B closeout presets without routing v1 through the touchpoint subsystem. The touchpoint subsystem is not a safe dependency for this feature because it expects `clients.first_name`, `clients.last_name`, and `clients.date_of_birth`, while the core client schema is centered on `full_name` and does not define those columns in the foundational migration. `lib/clients/touchpoint-actions.ts:139-148`, `lib/clients/touchpoint-actions.ts:205-211`, `database/migrations/20260215000001_layer_1_foundation.sql:75-130`

## Detailed Findings

### 1. The system already understands response ownership and soft-close intent

Inquiry status and response ownership are already modeled directly on the inquiry record through `status`, `next_action_by`, and `follow_up_due_at`. The status machine distinguishes `awaiting_client` from `awaiting_chef`, and transitions update the next-action owner accordingly. `database/migrations/20260215000002_layer_2_inquiry_messaging.sql:61-95`, `lib/inquiries/actions.ts:60-63`, `lib/inquiries/actions.ts:980-994`

The inquiry UI already has separate views for "Awaiting Response" (`awaiting_chef`) and "Awaiting Client Reply" (`awaiting_client`). `app/(chef)/inquiries/awaiting-response/page.tsx:28-42`, `app/(chef)/inquiries/awaiting-client-reply/page.tsx:29`

Soft-close detection already exists. `detectSoftCloseIntent()` matches phrases like `plans changed`, `skip this trip`, `not this trip`, and future-interest signals like `future visit`, `next trip`, and `hope we get the opportunity`. `lib/inquiries/soft-close.ts:6-68`

The next-action engine already uses that detector. When an inquiry is `awaiting_chef` and the latest inbound email looks like a soft close, it suppresses SLA pressure and recommends declining rather than replying. `lib/lifecycle/next-action.ts:75-140`

### 2. Decline handling is correct for the inquiry itself

The decline reason `Plans changed / maybe future` is already a first-class option. `lib/inquiries/constants.ts:6-15`

`declineInquiry()` already performs the right inquiry-level cleanup: it sets `status='declined'`, records `decline_reason`, and clears `next_action_required`, `next_action_by`, and `follow_up_due_at`. `lib/inquiries/actions.ts:1898-1925`

There is already a declined-inquiries view for historical records. `app/(chef)/inquiries/declined/page.tsx:28-49`

### 3. A/B messaging infrastructure already exists

The inquiry detail page already fetches both the Dinner Circle token and the email snapshot, then passes them into the response composer. `app/(chef)/inquiries/[id]/page.tsx:70-77`, `app/(chef)/inquiries/[id]/page.tsx:195-199`, `app/(chef)/inquiries/[id]/page.tsx:829-840`

The response composer already supports the two messaging modes:

- Version B defaults on when a circle token exists.
- Version A is the inline dinner-summary path without the link.
- The operator can toggle `Include Dinner Circle link` and `Include dinner summary`.

`components/inquiries/inquiry-response-composer.tsx:61-109`, `components/inquiries/inquiry-response-composer.tsx:343-366`

The Dinner Circle invitation copy is already explicitly gentle and email-compatible: "No account needed" and "If you prefer email, that works too." `lib/lifecycle/dinner-circle-templates.ts:12-23`

The email snapshot already supports rich dinner context, including dietary, discussed dishes, and course selection. `lib/lifecycle/email-snapshot.ts:132-220`, `lib/lifecycle/email-snapshot.ts:227-229`

### 4. Dinner Circle itself is real, not theoretical

Inquiry-linked Dinner Circles already exist. `createInquiryCircle()` and `getInquiryCircleToken()` are live helpers over `hub_groups.group_token`. `lib/hub/inquiry-circle-actions.ts:16-44`, `lib/hub/inquiry-circle-actions.ts:158-168`, `database/migrations/20260330000004_hub_groups.sql:8-23`, `database/migrations/20260330000004_hub_groups.sql:40-50`

The guest route for a Dinner Circle already loads members, notes, media, availability, events, and renders client-facing status. `app/(public)/hub/g/[groupToken]/page.tsx:4-7`, `app/(public)/hub/g/[groupToken]/page.tsx:49-53`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:124-127`, `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:300`

This means Version B is viable when the operator has a real reason to send the link.

### 5. Warm-lead memory primitives already exist on the client side

The client schema already has reusable fields for dietary restrictions, favorite cuisines, favorite dishes, what they care about, and status. `database/migrations/20260215000001_layer_1_foundation.sql:93-130`, `lib/clients/actions.ts:54-55`, `lib/clients/actions.ts:97-98`, `lib/clients/actions.ts:108`, `lib/clients/actions.ts:140-141`, `lib/clients/milestones.ts:13-25`

Clients can already be created idempotently from a lead email via `createClientFromLead()`. `lib/clients/actions.ts:591-653`

Client tags already exist as a tenant-scoped, deduped table with a unique `(client_id, tag)` constraint. `database/migrations/20260307000008_client_tags.sql:5-27`, `lib/clients/tag-actions.ts:10-57`

Client notes already exist as chef-only, tenant-scoped notes with a `relationship` category. `database/migrations/20260221000004_client_notes.sql:10-37`, `lib/notes/actions.ts:15-18`, `lib/notes/actions.ts:34-42`, `lib/notes/actions.ts:56-103`

The client page already renders tags, notes, milestones, and internal assessment. `app/(chef)/clients/[id]/page.tsx:63-69`, `app/(chef)/clients/[id]/page.tsx:206-241`, `app/(chef)/clients/[id]/page.tsx:842-849`, `app/(chef)/clients/[id]/page.tsx:875-885`

The milestone system already supports `anniversary`, but it requires an explicit date and should not be inferred blindly from the inquiry's trip date. `lib/clients/milestones.ts:13-25`, `lib/clients/milestones.ts:46-80`, `components/clients/milestone-manager.tsx:14-20`

### 6. The current product gap is orchestration, not primitives

There is no existing "capture the leverage of this soft close" action. The decline modal only stores a reason and refreshes the page. `components/inquiries/decline-with-reason-modal.tsx:19-40`, `components/inquiries/decline-with-reason-modal.tsx:52-95`

The inquiry page currently hides the Gmail response composer as soon as the inquiry is declined. That blocks the ideal order of operations for this workflow: close the current cycle, then optionally send a brief courtesy closeout. `app/(chef)/inquiries/[id]/page.tsx:808-841`

### 7. There is a real bug path if the builder misses the Gmail send mutation

`approveAndSendMessage()` always stamps `next_action_required='Awaiting client reply'`, `next_action_by='client'`, and a 48-hour `follow_up_due_at`, even before it decides whether to advance status. `lib/gmail/actions.ts:290-304`

That is acceptable for live inquiries, but wrong for a declined future-soft-close inquiry. If the builder only exposes the composer after decline and does not fix this action, a short courtesy closeout will recreate fake follow-up debt on a closed inquiry.

The generic `createMessage()` logger already skips timer resets for terminal statuses because it keys off a small map of live statuses. `lib/messages/actions.ts:100-145` The Gmail send path needs the same guard.

### 8. The touchpoint subsystem is not a safe dependency for v1

There is a `client_touchpoint_rules` table and a touchpoint action layer, but the action layer reads `clients.first_name`, `clients.last_name`, and `clients.date_of_birth`. `database/migrations/20260401000090_client_touchpoint_rules.sql:5-42`, `lib/clients/touchpoint-actions.ts:139-148`, `lib/clients/touchpoint-actions.ts:169-171`, `lib/clients/touchpoint-actions.ts:205-211`

Those columns are not present in the foundational `clients` schema, which uses `full_name` and `personal_milestones` instead. `database/migrations/20260215000001_layer_1_foundation.sql:78-99`, `database/migrations/20260215000001_layer_1_foundation.sql:112-130`

For this reason, automated future-touchpoint scheduling should not be the v1 answer for soft-close leverage.

## Gaps

1. There is no verified "Dinner Circle opted in" flag. The system knows whether a circle exists and whether it can generate a link, but it does not expose a verified acceptance signal that says "this client prefers circle-based follow-up." `components/inquiries/inquiry-response-composer.tsx:61-109`, `lib/hub/inquiry-circle-actions.ts:158-168`

2. The inquiry date is not a safe stand-in for the client's real anniversary date. Milestone support exists, but auto-writing an anniversary milestone from a one-off trip inquiry would be a product assumption, not a verified truth. `lib/clients/milestones.ts:13-25`, `database/migrations/20260215000002_layer_2_inquiry_messaging.sql:71-95`

3. Favorite cuisines can be stored, but inferring cuisine tags from discussed dishes is not verified and should stay operator-controlled in v1. `lib/clients/actions.ts:54-55`, `lib/inquiries/soft-close.ts:6-68`

## Recommendations

1. Build a dedicated soft-close leverage flow on the inquiry detail page. When `getNextActions()` detects a future-interest soft close, guide the chef to decline the current cycle first, then capture warm-lead context on the client side.

2. Keep the build schema-light. Reuse:
   - `inquiries.decline_reason`
   - `clients.dietary_restrictions`
   - `clients.favorite_dishes`
   - `client_tags`
   - `client_notes`
   - the existing Dinner Circle token and email snapshot infrastructure

3. Make A/B explicit and operator-controlled:
   - A: default for soft-close courtesy notes, no Dinner Circle link, no dinner summary unless the operator turns it on
   - B: available only when a circle exists and the operator intentionally chooses it, using the existing gentle "no account needed / email is still fine" framing

4. Fix the Gmail send mutation before exposing post-decline courtesy sends. A declined inquiry must stay declined and must not regain `next_action_required`, `next_action_by`, or `follow_up_due_at`. `lib/gmail/actions.ts:290-304`

5. Do not route v1 through `client_touchpoint_rules`. If the product wants automated reactivation later, that should be a separate follow-up spec after the client touchpoint schema/action mismatch is resolved. `lib/clients/touchpoint-actions.ts:139-148`, `database/migrations/20260215000001_layer_1_foundation.sql:75-130`

# Inquiry Circle + Communication Knowledge Codification

**Date:** 2026-03-06
**Branch:** `feature/risk-gap-closure`

## What Changed

Two connected features built in one session:

### Part 1: Communication Knowledge Persistence

The developer taught the system how private chefs actually communicate with clients. That knowledge was previously stuck in a single conversation. Now it's codified in:

1. **`docs/agent-brain/03-EMAIL_RULES.md`** - Updated: Discovery stage now ALLOWS per-person pricing from chef's rate card. Added budget/kitchen/dietary anti-patterns to forbidden phrases.

2. **`docs/agent-brain/05-DISCOVERY.md`** - Updated: Added "First Response Anti-Patterns" section. Changed dietary from "optional" to "confirm if provided." Added budget and kitchen setup to forbidden requests.

3. **`docs/agent-brain/08-INQUIRY_FIRST_RESPONSE.md`** (NEW) - Dedicated first-response rules with exact structure, anti-patterns, parameterized template logic, and pass/fail test.

4. **`lib/ai/agent-brain.ts`** - Updated: Loads `08-*` doc, injects first-response rules for `INBOUND_SIGNAL` and `QUALIFIED_INQUIRY` states. Fixed `determinePricingEligibility()` to allow pricing in discovery. Fixed discovery firewall to allow pricing. Added anti-patterns to forbidden phrases.

5. **`lib/templates/inquiry-first-response.ts`** (NEW) - Deterministic (Formula > AI) template. No LLM call. Generates a complete first response from: client name, date, guest count, dietary restrictions, occasion, chef service config.

6. **`lib/ai/agent-actions/inquiry-response-actions.ts`** (NEW) - Remy Tier 2 action `draft.inquiry_first_response`. Loads inquiry data + service config, calls deterministic template, returns draft for chef review.

### Part 2: Auto-Connect Inquiries to Dinner Circles

When a client submits an inquiry, a Dinner Circle (hub group) is automatically created so the conversation happens in-app instead of email threads.

1. **`supabase/migrations/20260330000057_hub_inquiry_link.sql`** (NEW) - Adds `inquiry_id` column to `hub_groups`. Additive only.

2. **`lib/hub/inquiry-circle-actions.ts`** (NEW) - `createInquiryCircle()`: creates hub group linked to inquiry, adds chef + client as members. `getInquiryCircleToken()`: reads circle token. `linkInquiryCircleToEvent()`: links circle to event on conversion.

3. **`lib/hub/inquiry-circle-first-message.ts`** (NEW) - Posts the deterministic first response as the first message in the circle.

4. **4 inquiry entry points hooked** (all non-blocking):
   - `app/api/embed/inquiry/route.ts` (embed widget)
   - `lib/inquiries/actions.ts` (manual creation)
   - `lib/gmail/sync.ts` (Gmail sync)
   - `lib/inquiries/public-actions.ts` (public inquiry)

5. **Email updated** - `lib/email/notifications.ts` + `lib/email/templates/inquiry-received.tsx`: acknowledgment email now includes circle link when available.

6. **Chef-side visibility** - `app/(chef)/inquiries/[id]/page.tsx`: shows "View Circle" card with link when a circle exists.

7. **Circle evolution** - `convertInquiryToEvent()` in `lib/inquiries/actions.ts`: links the circle to the new event when inquiry converts.

## Data Flow

```
Client submits inquiry -> createInquiry() runs
  -> [non-blocking] createInquiryCircle()
    -> Creates hub group with inquiry_id
    -> Adds chef + client as members
    -> Posts first response (deterministic template)
  -> [non-blocking] sendAcknowledgmentEmail()
    -> Includes circle link

Client clicks link -> Dinner Circle (no login needed)
  -> Sees pricing, dietary confirmed, menu direction
  -> Can reply in circle chat

Inquiry converts to event -> linkInquiryCircleToEvent()
  -> Circle gets event_id, continues as event space
```

## Critical Design Decision: Pricing in Discovery

Previously, `03-EMAIL_RULES.md` and `agent-brain.ts` FORBID all pricing in the Discovery stage. The developer confirmed this is wrong for private chefs. Chefs quote their own per-person rate in the first response. This was updated across:

- `03-EMAIL_RULES.md` discovery allowed/forbidden lists
- `05-DISCOVERY.md` first response anti-patterns
- `08-INQUIRY_FIRST_RESPONSE.md` template structure
- `agent-brain.ts` `determinePricingEligibility()`, `extractDiscoveryRules()`, `extractEmailFirewallRules()`

## Migration Required

`20260330000057_hub_inquiry_link.sql` needs `supabase db push` (developer approval + backup required).

## Files Created (6)

- `docs/agent-brain/08-INQUIRY_FIRST_RESPONSE.md`
- `lib/templates/inquiry-first-response.ts`
- `lib/ai/agent-actions/inquiry-response-actions.ts`
- `supabase/migrations/20260330000057_hub_inquiry_link.sql`
- `lib/hub/inquiry-circle-actions.ts`
- `lib/hub/inquiry-circle-first-message.ts`

## Files Modified (9)

- `docs/agent-brain/03-EMAIL_RULES.md`
- `docs/agent-brain/05-DISCOVERY.md`
- `lib/ai/agent-brain.ts`
- `lib/ai/agent-actions/index.ts`
- `app/api/embed/inquiry/route.ts`
- `lib/inquiries/actions.ts`
- `lib/gmail/sync.ts`
- `lib/inquiries/public-actions.ts`
- `lib/email/notifications.ts`
- `lib/email/templates/inquiry-received.tsx`
- `app/(chef)/inquiries/[id]/page.tsx`

# Build: Referral Context Badge on Event Detail

**Goal:** Surface referral source and trust context (deposit waiver, flexible terms) on the event detail page so chefs don't forget referral arrangements across 20+ active events.
**Label:** CODEX
**Estimated scope:** S (2 files)
**Depends on:** build-fix-tsc-errors

## Context Files (read first)

- `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx` (event detail overview)
- `lib/inquiries/actions.ts` (inquiry data with referral_source field)
- `lib/db/schema/schema.ts` (inquiries table schema, events table schema)

## Design

Events are linked to inquiries. Inquiries have a `referral_source` text field and `source` (how the inquiry came in). When an event was created from an inquiry with a referral source:

1. Show a badge/tag on the event detail overview: "Referral: [source]"
2. If the event has notes mentioning deposit waiver or special terms, highlight those

This is read-only display. No new tables, no new columns. Just surface existing data.

## Files to Modify

1. **Modify** `app/(chef)/events/[id]/_components/event-detail-overview-tab.tsx`
   - Query the linked inquiry for the event (events have `inquiry_id` FK or can be joined via client+date)
   - If inquiry has `referral_source`, render a Badge component: "Referral: [source]"
   - Place it near the event header, after the status badge

2. **Modify** `app/(chef)/events/[id]/page.tsx` (if the data fetch needs to include inquiry data)
   - Add inquiry referral_source to the event data query

## Steps

1. Read the event detail overview tab and the event page data fetcher
2. Check how events link to inquiries (direct FK or indirect)
3. Add the referral_source to the data fetch
4. Add a Badge component showing the referral source
5. Run `npx tsc --noEmit --skipLibCheck`

## Constraints

- Do NOT create any new tables or columns
- Do NOT modify inquiry data or actions
- Use existing Badge component with `info` variant
- Only show the badge when referral_source is non-empty
- No em dashes
- Keep the display minimal; one line, one badge

## Verification

- [ ] `npx tsc --noEmit --skipLibCheck` passes
- [ ] Manual: event created from a referral inquiry shows the referral badge
- [ ] Manual: event without a referral shows no badge (no empty state)

## Rollback

If verification fails and you cannot fix within 2 attempts: `git stash`, report what failed.

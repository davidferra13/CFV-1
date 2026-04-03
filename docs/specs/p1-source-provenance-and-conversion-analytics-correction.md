# Spec: Source Provenance and Conversion Analytics Correction

> **Status:** ready
> **Priority:** P1 (next up)
> **Depends on:** `docs/specs/p0-public-booking-routing-and-source-truth.md`, `docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md`
> **Estimated complexity:** medium (3-8 files)

## Timeline

_Every status change, every claim, every verification gets a row. This is the audit trail._

| Event         | Date                 | Agent/Session | Commit |
| ------------- | -------------------- | ------------- | ------ |
| Created       | 2026-04-03 01:17 EDT | Codex         |        |
| Status: ready | 2026-04-03 01:17 EDT | Codex         |        |

---

## Developer Notes

### Raw Signal

The developer asked for the next moves to be made in the correct order, with full understanding of the current system, and to leave the builder with a complete execution path instead of more disconnected research. The work has to turn research into something operationally useful, not just descriptive.

That means analytics cannot stay at the level of "Website" versus "Phone" if the actual product already distinguishes open booking, direct chef inquiry, embed, Wix, kiosk, and instant checkout. If the builder cannot measure real lanes, they will optimize the wrong funnel.

### Developer Intent

- **Core goal:** Correct source and conversion analytics so ChefFlow measures real intake lanes instead of a flattened `channel` view.
- **Key constraints:** Do not add new DB tables. Do not break current analytics pages by changing shapes unnecessarily. Do not conflate referral-partner attribution with intake-lane provenance. Do not reuse stale API v2 inquiry assumptions.
- **Motivation:** The current dashboard can mislead product and website decisions because it under-models provenance and leaves completed counts effectively broken.
- **Success from the developer's perspective:** A builder can implement truthful source dashboards and channel metrics after the routing spec lands, using one shared provenance helper and no guessed semantics.

---

## What This Does (Plain English)

This spec fixes ChefFlow's source analytics so the dashboard can tell the difference between open booking, direct chef inquiry, embed inquiry, kiosk, Wix, instant booking, and older coarse channels like phone or text. It also fixes the current conversion math so completed counts are based on linked event outcomes instead of staying zero.

---

## Why It Matters

Right now the system already captures more provenance than the dashboard uses. That means the product can look simpler and less capable than it actually is, and the team can make website or growth decisions off misleading data.

---

## Current-State Summary

The current source-distribution and trend functions only group by `inquiries.channel`, which collapses multiple website-origin lanes into one "Website" bucket. [lib/partners/analytics.ts:89-115](lib/partners/analytics.ts:89) [lib/partners/analytics.ts:220-259](lib/partners/analytics.ts:220)

The current conversion function fetches linked event statuses into `eventByInquiry` but never uses that map, so `completed` stays zero for every bucket. [lib/partners/analytics.ts:121-165](lib/partners/analytics.ts:121)

Those outputs are consumed directly by the chef analytics hub and the referral-performance page. [app/(chef)/analytics/page.tsx:164-235](<app/(chef)/analytics/page.tsx:164>) [app/(chef)/partners/referral-performance/page.tsx:18-148](<app/(chef)/partners/referral-performance/page.tsx:18>)

The referral-performance page also multiplies `conversion_rate` by 100 even though the server action already returns a percentage integer, so rendered percentages are inflated. [lib/partners/analytics.ts:342-345](lib/partners/analytics.ts:342) [app/(chef)/partners/referral-performance/page.tsx:106-107](<app/(chef)/partners/referral-performance/page.tsx:106>)

---

## Files to Create

| File                                   | Purpose                                                                                                                                  |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/analytics/source-provenance.ts`   | Shared derivation helper that normalizes inquiry plus event metadata into one lane key and one human label                               |
| `tests/unit/source-provenance.test.ts` | Verifies precedence across open booking, public profile inquiry, embed, Wix, kiosk, instant booking, coarse channels, and fallback cases |

---

## Files to Modify

| File                                                | What to Change                                                                                                                                     |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/partners/analytics.ts`                         | Replace `channel`-only grouping with shared provenance derivation, fix completed conversion counting, and keep output shapes stable where possible |
| `app/(chef)/partners/referral-performance/page.tsx` | Stop multiplying already-percent values by 100 and align labels with the new provenance buckets                                                    |
| `app/(chef)/analytics/page.tsx`                     | Only update labels or legends if needed after the shared provenance helper changes bucket names                                                    |
| `app/api/v2/partners/analytics/route.ts`            | Keep returning the updated source-distribution payload from the corrected helper                                                                   |

---

## Database Changes

None.

This spec reads existing fields only:

- `inquiries.channel`
- `inquiries.unknown_fields`
- `inquiries.utm_medium`
- `inquiries.referral_partner_id`
- `inquiries.external_platform`
- `inquiries.converted_to_event_id`
- `events.status`
- `events.booking_source`

---

## Data Model

### Shared Provenance Shape

`lib/analytics/source-provenance.ts` should expose a read-only normalized result like:

```ts
type SourceProvenance = {
  key:
    | 'open_booking'
    | 'public_profile_inquiry'
    | 'embed_inquiry'
    | 'wix_form'
    | 'kiosk_inquiry'
    | 'instant_book'
    | 'take_a_chef'
    | 'phone'
    | 'email'
    | 'text'
    | 'referral'
    | 'other'
  label: string
}
```

### Derivation Precedence

Use this precedence order:

1. explicit lane key in `unknown_fields.submission_source`
2. legacy open-booking markers: `unknown_fields.open_booking === true` or `utm_medium === 'open_booking'`
3. legacy embed marker: `unknown_fields.embed_source === true`
4. Wix channel or Wix submission marker
5. kiosk channel
6. instant-book `events.booking_source` or the new inquiry-side lane key
7. external marketplace or coarse channel fallback

### Conversion Semantics

Keep the existing `ConversionData` shape for compatibility:

- `inquiries`: total inquiries in the bucket
- `confirmed`: inquiries that have entered a committed event path, defined as linked event status in `accepted`, `paid`, `confirmed`, `in_progress`, or `completed`, or legacy `inquiry.status === 'confirmed'` when no linked event exists
- `completed`: linked event status exactly `completed`

This keeps the page contract stable while making the metric truthful.

---

## Server Actions

No new server actions are required.

This spec modifies existing analytics actions:

| Action                               | Auth            | Input               | Output                                     | Side Effects |
| ------------------------------------ | --------------- | ------------------- | ------------------------------------------ | ------------ |
| `getSourceDistribution(range?)`      | `requireChef()` | optional date range | `SourceDataPoint[]` with provenance labels | none         |
| `getConversionRatesBySource(range?)` | `requireChef()` | optional date range | `ConversionData[]` grouped by provenance   | none         |
| `getRevenueBySource(range?)`         | `requireChef()` | optional date range | `RevenueData[]` grouped by provenance      | none         |
| `getSourceTrends(months?)`           | `requireChef()` | month count         | `TrendDataPoint[]` grouped by provenance   | none         |
| `getTopSourcesThisMonth()`           | `requireChef()` | none                | top provenance buckets                     | none         |

---

## UI / Component Spec

### Analytics Hub

Keep the existing analytics hub layout. Only the labels and values change.

Requirements:

- bucket names must reflect real intake lanes
- completed counts must be non-zero when completed linked events exist
- no coarse "Website" bucket should swallow open booking, direct profile inquiry, embed, and instant book together

### Referral Performance Page

Keep the table layout but fix percentage rendering:

- render `partner.conversion_rate` directly as a percent string
- do not multiply it again

### No False Precision

Do not invent new categories if provenance is absent. Fall back to coarse channel labels or `Other`.

---

## Edge Cases and Error Handling

| Scenario                                                      | Correct Behavior                                                                                                               |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Inquiry has no `submission_source` yet                        | Derive from legacy markers such as `open_booking`, `embed_source`, `utm_medium`, `booking_source`, then fall back to `channel` |
| Inquiry has linked event in `draft` or `proposed` only        | Count as an inquiry, not as confirmed or completed                                                                             |
| Inquiry has `status='confirmed'` but no linked event          | Count as confirmed for compatibility during migration                                                                          |
| Referral partner attribution exists alongside lane provenance | Preserve partner metrics separately. Do not convert referral-partner id into the lane label.                                   |
| UI has no data for a lane                                     | Show no row or empty-state behavior, not fake zeros beyond the existing analytics fallback rules                               |

---

## Verification Steps

1. Seed or identify one inquiry each for open booking, single-chef public inquiry, embed, Wix, kiosk, and instant book.
2. Run the corrected source-distribution action and verify each lane appears as its own bucket.
3. Run the corrected conversion action and verify a bucket with a completed linked event now shows `completed > 0`.
4. Verify buckets with only `draft` or `proposed` linked events do not count as confirmed.
5. Open `/analytics` and confirm the source widgets render the corrected lane labels without crashing.
6. Open `/partners/referral-performance` and confirm partner conversion percentages render once, not multiplied by 100 again.
7. Call `/api/v2/partners/analytics` and verify it returns the corrected distribution payload.

---

## Out of Scope

- website copy or CTA changes
- write-path provenance additions from the P0 routing spec
- custom report revenue-by-source semantics in `lib/analytics/custom-report-enhanced-actions.ts`
- partner-program redesign
- marketing attribution outside the current chef analytics and partner surfaces

---

## Notes for Builder Agent

- Build this only after the P0 routing spec lands, because explicit lane keys make the analytics helper cleaner and safer.
- Keep API response shapes stable where possible. The goal is truthful values, not a dashboard rewrite.
- Do not use the stale `app/api/v2/inquiries` contract as provenance truth. The funnel-truth memo already flags it as unreliable.

---

## Spec Validation

1. **What exists today that this touches?**  
   Source analytics already live in `lib/partners/analytics.ts`. [lib/partners/analytics.ts:89-359](lib/partners/analytics.ts:89) The analytics hub and referral-performance page already consume those actions. [app/(chef)/analytics/page.tsx:23-28](<app/(chef)/analytics/page.tsx:23>) [app/(chef)/analytics/page.tsx:164-235](<app/(chef)/analytics/page.tsx:164>) [app/(chef)/partners/referral-performance/page.tsx:18-148](<app/(chef)/partners/referral-performance/page.tsx:18>) The route `/api/v2/partners/analytics` already proxies `getSourceDistribution()`. [app/api/v2/partners/analytics/route.ts:4-17](app/api/v2/partners/analytics/route.ts:4)
2. **What exactly changes?**  
   Add one shared read-only provenance helper and update the analytics actions to use it. Fix the completed-count bug by actually applying `eventByInquiry`. Keep the action output shapes stable where possible. Fix the partner page's percentage rendering bug. [lib/partners/analytics.ts:138-165](lib/partners/analytics.ts:138) [app/(chef)/partners/referral-performance/page.tsx:132-141](<app/(chef)/partners/referral-performance/page.tsx:132>)
3. **What assumptions are you making?**  
   Verified: route-level provenance already exists in multiple write paths via `unknown_fields`, `utm_medium`, and `booking_source`. [app/api/book/route.ts:223-235](app/api/book/route.ts:223) [app/api/embed/inquiry/route.ts:239-255](app/api/embed/inquiry/route.ts:239) [lib/booking/instant-book-actions.ts:426-476](lib/booking/instant-book-actions.ts:426) Verified: event lifecycle statuses are defined and ordered. [lib/events/transitions.ts:12-30](lib/events/transitions.ts:12) Unverified: how many historical rows lack enough provenance for perfect lane reconstruction. This spec addresses that by requiring layered fallback, not by assuming perfect backfill.
4. **Where will this most likely break?**  
   First, historical records may not have the new canonical lane key yet, so provenance derivation must gracefully fall back. The risk is in older website-origin inquiries that only have `channel='website'`. [lib/partners/analytics.ts:94-114](lib/partners/analytics.ts:94) [app/api/book/route.ts:223-235](app/api/book/route.ts:223) Second, UI consumers could mis-handle new labels if they assume coarse channel names only. The analytics hub and referral page are the main risk surfaces. [app/(chef)/analytics/page.tsx:230-235](<app/(chef)/analytics/page.tsx:230>) [app/(chef)/partners/referral-performance/page.tsx:116-147](<app/(chef)/partners/referral-performance/page.tsx:116>)
5. **What is underspecified?**  
   Without this spec, the builder would have to guess precedence when multiple markers exist, whether `confirmed` should stay the same shape, and whether partner attribution is the same thing as lane provenance. This spec now names the helper, precedence order, metric semantics, and out-of-scope boundary.
6. **What dependencies or prerequisites exist?**  
   The routing/source-truth spec should land first so new inquiries write canonical lane keys. Existing legacy markers such as `open_booking`, `embed_source`, and `booking_source` remain fallback inputs. [docs/specs/p0-public-booking-routing-and-source-truth.md:1-18](docs/specs/p0-public-booking-routing-and-source-truth.md:1) [app/api/book/route.ts:223-235](app/api/book/route.ts:223) [app/api/embed/inquiry/route.ts:239-255](app/api/embed/inquiry/route.ts:239) [lib/booking/instant-book-actions.ts:426-476](lib/booking/instant-book-actions.ts:426)
7. **What existing logic could this conflict with?**  
   It could conflict with `lib/analytics/custom-report-enhanced-actions.ts`, which groups revenue by `clients.referral_source` for custom reports. That is a different question and must not be silently rewritten here. [lib/analytics/custom-report-enhanced-actions.ts:128-210](lib/analytics/custom-report-enhanced-actions.ts:128) It also overlaps with partner metrics, so the builder must keep partner attribution separate from intake-lane labels. [lib/partners/analytics.ts:265-349](lib/partners/analytics.ts:265)
8. **What is the end-to-end data flow?**  
   Public or operator intake writes provenance markers onto inquiry and event records -> analytics actions read inquiry plus event metadata -> shared provenance helper derives one lane key and label -> dashboard pages render grouped distribution, conversion, and revenue metrics. Existing read points are in `lib/partners/analytics.ts`, and existing write points are in the intake routes cited above. [lib/partners/analytics.ts:89-214](lib/partners/analytics.ts:89) [app/api/book/route.ts:204-279](app/api/book/route.ts:204) [lib/inquiries/public-actions.ts:203-325](lib/inquiries/public-actions.ts:203) [app/api/embed/inquiry/route.ts:225-302](app/api/embed/inquiry/route.ts:225) [lib/booking/instant-book-actions.ts:151-177](lib/booking/instant-book-actions.ts:151)
9. **What is the correct implementation order?**  
   First add the shared provenance helper and unit tests. Second refactor `getSourceDistribution()` and `getSourceTrends()` to use it. Third refactor `getConversionRatesBySource()` and `getRevenueBySource()` to use it and fix completed counts. Fourth fix the referral-performance UI percent rendering. Fifth verify `/analytics`, `/partners/referral-performance`, and `/api/v2/partners/analytics`.
10. **What are the exact success criteria?**  
    Success means the analytics surfaces show separate buckets for real intake lanes, completed conversion counts are truthful, and the partner page renders percentages correctly once. The current broken points are already visible in code. [lib/partners/analytics.ts:145-164](lib/partners/analytics.ts:145) [app/(chef)/partners/referral-performance/page.tsx:106-107](<app/(chef)/partners/referral-performance/page.tsx:106>)
11. **What are the non-negotiable constraints?**  
    No schema changes. No guessed categories when provenance is missing. Keep tenant scoping through `requireChef()` and `.eq('tenant_id', user.tenantId!)`. Do not use stale API v2 inquiry contracts as source truth. [lib/partners/analytics.ts:89-99](lib/partners/analytics.ts:89) [lib/partners/analytics.ts:126-143](lib/partners/analytics.ts:126) [docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:419-436](docs/research/foundations/2026-04-03-source-to-close-funnel-truth-map.md:419)
12. **What should NOT be touched?**  
    Do not redesign the analytics hub layout, do not change the custom-report revenue-by-source logic in this pass, and do not modify partner attribution tables or schemas. [app/(chef)/analytics/page.tsx:221-260](<app/(chef)/analytics/page.tsx:221>) [lib/analytics/custom-report-enhanced-actions.ts:128-210](lib/analytics/custom-report-enhanced-actions.ts:128)
13. **Is this the simplest complete version?**  
    Yes. It adds one shared helper, one test file, and targeted refactors to existing analytics actions and one rendering bug. It avoids a dashboard rewrite and avoids new storage structures.
14. **If implemented exactly as written, what would still be wrong?**  
    Historical records that lack enough provenance will still fall back to coarse channel labels, so old data may remain partially flattened until enough new writes land under the P0 spec. That is acceptable and explicitly handled.

### Final Check

This spec is ready for builder execution after the P0 routing spec lands. The only remaining uncertainty is the completeness of historical provenance on older rows, and the fallback logic handles that without affecting correctness for new traffic.

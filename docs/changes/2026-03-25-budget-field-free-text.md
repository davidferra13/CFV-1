# Budget Field: Hardcoded Ranges to Free-Text Input

**Date:** 2026-03-25
**Type:** Bug fix (client-facing)
**Severity:** High (live, clients seeing incorrect pricing)

## Problem

Both inquiry forms (embed widget and public profile) displayed hardcoded budget range dropdowns with specific dollar amounts ($500, $1,500, $3,000, $5,000). These amounts did not reflect the chef's actual pricing, causing clients to anchor their expectations to wrong numbers.

## Solution

Replaced the budget range dropdown + exact amount fields with a single free-text input. Clients now type their budget naturally (e.g. "$1,500", "around $2,000", "flexible", "not sure yet").

If the text parses as a number, the system automatically extracts `budget_cents` for structured data. Otherwise the raw text is stored as `budget_range` for the chef to review.

## Files Changed

| File                                        | Change                                                                        |
| ------------------------------------------- | ----------------------------------------------------------------------------- |
| `components/embed/embed-inquiry-form.tsx`   | Removed `BUDGET_OPTIONS` dropdown, replaced with text input                   |
| `components/public/public-inquiry-form.tsx` | Removed `BUDGET_RANGE_OPTIONS` dropdown, replaced with text input             |
| `app/api/embed/inquiry/route.ts`            | Changed `budget_range` Zod validation from enum to `z.string().max(200)`      |
| `lib/inquiries/public-actions.ts`           | Same Zod validation change                                                    |
| `app/(client)/my-inquiries/[id]/page.tsx`   | Updated `getBudgetRangeLabel` to handle both legacy enum values and free text |
| `lib/automations/types.ts`                  | Updated hint text for budget_range field                                      |

## Backward Compatibility

- Legacy enum values (`under_500`, `500_1500`, etc.) stored in existing inquiries still display correctly via the `legacyLabels` lookup in the client detail page.
- The `budget_range` field name is preserved in the database (JSON storage in `unknown_fields`), so no migration needed.
- Analytics events continue to track `budget_mode`, `budget_range`, and `budget_exact_entered`.

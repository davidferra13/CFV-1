# Quick Quote Pre-Fill from Inquiry

## What Changed
- `app/(chef)/quotes/new/page.tsx` — added `prefilledOccasion` and `prefilledEventDate` fetching
- `components/quotes/quote-form.tsx` — added two new props and "From inquiry" context banner

## Before
The new quote page already fetched `confirmed_guest_count` and `confirmed_budget_cents` from the
linked inquiry. Occasion and event date were not passed through.

## After
When navigating to `/quotes/new?inquiry_id=...`:
1. `confirmed_occasion` → pre-fills `quoteName` (chef can still edit)
2. `confirmed_date` → shown in "From inquiry" context banner
3. Guest count and budget → already pre-filled (no change)
4. A "From inquiry: [Occasion] · [Date]" banner appears at the top of the form

## Files Modified
- `app/(chef)/quotes/new/page.tsx`
- `components/quotes/quote-form.tsx`

# Pricing Engine in Quote Form

## What Changed
`components/quotes/quote-form.tsx` — added collapsible "Price Calculator" panel

## What It Does
A collapsible panel (collapsed by default, labeled "Price Calculator") that:
1. Lets the chef enter: service type, course count (for private dinner), event date, distance miles, weekend premium toggle
2. On "Calculate": calls `computePricing()` from `lib/pricing/compute.ts` — a pure async function, no server roundtrip
3. Shows the full breakdown: service fee, weekend premium, holiday premium, proximity premium, travel, total, deposit
4. "Use This Price →" button auto-fills: total quoted amount, deposit amount, deposit percentage, pricing model, price per person
5. Collapses after "Use This Price" is clicked

## Technical Notes
- `computePricing()` is a pure function imported directly in the client component (no server action needed)
- Guest count is shared with the main form — the calculator reads the current `guestCount` state
- Calculate button is disabled (and a warning shown) if guest count is not yet filled in the main form — prevents accidentally pricing for 1 guest
- Event date is pre-filled from `prefilledEventDate` prop if coming from an inquiry
- All amounts are in cents internally, formatted to dollars for display

## Accessibility
All native `<select>` and `<input>` elements have `id`/`htmlFor` label pairs and `title` attributes.

## Files Modified
- `components/quotes/quote-form.tsx`

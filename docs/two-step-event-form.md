# Two-Step Event Form

## What Changed

`components/events/event-form.tsx` — rewritten to split into two steps

## Step Structure

**Step 1 — Event Details** (required fields):

- Client selection
- Occasion
- Event Date & Time
- Serve Time
- Number of Guests
- Location (address, city, state, zip) with Google autocomplete

**Step 2 — Pricing & Notes** (optional/financial):

- Quoted Price
- Deposit Amount
- Special Requests
- Partner Venue (if partners configured)

## UX Details

- Step indicator at top with numbered circles and a connecting line
- Step 1 "Continue →" validates all required fields before advancing; shows inline error if missing
- Step 2 "← Back" returns to Step 1 (clears error)
- Both create and edit modes use the same two-step layout (edit starts on step 1)
- `window.scrollTo({ top: 0 })` called on step advance for mobile UX
- Form submit (step 2) still validates: deposit ≤ total, date in future

## What Didn't Change

- All form state, server actions, and data shapes are identical
- `createEvent()` and `updateEvent()` server actions unchanged
- All fields are preserved — nothing removed

## Files Modified

- `components/events/event-form.tsx`

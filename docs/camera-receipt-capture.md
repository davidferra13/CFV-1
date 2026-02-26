# Camera-First Receipt Capture

## What Changed

`components/expenses/expense-form.tsx` — file input element

## Change

Added `capture="environment"` to the receipt upload `<input type="file">`.

## Why

On mobile devices, `capture="environment"` opens the rear camera directly instead of the
file picker. This eliminates the 2-tap detour (file picker → camera) and is critical for
DOP (Day-Of Protocol): the chef must photograph grocery receipts at the store, under time pressure.

Desktop browsers ignore `capture` silently and fall back to normal file picker — no regressions.

## Helper text updated

"On mobile, opens camera directly. JPEG, PNG, HEIC, or WebP. Max 10MB."

## Files Modified

- `components/expenses/expense-form.tsx`

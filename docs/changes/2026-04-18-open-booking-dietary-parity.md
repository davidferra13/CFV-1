# Open Booking Dietary Parity

Date: 2026-04-18

## What changed

The open booking intake route at `app/api/book/route.ts` now preserves dietary and allergy context across the full intake chain instead of stopping at the inquiry.

Before this change:

- `confirmed_dietary_restrictions` was written to the inquiry
- newly created clients did **not** receive `dietary_restrictions` or `allergies`
- auto-created draft events did **not** receive `dietary_restrictions` or `allergies`

After this change:

- dietary free text is parsed once into a shared `dietaryRestrictions` array
- newly created clients receive:
  - `dietary_restrictions`
  - `allergies`
- inquiries continue receiving `confirmed_dietary_restrictions`
- auto-created draft events now also receive:
  - `dietary_restrictions`
  - `allergies`

The route also now strips basic HTML tags from free-text values before storing them.

## Why

`app/api/embed/inquiry/route.ts` already carried dietary safety context further downstream than `app/api/book/route.ts`.

That meant two public intake paths with nearly identical business purpose produced different safety outcomes. Open booking could create a draft event without the dietary/allergy data needed by downstream menu, allergen, and client-facing systems.

This change removes that parity gap.

## Verification

Focused tests added and passed:

- `tests/unit/open-booking-intake-parity.test.ts`
- `tests/unit/open-booking.route.test.ts`

Command run:

```bash
node --test --import tsx tests/unit/open-booking.route.test.ts tests/unit/open-booking-intake-parity.test.ts
```

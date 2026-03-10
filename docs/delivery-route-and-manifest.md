# Delivery Route & Manifest Features

## Summary

Two new features for the Meal Prep archetype: delivery route planning with live tracking, and a printable delivery manifest.

## Feature 1: Delivery Route & Tracking

### What it does

- Generates delivery routes from active meal prep programs for a given date
- Orders stops alphabetically by address (simple, no GPS optimization)
- Tracks delivery status per stop: scheduled, in_transit, delivered, no_answer, cancelled
- Allows manual reordering of stops (up/down arrows)
- "Start Run" marks all scheduled stops as in_transit
- Per-stop actions: mark delivered, mark no answer, notify client via email
- Editable meal/container counts per stop
- Progress bar showing delivered vs total stops
- Date picker to view different delivery days

### Files

- **Migration:** `supabase/migrations/20260331000008_meal_prep_deliveries.sql` - new `meal_prep_deliveries` table with RLS
- **Server actions:** `lib/meal-prep/delivery-actions.ts` - 8 actions (generate route, get route, reorder, mark delivered, mark no answer, start run, history, notify client, update counts)
- **Component:** `components/meal-prep/delivery-route.tsx` - interactive delivery stop list with optimistic updates and rollback
- **Page:** `app/(chef)/meal-prep/delivery/page.tsx` - server component entry point
- **Client wrapper:** `app/(chef)/meal-prep/delivery/delivery-client.tsx` - date picker, generate button, route/manifest tab toggle, summary cards

### Data model

The `meal_prep_deliveries` table stores individual delivery stops. Each stop references a `meal_prep_program` and a `client`. The `delivery_order` field determines stop sequence. Status transitions: scheduled -> in_transit -> delivered/no_answer/cancelled.

## Feature 2: Delivery Manifest

### What it does

- Generates a printable document for delivery day
- Shows chef name, date, total stops/meals/containers
- Per-stop sections with client name, address, phone, meal count, container count, delivery window, special notes
- Checkbox column for driver to mark delivered on paper
- Signature line and "All deliveries complete" checkbox at the bottom
- Print button triggers browser print dialog
- White background with clear typography for readability

### Files

- **Server action:** `lib/meal-prep/manifest-actions.ts` - `generateDeliveryManifest()` returns structured manifest data
- **Component:** `components/meal-prep/delivery-manifest.tsx` - print-friendly layout with `window.print()` support

## Integration Points

- **Nav config:** Added "Delivery Route" sub-item under Meal Prep in `components/navigation/nav-config.tsx`
- **Meal Prep dashboard:** Added "Delivery Route" button to `app/(chef)/meal-prep/page.tsx`
- **Email template:** `lib/email/templates/delivery-notification.tsx` - "Your meals are on the way!" notification

## Tier

Pro (operations module), consistent with existing meal prep features.

## Patterns followed

- All server actions use `requireChef()` + tenant scoping
- Optimistic updates with rollback on error
- Non-blocking email notifications (try/catch, logged but not thrown)
- Additive migration only
- No em dashes in any copy

# BEO (Banquet Event Order) Generation

**Added:** 2026-03-09
**Branch:** `feature/risk-gap-closure`

## What

Auto-generated Banquet Event Orders from event data. Two versions: **Full** (with financials) and **Kitchen** (for staff, no pricing/client email).

Inspired by Perfect Venue's auto-generated BEOs.

## Files

| File                                  | Purpose                                                                      |
| ------------------------------------- | ---------------------------------------------------------------------------- |
| `lib/beo/types.ts`                    | Shared type definitions (BEOData, BEOCourse, etc.)                           |
| `lib/beo/generate-beo.ts`             | Server action that assembles BEO data from event + menu + staff + financials |
| `lib/beo/format-html.ts`              | Pure function that renders BEOData as a standalone printable HTML document   |
| `lib/beo/actions.ts`                  | Server actions: `getEventBEO()` and `bulkGenerateBEOs()`                     |
| `components/events/beo-viewer.tsx`    | Client component with Full/Kitchen toggle, print button, professional layout |
| `app/(chef)/events/[id]/beo/page.tsx` | Server page that loads and renders the BEO                                   |

## What the BEO includes

- **Header:** Chef business name, event name/occasion, date, generated timestamp
- **Event Details:** Date, service time, service style, guest count (with confirmed/unconfirmed indicator), status
- **Client & Location:** Client name, email (full only), phone, full address, location notes
- **Dietary Notes & Allergies:** All dietary restrictions and allergies (allergies highlighted in red)
- **Menu:** Courses with dishes, descriptions, dietary tags, allergen flags. Kitchen version adds plating instructions column. Supports both structured menus (dishes table) and simple-mode menus (free text)
- **Timeline:** Arrival/setup, service time, departure
- **Staff:** Assigned staff with name, role, phone
- **Notes:** Special requests, kitchen notes, site notes, access instructions
- **Additional Details:** Alcohol, cannabis preferences
- **Financial Summary (Full only):** Quoted price, deposit, total paid, refunded, balance due, payment status

## Access points

1. **Ops tab** on event detail page: "Banquet Event Order" card with "View BEO" button (shown for non-draft, non-cancelled events)
2. **Money tab** on event detail page: "BEO" button next to "View Invoice" in the Financial Summary header
3. **Direct URL:** `/events/[id]/beo`

## Architecture

- `generate-beo.ts` is a `'use server'` file containing only the async `generateBEO()` function
- `format-html.ts` is a pure function (not a server action) so it can be imported from any context
- `types.ts` is a plain types file with no runtime code
- The viewer component uses `useTransition` with rollback for version toggling (per Zero Hallucination rules)
- The HTML formatter produces a standalone document with embedded CSS, suitable for printing or saving
- `bulkGenerateBEOs()` processes events in batches of 5 for multi-event days

## Data sources

- `events` table (with client join)
- `chefs` table (business name, contact)
- `menus` table (name, description, simple mode)
- `dishes` table (course structure, dietary tags, allergens, plating)
- `event_staff_assignments` with `staff_members` join
- `event_financial_summary` view (payment totals)

# Front-of-House Menu: Beautiful Template + Client Access

## What Changed

Two gaps in the FOH menu system were closed:

1. **Template polish** — The printed menu now uses a classic serif (Times-Roman) layout suitable for table placement
2. **Client access** — Clients can now download/print the menu directly from their event portal

---

## Template Changes (`lib/documents/generate-front-of-house-menu.ts`)

The `renderFrontOfHouseMenu` function was updated for a more elegant, restaurant-quality look:

| Element          | Before                | After                                   |
| ---------------- | --------------------- | --------------------------------------- |
| Title font       | Helvetica Bold 18pt   | Times-Roman Bold 20pt                   |
| Date line        | Helvetica Italic 10pt | Times-Roman Italic 10pt                 |
| "For [Client]"   | Helvetica 9pt black   | Helvetica 8pt muted gray                |
| Separator        | 0.3pt gray line       | 0.5pt dark line, inset 30mm             |
| "COURSE N" label | Helvetica Bold 8pt    | Removed                                 |
| Course name      | Helvetica Bold 13pt   | Times-Roman Bold 14pt                   |
| Description      | Helvetica 9pt         | Times-Roman Italic 9pt                  |
| Dietary tags     | Helvetica Italic 7pt  | Helvetica Italic 7pt, muted (unchanged) |
| Between courses  | Just spacing          | Light gray rule + spacing               |

The `drawCenteredText` helper was updated to accept `font: 'helvetica' | 'times'` so serif/sans can be mixed intentionally.

No changes to `PDFLayout` itself — all changes are isolated to the render function.

---

## New: Client Fetch + Generate Functions

Two functions added to `lib/documents/generate-front-of-house-menu.ts`:

### `fetchFrontOfHouseMenuDataForClient(eventId)`

- Mirrors `fetchFrontOfHouseMenuData` but uses `requireClient()` instead of `requireChef()`
- Scopes the event query by `client_id = user.entityId` (not `tenant_id`)
- Returns the same `FrontOfHouseMenuData` type, so both share one render function

### `generateFrontOfHouseMenuForClient(eventId)`

- Calls `fetchFrontOfHouseMenuDataForClient` → `renderFrontOfHouseMenu` → `toBuffer()`
- Used by the new client API route

---

## New: Client API Route (`app/api/documents/foh-menu/[eventId]/route.ts`)

```http
GET /api/documents/foh-menu/[eventId]
Auth: requireClient()
Returns: PDF inline, filename front-of-house-menu-YYYY-MM-DD.pdf
```

Follows the same pattern as `app/api/documents/receipt/[eventId]/route.ts`.

---

## New: Client Portal UI (`app/(client)/my-events/[id]/page.tsx`)

A "Printable Menu" card is shown on the client event detail page when:

- `event.menus.length > 0` (a menu is attached)
- `event.status` is `confirmed`, `in_progress`, or `completed`

The card has a "Download Menu PDF" link pointing to the new client route.

---

## Auto-Send on Confirmation (Unchanged)

When an event transitions `paid → confirmed`, the system automatically:

1. Generates the FOH menu PDF
2. Emails it (as a PDF attachment) to both the client and the chef via `sendFrontOfHouseMenuReadyEmail`

This was already wired correctly in `lib/events/transitions.ts:286-321`. No changes needed.

---

## Bug Fix: Date Parsing Across All Document Generators

All four document generators previously used `new Date(event_date)` to parse date-only strings from the database (e.g., `"2026-03-15"`). JavaScript's `Date` constructor treats bare date strings as **UTC midnight**, which in US time zones renders as the day before on the printed document.

**Fixed with `parseISO` from date-fns**, which treats date-only strings as **local midnight** — correct behavior regardless of server timezone.

| File                              | Change                                                   |
| --------------------------------- | -------------------------------------------------------- |
| `generate-front-of-house-menu.ts` | `format(parseISO(event.event_date), ...)`                |
| `generate-prep-sheet.ts`          | `format(parseISO(event.event_date), ...)`                |
| `generate-execution-sheet.ts`     | `format(parseISO(event.event_date), ...)`                |
| `generate-receipt.ts`             | `format(parseISO(data.event.event_date), ...)`           |
| `lib/email/notifications.ts`      | `parseISO(date).toLocaleDateString(...)` in `formatDate` |

The `notifications.ts` fix covers every transactional email (proposed, confirmed, reminder, cancelled, FOH menu ready, etc.) — they all pass `event_date` through `formatDate`.

Note: `generate-receipt.ts` line 168 (`new Date(entry.created_at)`) was intentionally left unchanged — `created_at` is a full `timestamptz` with a UTC offset, so `new Date()` handles it correctly.

---

## Verification

1. Confirm an event (paid → confirmed) → both client and chef receive email with PDF attached
2. As client: open `/my-events/[id]` for a confirmed event → "Printable Menu" card appears
3. Click "Download Menu PDF" → PDF opens with elegant serif layout
4. Print → looks like a restaurant table menu
5. As chef: `/api/documents/[eventId]?type=foh` still works with the same improved template

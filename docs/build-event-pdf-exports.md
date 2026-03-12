# Build: Event PDF Exports Enhancement (#32)

**Date:** 2026-03-12
**Branch:** `feature/risk-gap-closure`
**Roadmap Item:** #32 Event-Level PDF Exports (build order #20)

## What Changed

Added Guest Dietary Cards PDF to the existing operational document system. The other three PDFs requested in the roadmap (Event Proposal, Prep Sheet, Post-Event Summary) already existed.

### What Already Existed

| Requested PDF          | Existing File                             | Status                                        |
| ---------------------- | ----------------------------------------- | --------------------------------------------- |
| Event Proposal PDF     | `lib/documents/generate-quote.ts`         | Already built (client-facing, menu + pricing) |
| Prep Sheet PDF         | `lib/documents/generate-prep-sheet.ts`    | Already built (at-home prep guide)            |
| Post-Event Summary PDF | `lib/documents/generate-event-summary.ts` | Already built (lifecycle stage summary)       |
| Guest Dietary Card PDF | None                                      | New                                           |

Also existing: Execution Sheet, Front-of-House Menu, Grocery List, Packing List, Non-Negotiables Checklist, Post-Service Reset, Travel Route, Content Shot List (10 document types total).

### New Files

1. **`lib/documents/generate-dietary-cards.ts`** - Guest Dietary Cards PDF:
   - `fetchDietaryCardData(eventId)` - Queries event + event_guests, filters to guests with dietary restrictions or allergies only
   - `renderDietaryCards(pdf, data)` - Renders:
     - Header with event info (title, date, client, guest count)
     - Aggregate allergy/restriction summary at top (bold, high visibility)
     - Per-guest cards: name, RSVP status, allergies (bold), dietary restrictions, notes
     - Handles page overflow with continuation header
   - Follows same `fetch + render` pattern as all other document generators

### Modified Files

2. **`lib/documents/document-definitions.ts`** - Added `'dietary'` to `OPERATIONAL_DOCUMENT_TYPES` array and `DOCUMENT_DEFINITIONS` record. Category: core, not in core packet (since not all events have guest RSVP data).

3. **`app/api/documents/[eventId]/route.ts`** - Added `dietary` render config with import of `fetchDietaryCardData` and `renderDietaryCards`.

## Usage

```
GET /api/documents/{eventId}?type=dietary
```

Returns inline PDF with all guests who have dietary restrictions or allergies.

## Design Decisions

- **Only guests with dietary needs**: Guests with no restrictions/allergies are omitted to keep the document focused and printable.
- **Aggregate summary at top**: Allergies listed prominently so kitchen team can see all allergens at a glance before reading individual cards.
- **Not in core packet**: `isCorePacket: false` because not all events have RSVP guest data. The document only generates useful output when guests have been added with dietary info.
- **Same pattern**: Uses identical `PDFLayout` + `fetch/render` pattern as all 10 existing generators for consistency.

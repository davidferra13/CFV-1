# Inline PDF Viewer

**Branch:** `feature/packing-list-system`
**Date:** 2026-03-02

## What Changed

Previously every "View PDF" button in the Document Section opened a new browser tab. Chefs had no way to view a document while staying on the event or inquiry page, and inquiry pages showed no documents at all.

This change delivers:

1. **Inline PDF viewer modal** — clicking "View PDF" opens the document embedded in an iframe Dialog, right on the current page
2. **Print button in the modal** — triggers the browser's native print dialog for that PDF only
3. **↗ escape hatch** — small link next to each document still opens in a new tab
4. **Documents on inquiry pages** — when an inquiry has been converted to an event, the full DocumentSection now appears at the bottom of the inquiry detail page
5. **8-sheet document set** — Event Summary added as Sheet 1; all 8 docs accessible from any event or inquiry page

---

## The 8 Printed Sheets

| #   | Type        | Label                        | Always Available?                            |
| --- | ----------- | ---------------------------- | -------------------------------------------- |
| 1   | `summary`   | Event Summary                | ✅ Yes                                       |
| 2   | `grocery`   | Grocery List                 | When menu + dishes + components              |
| 3   | `foh`       | Front-of-House Menu          | When menu + dishes                           |
| 4   | `prep`      | Prep Sheet                   | When menu + dishes + components              |
| 5   | `execution` | Execution Sheet              | When menu + dishes + components + serve time |
| 6   | `checklist` | Non-Negotiables Checklist    | ✅ Yes                                       |
| 7   | `packing`   | Packing List                 | ✅ Yes                                       |
| 8   | `reset`     | Post-Service Reset Checklist | ✅ Yes                                       |

Documents are available as soon as the required data exists — never gated on event FSM state. The `?type=all` combined PDF generates all 8 pages.

---

## How the Iframe Approach Works

The document API (`/api/documents/[eventId]?type=X`) returns PDFs with `Content-Disposition: inline`. This tells browsers to render the PDF rather than download it.

Pointing an `<iframe>` at the API URL causes the browser's built-in PDF renderer to show the document inside the modal. **No external libraries needed.** Auth cookies pass automatically (same browser session → `requireChef()` works unchanged).

**Print:** `iframeRef.current?.contentWindow?.print()` scopes the print dialog to the iframe content — only the PDF prints, not the surrounding page.

---

## Files Changed

### New

- `components/documents/pdf-viewer-modal.tsx` — native `fixed inset-0` overlay with full-height `<iframe>`, print button, ↗ new tab link, Escape-to-close, body scroll lock

### Modified

- `components/documents/document-section.tsx` — shows all 8 sheets with readiness indicators; "View PDF" opens modal; ↗ escape hatch per row; `hasMenu` prop removed (no longer gates the section); `Print All (8 Sheets)` stays as new-tab link
- `app/(chef)/events/[id]/page.tsx` — `hasMenu` prop removed from `<DocumentSection>` call
- `app/(chef)/inquiries/[id]/page.tsx` — `DocumentSection` added; fetches `getDocumentReadiness(convertedEventId)` in parallel with `getEventPhotosForChef`
- `lib/documents/actions.ts` — `DocumentReadiness` type extended with `eventSummary` and `resetChecklist`

---

## Inquiry Page Behavior

Three states at the bottom of every inquiry page:

1. **Inquiry converted to event + readiness fetched** → Full 8-sheet DocumentSection
2. **Inquiry converted to event but fetch failed** → Placeholder with link to the event page
3. **Inquiry not yet converted** → Placeholder: "Documents available once this inquiry converts to a confirmed event"

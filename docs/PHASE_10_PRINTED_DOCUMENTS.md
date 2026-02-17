# Phase 10 — Printed Documents (The Three Sheets)

## What Changed

Phase 10 implements the chef's three operational printed documents — the actual working tools used during prep and service. Each document is generated as a PDF from event data and must fit on exactly **one US Letter page**.

### The Three Sheets

1. **Prep Sheet** — Used at home during cooking. Organized by course with AT HOME (make-ahead) and ON SITE (execution) sections. Gets food on it, gets destroyed after prep.

2. **Service Execution Sheet** — Clean document that goes to the client's house and gets taped to the counter. Top half shows the client-facing menu; bottom half shows the operational execution plan with component counts per course. **Dietary warnings are the most prominent element** — allergy flags are rendered in a bordered red warning box that's impossible to miss.

3. **Non-Negotiables Checklist** — Checked before walking out the door. Three sections: ALWAYS (permanent items), THIS EVENT (service-style-specific items), LEARNED (items forgotten 2+ times from AARs). Large checkboxes for wet/dirty hands.

### Files Created

| File | Purpose |
|------|---------|
| `lib/documents/pdf-layout.ts` | PDFLayout helper class wrapping jsPDF with position-tracked, one-page-aware API |
| `lib/documents/generate-prep-sheet.ts` | Prep sheet data fetching + PDF rendering |
| `lib/documents/generate-execution-sheet.ts` | Execution sheet data fetching + PDF rendering |
| `lib/documents/generate-checklist.ts` | Checklist data fetching + PDF rendering |
| `lib/documents/actions.ts` | Server action: `getDocumentReadiness()` for UI readiness checks |
| `app/api/documents/[eventId]/route.ts` | API route serving PDFs (GET with `?type=prep\|execution\|checklist\|all`) |
| `components/documents/document-section.tsx` | Client component showing readiness indicators + download/print buttons |

### Files Modified

| File | Change |
|------|--------|
| `app/(chef)/events/[id]/page.tsx` | Added DocumentSection component, document readiness fetching, menu check |
| `package.json` | Added `jspdf` dependency |

## Why These Decisions

### jsPDF over alternatives

- **Not puppeteer/playwright**: Too heavy for serverless, requires a headless browser
- **Not @react-pdf/renderer**: Native dependencies (yoga-layout) can cause issues on Windows and in serverless
- **jsPDF**: Pure JavaScript, zero native deps, works everywhere, gives complete control over the one-page constraint

### PDFLayout helper pattern

Rather than calling jsPDF directly in each generator, a `PDFLayout` class tracks the current Y position and provides semantic methods (`title()`, `sectionHeader()`, `bullet()`, `checkbox()`, `warningBox()`). This:
- Prevents Y-position tracking bugs
- Makes font scaling automatic (the `setFontScale()` method scales all elements proportionally when content is dense)
- Keeps each generator focused on data organization, not PDF coordinates

### Render functions separated from generate functions

Each document module exports both:
- `fetchXData(eventId)` — fetches and structures the data
- `renderX(pdf, data)` — writes to a PDFLayout instance
- `generateX(eventId)` — convenience that combines fetch + render

This separation enables the "Print All" combined PDF: the API route creates one PDFLayout, calls all three render functions across three pages, and returns a single 3-page document.

### Document readiness as a server action

`getDocumentReadiness()` uses `'use server'` because it returns serializable data (the readiness status object). The actual PDF generation happens in the API route because PDFs are binary data (non-serializable). This clean split means:
- The event detail page can check readiness at render time (server component)
- PDF generation happens on-demand when the user clicks a button (API route)

### Adaptive font scaling

Each generator estimates content density (component count, course count) and sets a font scale factor (0.65–1.0) that proportionally shrinks all elements. This is the key mechanism for enforcing the one-page constraint without cutting content.

## How It Connects

### Data Flow

```
Event → Menu → Dishes → Components
                                ↓
                    generate-prep-sheet.ts ──→ AT HOME / ON SITE sections
                    generate-execution-sheet.ts ──→ Clean menu + execution plan + dietary warnings
                    generate-checklist.ts ──→ Permanent + event-specific + learned items
                                ↓
                    PDFLayout → jsPDF → Buffer → API Route → Browser PDF viewer
```

### Integration Points

- **Menu hierarchy** (Phase 4): Dishes and components provide the content for prep and execution sheets
- **Checklist system** (Phase 9): `getChefChecklist(eventId)` provides permanent, event-specific, and learned items
- **AAR learning system** (Phase 9): Forgotten items frequency feeds the LEARNED section of the checklist
- **Event data** (Phase 3): Dietary restrictions, allergies, timing, location — all feed into the documents
- **Client data** (Phase 1): Client-level dietary restrictions and allergies merge with event-level data

### The `is_make_ahead` split

Components are split between the two sections of the prep sheet based on their `is_make_ahead` boolean:
- `is_make_ahead = true` → AT HOME section (prep before departure)
- `is_make_ahead = false` → ON SITE section (execute at client's house)

This same flag is used in the execution sheet to distinguish pre-made components (just plate/serve) from on-site execution tasks.

## Verification

- TypeScript: 0 errors (`npx tsc --noEmit`)
- Build: Clean (`npm run build`)
- API route registered: `/api/documents/[eventId]`
- Event detail page: DocumentSection renders with readiness indicators and PDF download buttons

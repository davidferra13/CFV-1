# Serving Labels Generator

Date: 2026-03-15

## What Changed

Added a new document type: **Serving Labels**. Generates a PDF with printable food container labels for event dishes/components.

## Files Added

- `lib/documents/generate-serving-labels.ts` - Server action + PDF generation logic
- `components/events/serving-labels-dialog.tsx` - Client-side dialog with label options

## Files Modified

- `app/api/documents/[eventId]/route.ts` - Added `labels` type handler (standalone, like `allergy-card`)
- `components/documents/document-section.tsx` - Added Serving Labels card with dialog trigger

## How It Works

1. Chef opens the event detail page, scrolls to the Documents section
2. A new "Serving Labels" card appears between Content Asset Capture Sheet and Business Documents
3. The card shows readiness status (same requirements as prep sheet: menu + dishes + components)
4. Clicking "Print Serving Labels" opens a dialog with options:
   - Label size: 2x3, 2x4, or 3x5 inches
   - Date prepared (defaults to today)
   - Shelf life in days (default 3, determines use-by date)
   - Toggle allergen warnings on/off
   - Toggle reheating instructions on/off
5. "Generate Labels" opens the PDF in a new tab via `/api/documents/[eventId]?type=labels&...`

## Label Contents

Each label includes:

- Component name (large, bold) with course name below
- Dietary badges (V, GF, DF, NF, etc.) in green rounded badges
- Allergen warnings in red ("CONTAINS: Dairy, Eggs, ...")
- Prepared date and use-by date
- Reheating instructions (from component execution_notes or recipe method first sentence)
- Footer: "For: [Client Name]" and "Prepared by [Chef Business Name]"
- Cut marks at corners for easy cutting

## Data Sources

- Allergens: `get_recipe_allergen_flags` DB function + dish-level `allergen_flags`
- Dietary tags: recipe `dietary_tags` + dish-level `dietary_tags` (merged, deduplicated)
- Reheating: component `execution_notes` (primary) or recipe `method` first sentence (fallback)
- Chef branding: `chefs.business_name`
- Client name: `clients.full_name` via event FK

## Grid Layout

Labels are laid out in a grid on US Letter paper (8.5" x 11"):

- 2x3": 2 columns x 5 rows = 10 labels per page
- 2x4": 1 column x 5 rows = 5 labels per page
- 3x5": 1 column x 3 rows = 3 labels per page

Multiple pages generated automatically when needed.

## Architecture Notes

- The labels generator uses jsPDF directly (not PDFLayout) because the grid layout is fundamentally different from the single-page document pattern
- Handled in the API route as a standalone type (like `allergy-card`) since it has custom query parameters and does not participate in the snapshot/archive pipeline
- No new database tables or migrations required
- All deterministic (no AI involved)

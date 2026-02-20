# Event Summary Document — Implementation Notes

## What Was Built

A new **Event Summary** PDF generator (`DOC-EVENT-SUMMARY`) that produces a single-page reorientation document for any dinner event at any lifecycle stage. This is the "index document" — it answers "where am I with this dinner?" at a glance, consolidating client, location, dietary alerts, financial status, lifecycle stage, history log, and menu into one page.

Added as the 8th document in the printed sheets system. It is the **first page** in the Print All combined PDF because it orients the chef before they look at anything else.

---

## Files Changed

| File | Change |
|---|---|
| `lib/documents/generate-event-summary.ts` | **New** — full generator following the 3-function pattern |
| `lib/documents/actions.ts` | Added `eventSummary` to `DocumentReadiness` type and return values |
| `app/api/documents/[eventId]/route.ts` | Added `'summary'` case; Event Summary is now page 1 of `'all'` |
| `components/documents/document-section.tsx` | Event Summary added as first entry; updated count to 8 Sheets |

---

## Architecture

Follows the established **3-function pattern** used by all document generators:

```
fetchEventSummaryData(eventId) → EventSummaryData | null
renderEventSummary(pdf, data) → void
generateEventSummary(eventId) → Buffer
```

### Two-Column Layout

PDFLayout renders in a single-column flow. For the two-column info section (CLIENT/LOCATION/TIMING on the left, FINANCIAL/STATUS/HISTORY on the right), I used `pdf.doc` (the underlying jsPDF instance, which is a public property on `PDFLayout`) directly with explicit X/Y coordinates. Column geometry:

- Left column: x=12mm, width=91.5mm
- Right column: x=121.5mm, width=91.5mm
- Gap: 9mm

After both columns finish rendering, `pdf.y` is advanced to `max(leftY, rightY) + 3` before resuming normal PDFLayout methods for the divider, menu section, and footer.

Column helpers (`colSectionHeader`, `colKeyValue`, `colText`, `colHistoryEntry`) are file-local functions — not exported, not part of `PDFLayout`. This avoids modifying the shared utility.

### Data Sources

All data lives in existing tables — **no migration required**.

| Spec Reference | Actual Column | Table |
|---|---|---|
| Client name | `clients.full_name` | clients |
| "Goes by" nickname | `clients.preferred_name` | clients |
| Relationship notes | `clients.vibe_notes` + `clients.family_notes` + `clients.what_they_care_about` (combined with ` | `) | clients |
| Location address | `events.location_address/city/state/zip` | events |
| Access instructions | `events.access_instructions` | events |
| Kitchen notes | `events.kitchen_notes` | events |
| House rules | `clients.house_rules` | clients |
| Payment total | `events.quoted_price_cents` (+ `events.pricing_model` for per_person vs flat_rate) | events |
| Payment status | `events.payment_status` (computed by trigger from ledger) | events |
| Lifecycle history | `event_state_transitions` table | event_state_transitions |
| Per-guest dietary | `event_guests.notes`, `event_guests.allergies`, `event_guests.dietary_restrictions` | event_guests |
| Financial detail | `ledger_entries` | ledger_entries |
| Menu | `menus` → `dishes` → `components` | menus, dishes, components |

### Readiness

Event Summary is **always ready** — it adapts to whatever data is present:
- No menu → shows "Menu not yet confirmed for this event." in the menu section
- No timing → timing section omitted (empty fields never render)
- No financial data → shows "Not yet invoiced"

This is consistent with the Checklist and Packing List, which are also always ready.

### Font Scaling

- `totalComponentCount > 15` → `setFontScale(0.88)`
- `totalComponentCount > 25` → `setFontScale(0.78)`
- Applies before rendering so all elements scale proportionally

### Allergy / Dietary Alert Bar

Merges allergies from three sources: event-level, client-level, and all event guests. If any allergies or dietary restrictions exist across any source, the red alert bar renders. This ensures the chef sees every flag regardless of where it was entered.

---

## Known V1 Limitations

**No per-component, per-guest dietary flags.** The spec describes entries like:
```
5. Crunchy topping (almonds, parsley)  ** NO CAPERS ON MURR'S PLATE **
```
This would require either:
- A `dietary_modification_notes` column on the `components` table, or
- Cross-referencing ingredient allergen flags against guest allergies at the component level

Neither exists in the current schema. V1 shows **dish-level allergen flags** on the course header (the same pattern as the Execution Sheet), which still surfaces the conflict clearly — just not at individual component granularity.

A future migration could add `dietary_modification_notes TEXT` to `components`, letting the chef attach per-guest notes to specific components during menu planning.

---

## Connection to Other Documents

The Event Summary is the **index document** in the 8-sheet print set. Print order in `?type=all`:

1. **Event Summary** (this document) — who, where, dietary, money, lifecycle, history
2. **Grocery List** — what to buy and where
3. **Front-of-House Menu** — table card for guests
4. **Prep Sheet** — at-home prep by course
5. **Execution Sheet** — on-site execution plan
6. **Non-Negotiables Checklist** — door check before leaving
7. **Packing List** — car loading by transport zone
8. **Post-Service Reset Checklist** — night-of close-out

The chef grabs this stack. Page 1 tells them everything about the dinner before they dig into the working documents.

---

## Testing Checklist

- [ ] Navigate to any event → Documents section → "Event Summary" shows as first entry, "Ready"
- [ ] Click "View PDF" → modal opens with one-page PDF
- [ ] Verify: header bar (dark background, date, stage label)
- [ ] Verify: allergy bar appears in red if client has allergies
- [ ] Verify: two-column layout — CLIENT/LOCATION/TIMING left, FINANCIAL/STATUS/HISTORY right
- [ ] Verify: history entries show state transitions with timestamps
- [ ] Verify: menu section shows FOH descriptions + BOH component breakdown
- [ ] Test with no menu → menu section shows placeholder message, rest of doc still renders
- [ ] Click "Print All (8 Sheets)" → Event Summary is page 1
- [ ] Test with a dense menu (>15 components) → doc still fits one page (font scaling)

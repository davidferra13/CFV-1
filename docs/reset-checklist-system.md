# Post-Service Reset Checklist — Implementation Notes

## Document: DOC-RESET-CHECKLIST

## Spec: Provided February 19, 2026

## Branch: feature/packing-list-system

---

## What Was Built

The Post-Service Reset Checklist is Printed Sheet #7 — the last document in the ChefFlow operational system. It is a one-page punch list covering everything required to return the chef's home, equipment, vehicle, and records to clean baseline state after a service.

The immediate motivation: two consecutive dinners (February 14–15, 2026) never reached terminal state. A cooler sat full on the deck for 48+ hours. This document is the gate.

---

## Files Changed

| File                                        | Change                                                                                                  |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| `lib/documents/generate-reset-checklist.ts` | **New.** Generator with data fetcher, renderer, and entry point.                                        |
| `app/api/documents/[eventId]/route.ts`      | Added `reset` case to switch. Added reset as Page 7 in `all` bundle. Updated error message and comment. |
| `lib/documents/actions.ts`                  | Added `resetChecklist` to `DocumentReadiness` type and both return sites.                               |
| `components/documents/document-section.tsx` | Added reset checklist row to docs list. Updated sheet count from 6 → 7.                                 |

---

## No Migration Required

The spec defines four closure flags as prerequisites for terminal state:

```
reset_complete     BOOLEAN DEFAULT FALSE
followup_sent      BOOLEAN DEFAULT FALSE
aar_filed          BOOLEAN DEFAULT FALSE
financial_closed   BOOLEAN DEFAULT FALSE
```

All four already exist on the `events` table, added in `20260215000003_layer_3_events_quotes_financials.sql` under the name conventions: `reset_complete`, `follow_up_sent`, `aar_filed`, `financially_closed`.

The existing `getEventClosureStatus()` action in `lib/events/actions.ts` already reads and writes these flags. The Post-Event Closure card on the event detail page already surfaces them with check/cross indicators.

---

## Document Structure

### Sections (in order)

1. **Dark header bar** — "POST-SERVICE RESET" left, event date + client name right (white on #1a1a1a)
2. **Urgency notice** — red text, sets the deadline expectation immediately
3. **A — Bring Everything Inside** — car clearance first
4. **B — Cooler + Cold Storage** — the most common failure point
5. **C — Equipment + Tools** — bags, tools, specialty items
6. **D — Dishes + Laundry** — cycle must be _started_, not just loaded
7. **E — Financial + Records** — payment, receipts, tip
8. **F — Next Day (by noon)** — labeled with extended deadline; italic parenthetical in header
9. **Compounding Warning Box** — orange-bordered, always renders
10. **Footer** — client name + date, centered

### Dynamic Elements

| Element                               | Logic                                                                                                                             |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| Specialty equipment rows (A + C)      | Derived from `service_style` + `special_requests` keywords: sous vide, ice cream, grill, cocktail, stand mixer                    |
| Payment item in Section E             | If `events.payment_status = 'paid'`, item renders with a pre-checked green checkmark and the amount. Otherwise shows action text. |
| Specialty equipment parenthetical (C) | If triggers fired, lists the actual items. If none, shows a generic hint.                                                         |
| Compounding warning                   | Always renders — not conditional on next-event detection (Phase 3 enhancement)                                                    |

---

## PDF Implementation Notes

The renderer bypasses `PDFLayout`'s high-level methods in three places:

1. **Dark header bar** — uses `pdf.doc.setFillColor()` + `pdf.doc.rect('F')` + white text directly, since PDFLayout has no colored-background header primitive.
2. **Gray section bars** — same pattern with `setFillColor(240, 240, 240)` for each section's header row.
3. **Orange compounding warning** — uses `roundedRect('FD')` with `setFillColor(255, 248, 240)` + `setDrawColor(204, 102, 0)`. The `pdf.doc` property is public on `PDFLayout` for exactly this reason.

The pre-checked payment item draws the checkbox square normally and then overlays a `✓` in green (`setTextColor(0, 130, 0)`).

---

## API Route

The `reset` document type is available at:

```
GET /api/documents/{eventId}?type=reset
```

It is also included as Page 7 in the `all` bundle:

```
GET /api/documents/{eventId}?type=all  →  7-page PDF
```

The reset checklist is always marked `ready: true` in `DocumentReadiness` — it requires only the event record (event date + client name), which always exists.

---

## How It Connects to Terminal State

The checklist is a physical representation of the four closure flags. The digital confirmation happens separately via:

- **"Reset Complete" toggle** in `EventClosureActions` component → sets `reset_complete = true`
- **"Follow-Up Sent" toggle** → sets `follow_up_sent = true`
- **AAR form** → sets `aar_filed = true` on submit
- **Financial closed** → set when all ledger entries are reconciled

These flags are checked by `getEventClosureStatus()` and displayed in the Post-Event Closure card on the event detail page. An event cannot transition to its terminal closed state until all four are true.

---

## What the Spec Deferred to Phase 3

- **Compounding escalation**: If another event is within 48 hours, the warning box could escalate to red with specific text naming the next client. The current implementation always renders the static warning.
- **Learning system**: If the chef consistently skips a specific item, surface the pattern in the daily briefing. Equivalent to the Non-Negotiables learning system.
- **Custom reset items**: AAR learnings that add permanent items to the checklist (e.g., "wipe down car seats after cooler transport").

These are not built. The V1 is a static checklist with the dynamic equipment and payment elements.

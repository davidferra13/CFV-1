# Waste Capture in Close-Out Wizard

> Implemented 2026-03-26. Added "Leftovers" step to the post-event close-out flow.

## Problem

Chefs had no quick, in-the-moment way to log food waste right after an event. The waste tracking page existed (`/inventory/waste`) but required navigating there separately. By the time a chef remembered, the details were fuzzy.

## Solution

Added a "Leftovers" step (step 5 of 6) to the close-out wizard, between "Reflection" and "Close Out." The chef can quickly log wasted items while still cleaning up.

## How It Works

1. Chef reaches the Leftovers step after filing their AAR reflection
2. They can add one or more waste items with:
   - **Item name** (free text, e.g. "salmon", "risotto")
   - **Category** picker (protein, produce, dairy, grain, prepared dish, other)
   - **Reason** picker (made too much, spoiled, guest no-show, dietary change, quality issue, other)
   - **Estimated cost** (optional, dollars)
3. Each item saves to `event_waste_logs` via `addWasteEntry()`
4. Chef can skip the step entirely if nothing was wasted
5. Items can be removed before saving

## UI Details

- Starts empty with "Add a waste item" link
- Each row shows inline category/reason selects and cost input
- Saved rows turn green with a "Saved" indicator
- "Nothing wasted - skip" button shown when no rows exist
- "Save & Continue" saves all unsaved rows, then advances

## Step Order (6 steps total)

1. Tip
2. Receipts
3. Mileage
4. Reflection (AAR)
5. **Leftovers** (NEW)
6. Close Out

## Files Modified

- `components/events/close-out-wizard.tsx` - Added WasteStep component, updated STEPS array and routing
- `lib/events/waste-tracking-actions.ts` - Existing (no changes, provides `addWasteEntry`)

## Data Flow

Waste entries logged here feed into:

- `getEventWaste(eventId)` for per-event waste view
- `getWasteSummary()` for aggregate analytics
- `getWasteInsights()` for deterministic waste reduction recommendations

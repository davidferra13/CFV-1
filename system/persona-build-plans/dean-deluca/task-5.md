# Build Task: Unit of Measure Flexibility:
**Source Persona:** dean-deluca
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build
Implement unit of measure flexibility in the beta-surveys/[id]/results-client.tsx component. Allow users to select and use different units of measurement for inputting and displaying survey responses.

## Files to Modify
- `app/(admin)/admin/beta-surveys/[id]/results-client.tsx` -- Add a dropdown menu to select unit of measure, update the UI to display measurements in selected format.

## Files to Create (if any)
No new files needed for this task.

## Implementation Notes
- Use a predefined list of units of measurement (e.g., grams, kilograms, liters, milliliters).
- Update state and props to include selected unit of measure.
- Convert values from the database to the user's chosen unit before displaying them in the UI.
- Handle edge case where no unit is selected by defaulting to a standard unit like grams or milliliters.

## Acceptance Criteria
1. A dropdown menu appears allowing users to select their preferred unit of measurement (e.g., grams, kilograms, liters, milliliters).
2. Selecting a new unit updates the displayed values throughout the component.
3. If no unit is selected, default to displaying measurements in grams or milliliters.
4. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT
- Modify any files outside of `app/(admin)/admin/beta-surveys/[id]/results-client.tsx`.
- Add new npm dependencies.
- Change the database schema.
- Delete existing functionality.
- Use em dashes anywhere.
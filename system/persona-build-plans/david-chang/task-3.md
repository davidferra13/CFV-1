# Build Task: Report confidence unavailable

**Source Persona:** david-chang
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a feature to display the confidence level of the model response in the Admin Financials page. This will help administrators quickly assess the reliability and usefulness of the provided information.

## Files to Modify

- `app/(admin)/admin/financials/page.tsx` -- Update the existing code to fetch and display the confidence score along with the financial data.

## Implementation Notes

- Integrate a new API endpoint or database field that returns the model's confidence in its response.
- Display the confidence score prominently next to the financial overview, using appropriate color-coding or icons to highlight low vs high confidence levels.
- Ensure that the confidence score is updated in real-time as the user interacts with the page.

## Acceptance Criteria

1. The Admin Financials page now shows a confidence score for the platform GMV overview, clearly indicating whether the displayed data can be trusted or not.
2. The confidence score updates dynamically as the user navigates through different sections of the financial data on the page.
3. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the added functionality.

## DO NOT

- Modify the existing error handling code in the AdminError component or other unrelated files.
- Add new npm dependencies or change the project's existing dependency versions.
- Alter the database schema or make changes that would affect the application's existing functionality outside of the specified gap.

<!-- REJECTED: 2/3 referenced files missing -->
<!-- 2026-04-28T01:05:56.447Z -->

# Build Task: User Interface:
**Source Persona:** dean-deluca
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build
Improve the user interface for the Admin Cannabis Portal Management page, making it more intuitive and user-friendly. This includes updating the styling, adding helpful tooltips, and ensuring proper loading states are displayed.

## Files to Modify
- `app/(admin)/admin/cannabis/page.tsx` -- Update the overall layout and styling of the page.
- `app/(admin)/admin/cannabis/admin-cannabis-client.tsx` -- Enhance the user interface for managing cannabis users and pending invites.

## Implementation Notes
- Use Tailwind CSS classes to improve the visual appeal and consistency of the UI components.
- Implement React's useState hook to manage loading states and error handling.
- Add tooltips using a tooltip component or library to provide guidance on each action.

## Acceptance Criteria
1. The Admin Cannabis Portal Management page has an updated, modern-looking design that aligns with the overall ChefFlow style.
2. All UI components in `admin-cannabis-client.tsx` have clear labels and tooltips for better user understanding.
3. Proper loading states are displayed when fetching data from the server, improving user experience during network delays or errors.
4. The updated code passes TypeScript type checking without any errors.

## DO NOT
- Modify the underlying database schema or API calls in `lib/admin/cannabis-actions.ts`.
- Change the logic for handling approve and reject actions in `admin-cannabis-client.tsx`.
- Add new npm dependencies or external libraries not related to improving the UI.
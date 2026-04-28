# Build Task: Project Management/Workflow:

**Source Persona:** andrew-zimmern
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Implement a project management and workflow system within Chef's platform, allowing Andrew Zimmern to easily manage his consulting projects from start to finish. This will include features for quoting, scheduling, task tracking, and invoicing.

## Files to Modify

- `app/(chef)/consulting/pricing-calculator.tsx` -- Add a section for project management workflow after the pricing calculator.
- `app/(chef)/quotes/new-quote.tsx` -- Integrate project management features into the new quote form.
- `app/(chef)/quotes/quote-details.tsx` -- Update to display project management details alongside quote information.

## Files to Create (if any)

- `app/(chef)/consulting/project-management-header.tsx` -- A reusable header component for project management pages.
- `app/(chef)/consulting/project-management-sidebar.tsx` -- A sidebar navigation component for accessing different aspects of the project management system.

## Implementation Notes

- Use React hooks to manage state for each project management feature (e.g., task tracking, scheduling).
- Ensure that the new components integrate seamlessly with Chef's existing design system.
- Implement proper validation and error handling for all user inputs related to project management.

## Acceptance Criteria

1. Andrew Zimmern can create a new consulting project, inputting basic details like client name, event name, service date, etc.
2. Within the pricing calculator, there is an option to save the calculated quote as part of a new or existing consulting project.
3. Each consulting project has its own task list where tasks can be added, assigned due dates, and marked as complete.
4. The system sends reminders for upcoming events tied to each consulting project.
5. Invoicing can be generated directly from the project management interface once service is completed.

## DO NOT

- Modify files not listed above (e.g., `app/(chef)/commerce`).
- Add new npm dependencies unrelated to project management.
- Change database schema outside of what's necessary for implementing project management features.
- Delete existing functionality related to consulting or quoting.

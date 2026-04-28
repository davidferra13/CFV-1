<!-- REJECTED: all 1 referenced files are missing -->
<!-- 2026-04-28T00:22:21.568Z -->

# Build Task: Implement a "Critical Dependency Map":
**Source Persona:** miley-cyrus
**Gap Number:** 1 of 5
**Severity:** HIGH

## What to Build
Create a new page `/api/dependencies` that lists all critical dependencies used across the ChefFlow application. This will provide an overview of third-party libraries and services that are essential for the app's functionality.

## Files to Modify
- `app/(chef)/schedule/page.tsx` -- Add a link to the new /api/dependencies page in the footer.
- `app/api/integrations/[provider]/callback/route.ts` -- Reference critical dependencies used in this file.
- `app/api/integrations/[provider]/connect/route.ts` -- Reference critical dependencies used in this file.

## Files to Create (if any)
- `app/pages/dependencies/index.tsx` -- New page listing all critical dependencies.

## Implementation Notes
- Use Drizzle ORM to query and display the list of critical dependencies from a dedicated database table.
- Ensure the new /api/dependencies page is accessible only to authenticated users with sufficient permissions.
- Handle edge cases where a dependency might be used in multiple files or modules across the codebase.

## Acceptance Criteria
1. The `/api/dependencies` page accurately lists all critical third-party dependencies used in the ChefFlow application.
2. Each entry includes the library name, version, and a brief description of its purpose.
3. The new page is accessible only to authenticated users with the "admin" role.
4. Adding or removing a dependency from the codebase automatically updates the /api/dependencies page.
5. `npx tsc --noEmit --skipLibCheck` passes without errors.

## DO NOT
- Modify existing functionality in files not directly related to this task.
- Add new npm dependencies without prior approval.
- Change the database schema unrelated to displaying critical dependencies.
- Delete any existing code or comments relevant to this build task.
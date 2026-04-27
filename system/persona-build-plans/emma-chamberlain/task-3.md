# Build Task: Friction in Special Needs:

**Source Persona:** Emma Chamberlain
**Gap Number:** 3 of 5
**Severity:** MEDIUM

## What to Build

Implement a caching mechanism for frequently accessed data in the NewInquiryPage component to reduce operational friction during the inquiry logging process.

## Files to Modify

- `app/(chef)/inquiries/new/page.tsx` -- Cache client and partner data to avoid repeated database calls on each page load.

## Implementation Notes

- Utilize a simple in-memory object store to cache data fetched from the server.
- Implement caching logic before making any database requests, checking the cache first.
- Set an appropriate expiration time for cached data (e.g., 5 minutes) to ensure data remains fresh without excessive reloading.

## Acceptance Criteria

1. The NewInquiryPage component now displays the inquiry form with pre-filled client and partner data from the cache on subsequent page loads, reducing the need for repeated database queries.
2. Cached data is refreshed after a specified expiration time (e.g., 5 minutes) to ensure data accuracy.
3. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the caching implementation.

## DO NOT

- Modify other components or files not directly related to the NewInquiryPage component and its data fetching process.
- Introduce new npm dependencies or change existing project structure.
- Alter the database schema or modify existing functionality in unrelated parts of the application.

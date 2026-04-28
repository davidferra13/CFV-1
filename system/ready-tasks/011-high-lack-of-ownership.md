---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/emma-chamberlain/task-2.md'
source_persona: 'emma-chamberlain'
exported_at: '2026-04-28T00:16:46.989Z'
---

# Build Task: Lack of Ownership:

**Source Persona:** emma-chamberlain
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Implement a claim ownership feature for marketplace chefs to officially verify their listings on public pages, enabling ChefFlow to accurately track and manage the business behind bookings.

## Files to Modify

- `app/(public)/marketplace-chefs/page.tsx` -- Add a "Claim Ownership" button that redirects to the `/discover/[slug]/claim` page with the listingId parameter.
- `app/(public)/discover/[slug]/page.tsx` -- Update the "Claim Removal Request" section to include a new "Claim Ownership" form with fields for name and email.

## Files to Create (if any)

- `app/(public)/discover/[slug]/_components/claim-add-section.tsx` -- A new component that handles the submission of ownership claims, interacts with Drizzle ORM to update the database, and redirects or updates the page accordingly.
- `app/(api)/discover/[slug]/handlers/claimOwnershipHandler.ts` -- An API handler for processing the ownership claim request, including validation checks.

## Implementation Notes

- Ensure proper error handling and user feedback for failed claims or invalid inputs.
- Use Next.js's `useTransition` hook to allow users to navigate away from the claiming page while the request is being processed.
- Implement client-side form validation before sending the request to the server.

## Acceptance Criteria

1. Marketplace chefs can click a "Claim Ownership" button on their listings' public pages, redirecting them to a claim form pre-filled with the listing ID.
2. The claim ownership form requires chef's name and email for verification.
3. Upon successful submission, users are notified that their claim has been received and the page updates to reflect the claimed status.
4. If an error occurs during the claiming process, users are provided with appropriate feedback and can retry the claim.
5. `npx tsc --noEmit --skipLibCheck` passes without any new build errors related to this feature.

## DO NOT

- Modify files not directly related to implementing the ownership claim feature.
- Add new npm dependencies specific to this feature.
- Change database schema unrelated to storing claimed status for marketplace listings.

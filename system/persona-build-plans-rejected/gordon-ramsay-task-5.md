<!-- REJECTED: out-of-scope: matches /\bbeta\s+survey\b/i -->
<!-- 2026-04-28T01:02:44.968Z -->

# Build Task: Data model gap
**Source Persona:** gordon-ramsay
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build
Add a new "Beta Surveys" section in the admin dashboard to track and manage beta survey definitions, responses, invites, and CSV exports for each individual survey.

## Files to Modify
- `app/(admin)/admin/beta-surveys/page.tsx` -- Update existing page to include links to new Beta Surveys section.
- `app/(admin)/admin/beta-surveys/[id]/page.tsx` -- Refactor existing survey detail page to use the new "SurveyResultsClient" component.

## Files to Create (if any)
- `app/(admin)/admin/beta-surveys/survey-list/page.tsx` -- New page listing all beta survey definitions.
- `app/(admin)/admin/beta-surveys/[id]/survey-results-client.tsx` -- New client-side component for displaying aggregated stats, response table, invite management, and CSV export options.

## Implementation Notes
- Use Drizzle ORM to interact with the PostgreSQL database for fetching survey data and performing CRUD operations.
- Implement proper error handling and loading states throughout the new components.
- Ensure that the new sections are responsive and follow Tailwind CSS utility classes for styling.

## Acceptance Criteria
1. The "Beta Surveys" section in the admin dashboard allows creating, updating, and deleting beta survey definitions.
2. Each individual survey detail page displays aggregated stats (responses, completion rate), a table of all responses, invite management options, and CSV export links.
3. Navigating to an individual survey's page from the list redirects to the new "SurveyResultsClient" component.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors.

## DO NOT
- Modify existing functionality in the admin analytics, beta onboarding, or beta signups sections.
- Add new npm dependencies not related to the "Beta Surveys" section implementation.
- Change the database schema for entities unrelated to beta surveys.
<!-- AUTO-ARCHIVED: all 3 file refs invalid. 2026-04-27T18:28:57.618Z -->

# Build Task: Data model gap

**Source Persona:** oprah-winfrey
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build

Implement a new "Beta Surveys" data model and API endpoints in ChefFlow to support the admin beta surveys feature. This will involve creating a new table in the PostgreSQL database and updating relevant files to interact with this new data model.

## Files to Modify

- `app/(admin)/admin/beta-surveys/[id]/page.tsx` -- Update existing page component to fetch and display survey details, results, invites from the new "Beta Surveys" API endpoints.
- `app/(admin)/admin/beta-surveys/page.tsx` -- Update existing page component to list all beta surveys and their summary stats using the new "Beta Surveys" API.

## Files to Create (if any)

- `server/api/admin/betaSurveys.js` -- New API endpoint file to handle CRUD operations for beta survey definitions.
- `server/api/admin/betaSurveyResults.js` -- New API endpoint file to fetch aggregated results and stats for a specific beta survey.
- `server/api/admin/betaSurveyInvites.js` -- New API endpoint file to manage invites (create, update) for a specific beta survey.

## Implementation Notes

- Use Drizzle ORM to interact with the new "Beta Surveys" database table in all relevant files.
- Ensure proper error handling and loading states are implemented in the updated UI components.
- Follow RESTful API conventions when creating the new admin API endpoints.

## Acceptance Criteria

1. New "Beta Surveys" data model is created in the PostgreSQL database with appropriate fields and relationships.
2. The `/admin/beta-surveys` page lists all beta surveys, displaying their title, description, status (active/inactive), type, number of submitted responses, total started responses, and number of questions.
3. Clicking on a survey from the list navigates to its detailed view at `/admin/beta-surveys/[id]`.
4. The detailed view for a beta survey shows the survey title, description, status, type, creator details, date created, number of submitted responses, total started responses, and a table displaying all questions.
5. The detailed view also displays aggregated stats summary (responses, completion rate, NPS score) and a list of invites with options to create new invites or edit existing ones.
6. Creating a new beta survey through the admin API requires providing a title, description, status, type, creator details, date created, and an array of questions.
7. Updating an existing beta survey through the admin API allows modifying its title, description, status, type, and questions.
8. Fetching aggregated results for a specific beta survey through the admin API returns the number of submitted responses, total started responses, completion rate, and NPS score.
9. Creating a new invite for a specific beta survey through the admin API requires providing an email address and optionally specifying a custom message.
10. Updating an existing invite for a specific beta survey through the admin API allows modifying its email address, custom message, and status.

## DO NOT

- Modify any files not specifically mentioned in the "Files to Modify" section.
- Add new npm dependencies that are not required for this specific feature implementation.
- Change the existing database schema or introduce breaking changes to existing functionality.

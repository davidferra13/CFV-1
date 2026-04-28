---
status: ready
priority: 'high'
score: 38
ref_accuracy: 50
source_plan: 'system/persona-build-plans/gail-simmons/task-2.md'
source_persona: 'gail-simmons'
exported_at: '2026-04-28T00:16:46.991Z'
---

# Build Task: Data model gap

**Source Persona:** gail-simmons
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Create a new "SurveyResponses" table in the database to store individual survey response data. Update the Admin Beta Surveys page and detail view to fetch and display this data.

## Files to Modify

- `app/(admin)/admin/beta-surveys/page.tsx` -- Add code to create the "SurveyResponses" table using Drizzle ORM.
- `app/(admin)/admin/beta-surveys/[id]/page.tsx` -- Update the page to fetch and display individual survey responses from the new "SurveyResponses" table.

## Files to Create (if any)

- `app/(admin)/admin/beta-surveys/lib/survey-responses.ts` -- New file containing helper functions for working with the "SurveyResponses" table.

## Implementation Notes

- Use Drizzle ORM's `createTable` method to create the new "SurveyResponses" table.
- Define appropriate columns in the "SurveyResponses" table, such as survey_id (foreign key), user_id (foreign key), created_at, etc.
- In the Admin Beta Surveys page and detail view, use Drizzle ORM's methods like `createTable` and `insert` to fetch and save individual survey responses.
- Handle loading states and error cases gracefully in both pages.

## Acceptance Criteria

1. A new "SurveyResponses" table is created in the database using Drizzle ORM.
2. The Admin Beta Surveys page displays a summary of all surveys, including total submitted responses and total started responses.
3. The Admin Beta Survey Detail page fetches individual survey responses from the "SurveyResponses" table and displays them in a table format.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors.

## DO NOT

- Modify existing functionality unrelated to this gap
- Add new npm dependencies not mentioned above

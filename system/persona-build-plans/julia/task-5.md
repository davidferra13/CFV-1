# Build Task: Data model gap
**Source Persona:** julia
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build
Add a new "SurveyResponses" table in the database to store individual survey response data, and update the Admin Beta Surveys page to fetch and display this data.

## Files to Modify
- `app/(admin)/admin/beta/page.tsx` -- Update the page component to use the new SurveyResponses table for fetching signups

## Files to Create (if any)
- `app/(admin)/admin/db-utils/survey-responses.ts` -- New file containing database functions for interacting with the SurveyResponses table

## Implementation Notes
- Use Drizzle ORM to define and interact with the SurveyResponses table schema
- Ensure proper error handling and loading states are implemented in the Admin Beta Surveys page component

## Acceptance Criteria
1. A new "SurveyResponses" table exists in the database, with columns for survey_id, user_id, response_data, created_at
2. The Admin Beta Surveys page fetches and displays individual survey responses from the SurveyResponses table
3. Error handling is implemented for failed API calls or database queries
4. Loading states are shown while fetching data from the SurveyResponses table
5. `npx tsc --noEmit --skipLibCheck` passes without errors in both the updated Admin Beta Surveys page and the new survey-responses.ts file

## DO NOT
- Modify any files outside of the specified admin pages or db-utils folder
- Add new npm dependencies not related to the SurveyResponses table or its display
- Change existing database schema for tables other than SurveyResponses
- Remove functionality for fetching and displaying beta signups, only add survey response data
- Use em dashes anywhere in the code
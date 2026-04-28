<!-- REJECTED: out-of-scope: matches /\bbeta\s+survey\b/i -->
<!-- 2026-04-28T00:38:40.231Z -->

# Build Task: Data model gap

**Source Persona:** miley-cyrus
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build

Implement a new "SurveyResponses" data model in the Drizzle ORM to store individual survey response data for beta surveys. This will allow us to track and analyze responses at a granular level.

## Files to Modify

- `app/(admin)/lib/beta-survey/actions.ts` -- Add a function to create a SurveyResponse record when a new response is submitted.
- `app/(admin)/lib/db/admin.ts` -- Update the admin client creation logic to include the "survey_responses" table schema if it doesn't already exist.

## Files to Create (if any)

- `app/(admin)/lib/beta-survey/survey-response.model.ts` -- Define the SurveyResponse data model using Drizzle ORM.
- `app/(admin)/components/admin/beta-surveys-table.tsx` -- Add a new column showing the number of responses per beta survey in the existing BetaSignupsTable component.

## Implementation Notes

- Use the Drizzle ORM "createModel" function to define the SurveyResponse data model, specifying the table name and fields.
- Ensure proper foreign key relationships between the survey_response and beta_survey_definitions tables.
- Optimize database queries for rendering the BetaSurveysListActions and BetaSignupsTable components efficiently.

## Acceptance Criteria

1. The new "SurveyResponses" data model is successfully created using Drizzle ORM, with appropriate schema definition in the admin client setup.
2. A new function in the beta-survey actions module creates a SurveyResponse record whenever a new response is submitted via the frontend.
3. The BetaSurveysListActions component accurately displays the number of responses for each survey using data from the "SurveyResponses" table.
4. `npx tsc --noEmit --skipLibCheck` passes without any new type errors related to the SurveyResponse model or its usage.

## DO NOT

- Modify existing functionality in components like AdminBetaSurveysPage, AdminBetaSurveyDetailPage, or BetaOnboardingAdmin that are not directly involved in implementing this gap.
- Add new npm dependencies unrelated to the "SurveyResponses" data model and its integration with the existing beta survey system.

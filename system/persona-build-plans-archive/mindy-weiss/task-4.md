<!-- AUTO-ARCHIVED: all 3 file refs invalid. 2026-04-27T18:28:57.616Z -->

# Build Task: Data model gap

**Source Persona:** mindy-weiss
**Gap Number:** 4 of 5
**Severity:** MEDIUM

## What to Build

Implement a new "Survey" data model in the ChefFlow database to store survey definitions, responses, and related metadata. Update the Drizzle ORM configuration to include this new model.

## Files to Modify

- `app/(admin)/admin/beta-surveys/page.tsx` -- Replace hard-coded survey data with queries from the new Survey model.
- `app/(admin)/admin/beta-surveys/[id]/page.tsx` -- Update this page to use the Survey and SurveyResponse models for fetching and displaying individual survey details.

## Files to Create (if any)

- `lib/survey/model.ts` -- New Drizzle ORM model file for the Survey data model.
- `lib/survey/actions.ts` -- New actions file containing functions to fetch, create, update, and delete surveys from the database.
- `lib/survey/response.model.ts` -- New Drizzle ORM model file for the SurveyResponse data model.

## Implementation Notes

- Use the Drizzle ORM library to define the new Survey and SurveyResponse models.
- Ensure proper foreign key relationships between the Survey and SurveyResponse models.
- Implement CRUD (Create, Read, Update, Delete) actions in the survey/actions.ts file using the Drizzle ORM query builder.

## Acceptance Criteria

1. The new Survey model is properly defined with all necessary fields in the lib/survey/model.ts file.
2. The SurveyResponse model is correctly configured to reference the parent Survey entity.
3. CRUD operations for surveys and their responses are implemented in the survey/actions.ts file.
4. Existing admin/beta-surveys page updates its data from the new models without any manual hard-coded values.
5. Individual survey detail pages (admin/beta-surveys/[id]/page.tsx) fetch and display data using the Survey and SurveyResponse models.

## DO NOT

- Modify existing survey-related code outside of the specified files.
- Add or remove any npm dependencies.
- Alter the ChefFlow database schema in any way unrelated to this task.

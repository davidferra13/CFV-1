---
status: ready
priority: 'high'
score: 65
ref_accuracy: 100
source_plan: 'system/persona-build-plans/ari-weinzweig/task-2.md'
source_persona: 'ari-weinzweig'
exported_at: '2026-04-28T00:16:46.982Z'
---

# Build Task: Transparency & Traceability:

**Source Persona:** ari-weinzweig
**Gap Number:** 2 of 5
**Severity:** HIGH

## What to Build

Implement comprehensive logging for all document management actions in ChefFlow. The new functionality will create an audit trail by recording each operation performed on documents, receipts, expenses, and folders in the activity table. This will ensure full traceability and transparency of document activities.

## Files to Modify

- `lib/documents/activity-logging.ts` -- Enhance the existing logDocumentActivity function to support logging for all entity types (receipts, documents, expenses, folders). Update the logDocumentActivities function to handle batch inserts efficiently.

## Files to Create (if any)

No new files needed for this task.

## Implementation Notes

- Ensure non-blocking behavior: Log failures should be logged but never disrupt the main operation.
- Use existing createServerClient function to interact with the database.
- Handle different entity types in a unified way, using a single logging mechanism.

## Acceptance Criteria

1. The logDocumentActivity function can successfully log activities for all supported entity types (receipts, documents, expenses, folders).
2. The logDocumentActivities function can handle batch inserts efficiently, even with large volumes of inputs.
3. `npx tsc --noEmit --skipLibCheck` passes without any new errors related to the changes made.

## DO NOT

- Modify any files not listed in "Files to Modify".
- Add new npm dependencies for this task.
- Change the existing database schema or table structure.
- Remove or alter existing functionality unrelated to logging document activities.

---
status: ready
priority: 'low'
score: 50
ref_accuracy: 100
source_plan: 'system/persona-build-plans/david-chang/task-5.md'
source_persona: 'david-chang'
exported_at: '2026-04-28T00:16:46.983Z'
---

# Build Task: Retry candidate

**Source Persona:** david-chang
**Gap Number:** 5 of 5
**Severity:** LOW

## What to Build

Improve the user experience for failed Wix form submissions by allowing users to retry processing them up to 3 times.

## Files to Modify

- `app/(chef)/wix-submissions/[id]/page.tsx` -- Add a "Retry Submission" button that triggers a retry of the submission processing when clicked. The button should only be visible if the submission status is 'failed' and there have been fewer than 3 processing attempts.

## Files to Create (if any)

- No new files needed for this task.

## Implementation Notes

- Use the `retryWixSubmission` function from `lib/wix/submission-actions.ts` to attempt reprocessing the failed submission.
- Ensure the retry button is only shown when appropriate by checking the submission's status and processing attempts count.
- Handle errors gracefully and provide feedback to the user about the outcome of the retry attempt.

## Acceptance Criteria

1. The "Retry Submission" button appears for failed submissions with less than 3 processing attempts, and not otherwise.
2. Clicking the "Retry Submission" button triggers reprocessing of the submission and updates its status accordingly.
3. Feedback is provided to the user about the outcome of the retry attempt (success or failure).
4. `npx tsc --noEmit --skipLibCheck` passes without errors after implementing this feature.

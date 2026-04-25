# Canonical `/tasks` Create Regression Harness

## Scope

Close the remaining reliability gap inside the canonical `/tasks` create lane by adding a dedicated, isolated Playwright regression spec for the real `New Task` flow. This is additive only. Do not change task ownership, do not add a second mutation path, and do not reopen `chef_todos`.

## Why This Is The Highest-Leverage Remaining Action

- The canonical create path is already wired through the real server-rendered page shell and create panel on `/tasks`, using `?new=1` plus the existing `createTask(formData)` action. Evidence: [app/(chef)/tasks/page.tsx](<app/(chef)/tasks/page.tsx>) lines 35-39 and 73-94, [components/tasks/task-create-panel.tsx](components/tasks/task-create-panel.tsx) lines 58-76.
- Honest failure handling is already implemented in the canonical panel by redirecting back to the same create URL with preserved draft state and an error message. Evidence: [components/tasks/task-create-panel.tsx](components/tasks/task-create-panel.tsx) lines 61-76 and 88-101.
- The current shared launch harness already tries to cover the happy path and the failure path, but it sits inside a broad staff/tasks suite that is still noisy on this dirty checkout. Evidence: [tests/launch/09-staff-and-tasks.spec.ts](tests/launch/09-staff-and-tasks.spec.ts) lines 139-186.
- The build-state truth note explicitly says direct browser verification is green while the broader launch harness remains noisy, so the remaining gap is durable drift protection, not missing product behavior. Evidence: [docs/build-state.md](docs/build-state.md) lines 49-51.

## Build Exactly This

Create one new dedicated Playwright spec for the canonical `/tasks` create path, separate from the broad `tests/launch/09-staff-and-tasks.spec.ts` suite.

Suggested file:

- `tests/e2e/tasks-create-path.spec.ts`

## Required Behavior

The new spec must:

1. Authenticate through `/api/e2e/auth` with the seeded canonical chef.
2. Open the real canonical surface at `/tasks?date=<date>&new=1`.
3. Submit the real `New Task` form with a unique title.
4. Assert redirect back to `/tasks?date=<date>`.
5. Assert the created task is visible.
6. Reload the page and assert the same task is still visible.
7. Exercise one honest failure path by forcing invalid `assigned_to` input through the real form.
8. Assert the create panel stays open.
9. Assert the title remains populated after the failed submit.
10. Assert a real visible error is shown, matching the current `Invalid UUID` behavior.

## Constraints

- Reuse the existing canonical route and form. No fake API shortcut for the actual create assertion.
- Do not create or modify a parallel task mutation.
- Keep this spec isolated from unrelated staff, templates, or dashboard coverage.
- Prefer extracting tiny shared helpers only if they are clearly useful and do not widen scope.
- If existing shared Playwright fixtures are sufficient, use them. If they are the source of the noise, keep this spec self-contained.

## Implementation Notes

- Mirror the working direct browser proof already captured in build state, but promote it into a real checked-in Playwright spec.
- Use unique task titles based on `Date.now()` to avoid collisions.
- Use fixed future dates so visibility is deterministic.
- Wait on the canonical URL transition and visible task text, not arbitrary sleeps.
- Failure-path assertions should target the current truth contract:
  - `Create Task` button still visible
  - title input still equals submitted title
  - `p[role="alert"]` visible with the real error text

## Validation

Run the narrowest meaningful validation for this slice:

- `npx playwright test tests/e2e/tasks-create-path.spec.ts`
- If the repo uses a custom Playwright config for authenticated chef tests, use that exact config instead of widening to the whole suite.
- Re-run the focused task create unit guards only if the spec work changes shared helpers.

## Definition Of Done

- A dedicated checked-in Playwright spec exists for the canonical `/tasks` create path.
- The spec proves happy-path persistence after full reload.
- The spec proves honest failure handling without draft loss.
- The spec runs independently of the noisy broad launch suite.
- No task/todo ownership behavior changes.

## Non-Goals

- No `/todos` alias.
- No `chef_todos` changes.
- No reopening task/reminder ownership.
- No migration work.
- No redesign of the `/tasks` page.

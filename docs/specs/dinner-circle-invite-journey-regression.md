# Build Spec: Dinner Circle Invite Journey Regression

## Single Highest-Leverage Action Remaining

Add one dedicated Playwright regression that proves the full Dinner Circle invite journey across chef, public join, member, and client surfaces, then only make the minimal additive fixes required to get that regression green.

This is the highest-leverage remaining action because the feature behavior is already implemented across the product:

- Role-aware invite copy is centralized in `lib/hub/invite-copy.ts:3-48`.
- Invite link generation and attribution token handling are wired in `lib/hub/invite-links.ts:74-191`.
- Chef invite UI is live in `components/hub/event-hub-link-panel.tsx:81-88`.
- Client invite UI is live in `app/(client)/my-events/[id]/page.tsx:266-276`.
- Member invite UI is live in `components/hub/hub-member-list.tsx:63-88` and `components/hub/hub-member-list.tsx:185-194`.
- In-circle header invite affordance is live in `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:158-175` and `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:315-329`.
- Public join copy is role-aware in `app/(public)/hub/join/[groupToken]/page.tsx:42-54` and `app/(public)/hub/join/[groupToken]/join-form.tsx:40-84`.
- Join attribution persistence is already implemented in `lib/hub/group-actions.ts:186-240` and `lib/hub/group-actions.ts:305-309`.
- The Dinner Circle feed already surfaces the lightweight activity event because system messages render their body directly in `components/hub/hub-message.tsx:47-52`.

What is missing is durable proof. Current automated protection only covers helper logic in `tests/unit/hub-invite-links.test.ts:11-110`. Existing Playwright coverage does not lock this flow down; for example, the event detail suite only checks generic section rendering in `tests/e2e/08-events-detail-panels.spec.ts:154-181`. The Playwright harness already supports chef, client, and public runs in `playwright.config.ts:57-80`, so the cheapest, highest-signal remaining work is to add a focused regression test instead of more product code.

## Scope

Stay inside this scope only:

1. Add targeted Playwright regression coverage for role-aware Dinner Circle invites and join attribution.
2. If the regression exposes a real defect, fix only that defect, with additive changes only.
3. Do not add new invite workflows, dashboards, permissions systems, or broad refactors.

## Files To Change

- `playwright.config.ts`
- `tests/e2e/chef_client_dinner_circle_invites.spec.ts` or `tests/e2e/19-dinner-circle-invites.spec.ts`
- Optional, only if needed after a failing test reveals a real defect:
  - `components/hub/circle-invite-card.tsx`
  - `components/hub/hub-member-list.tsx`
  - `app/(public)/hub/g/[groupToken]/hub-group-view.tsx`
  - `app/(public)/hub/join/[groupToken]/page.tsx`
  - `app/(public)/hub/join/[groupToken]/join-form.tsx`
  - `lib/hub/group-actions.ts`
  - `lib/hub/invite-links.ts`

## Exact Build Plan

### 1. Make the new spec runnable in Playwright

Update `playwright.config.ts` so the new invite-journey spec is included in a real project run. Right now the config only picks up chef files `01-13`, client file `14`, public file `15`, and two exact cross-portal filenames in `playwright.config.ts:57-80`.

Recommended implementation:

- Add a dedicated project, for example `hub-invites`, with `storageState: '.auth/agent.json'`.
- Match exactly one new spec file so the run stays fast and deterministic.

## 2. Add one end-to-end regression spec

Create one focused spec that covers all shipped behavior in the narrowest possible path.

### Test A: chef surface creates the right invite link and copy

- Use `.auth/agent.json`.
- Open a seeded chef event page that already resolves a Dinner Circle.
- Assert the chef invite card is visible.
- Assert chef-native copy is present on the page, not just the helper output. The relevant shipped UI is in `components/hub/event-hub-link-panel.tsx:81-88` and `components/hub/circle-invite-card.tsx:40-75`.
- Capture the actual invite URL from the rendered card or copy action.
- Assert the URL includes the `invite=` attribution token, not just `/hub/join/[groupToken]`.

### Test B: public join page honors attribution and joins cleanly

- Open the captured invite URL in a fresh unauthenticated browser context.
- Assert the role badge and inviter-aware copy from `app/(public)/hub/join/[groupToken]/page.tsx:42-54`.
- Submit the quick-join form with a unique timestamped guest name and email.
- Assert redirect into `/hub/g/[groupToken]`.
- Assert the feed contains the lightweight join activity event. The insert path is `lib/hub/group-actions.ts:216-247`, and the feed rendering path is `components/hub/hub-message.tsx:47-52`.

### Test C: attribution persisted in the database

- Query the database inside the Playwright spec using the same admin helper pattern already used in `tests/e2e/08-events-detail-panels.spec.ts:5-63`.
- Verify the newest `hub_messages` row for that join has:
  - `system_event_type = 'member_joined'`
  - `system_metadata.invited_by_profile_id`
  - `system_metadata.invited_by_display_name`
  - `system_metadata.invited_by_copy_role`
- Verify the joined `hub_guest_profiles` row has `referred_by_profile_id` set to the inviter profile, per `lib/hub/group-actions.ts:305-309`.

### Test D: member surface keeps the member-native invite affordance

- Continue from the joined member context.
- Open the Members tab.
- Assert the member-native invite card copy from `components/hub/hub-member-list.tsx:63-88` if invites are enabled for that circle.
- Also assert the compact header invite affordance in `app/(public)/hub/g/[groupToken]/hub-group-view.tsx:315-329`.

If the chosen circle has member invites disabled, set up test state with the admin client before the assertion. Keep this as test-only setup, not product behavior.

### Test E: client surface keeps the host-native copy

- Open a client-authenticated context.
- Visit the client event page for a seeded event with a Dinner Circle.
- Assert the host-native invite copy in `app/(client)/my-events/[id]/page.tsx:266-276`.
- Do not re-test attribution persistence here. This test is only protecting the client-facing copy surface.

## Acceptance Criteria

- One Playwright spec covers chef, public join, member, and client invite behavior.
- The spec proves the real rendered UI, not just helper output.
- The spec proves attribution survives the invite click and join action into persisted data.
- Any fixes made are additive and stay within the current Dinner Circle invite scope.
- No new product workflows are introduced.

## Required Validation

Run all of these:

1. `npx playwright test tests/e2e/<new-spec-file>.spec.ts --project=<new-project-or-matching-project>`
2. `npx eslint --max-warnings 0 playwright.config.ts tests/e2e/<new-spec-file>.spec.ts`
3. `graphify update .`

If a product file changes because a defect was found, also run lint against every touched app/component/lib file. Do not claim a full TypeScript pass unless you actually complete one.

## Guardrails

- Additive only, no breaking changes.
- Do not touch unrelated dirty files.
- Do not invent new invite product scope.
- Do not replace the current text-first join flow with email, admin, or bulk invite tooling.
- Do not weaken the join attribution behavior that is already live in `lib/hub/group-actions.ts:186-240`.

## Done Condition

This scope is done when the invite journey is protected by one real Playwright regression and that regression passes against the live UI with the current implementation.

# Operator Walkthrough Lane

## What changed

- Added public route drift guards for `/for-operators/walkthrough` in `tests/coverage/01-public-routes.spec.ts`, `tests/unit/public-surface-contract.test.ts`, `tests/public-pages-audit.spec.ts`, and `tests/helpers/test-utils.ts`.
- Added a real Playwright launch check for the walkthrough submission success state in `tests/launch/14-public-inquiry-form.spec.ts`.
- Updated `docs/app-complete-audit.md`, `project-map/public/directory.md`, and `project-map/chef-os/inquiries.md` so the operator walkthrough lane is documented as a real public-to-founder evaluation path.
- Updated `docs/USER_MANUAL.md` so the walkthrough page is described as feeding the founder-owned evaluation lane on `/leads`.
- Tightened `updateOperatorEvaluationStatus` so the founder inbox only returns success when a real `operator_walkthrough` row was updated.

## Why

The runtime already had a dedicated operator walkthrough route and founder-only evaluation inbox, but the audit and route coverage still described the older operator marketing surface. That left a truth gap: the feature existed in code without matching docs or drift guards.

## Verification

- `node --test --import tsx tests/unit/public-surface-contract.test.ts tests/unit/contact.operator-evaluation.test.ts`
- `node --test --import tsx tests/unit/marketing-source-links.test.ts`
- Real UI verification on `http://127.0.0.1:3420/for-operators/walkthrough?source_page=codex_check&source_cta=manual_verify`:
  public form submit reached the success state and wrote a new `contact_submissions` row with `intake_lane='operator_walkthrough'`.
- Auth scope truth gap:
  `.auth/agent.json` authenticates `agent@local.chefflow`, which is not the founder owner account resolved by `lib/platform/owner-account.ts`, so `/leads#operator-evaluations` does not render that lane for the agent account.
- Real founder-lane verification on `http://127.0.0.1:3511` using `.auth/developer.json`:
  submitted a realistic walkthrough request, confirmed it rendered in the founder-only Operator Evaluation Inbox with structured fields plus `source_page` and `source_cta`, confirmed it did not appear in General website leads, and changed the status to `Qualified` with the UI reflecting the saved state.

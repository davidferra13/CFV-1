# Interaction Engine Application Gateway Build Spec

## Scope

Interaction Engine only. Build an additive, non-breaking application-facing gateway for the existing unified Interaction Engine.

## Single Highest-Leverage Action

Build a reusable interaction gateway that lets authenticated app surfaces and API consumers execute any registered Interaction Engine action through one stable server/API entry point.

## Evidence

- The core executor already exists and validates action type, target type, context type, permissions, duplicate windows, writes to `interaction_events`, and runs side effects in `lib/interactions/execute.ts:34`.
- The registry already defines all required layers and many action types, including content/social/communication/transactional/chef-native/automation actions in `lib/interactions/registry.ts:37`.
- The package currently exports the engine primitives from `lib/interactions/index.ts:1`, but there is no dedicated authenticated server action or API route exposed from this package.
- The database ledger exists in `database/migrations/20260425000004_interaction_engine.sql:4`, with required columns and indexes at `database/migrations/20260425000004_interaction_engine.sql:30`.
- Existing tests cover registry completeness, unknown-action handling, dedupe, and event permission denial in `tests/unit/interaction-engine.test.ts:105`, but they do not cover an app/API gateway contract.

## Build Exactly This

Create a first-class Interaction Gateway with:

1. `lib/interactions/actions.ts`
   - Add a server action named `executeInteractionAction(input)`.
   - It must call the existing `executeInteraction(input)`.
   - It must infer the authenticated actor from `getCurrentUser()` when the caller does not provide `actor`.
   - It must accept only the existing `ExecuteInteractionInput` shape.
   - It must return the existing `ExecuteInteractionResult` shape.
   - It must not bypass or duplicate permission logic already in `executeInteraction`.
   - It must not create notifications, activity rows, or automations directly.

2. `app/api/interactions/route.ts`
   - Add `POST /api/interactions`.
   - Validate JSON with a small Zod schema aligned to `ExecuteInteractionInput`.
   - Call `executeInteractionAction`.
   - Return:
     - `200` for `ok: true`
     - `400` for validation errors
     - `403` for `permission_denied`
     - `422` for `unknown_action`, `invalid_target`, or `invalid_context`
     - `500` for `write_failed`
   - Do not expose stack traces.
   - Do not add new business side effects beyond the engine.

3. Tests in `tests/unit/interaction-engine.test.ts`
   - Add coverage for the gateway path without hitting a real database.
   - Confirm valid action returns `ok: true`.
   - Confirm unknown action returns a non-throwing error.
   - Confirm permission denied maps cleanly.
   - Confirm duplicate POST-style execution does not create duplicate `interaction_events`.

4. Optional tiny helper if needed: `lib/interactions/schema.ts`
   - Only create this if sharing validation between server action/API route keeps the API route small.
   - Keep it narrowly scoped to input validation.

## Constraints

- Additive only.
- Do not change existing registry action definitions unless a compile error requires a narrow fix.
- Do not rewrite the executor.
- Do not change existing workflow wrappers in inquiries, quotes, events, chat, invoices, or cron.
- Do not alter the `interaction_events` migration unless the gateway needs a strictly additive column or index.
- Keep existing tests passing.

## Acceptance Criteria

- `executeInteractionAction(input)` exists and delegates to the existing executor.
- `POST /api/interactions` exists and supports every action registered in `INTERACTION_REGISTRY` without adding per-action route handlers.
- Unknown actions do not crash.
- Permission-denied interactions do not write rows.
- Duplicate retries are deduped through the existing idempotency behavior.
- Existing Interaction Engine tests still pass.
- `npm run typecheck:app` passes.

## Verification Commands

```bash
node --test --import tsx tests/unit/interaction-engine.test.ts
npm run typecheck:app
```

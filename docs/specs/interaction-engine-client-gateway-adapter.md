# Interaction Engine Client Gateway Adapter Build Spec

## Scope

Interaction Engine only. Build an additive, non-breaking client/API-consumer adapter for the existing Interaction Engine gateway. Do not modify unrelated app workflows.

## Single Highest-Leverage Action Remaining

Build a reusable typed adapter for application surfaces and API consumers to execute registered Interaction Engine actions through `POST /api/interactions`, with shared response handling and focused tests.

## Evidence

- The server action gateway already exists and delegates to the executor in `lib/interactions/actions.ts:25`, with authenticated actor inference at `lib/interactions/actions.ts:35` and executor delegation at `lib/interactions/actions.ts:40`.
- The API gateway already exists in `app/api/interactions/route.ts:23`, validates request bodies at `app/api/interactions/route.ts:38`, calls `executeInteractionAction` at `app/api/interactions/route.ts:50`, and maps engine errors to HTTP statuses at `app/api/interactions/route.ts:6`.
- The Zod input schema is already available in `lib/interactions/schema.ts:12`, aligned to the existing `ExecuteInteractionInput` shape.
- The registry supports the broad action surface in `lib/interactions/registry.ts:37`, including content, social, communication, transactional, chef-native, and automation actions through `lib/interactions/registry.ts:167`.
- Current tests cover the gateway server action and status mapping in `tests/unit/interaction-engine.test.ts:212`, `tests/unit/interaction-engine.test.ts:247`, `tests/unit/interaction-engine.test.ts:277`, and `tests/unit/interaction-engine.test.ts:312`.
- There is no reusable app/API consumer adapter yet: `rg -n "/api/interactions|executeInteractionAction"` only finds the route, exports, spec, and tests, while existing product flows still call `executeInteraction` directly in scattered wrappers such as `lib/chat/actions.ts:510`, `lib/quotes/actions.ts:790`, and `app/api/v2/quotes/[id]/send/route.ts:47`.

## Build Exactly This

1. `lib/interactions/client.ts`
   - Add a browser/API-consumer safe function named `postInteraction(input, options?)`.
   - It must accept only the existing `ExecuteInteractionInput` shape.
   - It must return the existing `ExecuteInteractionResult` shape.
   - It must POST JSON to `/api/interactions`.
   - It must not call `executeInteraction` directly.
   - It must not infer or accept privileged server-only auth context beyond the input shape.
   - It must preserve engine error results returned by the API route.
   - It must convert invalid JSON, network failures, and non-engine response bodies into a non-throwing `write_failed` result.
   - It may accept a narrowly typed optional fetch override for tests:
     - `fetch?: typeof fetch`
     - `endpoint?: string`

2. `lib/interactions/index.ts`
   - Export `postInteraction`.
   - Do not remove or rename any existing exports.

3. Tests in `tests/unit/interaction-engine.test.ts`
   - Add coverage without hitting a real network or database.
   - Confirm `postInteraction` sends a POST request to `/api/interactions` with JSON content.
   - Confirm an API `ok: true` result is returned unchanged.
   - Confirm an API engine error such as `unknown_action` is returned unchanged.
   - Confirm network failure returns a non-throwing `write_failed` result.
   - Confirm invalid/non-JSON API responses return a non-throwing `write_failed` result.

## Constraints

- Additive only.
- Stay strictly within the Interaction Engine scope.
- Do not change the executor.
- Do not change the registry.
- Do not change the database migration.
- Do not rewrite existing workflow wrappers in inquiries, quotes, events, chat, invoices, or cron.
- Do not introduce per-action client helpers.
- Do not add new business side effects.
- Keep existing tests passing.

## Acceptance Criteria

- `postInteraction(input)` exists and routes all actions through `POST /api/interactions`.
- The adapter supports every action registered in `INTERACTION_REGISTRY` because it accepts the generic `ExecuteInteractionInput` shape rather than per-action inputs.
- Engine results are preserved exactly when the API returns a valid `ExecuteInteractionResult`.
- Network and malformed-response failures do not throw.
- Existing gateway, permission, and dedupe tests still pass.
- `npm run typecheck:app` passes.

## Verification Commands

```bash
node --test --import tsx tests/unit/interaction-engine.test.ts
npm run typecheck:app
```

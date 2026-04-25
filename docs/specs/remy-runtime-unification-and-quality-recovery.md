# Remy Runtime Unification And Quality Recovery

Status: ready for implementation
Owner: website / AI assistant runtime
Priority: P0
Date: 2026-04-25

## Why This Exists

Remy still feels bad because the user-facing assistant path is split across multiple partially overlapping runtimes:

- The drawer uses `useRemySend`, which posts to `/api/remy/stream`.
- The curated onboarding and dynamic personality engine is mainly wired into `sendRemyMessage`, which is not the primary drawer path.
- `/api/remy/context` has a third prompt assembly path for local AI.
- Greeting fast paths skip the curated onboarding state machine.
- Remy quality tests are currently broken, so regressions are not being caught.
- Context loading silently degrades to empty fallback data, which makes Remy sound confident while missing important business facts.

This build makes Remy coherent by putting the shipped UX on one canonical runtime path, wiring the personality/onboarding system into that path, and restoring the quality harness.

## Non-Goals

- Do not redesign Remy's visual UI.
- Do not rewrite the command orchestrator.
- Do not add new AI model providers.
- Do not expand Remy's capability catalog.
- Do not change approval/security semantics for write actions.
- Do not remove legacy server actions unless all imports are proven unused.

## Source Files To Read First

- `components/ai/remy-drawer.tsx`
- `lib/hooks/use-remy-send.ts`
- `lib/hooks/use-remy-mascot-send.ts`
- `app/api/remy/stream/route.ts`
- `app/api/remy/context/route.ts`
- `app/api/remy/stream/route-prompt-utils.ts`
- `app/api/remy/stream/route-runtime-utils.ts`
- `lib/ai/remy-actions.ts`
- `lib/ai/remy-personality-engine.ts`
- `lib/ai/remy-curated.ts`
- `lib/ai/remy-context.ts`
- `lib/ai/remy-memory-actions.ts`
- `lib/ai/mempalace-bridge.ts`
- `tests/remy-quality/harness/remy-quality-runner.mjs`
- `scripts/lib/db.mjs`
- `scripts/remy-delivery-smoke.mjs`
- `package.json`

## The Build

### 1. Make `/api/remy/stream` The Canonical Remy Runtime

The drawer and mascot already use `/api/remy/stream`. Treat this as the real runtime.

Build a small shared helper, for example:

- `app/api/remy/stream/route-personality-utils.ts`

This helper should:

- Call `getCuratedGreeting()` from `lib/ai/remy-personality-engine.ts`.
- Call `buildDynamicPersonalityBlock()` from `lib/ai/remy-personality-engine.ts`.
- Call `maybeGetOnboardingCloser()` after normal assistant responses.
- Track onboarding progress using `getOnboardingStage()`, `trackFirstInteraction()`, and `incrementMessageCount()`.
- Return structured data that the stream route can emit through existing SSE events.

Do not duplicate the personality logic. Reuse the existing engine.

### 2. Fix Greeting And First-Open Behavior

Current bug: simple greetings like `hi` hit `buildGreetingFastPath()` and bypass curated onboarding.

Change `/api/remy/stream` behavior:

- Before `GREETING_REGEX` fast-path, check whether a curated greeting is due.
- If a curated greeting is due, stream that curated message and quick replies, then finish.
- Only use `buildGreetingFastPath()` when no curated onboarding/check-in/milestone greeting is due.

The same rule must apply to `/api/remy/context` for local AI mode.

Acceptance:

- A brand-new chef opening Remy and sending `hi` gets the curated onboarding greeting, not the generic fast greeting.
- A chef who skipped/completed onboarding can still get the fast greeting.

### 3. Add Quick-Reply SSE Support If Missing

The drawer already has quick-reply chip rendering, but the stream route must reliably send quick replies from curated greetings.

Use the existing SSE parser conventions if there is already a quick-reply event. If there is not, add one minimal event type:

```ts
{ type: 'quick_replies', data: string[] }
```

Wire it through:

- `app/api/remy/stream/route.ts`
- `lib/ai/remy-stream-parser.ts`
- `lib/hooks/use-remy-send.ts`
- `lib/hooks/use-remy-mascot-send.ts` if mascot supports onboarding chips
- `components/ai/remy-drawer.tsx`

Acceptance:

- Curated onboarding greetings render `Give me the tour` and `I'll figure it out`.
- Tour beats render `Next` and `Skip the rest`.
- Clicking a chip sends the chip text through the normal send path.

### 4. Inject Dynamic Personality Into The Real Prompt Path

Current bug: `buildDynamicPersonalityBlock()` is wired into `lib/ai/remy-actions.ts`, but not clearly into the stream prompt path.

Update `app/api/remy/stream/route-prompt-utils.ts` so `buildRemySystemPrompt()` accepts a `dynamicPersonalityBlock?: string` option or final argument.

Then update:

- `app/api/remy/stream/route.ts`
- `app/api/remy/context/route.ts`

Both routes must call `buildDynamicPersonalityBlock()` with real context values and include it in the prompt.

Acceptance:

- Empty state guidance, tenure tone, and stale inquiry motivational context appear in the actual stream route system prompt.
- Local AI context route and server-stream route produce equivalent personality blocks.

### 5. Append The Onboarding Closer In The Stream Route

Current bug: `maybeGetOnboardingCloser()` is only appended in `sendRemyMessage()`.

After the stream route finishes collecting `fullResponse`, call `maybeGetOnboardingCloser(user.tenantId!)`.

If it returns text:

- Append it as a final `token` SSE event before `done`.
- Include it in any saved digest/metrics if that path records the full assistant answer.

Acceptance:

- After 3 real exchanges post-tour, Remy appends the curated onboarding closer exactly once.

### 6. Repair Remy Quality Harness

Current bug:

```txt
tests/remy-quality/harness/remy-quality-runner.mjs imports createClient
scripts/lib/db.mjs exports signInAgent and getDb
```

Update the Remy quality harness to use the current Auth.js helper:

- Replace `createClient` usage with `signInAgent(port)`.
- Use the returned cookie header for `/api/remy/stream`.
- Use `getDb()` only for direct seed/read verification if the harness genuinely needs DB access.
- Remove Supabase assumptions from Remy quality harnesses.

Acceptance:

- `npm run test:remy-quality:quick` starts and executes real prompts instead of crashing at import time.
- The harness fails on assistant quality or runtime behavior, not stale test plumbing.

### 7. Fix Remy Delivery Smoke Typecheck Or Scope It Honestly

Current bug:

`npm run qa:remy:delivery` passes lint/unit tests but fails typecheck in `lib/db/index.ts`.

Fix the typing issue in `lib/db/index.ts` without changing runtime DB behavior.

Likely fix:

- Adjust the `drizzle` generic usage so the `postgres` client with custom date type is accepted.
- Avoid broad `any` if a narrow cast is sufficient.

Acceptance:

- `npm run qa:remy:delivery` passes.
- No runtime DB connection behavior changes.

### 8. Add Context Health Visibility

Current problem: Remy context failures degrade silently to fallback data. This is useful for uptime but bad for trust.

Add a lightweight context health section to the prompt when context failures are recorded during the current request:

- Track failed context operations inside `loadRemyContext()`.
- Return a non-user-facing field on `RemyContext`, for example `contextHealth?: { degraded: boolean; failedOperations: string[] }`.
- In prompt building, add an instruction only when degraded:

```txt
CONTEXT HEALTH: Some business context failed to load: [operations].
Be honest about missing data. Do not claim a complete view of the business when answering questions related to those areas.
```

Do not show raw stack traces or database errors to the user.

Acceptance:

- If email digest fails, Remy does not imply it checked all recent email.
- If price context fails, Remy does not imply live market data is available.
- Normal healthy requests do not include noisy health text.

### 9. Add Focused Tests

Add or update focused tests for these cases:

- New-user greeting beats fast greeting.
- Onboarding quick replies serialize through SSE and render in the hook state.
- Dynamic personality block is included in stream prompt.
- Local AI context route includes the same dynamic personality block.
- `npm run test:remy-quality:quick` harness imports current helpers.

Prefer focused unit tests where possible. Add one integration-style route test if the current test architecture supports authenticated route calls cleanly.

## Implementation Order

1. Repair the Remy quality harness import so tests can run.
2. Fix `qa:remy:delivery` typecheck failure.
3. Add shared stream personality helper.
4. Wire curated greeting before greeting fast-path in `/api/remy/stream`.
5. Wire equivalent behavior in `/api/remy/context`.
6. Add quick-reply SSE support if missing.
7. Inject dynamic personality block into stream/context prompts.
8. Append onboarding closer in stream route.
9. Add context health visibility.
10. Run the verification commands.

## Verification Commands

Run:

```bash
npm run test:remy-quality:quick
npm run qa:remy:delivery
node --test --import tsx tests/unit/remy*.test.ts
```

If focused tests are added under a different path, run those directly too.

If a command fails for a pre-existing unrelated reason, document the exact failure and prove the Remy-specific path with a narrower command.

## Done Criteria

This task is done only when:

- The drawer path, stream route, and local AI context route share the same personality/onboarding behavior.
- Brand-new users get curated onboarding through the real UI path.
- Completed users do not get onboarding repeatedly.
- Dynamic personality guidance affects the real streaming prompt.
- The Remy quality quick test starts executing real test cases.
- `qa:remy:delivery` passes or has a narrowly documented unrelated blocker.
- Context degradation is visible to Remy as a prompt constraint, not silently converted into false confidence.

## Suggested Commit Message

```txt
fix(remy): unify stream runtime personality and restore quality harness
```

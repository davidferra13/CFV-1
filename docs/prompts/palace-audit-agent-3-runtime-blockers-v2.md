# Agent Handoff: Runtime Blocker Fixes + Codex Triage (v2)

> Refined from Agent 3 session on 2026-04-24. Original prompt had stale intelligence.
> Previous session applied partial fixes. This prompt contains corrected findings and remaining work.

## Prior Session Findings (DO NOT RE-INVESTIGATE)

### 1. /clients/[id]/relationship -- PARTIAL FIX APPLIED

**What the original prompt said:** "import chain parse-ollama -> chat-insights -> insights/actions causes 500."

**What we actually found:** That import chain does NOT connect to the relationship page. The full import tree was traced:

```
relationship/page.tsx
  -> relationship-snapshot.ts ('use server')
    -> next-best-action.ts ('use server')
      -> interaction-signals.ts (NO 'use server' -- exports sync + async)
        -> interaction-ledger.ts ('use server')
      -> next-best-action-core.ts (pure functions)
    -> intelligence/client-intelligence-context.ts ('use server')
    -> intelligence.ts ('use server')
    -> preference-learning-actions.ts ('use server')
    -> relationship-signals.ts (pure functions)
    -> client-history.ts
    -> marketing/actions.ts
```

**No file in this chain imports from `insights/actions`, `chat-insights`, or `parse-ollama`.**

**Defensive fixes applied (committed but unverified at runtime):**

- `lib/clients/relationship-snapshot.ts`:
  - Added `.catch(() => [])` to `getRelationshipPatterns()` call (was the only Promise.all item without .catch)
  - Added `.then().catch()` to the completedEvents db query
  - Wrapped `buildClientRelationshipSignalSnapshot()` in try/catch with fallback empty signals
- `app/(chef)/clients/[id]/relationship/page.tsx`:
  - Wrapped `getClientRelationshipSnapshot()` call in try/catch, logs error, falls through to notFound()

**Known issue:** `lib/clients/interaction-signals.ts` has NO `'use server'` directive but exports async functions (`getClientInteractionSignalMap`, `getClientInteractionSignals`) that use `requireChef()` and `createServerClient()`. Cannot simply add `'use server'` because file also exports sync functions (`getClientInteractionSignalShortLabel`, `getClientInteractionSignalMeta`, `buildClientInteractionSignalSnapshot`). This works today because it's only imported from server-side code, but is a latent correctness issue. Proper fix: split into two files (server actions file + pure functions file).

**REMAINING WORK:**

1. Start the production server (`npm run build && npm start` on port 3000)
2. Sign in with agent account (`.auth/agent.json`, `POST http://localhost:3000/api/e2e/auth`)
3. Navigate to `/clients/[id]/relationship` for any client with events
4. If it still 500s, check the server console for the actual error message
5. Fix the real root cause based on the runtime error
6. If it loads: verify the data looks reasonable (signals, history, metrics)

### 2. CP-Engine Event Surface -- NO BUG EXISTS

**What the original prompt said:** "app/(chef)/events/[id]/page.tsx may error when client*profile*\* tables don't exist."

**What we actually found:** The event page has ZERO references to `client_profile_*` tables, `profileGuidance`, or any CP-Engine code. Grep confirmed no matches in `app/(chef)/events/[id]/`.

The CP-Engine entry point (`getClientCulinaryProfileGuidance` in `lib/clients/client-profile-actions.ts:866`) is only used by the CLIENT DETAIL page (`app/(chef)/clients/[id]/page.tsx`), not the event page. It already properly fail-closes:

```ts
export async function getClientCulinaryProfileGuidance(clientId: string) {
  const user = await requireChef()
  try {
    const { getClientProfileVectorForTenant } = await import('@/lib/clients/client-profile-service')
    const { buildProposalProfileGuidance } =
      await import('@/lib/clients/client-profile-chef-workflow')
    const vector = await getClientProfileVectorForTenant(clientId, user.tenantId!)
    if (!vector) return null
    return buildProposalProfileGuidance(vector)
  } catch (err) {
    console.error('[getClientCulinaryProfileGuidance] Failed (fail-closed):', err)
    return null
  }
}
```

Dynamic imports + try/catch + return null = correct fail-closed. **No fix needed.**

### 3. Codex Uncommitted Work -- ALL 4 FILES ALREADY COMMITTED

**What the original prompt said:** "4 uncommitted items at risk of being lost."

**What we actually found:** All 4 key files are committed on main:

| File                                     | Lines | Commit                       |
| ---------------------------------------- | ----- | ---------------------------- |
| `lib/public/intake-lane-config.ts`       | 223   | `7980b08`                    |
| `lib/clients/next-best-action-core.ts`   | 333   | `7980b08` (also `eed576ee0`) |
| `components/tasks/task-create-panel.tsx` | 106   | `7980b08`                    |
| `lib/security/public-intent-guard.ts`    | 300   | `7980b08`                    |

`git stash show stash@{2}` only contains 1 file (`docs/uptime-history.json`), not 997+ files. The Codex backup stash is minimal.

**No recovery needed. No commit needed.**

### 4. tsc Status

`npx tsc --noEmit --skipLibCheck` passes clean after all fixes. No type errors.

## YOUR JOB (What Still Needs Doing)

### A. Runtime-verify the relationship page fix

The defensive fixes were applied but never tested at runtime (no server was running). Follow the steps in "REMAINING WORK" above under item 1. This is the #1 priority.

### B. Split `interaction-signals.ts` (optional, low priority)

If you have time, split `lib/clients/interaction-signals.ts` into:

- `lib/clients/interaction-signal-utils.ts` -- pure sync exports (types, `getClientInteractionSignalShortLabel`, `getClientInteractionSignalMeta`, `buildClientInteractionSignalSnapshot`)
- `lib/clients/interaction-signals.ts` -- `'use server'` file with async exports (`getClientInteractionSignals`, `getClientInteractionSignalMap`)

Update imports in:

- `app/(chef)/clients/[id]/relationship/page.tsx` (uses `getClientInteractionSignalShortLabel`)
- `lib/clients/next-best-action.ts` (uses `getClientInteractionSignalMap`)
- `lib/clients/unified-timeline.ts` (check what it imports)

### C. Update memory files

Create or update these memory files in `C:\Users\david\.claude\projects\c--Users-david-Documents-CFv1\memory\`:

1. `project_ledger_backed_nba.md` -- Document: NBA core is committed (`next-best-action-core.ts`), interaction ledger is committed, `interaction-signals.ts` needs 'use server' split. Relationship page has defensive error handling. Runtime verification pending.

2. `project_canonical_intake_lanes.md` -- Document: intake-lane-config.ts committed in `7980b08`. 223 lines, 6 lane types. No issues found.

3. `project_tasks_create_path.md` -- Document: task-create-panel.tsx committed in `7980b08`. 106 lines. No issues found.

4. `project_public_intent_hardening.md` -- Document: public-intent-guard.ts committed in `7980b08`. 300 lines. Rate limiting, Turnstile verification, email-based rate limiting. No issues found.

### D. Commit the defensive fixes

The fixes to `relationship-snapshot.ts` and `relationship/page.tsx` are uncommitted. Commit with:

```
fix(codex-review): defensive error handling for relationship page

Wrap getClientRelationshipSnapshot and its internal signal snapshot
builder in try/catch to prevent uncaught errors from causing 500s.
Add .catch() to previously unprotected Promise.all items.
```

## Rules

- Do not delete any files without explicit approval
- `npx tsc --noEmit --skipLibCheck` must pass after all changes
- Commit with conventional commit format
- Non-blocking side effects: wrap in try/catch, log failures as warnings
- Test on production build (port 3000), never dev server (port 3100)

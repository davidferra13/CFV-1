# Codex Task: Split interaction-signals.ts

`lib/clients/interaction-signals.ts` exports both sync helper functions and async server functions that use `requireChef()`. Files with `'use server'` can only export async functions. Files without it shouldn't export functions using server-only APIs. Fix by splitting into two files.

## What to Do

### 1. Create `lib/clients/interaction-signal-utils.ts`

Move these items from `interaction-signals.ts` to a new file `lib/clients/interaction-signal-utils.ts`:

- The `INTERACTION_SIGNAL_META` constant and its `satisfies` type
- Type exports: `ClientInteractionSignalType`, `ClientInteractionSignalReason`, `ClientInteractionSignal`, `ClientInteractionSignalSnapshot`, `ClientMilestoneRecord` (if exported)
- Pure sync function exports: `getClientInteractionSignalMeta`, `getClientInteractionSignalShortLabel`
- Pure sync function: `buildClientInteractionSignalSnapshot` and ALL its helper functions:
  - `SIGNAL_PRECEDENCE`
  - `CLIENT_RESPONSE_CODES`
  - `startOfToday`, `parseTimestamp`, `compareSignals`, `getDaysUntil`, `formatAnnualDate`, `getNextAnnualOccurrence`
  - `buildLedgerReason`, `buildHealthReason`, `buildClientRecordReason`
  - `buildAwaitingChefReplySignal`, `buildQuoteSignals`, `buildMilestoneSignal`, `buildHealthSignals`

The new file should have NO `'use server'` directive. It imports only types (no `requireChef`, no `createServerClient`).

Required imports for the new file:

```ts
import type { ClientHealthScore, ClientHealthTier } from './health-score'
import type { ClientInteractionCode, ClientInteractionLedgerEntry } from './interaction-ledger-core'
import type { ClientActionType } from './action-vocabulary'
```

### 2. Slim down `lib/clients/interaction-signals.ts`

After moving everything above, this file should:

- Add `'use server'` at the top
- Keep only the async exports: `getClientInteractionSignals`, `getClientInteractionSignalMap`
- Import from the new utils file:
  ```ts
  import {
    buildClientInteractionSignalSnapshot,
    type ClientInteractionSignalSnapshot,
    type ClientInteractionSignalType,
  } from './interaction-signal-utils'
  ```
- Keep its existing imports for `requireChef`, `createServerClient`, `getClientHealthScores`, `getClientInteractionLedger`
- Re-export types from the utils file so existing consumers don't break:
  ```ts
  export type {
    ClientInteractionSignal,
    ClientInteractionSignalReason,
    ClientInteractionSignalSnapshot,
    ClientInteractionSignalType,
  } from './interaction-signal-utils'
  ```

### 3. Update imports in consumers

Only 3 files import from `interaction-signals.ts`. Update them:

**`app/(chef)/clients/[id]/relationship/page.tsx` (line ~11):**
Change:

```ts
import { getClientInteractionSignalShortLabel } from '@/lib/clients/interaction-signals'
```

To:

```ts
import { getClientInteractionSignalShortLabel } from '@/lib/clients/interaction-signal-utils'
```

**`lib/clients/next-best-action.ts` (line ~17):**

```ts
import { getClientInteractionSignalMap } from './interaction-signals'
```

This stays the same. `getClientInteractionSignalMap` stays in `interaction-signals.ts`.

**`lib/clients/unified-timeline.ts`:**
Check what it imports. If it imports types only, change to import from `interaction-signal-utils`. If it imports async functions, leave as-is.

**`lib/clients/relationship-snapshot.ts`:**
Check if it imports from `interaction-signals`. If not, no change needed.

## Verification

Run these in order. ALL must pass:

```bash
npx tsc --noEmit --skipLibCheck
```

Then:

```bash
grep -c "'use server'" lib/clients/interaction-signals.ts
# Must output: 1

grep -c "requireChef\|createServerClient" lib/clients/interaction-signal-utils.ts
# Must output: 0
```

## Rules

- Do NOT change any logic or behavior. This is a pure file-split refactor.
- Do NOT delete `interaction-signals.ts`. It still exists with async functions.
- Read every file before editing it.
- Commit with: `refactor(clients): split interaction-signals into server actions and pure utils`

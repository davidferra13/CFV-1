# Codex Build Spec: PIE Coverage Gap + Auto-Expansion Cron Activation

> **Priority:** P0 - Self-healing loop exists in code but may not be wired to cron
> **Risk:** LOW - wiring existing code to cron endpoints
> **Estimated scope:** ~120 lines across 2 files

## Context

Two PIE modules form a self-healing loop:

1. `lib/pricing/coverage-gap-detector.ts` (404 LOC) - finds underserved regions
2. `lib/pricing/auto-expansion-engine.ts` (411 LOC) - dispatches scrape jobs to fill gaps

These need cron route endpoints to run automatically. Check if they already exist; if not, create them.

## Files to Check/Create

### Check first

Look for existing cron routes that call these modules:

- `app/api/cron/*/route.ts` files that import from `coverage-gap-detector` or `auto-expansion-engine`

### Create if missing

**File 1:** `app/api/cron/pie-coverage-gaps/route.ts`

```typescript
// Pattern: match existing cron routes in app/api/cron/
import { NextResponse } from 'next/server'
import { runCoverageGapDetection } from '@/lib/pricing/coverage-gap-detector'

export const runtime = 'nodejs'
export const maxDuration = 120

export async function GET(request: Request) {
  // Verify cron secret (match pattern from other cron routes)
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const result = await runCoverageGapDetection()
  return NextResponse.json(result)
}
```

**File 2:** `app/api/cron/pie-auto-expansion/route.ts`
Same pattern, calling the auto-expansion engine's main run function.

### Vercel cron config

Add to `vercel.json` crons array (or wherever cron schedule is configured):

- Coverage gaps: every 6 hours (`0 */6 * * *`)
- Auto-expansion: every 6 hours, offset by 1 hour (`0 1,7,13,19 * * *`) - runs AFTER gap detection

## Important

- Match the exact auth pattern used by existing cron routes (check `app/api/cron/resolve-prices/route.ts` for the pattern)
- Match the exact import style (some use `pgClient`, some use `db`)
- If routes already exist, verify they actually call the right functions and are scheduled

## Acceptance Criteria

- Both cron endpoints respond to GET with valid auth
- Coverage gap detection runs and returns `CoverageGapResult`
- Auto-expansion runs and returns `ExpansionRunResult`
- Cron schedule configured (6-hour intervals)
- `npx tsc --noEmit --skipLibCheck` passes

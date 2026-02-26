# Soak Testing — Software Aging Detection

**Created:** 2026-02-26

## What This Tests

Soak tests detect **software aging** — bugs that only appear after sustained, repeated use:

- **Memory leaks** — JS heap grows because event listeners, subscriptions, or DOM references aren't cleaned up
- **DOM node accumulation** — React components unmount visually but leave orphaned nodes in the tree
- **Performance degradation** — each navigation cycle gets slower as state accumulates
- **State corruption** — console errors start appearing after N iterations when they were absent initially

These bugs don't exist in any single page load. They emerge from the _accumulation_ of hundreds of individually-correct page loads without a browser refresh.

## How It Works

Each soak test repeats a realistic user workflow (e.g., Dashboard → Events → Edit → Back) hundreds of times in a single browser session. At regular intervals (every 10 iterations by default), it uses the **Chrome DevTools Protocol (CDP)** to:

1. Force garbage collection (so measurements are stable)
2. Measure JS heap size (`JSHeapUsedSize`)
3. Count DOM nodes (`Nodes`)
4. Record accumulated console errors
5. Measure cycle time (how long one complete loop took)

At the end, it compares final metrics against the baseline (first measurement) and fails if any threshold is exceeded.

## Pass/Fail Thresholds

| Metric                 | Threshold     | What it catches                                          |
| ---------------------- | ------------- | -------------------------------------------------------- |
| Memory growth          | < 3× baseline | Event listener leaks, detached DOM trees, growing caches |
| DOM node growth        | < 2× baseline | Components not unmounting, orphaned elements             |
| Console errors         | < 5/iteration | State corruption that only appears after N cycles        |
| Cycle time degradation | < 2× baseline | Accumulated re-renders, growing observer lists           |

A **5× memory** safety valve triggers early abort to prevent system memory exhaustion.

## Running the Tests

Soak tests run against a **production build** (`next build` + `next start` on port 3200), not the dev server. This eliminates false timeouts from on-demand compilation overhead. The `npm run test:soak` scripts handle the build automatically.

```bash
# Full soak (100 iterations per workflow, ~10 min per test)
npm run test:soak

# Quick validation (10 iterations, ~1 min total)
npm run test:soak:quick

# Single workflow only (build first, then run)
npx next build --no-lint && npx playwright test --config=playwright.soak.config.ts tests/soak/01-dashboard-events.spec.ts

# Overnight stress test (500 iterations)
npx next build --no-lint && SOAK_ITERATIONS=500 SOAK_CHECKPOINT_INTERVAL=25 npx playwright test --config=playwright.soak.config.ts
```

## Test Workflows

| File                           | Workflow                                                                         | Navigations/cycle |
| ------------------------------ | -------------------------------------------------------------------------------- | ----------------- |
| `01-dashboard-events.spec.ts`  | Dashboard → Events → Event Detail → Edit → Events → Dashboard                    | 6                 |
| `02-dashboard-clients.spec.ts` | Dashboard → Clients → Client Detail → Clients → Dashboard                        | 5                 |
| `03-dashboard-browse.spec.ts`  | Dashboard → Recipes → Dashboard → Inquiries → Dashboard → Financials → Dashboard | 7                 |

## Reading the Output

Each test prints a checkpoint trend table:

```
========================================================================
SOAK TEST REPORT: Dashboard → Events
========================================================================
Status:      PASSED
Iterations:  100

Baseline (iteration 0):
  Heap:       12.4 MB
  DOM nodes:  847

Final (iteration 100):
  Heap:       18.2 MB (1.47x)
  DOM nodes:  891 (1.05x)
  Cycle time: 3240ms
  Errors:     0
  Requests:   3200 (0 failed)

Checkpoint trend:
  Iter |        Heap | DOM    | Cycle ms | Errors
  --------------------------------------------------------
     0 |     12.4 MB |    847 |        0 | 0
    10 |     14.1 MB |    852 |     3100 | 0
    20 |     15.2 MB |    859 |     3150 | 0
   ...
   100 |     18.2 MB |    891 |     3240 | 0
========================================================================
```

**What to look for:**

- **Heap column trending upward linearly** = memory leak (each cycle adds leaked bytes)
- **Heap stabilizing** = healthy (GC reclaims everything)
- **DOM count growing** = components not cleaning up
- **Cycle time increasing** = accumulated state slowing down renders
- **Errors appearing mid-run** = state corruption after sustained use

## Configuration

| Env Variable               | Default | Description                             |
| -------------------------- | ------- | --------------------------------------- |
| `SOAK_ITERATIONS`          | 100     | Number of workflow repetitions per test |
| `SOAK_CHECKPOINT_INTERVAL` | 10      | Measure metrics every N iterations      |

## Technical Notes

- **Production build required** — soak tests use `next start` (not `next dev`) because the dev server's on-demand compilation and HMR overhead causes false timeouts after sustained navigation. A production build eliminates this variable, isolating real memory/DOM behavior
- **Dedicated config** — `playwright.soak.config.ts` runs `next start` on port 3200, separate from the dev server on port 3100. This means soak tests and dev work can coexist
- **CDP (Chrome DevTools Protocol)** is used instead of the `performance.measureUserAgentSpecificMemory()` JS API because the API requires `Cross-Origin-Opener-Policy` headers that would break Supabase auth
- **Chromium only** — CDP is not available in Firefox or WebKit. Soak tests only need one engine since they measure resource behavior, not cross-browser rendering
- **Read-only navigation** — soak tests don't create, update, or delete data. They use `page.goto()` for deterministic routing instead of clicking links
- **Single browser context** — the same `page` object is reused for all iterations, accumulating state exactly like a real user session
- **GC is forced before each checkpoint** — `HeapProfiler.collectGarbage` ensures measurements reflect retained memory, not uncollected garbage
- **`waitUntil: 'commit'`** — the fastest navigation checkpoint, fires when the server responds. More reliable than `domcontentloaded` under memory pressure. A settling delay after navigation lets React hydrate

## When to Run

- **Before every merge to main** — catches leaks before they reach production
- **After adding new React context providers** — providers that persist across navigation are common leak sources
- **After adding event listeners or subscriptions** — `useEffect` cleanup bugs are the #1 cause of browser memory leaks
- **Periodically (weekly/monthly)** — catches gradual accumulation from small changes over time

## Files

| File                                      | Purpose                                                       |
| ----------------------------------------- | ------------------------------------------------------------- |
| `playwright.soak.config.ts`               | Dedicated Playwright config (port 3200, next start)           |
| `tests/soak/soak-utils.ts`                | Core utility: metrics collector, report generator, thresholds |
| `tests/soak/01-dashboard-events.spec.ts`  | Events workflow soak test                                     |
| `tests/soak/02-dashboard-clients.spec.ts` | Clients workflow soak test                                    |
| `tests/soak/03-dashboard-browse.spec.ts`  | Multi-page browsing soak test                                 |

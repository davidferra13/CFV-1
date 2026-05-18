# ORCHESTRATION MISSION: Chef Portal Performance Optimization

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `app/(chef)/layout.tsx` (layout architecture, caching strategy)
- `app/(chef)/dashboard/loading.tsx` (reference loading skeleton pattern: ContextLoader + Bone component)
- `app/(chef)/clients/loading.tsx` (reference list-page loading skeleton)
- `app/(chef)/error.tsx` (reference error boundary pattern)
- `app/(chef)/events/loading.tsx` (reference detail-page loading skeleton)

## Session Decisions (Do Not Re-Debate)

- Chef portal layout is WELL OPTIMIZED: 13 parallelized cached fetches, dynamic imports for non-critical widgets. Do not touch layout.tsx.
- Error boundaries are COMPLETE: 18 error.tsx files + root covers all 687 routes. No work needed.
- 81% server components (852/1050). Ratio is excellent. Do not convert anything.
- Focus is on three gaps: loading skeletons, Suspense streaming, next/image conversion.

## Loading Skeleton Pattern (All Agents Must Follow)

Every loading.tsx uses this exact pattern:

```tsx
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { ContextLoader } from '@/components/ui/context-loader'

function Bone({ className }: { className: string }) {
  return <div className={`loading-bone loading-bone-dark ${className}`} />
}

export default function XxxLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-xxx" size="sm" />
      {/* Match the real page's layout structure */}
    </div>
  )
}
```

Rules:

- `contextId` matches the route name (e.g., `nav-settings` for `/settings`)
- Skeleton must match real page layout (read the page.tsx first)
- List pages: show 5-9 skeleton rows in a Card
- Detail pages: show header bone + 3-4 card skeletons
- Form pages: show labeled field bones
- Dashboard/grid pages: show stat card grid + main content area
- No comments except the file header line
- Import only what you use (Card, CardContent, CardHeader, ContextLoader)

## Wave 1: High-Traffic Loading Skeletons (Parallel - Launch Immediately)

### Agent 1: Settings & Finance Loading Skeletons

- **Model:** haiku
- **Task:** Generate loading.tsx for all routes under `app/(chef)/settings/` (95 missing) and `app/(chef)/finance/` (71 missing). Read each page.tsx first to match its layout. Use the Bone+ContextLoader pattern from the reference files. Group sub-routes that share identical layouts under one parent loading.tsx where possible.
- **Read first:** `app/(chef)/dashboard/loading.tsx`, `app/(chef)/clients/loading.tsx`, then each page.tsx in settings/ and finance/ before generating its skeleton.
- **Done when:** Every route in settings/ and finance/ has loading.tsx coverage (own file or inherited from parent). No TypeScript errors.

### Agent 2: Events & Culinary Loading Skeletons

- **Model:** haiku
- **Task:** Generate loading.tsx for all routes under `app/(chef)/events/` (54 missing) and `app/(chef)/culinary/` (46 missing). Read each page.tsx first. Match layout structure. These are critical high-traffic chef workflows.
- **Read first:** `app/(chef)/events/loading.tsx`, `app/(chef)/events/[id]/loading.tsx`, `app/(chef)/culinary/loading.tsx`, then each missing page.tsx.
- **Done when:** Every route in events/ and culinary/ has loading.tsx coverage. No TypeScript errors.

### Agent 3: Clients & Commerce Loading Skeletons

- **Model:** haiku
- **Task:** Generate loading.tsx for all routes under `app/(chef)/clients/` (40 missing) and `app/(chef)/commerce/` (20 missing). Read each page.tsx first. Client pages are list+detail patterns. Commerce pages are form+dashboard patterns.
- **Read first:** `app/(chef)/clients/loading.tsx`, `app/(chef)/clients/[id]/loading.tsx`, then each missing page.tsx.
- **Done when:** Every route in clients/ and commerce/ has loading.tsx coverage. No TypeScript errors.

### Agent 4: Analytics, Inventory & Stations Loading Skeletons

- **Model:** haiku
- **Task:** Generate loading.tsx for routes under `app/(chef)/analytics/` (19 missing), `app/(chef)/inventory/` (18 missing), and `app/(chef)/stations/` (18 missing). Analytics pages are chart+table layouts. Inventory is list+detail. Read each page.tsx first.
- **Read first:** `app/(chef)/analytics/loading.tsx`, then each missing page.tsx in analytics/, inventory/, stations/.
- **Done when:** All routes in these three domains have loading.tsx coverage. No TypeScript errors.

## Wave 2: Remaining Domain Loading Skeletons (Parallel - After Wave 1 Verified)

### Agent 5: Cannabis, Marketing, Staff, Community, Ops Loading Skeletons

- **Model:** haiku
- **Task:** Generate loading.tsx for: cannabis/ (13), marketing/ (13), staff/ (9), community/ (8), ops/ (8), partners/ (8), prospecting/ (8). Read each page.tsx first. Many of these are simpler list or single-card layouts.
- **Read first:** Reference loading.tsx files from Wave 1 output, then each missing page.tsx.
- **Done when:** All routes in these domains have loading.tsx coverage. No TypeScript errors.

### Agent 6: Small Domain Loading Skeletons (Bulk Sweep)

- **Model:** haiku
- **Task:** Generate loading.tsx for ALL remaining chef portal routes that still lack one. This covers: menus/ (7), network/ (7), onboarding/ (7), recipes/ (7), safety/ (7), quotes/ (8), inquiries/ (6), explore/ (5), leads/ (5), loyalty/ (5), locations/ (4), calls/ (3), import/ (3), inbox/ (3), meal-prep/ (3), prices/ (3), proposals/ (3), tasks/ (3), vendors/ (3), calendar/ (2), chef/ (2), communication/ (2), content/ (2), contracts/ (2), expenses/ (2), guests/ (2), help/ (2), remy/ (2), and all domains with 1 missing route. Read each page.tsx first.
- **Read first:** Existing loading.tsx files in each domain (if any), then each missing page.tsx.
- **Done when:** `find app/(chef) -name page.tsx | wc -l` equals `find app/(chef) -name loading.tsx | wc -l` (or close, accounting for pages that correctly inherit). No TypeScript errors.

## Wave 3: Suspense Streaming & Image Optimization (Parallel - After Wave 2 Verified)

### Agent 7: Suspense Streaming for Top 10 Pages

- **Model:** opus
- **Task:** Add `<Suspense>` boundaries to the 10 highest-traffic server component pages that currently load atomically. Wrap independent data-fetching sections so they stream progressively. Target pages: dashboard, events/[id], clients/[id], calendar, recipes, menus/[id], quotes/[id], inquiries/[id], finance, analytics. Each page should have 2-4 Suspense boundaries around independent data sections, with inline skeleton fallbacks.
- **Read first:** `app/(chef)/dashboard/page.tsx`, `app/(chef)/calendar/page.tsx`, `app/(chef)/analytics/page.tsx` (these already use Suspense, use as reference pattern). Then read each target page.
- **Done when:** Each of the 10 target pages has Suspense boundaries around independent data sections. Pages still render correctly. No TypeScript errors.

### Agent 8: next/image Conversion

- **Model:** haiku
- **Task:** Find all `<img` tags in `app/(chef)/` and convert to `next/image` `<Image>` component. Currently only 5 files use next/image. Add `width`, `height` (or `fill` for responsive), and `alt` attributes. For avatar/profile images use `sizes="40px"` or appropriate size. For larger images, add `priority` only if above-the-fold.
- **Read first:** `app/(chef)/culinary/recipes/page.tsx` and `app/(chef)/settings/profile/profile-form.tsx` (existing next/image usage as reference).
- **Done when:** `grep -r '<img ' app/(chef)/ --include='*.tsx' | wc -l` returns 0. All converted to next/image. No TypeScript errors.

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` on completion
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After each wave: `npx tsc --noEmit --skipLibCheck` must pass across entire project
- After final wave: start dev server on localhost:3100, navigate to 5+ routes, verify loading skeletons appear during navigation, verify images load correctly
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, spot-check 3 random loading.tsx files per agent).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work with message `perf: chef portal loading skeletons, Suspense streaming, next/image conversion`, push.

## Expected Outcome

- **Before:** 99 loading.tsx for 687 routes (14% coverage)
- **After:** ~687 loading.tsx (100% coverage, some routes sharing parent skeletons)
- **Before:** ~20 pages with Suspense streaming
- **After:** ~30 pages with Suspense streaming (top 10 added)
- **Before:** 5 files using next/image
- **After:** All chef portal images using next/image

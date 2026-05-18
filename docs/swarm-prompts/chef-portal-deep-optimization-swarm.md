# ORCHESTRATION MISSION: Chef Portal Deep Optimization (Phase 2)

> This is the SECOND optimization swarm. The first swarm (chef-portal-optimization-swarm.md) handles loading skeletons, Suspense streaming, and next/image. This swarm tackles different layers.

## Context Load (Read These First)

- `CLAUDE.md` (auto-loaded)
- `app/(chef)/layout.tsx` (provider stacking, 23 Provider references, 7 wrapping children)
- `app/globals.css` (2,968 lines, 45 @keyframes, 205 unique class selectors)
- `app/(chef)/reminders/reminders-client.tsx` (1,043 lines, largest client component)
- `lib/chef/actions.ts` (uncached data fetchers)
- `lib/chef/layout-data-cache.ts` (existing cache pattern to follow)

## Session Decisions (Do Not Re-Debate)

- Layout data fetching is WELL OPTIMIZED (13 parallelized Promise.all, unstable_cache). Do not restructure layout fetching.
- date-fns barrel imports (`from 'date-fns'`) are fine. Next.js tree-shakes them correctly. Do not convert to subpath imports.
- No recharts in the codebase. No heavy charting library to worry about.
- Middleware is 292 lines, clean. Do not touch middleware.
- Server/client split (81/19%) is excellent. Do not convert components between server/client.

---

## Wave 1: Page Metadata + Provider Consolidation (Parallel - Launch Immediately)

### Agent 1: Page Metadata for All Missing Pages

- **Model:** haiku
- **Task:** 179 pages under `app/(chef)/` are missing `export const metadata`. Add metadata to every page that lacks it. The metadata should set `title` based on the page's purpose (read the component name and content to determine). Format: `export const metadata = { title: 'Page Name | ChefFlow' }`. For dynamic pages with `[id]` params, use `generateMetadata` instead with the entity name.
- **Read first:** Find 3 existing pages that already export metadata to see the pattern. Then systematically process each domain directory.
- **Done when:** `grep -rL 'export.*metadata\|generateMetadata' app/(chef)/ --include='page.tsx' | wc -l` returns 0 (or near-zero for pages where metadata genuinely doesn't apply). No TypeScript errors.

### Agent 2: Provider Consolidation

- **Model:** opus
- **Task:** The chef layout wraps children in 7 nested providers (AppContextProvider > FormatProviderWrapper > PermissionProvider > OfflineProvider > SidebarProvider > NavigationPendingProvider > NotificationProvider). Create a single `ChefProviders` component at `components/providers/chef-providers.tsx` that composes all 7 providers. This component accepts all the props currently threaded through the layout and renders the provider stack internally. Then update `app/(chef)/layout.tsx` to use `<ChefProviders ...props>{children}</ChefProviders>` instead of the 7-deep nesting. This is a pure refactor; behavior must be identical.
- **Read first:** `app/(chef)/layout.tsx` (lines 200-360 for the full provider tree). Each provider's source file to understand its props interface.
- **Done when:** Layout uses single `<ChefProviders>` wrapper. All 7 providers still render in correct order. No TypeScript errors. No behavior change.

### Agent 3: React cache() Request Deduplication

- **Model:** opus
- **Task:** Only 4 files in `lib/` use React's `cache()` for request-level deduplication. Many data fetchers in `lib/chef/actions.ts` (getChefPreferences, getChefPrimaryNavHrefs, getMenuEngineFeatures, getBusinessMode, getRegionalSettings) are called from multiple server components in the same render tree but are NOT wrapped in `cache()`. Wrap frequently-called read-only data fetchers with React `cache()` so duplicate calls in the same request are deduplicated automatically. Target files:
  - `lib/chef/actions.ts` (5+ uncached getters)
  - `lib/chef/cannabis-actions.ts` (5+ uncached getters)
  - `lib/chef/cannabis-batch-record-actions.ts` (2 uncached getters)
  - Any other `lib/` files with `async function get*` that are imported by multiple server components
- **Read first:** `lib/features/chef-feature-flags.ts` and `lib/auth/permissions.ts` (existing `cache()` usage as reference). `lib/chef/layout-data-cache.ts` (shows when to use `unstable_cache` vs `cache()`).
- **Done when:** All frequently-called read-only data fetchers wrap their implementation with React `cache()`. Existing `unstable_cache` usage is NOT changed (different purpose). No TypeScript errors.

## Wave 2: Client Component Splitting + CSS Audit (Parallel - After Wave 1 Verified)

### Agent 4: Split Mega Client Components

- **Model:** opus
- **Task:** Five client components exceed 500 lines and ship as monolithic JS bundles. Split each into smaller sub-components that can be lazy-loaded or code-split. Target files and strategy:
  1. **`app/(chef)/reminders/reminders-client.tsx`** (1,043 lines) - Split into: ReminderList, ReminderForm, ReminderFilters, ReminderSnooze. Main component imports sub-components.
  2. **`app/(chef)/menus/menus-client-wrapper.tsx`** (941 lines) - Split into: MenuList, MenuEditor, MenuFilters, MenuActions. Lazy-load editor with `dynamic()`.
  3. **`app/(chef)/notifications/notification-list-client.tsx`** (801 lines) - Split into: NotificationGroup, NotificationItem, NotificationFilters. Virtualize if list is long.
  4. **`app/(chef)/remy/remy-chat-client.tsx`** (760 lines) - Split into: ChatMessageList, ChatInput, ChatSuggestions, ChatHistory. Keep streaming logic in main component.
  5. **`app/(chef)/activity/activity-page-client.tsx`** (636 lines) - Split into: ActivityFeed, ActivityFilters, ActivityItem. Lazy-load filters.

  For each: create sub-components in the same directory as siblings (e.g., `reminder-list.tsx`, `reminder-form.tsx`). Keep `'use client'` only on components that need interactivity. Extract pure display sub-components as server components where possible.

- **Read first:** Each of the 5 target files in full. Understand the state flow and which parts are interactive vs. display-only.
- **Done when:** No client component exceeds 400 lines. Sub-components are in the same directory. Parent component orchestrates via imports (static or dynamic). No TypeScript errors. No behavior change.

### Agent 5: CSS Dead Code Audit + Cleanup

- **Model:** opus
- **Task:** `app/globals.css` is 2,968 lines with 45 @keyframes animations and 205 unique class selectors. Audit for dead CSS:
  1. Extract all class selectors from globals.css
  2. Search the codebase for each selector usage (grep across all .tsx/.ts/.css files)
  3. Identify selectors with ZERO references in any source file
  4. Remove dead selectors, dead @keyframes, and dead media queries
  5. DO NOT remove: loading-bone classes (used by loading skeletons), any class referenced in JS via string interpolation, any Tailwind `@apply` targets, any class used in globals.css itself (e.g., nested selectors)
  6. Report: list of removed selectors and estimated line reduction

  Be conservative. If uncertain whether a class is used, keep it.

- **Read first:** `app/globals.css` in full. `tailwind.config.ts` for custom class definitions.
- **Done when:** globals.css has no dead selectors. File is smaller. No visual regressions (spot-check 3 pages in browser). No build errors.

### Agent 6: Server Action File Splitting

- **Model:** haiku
- **Task:** Six server action files exceed 1,400 lines. Split each into focused sub-modules:
  1. **`lib/vendors/document-intake-actions.ts`** (1,852 lines) - Split by document type (receipts, invoices, contracts, general)
  2. **`lib/prospecting/scrub-actions.ts`** (1,770 lines) - Split by scrub stage (ingest, validate, enrich, deduplicate)
  3. **`lib/commerce/checkout-actions.ts`** (1,731 lines) - Split by checkout phase (cart, payment, fulfillment, refund)
  4. **`lib/social/chef-social-actions.ts`** (1,684 lines) - Split by platform (posts, comments, follows, sharing)
  5. **`lib/hub/meal-board-actions.ts`** (1,649 lines) - Split by feature (board CRUD, entries, assignments, sharing)
  6. **`lib/network/collab-actions.ts`** (1,531 lines) - Split by entity (collaborations, invitations, permissions, messages)

  For each: create a directory (e.g., `lib/vendors/document-intake/`) with focused sub-files. Create an `index.ts` barrel that re-exports everything so existing imports don't break. Move `'use server'` directive to each sub-file that has mutations.

- **Read first:** Each target file to understand its logical groupings. Check all import sites to ensure barrel re-export won't break anything.
- **Done when:** No action file exceeds 600 lines. All existing imports still resolve. `'use server'` directives are correct on all mutation files. No TypeScript errors.

## Wave 3: Verification + Bundle Analysis (Sequential - After Wave 2 Verified)

### Agent 7: Full Verification Pass

- **Model:** opus
- **Task:** Verify all optimizations from Waves 1-2:
  1. `npx tsc --noEmit --skipLibCheck` passes
  2. `npx next build --no-lint` succeeds (confirms no broken imports from server action splitting)
  3. Start dev server on localhost:3100, navigate to 10 diverse pages, verify:
     - Browser tab titles show page-specific names (metadata working)
     - No console errors from provider consolidation
     - No visual regressions from CSS cleanup
     - Client components still interactive (reminders, menus, notifications, remy, activity)
  4. Check bundle: `ls -la .next/static/chunks/` to confirm no mega-chunks from split components
  5. Report: what passed, what failed, what needs follow-up
- **Read first:** The output/commits from all Wave 1-2 agents.
- **Done when:** Full verification report written. All checks pass or failures are documented with fix recommendations.

## Verification Protocol

- Each agent runs `npx tsc --noEmit --skipLibCheck` on completion
- Orchestrator does NOT build. Orchestrator dispatches, monitors, verifies.
- After each wave: type check must pass across entire project
- Provider consolidation: verify by navigating 5 pages, checking React DevTools shows same provider tree
- CSS cleanup: visual spot-check on dashboard, events/[id], clients, calendar, settings
- Anti-Loop: 3 strikes on same error = stop, report, let developer decide

## Orchestrator Rules

1. You are the COORDINATOR. You do not write implementation code.
2. Dispatch agents via the Agent tool with appropriate model tier.
3. After dispatching a wave, wait for all agents to complete.
4. Verify each agent's output (type check, spot-check affected files).
5. Only proceed to next wave after current wave is fully verified.
6. If an agent fails: diagnose, give it one retry with better context, then flag.
7. At completion: commit all work with message `perf: metadata, provider consolidation, cache dedup, component splitting, CSS cleanup, action splitting`, push.

## Expected Outcome

| Metric                           | Before        | After                             |
| -------------------------------- | ------------- | --------------------------------- |
| Pages with metadata              | 508/687 (74%) | 687/687 (100%)                    |
| Provider nesting depth in layout | 7 levels      | 1 (`<ChefProviders>`)             |
| Files using React cache()        | 4             | 20+                               |
| Largest client component         | 1,043 lines   | <400 lines                        |
| globals.css size                 | 2,968 lines   | ~2,200 lines (est. 25% reduction) |
| Largest server action file       | 1,852 lines   | <600 lines                        |

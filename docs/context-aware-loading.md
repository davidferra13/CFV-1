# Context-Aware Loading Animation System

**Date:** 2026-03-15
**Status:** End-to-end integration complete

## What Changed

ChefFlow's loading states previously used generic `animate-pulse` bones and `Loader2 animate-spin` spinners everywhere. Users had no idea what was actually happening during waits. This system replaces that with task-specific, context-aware loading that tells users exactly what's being processed.

## Architecture

### Loading Registry (`lib/loading/loading-registry.ts`)

Single source of truth for every named loading context in the app. Each entry has:

- **id** - unique key (e.g., `nav-dashboard`, `ai-allergen-check`, `gen-pdf-menu`)
- **name** - human-readable label
- **category** - one of: `navigation`, `ai`, `data`, `upload`, `search`, `sync`, `financial`, `generation`, `import`, `auth`
- **visual** - rendering style: `skeleton`, `remy`, `spinner`, `progress`, `dots`, `pulse`
- **messages[]** - rotating context-specific messages users see while waiting
- **usedIn[]** - file paths where this context is referenced
- **expectedDuration** - `instant` | `short` | `medium` | `long`

### Components

| Component       | File                               | Purpose                                                                                                                                  |
| --------------- | ---------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `ContextLoader` | `components/ui/context-loader.tsx` | Full-featured loader with rotating messages, category icons, elapsed timer, progress bars. Use for page-level and section-level loading. |
| `InlineLoader`  | `components/ui/context-loader.tsx` | Tiny inline variant for table cells, badges, small UI slots.                                                                             |
| `TaskLoader`    | `components/ui/task-loader.tsx`    | Button-level inline loader. Drop-in replacement for the `Loader2 + text` pattern.                                                        |
| `RemyLoader`    | `components/ui/remy-loader.tsx`    | Remy-branded loader (updated to support `contextId` for rotating messages).                                                              |
| Presets         | `components/ui/task-loader.tsx`    | `SavingLoader`, `DeletingLoader`, `SendingLoader`, `GeneratingLoader`, `AnalyzingLoader`, `UploadingLoader`, `ProcessingLoader`          |

### Visual Types

| Visual     | When to use                        | What it looks like                         |
| ---------- | ---------------------------------- | ------------------------------------------ |
| `skeleton` | Page navigation, data tables       | Bone placeholders matching page layout     |
| `remy`     | AI operations, document generation | Remy mascot bobbing with rotating messages |
| `spinner`  | Quick data mutations, saves        | Ring spinner with category icon            |
| `progress` | File uploads, sync operations      | Progress bar with percentage               |
| `dots`     | Search, quick lookups              | Bouncing dots                              |
| `pulse`    | Real-time connection status        | Pulsing/pinging dot                        |

## Usage Examples

### Page-level loading (loading.tsx)

```tsx
import { ContextLoader } from '@/components/ui/context-loader'

export default function DashboardLoading() {
  return (
    <div className="space-y-6">
      <ContextLoader contextId="nav-dashboard" size="sm" />
      {/* ...skeleton bones below... */}
    </div>
  )
}
```

### Button loading (replacing Loader2)

```tsx
import { TaskLoader } from '@/components/ui/task-loader'
;<Button disabled={isPending}>
  {isPending ? <TaskLoader contextId="data-save-event" /> : 'Save Event'}
</Button>
```

### Preset loaders (no context ID needed)

```tsx
import { SavingLoader, GeneratingLoader } from '@/components/ui/task-loader'
;<Button disabled={saving}>{saving ? <SavingLoader what="recipe" /> : 'Save Recipe'}</Button>
```

### AI panel loading (with Remy)

```tsx
import { RemyLoader } from '@/components/ui/remy-loader'

{
  isProcessing && <RemyLoader contextId="ai-allergen-check" />
}
```

### Long operation with elapsed timer

```tsx
<ContextLoader contextId="ai-business-insights" showElapsed />
```

### Progress bar for uploads

```tsx
<ContextLoader contextId="upload-photo" progress={uploadPercent} />
```

## Loading Contexts (Complete Enumeration)

### Navigation (29 contexts)

| ID                   | Name           | Messages                                                                           |
| -------------------- | -------------- | ---------------------------------------------------------------------------------- |
| `nav-dashboard`      | Dashboard      | Loading your dashboard, Pulling today's schedule, Gathering your business snapshot |
| `nav-events`         | Events List    | Loading your events, Fetching event details                                        |
| `nav-event-detail`   | Event Detail   | Loading event details, Pulling financials and timeline                             |
| `nav-clients`        | Clients List   | Loading your clients, Fetching client list                                         |
| `nav-client-detail`  | Client Profile | Loading client profile, Pulling event history and preferences                      |
| `nav-recipes`        | Recipe Book    | Opening your recipe book, Loading recipes and categories                           |
| `nav-menus`          | Menus          | Loading your menus, Pulling menu details                                           |
| `nav-finance`        | Finance Hub    | Crunching your numbers, Loading financial overview, Computing ledger balances      |
| `nav-quotes`         | Quotes         | Loading your quotes, Fetching quote details                                        |
| `nav-inquiries`      | Inquiries      | Loading inquiries, Checking for new leads                                          |
| `nav-calendar`       | Calendar       | Loading your calendar, Pulling schedule data                                       |
| `nav-inbox`          | Inbox          | Loading your inbox, Fetching conversations                                         |
| `nav-analytics`      | Analytics      | Computing analytics, Analyzing your data, Building reports                         |
| `nav-inventory`      | Inventory      | Loading inventory, Checking stock levels                                           |
| `nav-staff`          | Staff          | Loading your team, Fetching staff details                                          |
| `nav-settings`       | Settings       | Loading settings                                                                   |
| `nav-marketing`      | Marketing      | Loading marketing tools, Pulling campaign data                                     |
| `nav-leads`          | Leads          | Loading your leads, Scoring prospects                                              |
| `nav-vendors`        | Vendors        | Loading vendor list                                                                |
| `nav-network`        | Chef Network   | Loading your network, Connecting with chefs                                        |
| `nav-tasks`          | Tasks          | Loading your tasks                                                                 |
| `nav-notifications`  | Notifications  | Loading notifications                                                              |
| `nav-operations`     | Operations     | Loading operations, Pulling prep timelines                                         |
| `nav-loyalty`        | Loyalty        | Loading loyalty data, Calculating client tiers                                     |
| `nav-reviews`        | Reviews        | Loading reviews                                                                    |
| `nav-travel`         | Travel         | Loading travel log, Calculating mileage                                            |
| `nav-admin`          | Admin Panel    | Loading admin panel                                                                |
| `nav-client-portal`  | Client Portal  | Loading your portal, Pulling your events and details                               |
| `nav-public-booking` | Public Booking | Loading booking form                                                               |

### AI Operations (11 contexts)

| ID                         | Name                       | Visual | Duration | Messages                                                                                         |
| -------------------------- | -------------------------- | ------ | -------- | ------------------------------------------------------------------------------------------------ |
| `ai-remy-thinking`         | Remy Thinking              | remy   | medium   | Remy is thinking, Processing your request, Working on it                                         |
| `ai-remy-command`          | Remy Command Execution     | remy   | medium   | Running your command, Executing action, On it                                                    |
| `ai-business-insights`     | Business Insights Analysis | remy   | long     | Analyzing your business data, Running the numbers locally, Building insights from your history   |
| `ai-aar-generation`        | After-Action Review        | remy   | long     | Reviewing event performance, Analyzing what went well, Drafting your after-action review         |
| `ai-allergen-check`        | Allergen Risk Analysis     | remy   | medium   | Scanning for allergen risks, Cross-referencing dietary restrictions, Checking ingredient safety  |
| `ai-contingency`           | Contingency Planning       | remy   | medium   | Building contingency plans, Evaluating backup options                                            |
| `ai-grocery-consolidation` | Grocery List Consolidation | remy   | medium   | Consolidating your grocery list, Merging ingredients across menus, Optimizing your shopping trip |
| `ai-chef-bio`              | Bio Generation             | remy   | medium   | Crafting your bio, Writing your story                                                            |
| `ai-lead-scoring`          | Lead Scoring               | dots   | instant  | Scoring this lead, Evaluating conversion signals                                                 |
| `ai-campaign-draft`        | Campaign Draft             | remy   | medium   | Drafting campaign concept, Building outreach copy                                                |
| `ai-depreciation`          | Depreciation Explanation   | remy   | medium   | Calculating depreciation, Explaining the math                                                    |

### Data Mutations (10 contexts)

| ID                      | Name                   | Messages                                     |
| ----------------------- | ---------------------- | -------------------------------------------- |
| `data-save-event`       | Save Event             | Saving event                                 |
| `data-save-client`      | Save Client            | Saving client                                |
| `data-save-recipe`      | Save Recipe            | Saving recipe                                |
| `data-save-menu`        | Save Menu              | Saving menu                                  |
| `data-save-quote`       | Save Quote             | Saving quote                                 |
| `data-transition-event` | Event State Transition | Updating event status, Processing transition |
| `data-record-payment`   | Record Payment         | Recording payment, Updating ledger           |
| `data-send-invoice`     | Send Invoice           | Sending invoice, Preparing email             |
| `data-delete`           | Delete Record          | Deleting                                     |
| `data-save-settings`    | Save Settings          | Saving settings                              |

### File Uploads (3 contexts)

| ID                 | Name             | Messages                                 |
| ------------------ | ---------------- | ---------------------------------------- |
| `upload-photo`     | Photo Upload     | Uploading photo, Processing image        |
| `upload-receipt`   | Receipt Upload   | Uploading receipt, Scanning receipt data |
| `upload-menu-file` | Menu File Upload | Uploading menu file, Processing document |

### Search (3 contexts)

| ID               | Name          | Messages          |
| ---------------- | ------------- | ----------------- |
| `search-global`  | Global Search | Searching         |
| `search-recipes` | Recipe Search | Searching recipes |
| `search-clients` | Client Search | Searching clients |

### Sync (3 contexts)

| ID              | Name                 | Visual   | Messages                                                       |
| --------------- | -------------------- | -------- | -------------------------------------------------------------- |
| `sync-gmail`    | Gmail Sync           | progress | Syncing your inbox, Pulling new emails, Scanning for inquiries |
| `sync-calendar` | Calendar Sync        | spinner  | Syncing calendar, Updating schedule                            |
| `sync-realtime` | Real-time Connection | pulse    | Connecting                                                     |

### Financial (6 contexts)

| ID                         | Name                      | Messages                                                                     |
| -------------------------- | ------------------------- | ---------------------------------------------------------------------------- |
| `finance-ledger-compute`   | Ledger Computation        | Computing balances, Reconciling ledger entries                               |
| `finance-report`           | Financial Report          | Building your financial report, Aggregating transactions, Calculating P&L    |
| `finance-break-even`       | Break-Even Analysis       | Running break-even analysis, Calculating fixed and variable costs            |
| `finance-menu-engineering` | Menu Engineering Analysis | Running menu engineering analysis, Classifying Stars/Plowhorses/Puzzles/Dogs |
| `finance-mileage`          | Mileage Calculation       | Calculating mileage deductions, Totaling travel expenses                     |
| `finance-tip-request`      | Tip Request               | Sending tip request, Generating tip link                                     |

### Document Generation (5 contexts)

| ID                 | Name                | Visual  | Messages                                                                          |
| ------------------ | ------------------- | ------- | --------------------------------------------------------------------------------- |
| `gen-pdf-menu`     | Menu PDF            | remy    | Generating your menu PDF, Laying out courses and dishes, Formatting for print     |
| `gen-pdf-invoice`  | Invoice PDF         | spinner | Generating invoice, Building line items                                           |
| `gen-allergy-card` | Allergy Card        | remy    | Creating allergy card, Formatting dietary restrictions, Building safety reference |
| `gen-contract`     | Contract Generation | remy    | Drafting your contract, Building terms and conditions                             |
| `gen-packing-list` | Packing List        | spinner | Building your packing list, Organizing by station                                 |

### Import Operations (2 contexts)

| ID                  | Name                  | Visual | Messages                                                                              |
| ------------------- | --------------------- | ------ | ------------------------------------------------------------------------------------- |
| `import-recipe`     | Recipe Import         | remy   | Parsing your recipe, Extracting ingredients and steps, Structuring recipe data        |
| `import-brain-dump` | Brain Dump Processing | remy   | Processing your brain dump, Extracting clients/events/notes, Organizing your thoughts |

### Auth (2 contexts)

| ID             | Name    | Messages                                         |
| -------------- | ------- | ------------------------------------------------ |
| `auth-sign-in` | Sign In | Signing you in, Verifying credentials            |
| `auth-sign-up` | Sign Up | Creating your account, Setting up your workspace |

## Rollout Plan

Phase 1 (done): Registry + components + 6 key loading.tsx files updated (dashboard, events, finance, recipes, inquiries, analytics).

Phase 2 (next): Update remaining 80 loading.tsx files to use `ContextLoader`. Update AI panel buttons to use `TaskLoader` presets instead of raw `Loader2`.

Phase 3 (future): Add real progress tracking for upload and sync operations. Add step-by-step progress for multi-stage operations (e.g., recipe import: parsing > extracting > saving).

## Phase 2: Transitions, Multi-Step Progress, and Error States (2026-03-15)

### FadeIn Transition Wrapper (`components/ui/fade-in.tsx`)

Smooth skeleton-to-content transition. Wrap page content so it fades/slides in when the skeleton is replaced by real data.

```tsx
import { FadeIn } from '@/components/ui/fade-in'

export default function EventsPage() {
  return <FadeIn>...real page content...</FadeIn>
}
```

**Variants:** `fade` (opacity only), `slide-up` (default, opacity + translateY), `scale` (opacity + scale)
**FadeInStagger:** For lists/grids where each child animates sequentially with staggered delay.

```tsx
<FadeInStagger staggerMs={50}>
  {events.map((e) => (
    <EventCard key={e.id} event={e} />
  ))}
</FadeInStagger>
```

### StepProgress Multi-Step Indicator (`components/ui/step-progress.tsx`)

Shows which phase of a multi-phase operation is active. For recipe import, Gmail sync, contract generation, brain dump parsing.

```tsx
import { StepProgress, useStepProgress } from '@/components/ui/step-progress'

// Manual steps
;<StepProgress
  steps={[
    { label: 'Parsing recipe text', status: 'completed' },
    { label: 'Extracting ingredients', status: 'active' },
    { label: 'Saving to recipe book', status: 'pending' },
  ]}
  showRemy
/>

// Hook for automatic progression
const { steps, advance, fail, isDone } = useStepProgress([
  'Parsing recipe text',
  'Extracting ingredients',
  'Saving to recipe book',
])
// Call advance() as each step completes, fail('reason') on error
```

Features: progress bar, step-by-step list with status icons, optional Remy mascot, elapsed timer, compact mode, fail states with reason display.

### Context-Aware ErrorState (`components/ui/error-state.tsx`)

Paired companion to ContextLoader. When "Crunching your numbers..." fails, the error says "Could not load financials" (not generic "Something went wrong"). Directly enforces Zero Hallucination Law 2.

```tsx
import { ErrorState } from '@/components/ui/error-state'

// Registry-backed (automatic title + description)
<ErrorState contextId="nav-finance" onRetry={() => router.refresh()} />

// Direct message
<ErrorState title="Could not load revenue" description="Ledger data is unavailable." />
```

**InlineError:** Tiny variant for table cells and badges.

```tsx
import { InlineError } from '@/components/ui/error-state'
;<InlineError contextId="finance-ledger-compute" />
```

**DataGuard:** Wraps data fetch results. Prevents the $0-when-data-fails pattern.

```tsx
import { DataGuard } from '@/components/ui/error-state'
;<DataGuard data={revenue} loading={isLoading} contextId="nav-finance" onRetry={refetch}>
  {(data) => <RevenueChart data={data} />}
</DataGuard>
```

### Error Message Registry (`lib/loading/loading-registry.ts`)

50+ context-specific error messages added to the registry, with category-level fallbacks. AI errors automatically show an Ollama hint. Every `getErrorForContext(id)` call returns `{ title, description }`.

## Phase 3: Determinate Progress (2026-03-15)

Replaced the indeterminate back-and-forth shimmer/spinner with a clear 0-100% progress bar. Users always know approximately how far along an operation is.

### The Problem

Indeterminate loaders (shimmer, pulse, spin) loop forever with zero completion signal. Users can't tell if they're at 10% or 90%. The bar going back and forth is confusing and fails to indicate progress.

### The Solution: Simulated Progress

Most async operations (DB reads, AI calls, PDF generation) don't report real progress. But we can simulate it using an asymptotic curve calibrated to expected duration:

```text
progress = 92% * (1 - e^(-elapsed / expectedMs))
```

- **Fast start:** jumps to ~30% in the first 20% of expected time (perceived responsiveness)
- **Gradual middle:** crawls through 30-70% (the "working" phase)
- **Asymptotic cap:** approaches but never reaches 92% (never overshoots)
- **Snap to 100%:** only when the operation actually completes

### New Files

**`lib/loading/use-simulated-progress.ts`** - The core hook.

```tsx
const { progress, complete, fail, reset } = useSimulatedProgress({
  contextId: 'ai-allergen-check', // auto-calibrates from registry
})
await doSomething()
complete() // snaps to 100%
```

Or with explicit duration:

```tsx
const { progress, complete } = useSimulatedProgress({ expectedMs: 5000 })
```

**`components/ui/determinate-progress.tsx`** - Standalone progress bar component.

```tsx
// Real progress (from upload, sync, etc.)
<DeterminateProgress value={uploadPercent} label="Uploading photo..." />

// Simulated progress (auto-advancing)
<DeterminateProgress contextId="ai-allergen-check" isComplete={isDone} label="Scanning..." />
```

Features: `xs`/`sm`/`md` sizes, `brand`/`success`/`warning` color variants, auto green on complete, auto red on failure, label + percentage display.

### Updated Components

- **ContextLoader** now shows a 0-100% determinate bar instead of infinite spinner/shimmer. Simulated progress is the default; pass `progress` prop for real values, `isComplete` to snap to 100%.
- **StepProgress** now shows overall percentage alongside "Step X of Y" and turns green on completion.

## Files Created/Modified

**New files:**

- `lib/loading/loading-registry.ts` - Registry of all 74 named loading contexts + 50+ error messages
- `lib/loading/use-simulated-progress.ts` - Asymptotic progress simulation hook
- `components/ui/context-loader.tsx` - ContextLoader + InlineLoader (with determinate progress)
- `components/ui/task-loader.tsx` - TaskLoader + preset loaders
- `components/ui/fade-in.tsx` - FadeIn + FadeInStagger transition wrappers
- `components/ui/step-progress.tsx` - StepProgress + useStepProgress hook (with percentage)
- `components/ui/error-state.tsx` - ErrorState + InlineError + DataGuard
- `components/ui/determinate-progress.tsx` - Standalone determinate progress bar

**Modified files:**

- `components/ui/remy-loader.tsx` - Added `contextId` prop, rotating messages, elapsed timer
- `tailwind.config.ts` - Added `fade-in` keyframe
- `app/(chef)/dashboard/loading.tsx` - Added ContextLoader with determinate progress
- `app/(chef)/events/loading.tsx` - Added ContextLoader
- `app/(chef)/finance/loading.tsx` - Added ContextLoader
- `app/(chef)/recipes/loading.tsx` - Added ContextLoader
- `app/(chef)/inquiries/loading.tsx` - Added ContextLoader
- `app/(chef)/analytics/loading.tsx` - Added ContextLoader with elapsed timer

## End-to-End Integration (2026-03-15)

### Bulk ContextLoader rollout (40+ loading.tsx files)

All chef-section loading.tsx files now import ContextLoader with their registered context ID:

- clients, menus, quotes, calendar, schedule, inbox, staff, settings, tasks, notifications
- vendors, network, marketing, leads, loyalty, reviews, travel, operations, insights, inventory
- activity, calls, charity, culinary, financials, goals, import, partners, prospecting, queue
- social, stations, public pages, client portal, booking

### AI panel TaskLoader integration (9 panels)

Replaced `Loader2 animate-spin` with `TaskLoader` in all AI panels:

- aar-generator-panel, allergen-risk-panel, contingency-ai-panel, contract-generator-panel
- business-insights-panel, chef-bio-panel, campaign-outreach-panel
- grocery-consolidation-panel, equipment-depreciation-panel

### StepProgress in recipe import

`components/recipes/recipe-import-dialog.tsx` now shows a 3-step progress indicator during save:

1. Creating recipe record
2. Processing ingredients
3. Finalizing

Each step advances as the server action progresses, with failure states if the save fails.

### ErrorState on financial pages

- `app/(chef)/finance/overview/page.tsx` - try/catch around Promise.all, renders ErrorState on failure
- `app/(chef)/finance/overview/revenue-summary/page.tsx` - try/catch around getEvents(), renders ErrorState on failure

This prevents Zero Hallucination Law 2 violations (showing $0 when data fetch fails).

### FadeIn transitions

Smooth skeleton-to-content transitions added to:

- `app/(chef)/finance/overview/page.tsx`
- `app/(chef)/finance/overview/revenue-summary/page.tsx`
- `app/(chef)/events/page.tsx`

### What's left (future work)

- Wire FadeIn to remaining page.tsx files as needed
- Wire DataGuard into dashboard business-cards.tsx (replace `safe()` zero-fallbacks with error states)
- Add DeterminateProgress to file upload flows when upload progress events are available

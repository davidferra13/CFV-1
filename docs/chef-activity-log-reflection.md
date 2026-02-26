# Chef Activity Log — Reflection Document

## What Changed

Added a unified "Chef Command Log" system that tracks every meaningful action the chef takes across the platform, surfaces in-progress work via a "Pick Up Where You Left Off" section, and provides a dedicated Activity page with filters.

## Why

Previously, ChefFlow tracked **client** portal activity (logins, views via `activity_events`) but had no unified view of **chef** actions. A chef juggling 10+ events, multiple menus, inquiries, and communications had no way to answer "what was I doing last?" or "where should I pick up?" The existing state transition tables (`event_state_transitions`, etc.) were immutable audit logs but scattered across tables and never surfaced in a unified feed.

## What Was Built

### Database Layer

- **New table: `chef_activity_log`** — Permanent, append-only record of chef actions
  - Columns: action, domain, entity_type, entity_id, summary (human-readable), context (JSONB), client_id
  - Indexed for: tenant+time, tenant+client+time, tenant+domain+time, tenant+entity lookups
  - RLS: Chef can read own tenant, inserts via admin client only
  - No TTL (unlike `activity_events` which has 90-day cleanup)
  - Migration: `supabase/migrations/20260221000020_chef_activity_log.sql`

### Logging Utility

- **`lib/activity/log-chef.ts`** — `logChefActivity()` function
  - Non-blocking, fire-and-forget pattern (matches existing `trackActivity()`)
  - Uses admin client for universal access
  - Failures logged but never thrown

### Instrumented Server Actions (15 total)

**Phase 1 — Core operations:**

- `lib/events/transitions.ts` — Event state transitions (draft→proposed→...→completed/cancelled)
- `lib/events/actions.ts` — Event create + update
- `lib/inquiries/actions.ts` — Inquiry create + transition
- `lib/menus/actions.ts` — Menu create, update, transition
- `lib/quotes/actions.ts` — Quote create + transition
- `lib/ledger/append.ts` — Financial adjustments
- `lib/clients/actions.ts` — Client invite + update
- `lib/notes/actions.ts` — Client notes

**Phase 2 — Communication & operational:**

- `lib/chat/actions.ts` — Chat messages (chef only)
- `lib/messages/actions.ts` — CRM messages (email/text/phone)
- `lib/expenses/actions.ts` — Expense creation
- `lib/aar/actions.ts` — After-action reviews

### Query Layer

- **`lib/activity/chef-actions.ts`** — Server actions for querying chef activity
  - `getChefActivity()` — Full feed with domain/client/time filters
  - `getChefActivitySummary()` — Compact 5-item feed for dashboard
  - `getClientChefActivity()` — Client-scoped feed
  - `getActivityCountsByDomain()` — Domain badge counts

### Resume Logic

- **`lib/activity/resume.ts`** — "Pick Up Where You Left Off" computed queries
  - Pulls from: active events, draft/shared menus, active inquiries, draft/sent quotes, pinned/recent notes
  - No new table — aggregates existing data
  - Shows: entity name, status, context, last action, direct link

### UI Components

- **`components/activity/chef-activity-feed.tsx`** — Activity feed with day grouping, domain badges, context lines, entity links
- **`components/activity/resume-section.tsx`** — "Pick Up" card with status badges and entity links
- **`components/activity/activity-filters.tsx`** — Tab switcher (My/Client/All) + domain pills + time range selector
- **`components/activity/client-activity-timeline.tsx`** — Combined chef+client activity on client detail page

### Pages & Integration

- **`app/(chef)/activity/page.tsx`** — Dedicated Activity page with resume section, tabs, filters, and feed
- **Dashboard** — Added "My Recent Activity" card (3-column grid with Active Clients and Client Activity)
- **Client Detail** — Added Activity Timeline section showing combined chef+client activity
- **Navigation** — Added "Activity" to sidebar standalone items (between Queue and Network)

## Architecture Decisions

1. **Separate table from `activity_events`** — The existing table has 90-day TTL and tracks client portal interactions. Chef activity is different in nature (permanent, action-oriented, not engagement-oriented).

2. **Non-blocking everywhere** — Every `logChefActivity()` call is wrapped in try-catch. Activity logging never blocks or breaks primary business logic. This matches the established pattern in `trackActivity()`, `evaluateAutomations()`, etc.

3. **Dynamic imports** — Used `await import('@/lib/activity/log-chef')` pattern (matching automations/notifications) to avoid circular dependencies and reduce bundle impact.

4. **Computed resume section** — The "Pick Up Where You Left Off" section queries existing tables (events, menus, inquiries, quotes, notes) rather than creating new data. This means it works immediately with existing data, not just data created after the feature launches.

5. **Client-side filtering** — The Activity page fetches a larger dataset and filters client-side for domain/time range. This keeps the UX snappy (no server round-trips on filter change) while the data volume per chef is manageable.

## How It Connects

```
Chef Action (e.g., createEvent)
  └── Primary business logic executes
  └── logChefActivity() [non-blocking, fire-and-forget]
      └── INSERT chef_activity_log

/activity page
  └── getResumeItems() → queries events/menus/inquiries/quotes/notes
  └── getChefActivity() → queries chef_activity_log
  └── getRecentActivity() → queries activity_events (client side)

Dashboard
  └── getChefActivitySummary(5) → latest 5 chef actions
  └── getActiveClients() + getRecentActivity() [existing]

Client Detail
  └── getClientChefActivity(clientId) → chef actions for this client
  └── getClientTimeline(clientId) → client portal actions [existing]
```

## Future Work

- **Task/Reminder System** — A dedicated `chef_tasks` table with title, due date, linked entity, and notes. These would show prominently in the resume section as upcoming items. (Decided to defer this as a separate feature.)
- **Real-time updates** — The `chef_activity_log` table could be added to `supabase_realtime` publication for live feed updates.
- **Recipe instrumentation** — Recipe CRUD actions (`lib/recipes/actions.ts`) were not instrumented in this pass. Can be added when the recipes module is more actively used.

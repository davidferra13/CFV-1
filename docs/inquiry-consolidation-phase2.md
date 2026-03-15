# Inquiry Consolidation - Phase 2 Implementation

**Date:** 2026-03-15
**Branch:** `feature/openclaw-adoption`
**Status:** Complete

## What Changed

### 12 Commits across 5 Features

#### Feature 1: Platform Raw Feed Tab

- **`lib/inquiries/platform-raw-feed.ts`**: Server action querying `gmail_sync_log` for platform notification emails. Filters by 13 known platform sender domains, maps to display names.
- **`components/inquiries/platform-raw-feed-tab.tsx`**: Collapsible card on inquiries page showing recent platform emails with badges, subjects, timestamps, and linked inquiry indicators.
- Wired into `app/(chef)/inquiries/page.tsx` via Suspense.

#### Feature 2: Cross-Platform Client Matching

- **`lib/utils/name-matching.ts`**: Shared utility extracted from `platform-dedup.ts`. Exports `normalizeName()`, `namesMatch()`, `normalizePhone()`.
- **`lib/gmail/platform-dedup.ts`**: Refactored to import from shared utility (no behavior change).
- **`lib/clients/cross-platform-matching.ts`**: Two server actions:
  - `findPotentialClientMatches(clientId)`: email/phone/name matching across all tenant clients
  - `mergeClients(keepClientId, mergeClientId)`: moves inquiries/events/messages, soft-deletes merged client, audit logs
- **`components/clients/potential-duplicates-card.tsx`**: "Possible Duplicates" card with inline merge confirmation flow.
- Wired into `app/(chef)/clients/[id]/page.tsx` via Suspense.

#### Feature 3: Cost-Per-Lead Tracking

- **`lib/inquiries/platform-cpl.ts`**: Server actions for recording marketing spend and computing CPL/CPC per platform.
- **`components/inquiries/platform-spend-form.tsx`**: Inline form for logging platform marketing spend (channel, amount, date, notes).
- **`components/inquiries/platform-analytics-card.tsx`**: Extended with optional CPL column showing per-platform cost-per-lead.
- Migration extends `marketing_spend_log.channel` CHECK constraint with 11 marketplace platform channels.

#### Feature 4: Platform Response Time SLA Indicators

- **`lib/analytics/platform-sla.ts`**: Per-platform SLA targets (Thumbtack 2h, TakeAChef 4h, etc.) with urgency computation and aggregate stats.
- **`components/inquiries/sla-badge.tsx`**: Colored SLA indicator (green/amber/red) with compact dot mode.
- **`components/inquiries/platform-analytics-card.tsx`**: Extended with avg response time and SLA hit rate columns.

#### Feature 5: API Integration Foundation

- **`lib/integrations/platform-connections.ts`**: CRUD actions for marketplace API credentials (foundation only, no actual API calls).
- **`components/settings/platform-connection-card.tsx`**: Connection management UI with API key input, connect/disconnect flow.
- **`app/(chef)/settings/platform-connections/page.tsx`**: Settings page listing 6 marketplace platforms.
- Nav config updated with "Platform Connections" shortcut.

### Database Migration

**`supabase/migrations/20260401000058_inquiry_consolidation_phase2.sql`**:

1. Extended `marketing_spend_log.channel` CHECK constraint with marketplace platform channels
2. Created `platform_api_connections` table (chef API/OAuth credentials per platform)
3. Created `client_merge_log` table (audit trail for client merges)

## How It Connects

```
Inquiry Pipeline Page
  -> Platform Analytics Card (Phase 1)
     -> NEW: CPL column (spend / inquiries)
     -> NEW: Avg Response + SLA Hit Rate columns
  -> NEW: Platform Raw Feed (collapsible, shows recent platform emails)
  -> NEW: Spend Recording Form (log platform marketing costs)

Client Detail Page
  -> NEW: Possible Duplicates Card (email/phone/name matching)
     -> Merge confirmation flow (moves all records, audit log)

Settings
  -> NEW: Platform Connections page (API key storage, connection status)
```

## What's Deferred

1. **Revenue-based ROI**: CPL tracks spend and inquiries but doesn't yet compute revenue from converted events. ROI column shows null.
2. **Actual API integrations**: Platform connections page stores credentials but doesn't make API calls. Thumbtack Pro API and Google Business Profile API calls are deferred until API access is confirmed.
3. **SLA alerting**: SLA badges show status but don't trigger notifications when breached.
4. **Raw feed email content**: The raw feed shows subjects and metadata but doesn't display full email body content (v1 keeps it simple).
5. **Automated client matching**: Duplicates are shown on-demand per client. No batch scan across all clients yet.

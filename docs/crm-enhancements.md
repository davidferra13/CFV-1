# CRM Enhancement Features

## Overview

This document describes the CRM intelligence layer added to ChefFlow V1. These features extend the client management experience with lead scoring, churn risk detection, duplicate detection, client segmentation, and referral tree analysis.

## What Changed

### New Files

#### `lib/leads/scoring.ts`
Lead scoring engine that assigns a 0–100 score to open inquiries.

- `scoreInquiry(inquiry)` — pure function, scores a single inquiry object based on:
  - Budget size (up to +20 points)
  - Guest count (up to +10 points)
  - Lead time (days until event; +10 for >30 days, -10 for <7 days)
  - Channel — referral (+15) or repeat (+20)
  - Recency — fresh inquiry within 24h (+5)
- `getLeadScoresForChef()` — server action that fetches all non-terminal inquiries for the authenticated chef and returns scored results
- Returns a `LeadScore` with `score`, `label` (`hot`/`warm`/`cold`), and `factors` array explaining the score

#### `lib/clients/churn-score.ts`
Churn risk engine that identifies active clients who haven't had an event recently.

- `getAtRiskClients()` — server action fetching active clients with completed events
- Classifies clients as `high` risk (>180 days since last event) or `medium` risk (>90 days)
- Returns top 20 at-risk clients sorted by days since last event
- Each result includes a `suggestedAction` ("Send a personal check-in message" or "Follow up with seasonal menu ideas")

#### `lib/clients/deduplication.ts`
Duplicate client detector using exact-match heuristics.

- `findDuplicateClients()` — server action that scans all clients for the chef and finds pairs matching on:
  - Same normalized email (high confidence)
  - Same stripped phone number (high confidence)
  - Same normalized full name (medium confidence)
- Uses an O(n^2) comparison with a `seen` set to avoid duplicate pairs
- Returns up to 50 pairs

#### `lib/clients/segments.ts`
Server actions for managing chef-defined client segments.

- `getSegments()` — lists all segments for the chef
- `createSegment(input)` — validates with Zod and inserts into `client_segments`
- `deleteSegment(id)` — removes a segment (tenant-scoped for safety)
- Segments store `filters` as a JSONB array of `{field, op, value}` objects for future UI-driven filtering

#### `lib/clients/referral-tree.ts`
Referral attribution and network value calculator.

- `getClientReferralTree(clientId)` — server action returning a `ReferralNode`:
  - `referredBy` — name of the person who referred this client (from `referred_by_name`)
  - `referredClients` — list of clients this person referred, with their individual completed revenue
  - `totalRevenueCents` — revenue from this client's own completed events
  - `referralRevenueCents` — total revenue from all clients this person referred
- Enables understanding which clients are network multipliers

### New Migration

#### `supabase/migrations/20260308000001_client_segments.sql`
Creates the `client_segments` table:

```sql
CREATE TABLE IF NOT EXISTS client_segments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES chefs(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  filters JSONB NOT NULL DEFAULT '[]',
  color TEXT DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

- RLS enabled with a "Chef owns segments" policy using the `user_roles` pattern
- Index on `tenant_id` for efficient per-chef queries

### New Pages

#### `app/(chef)/clients/segments/page.tsx`
Server component at `/clients/segments` that:
- Renders `SegmentBuilder` for creating new segments
- Lists existing segments with their filter count badge
- Each segment links to `/clients?segment=<id>` for future filtered views

#### `app/(chef)/clients/duplicates/page.tsx`
Server component at `/clients/duplicates` that:
- Calls `findDuplicateClients()` and renders each pair as a card
- Shows confidence level (high = error badge, medium = warning badge)
- Links to both client detail pages for manual review and merge

### New Component

#### `components/clients/segment-builder.tsx`
Client component with a form for creating segments:
- Name, description, color picker
- Dynamic filter rows (field / operator / value)
- Calls `createSegment()` server action via `useTransition`
- Uses `sonner` for toast feedback
- Resets form state after successful save

## How It Connects to the System

- All server actions follow the standard `requireChef()` + `createServerClient()` + tenant-scoped query pattern
- `client_segments` uses `tenant_id` (FK to `chefs`) matching the RLS convention used throughout the codebase
- Lead scoring and churn risk are read-only analytics — they do not write to the database or trigger any state changes
- Referral tree queries build on existing `referred_by_client_id` and `referred_by_name` columns in `clients`
- Deduplication is purely read-only — no auto-merging. The chef reviews and manually navigates to records

## Migration Safety Notes

- Migration `20260308000001` is purely additive — creates a new table, no existing tables modified
- Timestamp selected as strictly higher than the previous highest (`20260307000012`)
- No `DROP`, `DELETE`, or `TRUNCATE` statements
- Apply with: `supabase db push --linked` after backing up production data

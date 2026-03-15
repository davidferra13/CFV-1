# Client NDA Management (Feature 2.17)

## Overview

Dedicated NDA tracking system for HNW/celebrity clients. Supports multiple NDAs per client with full lifecycle management (draft, sent, signed, expired, voided).

## What Changed

### Database

- New `client_ndas` table with RLS (tenant-scoped)
- Migration: `supabase/migrations/20260401000019_client_ndas.sql`
- Indexes on (tenant_id, client_id) and (tenant_id, expiry_date) for signed NDAs
- This is separate from the existing `nda_active` column on clients. The new table supports multiple NDAs per client, typed NDAs, restrictions arrays, and full status tracking.

### Server Actions (`lib/clients/nda-management-actions.ts`)

- `createNdaRecord` - create new NDA
- `updateNdaRecord` - partial update
- `deleteNdaRecord` - remove
- `getClientNdaRecords` - list for a client
- `getExpiringNdaRecords` - NDAs expiring within N days
- `getNdaDashboard` - all NDAs with status counts
- `markNdaRecordSigned` - transition to signed status
- Auto-expiry: signed NDAs past their expiry_date are returned as 'expired' (computed at read time, Formula > AI)

### UI Components

- `components/clients/nda-badge.tsx` - Lock icon badge with color coding (green/amber/red). Deterministic status computation.
- `components/clients/nda-panel.tsx` - Full NDA management panel for client detail pages. Add NDA form with type selector, expiry date, restrictions checklist, notes. Expiry countdown warnings (amber at 30 days, red at 7 days).
- `components/dashboard/nda-alerts-widget.tsx` - Dashboard widget showing active NDA count, expiring soon alerts, and quick link to management.

### Relationship to Existing NDA Fields

The existing `lib/clients/nda-actions.ts` manages simple NDA columns on the `clients` table (`nda_active`, `nda_coverage`, etc.). The new system adds a separate `client_ndas` table for richer tracking. Both can coexist. The existing fields serve as a quick toggle; the new table supports detailed NDA records.

## Restrictions Checklist

Predefined options:

- No photography
- No social media
- No guest disclosure
- No location disclosure
- No menu disclosure

Stored as `TEXT[]` in the database, so custom restrictions can be added later.

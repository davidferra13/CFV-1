# Notification Tier Customization

## Overview

Chefs can now override the default priority tier (critical, alert, info) for any of the 81 notification actions. This gives each chef granular control over how notifications are delivered without changing the system-wide defaults.

## How It Works

### Resolution Cascade

When a notification is sent, the tier is resolved in this order:

1. **Per-chef tier override** (DB: `chef_notification_tier_overrides`) - checked first
2. **System default** (code: `DEFAULT_TIER_MAP` in `tier-config.ts`) - fallback

The tier then determines which delivery channels fire by default:

- **Critical**: SMS + Push + Email
- **Alert**: Push + Email
- **Info**: Email only

Per-category channel overrides (from `notification_preferences`) still apply on top of the tier-derived defaults.

### Database

Table: `chef_notification_tier_overrides`

| Column     | Type        | Description                               |
| ---------- | ----------- | ----------------------------------------- |
| id         | UUID        | Primary key                               |
| chef_id    | UUID        | References chefs(id), CASCADE on delete   |
| action     | TEXT        | Notification action (e.g., 'new_inquiry') |
| tier       | TEXT        | 'critical', 'alert', or 'info'            |
| created_at | TIMESTAMPTZ | Row creation time                         |
| updated_at | TIMESTAMPTZ | Last update time                          |

Unique constraint: `(chef_id, action)` - one override per action per chef.

RLS: Chefs can only manage their own overrides.

### Server Actions

File: `lib/notifications/tier-actions.ts`

- `getNotificationTierMap()` - Returns all 81 actions with current tier, default tier, and override status
- `updateNotificationTier(action, tier)` - Upsert a single override (auto-removes if matching default)
- `resetNotificationTier(action)` - Delete one override, reverting to system default
- `resetAllNotificationTiers()` - Delete all overrides for the chef

### Integration Point

`lib/notifications/resolve-preferences.ts` was updated to check `chef_notification_tier_overrides` before computing channel defaults. This means tier overrides affect all notification delivery (email, push, SMS) at send time.

### Settings UI

Component: `components/settings/notification-tier-settings.tsx`

- Actions grouped by category (inquiry, quote, event, payment, etc.)
- Collapsible category sections with expand/collapse all
- Each action shows a colored dot and dropdown to select tier
- "customized" badge on overridden actions
- Per-action "Reset" button and global "Reset all" button
- Optimistic UI with rollback on failure

Integrated into the existing notification settings page at `/settings/notifications`.

### API v2

Endpoint: `app/api/v2/settings/notification-tiers/route.ts`

**GET** `/api/v2/settings/notification-tiers`

- Scope: `settings:read`
- Returns full tier map with overrides applied

**PATCH** `/api/v2/settings/notification-tiers`

- Scope: `settings:write`
- Body: `{ "overrides": [{ "action": "new_inquiry", "tier": "info" }] }`
- Automatically removes override if tier matches system default

## Files Changed

| File                                                                      | Change                             |
| ------------------------------------------------------------------------- | ---------------------------------- |
| `supabase/migrations/20260320000012_chef_notification_tier_overrides.sql` | New table                          |
| `lib/notifications/tier-actions.ts`                                       | New server actions                 |
| `lib/notifications/resolve-preferences.ts`                                | Checks tier overrides at send time |
| `components/settings/notification-tier-settings.tsx`                      | New UI component                   |
| `app/(chef)/settings/notifications/page.tsx`                              | Loads and renders tier settings    |
| `app/api/v2/settings/notification-tiers/route.ts`                         | New API endpoint                   |

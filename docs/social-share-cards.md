# Social Share Cards

Feature for sharing dinner circle experiences on social media.

## Overview

Clients can generate a branded, public share card from any dinner circle. The card freezes a snapshot of the experience (menu, chef, theme, photos) and produces a public URL with full OG meta tags for rich social previews on Twitter/X, Facebook, iMessage, WhatsApp, etc.

## Architecture

### Data Flow

1. Client clicks "Share Experience" button in circle header
2. Modal opens with content selection (menu, chef, theme, photos)
3. `createShareCard()` server action snapshots selected data into JSONB
4. Returns a `share_token` (UUID)
5. Public page at `/experience/[shareToken]` renders the frozen snapshot
6. Dynamic OG image at `/api/og/experience?token=` generates 1200x630 social preview

### Key Design Decisions

**Snapshot, not live data.** The share card freezes content at creation time into a JSONB column. If the circle changes later, the shared link stays the same. This prevents privacy leaks from future messages or membership changes.

**No private data.** Guest names, dietary restrictions, allergies, prices, chat messages, and contact info are never included in the snapshot. Only: group name, emoji, theme, chef name/business, occasion, event date, guest count, menu courses/dishes, and selected photos.

**Any member can share.** Not restricted to owners/admins. Any circle member can create a share card with their choice of content.

**Deactivation.** The creator or any group owner/admin can deactivate a share card, making the public URL return 404.

## Database

### Table: `hub_share_cards`

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID PK | |
| `share_token` | UUID UNIQUE | Public URL identifier |
| `group_id` | UUID FK | Links to hub_groups |
| `event_id` | UUID FK nullable | Links to events (if available) |
| `created_by_profile_id` | UUID FK | Who created the card |
| `included_content` | JSONB | Flags for what's shown (menu, chef, theme, photos) |
| `snapshot` | JSONB | Frozen data at time of creation |
| `is_active` | BOOLEAN | Soft delete |
| `created_at` | TIMESTAMPTZ | |

Migration: `20260330000076_hub_share_cards.sql`

RLS: Public SELECT (anyone with the link), service role for writes.

## Files

| File | Purpose |
|------|---------|
| `supabase/migrations/20260330000076_hub_share_cards.sql` | Migration |
| `lib/hub/share-card-actions.ts` | Server actions (create, get, deactivate, list) |
| `components/hub/share-experience-modal.tsx` | Content selector + share buttons |
| `app/(public)/experience/[shareToken]/page.tsx` | Public share page with OG meta |
| `app/api/og/experience/route.tsx` | Dynamic OG image generation (1200x630) |
| `app/(public)/hub/g/[groupToken]/hub-group-view.tsx` | Share button wired into circle header |

## Share Platforms

- **Copy Link** - clipboard copy
- **Twitter/X** - `twitter.com/intent/tweet` with text + URL
- **Facebook** - `facebook.com/sharer/sharer.php` with URL
- **Native Share** (mobile) - Web Share API (`navigator.share`) for iOS/Android native share sheet (Instagram, WhatsApp, iMessage, etc.)

## Future: Referral Incentives

The `hub_share_cards` table and `created_by_profile_id` provide a clean hook for tracking who shared and attributing referrals. When the incentive feature is built:

1. Add a `referral_code` column to `hub_share_cards`
2. Track clicks/signups via the public page
3. Award discounts or loyalty points to the sharer
4. The snapshot architecture means no additional data collection is needed - just attribution.

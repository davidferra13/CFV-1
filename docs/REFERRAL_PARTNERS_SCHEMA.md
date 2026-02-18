# Referral Partners — Database Schema

## Overview

Migration `20260221000014_referral_partners.sql` adds the database layer for partner relationship management, lead source attribution, and a public chef profile with partner showcase.

All changes are **additive** — no existing tables, columns, or data are dropped or modified.

---

## New Enums

| Enum | Values |
|------|--------|
| `partner_type` | `airbnb_host`, `business`, `platform`, `individual`, `venue`, `other` |
| `partner_status` | `active`, `inactive` |

---

## New Tables

### `referral_partners`

The core partner entity. Represents any referral source — Airbnb hosts, hotels, venues, platforms, individuals.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | Default `gen_random_uuid()` |
| `tenant_id` | UUID FK → chefs | Required, tenant-scoped |
| `name` | TEXT NOT NULL | Partner display name |
| `partner_type` | partner_type | Default `'individual'` |
| `status` | partner_status | Default `'active'` |
| `contact_name` | TEXT | Primary contact person |
| `email` | TEXT | |
| `phone` | TEXT | |
| `website` | TEXT | |
| `booking_url` | TEXT | Link to partner's booking page |
| `description` | TEXT | Public-facing (shown on showcase) |
| `cover_image_url` | TEXT | Hero image for showcase card |
| `is_showcase_visible` | BOOLEAN | Default `false` — opt-in for public display |
| `showcase_order` | INTEGER | Default `0` — sort order on public page |
| `notes` | TEXT | Internal relationship notes (never public) |
| `commission_notes` | TEXT | Referral arrangement notes (never public) |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | Auto-updated via trigger |

**Indexes:** `tenant_id`, `(tenant_id, partner_type)`, `(tenant_id, status)`, `(tenant_id, is_showcase_visible)`

### `partner_locations`

Sub-locations for partners (e.g., an Airbnb host's 4 different properties).

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → chefs | Required |
| `partner_id` | UUID FK → referral_partners | CASCADE delete |
| `name` | TEXT NOT NULL | Location name (e.g., "Mountain View Cabin") |
| `address`, `city`, `state`, `zip` | TEXT | |
| `booking_url` | TEXT | Location-specific booking link |
| `description` | TEXT | Public-facing |
| `notes` | TEXT | Internal (kitchen notes, access info) |
| `max_guest_count` | INTEGER | Capacity |
| `is_active` | BOOLEAN | Default `true` |
| `created_at` / `updated_at` | TIMESTAMPTZ | |

**Indexes:** `tenant_id`, `partner_id`

### `partner_images`

Photo gallery for partners and their locations, with optional seasonal tagging.

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID PK | |
| `tenant_id` | UUID FK → chefs | Required |
| `partner_id` | UUID FK → referral_partners | CASCADE delete |
| `location_id` | UUID FK → partner_locations | Nullable, CASCADE delete |
| `image_url` | TEXT NOT NULL | Public URL |
| `caption` | TEXT | |
| `season` | TEXT | `'spring'`, `'summer'`, `'fall'`, `'winter'`, or null |
| `display_order` | INTEGER | Default `0` |
| `created_at` | TIMESTAMPTZ | |

**Indexes:** `(partner_id, location_id)`, `(partner_id, season)`

---

## Altered Tables

### `inquiries`
- `referral_partner_id` UUID FK → referral_partners (nullable)
- `partner_location_id` UUID FK → partner_locations (nullable)
- Conditional indexes (WHERE NOT NULL)

### `events`
- `referral_partner_id` UUID FK → referral_partners (nullable)
- `partner_location_id` UUID FK → partner_locations (nullable)
- Conditional indexes (WHERE NOT NULL)

### `chefs`
- `slug` TEXT UNIQUE — public profile URL segment (e.g., `/chef/chef-david`)
- `tagline` TEXT — subtitle shown on public profile

---

## RLS Policies

All three new tables follow the established pattern:

- **Chef CRUD:** `get_current_user_role() = 'chef' AND tenant_id = get_current_tenant_id()`
- **Public SELECT:** `is_showcase_visible = true` on `referral_partners` (and joined for locations/images)

The public showcase page uses an admin Supabase client to bypass RLS (matching the existing share-page pattern in `lib/sharing/actions.ts`), so the public RLS policies serve as an additional safety layer.

---

## Design Decisions

1. **Partner vs. Channel are orthogonal** — `channel` (how they reached out) and `referral_partner_id` (who referred them) are independent dimensions on inquiries.
2. **Locations are optional** — Not all partners have physical locations. Individual referrers have none.
3. **Soft delete** — Partners with linked inquiries/events get `status='inactive'` instead of being deleted, preserving analytics history.
4. **Public/private field separation** — `description`, `cover_image_url`, `booking_url` are public; `notes`, `commission_notes` are never exposed.
5. **Seasonal image tagging** — The `season` column enables filtering gallery photos by season for a rich visual showcase.

---

## How to Apply

```bash
# Back up your database first!
supabase db push --linked

# Then regenerate TypeScript types
supabase gen types typescript --linked > types/database.ts
```

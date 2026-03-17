# External Directory (Discover)

## Overview

The `/discover` directory is a public-facing listing of food businesses (restaurants, caterers, food trucks, bakeries, etc.) that are NOT ChefFlow platform users. It complements the existing `/chefs` directory, which shows vetted ChefFlow platform chefs.

The directory follows a consent-first hybrid model:

- **Phase 1 (Discovered):** Minimal public facts only (name, city, cuisine type, website link)
- **Phase 2 (Claimed/Verified):** Full details populated by the business owner after claiming

## Architecture

### Database

**`directory_listings`** table stores all external business listings.

Key columns:

- `name`, `slug`, `city`, `state`, `cuisine_types[]`, `business_type`, `website_url` (Phase 1)
- `address`, `phone`, `email`, `description`, `hours`, `photo_urls[]`, `menu_url`, `price_range` (Phase 2, consent-gated)
- `status`: discovered | pending_submission | claimed | verified | removed
- `source`: manual | openstreetmap | submission | community_nomination

**`directory_nominations`** table stores community-submitted suggestions.

### Server Actions

All actions in `lib/discover/actions.ts`:

| Action                        | Auth   | Purpose                       |
| ----------------------------- | ------ | ----------------------------- |
| `getDirectoryListings()`      | Public | Browse with filters           |
| `getDirectoryListingBySlug()` | Public | Single listing detail         |
| `getDirectoryFacets()`        | Public | Filter option counts          |
| `submitDirectoryListing()`    | Public | Business self-submission      |
| `submitNomination()`          | Public | Community nomination          |
| `requestListingClaim()`       | Public | Business owner claims listing |
| `requestListingRemoval()`     | Public | Request to be removed         |
| `adminGetAllListings()`       | Admin  | Full listing management       |
| `adminUpdateListingStatus()`  | Admin  | Approve/remove/verify         |
| `adminCreateListing()`        | Admin  | Manually add listings         |
| `adminGetNominations()`       | Admin  | Review nominations            |
| `adminReviewNomination()`     | Admin  | Approve/reject nominations    |

### Routes

| Route                       | Purpose                                  |
| --------------------------- | ---------------------------------------- |
| `/discover`                 | Browse directory with search and filters |
| `/discover/[slug]`          | Individual listing detail                |
| `/discover/submit`          | Business self-submission form            |
| `/admin/directory-listings` | Admin management dashboard               |

### Privacy & Consent Model

**Auto-populated (no consent needed):**

- Business name, city/neighborhood, cuisine type, website URL
- Sourced from public registries, OpenStreetMap, or manual curation

**Consent-gated (requires claim):**

- Address, phone, email, photos, menu, hours, description
- Only shown after business owner claims and verifies their listing

**Removal:**

- Any listing can be removed within 48 hours via the "Request removal" button
- No friction, no questions asked
- Admin sees pending removal requests highlighted in the management dashboard

### Data Flow

1. **Discovery:** Admin manually creates listings OR listings come from community nominations
2. **Submission:** Businesses can self-submit via `/discover/submit` (status: `pending_submission`)
3. **Claim:** Business owners can claim discovered listings (status: `claimed`)
4. **Verification:** Admin verifies claimed/submitted listings (status: `verified`)
5. **Removal:** Business or admin removes listing (status: `removed`)

## Landing Page Integration

The home page search bar and category pills now route to `/discover` for non-chef categories:

- "Private Chefs" still goes to `/chefs` (ChefFlow platform directory)
- "Restaurants", "Caterers", "Food Trucks", "Bakeries", "Meal Prep" go to `/discover`

The public header nav now includes both "Chefs" and "Discover" links.

## Migration

File: `supabase/migrations/20260401000079_external_directory_listings.sql`

Creates:

- `directory_listings` table with RLS (public read, service_role write)
- `directory_nominations` table with RLS (public insert, service_role manage)
- Indexes for search and filtering
- `updated_at` trigger

## Email Outreach System

### Consent-only outreach

Emails are ONLY sent to businesses that voluntarily provided their email by submitting or claiming a listing. Discovered listings never receive outreach (they have no email on file).

### Email triggers

| Trigger                                 | Email sent                         | Template                 |
| --------------------------------------- | ---------------------------------- | ------------------------ |
| Business submits via `/discover/submit` | Welcome email                      | `directory-welcome.tsx`  |
| Business owner claims a listing         | Claimed confirmation + profile CTA | `directory-claimed.tsx`  |
| Admin verifies a listing                | Verification confirmation          | `directory-verified.tsx` |

### Infrastructure

- **Sending:** Uses existing Resend infrastructure (`lib/email/send.ts`)
- **Templates:** React Email components in `lib/email/templates/directory-*.tsx`
- **Outreach logic:** `lib/discover/outreach.ts` (opt-out checks, logging, email dispatch)
- **Logging:** `directory_outreach_log` table tracks every email sent
- **Opt-out:** `directory_email_preferences` table, one-click unsubscribe at `/discover/unsubscribe`
- **Admin:** Outreach stats shown on `/admin/directory-listings` dashboard

### Opt-out flow

1. Every email includes an "Unsubscribe" link at the bottom
2. Link goes to `/discover/unsubscribe?t=<base64url-encoded-email>`
3. One click confirms unsubscribe
4. All future sends check `directory_email_preferences` before dispatching
5. Opt-out only affects directory emails, does not remove listings

### Profile enhancement

Claimed listings can enrich their profile at `/discover/[slug]/enhance`:

- Pre-filled form with current listing data
- Add: description, address, phone, menu URL, business hours
- Changes appear immediately on the listing

### Migration

File: `supabase/migrations/20260401000080_directory_outreach.sql`

Creates:

- `directory_outreach_log` table (email send tracking)
- `directory_email_preferences` table (opt-out management)

## Constants

`lib/discover/constants.ts` defines:

- `BUSINESS_TYPES` (8 types)
- `CUISINE_CATEGORIES` (21 categories)
- `PRICE_RANGES` (4 tiers)
- `LISTING_STATUSES` (5 statuses)
- Helper functions: `getBusinessTypeLabel()`, `getCuisineLabel()`, `slugify()`

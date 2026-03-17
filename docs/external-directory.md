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

## Constants

`lib/discover/constants.ts` defines:

- `BUSINESS_TYPES` (8 types)
- `CUISINE_CATEGORIES` (21 categories)
- `PRICE_RANGES` (4 tiers)
- `LISTING_STATUSES` (5 statuses)
- Helper functions: `getBusinessTypeLabel()`, `getCuisineLabel()`, `slugify()`

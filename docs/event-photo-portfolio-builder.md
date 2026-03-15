# Feature 5.5: Event Photo Documentation - Portfolio Builder

## What Changed

Extended the existing event photo system with portfolio/marketing capabilities. Chefs can now categorize photos by type, flag their best work for portfolio, and control public visibility for website embedding.

## Database Changes

**Migration:** `supabase/migrations/20260401000025_event_photos.sql`

Added 5 columns to the existing `event_photos` table (purely additive):

| Column           | Type                    | Purpose                                                               |
| ---------------- | ----------------------- | --------------------------------------------------------------------- |
| `photo_type`     | text (enum check)       | Category: plating, setup, process, ingredients, ambiance, team, other |
| `is_portfolio`   | boolean (default false) | Chef marks best work for portfolio view                               |
| `is_public`      | boolean (default false) | Controls public visibility for chef website                           |
| `thumbnail_path` | text                    | Optional thumbnail in same storage bucket                             |
| `taken_at`       | timestamptz             | When photo was taken (vs upload time)                                 |

Added 3 indexes:

- `idx_event_photos_portfolio` - Portfolio queries filtered by tenant
- `idx_event_photos_public` - Public portfolio queries
- `idx_event_photos_type` - Photo type filtering within events

Added 1 RLS policy:

- `event_photos_public_select` - Anyone can view photos where `is_public = true` and `deleted_at IS NULL`

## Server Actions (lib/events/photo-actions.ts)

**New actions:**

- `updatePhotoDetails(id, data)` - Update caption, type, portfolio flag, public flag, taken_at
- `togglePortfolio(id)` - Toggle is_portfolio flag with optimistic return
- `getPublicPortfolio(chefId)` - Public query for chef website (no auth required)

**Updated types:**

- `EventPhoto` - Added photo_type, is_portfolio, is_public, thumbnail_path, taken_at fields
- `PhotoType` - New union type for photo categories
- `PortfolioPhoto` - Added event_name field
- `PublicPortfolioPhoto` - New type for public portfolio queries

## UI Components

### Updated: `components/events/event-photo-gallery.tsx`

- Photo type badge overlay (color-coded by category)
- Photo type selector dropdown per photo
- Portfolio star toggle button (amber star, bottom-right overlay)
- Optimistic updates with rollback on both new features

### New: `components/portfolio/portfolio-gallery.tsx`

- Chef-facing portfolio management view
- Filter by photo type and event
- Select/deselect photos with checkbox overlay
- Bulk toggle public/private visibility
- Remove from portfolio action
- Lightbox preview with navigation
- Shows public/private badge per photo

### New: `components/portfolio/portfolio-showcase.tsx`

- Public-facing masonry grid layout
- Caption overlay on hover with event attribution
- Photo type badge on hover
- Full lightbox with keyboard navigation (Escape, ArrowLeft, ArrowRight)
- Lazy loading images
- For embedding on chef website pages

## Architecture Notes

- All server actions use `requireChef()` for auth (except `getPublicPortfolio` which is public)
- Tenant ID derived from session, never from request
- Storage bucket: `event-photos` (existing)
- Signed URLs generated on-demand, never stored
- Optimistic updates with try/catch rollback on all mutations
- Photo type is formula-based categorization, not AI (Formula > AI)

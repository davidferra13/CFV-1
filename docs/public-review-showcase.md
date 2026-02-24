# Public Review Showcase — Implementation Doc

**Date:** 2026-02-24
**Branch:** feature/risk-gap-closure

## What Changed

Added a public-facing unified reviews section to the chef profile page (`/chef/[slug]`). Potential clients now see all consented reviews across every platform, with unified stats and SEO markup.

## Problem

The review system had extensive backend infrastructure (3 data sources, 15+ platforms, cron sync) but **zero public visibility**. All review data was behind authentication. Visitors to a chef's profile saw no social proof — no reviews, no ratings, no stats.

## Solution

### New Files

| File                                                                  | Purpose                                                            |
| --------------------------------------------------------------------- | ------------------------------------------------------------------ |
| `lib/reviews/public-actions.ts`                                       | Public review query — aggregates 4 sources, computes unified stats |
| `components/public/review-showcase.tsx`                               | Public review display component with stats header and review cards |
| `supabase/migrations/20260322000055_chef_feedback_public_display.sql` | Adds `public_display` column to `chef_feedback` table              |

### Modified Files

| File                                            | Change                                                      |
| ----------------------------------------------- | ----------------------------------------------------------- |
| `app/(public)/chef/[slug]/page.tsx`             | Added reviews section + JSON-LD AggregateRating             |
| `lib/reviews/chef-feedback-actions.ts`          | Added `public_display` to schema and insert                 |
| `lib/reviews/actions.ts`                        | Added `public_display` to unified feed query + "Public" tag |
| `components/reviews/import-platform-review.tsx` | Added "Show on public profile" toggle (default: on)         |
| `components/reviews/log-feedback-button.tsx`    | Added "Show on public profile" toggle (default: off)        |

## Architecture

### 4 Review Sources (Public Display Criteria)

| Source               | Table                | Public When                              |
| -------------------- | -------------------- | ---------------------------------------- |
| Client Reviews       | `client_reviews`     | `display_consent = true`                 |
| Chef-Logged Feedback | `chef_feedback`      | `public_display = true` (new column)     |
| External Reviews     | `external_reviews`   | Always (inherently public platform data) |
| Guest Testimonials   | `guest_testimonials` | `is_approved = true`                     |

### Unified Stats

`PublicReviewStats` computed across all 4 sources:

- `totalReviews` — count of all public reviews
- `averageRating` — weighted average across all rated reviews
- `platformBreakdown` — per-platform count + average (e.g., "Google: 12 reviews, 4.8★")

### SEO: JSON-LD AggregateRating

When reviews exist, the profile page emits a `<script type="application/ld+json">` block with `LocalBusiness` + `AggregateRating` schema. This enables star ratings in Google search results.

### Data Flow

```
getPublicChefReviewFeed(tenantId)
  → 4 parallel Supabase queries (admin client, bypasses RLS)
  → filter by consent/approval fields
  → transform to PublicReviewItem[]
  → compute PublicReviewStats
  → sort (featured first, then by date)
  → return { reviews, stats }
```

### UI Behavior

- Shows 6 reviews initially, "View all X reviews" button expands
- Featured testimonials (from guest_testimonials.is_featured) appear first with gold highlight
- Platform pills show breakdown (e.g., "Google 12 · 4.8★", "Airbnb 8 · 4.9★")
- Review cards show: name, date, star rating, text, source badge, external link

## Default Behavior

- **Import Platform Review modal:** `public_display` defaults to **true** (imported reviews are public by default — they're already public on the source platform)
- **Log Feedback modal:** `public_display` defaults to **false** (verbal/internal feedback is private by default)
- **External reviews:** Always public (no toggle needed — they're scraped from public platforms)
- **Client reviews:** Controlled by the `display_consent` the client chose when submitting
- **Guest testimonials:** Controlled by chef via `is_approved` in the testimonial manager

## Migration

```sql
-- 20260322000055_chef_feedback_public_display.sql
ALTER TABLE chef_feedback
  ADD COLUMN IF NOT EXISTS public_display BOOLEAN NOT NULL DEFAULT false;
```

Run: `supabase db push --linked` (after backup)

## Future Work (P1–P3)

- **Platform aggregate stats** — "120 services on Take a Chef" as a headline metric
- **CSV bulk import** — import historical reviews from spreadsheet
- **Featured/pinned reviews** — chef picks top reviews for hero placement
- **Verified badges** — visual distinction between platform-verified and manually entered reviews
- **Automated review requests** — timer-based post-event email trigger
- **Review responses** — chef replies visible on public profile

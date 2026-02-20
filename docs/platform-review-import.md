# Platform Review Import

**Feature added:** 2026-02-28

## What Was Added

Chefs can now import reviews from any external platform — Airbnb, Facebook, TripAdvisor, Thumbtack, Houzz, Angi, and more — directly into their ChefFlow reviews feed.

---

## How It Works

### Two paths to external reviews

| Path | Platforms | How |
|---|---|---|
| **Auto-sync** | Google, personal website | `external_review_sources` → `external_reviews` (existing, unchanged) |
| **Manual import** | All others (Airbnb, Facebook, etc.) | `chef_feedback` table via new "Import Platform Review" form |

Both paths flow into the unified review feed (`getUnifiedChefReviewFeed`) and appear in the `/reviews` dashboard with source badges.

---

## Database Changes

**Migration:** `supabase/migrations/20260228000001_chef_feedback_platform_import.sql`

Two additive changes to `chef_feedback` — no data altered or removed:

### 1. New column: `reviewer_name TEXT NULL`
Stores the external reviewer's name as it appears on the platform (e.g., "Sarah M." on Airbnb). This is distinct from `client_id` which links to a known ChefFlow client. When importing an Airbnb review, the reviewer is not a ChefFlow client, so `reviewer_name` is populated and `client_id` is left null.

### 2. Expanded `source` CHECK constraint
Added 12 new valid platform values alongside all original values:

| New value | Platform |
|---|---|
| `airbnb` | Airbnb |
| `facebook` | Facebook |
| `tripadvisor` | TripAdvisor |
| `thumbtack` | Thumbtack |
| `bark` | Bark |
| `gigsalad` | GigSalad |
| `taskrabbit` | TaskRabbit |
| `houzz` | Houzz |
| `angi` | Angi |
| `nextdoor` | Nextdoor |
| `instagram` | Instagram |
| `yelp_guest` | Yelp (guest reviewer) |

Original values (`verbal`, `google`, `yelp`, `email`, `social_media`, `text_message`, `other`) are unchanged.

---

## UI

### New button: "+ Import Platform Review"
Located on `/reviews` alongside the existing "Log Feedback" button.

Opens a modal with:
- **Platform picker** — grouped selector (Booking Platforms, Service Directories, Social & General, Direct)
- **Reviewer Name** — required for all external platforms; hidden for verbal/email/text
- **Review Text** — paste the review content (required)
- **Star Rating** — optional, 1–5
- **Review Link** — optional; placeholder URL adapts per platform (e.g., airbnb.com/users/show/...)
- **Review Date** — defaults to today

### Existing "Log Feedback" button
Unchanged — still the right tool for logging a verbal compliment, email praise, or informal comment. The new modal is specifically for copying a real review from a third-party platform.

---

## Files Changed

| File | Change |
|---|---|
| `supabase/migrations/20260228000001_chef_feedback_platform_import.sql` | New migration: `reviewer_name` column + expanded CHECK constraint |
| `lib/reviews/chef-feedback-actions.ts` | Zod schema extended with new source values + `reviewer_name` field; `logChefFeedback` writes it |
| `components/reviews/import-platform-review.tsx` | New modal component |
| `app/(chef)/reviews/page.tsx` | Renders `<ImportPlatformReview />` in the header action row |
| `lib/reviews/actions.ts` | `FEEDBACK_SOURCE_LABELS` expanded; `reviewerName` fallback chain updated to prefer `reviewer_name` |

---

## Unified Feed Behavior

The `reviewerName` field in the feed resolves as:
1. `feedback.reviewer_name` — set for imported platform reviews
2. `feedback.client?.full_name` — set for feedback linked to a ChefFlow client
3. `'External Reviewer'` — fallback

The `sourceLabel` badge uses `FEEDBACK_SOURCE_LABELS` which now maps all new platform keys to their display names (e.g., `airbnb` → `'Airbnb'`).

---

## Applying the Migration

```bash
# Verify the constraint name first (should be chef_feedback_source_check):
supabase db inspect --linked

# Apply:
supabase db push --linked
```

After applying, re-generate types:
```bash
supabase gen types typescript --linked > types/database.ts
```

---

## Why Manual Import (Not Auto-Sync) for Most Platforms

Most platforms (Airbnb, Facebook, TripAdvisor, Thumbtack, etc.) do not provide public APIs that allow reading review data. Auto-sync requires an official API. The only platforms with viable review APIs are:
- **Google Places** — already auto-synced via `GOOGLE_PLACES_API_KEY`
- **Personal website** — already parsed via JSON-LD schema

For all other platforms, manual copy-paste import is the only legal, reliable approach.

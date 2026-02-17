# Client Reviews & Feedback System

## What Changed

Added a complete post-event feedback system that collects internal client reviews and drives Google Reviews.

## Why

After every completed event, the chef needs two things:
1. **Internal feedback** - business intelligence about what clients loved and what could improve, with star ratings for tracking quality over time
2. **Google Reviews** - the most important external marketing channel. Rather than building a complex integration, each chef simply configures their Google Business review URL in settings, and clients are redirected there after leaving internal feedback

## Database Changes

**Migration:** `20260220000002_client_reviews.sql`

1. **`chefs.google_review_url`** (TEXT, nullable) - Chef's Google Business review link
2. **`client_reviews` table** - New table:
   - `rating` (1-5 integer, required)
   - `feedback_text`, `what_they_loved`, `what_could_improve` (optional text)
   - `display_consent` (boolean) - whether the client allows public display
   - `google_review_clicked` (boolean) - tracks if client clicked through to Google
   - One review per event (unique constraint on `event_id`)
   - Tenant-scoped with RLS policies for both client and chef access

No data was dropped or modified. Purely additive.

## New Files

| File | Purpose |
|------|---------|
| `lib/reviews/actions.ts` | Server actions: submit review, fetch review, record Google click, get/update Google URL, chef review stats |
| `components/reviews/client-feedback-form.tsx` | Star rating + written feedback form with display consent toggle. Shows Google Review CTA after submission |
| `components/reviews/submitted-review.tsx` | Read-only view of already-submitted review with persistent Google CTA |
| `components/reviews/chef-reviews-list.tsx` | Chef dashboard: stats cards + all reviews with ratings, consent badges, feedback details |
| `components/settings/google-review-url-form.tsx` | Chef settings: configure Google Business review link |
| `app/(chef)/reviews/page.tsx` | Chef reviews dashboard page |

## Modified Files

| File | Change |
|------|--------|
| `app/(client)/my-events/[id]/page.tsx` | Added inline feedback form for completed events. Shows form if no review, shows submitted review if already done |
| `app/(chef)/settings/page.tsx` | Added "Client Reviews" section with Google Review URL config and link to reviews dashboard |
| `types/database.ts` | Regenerated with `client_reviews` table and `google_review_url` column |

## How It Works

### Client Flow
1. Client views a completed event at `/my-events/[id]`
2. If no review exists: shows feedback form with star rating, text fields, and display consent checkbox
3. Client submits feedback -> stored in `client_reviews` table
4. After submission: thank you message + prominent "Leave a Google Review" button (if chef has configured their URL)
5. Clicking the Google button opens the chef's Google review page in a new tab and records the click
6. If client returns later: shows their submitted review with a reminder to leave a Google review (if they haven't clicked yet)

### Chef Flow
1. Chef configures Google Business review URL in Settings -> Client Reviews
2. Chef views all feedback at `/reviews` - stats dashboard with total reviews, average rating, public consent count, Google click-throughs
3. Each review shows client name, event, star rating, feedback text, "loved" and "could improve" sections, consent status, and Google click status

### Integration with Existing Systems
- Leverages existing `review_link_sent` flag on events table - set to `true` when client clicks Google review
- Post-event queue already surfaces "send review link" task at 72-hour window
- Follows established patterns: server actions with `'use server'`, `requireChef()`/`requireClient()` auth, tenant scoping, Zod validation

## Design Decisions

- **Inline on event page (not separate page)**: Lowest friction - client sees it naturally when viewing completed event
- **Internal feedback first, then Google**: Captures business intelligence before redirecting to external platform
- **Chef-configurable Google URL**: No complex Google API integration needed. Chef pastes their link, clients are redirected
- **Display consent as opt-in**: Default is `false` - client must explicitly check the box to allow public display
- **One review per event**: Unique constraint prevents duplicate submissions

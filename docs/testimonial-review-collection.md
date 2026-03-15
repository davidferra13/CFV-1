# Feature 5.7: Testimonial/Review Collection

Post-event review request and display system. Chefs can generate unique review links for clients after events, manage incoming reviews, and display approved testimonials publicly.

## How It Works

1. Chef selects a completed event and clicks "Generate Link"
2. System creates a `testimonials` row with a unique `request_token` and returns a `/review/{token}` URL
3. Chef shares the URL with their client (copy to clipboard)
4. Client visits the URL (no login required), rates the experience 1-5 stars, writes a review, and optionally consents to public display
5. Chef sees the review in their management panel, can approve, feature, or delete it
6. Approved + public reviews are queryable for chef website/profile display

## Relationship to Existing Systems

This is separate from the existing `guest_testimonials` flow (recap-page based, tied to `event_shares` tokens). The new `testimonials` table supports direct client outreach with dedicated review request tokens.

The existing `client_reviews` table (with structured category ratings) is for internal chef feedback. This system is for public-facing testimonials.

## Database

- Table: `testimonials` (migration `20260401000017`)
- RLS: chef access via `tenant_id`, public read for `is_approved AND is_public`, service role for token submissions

## Files

- `supabase/migrations/20260401000017_testimonials.sql` - schema
- `lib/testimonials/testimonial-actions.ts` - chef server actions (request, list, approve, feature, delete, stats)
- `lib/testimonials/submit-testimonial.ts` - public submission (token-based, no auth)
- `app/(public)/review/[token]/page.tsx` - public review page
- `app/(public)/review/[token]/review-form.tsx` - client-side review form
- `components/testimonials/review-request-manager.tsx` - chef management panel
- `components/testimonials/testimonial-display.tsx` - display component (cards + grid)

## Security

- Token-based access: only the person with the unique URL can submit
- Rate limited: one submission per token (enforced by checking `submitted_at`)
- Public display opt-in: client explicitly checks "allow public display"
- Chef approval required: reviews are not public until chef approves
- Tenant scoping on all chef queries

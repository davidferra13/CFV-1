# Social Proof Loop

> **Status:** SPEC-READY
> **Priority:** P1
> **Origin:** "Picky Client" persona stress test (2026-05-16)
> **Depends On:** None (post-event lifecycle stage already built)

---

## Problem Statement

"Nothing to show, nothing to prove."

The picky client's frustration: the chef has zero professional evidence. No reviews, no portfolio, no proof that past clients were satisfied. ChefFlow already has a public chef profile, but social proof doesn't flow back to it automatically after events.

Reviews exist in the system. Post-event follow-up exists. But the loop isn't closed: satisfied client -> review capture -> chef profile display -> next prospective client sees proof -> books with confidence.

---

## Solution: Close the Social Proof Loop

### 1. Post-Event Review Request (Automated)

**What exists:** Post-event email templates, debrief flow, lifecycle stage 9 (Post-Service).

**What to build:**

- 48 hours after event completion, auto-send a review request email to the client
- Simple format: star rating (1-5) + one text field ("What stood out?")
- No account required; token-based submission (like existing portal)
- If client was in a dinner circle, also invite circle guests to leave brief feedback
- Chef can preview/customize the review request template
- Reminder at 7 days if no response (one reminder only, not pushy)

### 2. Review Moderation

- Reviews land in chef's dashboard as "pending" (not auto-published)
- Chef can: approve (publish to profile), respond (public reply), flag (hide, with reason)
- Approved reviews display on public chef profile with: star rating, quote excerpt, occasion type, date (month/year only), first name + last initial
- No fake reviews, no chef-written reviews, no anonymous reviews without a real event

### 3. Chef Profile Social Proof Section

**What exists:** Public chef profile at `/chef/[slug]` with bio, portfolio, credentials, showcase menus.

**What to build:**

- "Client Reviews" section on public profile displaying approved reviews
- Aggregate rating (average stars, total review count) in profile header
- Most recent 3-5 reviews displayed; "See all" expands
- Review count and average rating included in OG metadata and JSON-LD (SEO)
- "Verified Event" badge on reviews (proves this was a real booking, not fabricated)

### 4. Event Portfolio (Past Event Showcase)

- After each completed event, chef can mark it as "portfolio-worthy"
- Portfolio entry: occasion type, guest count range, menu highlights, 1-3 photos (chef uploads), client review (if approved)
- Portfolio entries display on chef profile in a gallery/card format
- No client names without consent; occasion + month/year + cuisine style is sufficient

### Files Likely Touched

- `lib/reviews/request-actions.ts` (new, auto-send review request post-event)
- `lib/reviews/submission-actions.ts` (new, token-based review submission)
- `lib/reviews/moderation-actions.ts` (new, approve/respond/flag)
- `lib/reviews/profile-display-actions.ts` (new, aggregate rating, approved reviews for profile)
- `lib/email/templates/review-request.tsx` (new)
- `app/(public)/review/[token]/page.tsx` (new, client review submission page)
- `app/(chef)/reviews/page.tsx` (new, review moderation dashboard)
- `app/(public)/chef/[slug]/page.tsx` (add reviews section, aggregate rating)
- `components/reviews/review-card.tsx` (new)
- `components/reviews/star-rating-input.tsx` (new)
- `components/profile/social-proof-section.tsx` (new)
- `lib/profile/portfolio-actions.ts` (new, portfolio CRUD)
- `app/(chef)/portfolio/page.tsx` (new, portfolio management)
- `components/profile/portfolio-gallery.tsx` (new)
- Database: `reviews` table (rating, text, event_id, client_id, status, token), `portfolio_entries` table (event_id, description, photos, is_public)

---

## What This Does NOT Cover

- Fake review detection beyond "must have real event" gate
- Third-party review aggregation (Google, Yelp)
- Review incentives or rewards (keep it organic)
- Video testimonials (future enhancement)

---

## Verification

- [ ] Event completion triggers review request email at 48h
- [ ] Client can submit review via token link without logging in
- [ ] Review appears as "pending" in chef dashboard
- [ ] Approved review displays on public chef profile
- [ ] Aggregate rating updates when reviews are approved
- [ ] "Verified Event" badge renders on published reviews
- [ ] Portfolio entries display on public profile with photos
- [ ] OG metadata includes review count and rating
- [ ] 7-day reminder sends if no review submitted (once only)
- [ ] Chef can respond publicly to a review

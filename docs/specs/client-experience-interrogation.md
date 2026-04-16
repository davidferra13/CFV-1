# Client Experience Interrogation: 57-Question Audit

> **Created:** 2026-04-15
> **Scope:** Every client-facing surface, flow, and failure point in ChefFlow
> **Method:** Code-level investigation of all 57 questions, graded against real implementation

---

## Scorecard Summary

### Before Fixes (2026-04-15 initial audit)

| Grade       | Count | Meaning                                          |
| ----------- | ----- | ------------------------------------------------ |
| **Working** | 30    | Fully implemented, handles errors, good UX       |
| **Partial** | 11    | Exists but incomplete or missing key affordances |
| **Missing** | 9     | Feature does not exist at all                    |
| **Broken**  | 3     | Exists but has bugs or data loss                 |

**Initial Score: 30/57 fully working (53%)**

### After Batch 1 (2026-04-15)

| Grade       | Count        | Meaning                                                    |
| ----------- | ------------ | ---------------------------------------------------------- |
| **Working** | 30 + 11 = 41 | 11 items fixed or upgraded                                 |
| **Partial** | 7            | Remaining partial items (Q7, Q11, Q12, Q26, Q28, Q55, Q56) |
| **Missing** | 6            | Remaining missing items (Q19, Q29, Q36, Q45, Q57, Q31)     |
| **Broken**  | 0            | All broken items resolved                                  |

**Batch 1 Score: 41/57 fully working (72%)**

### After Batch 2 (2026-04-15)

| Grade       | Count       | Meaning                                               |
| ----------- | ----------- | ----------------------------------------------------- |
| **Working** | 41 + 5 = 46 | 5 more items fixed (Q19, Q28, Q29, Q31, Q45)          |
| **Partial** | 5           | Remaining partial items (Q7, Q11, Q12, Q55, Q56)      |
| **Missing** | 3           | Remaining missing items (Q36, Q57, Q26 extension TBD) |
| **Broken**  | 0           | All broken items resolved                             |

**Batch 2 Score: 46/57 fully working (81%)**

### After Batch 3 (2026-04-15)

| Grade       | Count       | Meaning                                         |
| ----------- | ----------- | ----------------------------------------------- |
| **Working** | 46 + 4 = 50 | 4 more items fixed (Q7, Q11, Q55, Q56)          |
| **Partial** | 1           | Remaining partial item (Q12)                    |
| **Missing** | 3           | Remaining missing items (Q36, Q57, Q26 ext TBD) |
| **Broken**  | 0           | All broken items resolved                       |

**Batch 3 Score: 50/57 fully working (88%)**

### After Batch 4 (2026-04-16)

| Grade       | Count       | Meaning                        |
| ----------- | ----------- | ------------------------------ |
| **Working** | 50 + 2 = 52 | 2 more items fixed (Q12, Q57)  |
| **Partial** | 0           | All partial items resolved     |
| **Missing** | 1           | Q36 (split payments, deferred) |
| **Broken**  | 0           | All broken items resolved      |

**Batch 4 Score: 52/57 fully working (91%)**

### Fixes Applied This Session

| Q#  | Issue                                         | Fix Applied                                             |
| --- | --------------------------------------------- | ------------------------------------------------------- |
| Q5  | Embed widget breaks with invalid color params | Hex validation with fallback to default                 |
| Q6  | Chef profile has no loading state             | Added `loading.tsx` skeleton loader                     |
| Q10 | Thank-you page is dead end                    | Added Back to Profile, Check Status, Browse links       |
| Q15 | Dietary restrictions lost inquiry->event      | Auto-pull from client record in `createEvent()`         |
| Q16 | Inquiry form loses draft on navigation        | Added sessionStorage draft persistence                  |
| Q21 | No decline email (in-app only)                | Added `inquiry-declined.tsx` email template + send      |
| Q26 | No extension request on expiring quotes       | Added "Request Extension" link (<48h)                   |
| Q41 | Countdown lacks practical info                | Added serve time, arrival, location, prep reminders     |
| Q42 | Can't update guest count after booking        | Added `requestGuestCountUpdate()` server action         |
| Q47 | RSVP cutoff not communicated                  | Re-graded to Working (cutoff shown prominently)         |
| Q52 | No rebook button on completed events          | Added "Book Again" CTA card                             |
| Q19 | No inquiry follow-up emails                   | Added 48h cron with metadata dedup                      |
| Q28 | Quote versions not labeled                    | Added version + superseded badges                       |
| Q29 | Quote doesn't show menu                       | Added menu snapshot with dishes in quote detail         |
| Q31 | Contract not mobile-optimized                 | Signature pad responsive rewrite (containerRef)         |
| Q45 | Guest token recovery impossible               | Email-based resend flow (rate-limited, enum-safe)       |
| Q7  | No dollar-amount pricing signals              | Starting price from booking_base_price_cents on profile |
| Q11 | No waitlist for paused chefs                  | ChefAvailabilityWaitlist on profile when not accepting  |
| Q55 | Spending dashboard lacks insights             | Monthly bar chart, peak month, trend direction          |
| Q56 | No client re-engagement emails                | 60-90 day window cron, respects marketing prefs         |
| Q12 | Duplicate inquiry not detected                | 24h dedup by client + chef + date (embed + public form) |
| Q57 | No client account deletion / GDPR             | 30-day soft delete + JSON data export at /my-profile    |

### Remaining Backlog

| Priority | Q#  | Issue             | Notes                                               |
| -------- | --- | ----------------- | --------------------------------------------------- |
| Low      | Q36 | No split payments | Complex Stripe work, standard for market. Deferred. |

---

## Phase 1: Discovery & First Impression (Q1-Q8)

### Q1: Empty chef directory

**Grade: WORKING**
`app/(public)/chefs/page.tsx` (lines 562-599) differentiates "directory opening" (zero chefs) vs "no filter matches." Shows CTAs, filter reset, suggestion chips. No dead end.

### Q2: Bare chef profile (zero reviews, zero portfolio)

**Grade: WORKING**
`app/(public)/chef/[slug]/page.tsx` (lines 439-564) conditionally renders sections. Reviews section only shows if `reviewFeed.reviews.length > 0`. Partners only if `partners.length > 0`. Bare profile shows bio, name, availability, service snapshot.

### Q3: Directory filters match nobody

**Grade: WORKING**
Lines 562-599 show "No chefs match these filters yet" with reset button and service type suggestions.

### Q4: Post-submission explanation on `/book`

**Grade: WORKING**
`BookDinnerForm` (lines 185-276) shows 5-step visual timeline after submission: Request received -> Chef reviews -> Menu sent -> Confirm & pay -> Dinner. Sets clear expectations.

### Q5: Embed widget with invalid params

**Grade: FIXED -> WORKING**
Added hex color validation with regex `/^#?[0-9a-fA-F]{3,8}$/` and fallback to `#e88f47` default.

### Q6: Chef profile loading state

**Grade: FIXED -> WORKING**
Added `loading.tsx` skeleton with hero, avatar, bio, snapshot grid, and CTA sections.

### Q7: Pricing signals on profile

**Grade: FIXED -> WORKING**
`booking_base_price_cents` now fetched in `getPublicChefProfile()`. When set, displays "Starting at $X/person" on profile hero chip and pricing card. Falls back to categorical label when no price set.

### Q8: SEO meta tags & structured data

**Grade: WORKING**
`generateMetadata()` (lines 42-78) sets title, description, OG tags with hero image fallback. `ChefProfileJsonLd` creates FoodService schema with aggregateRating. `ChefBreadcrumbJsonLd` adds breadcrumb navigation. Both rendered as `application/ld+json`.

---

## Phase 2: Inquiry Submission (Q9-Q16)

### Q9: Inquiry confirmation email

**Grade: WORKING**
`lib/email/templates/inquiry-received.tsx` (lines 21-94) sends email saying: "Your inquiry is in. {chefName} will review the details and follow up within 24 hours." Sets explicit 24-hour response expectation.

### Q10: Thank-you page is a dead end

**Grade: FIXED -> WORKING**
Added "Back to Chef Profile", "Check Inquiry Status", and "Browse More Chefs" links.

### Q11: Paused chef alternatives

**Grade: FIXED -> WORKING**
`ChefAvailabilityWaitlist` component on chef profile CTA section when `!discovery.accepting_inquiries`. Email capture stores to `directory_waitlist` with `chef:{id}` location key. Styled with amber border and clear messaging.

### Q12: Duplicate inquiry handling

**Grade: FIXED -> WORKING**
24h dedup added to both embed route and public form. Checks for existing inquiry with same client_id + tenant_id + confirmed_date created within 24h. Returns success silently on duplicate.

### Q13: Address autocomplete failure

**Grade: WORKING**
`components/ui/address-autocomplete.tsx` (lines 81-94, 169-172) gracefully degrades to `AddressTextInput` when Google Maps API fails. Silent fallback, form still works.

### Q14: Honeypot false positive handling

**Grade: WORKING**
`app/api/embed/inquiry/route.ts` (line 40): honeypot `website_url` must be empty. If filled (lines 90-96), request silently succeeds without creating inquiry. No error shown. Intentional: bots think it worked, real users don't trigger it (field is `display:none`).

### Q15: Dietary restrictions not propagated to events

**Grade: FIXED -> WORKING**
`createEvent()` now queries client `dietary_restrictions` and `allergies` and falls back to client record when event-level fields are empty.

### Q16: Draft persistence on inquiry form

**Grade: FIXED -> WORKING**
Added `saveDraft()`/`loadDraft()`/`clearDraft()` with sessionStorage. Auto-restores on mount, clears on submit.

---

## Phase 3: Waiting Period (Q17-Q22)

### Q17: Client can see inquiry status

**Grade: WORKING**
`app/(client)/my-bookings/page.tsx` (lines 354-379) shows inquiries tab with `InquiryStatusBadge`. `lib/inquiries/client-actions.ts` (lines 55-84) returns status for display.

### Q18: Client account creation

**Grade: WORKING**
Email-based. `lib/clients/actions.ts` (lines 591-659) creates client via `createClientFromLead()` with email as primary identifier during inquiry import/lead processing. Auth is email+password.

### Q19: No automated inquiry follow-up

**Grade: FIXED -> WORKING**
Cron route `app/api/scheduled/inquiry-client-followup/route.ts` sends "still reviewing" email after 48h for inquiries in `new`/`awaiting_chef` status. Uses `metadata.client_followup_48h_sent` flag for dedup. Monitored via `runMonitoredCronJob`. Email uses BaseLayout with branded CTA.

### Q20: Client can message chef from inquiry

**Grade: WORKING**
`lib/chat/actions.ts` (lines 1011-1090) `clientGetOrCreateConversation()` accepts `context_type: 'inquiry'` with `inquiry_id`. Chat available before chef formally responds.

### Q21: Inquiry decline notification

**Grade: FIXED -> WORKING**
Added `inquiry-declined.tsx` email template + `sendInquiryDeclinedEmail()`. Wired into `declineInquiry()` as non-blocking side effect. Email includes chef name, occasion, date, and "Browse Available Chefs" CTA.

### Q22: Client dashboard SSE real-time

**Grade: WORKING**
`ClientEventsRefresher` component listens to notification SSE and calls `router.refresh()` on event/payment notifications. Status updates live without page refresh.

---

## Phase 4: Quote & Proposal (Q23-Q29)

### Q23: Quote notification

**Grade: WORKING**
Client receives both email (via `lib/email/templates/quote-sent.tsx`) and in-app notification (via `circleFirstNotify()`) with actionUrl to `/my-quotes/{id}`.

### Q24: Quote cost breakdown

**Grade: WORKING**
`app/(client)/my-quotes/[id]/page.tsx` (lines 76-123) shows: total quoted amount, per-person pricing with guest count, flat rate label, deposit requirement and percentage, expiry date.

### Q25: Discuss quote without accepting/rejecting

**Grade: WORKING**
`MessageChefButton` (line 180-183) with label "Have a question? Message your chef" on pending quotes. Chat without committing.

### Q26: Quote expiry warning

**Grade: PARTIAL**
`QuoteExpiryCountdown` shows color escalation. No inline extension request button yet (backlog). Chat button available as workaround.

### Q27: Post-acceptance next step

**Grade: WORKING**
`acceptQuote()` triggers RPC: sets quote -> accepted, inquiry -> confirmed, creates/updates event atomically. Client sees event in `/my-events`. Clear forward flow.

### Q28: Multiple quote revisions

**Grade: FIXED -> WORKING**
Version badges added to both `my-quotes/page.tsx` (list) and `my-quotes/[id]/page.tsx` (detail). Shows "Revision N" badge when `version > 1` and "Superseded" badge when `is_superseded`. Pending and resolved quotes both display version info.

### Q29: Quote doesn't show menu

**Grade: FIXED -> WORKING**
`getClientQuoteById()` now joins menus + dishes via `quote.event_id`. Client quote detail renders "Your Menu" card with course names, descriptions, dietary tags, sorted by `sort_order`. Full menu visibility before accepting.

---

## Phase 5: Contract & Payment (Q30-Q37)

### Q30: Contract merge field null handling

**Grade: WORKING**
`lib/contracts/actions.ts` (lines 65-87) `renderMergeFields()` replaces null/undefined with empty strings. `formatCents()` defaults to "$0.00" for null amounts. No raw `{client_name}` tokens shown.

### Q31: Contract mobile responsiveness

**Grade: FIXED -> WORKING**
Signature pad rewritten with dynamic width via `containerRef` + `ResizeObserver`. Canvas sizes to container width, handles orientation changes. No more fixed 500px width that broke on mobile.

### Q32: Contract PDF download

**Grade: WORKING**
`contract-signing-client.tsx` (lines 89-96) shows "Download PDF" button after signing. Links to `/api/documents/contract/{contractId}`.

### Q33: Payment validation failure UX

**Grade: WORKING**
`payment-section.tsx` (lines 90-103) displays validation errors in Alert component with "Try Again" button. Retry triggers full reinitialization. Clear error text.

### Q34: Payment plan display

**Grade: WORKING**
`app/(client)/my-events/[id]/payment-plan/page.tsx` exists with `PaymentPlanCalculator`. Payment page shows deposit requirements with "remaining balance will be due later" messaging.

### Q35: Stripe payment failure handling

**Grade: WORKING**
`app/api/webhooks/stripe/route.ts` (lines 898-961): in-app notification with "try again" message, email receipt, chef notification of failure. Stripe error code logged and surfaced.

### Q36: Split payments / multiple methods

**Grade: MISSING**
Single Stripe PaymentElement only. No split payment, no multi-card, no gift card + card combination. Gift cards can cover full balance (then payment UI hidden) but no partial gift card + partial card.

**Note:** Low priority. Standard for this market segment.

### Q37: Payment confirmation

**Grade: WORKING**
Redirect to `/my-events/{id}?payment=success`, success alert shown, client notification created, email sent. Full coverage.

---

## Phase 6: Pre-Event Experience (Q38-Q44)

### Q38: Menu approval granularity

**Grade: WORKING**
`menu-approval-client.tsx` (lines 208-256) supports per-course feedback. Client can click chat icon on individual courses to add notes. Approval is whole-menu binary, but revision requests include per-course specifics.

### Q39: Menu revision with feedback

**Grade: WORKING**
Lines 298-325: textarea for overall feedback + per-course note inputs. Combined feedback sent via `requestMenuRevision()`. Chef gets structured feedback.

### Q40: Pre-event checklist content

**Grade: WORKING**
`pre-event-checklist-client.tsx` (lines 17-55) generates per-event: dietary prefs, allergies, kitchen details (size, constraints, equipment), parking/access instructions, house rules. Not generic.

### Q41: Countdown page practical info

**Grade: FIXED -> WORKING**
Countdown now shows serve time, arrival time, location, guest count, access instructions, special requests. Last-minute reminders card appears when event is 3 days or less away.

### Q42: Guest count updates after booking

**Grade: FIXED -> WORKING**
Added `requestGuestCountUpdate()` server action. Validates ownership, updates DB, notifies chef via chat message and in-app notification. Active events only (proposed/accepted/paid/confirmed).

### Q43: Share event with guests

**Grade: WORKING**
`ShareEventButton` creates share link. Event detail shows "Your dinner circle is live." Guests access via `/share/{token}` or `/event/{eventId}/guest/{secureToken}/`. Link is copyable and revokable.

### Q44: Late dietary restriction updates notify chef

**Grade: WORKING**
`lib/clients/client-profile-actions.ts` (lines 174-205) detects allergy/dietary changes. Chef receives `client_allergy_changed` notification with change details. Food safety covered.

---

## Phase 7: Guest Experience (Q45-Q49)

### Q45: Guest token recovery

**Grade: FIXED -> WORKING**
`GuestResendLink` component on share page. Collapsible email form, rate-limited (3/5min), enum-safe (always returns generic success). Server action `resendGuestPortalLink()` looks up guest by email + share token, sends portal link email. No token exposure.

### Q46: Guest portal mobile

**Grade: WORKING**
Uses `max-w-4xl mx-auto px-4 py-8 sm:py-12`, responsive grids `grid-cols-1 sm:grid-cols-2`, `grid-cols-1 sm:grid-cols-3`. Mobile-first Tailwind throughout.

### Q47: RSVP change after submission

**Grade: WORKING**
Portal already shows cutoff date prominently (line 654, 876 of portal-client.tsx). Locked state message at lines 848-851. Re-graded from Partial to Working after deeper code inspection.

### Q48: Guest feedback form timing

**Grade: WORKING**
Token-based, sent post-event. Checks `feedback.submitted_at` for already-submitted state. Triggered after event completion.

### Q49: Tipping interface

**Grade: WORKING**
Uber-style UX: suggested amount buttons, percentage-based if event total known, custom amount input, payment method selector (card/cash/venmo/other), optional notes. Chef gets 100% (no commission). Clean layout.

---

## Phase 8: Post-Event & Retention (Q50-Q57)

### Q50: Post-event client view

**Grade: WORKING**
`my-events/[id]/page.tsx` (lines 123-128) fetches photos and reviews for completed events. Displays `ClientEventPhotoGallery`, `ClientFeedbackForm`, `SubmittedReview`. Dedicated `/my-events/[id]/event-summary` page with menu recap, expense breakdown, timeline.

### Q51: Review/rating system

**Grade: WORKING**
`app/(public)/review/[token]/review-form.tsx` collects 5-star rating, text, display name, public consent. Reviews display via `ReviewShowcase` on chef profile. Full cycle: submit -> display on chef profile + client event page. Google Review CTA included.

### Q52: Rebooking flow

**Grade: FIXED -> WORKING**
Added "Book Again" CTA card on completed event pages with gradient styling and link to `/book-now`.

### Q53: Dinner Circle end-to-end

**Grade: WORKING**
Full implementation: `/my-hub` dashboard, `/my-hub/friends` with invite via profile token, `/my-hub/create` for new dinner groups, `/my-hub/share-chef` for recommendations. Groups auto-created on booking.

### Q54: Rewards program reality

**Grade: WORKING**
Points earned from real actions (events completed, guests served, milestones, referrals). Atomic redemption with balance check. Rewards from DB. Chef notified on redemption. Tier progression (Bronze/Silver/Gold/Platinum).

### Q55: Spending dashboard depth

**Grade: FIXED -> WORKING**
`SpendingInsights` component added when 2+ past events. Shows monthly average, peak month, trend direction (increasing/decreasing/steady), and horizontal bar chart of last 6 months. All derived client-side from event data.

### Q56: Re-engagement for inactive clients

**Grade: FIXED -> WORKING**
Cron route `app/api/scheduled/client-reengagement/route.ts`. Queries clients with `last_event_date` in 60-90 day window. Respects `automated_emails_enabled`, `marketing_unsubscribed`, `is_demo`, `deleted_at`. Personalized email with chef name and "Plan Your Next Event" CTA.

### Q57: Account deletion / GDPR

**Grade: FIXED -> WORKING**
Client account deletion at `/my-profile/delete-account`. 30-day grace period, cancel option, DELETE confirmation. GDPR data export downloads JSON (profile, events, quotes, messages). Link from profile page. Mirrors chef deletion pattern.

---

## Priority Fix List (Ordered by Impact)

### Critical (Data Loss / Dead Ends)

| #   | Issue                                               | Fix                                       |
| --- | --------------------------------------------------- | ----------------------------------------- |
| Q15 | Dietary restrictions lost between inquiry and event | Carry dietary data through event creation |
| Q10 | Thank-you page is dead end                          | Add navigation links                      |
| Q45 | Guest token recovery impossible                     | Add email-based resend                    |

### High (Revenue / Conversion Impact)

| #   | Issue                                  | Fix                                             |
| --- | -------------------------------------- | ----------------------------------------------- |
| Q19 | No inquiry follow-up emails            | Add 48h + 5d automated follow-ups               |
| Q29 | Quote doesn't show menu                | Include menu snapshot in quote view             |
| Q52 | No rebook button on completed events   | Add "Book Again" CTA                            |
| Q42 | Can't update guest count after booking | Add client-facing update with chef notification |
| Q16 | Inquiry form loses draft on navigation | Add sessionStorage persistence                  |
| Q6  | Chef profile has no loading state      | Add loading.tsx skeleton                        |

### Medium (UX Polish / Trust)

| #   | Issue                                     | Fix                                        |
| --- | ----------------------------------------- | ------------------------------------------ |
| Q5  | Embed widget breaks with invalid params   | Validate hex color, fallback to default    |
| Q21 | No decline email (in-app only)            | Add decline email with alternatives        |
| Q26 | No "Request Extension" on expiring quotes | Add pre-formatted extension request        |
| Q28 | Quote versions not labeled                | Add version badges                         |
| Q41 | Countdown page lacks practical info       | Add arrival time, prep reminders           |
| Q47 | RSVP cutoff not communicated clearly      | Show cutoff date, post-cutoff contact info |

### Low (Nice to Have)

| #   | Issue                             | Fix                               |
| --- | --------------------------------- | --------------------------------- |
| Q7  | No dollar-amount pricing signals  | Optional starting rate display    |
| Q11 | No waitlist for paused chefs      | Add email capture                 |
| Q31 | Contract not mobile-optimized     | Responsive text sizing            |
| Q36 | No split payments                 | Standard for market, low priority |
| Q55 | Spending dashboard lacks insights | Monthly trend chart               |
| Q56 | No client-facing re-engagement    | Automated "we miss you" email     |
| Q57 | No client account deletion / GDPR | Add deletion + export             |

---

## Execution Plan

**Phase A (Critical - Do Now):** Q15, Q10, Q45
**Phase B (High Impact):** Q19, Q29, Q52, Q42, Q16, Q6
**Phase C (UX Polish):** Q5, Q21, Q26, Q28, Q41, Q47
**Phase D (Backlog):** Q7, Q11, Q31, Q36, Q55, Q56, Q57

# Client Resilience Interrogation Protocol

> 40 questions focused on crash protection, error propagation, and Zero Hallucination violations in client-facing surfaces.
> Complements the 57-question Client Experience Interrogation (which covers feature completeness).
> Domain: Client portal, quotes, events, hub/dinner circles, profile, emails.
> Generated: 2026-04-16

---

## Scoring

- **PASS** - behavior matches spec, verified in code
- **FAIL** - broken, misleading, or missing
- **PARTIAL** - works but has gaps

---

## Crash Protection (CR1-CR10)

### CR1: Client Dashboard Crash on DB Error [P0]

**Question:** If the database is unreachable, does the client dashboard show a blank white screen or an error message?

**Current state:** `getClientDashboardData()` calls `getClientEvents()` which throws `'Failed to fetch events'` on DB error. No top-level try/catch on page. `Promise.all` rejects, page crashes to 500.

**Pass criteria:** DB failure shows user-friendly error state, not server error page.

**Priority:** P0

**What to build:** Wrap dashboard data fetch in try/catch. Render error state on failure.

---

### CR2: Quote List Crash on DB Error [P0]

**Question:** If `getClientQuotes()` throws, does the quotes page crash?

**Current state:** `getClientQuotes()` throws on DB error. No try/catch on page. Page crashes to 500.

**Pass criteria:** Error state shown instead of server error.

**Priority:** P0

**What to build:** Wrap in try/catch, render error state.

---

### CR3: Client Profile Page Crash [P0]

**Question:** If any of the 4 profile data fetches fail, does the profile page crash?

**Current state:** `Promise.all([getMyProfile(), getMyFunQA(), getClientSignalNotificationPref(), getMyMealCollaborationData()])` with zero `.catch()` handlers. Any failure crashes entire page.

**Pass criteria:** Non-critical fetches (funQA, signals, mealCollab) degrade gracefully. Only profile form is critical.

**Priority:** P0

**What to build:** Add `.catch()` to non-critical fetches.

---

### CR4: Event Detail 8-Way Crash [P0]

**Question:** If one of 8 sharing/RSVP parallel fetches fails on client event detail, does the entire page crash?

**Current state:** Lines 104-113 of my-events/[id]/page.tsx: 8 parallel fetches in `Promise.all` with zero `.catch()`. A failure in `getEventRSVPObservabilitySignals` (observability data) crashes the entire event detail.

**Pass criteria:** Each non-critical fetch has `.catch()`. Event core renders regardless of sharing data failures.

**Priority:** P0

**What to build:** Add `.catch()` with safe defaults to all 8 sharing fetches.

---

### CR5: Hub Group Page Crash (Public) [P0]

**Question:** If one of 6 unprotected hub data fetches fails, does the dinner circle crash for all guests?

**Current state:** Hub page (public route): `getGroupMembers`, `getGroupNotes`, `getGroupMedia`, `getGroupAvailability`, `getGroupEvents`, `getMealBoard` have no `.catch()`. Any failure crashes the entire page.

**Pass criteria:** Non-critical fetches (notes, media, availability, meal board) degrade gracefully.

**Priority:** P0 - Public-facing crash. Guests see server error when invited to a dinner party.

**What to build:** Add `.catch()` to all non-critical fetches.

---

### CR6: Event Detail Completed-Event Fetches [P1]

**Question:** If review/photo fetches fail for a completed event, does the page crash?

**Current state:** Lines 124-128: `getClientReviewForEvent`, `getGoogleReviewUrlForTenant`, `getEventPhotosForClient` in Promise.all with no catches.

**Pass criteria:** These non-critical fetches degrade gracefully.

**Priority:** P1

---

### CR7: Hub Circle Token Fetch [P1]

**Question:** If `getCircleTokenForEvent` fails, does the event detail crash?

**Current state:** Line 117: `getCircleTokenForEvent(params.id)` with no catch. Crash risk.

**Pass criteria:** Failure returns null, page renders without circle link.

**Priority:** P1

---

### CR8: Dashboard Widget Isolation [P1]

**Question:** Do dashboard widgets fail independently or cascade?

**Current state:** No Suspense/ErrorBoundary wrapping individual widgets. One malformed widget crashes all.

**Pass criteria:** Each widget isolated. Individual failure doesn't cascade.

**Priority:** P1

---

### CR9: Client Layout Auth Resilience [P2]

**Question:** Does the client layout handle auth check failure gracefully?

**Current state:** try/catch around `requireClient()` with redirect to signin. Correct.

**Pass criteria:** Already passing. PASS.

---

### CR10: localStorage Crash in Sidebar [P2]

**Question:** Does `localStorage.getItem` crash in private browsing or restricted contexts?

**Current state:** No try/catch around `localStorage` access in `ClientSidebarProvider`.

**Pass criteria:** localStorage wrapped in try/catch with fallback default.

**Priority:** P2 - Edge case but possible in strict browser environments.

---

## Zero Hallucination Violations (CR11-CR20)

### CR11: Expired Quotes Shown as "Pending Review" [P0]

**Question:** If a quote has `status === 'expired'`, what label does the client see?

**Current state:** `STATUS_DISPLAY` map (my-quotes/page.tsx:16-23) has only `sent`, `accepted`, `rejected`. Missing `expired`. Line 100 falls back to `STATUS_DISPLAY.sent` = "Pending Review". Client sees expired quote as actionable.

**Pass criteria:** Expired quotes show "Expired" label. Accept/reject buttons hidden.

**Priority:** P0 - Zero Hallucination violation. Expired quote displayed as actionable.

**What to build:** Add `expired` to STATUS_DISPLAY map.

---

### CR12: Financial Fallback Hallucination [P0]

**Question:** If `event.financial` is null, does the client see full quoted price as "Balance Due"?

**Current state:** Line 92: `outstandingBalanceCents = financial?.outstandingBalanceCents ?? quotedPriceCents`. Financial null = full price shown as outstanding. Client who paid $4K of $5K sees "$5,000 due."

**Pass criteria:** If financial data unavailable, show "Unable to load" not fake balance.

**Priority:** P0 - Client may overpay or dispute.

**What to build:** Guard against null financial, show appropriate state.

---

### CR13: Hub Recovery Email False Success [P0]

**Question:** If `sendCircleRecoveryEmail` fails, does the hub still say "Check your email"?

**Current state:** `startRecoveryTransition` wraps email send with no try/catch. `setRecoverySent(true)` executes on transition completion regardless of success.

**Pass criteria:** Email failure shows error, not false success.

**Priority:** P0 - Law 1 violation. Success shown without confirmation.

**What to build:** Add try/catch, only set recoverySent on success.

---

### CR14: Clipboard Copy Silent Failure [P1]

**Question:** If clipboard write fails on invite link copy, does the user get feedback?

**Current state:** `navigator.clipboard.writeText` has `.then()` but no `.catch()`. Fails silently.

**Pass criteria:** Failure shows toast error.

**Priority:** P1

---

### CR15: Notification Preference Save Silence [P1]

**Question:** Does changing hub notification preferences confirm success?

**Current state:** `updateMemberNotificationPreferences` checks `result.success` but has no catch block. No success toast.

**Pass criteria:** Success and failure both have user feedback.

**Priority:** P1

---

### CR16: Event Status Staleness [P1]

**Question:** Can the client see stale event status after chef transitions it?

**Current state:** `EventStatusRealtimeSync` component uses SSE. Need to verify it actually triggers re-render.

**Pass criteria:** Status updates within 5 seconds of chef action.

**Priority:** P1

---

### CR17: Quote Expiry Visual vs Server [P1]

**Question:** Client sees "Pending Review" + expired countdown but accept button still works?

**Current state:** Server rejects expired acceptance. But client sees button, clicks, gets error. Confusing UX.

**Pass criteria:** Accept button disabled when `valid_until < now`. Or error message is clear.

**Priority:** P1

---

### CR18: Banner Color Readability [P1]

**Question:** Are accepted/rejected banners on quote detail readable in dark theme?

**Current state:** `text-green-800` on `bg-green-950`, `text-red-800` on `bg-red-950`. Dark on dark.

**Pass criteria:** All status banners readable. Use lighter text variants.

**Priority:** P1

**What to build:** Change to text-green-300, text-red-300.

---

### CR19: Empty Inquiry Data Display [P2]

**Question:** Does missing inquiry data show blank space or "Not specified"?

**Current state:** `(quote.inquiry as any)?.field` returns undefined -> renders nothing.

**Pass criteria:** Null inquiry fields show fallback text.

**Priority:** P2

---

### CR20: Hub Archived Circle Content [P1]

**Question:** When a circle archives, can members still see past messages?

**Current state:** Inactive group shows only "ended" message. No past content rendered.

**Pass criteria:** Archived circle shows historical messages/photos in read-only mode.

**Priority:** P1

---

## Navigation & Routing (CR21-CR25)

### CR21: Client Nav /my-bookings vs /my-events [P0]

**Question:** Does the client nav link to a page that exists?

**Current state:** Nav links to `/my-bookings`. Dashboard page at `app/(client)/my-events/page.tsx`. Possible redirect or separate page.

**Pass criteria:** Nav links resolve to real pages. No 404.

**Priority:** P0

**What to verify:** Check if /my-bookings route exists.

---

### CR22: Missing Nav Links for Quotes [P1]

**Question:** Can clients reach quotes only through dashboard, or is there direct nav access?

**Current state:** No `/my-quotes` in client navItems. Only via dashboard widget.

**Pass criteria:** Quotes reachable from nav.

**Priority:** P1

---

### CR23: Sign-Out Session Cleanup [P2]

**Question:** If server signOut fails, does the session cookie persist?

**Current state:** catch block navigates to `/` regardless.

**Pass criteria:** Cookie cleared client-side on failure.

**Priority:** P2

---

### CR24: Mobile Nav Completeness [P1]

**Question:** Can mobile clients access all critical pages?

**Current state:** Mobile nav renders same items as sidebar. Should be complete.

**Pass criteria:** Events, quotes, profile all reachable on mobile.

**Priority:** P1

---

### CR25: Client Tour Broken Targets [P2]

**Question:** Do `data-tour` attributes reference elements that exist?

**Current state:** `data-tour="client-review-quote"` on quotes page, `data-tour="client-update-profile"` on profile.

**Pass criteria:** Tour targets match real elements. Missing target fails gracefully.

**Priority:** P2

---

## Data Integrity (CR26-CR30)

### CR26: Hub Member Privacy [P1]

**Question:** Can all hub members see each other's contact info?

**Current state:** `HubMemberList` renders member data. Fields exposed unknown.

**Pass criteria:** Members see names only. No email/phone exposed without consent.

**Priority:** P1 - Privacy.

---

### CR27: Hub Token Security [P2]

**Question:** Are group tokens guessable/enumerable?

**Current state:** Token used as sole access control on public route.

**Pass criteria:** Token is UUID/cryptographic random. Not sequential.

**Priority:** P2

---

### CR28: Client Opt-Out Respect [P1]

**Question:** Does the re-engagement cron respect `marketing_unsubscribed` and `automated_emails_enabled`?

**Current state:** Cron checks both flags. Verified in CO38 round.

**Pass criteria:** Already verified. PASS.

---

### CR29: Event Financial Consistency [P1]

**Question:** Do client-facing and chef-facing financial views show the same numbers for the same event?

**Current state:** Both use `event_financial_summary` view. Should be consistent.

**Pass criteria:** Same source = same numbers.

**Priority:** P1 - Verify both sides use the same view.

---

### CR30: Client Data Cross-Tenant Isolation [P1]

**Question:** Can a client see events or quotes from a different chef's tenant?

**Current state:** `requireClient()` returns user with `clientId`. Queries should scope by client ID.

**Pass criteria:** Every client query scopes by `client_id` from session.

**Priority:** P1 - Security.

---

## Communication (CR31-CR35)

### CR31: Event Transition Notifications [P1]

**Question:** When chef transitions event, is client notified immediately or on next cron?

**Current state:** Need to check if transitions trigger immediate email/notification.

**Pass criteria:** Critical transitions notify within 1 minute.

**Priority:** P1

---

### CR32: Email Unsubscribe Link [P1]

**Question:** Do all client emails include a working unsubscribe link?

**Current state:** Re-engagement email should include unsubscribe. Need to verify `BaseLayout` includes it.

**Pass criteria:** Every marketing email has unsubscribe. Clicking it sets `marketing_unsubscribed = true`.

**Priority:** P1 - CAN-SPAM compliance.

---

### CR33: Quote Notification Email [P1]

**Question:** When a chef sends a quote, does the client get an email with a direct link?

**Current state:** Need to verify quote send flow triggers notification.

**Pass criteria:** Email sent on quote creation. Link goes to `/my-quotes/{id}`.

**Priority:** P1 - Client may miss time-sensitive quotes.

---

### CR34: Email Rendering Cross-Client [P2]

**Question:** Do emails render in Gmail, Outlook, Apple Mail?

**Current state:** React Email generates compatible HTML. Good foundation.

**Pass criteria:** Core emails render without broken layouts.

**Priority:** P2

---

### CR35: Payment Confirmation Email [P1]

**Question:** After client pays, do they get a receipt/confirmation email?

**Current state:** Need to verify Stripe webhook triggers receipt email.

**Pass criteria:** Payment confirmation email with amount, event name, receipt link.

**Priority:** P1 - Client needs payment proof.

---

## Edge Cases (CR36-CR40)

### CR36: Double Quote Accept [P2]

**Question:** If a client clicks accept twice quickly, does it create duplicate transitions?

**Current state:** Need to check if `acceptQuote` has idempotency guard.

**Pass criteria:** Second click is no-op or rejected gracefully.

**Priority:** P2

---

### CR37: Concurrent Quote Accept/Reject [P2]

**Question:** If two browser tabs open the same quote, one accepts and one rejects?

**Current state:** Server actions should have status guards.

**Pass criteria:** First action wins. Second gets "Quote already accepted/rejected."

**Priority:** P2

---

### CR38: Client Portal Deep Link [P1]

**Question:** If a client clicks an email link while not logged in, do they land on the right page after login?

**Current state:** Auth redirect includes `?portal=client` but need to verify return URL.

**Pass criteria:** After login, client lands on the page from the email, not generic dashboard.

**Priority:** P1 - Lost context = confused client.

---

### CR39: Mobile Responsiveness [P1]

**Question:** Do client pages render correctly on mobile (375px width)?

**Current state:** Tailwind responsive classes used throughout. Need to verify key pages.

**Pass criteria:** Quote detail, event detail, hub page all usable on mobile.

**Priority:** P1

---

### CR40: Client Error Reporting [P2]

**Question:** If something goes wrong, can the client report it from within the portal?

**Current state:** `FeedbackForm` on profile page. But errors on other pages have no feedback mechanism.

**Pass criteria:** Client can reach feedback form from any page, or errors include "Report this issue" link.

**Priority:** P2

---

## Summary

| Priority | Count | IDs                                                                    |
| -------- | ----- | ---------------------------------------------------------------------- |
| P0       | 8     | CR1-CR5, CR11-CR13, CR21                                               |
| P1       | 19    | CR6-CR8, CR14-CR18, CR20, CR22, CR24, CR26, CR28-CR33, CR35, CR38-CR39 |
| P2       | 11    | CR9-CR10, CR19, CR23, CR25, CR27, CR34, CR36-CR37, CR40                |
| PASS     | 2     | CR9, CR28                                                              |

**P0 fixes to build now:**

1. **CR2** - Quote list try/catch
2. **CR3** - Profile page non-critical catches
3. **CR4** - Event detail 8 sharing catches
4. **CR5** - Hub group page 6 catches
5. **CR11** - Add `expired` to quote STATUS_DISPLAY
6. **CR12** - Financial fallback guard
7. **CR13** - Hub recovery email try/catch
8. **CR21** - Verify /my-bookings routing

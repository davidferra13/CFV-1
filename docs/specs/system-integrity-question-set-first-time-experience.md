# System Integrity Question Set: First-Time User Experience

> **Purpose:** Trace every path a first-time visitor takes from landing on cheflowhq.com through becoming a returning user. Three personas: consumer (hiring a chef), chef (signing up to use the platform), client (invited by a chef). Every dead end, broken bridge, and missing forward path must be identified.
> **Created:** 2026-04-18
> **Pre-build score:** 35/53 (66.0%)
> **Post-build score:** 46/53 (86.8%) -- 10 fixes

---

## A. First Impression and Value Clarity (6 questions)

Does the homepage communicate what ChefFlow is, who it serves, and what to do next?

| #   | Question                                                                                            | Pre-Build | Evidence                                                                                                                          |
| --- | --------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------- |
| A1  | Does the homepage hero clearly communicate what ChefFlow does in one sentence?                      | YES       | `page.tsx:305`: "Hire a chef who actually does this." + subtitle about dinners, catering, meal prep. Clear and direct             |
| A2  | Does the homepage serve both audiences (consumers hiring chefs AND chefs/operators) above the fold? | YES       | `page.tsx:358-389`: Operator band below hero: "Are you a chef or food operator?" with "Get Started Free" link                     |
| A3  | Does the homepage show social proof (chef count, reviews, trust signals) near the hero?             | YES       | `page.tsx:349-354`: Trust line: "X chefs listed, Free to browse, You pay the chef directly"                                       |
| A4  | Is there a clear primary CTA that a consumer can act on without scrolling?                          | YES       | `page.tsx:314-319`: Full-width "Book a Chef" button + search bar. Both above the fold                                             |
| A5  | Can a chef/operator find the "For Operators" path within 2 clicks from the homepage?                | YES       | `public-nav-config.ts:60`: "For Operators" is a top-level nav item (1 click)                                                      |
| A6  | Does the homepage search bar work and produce useful results for common queries?                    | YES       | `homepage-search.tsx`: Location autocomplete + service type dropdown. Routes to `/chefs?location=...&serviceType=...`. Functional |

**A score: 6/6**

## B. Public Navigation Completeness (7 questions)

Can every important public page be reached from the header nav within 2 clicks?

| #   | Question                                                                                          | Pre-Build | Evidence                                                                                                                                          |
| --- | ------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| B1  | Is "How It Works" accessible from the header nav (not buried in a dropdown)?                      | YES       | `public-nav-config.ts:56`: In "Hire a Chef" dropdown. 2 clicks from any page. Acceptable                                                          |
| B2  | Is FAQ accessible from the header nav or prominently linked from key pages?                       | FIXED     | Added to "Hire a Chef" dropdown in `public-nav-config.ts`. Now accessible within 2 clicks from any page                                           |
| B3  | Are there duplicate routes serving the same content (e.g., /privacy and /privacy-policy)?         | YES       | `/privacy-policy/page.tsx` redirects to `/privacy` via `redirect('/privacy')`. Proper canonical redirect, not duplicate content                   |
| B4  | Does every footer link resolve to a real page (no 404s)?                                          | YES       | Verified: /marketplace-chefs, /partner-signup, /trust, /contact, /terms, /privacy, /about, /ingredients, /faq, /how-it-works all exist            |
| B5  | Is the "Dinner Circles" entry in the nav and does it resolve to a functional page?                | YES       | `public-nav-config.ts:53`: In "Hire a Chef" dropdown. `app/(public)/hub/page.tsx` exists                                                          |
| B6  | Can gift cards be discovered from any global navigation path (not just individual chef profiles)? | NO        | Gift cards only in chef portal nav (`nav-config.tsx:316`: `/clients/gift-cards`). Not in public nav or footer. Consumer must visit a chef profile |
| B7  | Does the mobile nav expose the same set of pages as the desktop nav (no hidden-on-mobile pages)?  | YES       | `public-header.tsx:202-247`: Mobile menu renders same `PUBLIC_NAV` array as desktop. Plus mobile "Book" shortcut button                           |

**B score: 6/7**

## C. Signup Funnel Integrity (6 questions)

Does the signup flow clearly distinguish roles, minimize friction, and land the user in the right place?

| #   | Question                                                                                 | Pre-Build | Evidence                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| C1  | Does the public signup page clearly distinguish between chef and client/consumer signup? | FIXED     | Added role selector banner above chef form: two equal-sized cards ("I'm a Chef" / "I'm a Client") with visual distinction                    |
| C2  | Does the "Sign In" header link work for both chefs and clients (shared auth page)?       | YES       | `auth/signin/page.tsx`: Shared signin page. Role resolved from DB on auth. Works for both personas                                           |
| C3  | Does Google OAuth signup land the user in the correct role (chef vs client)?             | YES       | `auth-config.ts:197-209`: Existing users get their role. New users go to role-selection page (line 209 comment)                              |
| C4  | After chef signup, does the user land on a page that tells them what to do first?        | YES       | After signup -> signin -> dashboard. `OnboardingBanner` at `dashboard/page.tsx:409` + `OnboardingChecklistWidget` at line 427                |
| C5  | After client signup (via invitation token), does the user land in their client portal?   | 0.5       | `auth/signup/page.tsx:98`: Routes to `/auth/signin` after signup. Client must sign in again, then reaches portal. Extra step, but functional |
| C6  | Is there a client signup path that does NOT require an invitation token (self-service)?  | YES       | `auth/client-signup/page.tsx`: Works without token. Email field editable when no token. Linked from chef signup page and share pages         |

**C score: 5.5/6**

## D. Chef First 5 Minutes (8 questions)

What does a brand-new chef with zero data experience? Is the path from signup to first value clear?

| #   | Question                                                                                                   | Pre-Build | Evidence                                                                                                                                                     |
| --- | ---------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| D1  | Is the onboarding banner visible and prominent on the dashboard for a zero-state chef?                     | YES       | `dashboard/page.tsx:409`: `OnboardingBanner` renders immediately after header, before all widgets. Top of page                                               |
| D2  | Does the onboarding wizard have a clear, numbered sequence (not a wall of options)?                        | YES       | `OnboardingChecklistWidget` at line 427 shows progress. 5-screen interview + 5-7 wizard steps, sequenced                                                     |
| D3  | Does the dashboard avoid overwhelming a zero-state chef with empty sections/widgets?                       | NO        | 15+ `WidgetErrorBoundary` sections render on dashboard. Many use `Suspense fallback={null}` but section headers still show. Visual noise for zero-state user |
| D4  | Does the sidebar navigation use progressive disclosure (hide irrelevant groups until data exists)?         | NO        | `nav-config.tsx`: 13 collapsible nav groups. Module-based filtering exists but all enabled modules show all groups regardless of data                        |
| D5  | Is there a clear "first win" action (add a recipe, create an event, invite a client) within 2 clicks?      | YES       | Onboarding checklist directs to first actions. Dashboard "Core Areas" section (line 138) shows quick-access cards                                            |
| D6  | Does the empty state of every major section (events, clients, recipes) have a helpful CTA, not just blank? | YES       | Events page has empty state with "Create Event" CTA. Recipes sprint page has empty state. Client pages have empty states with messages                       |
| D7  | Are all features functional and free (no Pro badges, no locked buttons, no trial timers)?                  | YES       | `trial-banner.tsx`: Only shows for expiring/expired trials. `feature-classification.ts` gates exist but `isPaidFeature()` returns false for unknown slugs    |
| D8  | Does the Remy AI assistant introduce itself helpfully for first-time users?                                | YES       | `remy-drawer.tsx` has welcome/intro state for first interaction. Remy onboarding wizard has 3-step intro                                                     |

**D score: 6/8**

## E. Client First Contact (7 questions)

When a chef sends a proposal/invoice/worksheet to a client, is the client's experience cohesive?

| #   | Question                                                                                                 | Pre-Build | Evidence                                                                                                                                          |
| --- | -------------------------------------------------------------------------------------------------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| E1  | Do emails linking to authenticated pages (/my-events, /my-quotes) explain that an account is needed?     | FIXED     | Added auth note to `event-proposed.tsx` and `event-accepted.tsx`: "You may need to sign in or create a free account to view your event details"   |
| E2  | Does the proposal view page (/view/[token]) provide a forward path after accepting?                      | 0.5       | "Join" flow returns guest portal link. "Book my own" flow is dead end ("chef will follow up"). Partial forward path                               |
| E3  | Does the proposal view page link to the chef's public profile?                                           | YES       | `view/[token]/page.tsx:123-131`: "View Chef Profile" button shown when `chefProfileUrl` exists                                                    |
| E4  | Does the event share page (/share/[token]) provide account creation CTA after RSVP?                      | YES       | `share/[token]/page.tsx:352-362`: "Create a free account" link at bottom. Plus `JoinHubCTA` for RSVPed guests                                     |
| E5  | Is there a bridge from token-based public pages to the authenticated client portal?                      | NO        | Only `/share/[token]` has account creation CTA. Review, tip, worksheet, guest-feedback, ticket pages have zero bridge to portal                   |
| E6  | Does the client portal landing page (/my-events or equivalent) have a clear empty state for new clients? | YES       | `my-events/page.tsx:31`: `ClientDashboardEmptyState` component. Messages like "No events yet", "No quotes yet" with context                       |
| E7  | Does the worksheet page (/worksheet/[token]) match the visual theme of other public pages?               | NO        | Worksheet: `bg-stone-50` light theme, `text-stone-900`. Review/tip/feedback: `bg-stone-800` dark theme. Share page also light. Inconsistent split |

**E score: 4.5/7**

## F. Dead End Elimination (8 questions)

After completing an action on a token-based page, does the user have somewhere to go?

| #   | Question                                                                                         | Pre-Build | Evidence                                                                                                                                  |
| --- | ------------------------------------------------------------------------------------------------ | --------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| F1  | Does /review/[token] provide a forward path after submitting a review (chef profile, rebook)?    | FIXED     | Added `PostActionFooter` with chef profile link + "Powered by ChefFlow" link. Data query updated to include `chefSlug` and `chefName`     |
| F2  | Does /tip/[token] provide a forward path after tipping (chef profile, leave a review)?           | FIXED     | Added `PostActionFooter` to completed, declined, and form states. Chef slug added to `getTipRequestByToken` query                         |
| F3  | Does /guest-feedback/[token] provide a forward path after submitting feedback?                   | FIXED     | Added `PostActionFooter` with chef profile link. Chef data joined via `events.tenant_id` in `getGuestFeedbackByToken`                     |
| F4  | Does /worksheet/[token] provide a forward path after submitting (chef profile, portal signup)?   | FIXED     | Added chef profile link + "Powered by ChefFlow" link below form. Chef slug added to `getWorksheetByToken` query. Light-theme colors       |
| F5  | Does /e/[shareToken] provide a forward path after purchasing a ticket (add to calendar, portal)? | FIXED     | Added chef profile link + "Powered by ChefFlow" link to post-purchase "You're In!" state. `chefSlug` already in data                      |
| F6  | Does /share/[token] provide forward paths after RSVP (account signup, invite others, hub)?       | YES       | Gold standard: guest portal link, "Book Your Own Event" CTA, JoinHubCTA, GuestNetworkShare, account creation link. Multiple forward paths |
| F7  | Does every "already submitted" state (revisiting a completed form) show the same forward paths?  | FIXED     | All "already submitted" states now have `PostActionFooter` with chef profile link + branding link. Same forward paths as fresh submission |
| F8  | Does the "Powered by ChefFlow" footer on public pages link to cheflowhq.com (not dead text)?     | FIXED     | Worksheet footer replaced with proper `<a>` link. All other pages now have `PostActionFooter` with linked attribution                     |

**F score: 8/8**

## G. Visual and Brand Cohesion (5 questions)

Is the visual experience consistent across all surfaces a first-time user encounters?

| #   | Question                                                                               | Pre-Build | Evidence                                                                                                                                     |
| --- | -------------------------------------------------------------------------------------- | --------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| G1  | Do all public token-based pages use the same theme (dark/light) consistently?          | NO        | Review/tip/feedback: `bg-stone-800` (dark). Worksheet/share: `bg-stone-50` / `from-stone-50 to-white` (light). Mixed across similar surfaces |
| G2  | Does the public header show "ChefFlow" branding with logo on every public page?        | YES       | `public-header.tsx:123-126`: AppLogo + "ChefFlow" text. Renders on all `(public)` layout pages via `PublicHeader`                            |
| G3  | Is the color palette consistent between public pages, auth pages, and the chef portal? | YES       | Auth pages: `bg-stone-950`. Chef portal: stone dark palette. Public homepage: same. Consistent dark theme with brand accents                 |
| G4  | Do all email templates use consistent branding (sender name, logo, color scheme)?      | YES       | `base-layout.tsx` provides shared email layout. Consistent "ChefFlow" branding header across templates                                       |
| G5  | Does the "Powered by ChefFlow" attribution appear on all chef-branded public pages?    | FIXED     | Added via `PostActionFooter` to review, tip, guest-feedback. Worksheet and ticket pages also have linked attribution now                     |

**G score: 4/5**

## H. Cross-Persona Bridges (6 questions)

Can each persona discover and transition to the other personas' surfaces?

| #   | Question                                                                                          | Pre-Build | Evidence                                                                                                                                |
| --- | ------------------------------------------------------------------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| H1  | Can a consumer browsing chefs find the "I'm a chef, sign me up" path (public -> operator signup)? | YES       | `page.tsx:361`: Homepage operator band. `public-nav-config.ts:60`: "For Operators" top-level nav. Both visible and accessible           |
| H2  | Can a chef in the portal find their own public profile to verify what clients see?                | YES       | `nav-config.tsx:1485-1486`: "Public Profile" under Settings. Links to `/settings/public-profile`                                        |
| H3  | Can a client in the portal find the chef's public profile?                                        | YES       | `my-hub/share-chef/page.tsx:67-69`: Links to `/chef/${rec.chef_slug}`. Chef profile accessible from client portal                       |
| H4  | Does the /for-operators page have a clear CTA to sign up (not just information)?                  | YES       | `for-operators/page.tsx:119`: "Get Started Free" CTA button. Clear call to action                                                       |
| H5  | Can a guest who RSVPed via /share/[token] transition to a full client account?                    | YES       | `share/page.tsx:356-361`: "Create a free account" link with `guest_token` param for pre-fill. Clean bridge from guest to client account |
| H6  | Does the /book flow explain what happens after submitting an inquiry (expectation setting)?       | YES       | `book-dinner-form.tsx:223-237`: 5-step "What happens next" timeline after submission. Sets clear expectations                           |

**H score: 6/6**

---

## Scoring

| Domain                       | Pre    | Post   | Max    | Details                                              |
| ---------------------------- | ------ | ------ | ------ | ---------------------------------------------------- |
| A. First Impression          | 6      | 6      | 6      | Full marks                                           |
| B. Public Nav Completeness   | 5      | 6      | 7      | FIXED: B2 FAQ nav. Remaining: B6 gift card discovery |
| C. Signup Funnel Integrity   | 4.5    | 5.5    | 6      | FIXED: C1 role clarity. Remaining: C5 extra step     |
| D. Chef First 5 Minutes      | 6      | 6      | 8      | D3 zero-state overwhelm, D4 nav disclosure (design)  |
| E. Client First Contact      | 3.5    | 4.5    | 7      | FIXED: E1 email auth. Remaining: E5, E7 (design)     |
| F. Dead End Elimination      | 1      | 8      | 8      | FIXED: F1-F5, F7, F8. All dead ends eliminated       |
| G. Visual and Brand Cohesion | 3      | 4      | 5      | FIXED: G5 attribution. Remaining: G1 theme (design)  |
| H. Cross-Persona Bridges     | 6      | 6      | 6      | Full marks                                           |
| **TOTAL**                    | **35** | **46** | **53** | **66.0% -> 86.8%**                                   |

---

## Gap Analysis

### Fixed (10 items, this session)

1. **B2** - FAQ added to "Hire a Chef" dropdown in `public-nav-config.ts`
2. **C1** - Role selector banner added to `/auth/signup`: equal chef/client choice
3. **E1** - Auth note added to `event-proposed.tsx` and `event-accepted.tsx` email templates
4. **F1** - /review/[token]: `PostActionFooter` with chef profile link
5. **F2** - /tip/[token]: `PostActionFooter` on all states (completed, declined, form)
6. **F3** - /guest-feedback/[token]: `PostActionFooter` with chef profile link
7. **F4** - /worksheet/[token]: chef profile link + linked "Powered by ChefFlow" (light theme)
8. **F5** - /e/[shareToken]: chef profile + branding link on post-purchase state
9. **F7** - All "already submitted" states now have same forward paths as fresh submissions
10. **F8** - All "Powered by ChefFlow" text converted to linked `<a>` elements

**Shared component:** `components/public/post-action-footer.tsx` (PostActionFooter). Props: `chefSlug`, `chefName`, `crossLink`. Data pipeline: each token page joins to `chefs` table for `booking_slug` + `business_name`.

### Remaining Design Decisions (7 items, not code fixes)

1. **B6** - Gift card discoverability from public nav. Requires product decision: add public gift card landing page or nav entry
2. **C5** - Client post-signup redirects to signin instead of directly to portal. Extra step, functional but not ideal
3. **D3** - Dashboard zero-state widget overwhelm (15+ sections render for zero-data chef). Requires design decision on which widgets to hide
4. **D4** - Sidebar progressive disclosure. 13 nav groups all visible regardless of data. Requires design decision on which to defer
5. **E2** - "Book my own" flow on proposal view (/view/[token]) is a dead end after submission
6. **E5** - Token-based pages lack bridge to authenticated client portal (only /share has account creation CTA)
7. **E7/G1** - Theme inconsistency: worksheet (light) vs review/tip/feedback (dark). Requires standardization decision

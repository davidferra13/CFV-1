# Exit Eval: Client / TRUST, REVIEWS & VALIDATION

> Wave 2 | 6 scenarios | Solo mode | NEEDS-DEVELOPER-REVIEW
> Evaluated: 2026-05-25

---

## Scenario #8: Read third-party reviews

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client needs independent social proof before committing money and home access to a stranger. They trust Google/Yelp/TakeAChef because those reviews are on platforms they already use, with known moderation standards. The decision being made is: "Is this person safe, competent, and pleasant to have in my home?"

**Context ChefFlow has:**

- Chef's tenant ID, event history count, repeat client data
- External reviews already synced from Google Places and website JSON-LD (`lib/reviews/external-actions.ts`)
- Unified public review feed aggregating 4 sources: client_reviews, chef_feedback, external_reviews, guest_testimonials (`lib/reviews/public-actions.ts`)
- Review trust tiers: verified_chef_flow_event, verified_external_platform, chef_entered, unverified_import (`lib/reviews/command-center.ts`)
- Platform breakdown with per-source stats (Google, Yelp, Airbnb, TakeAChef, Thumbtack, etc.)
- ReviewShowcase component on public chef profile (`components/public/review-showcase.tsx`)
- ChefProofSummary with aggregated rating and source chips (`components/public/chef-proof-summary.tsx`)
- Outbound link to Google review URL when available
- Schema.org structured data for reviews (JSON-LD on profile)

**Data source?** Yes. Google Places API (already integrated via `external-sync`), website JSON-LD scraping (already integrated). Yelp API could be added. Reviews are pure data import.

**Client-collaborative angle:** Limited. Guests can leave testimonials via token-based review form (`app/(public)/review/[token]/page.tsx`). Past clients' consented reviews auto-populate. The Circle does not directly help here, but post-event guest feedback links generate fresh proof.

**Physical reality:** Screen-based. Client is in research/comparison mode, typically on phone or laptop. No hands-free need.

**Compounding:** High. Every event generates potential new reviews. The review corpus grows permanently. A chef with 50+ reviews across platforms displayed in one place eliminates 80%+ of the validation exit.

**Solution design:**

- Already built: unified review feed, external sync from Google/website, trust tiers, public showcase, structured data
- Gap 1: Yelp review import (API or scraping) not yet integrated
- Gap 2: No "View all on Google" / "View all on Yelp" prominent CTAs for clients who insist on checking the original source
- Gap 3: No review freshness indicator (e.g., "12 reviews in the last 6 months")
- Gap 4: No review snippet on discovery/search cards (only on full profile)

**Where it appears:**

- Public chef profile (`app/(public)/chef/[slug]/page.tsx`) via ReviewShowcase and ChefProofSummary
- Chef discovery/search results (currently no review snippet)
- Inquiry page context

**What remains as permanent exit:**
Client who specifically trusts only Google or Yelp's moderation will still click through to verify on those platforms. The "View on Google" link is the appropriate permanent bridge.

**Priority:** High frequency (top 7 client exit) x Low effort (mostly built) = HIGH priority to polish remaining gaps
**Spec needed?** No. Gaps are small polish items, not a new system.

---

## Scenario #9: Verify chef identity and background

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client is inviting a stranger into their home. They want to confirm this is a real person with verifiable professional history, not a scam or unsafe individual. The decision is: "Can I trust this person in my private space?"

**Context ChefFlow has:**

- Trust visual types system with signals: `verified_identity`, `background_check`, `food_safety_cert`, `insurance_verified`, `response_rate`, `repeat_clients`, `years_experience`, `reviews_count` (`lib/profile/trust-visual-types.ts`)
- Trust scoring weights (identity verification = 20 points, highest weight)
- TrustProfile model with badges, signals, trust score, and display config
- ChefCredentialsPanel showing work history, achievements, portfolio, charity impact (`components/public/chef-credentials-panel.tsx`)
- Public work history entries with role titles, organizations, dates, notable credits (`lib/credentials/actions.ts`)
- Public achievements (competitions, press features, awards, certifications, courses)
- Trust Center page explaining what ChefFlow verifies vs. does not (`app/(public)/trust/page.tsx`)
- Explicit disclosure: "ChefFlow does not run a universal background check on every chef"

**Data source?** Partially. LinkedIn/news articles are not API-accessible for bulk import. However, work history and achievements are chef-entered and can be verified against public records. Identity verification could use Stripe Identity or similar.

**Client-collaborative angle:** Minimal. The client cannot contribute verification data. However, repeat clients implicitly verify a chef by rebooking, which feeds the `repeat_clients` trust signal.

**Physical reality:** Screen-based research mode. No physical constraints.

**Compounding:** High. Once a chef's identity and professional history are verified and displayed, every future client benefits without re-verification. Trust profiles are permanent assets.

**Solution design:**

- Already built: trust signal types, credential storage, work history, achievements, Trust Center transparency page
- Gap 1: `verified_identity` signal exists in types but no actual identity verification flow is implemented (Stripe Identity or manual admin review)
- Gap 2: LinkedIn/social presence links not surfaced on public profile (only review sources are linked)
- Gap 3: "Years active on ChefFlow" and "X events completed" not shown as trust signals on public profile
- Gap 4: Trust score/badges not yet rendered on public-facing profile (types exist, rendering does not)

**Where it appears:**

- Public chef profile (partially via ChefCredentialsPanel, work history, achievements)
- Trust Center page (transparency about what is/isn't verified)
- Discovery results (not yet showing trust signals)

**What remains as permanent exit:**
Clients who want to do their own LinkedIn/Instagram/news research will always leave. The correct response is clean outbound links and confidence that ChefFlow has already surfaced the verifiable professional history.

**Priority:** Medium frequency x Medium effort (types built, rendering/verification flow needed) = MEDIUM priority
**Spec needed?** Yes, for identity verification flow and trust badge rendering on public profile. But this is part of the existing trust-visual-types system, not a new architecture.

---

## Scenario #10: Check food safety or license claims

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why client leaves:** Client wants assurance that the chef handling their food has proper training and certifications. They would check local health department sites or ask to see a ServSafe certificate. The decision is: "Is this person qualified to safely prepare food for my family/guests?"

**Context ChefFlow has:**

- Chef credentials system with types: `food_handler`, `business_license`, `event_permit`, `certification`, `other` (`lib/business-ops/credential-actions.ts`)
- Credential records with: issuing authority, credential number, issue date, expiry date, renewal URL, document path, reminder flags
- Chef certifications page (`app/(chef)/settings/protection/certifications/page.tsx`)
- Public badge system: "If a profile shows an insurance or certification badge, ChefFlow has an active uploaded record on file for that chef" (Trust Center)
- Trust signal: `food_safety_cert` with 15-point weight
- Expiry tracking with 30-day and 7-day reminder sent flags
- Trust Center explicitly explains badge meaning vs. self-reported claims

**Data source?** Partially. Food safety certificates (ServSafe, local health dept) are document-based, not API-queryable. ChefFlow already stores the uploaded documents and tracks expiry. The chef uploads; ChefFlow validates currency.

**Client-collaborative angle:** None. This is entirely chef-provided documentation verified by the platform.

**Physical reality:** Screen-based. Client checking before booking decision.

**Compounding:** High. Once a chef uploads their food handler card with expiry date, every future client sees the badge without asking. Renewal reminders ensure it stays current. The investment is one-time per credential per renewal cycle.

**Solution design:**

- Already built: credential storage, expiry tracking, badge concept, Trust Center transparency
- Gap 1: Public-facing badge rendering not fully wired (trust-visual-types exist but public profile does not render food_safety_cert badge dynamically based on active credential records)
- Gap 2: No "View certificate" or "Verified until [date]" on public profile for clients who want to see proof
- Gap 3: No automated check that credential is actually a recognized food safety cert (chef self-categorizes)

**Where it appears:**

- Public chef profile (should show food safety badge when active record exists)
- Trust Center (explains the badge model)
- Chef settings/protection/certifications (chef manages their records)

**What remains as permanent exit:**
A client who wants to independently verify with their local health department will still leave. This is rare and appropriate as a permanent exit for the most cautious clients.

**Priority:** Medium frequency x Low effort (infrastructure exists, needs rendering wiring) = HIGH priority (quick win)
**Spec needed?** No. The credential system and trust types are built. This is a rendering/wiring task to connect active credentials to public badge display.

---

## Scenario #11: Look for past event photos

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client wants visual evidence of what this chef actually produces. Plating quality, setup aesthetics, event ambiance. They go to Instagram or a chef portfolio site because ChefFlow does not yet surface this convincingly. The decision is: "Will my event look like what I'm imagining?"

**Context ChefFlow has:**

- Event photo system with types: plating, setup, process, ingredients, ambiance, team, other (`lib/events/photo-actions.ts`)
- Up to 50 photos per event, with captions and display ordering
- Public portfolio query: `getPublicPortfolio()` returns photos marked as portfolio pieces with signed URLs
- Portfolio entries system: event-linked showcase with description, guest count, menu highlights, photos, linked reviews (`lib/profile/portfolio-actions.ts`)
- PortfolioGallery component rendered on public chef profile (`app/(public)/chef/[slug]/page.tsx` imports it)
- Portfolio entries support occasion type, guest count range (intimate/small/medium/large/xl)
- Photos can be linked to specific events and reviews
- ChefCredentialsPanel includes portfolio showcase section

**Data source?** No. Photos are chef-generated content. Instagram is a distribution channel, not a data source ChefFlow should scrape.

**Client-collaborative angle:** Minimal for pre-booking. Post-event, guests and clients could contribute photos to the portfolio (not yet built). Dinner Circle recap sharing could feed this.

**Physical reality:** Visual browsing mode. Client wants high-quality images, ideally full-screen or lightbox. Mobile-first gallery UX matters.

**Compounding:** Very high. Every event is a potential portfolio addition. A chef with 20+ past event galleries becomes extremely compelling. The photo library is a permanent, growing asset.

**Solution design:**

- Already built: photo storage, portfolio marking, public portfolio query, gallery component, portfolio entries with metadata
- Gap 1: Gallery UX quality (lightbox, full-screen, swipe on mobile) not verified as polished
- Gap 2: No "filter by event type" on portfolio (intimate dinner vs. large party vs. corporate)
- Gap 3: No connection between portfolio photos and the review that goes with that event (linked_review_id exists but not rendered publicly)
- Gap 4: No portfolio preview on discovery cards (only full profile has gallery)

**Where it appears:**

- Public chef profile via PortfolioGallery and ChefCredentialsPanel
- Portfolio management in chef settings
- Public event share pages (post-event recap can include photos)

**What remains as permanent exit:**
Instagram remains the social discovery channel. Some clients will always check Instagram for "vibe" that a structured portfolio cannot convey (stories, reels, behind-the-scenes). A prominent Instagram link on the profile is the appropriate bridge.

**Priority:** High frequency (clients heavily visual) x Low effort (system built, needs polish) = HIGH priority
**Spec needed?** No. Infrastructure is complete. Polish items: lightbox UX, filtering, review-photo linking display.

---

## Scenario #12: Check references manually

**Original classification:** Permanent exit
**Reclassified to:** Permanent (Bridgeable)

**Why client leaves:** Some clients want to speak directly with a past client before booking. This is a high-trust, high-investment purchase (stranger in your home, potentially for a significant event). Phone/email/text references are human verification that no platform can fully replace. The decision is: "Will someone who has hired this person vouch for them personally?"

**Context ChefFlow has:**

- Client reviews with display consent (can show who reviewed)
- Repeat client data (chef can demonstrate retention)
- Event history with client names (private to chef)
- Guest testimonials system (public-facing)
- No formal "request a reference" flow
- No reference contact list or opt-in reference pool

**Data source?** No. References are human conversations. This is inherently analog.

**Client-collaborative angle:** Interesting angle: past clients who opt-in to being a reference could be contacted through the platform. A "willing to be a reference" checkbox on post-event feedback could build a reference pool. The Circle does not directly help pre-booking.

**Physical reality:** Phone call or email exchange. Entirely human interaction. ChefFlow's role is facilitation, not replacement.

**Compounding:** Medium. A reference pool grows over time. Once 3-5 past clients opt in, the chef has permanent social proof. But each reference conversation is one-off.

**Solution design:**

- Gap 1: No "Request a reference" button or flow on public profile
- Gap 2: No opt-in mechanism for past clients to join a reference pool
- Gap 3: No reference request tracking (chef does not know client asked for references)
- Gap 4: Could show "X clients willing to provide a reference" as a trust signal without revealing identities
- Alternative: Rich review corpus with verified events may reduce the need for manual references entirely

**Where it appears:**

- Would appear on public chef profile as a "References available" badge or "Request a reference" CTA
- Post-event feedback flow (opt-in checkbox)
- Chef dashboard (reference request notifications)

**What remains as permanent exit:**
The actual reference conversation (phone/email) is permanently external. ChefFlow can facilitate the connection but cannot replace the human exchange.

**Priority:** Low frequency (only high-end/cautious clients) x Medium effort (new flow needed) = LOW priority
**Spec needed?** No. The rich review system likely satisfies 90%+ of the validation need. A reference pool is a nice-to-have, not a critical gap.

---

## Scenario #13: Validate refund/cancellation policies

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client wants to understand their financial risk before paying. What happens if they cancel? What's the deposit situation? They search email threads, chef websites, or contract attachments because the policy is not prominently displayed where they make the payment decision. The decision is: "What's my financial exposure if plans change?"

**Context ChefFlow has:**

- Full cancellation policy engine (`lib/cancellation/policy.ts`) with configurable cutoff days and deposit refundability
- Three-tier policy: full refund (>cutoff days), full refund (within 24hrs of payment + >3 days to event), no refund (<cutoff days)
- CancellationPolicyDisplay component with compact and full variants (`components/events/cancellation-policy-display.tsx`)
- Policy displayed on client event detail page for accepted/paid/confirmed events
- Policy displayed on payment page before checkout (`app/(client)/my-events/[id]/pay/page.tsx`)
- Public refund-cancellation page exists but uses placeholder template (`app/(public)/refund-cancellation/page.tsx`)
- Trust Center mentions: "Review those written terms before paying. ChefFlow does not impose one universal refund policy across all chefs."
- Cancel event button on client portal (`app/(client)/my-events/[id]/cancel-event-button.tsx`)

**Data source?** No. Policy is internally defined per-chef configuration. No external data needed.

**Client-collaborative angle:** None directly. Policy is a chef-platform decision. However, the proposal/quote acceptance flow is where the client should see and acknowledge the policy.

**Physical reality:** Screen-based. Client is in decision-making mode before committing money.

**Compounding:** High. Once the policy is clearly surfaced at every decision point, every future client benefits. The system investment is one-time; the trust dividend is permanent.

**Solution design:**

- Already built: cancellation engine, policy display component (compact + full), shown on payment page and event detail
- Gap 1: Public refund-cancellation page is a placeholder (not real policy content)
- Gap 2: Policy not shown on quote acceptance page (should be visible before accepting)
- Gap 3: Policy not shown on proposal view (client sees proposal but not the cancellation terms alongside it)
- Gap 4: No "I acknowledge the cancellation policy" explicit consent capture during booking flow
- Gap 5: Per-chef policy customization not yet wired (DEFAULT_POLICY is the only config, 15-day cutoff)

**Where it appears:**

- Client event detail page (compact banner for active events)
- Payment page (shown before checkout)
- Public refund-cancellation page (placeholder, needs real content)
- Quote/proposal pages (gap: not shown here yet)

**What remains as permanent exit:**
Nothing. This is fully reducible. All policy information is internally owned and can be displayed at every relevant touchpoint without any external dependency.

**Priority:** Medium frequency x Low effort (mostly built, needs placement expansion) = HIGH priority (quick win)
**Spec needed?** No. The engine and component exist. Work is: fill public policy page, add policy display to quote/proposal acceptance, wire per-chef customization.

---

## Batch Summary

| #   | Title                                 | Reclassified To        | Spec Needed?                                             |
| --- | ------------------------------------- | ---------------------- | -------------------------------------------------------- |
| 8   | Read third-party reviews              | Partially Reducible    | No                                                       |
| 9   | Verify chef identity and background   | Partially Reducible    | Yes (trust badge rendering + identity verification flow) |
| 10  | Check food safety or license claims   | Reducible              | No                                                       |
| 11  | Look for past event photos            | Reducible              | No                                                       |
| 12  | Check references manually             | Permanent (Bridgeable) | No                                                       |
| 13  | Validate refund/cancellation policies | Reducible              | No                                                       |

---

## Evidence Index

| File                                                     | Relevance                                               |
| -------------------------------------------------------- | ------------------------------------------------------- |
| `lib/reviews/public-actions.ts`                          | Unified public review feed (4 sources)                  |
| `lib/reviews/command-center.ts`                          | Review source definitions, trust tiers                  |
| `lib/reviews/external-actions.ts`                        | External review sync (Google Places, website JSON-LD)   |
| `components/public/review-showcase.tsx`                  | Public review display with stars and platform breakdown |
| `components/public/chef-proof-summary.tsx`               | Aggregated proof block on chef profile                  |
| `lib/profile/trust-visual-types.ts`                      | Trust signals, badges, scoring weights                  |
| `lib/credentials/actions.ts`                             | Work history, achievements, charity impact              |
| `lib/business-ops/credential-actions.ts`                 | Food handler, business license, certification storage   |
| `app/(chef)/settings/protection/certifications/page.tsx` | Chef manages certifications                             |
| `lib/events/photo-actions.ts`                            | Event photos + public portfolio query                   |
| `lib/profile/portfolio-actions.ts`                       | Portfolio entries with metadata                         |
| `components/public/chef-credentials-panel.tsx`           | Public credentials display                              |
| `lib/cancellation/policy.ts`                             | Cancellation engine (3 tiers)                           |
| `components/events/cancellation-policy-display.tsx`      | Client-facing policy display                            |
| `app/(public)/trust/page.tsx`                            | Trust Center (what is/isn't verified)                   |
| `app/(public)/review/[token]/page.tsx`                   | Token-based review submission                           |
| `app/(public)/refund-cancellation/page.tsx`              | Public policy page (placeholder)                        |
| `app/(public)/chef/[slug]/page.tsx`                      | Public chef profile (imports all proof components)      |

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)_

# Exit Eval: Client / BOOKING COMPARISON & BUDGETING

> **Wave 2** | 7 scenarios | Evaluated: 2026-05-25
> **Mode:** Solo (NEEDS-DEVELOPER-REVIEW)
> **Evaluator:** Claude (exit-eval skill, solo batch)

---

## Scenario #14: Compare price ranges across options

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why client leaves:** Client has no mental model for what "fair" pricing looks like for a private chef dinner. They need to compare this quote against market reality (other chef quotes, restaurant equivalents, catering quotes) to decide if the price is reasonable for what they are getting. The underlying decision: "Am I overpaying, or is this good value?"

**Context ChefFlow has:**

- The chef's own quote (total, per-person, line items, add-ons)
- Guest count, event type, service style
- PIE market data (pricing intelligence engine with 1.1M+ price points)
- Industry benchmarks by cuisine and service type (`lib/finance/industry-benchmarks.ts`)
- Pricing confidence scoring with market position analysis (`lib/intelligence/pricing-confidence.ts`)
- Budget labels with per-person ranges (`lib/booking/budget-parser.ts`: casual $35, elevated $75, fine-dining $150, luxury $300)
- If multiple quotes exist: full side-by-side compare (`app/(client)/my-quotes/compare/page.tsx`)

**Data source?** Yes. PIE pricing database + industry benchmarks already exist in-app. External market data (Google, marketplace quotes) is the gap, but PIE partially covers it.

**Client-collaborative angle:** Dinner Circle members could share what they paid at similar events, building a social proof layer. "Your friend Jane's dinner was $85/person for a similar menu" would be powerful context.

**Physical reality:** Screen-based. Clients compare prices on their phone while reviewing proposals. Quick-glance pricing context (badge or inline note) is ideal.

**Compounding:** High. Market pricing context improves with every quote sent. PIE data deepens regionally. A client who books multiple times builds a personal price history baseline.

**Solution design:**

- Surface PIE market position data on the client-facing quote page ("This quote is at market rate for 8-guest Italian dinners in your area")
- Add a "typical range" indicator on quote detail: low / average / high for the service type
- Leverage existing `PricingConfidenceReport.marketPosition` field but expose a client-friendly version
- Show per-person breakdown with industry context (already partially built in quote compare view)
- Optional: "How does this compare?" expandable section with anonymized regional data

**Where it appears:**

- `/my-quotes/[id]` (individual quote view, inline context badge)
- `/my-quotes/compare` (already built, add market average row)
- Remy chat (client asks "is this a good price?" and Remy uses `budget-realism.ts` logic)

**What remains as permanent exit:**
Client may still Google "how much does a private chef cost" for broad validation from non-ChefFlow sources (Reddit threads, articles, friends). ChefFlow's PIE data reduces this but cannot eliminate the human desire for external validation.

**Priority:** High frequency (every client evaluates price fairness) x Medium effort (PIE data exists, needs client-facing surface) = HIGH
**Spec needed?** No. The infrastructure exists (`lib/intelligence/pricing-confidence.ts`, `lib/remy/budget-realism.ts`). Needs a client-facing widget on the quote page, which is a focused UI task.

---

## Scenario #15: Track multiple chef quotes

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client is shopping multiple chefs (common for first-time buyers or big events). They need to track who quoted what, compare terms, and make a decision. Without a central view, they use Notes app, spreadsheets, or email folders to keep track.

**Context ChefFlow has:**

- All quotes sent to this client across all chefs (if multiple chefs use ChefFlow)
- Full quote details: pricing model, line items, add-ons, exclusions, deposit, validity (`lib/quotes/client-compare-actions.ts`)
- Quote status (sent, accepted, rejected)
- Side-by-side comparison UI already built (`app/(client)/my-quotes/compare/page.tsx`, `components/quotes/quote-compare-selector.tsx`)
- Per-person calculation, lowest/highest price highlighting
- Event occasion and date context attached to each quote

**Data source?** No external data needed. This is entirely ChefFlow's own data.

**Client-collaborative angle:** The Dinner Circle planning board already supports adding candidates to a shared shortlist (`lib/hub/planning-candidate-actions.ts`). A household member or co-planner could vote on which chef/quote they prefer via circle consensus (`lib/hub/shared-dinner-planning.ts`).

**Physical reality:** Screen-based comparison. Mobile-friendly card layout needed. Quick decision: "Which one do I pick?" Glanceable summary row is ideal.

**Compounding:** Medium. Quote comparison data is event-specific, but the client's shortlist of preferred chefs compounds across bookings.

**Solution design:**

- Already built: `QuoteCompareSelector` lets client select 2-4 quotes and navigate to `/my-quotes/compare`
- Already built: Side-by-side columns with line items, per-person pricing, add-ons, totals, lowest/highest badges
- Gap: No saved shortlist of chefs across events (only per-event quotes)
- Gap: No integration with planning candidate board from client portal
- Add "My Shortlisted Chefs" section in client hub linking to previous quotes from favorite chefs

**Where it appears:**

- `/my-quotes` (list with compare mode toggle, already built)
- `/my-quotes/compare` (full comparison, already built)
- `/my-hub` (potential shortlist section)
- Dinner Circle planning board (collaborative shortlist)

**What remains as permanent exit:**
If a client is comparing ChefFlow chefs against non-ChefFlow chefs (who sent quotes via email/PDF), those external quotes cannot appear in the comparison view. This is inherent to the platform boundary.

**Priority:** High frequency x Already built = MAINTENANCE ONLY (small gaps in cross-event chef shortlist)
**Spec needed?** No. Core feature exists. Minor enhancement to link favorite operators to quote history.

---

## Scenario #16: Estimate total event budget

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why client leaves:** The chef quote is one line item in a larger party budget. The client needs to estimate total spend: venue, rentals, decorations, entertainment, alcohol, gratuity, tax, and food/chef. They use a spreadsheet or calculator to see the full picture and decide if the event is affordable.

**Context ChefFlow has:**

- Chef quote total (the food/service portion)
- Per-person pricing with guest count
- Add-on costs (already broken out)
- Deposit amount and payment timeline
- Event date, location, guest count
- Travel fees and service charges (if applicable)
- Tax and gratuity estimates (via pricing engine)

**Data source?** Partially. ChefFlow owns the food/chef cost. Other budget lines (venue, rentals, etc.) are external and unknown to ChefFlow unless the client enters them.

**Client-collaborative angle:** The Dinner Circle or event detail page could collect "other costs" from the client: "What's your venue costing? Any other vendors?" This builds the full picture without the client leaving. The co-host could contribute their portion of the budget knowledge.

**Physical reality:** Calculator/spreadsheet replacement. Mobile-friendly budget summary with editable fields. Quick-add pattern for "other costs."

**Compounding:** Medium. A client who hosts regularly builds a template of typical non-food costs. "Last time your venue was $2,000 and rentals were $800" is valuable recall.

**Solution design:**

- Add "Full Event Budget" section to event detail (client portal) with editable non-food cost fields
- Pre-populate the chef/food line from the accepted quote
- Allow client to add: venue, rentals, decorations, entertainment, alcohol, other
- Show total with per-person all-in calculation
- Export as PDF or shareable link for household approval
- Store budget data per event for future template reuse

**Where it appears:**

- `/my-events/[id]` (new "Budget" tab or section)
- Shareable proposal/event summary (include total budget context)
- Remy chat ("What's my total budget looking like?" uses stored data)

**What remains as permanent exit:**
Complex corporate event budgets with procurement approval workflows, multi-vendor coordination spreadsheets, and accounting integrations remain external. ChefFlow is not a full event budgeting platform.

**Priority:** Medium frequency (sophisticated clients and large events) x Medium effort (new client-facing fields + storage) = MEDIUM
**Spec needed?** Yes, but lightweight. A focused spec for "client event budget fields" on the event detail page.

---

## Scenario #17: Compare private chef vs catering vs restaurant

**Original classification:** Permanent exit
**Reclassified to:** Partially Reducible

**Why client leaves:** Client has not yet decided the FORMAT of their event (private chef at home vs. restaurant private dining vs. catered event). They are comparing fundamentally different service models, pricing structures, and experiences. They need to understand the tradeoffs before they can even start booking.

**Context ChefFlow has:**

- Public comparison pages already built (`app/(public)/compare/page.tsx`, `app/(public)/compare/[slug]/page.tsx`)
- Compare pages for ChefFlow vs HoneyBook and other tools (`lib/marketing/compare-pages.ts`)
- FAQ with pricing guidance ("$50 to $150+ per person for a private dinner")
- Public chef profiles with service types and pricing context
- Educational content about what private chef service includes

**Data source?** Partially. Restaurant and catering pricing is external. But ChefFlow's PIE data includes industry benchmarks, and the FAQ already addresses pricing ranges.

**Client-collaborative angle:** Limited. This is a pre-purchase research decision. However, a Dinner Circle could surface "Your group did a private chef last time and loved it" as social proof.

**Physical reality:** Screen-based research. Long-form content consumption. Blog/guide format is natural.

**Compounding:** Low for individual clients (one-time decision per event type). High for ChefFlow as a platform (educational content drives organic traffic).

**Solution design:**

- Create a public "Private Chef vs Catering vs Restaurant" comparison guide (SEO content)
- Include real per-person pricing ranges from PIE data for each format
- Add a "Which format is right for you?" quiz or decision tree on the public site
- Surface format education in discovery flow when client's event type is ambiguous
- Position private chef advantages clearly (customization, dietary control, experience, cleanup)

**Where it appears:**

- `/compare/private-chef-vs-catering` (new public comparison page)
- Public FAQ (already partially addresses this)
- Discovery flow (when client indicates uncertainty about format)
- Remy pre-booking chat (educate about format tradeoffs)

**What remains as permanent exit:**
Client will always want to check actual restaurant menus, catering company websites, and get real quotes from non-chef alternatives. ChefFlow educates but cannot replace the full comparison shopping experience across different vendor types.

**Priority:** Medium frequency (common for first-time buyers) x Low effort (content page, extends existing compare pattern) = MEDIUM
**Spec needed?** No. Extends existing `/compare` pattern with a new entry in `COMPARE_PAGES`. Content task, not engineering task.

---

## Scenario #18: Ask another household decision-maker to approve

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why client leaves:** The booking decision is shared. One spouse found the chef, but the other needs to see the proposal and approve the spend. Currently this means forwarding an email, screenshotting the quote, or texting a link with "what do you think?" The approver needs to see the full picture without creating an account.

**Context ChefFlow has:**

- Shareable proposal links with no-login access (`app/(public)/proposal/[token]/page.tsx`)
- Proposal public view with approve/decline actions (`components/proposals/proposal-public-view.tsx`)
- Co-host system built into Dinner Circles (`lib/circles/co-host-actions.ts`)
- Circle collaborator roles: co_host, sous_chef, server, observer
- Co-host dashboard with event details and financial view (`components/tickets/cohost-dashboard.tsx`)
- Split share token generation for both chef and client (`lib/payments/split-share-actions.ts`)
- Event sharing with RSVP and guest links (`lib/sharing/actions.ts`)

**Data source?** No. This is entirely a collaboration/permission problem, not a data problem.

**Client-collaborative angle:** This IS the client-collaborative scenario. The co-host/decision-maker joins the Dinner Circle (or receives a shareable proposal link) and can approve, comment, or decline directly. No account required for token-based proposal view.

**Physical reality:** Mobile-first. The second decision-maker receives a link via text/email, opens it on their phone, reviews, and taps approve/decline. Must be fast (< 30 seconds to understand and act).

**Compounding:** High. Once a household's decision-maker pattern is established (both spouses always review), future events auto-include both parties. The co-host relationship persists across events.

**Solution design:**

- Already built: Public proposal view with approve/decline (`/proposal/[token]`)
- Already built: Co-host invitations and dashboard
- Gap: No "Share with spouse for approval" button on the client quote/proposal page
- Gap: No notification to primary client when co-decision-maker approves/declines
- Add prominent "Share for Approval" CTA on `/my-quotes/[id]` and `/my-events/[id]/proposal`
- Generate a shareable link with optional comment field for the approver
- Notify primary client of approval/decline via email and portal notification

**Where it appears:**

- `/my-quotes/[id]` (share for approval button)
- `/my-events/[id]/proposal` (share for approval button)
- `/proposal/[token]` (approver landing page, already built)
- Push notification / email to primary client on decision

**What remains as permanent exit:**
If the approval requires a face-to-face conversation ("Let me show you this at dinner tonight"), that is inherently offline. But the shareable link serves as the conversation anchor.

**Priority:** High frequency (most bookings over $500 involve a second opinion) x Low effort (infrastructure exists, needs UX wiring) = HIGH
**Spec needed?** No. All infrastructure exists. Needs a "Share for Approval" button wired to existing proposal token system.

---

## Scenario #19: Save a chef for later

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Client found a chef they like but is not ready to book (event date not set, still deciding on format, waiting for budget approval). They need to bookmark this chef so they can return later without re-searching. Currently they use browser bookmarks, screenshots, or Notes app.

**Context ChefFlow has:**

- Favorite operators system for directory listings (`app/(client)/my-hub/favorite-operators/page.tsx`)
- Planning candidate shortlist with localStorage persistence (`app/(public)/eat/_components/shortlist-button.tsx`)
- Planning group system with candidate snapshots (`lib/hub/planning-candidate-actions.ts`)
- Public chef profiles with stable URLs (`app/(public)/chef/[slug]/page.tsx`)
- Consumer discovery flow with shortlist persistence (`lib/discovery/session-lifecycle-contract.ts`)
- Hub guest profiles for anonymous users (no account required to shortlist)

**Data source?** No. Entirely internal functionality.

**Client-collaborative angle:** Dinner Circle members can add chefs to a shared shortlist and vote on preferences (`lib/hub/shared-dinner-planning.ts`, `lib/hub/circle-consensus-contracts.ts`). "Your group shortlisted 3 chefs; 2 votes for Chef Maria."

**Physical reality:** Quick-action. Client taps a heart/save icon on a chef profile. Must work without requiring sign-in (localStorage + optional account sync). Return path: "My Saved Chefs" in client hub or email reminder.

**Compounding:** High. A client's favorite chef list grows over time. "You saved Chef Maria 3 months ago; she has availability next Saturday" is a powerful re-engagement trigger.

**Solution design:**

- Already built: Shortlist button on discovery results (localStorage-based, `shortlist-button.tsx`)
- Already built: Favorite operators page in client hub
- Already built: Planning candidate system with group tokens
- Gap: No "Save Chef" button on individual public chef profile pages
- Gap: No reminder system ("You saved Chef Maria 3 months ago, ready to book?")
- Gap: Favorite operators page shows directory listings, not chef profiles specifically
- Add save/heart button to `/chef/[slug]` page
- Add "Saved Chefs" section to client hub (distinct from "Favorite Operators")
- Optional: email reminder after 30/60/90 days for saved chefs

**Where it appears:**

- `/chef/[slug]` (save button on public profile)
- `/eat` discovery results (shortlist button, already built)
- `/my-hub` (saved chefs section)
- Email re-engagement ("Ready to book Chef Maria?")

**What remains as permanent exit:**
If the client saved a chef from a non-ChefFlow source (Instagram, friend's recommendation), they may still use their phone's native bookmarks/notes for those external references.

**Priority:** High frequency (very common pre-purchase behavior) x Low effort (infrastructure exists, needs profile-page button) = HIGH
**Spec needed?** No. Extend existing shortlist/favorite system to chef profile pages.

---

## Scenario #20: Calculate split costs among guests

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** Group dinner where guests split the cost. The host needs to calculate each person's share, communicate it, and track who has paid. Currently they use Calculator, Venmo's split feature, or Splitwise to figure out and collect per-person amounts.

**Context ChefFlow has:**

- Split billing system with per-guest amounts (`lib/payments/payment-splitting.ts`)
- Split share token generation for both chef and client (`lib/payments/split-share-actions.ts`)
- Public split breakdown page with no-login access (`app/(public)/split/[token]/page.tsx`)
- Split breakdown view component showing total, per-person, and payment status (`components/payments/split-breakdown-view.tsx`)
- Guest count from event details
- Per-person pricing calculation (already in quote system)
- Copy-to-clipboard for per-person amount
- Payment status tracking per split entry (paid/pending badges)
- Chef-side split billing management (`app/(chef)/events/[id]/split-billing/page.tsx`)

**Data source?** No. Pure math (total / guests) plus payment tracking. All internal.

**Client-collaborative angle:** The split share link IS the collaborative tool. Each guest receives a link showing what they owe. The Dinner Circle could integrate split status ("3 of 6 guests have paid"). Guests can mark themselves as paid.

**Physical reality:** Mobile-first. Host generates split link, shares via group chat. Guests open on phone, see their amount, copy it to Venmo/Zelle. The "Copy Amount" button is already built.

**Compounding:** Medium. Split calculation is per-event, but the guest payment pattern (who pays reliably, who needs reminders) compounds across events.

**Solution design:**

- Already built: Full split calculation and public share page
- Already built: Per-person amount display with copy button
- Already built: Payment status tracking (paid/pending)
- Already built: Token-based share link (no login required for guests)
- Gap: No integration with Venmo/Zelle request links (deep links to payment apps)
- Gap: No automated reminders to unpaid guests
- Gap: Client-side generation of split link (currently chef-initiated, but `generateClientSplitShareToken` exists)
- Add "Generate Split Link" button to client event page
- Add Venmo/Zelle deep link option (pre-fill amount in payment app URL)
- Add reminder option for unpaid guests

**Where it appears:**

- `/my-events/[id]` (generate split link button for client)
- `/split/[token]` (public guest-facing page, already built)
- Group chat (shared link)
- Dinner Circle (split status widget)

**What remains as permanent exit:**
Actual money movement (Venmo, Zelle, Cash App, bank transfer) remains external. ChefFlow calculates and communicates; payment apps execute. This is correct; ChefFlow should not become a payment processor between guests.

**Priority:** Medium frequency (group events only, ~30% of bookings) x Already mostly built = LOW (polish only)
**Spec needed?** No. Feature is 85% built. Needs client-side split link generation button and optional payment app deep links.

---

## Batch Summary

| #   | Title                                           | Reclassified To                  | Spec Needed?      |
| --- | ----------------------------------------------- | -------------------------------- | ----------------- |
| 14  | Compare price ranges across options             | Partially Reducible              | No                |
| 15  | Track multiple chef quotes                      | Reducible                        | No                |
| 16  | Estimate total event budget                     | Partially Reducible              | Yes (lightweight) |
| 17  | Compare private chef vs catering vs restaurant  | Partially Reducible              | No                |
| 18  | Ask another household decision-maker to approve | Reducible + Client-Collaborative | No                |
| 19  | Save a chef for later                           | Reducible                        | No                |
| 20  | Calculate split costs among guests              | Reducible                        | No                |

---

## Key Findings

**Infrastructure strength:** ChefFlow already has substantial coverage in this category. The quote comparison system (#15) is fully built. Split cost calculation (#20) is 85% built. Proposal sharing (#18) has all the infrastructure. The remaining gaps are primarily UX wiring (buttons, client-facing surfaces) rather than new systems.

**Highest-value gaps:**

1. Client-facing market pricing context on quote pages (leveraging existing PIE + pricing confidence)
2. "Share for Approval" button connecting existing proposal token system to client portal
3. "Save Chef" button on public profile pages (extending existing shortlist pattern)

**Pattern:** Most scenarios in this category are NOT about missing data or missing functionality. They are about missing CLIENT-FACING SURFACES for infrastructure that already exists on the chef side. The quote compare, split billing, co-host, and shortlist systems are built but not fully exposed to the client journey.

---

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef input)_

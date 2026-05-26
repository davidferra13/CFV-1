# Exit Eval: Guest / Proposal, Booking & Future Event Handoffs

> **Wave 4** | 6 scenarios | Category 9 from `docs/research/guest-exit-points-analysis.md`
> **Date:** 2026-05-25 | **Mode:** Solo (NEEDS-DEVELOPER-REVIEW)
> **Evaluator:** Claude (exit-eval skill, rubric from `.claude/skills/exit-eval/SKILL.md`)

---

## Scenario #54: Discuss proposal with spouse/team

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** The proposal recipient cannot unilaterally approve a significant spend. They need buy-in from a spouse, partner, event committee, or corporate team. The decision is social and involves budget authority, date availability, and preference alignment that lives in the relationship, not in a form.

**Context ChefFlow has:**

- Full proposal details (menu, pricing, date, guest count, personal note)
- Share token with public URL (`/proposal/[token]`)
- Chef profile, business name, cover photo
- Event occasion and date
- Per-guest cost breakdown
- Terminal states (approved/declined/expired) with feedback

**Data source?** No. This is a social/collaborative decision, not a data lookup.

**Client-collaborative angle:** The proposal page is already shareable via its token URL. However, there is no explicit "Share with co-decision-maker" action, no read receipt for secondary viewers, no mechanism for a co-approver to signal readiness or objection without full approve/decline authority. A Dinner Circle or lightweight co-approver invite could collect "I'm fine with this" from secondary stakeholders before the primary recipient commits.

**Physical reality:** Screen-based. The guest forwards a link via text/email to their spouse. The proposal page must render well on mobile for the secondary viewer. Current `ProposalPublicView` component (`components/proposals/proposal-public-view.tsx`) is responsive.

**Compounding:** Medium. For repeat clients (corporate event planners, couples who book annually), knowing the approval chain and who needs to see what reduces friction on every subsequent proposal. First-time value is lower.

**Solution design:**

- Add "Share this proposal" button to `ProposalPublicView` that copies a formatted message (title + price + link) to clipboard or opens native share sheet
- Add optional co-approver email field: chef can CC a second decision-maker when sending proposal
- Track secondary views (distinct from primary viewer) via a lightweight param or cookie
- Add "I'm ready to discuss" soft signal (not approve/decline) for co-viewers
- OG metadata is already good (`generateMetadata` in `app/(public)/proposal/[token]/page.tsx` includes title, description, cover image)

**Where it appears:**

- `/proposal/[token]` page (primary surface)
- Proposal email notification (link delivery)
- Chef proposal builder (add co-recipient field)

**What remains as permanent exit:**
The actual conversation between spouses/team members about budget, timing, and preferences. ChefFlow cannot replace the social deliberation, only make the artifact they discuss maximally self-contained and shareable.

**Priority:** High frequency (most proposals over $500 involve a second decision-maker) x Low effort (share button + OG is nearly free) = **High priority, low lift**
**Spec needed?** No (small UX enhancement, not a standalone system)

---

## Scenario #55: Negotiate proposal terms verbally

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why guest leaves:** The guest wants to adjust scope (fewer courses, different date, lower guest count, swap an add-on) but the proposal is a static document with only approve/decline actions. Nuanced negotiation (e.g., "Can we do 8 guests instead of 12 and drop the dessert course?") naturally moves to phone or email where back-and-forth is fluid.

**Context ChefFlow has:**

- Full proposal with line-item pricing (base + add-ons per person)
- Guest count, date, menu breakdown by course
- Decline reason text field (exists in `ProposalPublicView` but only captures post-decision feedback)
- Chef contact info and profile
- Proposal status FSM: draft -> sent -> viewed -> approved/declined/expired

**Data source?** No. This is human negotiation.

**Client-collaborative angle:** The client/guest knows their constraints (budget ceiling, date flexibility, headcount uncertainty). A structured "Request revision" form could capture these in a way the chef can act on immediately without a phone call. The chef could then create a revision (new proposal version) and re-send.

**Physical reality:** Screen or phone. Many guests prefer a quick text/call for negotiation. But a structured revision request ("I'd like to adjust: [budget] [dates] [guest count] [menu items]") could eliminate the phone call entirely for simple adjustments.

**Compounding:** Medium. Revision patterns (clients who always negotiate, common adjustment types) could inform future proposal pricing strategy. But each negotiation is contextual.

**Solution design:**

- Add "Request Changes" button alongside Approve/Decline in `ProposalPublicView` (currently only approve/decline exist)
- Structured revision form: checkboxes for what to adjust (budget, date, guest count, menu, add-ons) plus free-text
- Revision request creates a notification for the chef with structured data
- Chef can create a new proposal version (revision) linked to the original
- Thread view: show revision history on proposal page (v1, v2, etc.)

**Where it appears:**

- `/proposal/[token]` page (new "Request Changes" action)
- Chef proposals dashboard (revision requests queue)
- Email notification to chef on revision request

**What remains as permanent exit:**
Complex multi-party negotiations (corporate procurement, venue constraints) that require real-time verbal discussion. Simple adjustments (price, date, count) become reducible.

**Priority:** High frequency (most proposals get at least one question before approval) x Medium effort (new action + notification + revision linking) = **High priority, medium lift**
**Spec needed?** Yes (proposal revision thread system warrants a spec)

---

## Scenario #56: Sign a separate venue or company document

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** External legal or procurement requirements exist beyond the chef-client relationship. Corporate clients need W-9s, vendor agreements, insurance certificates. Venue rentals require separate liability waivers. These documents live in procurement portals, DocuSign, or email attachments controlled by third parties.

**Context ChefFlow has:**

- Event contracts system (`event_contracts` table with `body_snapshot`, `status`, `signed_at`, `signer_ip_address`)
- Contract generation (`lib/documents/generate-contract.ts`) with multi-page PDF support
- Contract status tracking (draft, sent, signed)
- Insurance expiry tracking (`insurance_expires_at` column on `event_contracts`)
- Chef business details (name, email, phone)
- Client and event details linked to contracts

**Data source?** No. External legal/procurement systems own their own documents and signing workflows.

**Client-collaborative angle:** Limited. The client/guest knows their company's procurement requirements, but those requirements are fulfilled in external systems. ChefFlow's role is to provide the chef-side documents (contract, W-9, insurance cert) that feed into the external process.

**Physical reality:** Screen-based document signing. External portals are the destination.

**Compounding:** Low per-document, but medium for repeat corporate clients. If ChefFlow tracks "Client X requires W-9 + COI + vendor agreement" then future bookings auto-prepare the chef's side of the paperwork.

**Solution design:**

- Track external document requirements per client/event (checklist: "Venue requires liability waiver", "Company requires W-9")
- Store status: "pending external signature", "completed", with optional link or upload of signed copy
- Surface document readiness in event timeline/checklist
- Auto-remind chef to prepare their documents (insurance cert, W-9) when a corporate client books

**Where it appears:**

- Event detail page (document checklist)
- Client profile (standing procurement requirements)
- Proposal/contract flow (auto-attach standard docs)

**What remains as permanent exit:**
The actual signing of external documents in external portals. ChefFlow tracks status and provides chef-side artifacts but cannot replace procurement systems, venue waivers, or corporate vendor onboarding portals.

**Priority:** Low frequency (corporate/venue bookings are minority of private chef events) x Low effort (status tracking is lightweight) = **Low priority**
**Spec needed?** No (status field addition, not a system)

---

## Scenario #57: Book again from post-action footer

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why guest leaves:** After completing a guest action (feedback, review, tip, proposal response, worksheet), the guest wants to book their own event. The `PostActionFooter` component provides forward paths (chef profile, "Book Again" link) but the transition involves a role change: guest token user becomes a new lead/inquiry. Context from the attended event (chef, cuisine style, occasion) should carry forward but currently only name/email prefill exists.

**Context ChefFlow has:**

- `PostActionFooter` component (`components/public/post-action-footer.tsx`) with chef profile link, cross-links, and name/email prefill
- `RebookButton` component (`components/client-portal/rebook-button.tsx`) with `?rebook={eventId}` param
- `getRebookPrefillData` action (`lib/events/rebook-actions.ts`) fetches full event context for prefill
- Guest lead form (`components/guest-leads/guest-lead-form.tsx`) with post-submission paths to chef profile and inquiry
- `guest_leads` table has `source`, `source_event_share_id`, `source_invite_token` columns for tracking origin
- Chef slug available on most token pages for linking to `/chef/[slug]/inquire`

**Data source?** No. This is an internal routing/prefill problem.

**Client-collaborative angle:** N/A. The guest IS the future client here.

**Physical reality:** Screen-based. Guest is already on their phone after completing a form. The next action should be one tap away.

**Compounding:** High. Every guest-to-client conversion that carries source event data builds the chef's referral intelligence. Knowing "3 guests from the Johnson dinner became clients" is powerful business data.

**Solution design:**

- Unify post-action footers to always include "Book Your Own Event" with source event context in query params (`?source_event={id}&chef={slug}`)
- Guest lead form should accept and store `source_event_id` when submitted from a post-action context
- Inquiry form at `/chef/[slug]/inquire` should accept `?source_event={id}` and display "Inspired by [occasion] on [date]" context
- Track guest-to-lead conversion attribution in `guest_leads.source` (already has the column, just needs consistent population)
- Add "Book your own event" as a primary CTA (not just secondary link) on guest feedback success state

**Where it appears:**

- `PostActionFooter` on all token pages (feedback, review, tip, worksheet, proposal)
- Guest lead form success state (`GuestLeadForm` component)
- `/chef/[slug]/inquire` page (source event prefill)
- Chef analytics (conversion attribution)

**What remains as permanent exit:**
Nothing. This is fully reducible. The guest never needs to leave ChefFlow to book again; they just need a clearer, more contextual path from "I attended" to "I want to book."

**Priority:** High frequency (every guest is a potential future client) x Low effort (routing + query params, infrastructure exists) = **Highest priority in this batch**
**Spec needed?** No (wiring improvement using existing infrastructure)

---

## Scenario #58: Compare multiple chefs after attending dinner

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why guest leaves:** A guest enjoyed the dinner experience and now wants to hire a private chef for their own event, but wants to compare options before committing to the chef they experienced. They may search Google, check Take a Chef, browse other platforms, or ask friends for recommendations.

**Context ChefFlow has:**

- Chef directory at `/chefs` with search, filters (cuisine, service type, location, price range, experience), and sort
- Compare hub at `/compare` for platform-level comparisons
- Individual chef profiles at `/chef/[slug]` with services, menus, reviews, proof sections
- Guest lead form that links to "Browse Chefs" after submission
- `ChefCard` component for directory listings
- Faceted search (cuisine, state, "best for", experience type, partner type)

**Data source?** Partially. ChefFlow IS the comparison tool for chefs on the platform. But the open market (Google, Instagram, other platforms) remains external.

**Client-collaborative angle:** Limited. The guest's comparison criteria are personal (budget, cuisine preference, location, personality). ChefFlow can surface these as filters.

**Physical reality:** Screen-based browsing. Mobile-optimized directory is important since guests often browse casually after an event.

**Compounding:** Medium. If a guest creates a shortlist or saves chefs, that preference data persists. But most comparisons are one-time during the decision phase.

**Solution design:**

- Ensure guest lead form success screen prominently links to `/chefs` with relevant filters pre-applied (e.g., same cuisine type, same region as the event they attended)
- Add "Explore more chefs like [Chef Name]" section to post-action pages using cuisine/location matching
- Consider a "Save for later" or "Shortlist" feature accessible without full account (cookie-based, like Circle profiles)
- Ensure `/chefs` directory renders well on mobile for casual post-dinner browsing
- Include source event context when guest navigates from attended event to directory (for attribution)

**Where it appears:**

- Guest lead form success state ("Browse Chefs" link already exists)
- Post-action footer on token pages
- `/chefs` directory (landing destination)
- `/chef/[slug]` profile pages (comparison point)

**What remains as permanent exit:**
Guests will always check external sources (Google reviews, Instagram, friend recommendations, other platforms) for broader market comparison. ChefFlow cannot be the only comparison surface because not all chefs are on ChefFlow.

**Priority:** Medium frequency (subset of guests who want their own event AND want to compare) x Low effort (better linking from guest surfaces to directory) = **Medium priority**
**Spec needed?** No (routing and filter prefill enhancement)

---

## Scenario #59: Ask chef directly before submitting lead form

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why guest leaves:** The guest met the chef at a dinner and already has a personal connection. They want to text, call, or speak in person before filling out a formal form. The relationship started offline (at the dinner table), and the guest's natural next step is to continue that conversation in the channel it began: face-to-face, text message, or Instagram DM.

**Context ChefFlow has:**

- Guest landing page `/g/[code]` with QR code scanned at events
- Guest lead form captures name, email, phone, message
- Chef profile with public-facing info
- `kiosk` mode for in-event capture (device passed between guests)
- Notification to chef on lead submission
- Post-submission paths to chef profile and direct inquiry

**Data source?** No. This is a human relationship channel preference.

**Client-collaborative angle:** N/A. The guest IS the future client, and they prefer direct human contact.

**Physical reality:** Voice/in-person. The guest is literally at the dinner with the chef. The conversation is happening in meatspace. The QR code and form are a fallback capture mechanism for "I want to remember to follow up later."

**Compounding:** Low for the individual interaction, but high for the chef's lead capture rate. Every guest who asks directly but never submits the form is a lost data point. The form captures intent even when the conversation already happened.

**Solution design:**

- Frame the QR/guest lead form as "Save my info so [Chef] can follow up" rather than "Submit an inquiry" (already partially done: "I'd love to host my own event" heading)
- Add explicit copy: "Already chatted with [Chef]? Drop your info here so nothing falls through the cracks."
- Consider a minimal "just my contact info" mode (name + phone only, no event details required) for guests who already discussed details verbally
- Chef-side: when a lead comes in marked as "already spoke at event", prioritize differently than cold leads

**Where it appears:**

- `/g/[code]` guest landing page (QR scan target)
- Physical QR card/table tent at events (offline touchpoint)
- Guest lead form messaging and CTA copy

**What remains as permanent exit:**
The initial conversation itself. Guests will always talk to the chef directly at dinner. ChefFlow's role is to capture the follow-up intent, not to mediate the initial human connection. The personal relationship IS the product; the form is just the memory aid.

**Priority:** High frequency (most interested guests talk to the chef at dinner before any form) x Very low effort (copy changes) = **High priority, trivial lift**
**Spec needed?** No (copy/UX refinement only)

---

## Batch Summary

| #   | Title                                         | Reclassified To     | Spec Needed? |
| --- | --------------------------------------------- | ------------------- | ------------ |
| 54  | Discuss proposal with spouse/team             | Bridgeable          | No           |
| 55  | Negotiate proposal terms verbally             | Partially Reducible | Yes          |
| 56  | Sign a separate venue or company document     | Permanent           | No           |
| 57  | Book again from post-action footer            | Reducible           | No           |
| 58  | Compare multiple chefs after attending dinner | Bridgeable          | No           |
| 59  | Ask chef directly before submitting lead form | Permanent           | No           |

### Classification Distribution

- Reducible: 1 (#57)
- Partially Reducible: 1 (#55)
- Bridgeable: 2 (#54, #58)
- Permanent: 2 (#56, #59)

### Key Findings

1. **#57 (Book again from post-action footer)** is the highest-value scenario: infrastructure already exists (`PostActionFooter`, `RebookButton`, `guest_leads.source` column, `source_event_share_id` FK) but is not consistently wired. This is a routing/attribution fix, not a build.
2. **#55 (Negotiate proposal terms)** is the only scenario needing a spec: proposal revision threading is a meaningful new capability that would reduce a high-frequency exit.
3. **#59 (Ask chef directly)** is trivially improvable with copy changes to the guest lead form framing.
4. The proposal page (`/proposal/[token]`) has strong OG metadata and responsive design but lacks explicit "share with co-decision-maker" and "request revision" actions.
5. The `guest_leads` schema already supports source attribution (`source`, `source_event_share_id`, `source_invite_token`) but the `submitGuestLead` action in `lib/guests/lead-actions.ts` does not populate these columns from post-action footer contexts.

### All scenarios marked: NEEDS-DEVELOPER-REVIEW

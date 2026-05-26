# Exit Eval: Partner / COMMUNICATION & RELATIONSHIP MANAGEMENT

> Wave 5 | 5 scenarios | Role: PARTNER
> Evaluator: Claude (Solo mode)
> Date: 2026-05-25
> Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #37: Message chef about a new referral

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** Partner has a warm lead (guest asking about private chef services) and needs to pass that context to the chef immediately. The operational need is lead handoff with context: who is the person, what they want, when, any details. The partner leaves because the partner portal has zero messaging or note-submission surfaces today.

**Context ChefFlow has:**

- Partner identity, contact info, location associations
- Chef contact details (phone, email)
- Partner's referral history and performance metrics
- Event history at partner locations
- `referral_records` table (chef-side only, partner cannot write to it)
- Rail registry defines `partner.message_from_chef_partner` item (data source: `partner_messages`) but no underlying table or UI exists

**Data source?** No. This is partner-authored content (a message/note), not an external API.

**Client-collaborative angle:** The referred guest could be invited directly into a Dinner Circle or inquiry flow via a referral link. The partner provides the bridge introduction; ChefFlow captures the guest's own details downstream. Partner submits the warm intro, system generates a trackable referral link the partner can share with the guest.

**Physical reality:** Screen-based. Partner is typically at their desk, phone, or property management station when they get a guest inquiry. Quick text input is the natural interface. Mobile-friendly form matters.

**Compounding:** High. Every referral note builds the partner's track record. Patterns emerge (types of guests, timing, event sizes). The chef sees partner engagement and can reward active referrers. Referral attribution becomes automatic rather than manual text/email hunting.

**Solution design:**

- Add "Submit a Referral" action on partner dashboard and events page
- Capture: guest name, contact (optional), event type/date (optional), notes
- Creates a `referral_records` entry with `status: 'submitted'` (partner-authored, chef reviews)
- Generates a trackable referral link the partner can share with the guest
- Notifies chef via rail item and optional email
- Shows referral submission history on partner dashboard

**Where it appears:**

- `/partner/dashboard` (primary CTA button)
- `/partner/events` (contextual "refer for this venue" link)
- Partner rail: `partner.referral_submitted` confirmation item

**What remains as permanent exit:**
The social act of actually telling the guest about the chef (text, conversation, guidebook mention) always happens outside ChefFlow. ChefFlow captures the structured referral data before or after that social moment.

**Priority:** Very high frequency (partners' primary value-add action) x Low effort (simple form + DB insert) = P1
**Spec needed?** Yes (combines with scenario #45 from referral generation category)

---

## Scenario #38: Call chef about urgent venue issue

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** A physical/operational emergency at the venue requires immediate voice communication. Examples: burst pipe in kitchen, power outage, last-minute access change, unexpected construction blocking loading zone. The urgency demands a phone call because text/async is too slow and the chef needs to make real-time decisions (reroute, delay, cancel).

**Context ChefFlow has:**

- Partner's phone number and chef's phone number (both in DB)
- Event date, time, location, guest count for upcoming events
- Location access notes, parking, loading details
- Event timeline and prep status

**Data source?** No. Voice communication is inherently human and real-time.

**Client-collaborative angle:** Minimal. The client/guest is not involved in venue operational emergencies. The chef and partner resolve it directly.

**Physical reality:** Voice is the only appropriate interface for urgent operational issues. The partner may be walking the property, dealing with a contractor, or managing a crisis. Hands may be occupied. The call itself is permanent.

**Compounding:** Medium. Post-call notes compound significantly. If ChefFlow captures "what happened, what was decided, what changed" after the call, that builds a venue incident history. Future events at the same location benefit from knowing "last time there was a water issue in the south wing kitchen."

**Solution design:**

- Add "Log a call note" quick action on partner dashboard (post-call capture)
- Fields: related event (optional dropdown of upcoming events), related location, issue summary, resolution/outcome, follow-up needed
- Stores as a partner-authored note tied to location and/or event
- Chef sees the note on event detail and location detail pages
- Pre-call: surface chef's phone number prominently on partner dashboard when an event is within 48 hours

**Where it appears:**

- `/partner/dashboard` (quick action: "Log venue issue")
- `/partner/locations/[id]` (location-specific issue log)
- Chef's event detail page shows partner-submitted notes

**What remains as permanent exit:**
The phone call itself. ChefFlow will never replace real-time voice for urgent operational coordination. The value is in capturing the outcome, not replacing the channel.

**Priority:** Low frequency (emergencies are rare) x Low effort (simple note form) = P3
**Spec needed?** No (simple post-call note capture, part of broader partner messaging surface)

---

## Scenario #39: Coordinate with venue staff

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why partner leaves:** The partner (property owner/manager) needs to coordinate with their own staff (housekeeper, property manager, maintenance, front desk) about the upcoming chef event. These staff members do not have ChefFlow accounts and communicate via internal channels (Slack, property management apps, WhatsApp groups, radio). The partner is translating ChefFlow event info into their internal operational language.

**Context ChefFlow has:**

- Event date, time, guest count, occasion
- Location access notes, parking, loading instructions
- Service format (plated, buffet, family-style)
- Chef arrival window (if set)
- Any special setup requirements from the event record

**Data source?** No. Internal venue staff communication channels are proprietary to the partner's organization.

**Client-collaborative angle:** None directly. This is partner-internal coordination. However, if ChefFlow provided a printable/shareable "event brief for venue staff," the partner would not need to manually rewrite event details for their team.

**Physical reality:** The partner often needs to forward a concise summary to staff who will never log into ChefFlow. A printable one-pager or shareable link (no auth required) with event logistics is the natural solution. Staff may reference it on a clipboard, phone screenshot, or posted printout.

**Compounding:** Medium. The event brief template compounds because each event at the same venue follows a similar pattern. Location-specific checklists (where to put trash, which circuit handles the kitchen outlets, parking for the chef's vehicle) build over time.

**Solution design:**

- Generate a "Venue Staff Brief" PDF/printable from partner location + event details
- Include: event date/time, guest count, chef name, arrival window, setup requirements, access notes
- Add shareable read-only link (tokenized, no auth) for staff who need event details
- Store recurring venue prep checklists that auto-populate for each new event
- Allow partner to add staff contact names (not full accounts) for coordination reference

**Where it appears:**

- `/partner/locations/[id]` ("Generate staff brief" for upcoming event)
- `/partner/dashboard` (upcoming event card: "Share with staff" action)
- Tokenized public brief page (like partner-report pattern)

**What remains as permanent exit:**
The actual communication with staff (Slack message, radio call, text, in-person briefing) stays external. ChefFlow provides the content; the partner delivers it through their own channels.

**Priority:** Medium frequency (every event requires some staff coordination) x Medium effort (PDF generation + tokenized link) = P2
**Spec needed?** No (extends existing tokenized report pattern from `lib/partners/report.ts`)

---

## Scenario #40: Forward client/guest context

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** A potential client contacts the partner first (via Airbnb message, email to property, phone call, in-person at venue). The partner needs to forward this lead context to the chef. Today this happens via text/email/WhatsApp because the partner portal has no way to pass along guest information. The partner is acting as a warm introduction broker.

**Context ChefFlow has:**

- Partner identity and relationship to chef
- Location details (if the referral is venue-specific)
- Chef's inquiry intake form URL and structure
- Existing referral tracking (`referral_records`, `referral_partner_id` on inquiries)
- Public inquiry form at `/chef/[slug]/inquire`

**Data source?** No. The guest context (name, what they want, when, how many guests) originates from a conversation the partner had externally.

**Client-collaborative angle:** High. The ideal flow: partner submits a referral note with guest name/contact, ChefFlow generates a personalized inquiry link, partner shares it with the guest, guest fills in their own details (date, preferences, dietary needs, guest count). The Dinner Circle captures guest-authored context directly. Partner's role becomes "warm intro + trackable link" rather than "manual context forwarding."

**Physical reality:** Screen-based. Partner is typically responding to a guest message (Airbnb app, email) and wants to quickly pass context to the chef. Copy-paste of a referral link with pre-filled partner attribution is the smoothest path.

**Compounding:** High. Each forwarded context builds the referral funnel. Attribution becomes automatic. The chef sees which partners generate the highest-quality leads (leads that convert to bookings). Partner gets credit without manual follow-up.

**Solution design:**

- Extend "Submit a Referral" (scenario #37) with richer guest context fields
- Generate a partner-attributed inquiry link: `/chef/[slug]/inquire?ref=[partnerId]&loc=[locationId]`
- When guest uses that link, inquiry auto-attributes to partner
- Partner sees referral status updates: submitted, inquiry received, event booked, completed
- Partner can paste raw guest message text as context (free-form "forwarded message" field)
- Chef sees partner's forwarded context alongside the inquiry when it arrives

**Where it appears:**

- `/partner/dashboard` ("Forward a lead" action)
- Referral submission form (expanded mode with guest details)
- Partner referral history shows status progression

**What remains as permanent exit:**
The initial guest conversation happens in the guest's channel (Airbnb message, email, phone). The partner will always receive that first contact externally. ChefFlow reduces the forwarding friction and captures the outcome, but cannot intercept the initial guest-to-partner communication.

**Priority:** High frequency (core partner value prop) x Medium effort (extends referral submission + attributed links) = P1
**Spec needed?** Yes (part of partner referral submission spec with scenario #37)

---

## Scenario #41: Ask support for account help

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** The partner has a portal issue (cannot log in, page not loading, profile not appearing on public page, confused about a feature, location change request stuck) and does not know whether to contact the chef or ChefFlow support. Today there is no help surface inside the partner portal. The public `/contact` page exists but is not linked from the authenticated partner portal and does not identify the partner's role context.

**Context ChefFlow has:**

- Partner identity, role, and tenant association
- Partner's current portal state (locations, profile completeness, pending requests)
- Chef's contact info (the partner's primary relationship)
- Public contact form at `/contact` with support routing
- `lib/contact/actions.ts` for contact message submission
- Page info registry at `lib/help/page-info-sections/24-partner-portal.ts` (page descriptions exist)

**Data source?** No. Support is human-to-human communication (or could be self-service FAQ).

**Client-collaborative angle:** None. This is partner-to-platform or partner-to-chef support.

**Physical reality:** Screen-based. Partner is at their computer or phone, stuck on something, needs help. In-context help (tooltip, FAQ, or embedded support form) is the natural interface. Should not require navigating away from the portal.

**Compounding:** Medium. Common support questions become FAQ entries. If ChefFlow tracks what partners ask about, it reveals UX gaps to fix. Over time, self-service answers reduce support volume.

**Solution design:**

- Add "Need help?" link in partner portal sidebar/footer
- Route to an in-portal support page with: FAQ section (common partner questions), contact form (pre-filled with partner context: name, email, role, tenant)
- Smart routing: "Is this about your chef relationship?" routes to chef. "Is this a platform issue?" routes to ChefFlow support
- Include contextual help tooltips on partner portal pages (leverage existing `page-info-sections/24-partner-portal.ts` data)
- Show partner's chef name and chef's preferred contact method for relationship questions

**Where it appears:**

- Partner portal sidebar: "Help" nav item
- Partner portal footer: "Need help?" link
- Each partner page: contextual "?" tooltip using page-info registry
- `/partner/help` (new page with FAQ + support form)

**What remains as permanent exit:**
Complex account issues (password reset via email, identity verification) may still require email. But the initial triage and common questions stay in-app.

**Priority:** Medium frequency (partners occasionally get stuck) x Low effort (routing to existing contact form + FAQ content) = P2
**Spec needed?** No (simple in-portal help link + FAQ page, leverages existing contact infrastructure)

---

## Batch Summary

| #   | Title                              | Reclassified To     | Spec Needed? |
| --- | ---------------------------------- | ------------------- | ------------ |
| 37  | Message chef about a new referral  | Reducible           | Yes          |
| 38  | Call chef about urgent venue issue | Permanent           | No           |
| 39  | Coordinate with venue staff        | Bridgeable          | No           |
| 40  | Forward client/guest context       | Partially Reducible | Yes          |
| 41  | Ask support for account help       | Reducible           | No           |

### Key Findings

- **No messaging surface exists in partner portal today.** The rail registry (`partner-rail-registry.ts`) defines `partner.message_from_chef_partner` and references `partner_messages` as a data source, but no `partner_messages` table or UI exists. This is the biggest gap.
- **Referral submission is chef-only.** `referral_records` table and `recordReferral()` action both require `requireChef()`. Partners cannot submit referrals from their portal despite this being their primary value-add.
- **Contact/support infrastructure exists** (`/contact` page, `lib/contact/actions.ts`) but is not linked from the authenticated partner portal.
- **Tokenized report pattern** (`lib/partners/report.ts`, `/partner-report/[token]`) provides a proven model for shareable read-only content (applicable to venue staff briefs in scenario #39).
- **Scenarios #37 and #40 share a spec:** both involve partner-submitted referral context flowing to the chef. A single "Partner Referral Submission" feature covers both.

### Codebase Evidence

| File                                                           | Relevance                                                               |
| -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| `lib/partners/portal-actions.ts`                               | All partner portal server actions; no messaging/referral submission     |
| `lib/partners/actions.ts` (line 1614)                          | `recordReferral()` is chef-only                                         |
| `lib/partners/invite-actions.ts`                               | Partner invite flow (account claiming only)                             |
| `lib/discovery/registries/partner-rail-registry.ts` (line 832) | Rail items reference `partner_messages` data source that does not exist |
| `database/migrations/20260517200073_referral_records.sql`      | Referral records schema (no partner write access)                       |
| `lib/help/page-info-sections/24-partner-portal.ts`             | Page info exists but no help page wired                                 |
| `app/(public)/contact/page.tsx`                                | Public contact form; not linked from partner portal                     |
| `lib/contact/public-support.ts`                                | Support info builder (reusable for partner help page)                   |

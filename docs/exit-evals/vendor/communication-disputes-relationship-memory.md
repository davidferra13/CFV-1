# Vendor / COMMUNICATION, DISPUTES & RELATIONSHIP MEMORY

> Wave 6 | 8 scenarios | Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

## Scenario #42: Message the chef from the portal

**Original classification:** Reducible
**Reclassified to:** Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor needs an order- or account-scoped way to ask the chef a question, confirm a change, or send a lightweight update. Today the vendor portal has no message composer, so the operational action moves to email, phone, or SMS.
**Context ChefFlow has:**

- Vendor identity, active vendor account, tenant/chef relationship, and portal route gating.
- Purchase order IDs, PO numbers, order date, expected delivery date, status, notes, line items, totals, and vendor scoping.
- Chef-side vendor profile data, phone, email, notes, payment terms, minimum order, delivery-day metadata, invoices, catalog rows, and document uploads.
- Event-linked context when a purchase order has an `event_id`.
- Communication infrastructure that can store event-linked manual logs and unified thread data, but no vendor-facing composer.

**Data source?** No. This is a missing collaboration lane, not a reference/API lookup.
**Client-collaborative angle:** Usually none for direct vendor-chef messages, but Dinner Circle or event collaborators can pre-collect venue/access details that would otherwise become vendor messages.
**Physical reality:** Vendor staff may be on a warehouse floor, truck route, or office desktop. Mobile-first quick reply, attach-photo, and one-tap canned statuses matter more than a rich chat UI.
**Compounding:** High. Each order thread becomes relationship memory: who responded, what was clarified, which vendors are reliable, and which questions repeat.

**Solution design:**

- Add an order-scoped vendor message thread on `/vendor/orders/[id]` with chef-visible inbox placement.
- Support short message types: question, update, issue, substitution, ETA, and document/photo attachment.
- Keep messages tenant-scoped and vendor-scoped; do not expose unrelated chef notes or private trust labels.
- Mirror thread summaries into chef vendor profile and event vendor coordination surfaces.
- Add unread/status badges to vendor portal nav and chef communication/vendor-action surfaces.

**Where it appears:**

- `/vendor/orders/[id]`
- Chef communication inbox or `/communication/vendor-actions`
- Vendor detail and event vendor coordination log

**What remains as permanent exit:**
Urgent same-day calls, supplier ERP order systems, and vendor-wide internal messaging tools still remain outside ChefFlow.

**Priority:** High frequency x Medium effort = High
**Spec needed?** yes

## Scenario #43: Respond to AI or chef supplier calls

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor is responding to a live phone call, voicemail, or AI supplier-call workflow. Voice is the channel where the operational answer happens: availability, price, delivery window, substitution, terms, or callback request.
**Context ChefFlow has:**

- Voice Hub / Call Sheet records for `supplier_calls`, `ai_calls`, scheduled vendor calls, transcripts, recordings, call status, result, price quote, quantity available, and delivery signals.
- Vendor call action extraction that turns call evidence into chef review items or tasks.
- Vendor call memory and routing metrics such as answer rate, best call window, response quality, no-answer streaks, and price points.
- Sourcing sessions that call vendors in priority order and record candidate outcomes.
- Vendor portal account identity, but no vendor-visible call history or callback response surface.

**Data source?** No. Twilio/call transcripts are evidence sources after the call, but the external channel is the actual interaction.
**Client-collaborative angle:** Limited. Client/host data can reduce why the chef calls in the first place by supplying timing, access, allergies, and guest-count changes before vendor outreach.
**Physical reality:** Voice is natural for suppliers. The vendor may answer from a loading dock or truck; asynchronous callback cards and SMS-safe links are better than requiring portal login mid-route.
**Compounding:** High. Call outcomes improve vendor routing, best call windows, price memory, and trust scoring over time.

**Solution design:**

- Add a vendor-safe "recent calls and requested responses" view in the portal for calls tied to that vendor.
- Convert AI call outcomes into safe callback cards: confirm price, confirm availability, propose delivery window, or ask chef to call back.
- Preserve transcript and recording evidence chef-side while showing only vendor-safe excerpts to the vendor.
- Let vendors answer missed-call requests from the portal, and sync the result back to call actions/tasks.

**Where it appears:**

- `/vendor/dashboard`
- `/vendor/orders/[id]` when the call is order/event-linked
- Chef Voice Hub / Call Sheet and `/communication/vendor-actions`

**What remains as permanent exit:**
Live phone calls, voicemail, and vendor internal phone systems remain external. ChefFlow should capture and route the outcome, not replace all voice interaction.

**Priority:** Medium frequency x Medium effort = Medium-high
**Spec needed?** yes

## Scenario #44: Clarify ambiguous PO notes

**Original classification:** Reducible
**Reclassified to:** Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor sees unclear PO notes or line items and needs to ask exactly what the chef means before picking, substituting, or delivering. Today PO notes are displayed read-only with no question/comment lane.
**Context ChefFlow has:**

- Vendor portal PO detail with PO notes, line items, ordered quantity/unit, unit price, totals, expected delivery date, and status actions.
- Purchase order items already support item notes and variance/receiving fields in schema-level evidence.
- Chef-side PO creation and receiving flows, event-linked PO generation, inventory receipt, and price propagation.
- Event and menu context when a PO is tied to an event.
- Chef-side vendor coordination log can manually capture contact notes after an external clarification.

**Data source?** No. The problem is a missing structured clarification workflow.
**Client-collaborative angle:** Sometimes. If ambiguity comes from venue timing, access, guest count, or client preferences, Circle/client intake can collect the answer upstream.
**Physical reality:** Best as a focused "Ask about this PO/line" button with optional photo and suggested replies. Vendors should not need to type a long email on a phone.
**Compounding:** High. Ambiguous-note resolutions become reusable conventions for future POs and vendor instructions.

**Solution design:**

- Add PO-level and line-level question/comment threads visible to both vendor and chef.
- Add structured question categories: quantity, pack size, delivery timing, substitution, product spec, and unclear note.
- Let the chef answer in context and optionally update the PO note or line item.
- Store resolved clarifications as vendor relationship memory and future PO note suggestions.

**Where it appears:**

- `/vendor/orders/[id]`
- Chef PO detail and event procurement surface
- Vendor profile relationship memory

**What remains as permanent exit:**
If the clarification blocks same-day picking or requires a live sales rep, phone may still be fastest. ChefFlow should record the call outcome back onto the PO.

**Priority:** High frequency x Medium effort = High
**Spec needed?** yes

## Scenario #45: Dispute missing/late/quality issue

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor needs to contest or resolve an incident: missing items, late delivery, quality complaint, temperature issue, bad substitution, overcharge, or requested credit. The vendor needs evidence, a safe statement of the issue, and a resolution path.
**Context ChefFlow has:**

- Vendor invoice status can show `disputed`, but the vendor portal only lists invoices and has no dispute detail or response flow.
- Vendor Trust Ledger contract models performance events, severity, state, requested resolution, private notes, source refs, visibility levels, and `vendor_safe_followup` exports.
- Purchase order receiving tracks received quantities and can model shorted/damaged operational states in chef-side inventory actions.
- Vendor coordination logs can record manual issue status for event-linked vendor contact.
- Communication events can store event-linked manual logs and follow-up timers.

**Data source?** No. Evidence may come from photos, PO receiving records, invoices, delivery proof, call transcripts, or chef notes, but the external dispute is an operational negotiation.
**Client-collaborative angle:** Sometimes. Client/venue/guest witnesses may know delivery timing, setup constraints, visible quality failures, or whether a replacement arrived. Circle can collect event-safe evidence without exposing private vendor trust memory.
**Physical reality:** Photo capture, timestamped receiving notes, delivery paperwork, and mobile-friendly vendor response are more important than long-form prose.
**Compounding:** High. Incidents strongly affect future sourcing, trust buckets, blocked vendors, allergy-sensitive sourcing, and price/reliability risk.

**Solution design:**

- Add vendor-safe dispute cases tied to PO, invoice, delivery, event, or trust-ledger event.
- Generate a redacted vendor-safe issue summary from chef-private trust data; never expose private notes or risk labels.
- Let vendors acknowledge, dispute, propose credit/replacement, upload proof, or request a call.
- Close the loop into vendor trust events, invoice status, PO receiving variance, and event vendor coordination history.

**Where it appears:**

- `/vendor/orders/[id]` and `/vendor/invoices`
- Chef vendor detail / trust ledger / event procurement
- Event vendor coordination log and communication follow-up queue

**What remains as permanent exit:**
Formal legal disputes, insurance claims, supplier accounting systems, and relationship-saving meetings may still happen externally.

**Priority:** Medium frequency x High effort = High-risk/high-impact
**Spec needed?** yes

## Scenario #46: Negotiate pricing relationship

**Original classification:** Permanent
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** Pricing negotiation depends on human relationship context: volume commitments, seasonality, payment terms, trust, exceptions, preferred status, and future event pipeline. The actual negotiation may happen by phone, email, or meeting.
**Context ChefFlow has:**

- Vendor profile fields for preferred status, minimum order, reliability score, contact data, notes, and chef-owned relationship data.
- Vendor item prices, price entries, catalog import rows, invoice history, price insights, price alerts, and event procurement comparison.
- Vendor communication preferences with preferred channel, cutoff time, lead time, minimum order, ingredient categories, and notes.
- Vendor call extraction can identify prices, terms, minimum-order issues, and account/payment terms from transcripts.
- Chef-side vendor detail displays payment terms and notes where available.

**Data source?** No. Price history and invoices are internal evidence sources, but negotiation is a relationship action.
**Client-collaborative angle:** Low. Clients indirectly inform volume, event importance, luxury/allergy sensitivity, or budget constraints, but they should not mediate supplier terms.
**Physical reality:** Human conversation remains natural. ChefFlow should provide a pre-call memo, talking points, and post-call capture, not force negotiation into forms.
**Compounding:** High. Agreed terms, seasonal deals, trust, and negotiation outcomes shape every future quote, PO, and sourcing choice.

**Solution design:**

- Add a vendor relationship memo: current spend, price history, reliability, open invoices, recent issues, upcoming event demand, and proposed ask.
- Add a post-negotiation capture form for agreed price, term, effective date, minimums, next follow-up, and evidence source.
- Link negotiated terms into vendor profile, catalog review, price alerts, and PO draft suggestions.
- Use call extraction to suggest updates, but require chef approval before changing pricing or terms.

**Where it appears:**

- Chef vendor detail
- Voice Hub / vendor call action review
- Event procurement and price comparison

**What remains as permanent exit:**
The human negotiation itself, vendor contract systems, and signed supplier agreements remain external unless both sides choose to formalize inside ChefFlow later.

**Priority:** Medium frequency x Medium effort = Medium-high
**Spec needed?** no

## Scenario #47: Send marketing/new product updates

**Original classification:** Permanent
**Reclassified to:** Partially Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor wants to tell the chef about new products, seasonal availability, promotions, market updates, or catalog changes. Broad marketing still belongs to email/newsletter/CRM, but targeted supplier updates for a chef relationship can live in ChefFlow.
**Context ChefFlow has:**

- Vendor portal identity and catalog visibility, but no vendor-side post/update composer.
- Chef-side catalog import/review queues, vendor document intake, price alerts, vendor items, and vendor profile notes.
- Chef-side sourcing and event procurement context that can make product updates relevant to upcoming menus.
- Vendor exit analysis already identifies seasonal availability, substitutions, and catalog docs as structured supplier collaboration gaps.

**Data source?** Partly. Vendor newsletters, PDFs, catalogs, and ERP feeds are data sources if ingested. The outbound marketing campaign itself is not ChefFlow's domain.
**Client-collaborative angle:** Low. Clients may inspire demand for specialty products, but vendor marketing updates are chef-vendor relationship data.
**Physical reality:** This is usually desktop or office work by sales reps. Simple update submission, attachments, product links, and effective dates matter.
**Compounding:** Medium-high. Seasonal/product updates become useful if converted into availability windows, catalog proposals, menu ideas, and future sourcing reminders.

**Solution design:**

- Add a vendor update/proposal lane: new product, seasonal window, promotion, substitution notice, or catalog attachment.
- Route updates to chef review; let the chef pin, dismiss, convert to catalog row, or link to menu/procurement ideas.
- Keep broad newsletters outside ChefFlow, but allow email/PDF ingestion into the same review queue.
- Expire stale promotions and availability windows automatically.

**Where it appears:**

- `/vendor/catalog` or a new vendor updates tab
- Chef vendor detail catalog review queue
- Event procurement suggestions when relevant products match upcoming menus

**What remains as permanent exit:**
Vendor CRM, bulk newsletter systems, social marketing, and broad product promotion remain external.

**Priority:** Medium frequency x Medium effort = Medium
**Spec needed?** yes

## Scenario #48: Coordinate with non-chef event parties

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor needs to coordinate delivery/access/details with a venue manager, planner, house manager, client assistant, loading dock, or other event party who is not the chef.
**Context ChefFlow has:**

- Event details, event date, location, venue details, parking/access instructions, gate code, property rules, kitchen/dining/bar zones, restroom info, rain backup plan, and public venue detail projections.
- Dinner Circle collaborator/access contracts that explicitly include planner/vendor/assistant/house-manager style outside collaborators with expiry, revoke, scopes, and audit.
- Circle access policy supports vendor actor context and linked object visibility gates.
- Event vendor coordination log can record channels, statuses, notes, and follow-up dates for event-linked vendor contact.
- Event readiness assistant reads share settings, collaborator roles, and public share URLs.

**Data source?** No. Contact packets and access notes are context ChefFlow already stores or can collect. External calls/emails may still be the execution channel.
**Client-collaborative angle:** High. The client/host/planner often knows venue contacts, parking, access codes, loading constraints, house rules, and day-of contact hierarchy. Dinner Circle can collect and authorize this before vendor coordination begins.
**Physical reality:** Vendors need a concise event-safe packet on mobile: address, delivery window, contact, access, parking/loading, and what not to disclose. Print/PDF matters for drivers.
**Compounding:** High. Venue and collaborator access knowledge carries forward for repeat venues, clients, planners, and delivery routes.

**Solution design:**

- Add an event-safe vendor contact packet with authorized third-party contacts, access notes, delivery windows, and redactions.
- Let host/client/planner approve or supply missing contact/access details through Dinner Circle.
- Provide vendor-scoped Circle/collaborator access where appropriate, with expiry and audit.
- Capture vendor-party coordination outcomes back to event vendor coordination history.

**Where it appears:**

- `/vendor/orders/[id]` for event-linked orders
- Dinner Circle collaborator/access module
- Chef event detail vendor coordination log

**What remains as permanent exit:**
Actual phone/email coordination with venue/planner/driver systems may remain external, especially for day-of logistics and parties that will not join ChefFlow.

**Priority:** Medium frequency x Medium-high effort = Medium-high
**Spec needed?** yes

## Scenario #49: Ask for technical support

**Original classification:** Reducible
**Reclassified to:** Reducible
**Review status:** NEEDS-DEVELOPER-REVIEW

**Why vendor leaves:** The vendor needs help with account access, portal behavior, order visibility, invoice/catalog questions, support tickets, or product bugs. Current vendor portal navigation has dashboard, orders, invoices, catalog, profile, and sign out, but no help/support center.
**Context ChefFlow has:**

- Vendor identity, email, vendor ID, tenant ID, active role ID, and scoped portal route context.
- Public contact/support form with rate limiting, support email, business-hours status, acknowledgments, and contact submission storage.
- Platform notification and contact submission handling, but not vendor-authenticated support context.
- Existing portal pages that can provide page/path context and recent activity when filing a ticket.

**Data source?** No. Public support docs/contact form can be reused, but this is an authenticated support workflow.
**Client-collaborative angle:** None. This is platform/vendor support, not client event collaboration.
**Physical reality:** Support intake should work on mobile, include screenshots/attachments, and auto-include browser, route, vendor account, and PO/invoice context.
**Compounding:** Medium. Support topics should feed product telemetry, help docs, and vendor portal UX fixes, but each ticket is often one-off.

**Solution design:**

- Add a vendor support/help entry in desktop and mobile vendor navigation.
- Pre-fill support requests with vendor ID, chef relationship, current route, order/invoice/catalog ID, and browser metadata.
- Route authenticated vendor support separately from public marketing/contact submissions.
- Add common self-serve recovery links for invite, login, missing order, invoice status, catalog visibility, and contact chef.

**Where it appears:**

- `/vendor/dashboard` and vendor portal nav
- Contextual help link on `/vendor/orders/[id]`, `/vendor/invoices`, `/vendor/catalog`, and `/vendor/profile`
- Admin/support intake view

**What remains as permanent exit:**
Email support may remain as fallback when login is impossible, and platform incident response tooling stays outside the vendor portal.

**Priority:** Medium frequency x Low-medium effort = Medium
**Spec needed?** no

## Batch Summary

| #   | Title                                  | Reclassified To     | Spec Needed? |
| --- | -------------------------------------- | ------------------- | ------------ |
| 42  | Message the chef from the portal       | Reducible           | yes          |
| 43  | Respond to AI or chef supplier calls   | Bridgeable          | yes          |
| 44  | Clarify ambiguous PO notes             | Reducible           | yes          |
| 45  | Dispute missing/late/quality issue     | Partially Reducible | yes          |
| 46  | Negotiate pricing relationship         | Bridgeable          | no           |
| 47  | Send marketing/new product updates     | Partially Reducible | yes          |
| 48  | Coordinate with non-chef event parties | Bridgeable          | yes          |
| 49  | Ask for technical support              | Reducible           | no           |

_All scenarios marked NEEDS-DEVELOPER-REVIEW (solo mode, no chef/vendor operational input). No roadmap, runner, or standalone spec files were updated per handoff override._

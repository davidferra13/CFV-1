# Exit-Point Closure Index

> **Purpose:** Reconcile the role-specific exit and never-leaves research into one ranked closure map.
> This index separates permanent external boundaries from reducible product gaps and bridgeable handoffs,
> then names the smallest queue-ready build themes that would improve the most roles at once.
>
> **Source docs:**
>
> - `docs/research/chef-exit-points-analysis.md`
> - `docs/research/chef-never-leaves-analysis.md`
> - `docs/research/client-exit-points-analysis.md`
> - `docs/research/client-never-leaves-analysis.md`
> - `docs/research/staff-exit-points-analysis.md`
> - `docs/research/staff-never-leaves-analysis.md`
> - `docs/research/partner-exit-points-analysis.md`
> - `docs/research/partner-never-leaves-analysis.md`
> - `docs/research/vendor-exit-points-analysis.md`
> - `docs/research/vendor-never-leaves-analysis.md`
> - `docs/research/admin-exit-points-analysis.md`
> - `docs/research/admin-never-leaves-analysis.md`
> - `docs/research/guest-exit-points-analysis.md`
> - `docs/research/guest-never-leaves-analysis.md`
>
> **Related chef-first artifacts:**
>
> - `docs/specs/exit-link-registry.md`
> - `docs/specs/exit-scenario-reclassification-sprint.md`
> - `docs/specs/zero-friction-exit-handoffs.md`
>
> **Date:** 2026-05-25

---

## Coverage Snapshot

| Role             | Exit scenarios | In-app workflows | Closure posture                                                                                                                  |
| ---------------- | -------------: | ---------------: | -------------------------------------------------------------------------------------------------------------------------------- |
| Chef             |             95 |              353 | Highest business value; many high-frequency exits already have chef-first specs                                                  |
| Client           |             91 |              240 | High conversion and retention value; exits cluster around trust, communication, guests, payment, and memory                      |
| Staff            |             54 |              115 | Operational safety value; exits cluster around day-of communication, travel, schedule, payroll, and low-signal work              |
| Partner          |             56 |              175 | Growth-channel value; exits cluster around attribution, payout visibility, location/profile content, and reporting               |
| Vendor           |             56 |               60 | Supplier reliability value; exits cluster around catalog data, order changes, delivery proof, invoices, and certificates         |
| Admin            |             72 |              182 | Platform safety value; exits cluster around provider consoles, SQL, infra dashboards, legal, finance, and evidence gathering     |
| Public guest     |             65 |              219 | Funnel and event-quality value; exits cluster around RSVP, maps, calendar, payment, dietary confidence, photos, and social proof |
| **Total mapped** |        **489** |        **1,344** | ChefFlow already owns most structured work; the remaining work is boundary design                                                |

The mapped problem is not "make users never leave." The correct product goal is: users leave only for the external systems that should own that job, and every exit has a prepared handoff, provenance capture, and clean return path.

---

## Duplicate Exit Families

These patterns recur across roles and should be solved once as platform primitives rather than rebuilt per role.

| Exit family                             | Roles affected                                     | Current outside tools                                     | Closure type           | Shared primitive                                                 |
| --------------------------------------- | -------------------------------------------------- | --------------------------------------------------------- | ---------------------- | ---------------------------------------------------------------- |
| Native communication                    | chef, client, staff, partner, vendor, guest, admin | SMS, iMessage, WhatsApp, phone, email, provider consoles  | Permanent + bridgeable | Contextual contact links, summary capture, reply/import trail    |
| Maps, travel, arrival                   | chef, client, staff, partner, guest, vendor        | Google Maps, Apple Maps, Waze, rideshare, venue apps      | Permanent + bridgeable | Event logistics packet, map links, arrival windows, venue notes  |
| Calendar and deadlines                  | chef, client, staff, guest                         | Google Calendar, Apple Calendar, Outlook, phone reminders | Reducible + bridgeable | Role-scoped calendar feed, deadline rail, add-to-calendar        |
| Payments and reconciliation             | chef, client, partner, vendor, admin, guest        | Stripe, banks, Venmo, Zelle, accounting tools             | Permanent + bridgeable | Payment status mirror, offline payment log, export packets       |
| External proof and reputation           | chef, client, guest, partner, admin                | Google Reviews, Yelp, Instagram, TikTok, websites         | Permanent + bridgeable | Public proof cards, review links, source provenance              |
| Vendor and supplier systems             | chef, vendor, admin, partner                       | Vendor portals, catalog PDFs, delivery trackers           | Permanent + bridgeable | Vendor document intake, PO status bridge, delivery proof capture |
| Legal, compliance, and regulated checks | all roles except some guests                       | Government portals, lawyers, medical sources, policy docs | Permanent + bridgeable | Compliance tracker, document vault, source-linked notes          |
| Documents and media                     | client, guest, partner, vendor, chef, admin        | Google Drive, Dropbox, iCloud, email attachments          | Reducible + bridgeable | Role-safe upload, link pinning, approval workflow                |
| Account access and support              | staff, partner, vendor, guest, admin, client       | Email support, password managers, admin consoles          | Reducible              | Self-service recovery, admin-safe diagnostics, invite status     |
| Data freshness and verification         | chef, admin, vendor, partner                       | Store sites, provider dashboards, SQL, spreadsheets       | Reducible + bridgeable | Freshness badges, evidence links, manual override audit          |

---

## Permanent Boundaries

These exits should not become product-replacement projects. ChefFlow should make them deliberate, contextual, and recoverable.

| Boundary                                            | Why permanent                                             | Product duty                                                                |
| --------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------------------------------- |
| Banks, card apps, chargebacks, and payment networks | Financial rails own sensitive money movement and disputes | Mirror status, export receipts, capture offline payment evidence            |
| Google/Apple/Waze routing                           | Real-time traffic and navigation are map-network products | Pre-fill destination, show venue context, capture arrival/departure windows |
| Social networks and public review sites             | Reputation and audience live outside ChefFlow             | Generate share/review links, store source proof, track outcome              |
| Government, legal, medical, and procurement systems | They own authority, liability, and regulated decisions    | Track deadlines, store documents, link source evidence                      |
| Vendor catalogs and ordering portals                | Suppliers own inventory, prices, and order execution      | Export order packets, receive vendor confirmations, store tracking links    |
| Native phone/SMS/WhatsApp                           | Users choose their communication channel under pressure   | Pre-fill messages, log summaries, reconcile decisions                       |
| Infrastructure/provider consoles                    | Admins need source-of-truth provider controls             | Surface health, link runbooks, preserve incident evidence                   |
| Physical service and cooking tools                  | The kitchen and real-world movement are outside software  | Provide prep, checklist, and recovery context before action                 |

Do not queue replacement work for these. Queue handoff, capture, and proof work.

---

## Reducible Gaps

These are places where users leave because ChefFlow does not yet surface data, structure, or self-service that belongs inside the product.

| Gap                                   | Roles affected                        | Why reducible                                                                             | Evidence direction                                                 |
| ------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Static reference lookups              | chef, staff, client, guest            | Food safety, substitution, allergy reference, and unit conversion can be local or curated | Build/reference existing `lib/reference` and recipe/event surfaces |
| Calendar/deadline visibility          | chef, client, staff, guest            | Dates and deadlines already exist in events and portal state                              | Add feeds, deadline cards, role-specific reminders                 |
| Upload/link pinning                   | client, guest, partner, vendor, chef  | Inspiration, certificates, invoices, photos, and venue docs can be attached to records    | Build role-safe upload and moderation paths                        |
| Status visibility                     | partner, vendor, client, staff, admin | Many exits are "is this received/live/paid/assigned?" checks                              | Add status panels and audit trails                                 |
| Self-service account recovery         | staff, partner, vendor, guest, client | Access problems should not require ad hoc email support                                   | Add invite status, resend, recovery, and portal-specific help      |
| Read-only admin diagnostics           | admin                                 | Repeated SQL trips often answer known support questions                                   | Add audited read-only drilldowns instead of write surfaces         |
| Payment and payout explanations       | client, partner, vendor, admin        | Amount, due date, status, and export data are ChefFlow-owned                              | Add ledgers, export packs, variance notes                          |
| Public proof and profile completeness | client, guest, partner                | Trust exits drop when proof is visible and sourced                                        | Strengthen public profile, review, media, and profile state        |

These should become build queue candidates after dedupe against current specs.

---

## Bridgeable Handoffs

Bridgeable exits should preserve context before the user leaves and collect outcome after they return.

| Bridge pattern           | Applies to                                                                          | Minimum product behavior                                                                 |
| ------------------------ | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Contextual external link | maps, vendor portals, banks, social, reviews, government pages                      | Link has the destination, entity, date, address, amount, or query pre-filled             |
| Copyable packet          | vendor orders, planner briefs, reimbursement, legal/procurement, guest instructions | ChefFlow assembles the data block and records when it was copied/exported                |
| Return capture           | client research, vendor calls, review posting, payment confirmation, admin evidence | User returns to a non-modal capture prompt tied to the entity they left from             |
| Source provenance        | admin, pricing, public proof, partner reports                                       | Store source URL, actor, timestamp, confidence, and whether fact is verified or inferred |
| Outcome reconciliation   | payments, referrals, RSVPs, vendor orders, reviews                                  | Track expected result and give a place to mark received/failed/needs follow-up           |
| Role-safe projection     | staff, vendor, partner, guest                                                       | Show only the slice needed for action, never the full chef/client private context        |

---

## Queue-Ready Top 10

These are ranked by cross-role impact, reuse potential, and how directly they close repeated exits. This is not a queue insertion; it is the recommended queue-spec order.

| Rank | Workstream                                 | Roles helped                                 | Build shape                                                                               | Why first                                                                                  |
| ---: | ------------------------------------------ | -------------------------------------------- | ----------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
|    1 | Universal exit-link registry expansion     | all roles                                    | Extend chef-first exit link registry into role-aware outbound-link primitives             | One shared architecture can cover maps, contact, review, vendor, provider, and legal links |
|    2 | Return capture and provenance prompts      | all roles                                    | Non-modal return prompt with entity context, source URL, learned fact, and confidence     | Turns permanent exits into durable ChefFlow memory                                         |
|    3 | Cross-role communication capture loop      | chef, client, staff, partner, vendor, admin  | Pre-filled SMS/WhatsApp/tel/mailto, call-note capture, decision extraction                | Communication is the highest-frequency repeated exit family                                |
|    4 | Event logistics packet                     | chef, client, guest, staff, partner          | Role-specific packet with maps, parking, arrival, weather, access, schedule, and contacts | Solves day-of confusion without replacing maps or venue systems                            |
|    5 | Role-safe document and media intake        | client, guest, partner, vendor, chef, admin  | Upload/link intake with ownership, approval, and visibility rules                         | Reduces Google Drive/iCloud/email attachment leakage                                       |
|    6 | Payment, payout, and reconciliation bridge | chef, client, partner, vendor, admin, guest  | Status cards, export packs, offline payment logging, payout/commission ledger             | Money exits are high-trust and high-support-cost                                           |
|    7 | Access and invite diagnostics              | staff, partner, vendor, client, guest, admin | Portal-specific invite status, resend, recovery, and admin-safe diagnostics               | Reduces support churn without creating privilege escalation paths                          |
|    8 | Public proof and review handoff kit        | chef, client, guest, partner, admin          | Review links, social-ready recap, public proof cards, source provenance                   | Converts unavoidable reputation exits into growth loops                                    |
|    9 | Vendor and partner status loops            | chef, partner, vendor, admin                 | Referral/order status, accept-with-changes, ETA/proof, missing-event/referral claim       | Closes B2B trust loops where current portals are read-mostly                               |
|   10 | Never-leaves verification matrix           | all roles                                    | Evidence checklist per claimed in-app workflow with route, auth mode, and proof state     | Prevents the research packet from overstating shipped product capability                   |

---

## Existing-Spec Reuse

| Existing artifact                                                  | Keep                                                                                                           | Change needed                                                                                            |
| ------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| `docs/specs/exit-link-registry.md`                                 | Contextual link registry idea is right                                                                         | Expand from chef-first 91 links to role-aware registry keyed by role, entity, auth mode, and sensitivity |
| `docs/specs/zero-friction-exit-handoffs.md`                        | Handoff levels `LINK`, `BRIDGE`, `AUTOMATE`, `EMBED` are useful                                                | Reconcile against 95 chef exits and the six non-chef role docs                                           |
| `docs/specs/exit-scenario-reclassification-sprint.md`              | Reclassification principle is correct: free/static/context-known data should move from bridgeable to reducible | Repeat the reclassification pass for client, staff, partner, vendor, admin, and guest                    |
| `components/exit-links/`, `lib/exit-links/`, `types/exit-links.ts` | Existing untracked work appears aligned with the registry concept                                              | Needs code review before any queue item assumes it is complete                                           |

---

## Role-Specific Notes

### Chef

Chef has the deepest existing analysis and the most existing specs. The next chef-specific value is not another list; it is dedupe and fire-readiness against current exit-link, handoff, and reclassification specs.

### Client

Client exits are strongest around trust, shared decision-making, guest coordination, calendar/payment deadlines, and post-event memory. The highest reuse with guest is event logistics, recap/share kit, and dietary/RSVP flow.

### Staff

Staff exits are safety and service reliability problems more than growth problems. Keep staff solutions narrow: station tasks, schedule, time, event packet, escalation, and offline/low-signal recovery. Do not expose client-private data just to reduce context switching.

### Partner

Partner exits are mostly trust, attribution, and reporting. The strongest product work is visible referral/event attribution, payout status, content upload, location profile confidence, and shareable report export.

### Vendor

Vendor exits expose a read-mostly portal. The strongest product work is document intake, order questions, accept-with-changes, line-level fulfillment, ETA/proof, and export packs. Do not try to replace vendor ERP or delivery dispatch.

### Admin

Admin exits must be handled with safety first. Prefer audited read-only diagnostics, runbook/provider links, evidence capture, and owner-gated access management. Avoid building broad admin write surfaces without explicit auth and audit design.

### Public Guest

Guest exits are funnel-sensitive. The strongest product work is no-login RSVP/dietary confidence, calendar/map handoffs, split/tip clarity, event recap/share kit, and low-friction help/privacy recovery.

---

## Verification Questions Before Queueing

1. Which claims in each `never-leaves` doc are already proven by route coverage or browser checks?
2. Which role docs include workflows that are planned/speculative rather than currently shipped?
3. Which exit-link primitives already exist in untracked `components/exit-links/` and `lib/exit-links/`?
4. Which permanent exits involve sensitive data capture after return: health, legal, payment, client social, guest identity, or vendor pricing?
5. Which queue items already cover top-10 workstreams, and which would create duplicates?
6. Which handoffs need auth-aware visibility rules because the same event appears to chef, client, staff, guest, vendor, partner, and admin?

---

## Recommended Next Move

Create a queue-spec package for **Universal Exit Boundary System Phase 1** with only three deliverables:

1. Role-aware external link registry with sensitivity labels.
2. Non-modal return capture prompt tied to entity context.
3. Source provenance model for external facts.

That first phase should explicitly exclude replacing external systems, payments, maps routing, social posting, vendor ordering, government filing, legal review, and medical advice.

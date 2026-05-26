# Exit System Roadmap

> **Purpose:** Master status tracker and synthesis for ChefFlow role exit-point research, never-leaves analysis, and exit-eval reclassification.
> **Last updated:** 2026-05-26
> **Status:** COMPLETE - 76 prompt batches, 489 exit scenarios evaluated in solo mode.

All evaluations are evidence-backed against the role research docs, companion never-leaves docs, and relevant code paths. Because the final pass was solo, every scenario remains marked `NEEDS-DEVELOPER-REVIEW` before it becomes build scope.

---

## Executive Read

ChefFlow can eliminate or materially shrink most exits.

| Treatment                        |   Count |    Share | Product Meaning                                                                                |
| -------------------------------- | ------: | -------: | ---------------------------------------------------------------------------------------------- |
| Reducible                        |     132 |      27% | ChefFlow should handle the workflow in-app.                                                    |
| Reducible + Client-Collaborative |      28 |       6% | Dinner Circle, guest, client, partner, or staff inputs can remove the exit before it happens.  |
| Partially Reducible              |     127 |      26% | ChefFlow can handle the common slice and bridge the remaining external action.                 |
| Bridgeable                       |     115 |      24% | The outside tool remains, but ChefFlow should preload context and capture the return.          |
| Permanent                        |      87 |      18% | The outside ecosystem is the destination; ChefFlow needs a clean handoff and optional receipt. |
| **Total**                        | **489** | **100%** |                                                                                                |

The main gap is not missing architecture. Across the corpus, the recurring pattern is that ChefFlow already has a surprising amount of the needed data or primitives, but the correct role-facing surface, return capture, recovery path, or trust proof is missing or hidden.

---

## Evaluation Completion

| Role      | Prompt Batches | Scenarios | Reducible | Client-Collab | Partial | Bridgeable | Permanent | Status       |
| --------- | -------------: | --------: | --------: | ------------: | ------: | ---------: | --------: | ------------ |
| Chef      |             18 |        95 |        25 |             4 |      34 |         26 |         6 | DONE         |
| Client    |             13 |        91 |        27 |            15 |      19 |         13 |        17 | DONE         |
| Admin     |              9 |        72 |         9 |             1 |      22 |         21 |        19 | DONE         |
| Guest     |             10 |        65 |        17 |             3 |      13 |         16 |        16 | DONE         |
| Partner   |             10 |        56 |        16 |             3 |      12 |         13 |        12 | DONE         |
| Vendor    |              7 |        56 |        20 |             0 |       8 |         12 |        16 | DONE         |
| Staff     |              9 |        54 |        18 |             2 |      19 |         14 |         1 | DONE         |
| **Total** |         **76** |   **489** |   **132** |        **28** | **127** |    **115** |    **87** | **COMPLETE** |

---

## Role Synthesis

| Role    | Roadmap Implication                                                                                                                                                                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Chef    | Highest opportunity is still daily operating leverage: pricing, vendor interaction, client intelligence, route planning, recipe reference, labels, day-of timers, and kitchen-mode recovery. Many gaps are "surface existing intelligence" rather than new core systems.                      |
| Client  | Client exits cluster around trust, budget clarity, guest coordination, menu/dietary questions, venue logistics, and post-event memory. Client-collaborative flows are unusually high-value because they answer questions before the chef gets a text.                                         |
| Admin   | Admin exits are more often partially reducible, bridgeable, or permanent because Stripe, deployment, database repair, privacy, QA, and external account systems stay external. Roadmap focus is runbooks, audit logs, repair packets, support/legal response drafts, and safe return capture. |
| Guest   | Guest exits are concentrated in public trust, invite/RSVP recovery, arrival logistics, allergy confidence, menu curiosity, photos, and future booking handoffs. The product gap is mostly calm no-login surfaces and token recovery.                                                          |
| Partner | Partner exits point to account claiming, profile/location data, referral visibility, commission status, relationship messaging, legal proofs, and day-of venue operations. Partners need a lightweight portal that remembers what they told the chef.                                         |
| Vendor  | Vendor exits are most reducible around catalog data, price sheets, purchase-order responses, substitutions, invoices, and delivery proof. Permanent exits remain for supplier ERP, bank/tax, insurance, and regulated business systems.                                                       |
| Staff   | Staff is the clearest day-of opportunity: 53 of 54 scenarios are reducible, partially reducible, or bridgeable. The roadmap should treat staff as an offline-capable event execution surface, not a thin schedule viewer.                                                                     |

---

## Roadmap Sequence

### Phase 1 - Surface Existing Facts

Goal: remove the exits that happen because users cannot see data ChefFlow already has.

- Event, venue, parking, loading, access, weather, timing, and route glances across chef, client, guest, staff, partner, and vendor surfaces.
- Account claim, invite recovery, expired-token recovery, role switching, and support entry points for guest, staff, partner, and vendor roles.
- Payment, invoice, payout, deposit, reimbursement, tip, receipt, and commission read views.
- Trust proofs: chef identity, insurance/licensing, reviews, portfolio, service area, proposal status, and partner/vendor credibility.
- Clear acceptance proof: role-protected route, tenant-scoped data, visible field, recovery path, and event timeline or ledger capture where relevant.

### Phase 2 - Build The Shared Communication Ledger

Goal: make native communication a round trip instead of a context leak.

- One event-aware thread model for SMS, email, phone-call notes, staff escalations, vendor disputes, partner referrals, support, and legal/privacy responses.
- Photo, document, voice, and call-summary capture with routing to event timeline, vendor memory, client intelligence, staff task, or admin queue.
- Outbound handoffs that preload context: mailto, SMS, phone, WhatsApp, vendor portal links, support packets, and legal response drafts.
- Return capture as a first-class product object: note, status, attachment, decision, proof, correction, or follow-up.

### Phase 3 - Staff Day-Of Operating System

Goal: turn staff from an external coordination risk into an in-app execution layer.

- Offline-capable staff briefing with event facts, schedule, address, access, contacts, tasks, station notes, allergens, and emergency procedures.
- Escalation cockpit for blocked tasks, station photos, safety incidents, access issues, chef-note clarifications, lateness, and staff-to-staff help.
- Kitchen execution primitives: timers, thermometer/probe capture, weight/scale reference, labels, equipment instructions, recipe/SOP reference, translation, and substitutions.
- Staff money and paperwork: time disputes, reimbursements, tips, mileage, pay stubs, tax docs, contractor paperwork, and role/account support.
- Device reality: kiosk mode, dirty-hands input, print/copy packets, low-signal cache, and app-error recovery.

### Phase 4 - Commerce, Pricing, And Supply Chain

Goal: make price, product, order, invoice, and payment state trustworthy inside ChefFlow.

- Vendor catalog and price-sheet ingestion, product availability, substitutions, pack sizes, lead times, and seasonal notes.
- Purchase-order acknowledgement, rejection, partial fulfillment, delivery ETA, proof photo, temperature chain, and issue dispute memory.
- Chef pricing intelligence across store comparison, receipt/OCR, market data, supplier calls, product relevance, and quote/margin workflows.
- Partner commissions and vendor invoices with clear status, proof, export, dispute, and accounting handoff.
- Staff reimbursements, tips, mileage, and minimum-wage/overtime checks as tracked operational facts, not scattered texts.

### Phase 5 - Dinner Circle And Portal Intelligence

Goal: collect what clients, guests, partners, vendors, and staff know before the chef has to hunt.

- Household preferences, dietary constraints, allergy ambiguity, plus-one permissions, guest payment sharing, and event timing changes.
- Venue and home details: access codes, parking, kitchen layout, service constraints, house rules, cleanup rules, photos, and loading notes.
- Partner location/profile facts and vendor delivery/contact constraints as reusable memory.
- Client-facing calm versions of operational intelligence: weather, arrival, menu, dietary, payment, recap, and review prompts.

### Phase 6 - Durable External Bridges

Goal: respect permanent ecosystems while eliminating context loss.

- Maps, traffic, rideshare, parking, and route handoffs with address, timing, access notes, return check-in, and lateness recovery.
- Payment rails, banks, tax systems, accounting tools, vendor ERPs, legal portals, insurance systems, government sites, social platforms, and review sites remain external.
- ChefFlow should provide the packet out and the slot back: prefilled link, copy payload, export, PDF, QR/share card, receipt upload, and structured return note.

### Phase 7 - Admin Data Trust And Runtime Proof

Goal: make admin exits safe, observable, and repeatable.

- Cross-tenant data repair, malformed record inspection, migration runbooks, one-off legal/support exports, and audit trails.
- Deployment, local service, QA, JavaScript error, security, route, and auth investigation packets.
- Support and legal/privacy workflows with response drafts, evidence bundles, policy source links, and user-facing status.
- Market/pricing data freshness, OpenClaw/vendor research, outreach tracking, and source credibility scoring.

---

## Shared Primitives To Build Once

| Primitive                              | Covers                                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Exit link registry with return capture | Maps, payments, vendor portals, social, legal, banks, support, account systems                     |
| Event timeline and intelligence ledger | Calls, texts, photos, disputes, notes, payment proofs, weather, access, arrivals                   |
| Role-scoped communication thread       | Chef, client, guest, staff, partner, vendor, admin support                                         |
| Attachment/document packet             | COIs, invoices, receipts, tax docs, vendor docs, legal exports, event packets                      |
| Print/offline packet                   | Chef kitchen mode, staff briefing, vendor pick list, event run-of-show, low-signal recovery        |
| Invite/token recovery engine           | Guest, staff, partner, vendor, client no-login and account-claim flows                             |
| Venue/access profile                   | Parking, loading, codes, house rules, kitchen constraints, partner locations, staff/vendor arrival |
| Payment/proof ledger                   | Client payments, vendor invoices, partner commissions, staff pay, reimbursements, deposits         |
| Source ingestors                       | Weather, maps, pricing, nutrition, food safety, unit conversion, product data, reviews             |
| Proof pack generator                   | Build queue closeout, admin handoffs, support evidence, legal/privacy exports                      |

---

## Candidate Build Queue Seeds

These are synthesis outputs, not queued implementation items. Each needs normal Build Queue First shaping before code work.

| Seed                                  | Why It Matters                                                                                          | Main Roles                            |
| ------------------------------------- | ------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Staff Day-Of Command Surface          | Staff has 53 non-permanent exits and many are high-frequency operational failures.                      | Staff, Chef                           |
| Role Invite And Recovery System       | Repeated account/token failures across guest, staff, partner, vendor, and client no-login flows.        | Guest, Staff, Partner, Vendor, Client |
| Venue And Access Intelligence         | Repeats across chef, client, guest, staff, partner, and vendor logistics.                               | All operational roles                 |
| Unified Communication Ledger          | Native SMS/email/phone will stay permanent, but context loss is fixable.                                | All roles                             |
| Vendor PO And Catalog Closure         | High vendor reducibility around catalog, price, substitution, fulfillment, invoice, and delivery proof. | Vendor, Chef, Admin                   |
| Payment And Proof Ledgers             | Money exits recur for client, chef, staff, partner, vendor, guest, and admin.                           | All roles                             |
| Dietary And Household Preference Loop | Client/guest knowledge can prevent chef exits and reduce risk.                                          | Client, Guest, Chef                   |
| Offline And Print Execution Packets   | Kitchen and event realities require print, cache, kiosk, and recovery behavior.                         | Chef, Staff, Vendor                   |
| Public Trust And Profile Proof        | Client and guest discovery exits are solved by credible, inspectable in-app proof.                      | Client, Guest, Chef, Partner          |
| Admin Repair And Evidence Packets     | Admin exits need safe repeatability, auditability, and tenant-scoped proof.                             | Admin                                 |

---

## Source Files

### Exit-Point Analyses

| Role    | File                                            | Scenarios |
| ------- | ----------------------------------------------- | --------: |
| Chef    | `docs/research/chef-exit-points-analysis.md`    |        95 |
| Client  | `docs/research/client-exit-points-analysis.md`  |        91 |
| Admin   | `docs/research/admin-exit-points-analysis.md`   |        72 |
| Guest   | `docs/research/guest-exit-points-analysis.md`   |        65 |
| Partner | `docs/research/partner-exit-points-analysis.md` |        56 |
| Vendor  | `docs/research/vendor-exit-points-analysis.md`  |        56 |
| Staff   | `docs/research/staff-exit-points-analysis.md`   |        54 |

### Never-Leaves Analyses

| Role    | File                                             | Scenarios |
| ------- | ------------------------------------------------ | --------: |
| Chef    | `docs/research/chef-never-leaves-analysis.md`    |       353 |
| Client  | `docs/research/client-never-leaves-analysis.md`  |       240 |
| Guest   | `docs/research/guest-never-leaves-analysis.md`   |       219 |
| Admin   | `docs/research/admin-never-leaves-analysis.md`   |       182 |
| Partner | `docs/research/partner-never-leaves-analysis.md` |       175 |
| Staff   | `docs/research/staff-never-leaves-analysis.md`   |       125 |
| Vendor  | `docs/research/vendor-never-leaves-analysis.md`  |        60 |

### Evaluation Outputs

| Role    | Directory                  | Prompt Batches |
| ------- | -------------------------- | -------------: |
| Chef    | `docs/exit-evals/chef/`    |             18 |
| Client  | `docs/exit-evals/client/`  |             13 |
| Admin   | `docs/exit-evals/admin/`   |              9 |
| Guest   | `docs/exit-evals/guest/`   |             10 |
| Partner | `docs/exit-evals/partner/` |             10 |
| Vendor  | `docs/exit-evals/vendor/`  |              7 |
| Staff   | `docs/exit-evals/staff/`   |              9 |

---

## Completion Notes

- `docs/exit-evals/RUNNER.md` is now the prompt index for the completed 76-batch corpus.
- All final eval files are solo-mode research artifacts and should remain `NEEDS-DEVELOPER-REVIEW` until the developer confirms operational assumptions.
- No application implementation is authorized by this synthesis. Use normal Build Queue First intake before turning any seed into code work.
- For any later fired queue item, apply the repo finish gate: regression firewall, wiring audit, route/runtime proof, and proof-pack closeout.

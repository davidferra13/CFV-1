# Exit Eval: Chef / LEGAL & COMPLIANCE

> **Batch:** Wave 1 | **Role:** Chef | **Category:** Legal & Compliance
> **Scenarios:** #48, #49, #50, #51, #52
> **Evaluator:** Claude (Solo mode)
> **Date:** 2026-05-25
> **Status:** NEEDS-DEVELOPER-REVIEW (all scenarios)

---

## Scenario #48: Renew food handler's license

**Original classification:** Could track expiration + remind
**Reclassified to:** Partially Reducible

**Why chef leaves:** The chef must interact with their state or county health department portal to complete a renewal application, pay a fee, and sometimes retake an exam. The operational reason is maintaining legal authority to prepare and serve food commercially. Without a current license, the chef cannot legally accept events. The decision layer is "when do I need to renew, what does my state require, and am I at risk of lapsing?"

**Context ChefFlow has:**

- Chef's region/state (account-anchored location, `location_state` on events)
- Existing certification records in `chef_certifications` table (cert_type `food_handler`, `servsafe`, `servsafe_manager`)
- Expiry dates, issuer, cert number, document URL
- Status computation (active/expiring_soon/expired) via `computeStatus()` in `lib/compliance/certification-actions.ts`
- `getExpiringCertifications()` already queries certs expiring within N days
- Compliance Concierge (`lib/compliance/compliance-concierge.ts`) checks `food_safety` proof at event level
- Required cert type enforcement: `food_handler` is in `REQUIRED_CERT_TYPES` array
- `getCertificationSummary()` reports `missingRequired` count on dashboard
- Regulatory requirements reference in `compliance-types.ts` includes `food_handler_cert` with note "Required in most US states. Frequency varies by state (2-5 years)."

**Data source?** Partially. State health department renewal portals are the authoritative source. There is no universal API for food handler license renewal. However, renewal frequency data (2 years in MA, 5 years in CA, etc.) is static reference data that could be maintained as a lookup table. The actual renewal transaction (payment, exam) must happen on the government portal.

**Client-collaborative angle:** None. This is purely a chef credential. Clients never participate in license renewal. However, the Compliance Concierge already surfaces `food_safety` proof status on event compliance packets, which creates indirect client visibility ("your chef's credentials are current").

**Physical reality:** This is a desk/computer task. The chef sits down, goes to a government portal, fills out forms, pays online. No kitchen, no messy hands, no voice advantage. A clear reminder with a direct link to the correct portal is the highest-value intervention.

**Compounding:** High. Renewal cadence is fixed per state. Once ChefFlow knows the chef's state and cert type, it can predict every future renewal window indefinitely. The issuer, cert number, and document URL persist across renewals. The chef's renewal history builds a compliance timeline that matters for insurance, venue requirements, and client trust.

**Solution design:**

- Add `renewal_frequency_months` field to `chef_certifications` (or derive from a state lookup table). Pre-populate from `CHEF_REGULATORY_REQUIREMENTS` reference data.
- Build a renewal reminder pipeline: 90-day, 60-day, 30-day, 7-day notifications (email + in-app). Already partially built via `getExpiringCertifications(daysAhead)` but no notification dispatch exists.
- Store the renewal portal URL per certification type per state (static reference table). Surface as "Renew Now" link on the expiring cert card.
- Add renewal history tracking: when chef updates `expires_at` after renewal, log the old/new dates as a renewal event.
- Surface renewal urgency on dashboard compliance widget and in Compliance Concierge event packets.

**Where it appears:**

- `/settings/compliance` (certifications list, expiry badges)
- `/settings/protection/certifications` (dedicated cert management page)
- Dashboard compliance summary widget (`getCertificationSummary()`)
- Event compliance packet (Compliance Concierge `food_safety` proof factor)
- Notification center (renewal reminders, not yet wired)

**What remains as permanent exit:**
The actual renewal transaction: visiting the government portal, paying the fee, retaking any required exam. ChefFlow can never replace the government's renewal process. The chef will always leave to complete the renewal itself.

**Priority:** High frequency (every chef, every 2-5 years, but the reminder/tracking is daily operational value) x Low effort (reminder pipeline + portal link reference table) = **High priority, low effort**
**Spec needed?** No. The infrastructure is 80% built. Remaining work is notification dispatch wiring and a state-specific renewal URL reference table. Add to reclassification sprint doc.

---

## Scenario #49: Check local cottage food / home kitchen laws

**Original classification:** Could maintain a regulation reference (but laws change)
**Reclassified to:** Bridgeable

**Why chef leaves:** The chef needs to determine whether a specific event or business model falls under their state's cottage food or home kitchen exemption. The operational reason is risk assessment: "Can I legally cook from my home kitchen for this client, or do I need a commercial kitchen?" This decision affects cost structure (commercial kitchen rental), service scope (which foods are allowed), revenue limits (many states cap cottage food annual revenue), and geographic restrictions.

**Context ChefFlow has:**

- Chef's home state/region (account-anchored location)
- Existing `cottage_food` cert type in `CERT_TYPES` array (certification-actions.ts)
- Existing `cottage_food` entry in `CHEF_REGULATORY_REQUIREMENTS` with note "Required if cooking from home kitchen in certain states"
- Compliance Concierge checks venue type (`private_home`, `rented_venue`, `commercial_kitchen`) in event risk assessment
- Event location data (city, state)
- Revenue/financial data across events (could check against state revenue caps)
- Compliance profile with `default_jurisdiction` field

**Data source?** Partially. Cottage food laws are published by state health departments and vary enormously across 50 states. The data is:

- State-by-state: allowed foods, revenue caps, labeling requirements, delivery rules
- Relatively stable (legislation changes every 1-3 years)
- Already aggregated by organizations like the Institute for Justice and Forrager.com
- No free API exists. This would be a manually maintained reference table.

The core data (allowed/not allowed, revenue cap, permit required) is small enough to maintain as a static reference per state.

**Client-collaborative angle:** Minimal. The client might know their local zoning restrictions ("our HOA doesn't allow commercial activity"), but cottage food law compliance is fundamentally the chef's responsibility. Dinner Circle could capture venue-type information that triggers cottage food checks.

**Physical reality:** This is a research/reference task. Screen-based. The chef reads regulations, possibly prints a summary for their records. No kitchen context.

**Compounding:** Medium. Once a chef understands their state's cottage food rules, that knowledge applies to every home-kitchen event in that state. But the chef may operate across state lines, and laws change. The value compounds per state the chef operates in, but needs periodic refresh.

**Solution design:**

- Build a static reference table of cottage food rules by state: allowed (yes/no), revenue cap, allowed food categories, labeling required, permit required, key restrictions, last verified date, source URL.
- Surface as a "Cottage Food Readiness" card on the compliance center, filtered to chef's home state.
- When an event has `venueType === 'private_home'` or the chef has a `cottage_food` cert, show a contextual cottage food checklist on the event compliance packet.
- Include a "Check current law" exit link to the state's official cottage food page (curated URL per state).
- Add a disclaimer: "Laws change. Verify with your state health department before relying on this reference."

**Where it appears:**

- `/settings/compliance` (Cottage Food Readiness card)
- Event compliance packet (when venue is private home)
- Compliance Concierge (contextual cottage food factors)

**What remains as permanent exit:**
Reading the actual legislation for edge cases. Consulting with a lawyer for complex situations (overlaps with Scenario #52). The reference table covers the 80% case but unusual situations (multi-state operations, mixed cottage/commercial, specific food category questions) will always require visiting the source.

**Priority:** Medium frequency (only relevant to chefs using home kitchens, but common for solo operators and meal-prep chefs) x Medium effort (static reference table for 50 states + UI) = **Medium priority, medium effort**
**Spec needed?** No. This is a reference data table plus a compliance card. Add to reclassification sprint doc as a cottage-food-reference-table task.

---

## Scenario #50: Get business license / permits

**Original classification:** Permanent exit. Could track + remind.
**Reclassified to:** Partially Reducible

**Why chef leaves:** The chef must obtain or renew city/county business licenses and event-specific permits (health permits, temporary food service permits, fire permits, parking permits, vendor permits, mobile food unit permits). The operational reason is legal authorization to operate. Without permits, the chef risks fines, shutdown, or liability exposure. The decision layer: "Which permits do I need for this specific event in this specific jurisdiction?"

**Context ChefFlow has:**

- Full permit tracking system: `lib/compliance/permit-actions.ts` with CRUD, expiry queries, status management
- 7 permit types defined: `health`, `business`, `fire`, `parking`, `vendor`, `mobile_food`, `other`
- Permit statuses: `active`, `expired`, `pending_renewal`, `revoked`
- Expiry tracking with `renewal_lead_days` (default 30)
- `getExpiringPermits()` queries permits expiring within N days
- Cost tracking per permit (`cost_cents`)
- Document URL storage per permit
- Compliance Concierge evaluates venue/permit proof at event level
- `CHEF_REGULATORY_REQUIREMENTS` includes `business_license` entry
- `business_license` is in `REQUIRED_CERT_TYPES` (certification system)
- Legal Readiness Center tracks `license_insurance_food_safety` readiness item
- Event location data (city, state) available for jurisdiction inference

**Data source?** No universal API. Business license and permit requirements vary by:

- City/county (not just state)
- Event type (private dinner vs. public event vs. farmers market)
- Venue type (private home vs. commercial venue vs. outdoor)
- Service scope (food only vs. alcohol)
  The actual application must happen on government portals.

**Client-collaborative angle:** The venue owner or client may know what permits are required at their location. Dinner Circle could collect: "Does this venue require a separate vendor permit?" or "Has the venue already pulled a temporary food service permit for this event?" This is a real gap. Venues often handle event permits themselves and the chef just needs proof.

**Physical reality:** Desk/computer task. Government portal interactions. Some permits require in-person visits to city hall. No kitchen context.

**Compounding:** High. Once a chef has their core business license, it renews annually at the same jurisdiction. Permit requirements per venue type become known patterns. A chef doing their 10th farmers market already knows the permit drill. ChefFlow tracking this history eliminates "did I already renew?" anxiety and catches lapses before they cause problems.

**Solution design:**

- Already substantially built. The permit system (`permit-actions.ts`) handles CRUD, expiry tracking, status management, and document storage.
- Missing: notification pipeline for permit expiry (same gap as Scenario #48). Wire `getExpiringPermits()` into notification dispatch.
- Missing: event-level permit checklist. When creating an event at a new venue type or jurisdiction, prompt: "This is a public outdoor event in Boston. You may need: Temporary Food Service Permit, vendor permit, fire permit."
- Missing: venue-permit association. Store which permits are required per venue profile so repeat events at the same venue auto-populate the checklist.
- Add Dinner Circle question for venue-managed permits: "Does the venue handle food service permits for vendors?"

**Where it appears:**

- `/settings/compliance` (permits list with expiry badges)
- Event compliance packet (permit proof factor)
- Event creation/editing (jurisdiction-aware permit checklist prompt)
- Dinner Circle (venue permit question)
- Notification center (expiry reminders)

**What remains as permanent exit:**
The actual permit application: visiting government portals, paying fees, providing documentation. In-person visits to city hall for some permits. ChefFlow tracks what you have and what you need; the chef still does the obtaining.

**Priority:** High frequency (every chef needs a business license; event-specific permits are common) x Low effort (infrastructure exists, needs notification wiring + event-level prompts) = **High priority, low effort**
**Spec needed?** No. Infrastructure is 90% built. Remaining work is notification wiring and event-level permit prompts. Add to reclassification sprint doc.

---

## Scenario #51: Review/sign a venue's liability waiver

**Original classification:** Permanent exit. Could store signed docs.
**Reclassified to:** Bridgeable

**Why chef leaves:** A venue or client requires the chef to review and sign a liability waiver, insurance certificate request, or indemnification agreement before allowing the chef to cook on-site. The operational reason is risk transfer: the venue wants proof that the chef carries insurance and accepts liability for their work. The chef must read the document, possibly have their insurance agent issue a certificate of insurance naming the venue as additional insured, and sign the waiver.

**Context ChefFlow has:**

- Insurance policy tracking: `lib/compliance/insurance-actions.ts` with full CRUD, 8 policy types, coverage amounts, expiry tracking, auto-renew flags, document URLs
- Insurance cert upload per contract: `lib/contracts/insurance-actions.ts` (`uploadInsuranceCert`, `getInsuranceCert`)
- Contract system: `lib/contracts/actions.ts` with templates, merge fields, e-sign workflow
- Compliance Concierge checks insurance proof and venue proof at event level
- Venue-type detection in event risk assessment (`rented_venue` triggers venue proof factor)
- Event contracts table with `insurance_cert_url` and `insurance_expires_at` fields
- Document storage capability (URLs to stored files)
- Compliance proof vault for arbitrary proof documents

**Data source?** No. The venue's waiver is a bespoke legal document specific to that venue. Each venue has different terms. This cannot be automated or API-sourced.

**Client-collaborative angle:** Strong. The client or venue contact often initiates this requirement. Dinner Circle could:

- Collect the waiver document from the venue contact before the chef even asks
- Ask: "Does this venue require a liability waiver or insurance certificate from vendors?"
- Pre-populate the venue profile with known requirements for repeat events

**Physical reality:** Document review task. The chef reads a PDF or email attachment, possibly forwards it to their insurance agent, then signs (wet or digital). Screen-based. Could benefit from document storage so the chef has all venue waivers organized.

**Compounding:** High. Venue waiver requirements are stable. A venue that requires a waiver this year will require one next year. Storing the signed waiver, the venue's requirements, and the insurance certificate template means the second event at the same venue is nearly zero friction. The chef's insurance agent info, certificate of insurance template, and common venue requirements all compound.

**Solution design:**

- Store venue waiver requirements on venue profiles (field: `requires_liability_waiver`, `waiver_template_url`, `additional_insured_required`). This compounds across all events at that venue.
- Add a "Venue Documents" section on event detail: upload/view venue waivers, signed copies, insurance certificates issued for that venue.
- Pre-populate insurance cert details from `insurance_policies` table when generating a certificate of insurance request.
- Add exit link to chef's insurance provider portal on the event compliance card when venue requires additional insured endorsement.
- Surface "Venue requires waiver" alert on event timeline when a venue profile has this flag set.
- Store the chef's insurance agent contact info for quick forwarding of certificate requests.

**Where it appears:**

- Event detail page (Venue Documents section)
- Event compliance packet (venue proof factor, already exists)
- Venue profile (waiver requirements, for repeat events)
- `/settings/protection/insurance` (insurance policies, certificate generation)
- Dinner Circle (venue requirement collection question)

**What remains as permanent exit:**
Reading and signing the actual venue-specific waiver document. Requesting a certificate of insurance from the chef's insurance provider. These are inherently external: the chef must engage with legal documents they didn't author and with their insurance agent. ChefFlow smooths the round-trip by organizing all the pieces and capturing the result.

**Priority:** Medium frequency (common for rented venues and large events, less common for private home dinners) x Medium effort (venue profile fields + document section on events) = **Medium priority, medium effort**
**Spec needed?** No. The building blocks exist (insurance tracking, compliance packets, document storage). This is wiring work: venue profile fields, event document section, Circle question. Add to reclassification sprint doc.

---

## Scenario #52: Consult with a lawyer

**Original classification:** Permanent exit.
**Reclassified to:** Permanent

**Why chef leaves:** The chef needs professional legal advice for contract disputes, liability questions, business structure decisions, intellectual property protection, partnership agreements, or regulatory compliance edge cases. The operational reason is risk mitigation for decisions that exceed the chef's legal knowledge: "Is this contract clause enforceable?" "Am I liable if a guest has an allergic reaction despite disclosure?" "Should I be an LLC or S-corp?"

**Context ChefFlow has:**

- Contract templates and e-sign system (`lib/contracts/actions.ts`)
- Default contract clauses (`lib/contracts/default-clauses.ts`)
- Legal Readiness Center (`lib/legal/readiness.ts`) with professional review tracking
- `requiresProfessionalReview` flag on legal readiness items
- `assertNoUnreviewedApproval()` prevents marking legal items as approved without professional review
- Compliance Concierge with `consult-professional` escalation type
- `COMPLIANCE_NON_LEGAL_ADVICE_DISCLAIMER` displayed on all compliance guidance
- Event compliance packets that flag `consult-professional` for alcohol, cannabis, jurisdiction questions
- Legal readiness items track `lastReviewedAt` for professional review dates
- Insurance, permit, and certification data that a lawyer might reference

**Data source?** No. Legal advice is inherently human, judgment-based, and jurisdiction-specific. No API can replace a lawyer's analysis of a specific situation. ChefFlow correctly never attempts to provide legal advice.

**Client-collaborative angle:** None. Legal consultations are between the chef and their attorney. Clients are often the opposing party in contract disputes.

**Physical reality:** Phone call, video call, email, or in-person meeting. No kitchen context. The chef needs to bring relevant documents (contracts, insurance policies, event details) to the consultation.

**Compounding:** Medium. The chef's relationship with their lawyer compounds (the lawyer learns the chef's business). Specific legal decisions (entity structure, standard contract terms) are one-time or rare. But the ability to quickly export relevant ChefFlow data for a lawyer consultation compounds: the chef doesn't have to manually assemble their contract history, insurance info, and event details each time.

**Solution design:**

- Add a "Prepare for Legal Consultation" export action: generates a PDF or document bundle containing the chef's business entity info, active contracts, insurance policies, certification status, and any flagged compliance items. One click to assemble what the lawyer needs.
- Store lawyer contact info in External Contacts (already being built per `app/(chef)/settings/external-contacts/`)
- When Compliance Concierge escalates with `consult-professional`, surface the chef's lawyer contact and the "Prepare for Legal Consultation" export.
- Log consultation dates and outcomes on legal readiness items (`lastReviewedAt` field already exists).
- Maintain the strong disclaimer posture: ChefFlow never gives legal advice, always defers to professionals.

**Where it appears:**

- Compliance Concierge escalation cards (already shows "Consult professional" escalation)
- `/settings/legal-readiness` (legal readiness center)
- `/settings/external-contacts` (lawyer contact info)
- Export/document generation system

**What remains as permanent exit:**
Everything. The lawyer consultation itself is entirely external. ChefFlow's role is to (1) identify when professional legal advice is needed (Compliance Concierge escalations), (2) make it easy to prepare for the consultation (data export), and (3) record the outcome (review dates, updated readiness items). The chef will always leave for this.

**Priority:** Low frequency (most chefs consult a lawyer 1-3 times per year) x Low effort (export action + contact storage) = **Low priority, low effort**
**Spec needed?** No. The legal readiness infrastructure, compliance concierge escalations, and external contacts system already exist. The only missing piece is a "prepare for consultation" data export. Add to reclassification sprint doc.

---

## Batch Summary

| #   | Title                                        | Reclassified To     | Spec Needed? |
| --- | -------------------------------------------- | ------------------- | ------------ |
| 48  | Renew food handler's license                 | Partially Reducible | No           |
| 49  | Check local cottage food / home kitchen laws | Bridgeable          | No           |
| 50  | Get business license / permits               | Partially Reducible | No           |
| 51  | Review/sign a venue's liability waiver       | Bridgeable          | No           |
| 52  | Consult with a lawyer                        | Permanent           | No           |

### Key Findings

**ChefFlow's legal/compliance infrastructure is remarkably mature.** The codebase already has:

- Full CRUD for certifications, permits, and insurance policies with expiry tracking
- Compliance Concierge that builds event-level risk packets
- Quote compliance gates that block sending quotes when proof is missing
- Compliance proof vault for arbitrary documents
- Legal readiness center with professional review tracking
- Regulatory requirements reference data
- Insurance certificate attachment per contract

**The primary gap across all 5 scenarios is notification dispatch.** The query infrastructure exists (`getExpiringCertifications`, `getExpiringPermits`, `getExpiringPolicies`) but nothing dispatches reminders to the chef. Wiring these into the notification pipeline would immediately improve scenarios #48 and #50.

**Secondary gap: state-specific reference data.** Cottage food rules (#49) and renewal portal URLs (#48) would benefit from a state-level reference table. This is maintainable static data, not a complex integration.

**No scenario in this category is fully Reducible.** Legal and compliance activities inherently involve government portals, legal professionals, and external document signing. ChefFlow's correct posture is: track, remind, prepare, and capture results. Never replace the external authority.

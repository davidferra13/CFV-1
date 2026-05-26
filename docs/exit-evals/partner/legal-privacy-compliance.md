# Exit Eval: Partner / LEGAL, PRIVACY & COMPLIANCE

> Wave 5 | 5 scenarios | Category 9 from `docs/research/partner-exit-points-analysis.md`
> Evaluated: 2026-05-25 | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW

---

## Scenario #47: Review privacy or partner terms outside portal

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner needs to review the legal language of partner terms or privacy policy with legal counsel, in a printable format, or side-by-side with their own business agreements. The operational decision is: "Do I understand and accept what I am agreeing to, and do my obligations here conflict with my existing contracts?"

**Context ChefFlow has:**

- The full privacy policy text (rendered at `/privacy` via `lib/compliance/privacy-policy.ts`)
- The partner terms page exists at `/partner-terms` (currently a placeholder via `LegalPolicyPlaceholder` component)
- Policy versioning system (`legal_policy_versions` table, `lib/legal/readiness.ts` defines `partner_terms` as a policy type)
- Acceptance records with timestamps, IP hash, user agent (`legal_policy_acceptances` table)
- The partner's acceptance history (recorded via `recordPolicyAcceptancesForSubject` in `lib/legal/persistence.ts`)
- Role-based required policies: partners require `privacy_policy` + `partner_terms` (defined in `ROLE_REQUIRED_POLICIES`)

**Data source?** No. The policies are authored content, not an external API. The external exit is to a lawyer or PDF viewer for analysis.

**Client-collaborative angle:** None. This is a partner-to-platform legal relationship. No Dinner Circle involvement.

**Physical reality:** PDF/print is the primary format for legal review with counsel. Partners need to download, email to their attorney, annotate, and compare with their own agreements.

**Compounding:** Medium. Once a partner reviews and accepts terms, they rarely need to re-review unless a material change triggers reacceptance (the `material_change` and `requires_reacceptance` flags exist in the policy version schema). However, storing acceptance history is permanent proof of the relationship.

**Solution design:**

- Complete the partner terms page (currently placeholder at `/partner-terms`) with real legal content
- Add PDF export/download button on both `/privacy` and `/partner-terms` pages
- Add "print-friendly" layout for legal pages (no nav, clean typography)
- Show version history and effective dates on the partner terms page
- Add partner portal section showing "Your accepted policies" with dates and versions
- Add "email this policy" action so partner can forward to counsel directly

**Where it appears:**

- `/partner-terms` (public, pre-signup review)
- `/auth/partner-signup` (acceptance checkbox already exists, links to terms)
- Partner portal settings (future: acceptance history view)

**What remains as permanent exit:**
The partner will always take the document to their lawyer or internal counsel for review. ChefFlow cannot replace legal advice. But providing clean, downloadable, versioned documents eliminates the "where do I find the current terms?" friction.

**Priority:** Low frequency (once per partner, occasionally on updates) x Low effort (mostly content + PDF export) = Low-medium rank
**Spec needed?** No. Completing the placeholder page + adding PDF export is straightforward.

---

## Scenario #48: Request data deletion or profile removal

**Original classification:** Bridgeable
**Reclassified to:** Reducible

**Why partner leaves:** The partner wants to remove their presence from ChefFlow entirely, either because the partnership ended, they changed businesses, or they want their personal data deleted per privacy rights (GDPR/CCPA). The operational decision is: "How do I get my data removed and confirm it happened?"

**Context ChefFlow has:**

- Complete data rights request workflow already built (`/data-request` public page with `DataRequestForm` component)
- Server action `submitPublicDataRightsRequest` in `lib/legal/actions.ts` handles access, export, deletion, correction, and opt_out request types
- `legal_data_rights_cases` table tracks request lifecycle: submitted, verifying, in_progress, fulfilled, denied, cancelled
- Rate limiting on submissions (6 per IP per 10 min, 3 per email per hour)
- Identity verification flag (`requires_identity_verification`)
- Chef-side deactivation already exists (`lib/partners/actions.ts` line 763: deactivate partner)
- RLS policies allow chef to delete partner records (`partner_locations_chef_delete`, `partner_images_chef_delete`, `referral_partners_chef_delete`)
- Admin legal readiness dashboard shows data rights cases

**Data source?** No. This is an internal process workflow.

**Client-collaborative angle:** None. This is partner-to-platform.

**Physical reality:** Screen-based. Email confirmation is important for audit trail.

**Compounding:** Low. One-time action per partner departure. But the workflow itself compounds across all departures (process maturity).

**Solution design:**

- Add "Request profile removal" or "Delete my account" action inside the authenticated partner portal (currently partners must use the public `/data-request` form or email)
- Pre-fill the data request with the partner's known identity (skip identity verification since they are authenticated)
- Show request status within the partner portal ("Your removal request is being processed")
- Add chef notification when a partner requests removal
- Distinguish between "deactivate partnership" (keep data, hide from public) and "delete data" (GDPR-style full removal)

**Where it appears:**

- Partner portal settings/profile page (new "Account & Data" section)
- `/data-request` (existing public fallback for unauthenticated partners)
- Chef dashboard notification when partner requests removal

**What remains as permanent exit:**
Nothing meaningful. Once the self-service removal request is inside the partner portal, the partner never needs to leave ChefFlow to request deletion.

**Priority:** Low frequency (rare event) x Medium effort (new portal section + pre-filled form + status tracking) = Medium rank
**Spec needed?** No. Wire the existing `submitPublicDataRightsRequest` into an authenticated partner portal view with pre-fill.

---

## Scenario #49: Verify insurance/licensing requirements

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** The partner (typically a venue) needs to verify that specific insurance or licensing requirements are met for hosting a private chef event. This could be general liability minimums, food handling permits, alcohol licensing, health department requirements, or fire marshal capacity limits. The operational question is: "Does this chef/event meet my venue's insurance and regulatory requirements?"

**Context ChefFlow has:**

- Chef-side insurance policy management built (`lib/business-ops/insurance-actions.ts`): policy types include general_liability, professional_liability, auto, health, equipment, workers_comp
- Insurance records store: provider, policy number, coverage amount, renewal date, agent contact, portal URL, document path
- Renewal reminders (30d and 7d flags)
- Legal readiness items track `license_insurance_food_safety` per tenant
- Partner location detail shows capacity (maps to fire marshal limits)
- No partner-visible insurance verification surface exists currently

**Data source?** Partially. The chef's insurance data exists in ChefFlow, but the partner's own venue requirements (what minimums they need) live in their venue policy docs, insurer portal, or government sites.

**Client-collaborative angle:** None directly. But the chef could share proof-of-insurance documents through ChefFlow rather than email.

**Physical reality:** Document exchange (certificates of insurance are PDFs). Often required before venue access is granted.

**Compounding:** High. A venue's insurance requirements rarely change. Once captured, they apply to every future event at that location. Similarly, a chef's insurance proof applies across all venues.

**Solution design:**

- Add "insurance requirements" field to partner location records (what the venue requires from visiting chefs)
- Add ability for chef to share insurance certificate with specific partners (document sharing, not full financial access)
- Store venue requirement satisfaction status per location-chef pair
- Rail item when a venue's requirements are unmet for an upcoming event
- Partner portal: show "Chef's insurance status" as verified/unverified (without exposing policy details)

**Where it appears:**

- Partner location detail (requirements field)
- Chef insurance settings (share certificate action)
- Event planning rail (insurance verification status for venue)

**What remains as permanent exit:**
The partner will always need to check their own venue policy documents, their insurer portal, and government licensing sites to know what their requirements ARE. ChefFlow cannot replace the source of truth for venue regulations. ChefFlow can only store the requirements once known and track satisfaction.

**Priority:** Medium frequency (per-venue, per-renewal-cycle) x Medium effort (document sharing + requirements field) = Medium rank
**Spec needed?** Yes, if building the cross-partner insurance verification workflow. For now, storing requirements is a simple field addition.

---

## Scenario #50: Handle incident or liability issue

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why partner leaves:** Something went wrong at the venue during or after a chef event: property damage, food safety incident, guest injury, noise complaint, neighbor issue, or any liability-triggering event. The partner needs their insurance portal, legal counsel, property management system, or phone to handle the situation. The operational decision is: "How do I document this incident, file a claim, and resolve liability?"

**Context ChefFlow has:**

- Event records with date, location, guest count, and status
- Partner location records with address and venue details
- No incident/accident reporting system exists currently
- No liability documentation surface exists in partner portal
- Chef insurance records exist but are chef-side only (`lib/business-ops/insurance-actions.ts`)
- The compliance infrastructure (`lib/compliance/compliance-types.ts`) exists but does not cover incident reporting

**Data source?** No. Incident handling requires human judgment, insurance company portals, legal counsel, and potentially law enforcement or health departments.

**Client-collaborative angle:** The chef may have their own account of events. A shared incident record could capture both perspectives. But sensitive liability matters will always involve lawyers and insurers outside ChefFlow.

**Physical reality:** Phone calls (urgent), then documentation (photos, written accounts, timestamps). Often starts as a phone call and moves to formal documentation.

**Compounding:** Medium. Incident documentation compounds as evidence and precedent. A venue that has had prior incidents can reference them. But incidents are (hopefully) rare.

**Solution design:**

- Add "incident note" attachment capability on event records (partner-accessible)
- Allow partner to flag an event as "incident occurred" with date, type, and description
- Store incident notes tied to location + event for future reference
- Provide structured incident types: property damage, food safety, guest injury, noise/disruption, equipment damage, other
- Chef gets notified when partner logs an incident
- Neither party's insurance details are exposed to the other; just the shared factual record

**Where it appears:**

- Partner event history (incident flag per event)
- Partner location detail (incident history for venue)
- Chef event detail (incident notes visible)

**What remains as permanent exit:**
Everything substantive: filing insurance claims, contacting legal counsel, dealing with property management, communicating with injured parties, regulatory reporting. ChefFlow can only be the shared factual record of what happened and when. The actual liability resolution process is entirely external.

**Priority:** Very low frequency (hopefully rare) x Medium effort (incident note system) = Low rank
**Spec needed?** No. A simple incident-note attachment to events/locations is sufficient. No complex workflow needed.

---

## Scenario #51: Approve public use of venue photos

**Original classification:** Bridgeable
**Reclassified to:** Reducible + Client-Collaborative

**Why partner leaves:** The chef wants to use photos taken at the partner's venue for marketing, portfolio, or social media. The partner needs to approve this usage, potentially with conditions (credit required, specific photos only, seasonal restrictions, no guest faces). Currently this happens via email, rights-release documents, or cloud drive exchanges.

**Context ChefFlow has:**

- Photo consent system already built for guests (`components/events/photo-consent-summary.tsx` tracks per-guest photo consent)
- Consent types include `photos` and `testimonials` (`lib/interaction/consent-types.ts`)
- Consent records store: type, status (granted/denied/withdrawn/pending), source, timestamps
- Sharing permissions with visibility levels: private, client_only, circle, public (`SharingPermission` type)
- Event photos have `permission_override` field with values: none, portfolio_only, public_with_approval, public_freely (DB constraint in schema)
- Partner images table exists (`partner_images` in schema)
- Partner rail item `partner.venue_photos_requested` exists in the rail registry for when chef requests photos
- Partner rail item `partner.event_photos_shared` exists for photo sharing notifications
- Client photo permission field on client records: none, portfolio_only, public_with_approval, public_freely

**Data source?** No. This is a consent/approval workflow between chef and partner.

**Client-collaborative angle:** Yes. The partner (venue owner) is the one granting or denying photo rights. This is inherently collaborative. The Dinner Circle or partner portal is the natural place for the partner to review and approve specific photos for public use.

**Physical reality:** Screen-based review of photos with approve/deny actions. Could be done on mobile.

**Compounding:** High. Once a partner grants blanket photo approval or approves specific images, that consent persists across all future uses. A venue that says "use any photos freely" never needs to be asked again.

**Solution design:**

- Add photo approval workflow in partner portal: chef submits photos for venue approval, partner approves/denies per image
- Store per-image consent status on partner_images (approved_for_public, portfolio_only, denied, pending)
- Add blanket consent option: "All photos at my venue can be used for [portfolio/public/social]"
- Show consent status on chef's photo gallery (which venue photos are cleared for use)
- Notify partner via rail when new photos need approval
- Store approval with timestamp and conditions (credit requirements, restrictions)

**Where it appears:**

- Partner portal: photo approval queue/section in location detail
- Chef photo gallery: consent status badges per venue photo
- Partner rail: `partner.venue_photos_requested` (already defined)
- Event detail: photo consent summary (extends existing guest consent pattern to venue partner)

**What remains as permanent exit:**
Complex rights-release scenarios involving legal documents (e.g., commercial licensing, print advertising rights, third-party sublicensing) will still require external legal review. But standard portfolio/social/website usage approval can be handled entirely in-app.

**Priority:** Medium frequency (per-event or per-photo-batch) x Medium effort (approval UI + consent storage) = Medium-high rank
**Spec needed?** No. The consent infrastructure exists (`consent_types`, `consent_actions`, photo permission fields). Extending it to partner-approved venue photos is an incremental build on existing patterns.

---

## Batch Summary

| #   | Title                                          | Reclassified To                  | Spec Needed?              |
| --- | ---------------------------------------------- | -------------------------------- | ------------------------- |
| 47  | Review privacy or partner terms outside portal | Partially Reducible              | No                        |
| 48  | Request data deletion or profile removal       | Reducible                        | No                        |
| 49  | Verify insurance/licensing requirements        | Permanent                        | No (field additions only) |
| 50  | Handle incident or liability issue             | Permanent                        | No                        |
| 51  | Approve public use of venue photos             | Reducible + Client-Collaborative | No                        |

---

## Evidence Index

| File                                                | Relevance                                            |
| --------------------------------------------------- | ---------------------------------------------------- |
| `lib/legal/readiness.ts`                            | Policy types, role requirements, acceptance building |
| `lib/legal/actions.ts`                              | Data rights requests, policy acceptance recording    |
| `lib/legal/persistence.ts`                          | Policy acceptance for partner role on signup         |
| `lib/compliance/privacy-policy.ts`                  | Privacy policy content and processors                |
| `app/(public)/partner-terms/page.tsx`               | Partner terms placeholder page                       |
| `app/(public)/privacy/page.tsx`                     | Full privacy policy rendering                        |
| `app/(public)/data-request/page.tsx`                | Public data rights request form                      |
| `app/(public)/data-request/data-request-form.tsx`   | Data request form UI                                 |
| `app/auth/partner-signup/page.tsx`                  | Partner invite claim with legal acceptance           |
| `lib/partners/invite-actions.ts`                    | Partner invite flow with policy recording            |
| `lib/business-ops/insurance-actions.ts`             | Chef insurance policy management                     |
| `lib/interaction/consent-types.ts`                  | Consent types including photos                       |
| `lib/interaction/consent-actions.ts`                | Consent recording actions                            |
| `components/events/photo-consent-summary.tsx`       | Guest photo consent UI                               |
| `lib/discovery/registries/partner-rail-registry.ts` | Partner rail items including photo requests          |
| `lib/partners/portal-actions.ts`                    | Partner portal server actions                        |
| `lib/partners/actions.ts`                           | Partner deactivation                                 |

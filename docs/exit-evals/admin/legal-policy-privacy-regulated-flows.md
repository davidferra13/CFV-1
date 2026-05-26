# Exit Eval: Admin / LEGAL, POLICY, PRIVACY & REGULATED FLOWS

> Wave 3 | 8 scenarios | Role: ADMIN | Mode: Solo | Status: NEEDS-DEVELOPER-REVIEW
> Date: 2026-05-25

---

## Scenario #57: Review terms or policies with counsel

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Legal documents require attorney drafting, negotiation, and professional sign-off. The admin needs an outside legal professional to review language for enforceability, regulatory compliance, and liability exposure. ChefFlow cannot replace legal counsel.

**Context ChefFlow has:**

- Full policy version inventory (`legal_policy_versions` table with 12 policy types)
- Draft/needs_review/approved status per policy version
- `requires_professional_review` boolean enforced at DB constraint level
- Readiness items with owner, jurisdiction, and related links
- Policy acceptance records showing who accepted what version when
- Admin legal-readiness dashboard at `/admin/legal-readiness`

**Data source?** No. Legal counsel is a human professional service, not a data API.

**Client-collaborative angle:** None directly. Policies govern the relationship but clients do not draft them.

**Physical reality:** Document review happens in word processors, PDFs, or legal collaboration tools (Google Docs, MS Word redlines). Screen-based, no kitchen context.

**Compounding:** High. Policy versions persist indefinitely. Each review cycle builds on prior versions. The legal infrastructure (`legal_readiness_items`, `legal_policy_versions`) already compounds review state across the platform's lifetime.

**Solution design:**

- Already built: `/admin/legal-readiness` tracks all 12 policy types with version and status
- Already built: DB constraint prevents marking `approved` without `last_reviewed_at`
- Add: structured "send to counsel" workflow that exports current draft with diff from prior version
- Add: counsel feedback capture (dated notes, reviewer identity, next-action)
- Add: reminder/deadline for policies stuck in `needs_review` beyond a threshold

**Where it appears:**

- `/admin/legal-readiness` (global readiness overview)
- `/settings/legal-readiness` (chef-tenant view)
- `/settings/legal-protection` (hub linking to readiness center)

**What remains as permanent exit:**
The actual attorney interaction: discussion, revision, sign-off. ChefFlow tracks readiness state but never replaces legal judgment.

**Priority:** Low frequency (quarterly/annual) x Low effort (tracking already exists) = Low priority
**Spec needed?** No. Existing infrastructure covers the tracking need. Enhancement is incremental (counsel notes field).

---

## Scenario #58: Publish or revise legal documents

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why admin leaves:** Legal page content lives in source-controlled files (`app/(public)/terms/`, `/privacy/`, `/dmca/`, `/acceptable-use/`, etc.). Publishing a revision means editing code/content files and deploying. The admin portal can track version metadata but cannot edit the published content directly.

**Context ChefFlow has:**

- `legal_policy_versions` table with version strings, status, `public_path`, `effective_at`, `material_change`, `requires_reacceptance`
- Current placeholder pages exist for all 12 policy types (via `LegalPolicyPlaceholder` component)
- Acceptance tracking per user/role
- Admin readiness page shows current version and status

**Data source?** No. Content authoring is a creative/legal act.

**Client-collaborative angle:** None. Legal documents are platform-authored.

**Physical reality:** Standard desktop text editing workflow.

**Compounding:** High. Each version is immutable once effective. The version ledger (`policy_type + version` unique constraint) ensures no version is lost.

**Solution design:**

- Already built: version inventory with status tracking and acceptance chain
- Already built: public placeholder pages for all 12 policy types
- Add: admin action to bump version status from `draft` to `needs_review` to `approved` with approval metadata
- Add: content-diff view showing what changed between versions
- Add: "force reacceptance" toggle that sets `requires_reacceptance` and triggers user prompts

**Where it appears:**

- `/admin/legal-readiness` (version status management)
- Public policy pages (`/terms`, `/privacy`, `/dmca`, `/acceptable-use`, etc.)
- Sign-up/sign-in flows (acceptance prompts when reacceptance required)

**What remains as permanent exit:**
Editing the actual legal text (in repo/CMS/Google Docs) and deploying the new content. ChefFlow tracks the metadata and triggers downstream effects (reacceptance).

**Priority:** Medium frequency (policy revisions happen periodically) x Low effort (metadata tracking exists, missing admin mutation actions) = Medium-low priority
**Spec needed?** No. The schema supports the full lifecycle; admin UI needs status-transition buttons.

---

## Scenario #59: Process privacy/data request

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why admin leaves:** Data rights requests (GDPR, CCPA, etc.) arrive via the public `/data-request` form and require manual review: identity verification, data gathering, legal assessment of scope, and fulfillment (export/deletion/correction). The admin currently must leave to verify identity, gather data across systems, and communicate the response.

**Context ChefFlow has:**

- `legal_data_rights_cases` table with full lifecycle tracking (submitted, verifying, in_progress, fulfilled, denied, cancelled)
- Public intake form at `/data-request` with rate limiting, honeypot, and IP hashing (`submitPublicDataRightsRequest`)
- Request types: access, export, deletion, correction, opt_out, appeal
- Identity verification flag (`requires_identity_verification`)
- Jurisdiction tracking and due dates
- Admin legal-readiness dashboard showing case counts
- Full data takeout system (`lib/exports/data-takeout-actions.ts`) with per-category export, size estimation, and ZIP generation
- Chef-level GDPR tools component (`components/settings/gdpr-tools.tsx`)
- Account deletion workflow (`lib/clients/account-deletion-actions.ts`)

**Data source?** Partially. The data to fulfill the request is inside ChefFlow's own database. Identity verification may require external communication (email confirmation).

**Client-collaborative angle:** The requester provides their identity and specifics via the public form. No Circle needed; the form already collects what the admin needs.

**Physical reality:** Screen-based administrative workflow.

**Compounding:** Medium. Each processed case builds institutional knowledge about edge cases, but the data itself is per-request.

**Solution design:**

- Already built: intake form, case table, status lifecycle, data export tooling
- Add: admin case management UI at `/admin/legal-readiness` showing individual cases with status-transition actions (verify, fulfill, deny)
- Add: "generate export pack" action that uses existing `data-takeout-actions.ts` on behalf of the requester
- Add: identity verification workflow (send confirmation email, record verification timestamp)
- Add: response template system (pre-written responses for each request type outcome)
- Add: due-date calculation (30 days from submission for CCPA/GDPR) with reminder

**Where it appears:**

- `/admin/legal-readiness` (case queue, currently count-only)
- `/data-request` (public intake)
- Admin email (response delivery)

**What remains as permanent exit:**
Edge-case legal judgment (appeals, disputes, complex multi-system data). External communication for identity verification if requester is not an existing user.

**Priority:** Medium frequency (depends on user base) x Medium effort (infrastructure exists, needs admin UI actions) = Medium priority
**Spec needed?** Yes, but small. Admin case-management actions + due-date automation. Could be added to existing legal-readiness admin page.

---

## Scenario #60: Verify cannabis compliance

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Cannabis regulations vary by state and require verification against external authorities (state cannabis control boards, age verification laws, licensing databases). ChefFlow cannot be the source of truth for whether a jurisdiction permits cannabis dining or whether a specific operator holds valid licensure.

**Context ChefFlow has:**

- Full cannabis tier system: `cannabis_tier_users`, `cannabis_tier_invitations`, `cannabis_age_permissions`
- Admin cannabis management at `/admin/cannabis` and `/admin/cannabis/access`
- Grant, revoke, approve, reject, block actions with full audit trail
- Age permission with verification methods: `admin_manual`, `in_person`, `document_upload`
- Compliance page for chefs at `/cannabis/compliance`
- Host agreement system (`lib/cannabis/host-agreement.ts`)
- `legal_payment_tax_marketplace_reviews` table with `alcohol_cannabis` area flag
- Dosing packet generation and control packet system
- Notification system for grants, revokes, and age requirements

**Data source?** Partially. State regulatory databases exist but are not standardized APIs. Most verification requires manual lookup on government websites.

**Client-collaborative angle:** Limited. The cannabis tier subject (chef or client) may provide their own documentation, but regulatory verification requires the admin to check external authority.

**Physical reality:** Desktop research workflow, checking government websites.

**Compounding:** High. Once a jurisdiction's rules are understood, they persist (until law changes). Once a user's age/license is verified, it compounds as ongoing access.

**Solution design:**

- Already built: comprehensive tier/invite/age/compliance infrastructure
- Already built: verification method tracking, expiration dates, admin approval workflow
- Add: jurisdiction rule database (which states allow cannabis dining, age thresholds, license requirements)
- Add: document upload and review workflow for license verification
- Add: expiration alerting when verification documents approach expiry
- Add: compliance checklist per jurisdiction (auto-populated based on chef's state)

**Where it appears:**

- `/admin/cannabis` (tier management)
- `/admin/cannabis/access` (age permissions overview)
- `/cannabis/compliance` (chef self-service)

**What remains as permanent exit:**
Checking current state law, verifying licenses against government databases, consulting legal counsel on edge cases. Regulatory truth is external.

**Priority:** Low-medium frequency (new cannabis users, jurisdiction changes) x High existing coverage = Low priority for additional work
**Spec needed?** No. The system is comprehensive. Jurisdiction rules could be a future enhancement.

---

## Scenario #61: Review cannabis invite or age edge case

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why admin leaves:** Edge cases arise when age verification is ambiguous (e.g., user claims 21+ but document is unclear), when invite circumstances are unusual (e.g., minor at event, unclear jurisdiction), or when legal counsel needs to weigh in on a specific case. Admin leaves to consult notes, legal references, or communicate with the subject.

**Context ChefFlow has:**

- `cannabis_age_permissions` with status tracking (approved, rejected, blocked, pending)
- Structured rejection/block reasons
- `cannabis_tier_invitations` with approval status, rejection reasons, and full history
- Admin actions: `approveAgePermission`, `rejectAgePermission`, `blockAgePermission` with notes fields
- Expiration support (`expires_at`, `expiresInDays`)
- Verification method tracking (`admin_manual`, `in_person`, `document_upload`)
- Full audit trail via `logAdminAction`
- Overview combining tier + age data in `getCannabisAccessOverview()`

**Data source?** No. Edge cases require human judgment.

**Client-collaborative angle:** The subject may need to provide additional documentation or clarification. Currently no structured way to request this from within ChefFlow.

**Physical reality:** Screen-based review, possibly phone call for complex cases.

**Compounding:** Medium. Resolved edge cases inform future similar cases, but each is somewhat unique.

**Solution design:**

- Already built: robust approval/rejection/block workflow with reason fields
- Already built: expiration and verification method tracking
- Add: "request additional documentation" action that notifies the subject with structured requirements
- Add: case notes timeline (append-only notes on a specific invite/age case)
- Add: expiration reminder alerts (when age permission is approaching expiry)
- Add: link to related legal readiness items (e.g., jurisdiction rules)

**Where it appears:**

- `/admin/cannabis/access` (age permissions management)
- `/admin/cannabis` (invite queue)
- Subject notifications (documentation request)

**What remains as permanent exit:**
Consulting legal counsel on truly novel cases. Verifying ambiguous physical documents (e.g., faded ID).

**Priority:** Low frequency (edge cases are rare) x Low effort (structure largely exists) = Low priority
**Spec needed?** No. Incremental additions (notes timeline, documentation request action).

---

## Scenario #62: Respond to DMCA or acceptable-use issue

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** DMCA takedown notices require communication with complainants, content review, potential counter-notice handling, and coordination with legal counsel and hosting providers. Acceptable-use violations may require content removal, user warnings, or account actions that span email, hosting, and legal systems.

**Context ChefFlow has:**

- `legal_dmca_takedown_cases` table with full lifecycle: submitted, needs_review, action_taken, rejected, counter_notice, repeat_infringer_review
- Complainant tracking, content type/ID/URL
- `requires_professional_review` flag
- Counter-notice support in schema
- Repeat infringer tracking (`repeat_infringer_subject_id`)
- Assignment field (`assigned_to`)
- Resolution timestamp
- DMCA public page placeholder at `/dmca`
- Admin legal-readiness page showing DMCA case counts
- `buildDmcaTakedownCase()` builder function
- Content moderation actions (social post hide, chat message delete, hub group deactivate)

**Data source?** No. DMCA response requires legal process, human judgment, and multi-party communication.

**Client-collaborative angle:** The complainant initiates via external channels. The accused content owner may need to respond with counter-notice.

**Physical reality:** Screen-based legal/administrative workflow.

**Compounding:** Medium. Repeat infringer tracking compounds. Process knowledge compounds. But each case is unique.

**Solution design:**

- Already built: case schema with full lifecycle, repeat infringer tracking, content reference
- Already built: content moderation actions for social/chat/hub
- Add: admin DMCA case management UI (currently count-only in legal-readiness)
- Add: status transition actions (submit -> review -> action/reject/counter)
- Add: evidence attachment (screenshots, correspondence, notice text)
- Add: response template system (acknowledgment, action taken, counter-notice instructions)
- Add: timeline view of actions taken on a case

**Where it appears:**

- `/admin/legal-readiness` (case counts, needs detail drilldown)
- `/dmca` (public intake/policy page)
- Content moderation surfaces (social, hub, directory)

**What remains as permanent exit:**
Communication with complainants/counsel via email. Hosting provider coordination for infrastructure-level takedowns. Legal judgment on fair use, counter-notice validity.

**Priority:** Low frequency (DMCA is rare for chef platform) x Medium effort (schema exists, needs UI) = Low priority
**Spec needed?** No. The schema is comprehensive; admin UI needs case-detail and action buttons.

---

## Scenario #63: Document security incident

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why admin leaves:** Security incidents (data breach, unauthorized access, system compromise) require documentation across multiple systems: incident tickets, server logs, forensic evidence, communication with affected users, and potentially regulatory notification. The admin leaves to access logs, coordinate response, and create formal incident documentation.

**Context ChefFlow has:**

- `security_events` table tracking: login success/failure, MFA changes, phone changes, email changes, password changes, session revocations, account locks, data exports, sensitive action reauth
- `admin_audit_log` with 45+ action types and full actor/target tracking
- Hidden Issues dashboard (`/admin/silent-failures`) surfacing non-blocking failures
- `logSecurityEvent()` and `logSecurityEventWithContext()` for fire-and-forget logging
- IP address and user agent capture
- System Health page with database/service status

**Data source?** Partially. Security events are in ChefFlow's own database. But server logs, infrastructure logs, and hosting provider evidence are external.

**Client-collaborative angle:** None. Security incidents are internal operations.

**Physical reality:** Screen-based incident response, typically under time pressure.

**Compounding:** High. Incident documentation informs future detection rules, playbooks, and security posture improvements.

**Solution design:**

- Already built: security event logging, admin audit trail, hidden issues surface
- Add: formal incident record type in admin (separate from silent-failures)
- Add: incident timeline builder that correlates security_events + admin_audit_log entries by time window
- Add: incident notes field with append-only case log
- Add: "related evidence" links (to external logs, tickets, etc.)
- Add: incident status lifecycle (detected, investigating, contained, resolved, post-mortem)
- Add: affected-users flag for notification obligations

**Where it appears:**

- `/admin/silent-failures` (hidden issues, partial overlap)
- New `/admin/security-incidents` or section in system health
- `security_events` table (raw event data)

**What remains as permanent exit:**
Accessing infrastructure logs, server traces, hosting provider forensics. Regulatory notification (if breach). External communication with affected parties.

**Priority:** Low frequency (incidents are rare) x Medium effort (event data exists, needs incident-level abstraction) = Low priority
**Spec needed?** No. Could be a simple admin page linking security events into incident records.

---

## Scenario #64: Verify professional licensing or certificates

**Original classification:** Permanent
**Reclassified to:** Permanent

**Why admin leaves:** Professional licenses (food handler permits, ServSafe certifications, health permits, business licenses, insurance certificates) are issued by external authorities. The admin must verify documents against issuing bodies, check expiration dates against government databases, and confirm legitimacy of uploaded documents.

**Context ChefFlow has:**

- `chef_certifications` table with 12 cert types: servsafe, food_handler, servsafe_manager, allergen_awareness, business_license, health_permit, liability_insurance, workers_comp, auto_insurance, llc, cottage_food, other
- Status tracking: active, expiring_soon, expired, pending_renewal
- Document URL field for uploaded proof
- Issuer, cert number, issue date, expiry date tracking
- Required cert types defined: food_handler, business_license, liability_insurance
- `legal_compliance_items` table with `certifications` category, regulatory body, jurisdiction, renewal tracking, and professional review flag
- Chef compliance page at `/settings/compliance` and `/settings/legal-protection`
- Certification resolver for discovery (`lib/discovery/resolvers/chef/certification-resolver.ts`)
- Trust visual system that uses certification status

**Data source?** Partially. Government licensing databases exist but are not standardized APIs. Most require manual lookup. Some states have online verification portals.

**Client-collaborative angle:** Chefs upload their own certifications. The admin verifies authenticity against external sources.

**Physical reality:** Desktop research, government website lookups, PDF/document review.

**Compounding:** High. Once a chef's certifications are verified and tracked, ChefFlow monitors expiration and alerts for renewal. Each verification builds the chef's trust profile permanently.

**Solution design:**

- Already built: comprehensive certification tracking with types, statuses, expiration, document URLs
- Already built: legal compliance items with renewal frequency and due dates
- Already built: trust/discovery integration using cert status
- Add: admin verification workflow (mark a chef's cert as "admin-verified" vs "self-reported")
- Add: verification timestamp and verifier identity on cert records
- Add: expiration alert system for admin (certs expiring across all chefs)
- Add: bulk verification queue for admin (certs needing review)

**Where it appears:**

- `/settings/compliance` (chef uploads/manages certs)
- `/admin/users/[id]` (chef detail, should show cert status)
- Discovery/directory (cert status affects trust score)

**What remains as permanent exit:**
Checking government databases, state health department websites, insurance company portals. Physical document inspection for in-person verification. Contacting issuing bodies for confirmation.

**Priority:** Medium frequency (every new chef onboarding) x Low effort (schema is comprehensive, needs admin verification actions) = Medium-low priority
**Spec needed?** No. Incremental: add admin-verified flag and bulk queue.

---

## Batch Summary

| #   | Title                                         | Reclassified To     | Spec Needed? |
| --- | --------------------------------------------- | ------------------- | ------------ |
| 57  | Review terms or policies with counsel         | Permanent           | No           |
| 58  | Publish or revise legal documents             | Bridgeable          | No           |
| 59  | Process privacy/data request                  | Partially Reducible | Yes (small)  |
| 60  | Verify cannabis compliance                    | Permanent           | No           |
| 61  | Review cannabis invite or age edge case       | Partially Reducible | No           |
| 62  | Respond to DMCA or acceptable-use issue       | Permanent           | No           |
| 63  | Document security incident                    | Bridgeable          | No           |
| 64  | Verify professional licensing or certificates | Permanent           | No           |

---

## Evidence Summary

**Key files examined:**

- `lib/legal/readiness.ts` - Type definitions, builders, summarizers for all legal infrastructure
- `lib/legal/actions.ts` - Server actions for legal readiness, policy acceptance, data rights, consents
- `lib/legal/persistence.ts` - Policy acceptance recording for subjects
- `database/migrations/20260516000409_legal_readiness_infrastructure.sql` - Full schema (7 tables)
- `database/migrations/20260522120000_legal_compliance_items.sql` - Compliance checklist table
- `app/(admin)/admin/legal-readiness/page.tsx` - Admin legal readiness dashboard
- `app/(public)/data-request/data-request-form.tsx` - Public data rights intake form
- `app/(public)/dmca/page.tsx` - DMCA placeholder page
- `app/(public)/_components/legal-policy-placeholder.tsx` - Shared legal page placeholder
- `lib/admin/cannabis-actions.ts` - Cannabis tier grant/revoke/invite actions
- `lib/admin/cannabis-age-actions.ts` - Age permission approve/reject/block actions
- `app/(admin)/admin/cannabis/page.tsx` - Admin cannabis management
- `lib/security/audit.ts` - Security event logging (16 event types)
- `database/migrations/20260504000004_security_events.sql` - Security events table
- `lib/admin/audit.ts` - Admin audit log (45+ action types)
- `app/(admin)/admin/silent-failures/page.tsx` - Hidden issues dashboard
- `lib/compliance/certification-actions.ts` - Chef certification CRUD (12 types)
- `app/(chef)/settings/legal-protection/page.tsx` - Chef legal hub page

**Assessment:** ChefFlow has remarkably comprehensive legal/compliance infrastructure for a pre-launch platform. The `legal_readiness_infrastructure` migration alone creates 7 interconnected tables with proper constraints. Cannabis compliance is deeply built. The main gaps are admin-facing UI for case management (data rights cases, DMCA cases) and security incident formalization. The permanent exits are genuinely permanent: legal counsel, government databases, and infrastructure forensics cannot be absorbed.

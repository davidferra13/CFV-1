# Exit Eval: Client / LEGAL, PRIVACY & COMPLIANCE

> Wave 2 | 4 scenarios | Solo mode | NEEDS-DEVELOPER-REVIEW
> Evaluated: 2026-05-25

---

## Scenario #81: Review legal terms with lawyer or company procurement

**Original classification:** Permanent exit
**Reclassified to:** Bridgeable

**Why client leaves:** The client needs an external professional (lawyer or procurement officer) to review the contract/terms before agreeing. The decision authority lives outside ChefFlow; someone else must approve the language, liability clauses, cancellation terms, or indemnification before the client can sign.

**Context ChefFlow has:**

- Full contract text (generated from templates with merge fields in `lib/contracts/actions.ts`)
- Event details (date, location, guest count, occasion, quoted price, deposit amount)
- Cancellation policy text (embedded in contract via `lib/contracts/default-clauses.ts`)
- Client terms page at `/client-terms` (currently a draft placeholder via `legal-policy-placeholder.tsx`)
- Signed contract status and history
- PDF export of contracts via `app/api/documents/contract/[contractId]/route.ts`

**Data source?** No. The external tool is a human reviewer (lawyer/procurement), not a data API.

**Client-collaborative angle:** The client (or their representative) knows what specific clauses need review, what corporate policies apply, and what modifications are needed. A Dinner Circle or cohost flow could give the lawyer/procurement person direct read-only access to the contract without the client manually forwarding PDFs.

**Physical reality:** Screen-based. The lawyer/procurement officer needs a clean PDF or shareable link they can annotate, redline, or forward internally. Print-friendly contract export matters here.

**Compounding:** Medium. Corporate clients reuse the same approval workflow across multiple events. If ChefFlow stores the approved contract template as "pre-cleared by [Company] legal," future bookings skip the review cycle entirely.

**Solution design:**

- Shareable read-only contract link (no-login, token-based) for forwarding to legal/procurement reviewers
- PDF export button on the contract page (already exists at `/api/documents/contract/[contractId]`)
- "Pending external review" status on contracts so the chef sees why the client has not signed
- Optional: redline/comment field where the reviewer can note requested changes back into ChefFlow
- Store "pre-approved template" flag per corporate client to skip future reviews

**Where it appears:**

- Client portal contract detail page (existing)
- Shareable proposal/contract token page (`/proposal/[token]` exists)
- Event document list in `/my-documents`

**What remains as permanent exit:**
The actual legal review conversation (lawyer reading, advising, negotiating changes) always happens externally. ChefFlow cannot replace legal counsel.

**Priority:** Low frequency (corporate/high-value clients only) x Low effort (PDF export exists, token sharing exists) = Low priority, polish only
**Spec needed?** No. Core infrastructure (PDF export, shareable tokens) already exists. Minor UX additions (review status, pre-approved template memory) can be backlogged.

---

## Scenario #82: Get corporate approval

**Original classification:** Bridgeable
**Reclassified to:** Bridgeable

**Why client leaves:** The client works at a company that requires internal approval before spending. They need to submit a proposal packet to Slack, procurement software, or an expense policy portal. The approval workflow lives in the company's system, not ChefFlow.

**Context ChefFlow has:**

- Full proposal with pricing, menu, terms (`lib/client-portal/actions.ts` fetches proposals with `share_token`)
- Shareable proposal page at `/proposal/[token]` (public, no-login required)
- Quote details with per-person breakdown
- Event date, location, guest count, occasion
- Contract text and signing status
- Invoice/receipt generation for reimbursement

**Data source?** No. The external tool is a corporate approval workflow (Slack, Concur, procurement portal). ChefFlow cannot integrate with arbitrary corporate systems.

**Client-collaborative angle:** The client or their assistant knows what information the approver needs. ChefFlow can pre-package the "approval packet" (proposal + quote + terms + event details) in a format optimized for forwarding. A cohost or assistant with portal access could pull this directly.

**Physical reality:** Screen-based. The client needs a clean, professional-looking shareable link or downloadable PDF that makes the chef look credible to a corporate approver.

**Compounding:** High for repeat corporate clients. Once a company approves the first event, subsequent events from the same client are faster. Storing "Company X approved Chef Y" as a relationship accelerates future bookings.

**Solution design:**

- "Share for Approval" button that generates a clean shareable link (already partially exists via `/proposal/[token]`)
- One-page PDF "Approval Packet" combining proposal summary, pricing, terms, and cancellation policy
- "Awaiting corporate approval" status on the proposal/quote so chef has visibility
- Copy-friendly text summary (event details + cost + terms in plain text for pasting into Slack/email)
- Optional: approval confirmation button on the shared page so the approver can signal "approved" back into ChefFlow

**Where it appears:**

- Client portal proposal detail page
- Shareable proposal token page (`/proposal/[token]` already exists)
- Quote compare page

**What remains as permanent exit:**
The corporate approval workflow itself (submitting to Concur, getting manager sign-off, matching against expense policy) will always be external.

**Priority:** Medium frequency (corporate clients, team events, offsites) x Low effort (shareable token exists, PDF generation exists) = Medium priority
**Spec needed?** No. The shareable proposal token page exists. A combined "approval packet" PDF and an "awaiting approval" status would be nice additions but are incremental UX polish on existing infrastructure.

---

## Scenario #83: Verify cannabis legality or age requirements

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why client leaves:** The client wants to verify that cannabis dining is legal in their jurisdiction before booking, or needs to confirm age requirements. They search state law sites or legal sources to understand the risk and compliance requirements of hosting a cannabis event.

**Context ChefFlow has:**

- Full cannabis dining module with age attestation (`app/(client)/my-cannabis/age-required/age-attestation-form.tsx`)
- Age permission system with expiry tracking (`lib/cannabis/client-portal-guards.ts` with `CannabisAccessStatus`)
- Cannabis tier access control (`cannabis_tier_users`, `cannabis_age_permissions` tables)
- Cannabis compliance page for chefs (`app/(chef)/cannabis/compliance/page.tsx`)
- Control packets with dosing, reconciliation, and evidence requirements
- Cannabis event cards, RSVP flows, and guest onboarding
- Public cannabis info page (`app/(public)/cannabis/public/page.tsx`)
- Host agreement system (`lib/cannabis/host-agreement.ts`)

**Data source?** Partially. State-by-state cannabis legality is a reference database (could be sourced and displayed). Age requirements (21+ in all legal states) are static and already enforced in the attestation flow.

**Client-collaborative angle:** The client knows their event location and guest demographics. ChefFlow already collects the event location and can cross-reference against known legal jurisdictions. The age attestation flow already gates access.

**Physical reality:** Screen-based. Client research happens on phone/laptop before booking.

**Compounding:** High. Jurisdiction legality data is stable (changes slowly, applies to all future events in that location). Once ChefFlow knows "State X allows cannabis dining," every client in that state benefits.

**Solution design:**

- Jurisdiction legality check integrated into cannabis event creation (location-aware, "Cannabis dining is legal in [State] for adults 21+")
- Clear compliance copy on the public cannabis page explaining legal requirements by state
- Age attestation is already built and enforced (21+ gate with `submitAgeAttestation`)
- "Is this legal where I am?" FAQ section on public cannabis page with state-by-state status
- Host responsibility disclosure (already partially built via `host-agreement.ts`)

**Where it appears:**

- Public cannabis info page (`/cannabis/public`)
- Client cannabis portal dashboard (`/my-cannabis`)
- Age attestation gate (`/my-cannabis/age-required`)
- Event creation flow (when cannabis preference is selected)

**What remains as permanent exit:**
Clients who want to verify legal nuances beyond ChefFlow's summary (local ordinances, venue-specific rules, personal legal advice) will still consult external sources. ChefFlow cannot provide legal advice.

**Priority:** Low frequency (cannabis dining is a niche feature) x Medium effort (state legality database needed) = Low-medium priority
**Spec needed?** No. The age attestation and compliance infrastructure is already robust. A state legality reference table would be a small data addition, not a spec-worthy feature.

---

## Scenario #84: Request privacy/data deletion help

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why client leaves:** The client wants to delete their account, export their data, or exercise a privacy right (GDPR Article 17 deletion, Article 20 portability, CCPA opt-out). They leave because they cannot find self-service controls, or the controls do not exist.

**Context ChefFlow has:**

- **Client self-service deletion** at `/my-profile/delete-account` with full UI (`ClientDeleteAccountForm`)
- **30-day grace period** with cancel/reactivate option (`requestClientAccountDeletion`, `cancelClientAccountDeletion`)
- **Client data export** as JSON download (`exportClientData` in `lib/clients/account-deletion-actions.ts`) covering profile, events, inquiries, quotes, messages, allergies, notes, photos, taste profiles, kitchen inventory, intake responses, meal requests, referrals, NDAs, and financial records
- **Public data request form** at `/data-request` for non-authenticated users (covers access, export, deletion, correction, opt-out)
- **Data rights case tracking** with status workflow (submitted -> verifying -> in_progress -> fulfilled/denied)
- **Rate limiting** on deletion and export actions
- **Identity verification** required for data rights cases
- **Chef-side GDPR tools** at `/settings/compliance/gdpr` with full data export
- **Account purge cron** (`app/api/cron/account-purge/route.ts`) for expired grace periods
- **Financial record anonymization** (7-year retention for accounting compliance)
- **Privacy policy** with clear commitments (no data sale, no third-party ads)
- **Privacy page** at `/privacy` and `/privacy-policy`

**Data source?** No. This is entirely a self-service feature within ChefFlow.

**Client-collaborative angle:** N/A. Privacy actions are individual.

**Physical reality:** Screen-based. Client needs clear, accessible controls they can find without help.

**Compounding:** Low. One-time actions per client.

**Solution design:**

- Already built: self-service deletion with grace period (client side)
- Already built: data export as JSON (client side)
- Already built: public data request form for unauthenticated users
- Already built: data rights case tracking with admin workflow
- Minor gap: discoverability (client needs easy nav path to privacy controls from profile/settings)
- Minor gap: email confirmation of deletion request and export completion

**Where it appears:**

- `/my-profile/delete-account` (client authenticated)
- `/data-request` (public, no login required)
- `/privacy` and `/privacy-policy` (public reference)
- Client portal settings/profile area

**What remains as permanent exit:**
If the client needs to reset their password manager entry, or disputes identity verification for a data request, they may interact via email. But the core workflow is fully in-app.

**Priority:** Low frequency (rare) x Already built = No work needed
**Spec needed?** No. This is comprehensively built. Both authenticated and unauthenticated paths exist with proper GDPR/CCPA coverage.

---

## Batch Summary

| #   | Title                                                 | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------------------- | ------------------- | ------------ |
| 81  | Review legal terms with lawyer or company procurement | Bridgeable          | No           |
| 82  | Get corporate approval                                | Bridgeable          | No           |
| 83  | Verify cannabis legality or age requirements          | Partially Reducible | No           |
| 84  | Request privacy/data deletion help                    | Reducible           | No           |

---

## Evidence Summary

### Key files referenced:

- `lib/legal/actions.ts` - Policy acceptance, data rights requests, consent recording
- `lib/legal/readiness.ts` - Legal readiness types, policy types, role requirements
- `lib/compliance/account-deletion-actions.ts` - Chef account deletion with 30-day grace, purge, audit
- `lib/clients/account-deletion-actions.ts` - Client deletion, cancellation, and GDPR data export
- `lib/compliance/data-export.ts` - Chef comprehensive data export
- `lib/compliance/privacy-policy.ts` - Privacy commitments (no sale, no ads, service providers only)
- `lib/contracts/actions.ts` - Contract templates, merge fields, e-sign
- `lib/documents/client-document-actions.ts` - Client document aggregation
- `lib/cannabis/client-portal-guards.ts` - Cannabis access status, age permission checks
- `lib/cannabis/client-portal-actions.ts` - Age attestation submission
- `app/api/documents/contract/[contractId]/route.ts` - PDF contract download
- `app/(public)/data-request/data-request-form.tsx` - Public data rights request form
- `app/(public)/proposal/[token]/page.tsx` - Shareable proposal page
- `app/(client)/my-profile/delete-account/delete-account-form.tsx` - Client deletion UI
- `app/(client)/my-cannabis/age-required/age-attestation-form.tsx` - Age attestation UI
- `app/(chef)/cannabis/compliance/page.tsx` - Cannabis compliance dashboard
- `components/settings/gdpr-tools.tsx` - GDPR self-service tools

### Assessment:

All 4 scenarios have substantial existing infrastructure. Scenario #84 is fully built. Scenarios #81 and #82 have core infrastructure (PDF export, shareable tokens) with minor UX polish opportunities. Scenario #83 has robust age-gating but could benefit from jurisdiction legality data.

NEEDS-DEVELOPER-REVIEW

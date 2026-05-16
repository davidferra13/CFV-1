# ChefFlow Legal Readiness Diagnosis

Date: 2026-05-16

Scope: codebase-grounded legal/compliance readiness audit for ChefFlow as a chef operating system, client/guest portal, staff/vendor coordination platform, public discovery surface, booking/payment layer, communication/document/menu/pricing/event/payment system.

Boundary: this is not legal advice and does not approve any policy language. Items that depend on legal, tax, accounting, insurance, employment, accessibility, payments, food-service, alcohol, cannabis, privacy, or marketplace law require professional review before launch.

## External Reference Points

- IRS EIN setup is a real business/tax setup step, and the IRS notes that entity formation may need to happen before EIN application for formed entities.
- FTC business guidance treats privacy/security and breach response as operational programs, not only static policy text.
- U.S. Copyright Office DMCA guidance says online service providers seeking section 512 limitations need public designated-agent contact information and Copyright Office registration.
- DOJ ADA guidance identifies web accessibility as relevant to businesses open to the public, with practical barriers such as keyboard access and contrast.
- FTC CAN-SPAM guidance distinguishes commercial email obligations and unsubscribe requirements.
- Stripe Connect documentation frames marketplace/payout compliance around identity verification, KYC/AML, sanctions checks, tokenization, and payout obligations.

## Verified Existing Surfaces

### Public Legal And Trust Surfaces

- Public policy routes exist and are classified public in `lib/auth/route-policy.ts`: `/privacy`, `/privacy-policy`, `/terms`, `/data-request`, `/unsubscribe`, `/trust`.
- `app/(public)/privacy/page.tsx` has a detailed privacy page, third-party processor list hooks via `lib/compliance/privacy-policy`, dietary/allergy text, retention text, and data request links.
- `app/(public)/terms/page.tsx` has Terms of Service with service-boundary language stating ChefFlow is a software platform and not a party to chef-client agreements.
- `app/(public)/terms/_components/terms-extended-sections.tsx` includes acceptable-use content, but it is embedded in Terms rather than a separately versioned Acceptable Use Policy.
- `components/ui/cookie-consent.tsx` provides accept/decline/not-now cookie UX and stores browser cookie state, but no durable server-side policy/consent record.
- `app/(public)/data-request/page.tsx` and `app/(public)/data-request/data-request-form.tsx` provide a public GDPR/CCPA-style request form by sending a contact form request.
- `app/(public)/unsubscribe/page.tsx` provides a public marketing unsubscribe path for campaign recipients.

### Auth, Roles, And Route Gates

- Central route classification exists in `lib/auth/route-policy.ts`.
- Chef, client, staff, partner, vendor, and admin guards exist in `lib/auth/get-user.ts` and `lib/auth/admin.ts`.
- Admin layout calls `requireAdmin()` in `app/(admin)/layout.tsx`; admin middleware intentionally allows authenticated users through to runtime gate.
- Admin audit route `app/(admin)/admin/audit/page.tsx` calls `requireAdmin()`.
- Several system integrity tests already target auth, tenant isolation, public route auth inventory, server-action auth completeness, webhook signature validation, and related boundaries.

### Privacy And Data Rights

- Chef account deletion exists in `app/(chef)/settings/delete-account/page.tsx` and `lib/compliance/account-deletion-actions.ts`, including password reauth, 30-day grace period, reactivation token, audit table write, and activity logging.
- Client deletion columns exist on `clients` in `lib/db/schema/schema.ts` (`account_deletion_requested_at`, `account_deletion_scheduled_for`, `account_deletion_cancelled_at`, `deletion_reason`).
- Chef data export exists in `app/(chef)/settings/data-export/page.tsx`, `app/(chef)/settings/data-export/data-export-client.tsx`, `lib/exports/data-takeout-actions.ts`, and `lib/exports/takeout-categories.ts`.
- Public data requests currently route through contact submissions, not a dedicated data-rights case table/state machine.

### Business, Insurance, Licensing, Food Safety

- Chef compliance and protection routes exist: `/settings/legal-protection`, `/settings/protection`, `/settings/protection/business-health`, `/settings/protection/insurance`, `/settings/protection/certifications`, `/settings/compliance`, `/settings/compliance/haccp`, `/settings/compliance/gdpr`, `/settings/compliance/incidents`, `/settings/compliance/claims`.
- `app/(chef)/settings/compliance/page.tsx` tracks food safety certifications, permits, expiry alerts, HACCP, and active-record public badge notes.
- `app/(chef)/settings/protection/page.tsx` summarizes business health, insurance, certifications, NDA/permissions, continuity, and crisis response with tenant-scoped queries.
- `app/(chef)/settings/protection/business-health/page.tsx` exposes a business health checklist.

### Tax, Payments, Marketplace, Refunds

- Sales-tax settings and remittance surfaces exist at `/finance/sales-tax`, `/finance/sales-tax/settings`, `/finance/sales-tax/remittances`, backed by `lib/finance/sales-tax-actions.ts`.
- Tax-package and tax-prep surfaces exist under `/finance/tax`, `/finance/tax-prep`, and related tax pages. Some UI explicitly says estimates require licensed tax/accounting review.
- Stripe/payment surfaces exist: `/settings/stripe-connect`, `/finance/payouts/stripe-payouts`, `/client/.../pay`, `/api/webhooks/stripe`, `/api/stripe/connect/callback`, and payment tests.
- Commerce checkout exists in `app/api/v2/commerce/checkout/route.ts` behind `withApiAuth(..., { scopes: ['commerce:write'] })`.
- Refund ledger support exists through `ledger_entries` constraints and finance refund pages.

### Marketing And Communications

- Newsletter signup exists in `components/marketing/newsletter-signup.tsx` and `lib/marketing/newsletter-actions.ts`, with rate limiting and unsubscribe reset on re-subscribe.
- Chef marketing campaigns exclude unsubscribed clients in `lib/campaigns/targeting-actions.ts`.
- Public unsubscribe route records campaign-recipient unsubscribe through `lib/marketing/actions`.
- SMS bridge surfaces exist in `components/settings/sms-bridge-panel.tsx` and related SMS routes/actions, but STOP/HELP readiness is not surfaced as a compliance workflow.

### UGC, Uploads, Public Content

- Menu uploads are authenticated, CSRF-protected, rate-limited, extension-limited, hash-deduped, and tenant-path-scoped in `app/api/menus/upload/route.ts`.
- Chef documents, chat messages, client reviews, public profile/media, partner images, guest photos, testimonials, and public chef discovery surfaces exist.
- Client reviews and guest feedback include consent fields such as testimonial/display/photo/data-processing/marketing consent in schema excerpts.
- No dedicated DMCA/takedown route or repeat-infringer admin workflow was found.

## Missing Or Unsafe/Incomplete

### P0 Gaps

- No durable policy versioning/acceptance data model was found for `terms_of_service`, `privacy_policy`, `cookie_policy`, `acceptable_use_policy`, `refund_cancellation_policy`, `chef_agreement`, `client_terms`, `guest_terms`, `staff_terms`, or `dmca_policy`.
- Signup pages create accounts without explicit checkbox acceptance for current Terms/Privacy and without recording policy version, role at acceptance, timestamp, IP, or user agent.
- Cookie consent is browser-only; it does not persist a server-side consent record or policy version.
- No Legal Readiness Center exists for entity formation, EIN/tax setup, banking, licenses, SaaS/sales/marketplace tax review, insurance, policy approvals, data rights, admin audit logs, marketing/SMS consent, food/allergy, alcohol/cannabis, or worker classification.
- No admin compliance dashboard was found showing policy status, consent coverage, missing approvals, users missing required acceptance, or high-risk configuration warnings.
- Data export appears incomplete: `lib/exports/takeout-categories.ts` uses `{ name: 'clients', fkColumn: 'chef_id' }`, but `clients` is modeled with `tenant_id`; this likely causes client export counts/data to be empty or wrong.
- Data export only filters each table by the selected table's FK and does not join child records back to exported parent IDs. Tables such as `recipe_ingredients`, `client_preferences`, `event_guests`, and related child tables may be under-exported or incorrectly scoped if their FK differs from `tenant_id`.
- Public data requests are contact-form submissions, not a tracked data-rights workflow with status, verifier, due dates, jurisdiction, requester identity, and admin fulfillment audit.
- Admin sensitive-data access logging is partial. Mutation audit exists, but no explicit "admin viewed sensitive user data" audit was verified for admin user/client/conversation pages.

### P1 Gaps

- No dedicated Cookie Policy, DMCA Policy, Refund/Cancellation Policy, Chef/Vendor Agreement, Client Terms, Guest Terms, or Staff/Contractor Terms routes were found.
- Acceptable Use exists inside Terms but is not separately managed/versioned.
- Marketing newsletter signup stores email and subscribed/unsubscribed timestamps, but does not capture explicit consent source text/version, IP/user-agent, or whether the message class is marketing versus transactional.
- SMS bridge has operational controls but no productized STOP/HELP readiness, consent timestamp/source, or opt-out state matrix.
- Sales tax settings allow rate configuration and remittance tracking, but no "requires accountant review" readiness flag/state was found for SaaS tax, prepared food tax, marketplace facilitator analysis, alcohol/cannabis tax, or jurisdiction-specific exposure.
- Stripe Connect/payment readiness exists as surfaces, but no unified compliance checklist for connected-account KYC, payout responsibility, marketplace facilitator risk, refund/cancellation disclosures, or 1099/vendor payout tracking was found.
- UGC/public content has consent fields in several places, but no centralized content ownership acknowledgment, takedown intake, repeat-infringer status, or moderation queue was found.
- Staff/vendor signup flows do not show or record staff/vendor terms or contractor/vendor acknowledgments.
- Client and guest flows have some dietary/allergy and RSVP consent copy, but no unified role-specific current-policy acceptance record.

### Security Notes For Fired Work

- Several schema policies in the generated schema snapshot show permissive `to: ["public"]` RLS declarations. Some may be service-role compatibility artifacts, but fired implementation must re-audit live policies before adding compliance data tables.
- Admin routes rely on layout-level `requireAdmin()` and many pages also self-gate. New admin compliance routes must call `requireAdmin()` directly, not rely on UI/nav hiding.
- New chef/client/staff/vendor/partner routes must be added to `lib/auth/route-policy.ts` and use `requireChef()`, `requireClient()`, `requireStaff()`, `requireVendor()`, `requirePartner()`, or `requireAdmin()` before data access.

## Must Require Professional Review

- Final Terms, Privacy Policy, Cookie Policy, AUP, DMCA Policy, refund/cancellation policy, chef/vendor/client/guest/staff terms.
- Entity formation, EIN sequencing, beneficial ownership reporting applicability, foreign/domestic reporting status, and business banking setup.
- Federal/state/local sales tax, SaaS tax, prepared-food tax, marketplace facilitator exposure, alcohol/cannabis tax/excise questions, and filing frequency.
- Payment provider/Stripe Connect model, KYC/KYB, payout liability, money transmission exposure, chargeback/refund rules, 1099/vendor reporting.
- Worker classification for staff, contractor, vendor, partner, chef marketplace, and referral arrangements.
- Food-service licensing, health department rules, allergy/dietary disclosures, alcohol service, cannabis event restrictions, and insurance coverage.
- Accessibility compliance posture and target standard.
- Privacy/data-rights obligations by jurisdiction and retention/deletion exceptions.

## Should Be Implemented In Code

1. `legal_readiness_items` tenant/global table with status, owner, notes, last reviewed date, jurisdiction/state relevance, related route/document/settings link, and `requires_professional_review`.
2. Admin Legal Readiness dashboard under `/admin/legal-readiness`, guarded with `requireAdmin()`, showing global readiness, policy versions, consent coverage, missing acceptances, missing reviews, and high-risk configuration warnings.
3. Chef Legal Readiness Center under `/settings/legal-readiness` or within existing Legal & Protection settings, guarded with `requireChef()`, using tenant-scoped rows.
4. `legal_policy_versions` and `legal_policy_acceptances` model with policy type, version, effective date, material-change flag, acceptance timestamp, role at acceptance, IP/user-agent when available, and reacceptance status.
5. Signup/onboarding/settings acceptance components for chef/client/staff/vendor/partner; guest token flows should show low-friction notices and record guest/RVSP data consent where appropriate.
6. Public placeholder policy pages for cookie, AUP, refund/cancellation, DMCA, client terms, guest terms, staff terms, chef/vendor agreement, all marked draft/requires professional review until approved.
7. Data-rights request table and admin fulfillment workflow, while preserving the public data-request form.
8. Marketing/SMS consent ledger capturing consent state, source, timestamp, channel, transactional-vs-marketing distinction, unsubscribe/opt-out status, and STOP/HELP readiness metadata.
9. Payment/marketplace readiness modules for SaaS subscription compliance, refund/cancellation rules, Stripe setup, connected-account/KYC, vendor payout/1099 placeholders, and tax review flags.
10. DMCA/takedown intake route, admin review queue, content ownership acknowledgment, public/private visibility review, and repeat-infringer status.
11. Fix data takeout FK mapping and child-table export scoping.
12. Sensitive admin access logging for user/client/conversation/payment/dietary/allergy views.

## Must Not Be Faked

- No legal status should default to `approved`.
- No policy should claim attorney/accountant approval unless a reviewed artifact/version exists.
- No tax calculation should be introduced for new jurisdictions without an architecture and accountant-reviewed rule source.
- No Stripe/marketplace/KYC/1099 readiness should be marked complete from UI-only settings.
- No public trust badge should appear from self-attested records alone.
- No deletion/export flow should claim completion without durable status, identity verification process, and exception handling for retained financial/legal records.

## Recommended Queue Slices

1. Foundation schema and policy/version acceptance ledger.
2. Admin Legal Readiness dashboard and global readiness modules.
3. Chef Legal Readiness Center and role-specific checklist surfaces.
4. Data-rights case workflow and takeout scoping fixes.
5. Marketing/SMS consent ledger and unsubscribe/STOP/HELP readiness.
6. Payment/marketplace/tax readiness modules.
7. UGC/DMCA/takedown workflow.
8. Security/access logging and regression tests.

## Validation Performed

- Read route policy, auth guards, admin layout/gates, signup flows, policy pages, data request form, cookie consent, deletion actions, data takeout code, compliance/protection pages, sales tax actions, payment/commerce upload routes, marketing/newsletter/unsubscribe surfaces, and generated schema excerpts.
- No app code was changed in this audit pass.
- Runtime route verification and acceptance-write/read tests were not run because the implementation phase was not authorized under the Build Queue First rule.

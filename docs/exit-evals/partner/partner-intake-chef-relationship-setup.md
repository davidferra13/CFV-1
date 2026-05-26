# Exit Eval: Partner / PARTNER INTAKE & CHEF RELATIONSHIP SETUP

> Wave 5 | Scenarios #6-#10 | Evaluated 2026-05-25
> Mode: Solo (NEEDS-DEVELOPER-REVIEW)

---

## Scenario #6: Find the chef-specific partner form

**Original classification:** Bridgeable
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner has been told (verbally, by email, via a listing) to "sign up as a partner" but does not have the direct URL. They leave ChefFlow to search the chef's external web presence (Instagram, Google, personal website) looking for the specific intake link or slug. The operational decision: "How do I reach THIS chef's partner signup inside ChefFlow?"

**Context ChefFlow has:**

- Chef public profile at `/chef/[slug]` with full display name, bio, profile image, business name
- Chef-specific partner form at `/chef/[slug]/partner-signup` and `/partner-signup?chef=[slug]`
- Generic partner-signup page at `/partner-signup` with a slug entry field
- Chef slug lookup via `getPublicChefProfile()` in `lib/profile/actions.ts`

**Data source?** No. This is a discoverability/linkage problem, not a data source problem.

**Client-collaborative angle:** The chef is the one who tells the partner about the form. If the chef shares a complete URL (which ChefFlow generates), the exit disappears. The partner intake page already shows chef name, identity badge, and links back to the public profile.

**Physical reality:** Screen-based. Partner is at a computer or phone. No special constraints.

**Compounding:** Medium. Once a partner finds and bookmarks the form (or claims their account), this exit never recurs. But for each new partner onboarded, the discovery gap exists once.

**Solution design:**

- Add a visible "Partner with me" CTA or link section on the chef public profile (`/chef/[slug]`)
- Generate a sharable partner-invite card (copy-paste link, QR code) from the chef portal's partner management page
- Ensure Google indexes `/chef/[slug]/partner-signup` with proper structured data for discoverability
- Add "Partner signup" to the chef's link-in-bio or Linktree-style page if one exists

**Where it appears:**

- Chef public profile page (`app/(public)/chef/[slug]/page.tsx`)
- Chef partner management page (`app/(chef)/partners/page.tsx`)
- Generic partner signup (`app/(public)/partner-signup/page.tsx`)

**What remains as permanent exit:**
Partner still searches externally if the chef forgot to share the link and the public profile does not prominently surface the partner-signup path.

**Priority:** Medium frequency (each new partner onboard) x Low effort = Medium priority
**Spec needed?** No. Enhancement to existing pages (add CTA on public profile, improve link generation UX).

---

## Scenario #7: Confirm this is the right chef

**Original classification:** Permanent
**Reclassified to:** Partially Reducible

**Why partner leaves:** The partner received a link or name but wants confidence this is truly the chef they work with before submitting business details. They check the chef's Instagram, Google presence, website, or portfolio for identity verification. The operational decision: "Is this the same person I spoke to? Is this legitimate?"

**Context ChefFlow has:**

- Chef display name, business name, profile image, bio, tagline (all from `getPublicChefProfile()`)
- Chef portal colors and branding (`portal_primary_color`, `portal_background_color`, `portal_background_image_url`)
- Chef social links stored in `social_links` JSON field
- Chef website URL (`website_url`) and Google review URL (`google_review_url`)
- Chef archetype and service configuration
- Public showcase partners (other partners already trust this chef)
- The partner-signup page already shows chef display name and links to `/chef/[slug]`

**Data source?** No. This is a trust/identity problem solved by displaying existing data better.

**Client-collaborative angle:** None directly. This is partner-to-chef identity confidence.

**Physical reality:** Screen-based. Partner is reviewing at their desk or phone. No special constraints.

**Compounding:** Low. One-time verification per partner relationship. Once confirmed, never repeated.

**Solution design:**

- Show chef profile image, bio snippet, business name, and service area prominently on the partner intake page (already partially done in `PublicPartnerSignupForm`)
- Display chef's social links and website on the partner-signup page header so the partner can cross-reference without leaving
- Add a "Verified chef" badge or join date to establish platform legitimacy
- Show number of existing partners or events served as social proof (already available from showcase data)
- Include chef's Google review link inline so verification stays within one click

**Where it appears:**

- Partner signup page header (`app/(public)/partner-signup/page.tsx`, lines 186-210)
- Chef-specific partner signup (`app/(public)/chef/[slug]/partner-signup/page.tsx`)

**What remains as permanent exit:**
Partner who needs to verify identity through channels ChefFlow does not control (Instagram DMs, phone call to confirm, checking LinkedIn). This is permanent because trust ultimately rests on external reputation signals.

**Priority:** Low frequency (once per partner) x Low effort = Low priority
**Spec needed?** No. UI enhancement to show more chef context on intake page.

---

## Scenario #8: Send extra setup context to the chef

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** The public partner intake form (`PublicPartnerSignupForm`) captures structured fields (name, type, contact, email, phone, website, booking URL, description, notes) but the partner has additional context: a PDF of their property details, a spreadsheet of seasonal rates, photos of their space, a list of house rules, or other onboarding materials. They leave to email or text this supplementary information. The operational decision: "Where do I put the extra stuff that does not fit the form?"

**Context ChefFlow has:**

- Current form fields in `PublicPartnerSignupForm`: name, partner_type, contact_name, email, phone, website, booking_url, description, notes (free text)
- The "notes" field is a plain textarea (3 rows) with placeholder "Any details to share with the chef"
- No file/document upload capability on the partner intake form
- No attachment or multi-media input

**Data source?** No. The data source is the partner themselves.

**Client-collaborative angle:** The partner IS the collaborator. They have context the chef needs for setup. A richer intake form or attachment capability eliminates the round-trip.

**Physical reality:** Screen-based. Partner is at a desk sending setup documents.

**Compounding:** High. The partner setup packet (venue photos, house rules, seasonal rates, capacity details, access instructions) becomes the foundation of the location profile and compounds across every future event at that location.

**Solution design:**

- Add structured onboarding question fields to the partner intake form (e.g., house rules, seasonal availability, kitchen equipment, parking/loading info)
- Add file/document attachment capability to the partner intake (reuse vendor document-intake pattern from `lib/vendors/document-intake/upload.ts`)
- Expand the notes field and add section-specific notes (access notes, kitchen notes, house rules)
- Allow partner to upload photos during intake (these feed into `partner_images` table)
- Post-intake: allow partners with claimed accounts to add documents/photos via the partner portal

**Where it appears:**

- Public partner signup form (`components/partners/public-partner-signup-form.tsx`)
- Partner portal profile page (`app/(partner)/partner/profile/page.tsx`)
- Chef-side partner detail review (`app/(chef)/partners/[id]/page.tsx`)

**What remains as permanent exit:**
Partner still emails/texts for truly conversational context that cannot be captured in a form (nuanced expectations, personal relationship history, verbal agreements). This is inherently social.

**Priority:** High frequency (every new partner onboard sends follow-up context) x Medium effort = High priority
**Spec needed?** Yes (partner onboarding enrichment: structured questions + file upload on intake)

---

## Scenario #9: Coordinate partnership terms before being added

**Original classification:** Permanent
**Reclassified to:** Bridgeable

**Why partner leaves:** Before the partner submits their profile or before the chef adds them, there is a negotiation phase: revenue share percentages, exclusivity agreements, operating expectations (minimum notice, blackout dates, guest count requirements), and territory boundaries. This negotiation happens over phone, email, or in person because it requires back-and-forth human judgment. The operational decision: "What are the rules of this partnership?"

**Context ChefFlow has:**

- Commission fields on `referral_partners`: `commission_type` (none/percentage/flat_fee), `commission_rate_percent`, `commission_flat_cents`, `commission_notes`
- Partner payout history table (`partner_payouts`) with amount_cents, method, reference, paid_on
- Notes field for internal relationship notes
- No structured terms/agreement document storage
- No partner-visible terms display (partner portal does not show commission info per `partner-never-leaves-analysis.md` item #175)

**Data source?** No. Terms are negotiated between humans. ChefFlow's role is to store the outcome.

**Client-collaborative angle:** The partner and chef collaborate directly on terms. ChefFlow can capture the RESULT of that conversation (agreed rate, exclusivity flag, effective date, term notes) but cannot replace the negotiation itself.

**Physical reality:** Phone call, in-person meeting, email chain. The negotiation is inherently verbal/social.

**Compounding:** High. Once terms are agreed and stored, they govern every future payout, report, and commission calculation. The initial negotiation investment pays dividends indefinitely.

**Solution design:**

- Add a structured "Partnership Agreement" section on the chef-side partner record (effective date, term duration, exclusivity flag, minimum notice days, territory/region)
- Store the agreed terms with a "confirmed on" timestamp and method (verbal, email, written)
- Allow the partner to view their own terms from the partner portal (currently hidden per privacy boundary)
- Add a "Terms pending" state indicator before terms are recorded, prompting the chef to finalize
- Provide a simple "terms summary" PDF/printable for both parties to reference

**Where it appears:**

- Chef partner detail page (`app/(chef)/partners/[id]/page.tsx`) - terms capture section
- Chef partner edit page (`app/(chef)/partners/[id]/edit/page.tsx`) - commission/terms fields
- Partner portal dashboard - "My terms" read-only section (future)

**What remains as permanent exit:**
The actual negotiation (phone, email, in-person) is always external. Partners will always discuss revenue share, exclusivity, and expectations through their preferred communication channel.

**Priority:** Medium frequency (once per partner, but critical for the relationship) x Low effort (storage exists, UI enhancement) = Medium priority
**Spec needed?** No. The commission fields and notes already exist in the schema. Needs UI for partner-visible terms display and structured term capture on the chef side.

---

## Scenario #10: Share business documents with the chef

**Original classification:** Reducible
**Reclassified to:** Reducible

**Why partner leaves:** The partner needs to share business documents with the chef: W-9 forms, insurance certificates, liquor licenses, venue floor plans, capacity diagrams, rate sheets, service agreements, or health permits. Currently there is no document upload anywhere in the partner intake or partner portal. They leave to email attachments, share a Google Drive link, or text photos of documents. The operational decision: "Where do I put my business paperwork?"

**Context ChefFlow has:**

- No partner document storage (no `partner_documents` table exists)
- Vendor document intake system exists at `lib/vendors/document-intake/` with upload, list, apply-draft modules
- File upload patterns already built for: receipts (`lib/receipts/batch-upload-actions.ts`), menu uploads (`lib/menus/upload-actions.ts`), dish photos (`lib/dishes/photo-actions.ts`), credentials (`lib/credentials/actions.ts`)
- Partner images table exists (`partner_images`) for photo-type files
- Hub media actions (`lib/hub/media-actions.ts`) handle general media
- The vendor document intake pattern (`lib/vendors/document-intake/upload.ts`) is the closest analog: document type, file URL, metadata, status tracking

**Data source?** No. The partner holds the documents.

**Client-collaborative angle:** None. This is partner-to-chef document transfer.

**Physical reality:** Screen-based. Partner scans/photographs documents or has digital copies. No kitchen or hands-free constraints.

**Compounding:** High. Business documents (insurance, W-9, licenses) are referenced across the entire partnership lifecycle. Floor plans and capacity diagrams inform every event at that venue. Rate sheets govern pricing discussions. Upload once, reference forever.

**Solution design:**

- Create a `partner_documents` table (partner_id, tenant_id, document_type, file_url, filename, uploaded_by, status, notes, created_at)
- Add document upload to the public partner intake form (optional, post-submission or during)
- Add document management section to the partner portal (upload, view status, replace expired docs)
- Add document review queue on the chef side (accept/request-replacement with notes)
- Document types: insurance_certificate, w9_tax_form, business_license, floor_plan, rate_sheet, service_agreement, health_permit, liquor_license, other
- Reuse the vendor document-intake upload pattern from `lib/vendors/document-intake/upload.ts`

**Where it appears:**

- Public partner signup form (`components/partners/public-partner-signup-form.tsx`) - optional attachment section
- Partner portal - new "Documents" page (`app/(partner)/partner/documents/page.tsx`)
- Chef partner detail page (`app/(chef)/partners/[id]/page.tsx`) - document review section

**What remains as permanent exit:**
Documents requiring wet signatures or notarization remain external (physical mail, in-person signing). Legal review of uploaded documents also stays external (partner's lawyer reviews terms).

**Priority:** High frequency (every partnership needs at least tax/insurance docs) x Medium effort (new table + upload UI) = High priority
**Spec needed?** Yes (partner document upload and review system)

---

## Batch Summary

| #   | Title                                           | Reclassified To     | Spec Needed? |
| --- | ----------------------------------------------- | ------------------- | ------------ |
| 6   | Find the chef-specific partner form             | Partially Reducible | No           |
| 7   | Confirm this is the right chef                  | Partially Reducible | No           |
| 8   | Send extra setup context to the chef            | Reducible           | Yes          |
| 9   | Coordinate partnership terms before being added | Bridgeable          | No           |
| 10  | Share business documents with the chef          | Reducible           | Yes          |

---

## Evidence Summary

**Key files examined:**

- `app/(public)/partner-signup/page.tsx` - Generic partner signup with slug entry
- `app/(public)/chef/[slug]/partner-signup/page.tsx` - Chef-specific partner signup
- `components/partners/public-partner-signup-form.tsx` - The actual intake form (10 fields, no attachments)
- `lib/partners/actions.ts` - `createPublicPartnerProfile()` server action (lines 367-410)
- `lib/partners/invite-actions.ts` - Partner invite generation and claiming
- `lib/partners/portal-actions.ts` - Partner portal data fetching
- `lib/partners/store.ts` - Tenant-explicit partner helpers
- `lib/profile/actions.ts` - `getPublicChefProfile()` for public chef context
- `app/(partner)/partner/profile/page.tsx` - Partner portal profile editing (no doc upload)
- `database/migrations/20260221000014_referral_partners.sql` - Schema: referral_partners, partner_locations, partner_images
- `database/migrations/20260413000001_partner_payout_history.sql` - partner_payouts table
- `database/migrations/20260412000007_partner_commission_rates.sql` - Commission fields
- `lib/vendors/document-intake/upload.ts` - Existing document upload pattern (reusable)

**Gaps confirmed:**

1. No file/document upload on partner intake or portal
2. No structured onboarding questions beyond the basic 10 fields
3. No partner-visible commission terms in the portal
4. Chef public profile does not prominently link to partner signup
5. Partner intake shows chef name but not social links or extended identity signals

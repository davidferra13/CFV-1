---
session: 2026-04-11 compliance
agent: Builder (Sonnet 4.6)
status: completed
commits: 7a9ce44f5, d07ae8daf, 0606b156a
---

## What Was Done

### Starting point

User asked whether the website needed legal disclosures (location permissions, consent). Research revealed a GDPR Article 9 gap: the embed inquiry form collected allergy/dietary data (health-adjacent) with no meaningful consent record and no accurate privacy policy disclosure of the downstream pipeline.

### Research findings

- Competitive analysis of 7 booking platforms (OpenTable, Tock, Take a Chef, Resy, SevenRooms, Yelp, Chefin)
- **Zero** top platforms use a mandatory consent checkbox on booking/inquiry forms
- Industry standard: one line of small gray text above or below the submit button - "By submitting/sending, you agree to our Terms and Privacy Policy"
- Take a Chef exact pattern: text above button, "Send" button label, no checkbox

### Changes shipped

**Migration** (`20260411000003_inquiry_consent.sql`)

- Added `consent_at TIMESTAMPTZ` and `consent_version TEXT` to `inquiries` table
- Both columns NULL-safe (existing rows unaffected)
- Migration verified applied to local DB

**API route** (`app/api/embed/inquiry/route.ts`)

- Zod schema accepts `consent_at` and `consent_version` (optional)
- Both fields stored on every new inquiry insert

**Embed form** (`components/embed/embed-inquiry-form.tsx`)

- Final pattern matches Take a Chef exactly
- Text (above button): "By sending this form, you agree to our Terms and acknowledge our Privacy Policy."
- Button: "Send" (was "Send Inquiry")
- No checkbox - removed entirely after competitive research

**Privacy policy** (`app/(public)/privacy/page.tsx`)

- Rewrote "Inquiry submissions" section to accurately disclose:
  - What data is collected (including allergy/dietary)
  - Resend email delivery
  - Dinner Circle thread creation
  - AI lead scoring (automated, non-decisional)
  - IP address logging
- Added path for people whose data was submitted without their knowledge
- Updated "Last updated" date to April 11, 2026

**Dev server fix** (`next.config.js`)

- Added `async_hooks: false` webpack fallback for client bundle
- Fixes dev server returning 500 on all pages (async_hooks is Node-only, was leaking into client bundle via inquiry-form import chain)

## Decisions Made

- **No checkbox** - industry standard confirmed, checkbox is conversion friction with no legal advantage in the US for a passive clickwrap form
- **Take a Chef wording exactly** - user explicitly requested this competitor as the model
- **consent_at stored server-side** - sent from client as ISO timestamp at submit time, stored alongside the inquiry for audit trail if ever needed
- **Additive migration only** - both columns nullable, zero risk to existing rows

## Open Items

- Prod server still running old build at time of session close - rebuild in progress
- Cookie consent banner: still missing (lower priority than the Article 9 gap we fixed)
- Data deletion UI: privacy policy mentions email to privacy@cheflowhq.com but no self-serve form exists

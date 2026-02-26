# Public Pages Overhaul

**Date:** March 1, 2026
**Branch:** feature/packing-list-system

---

## What Changed

A full audit and polish pass of all public-facing pages. Three pages were substantively rewritten; one had a copy/layout fix.

---

## Pages Audited

| Page                 | Route                  | Outcome                                         |
| -------------------- | ---------------------- | ----------------------------------------------- |
| Home                 | `/`                    | No changes — already clean and well-written     |
| Pricing              | `/pricing`             | Deferred — not charging yet                     |
| Contact              | `/contact`             | No changes — solid form, actions file confirmed |
| **Privacy Policy**   | `/privacy`             | **Rewritten**                                   |
| **Terms of Service** | `/terms`               | **Rewritten**                                   |
| **Chef Profile**     | `/chef/[slug]`         | **CTA section fixed**                           |
| Inquiry Form         | `/chef/[slug]/inquire` | No changes                                      |
| Share/RSVP           | `/share/[token]`       | No changes                                      |

---

## Privacy Policy (`app/(public)/privacy/page.tsx`)

### Before

- "Privacy policy content coming soon." banner was the first thing visitors saw
- `new Date().toLocaleDateString()` produced inconsistent dates depending on locale and SSR vs. client render
- Section bodies were all placeholder text ("Details about... will be provided here.")
- No `description` in metadata
- Wrapped in `Card` component (inconsistent with page-level layouts)
- Contact email referenced `@chefflow.com` (old domain)

### After

- Removed the placeholder banner entirely
- Static date string `"March 1, 2026"` — consistent, predictable
- Added `metadata.description` for SEO
- Dropped the `Card` wrapper; now uses a clean `max-w-4xl` prose layout consistent with the ToS
- Full substantive content covering 11 sections:
  1. Introduction
  2. Information We Collect (account, event/client data, payments, usage, inquiry submissions)
  3. How We Use Your Information
  4. Third-Party Service Providers (Supabase, Stripe, Resend, Vercel)
  5. Data Retention (7-year minimum for financial records)
  6. Your Rights and Choices (access, correction, deletion, portability, objection)
  7. Cookies and Tracking
  8. Security (TLS, hashed passwords, row-level security)
  9. Children's Privacy (18+ requirement)
  10. Changes to This Policy
  11. Contact Us (`privacy@cheflowhq.com`)

> **Legal review note:** This policy is substantive and honest about how ChefFlow works, but it is not legal advice. It should be reviewed by a qualified attorney before being relied upon as a final legal document, particularly for GDPR/CCPA compliance if you acquire users in the EU or California.

---

## Terms of Service (`app/(public)/terms/page.tsx`)

### Before

- "Terms of service content coming soon." banner
- Same locale/SSR date issue
- Section bodies all placeholder text
- No `description` in metadata
- Contact email referenced `@chefflow.com`

### After

- Removed placeholder banner
- Static date string `"March 1, 2026"`
- Added `metadata.description`
- Same clean `max-w-4xl` prose layout as Privacy page
- Full substantive content covering 16 sections:
  1. Acceptance of Terms
  2. Description of Service (platform only — not a party to chef/client agreements)
  3. Accounts and Registration
  4. Subscription and Billing (free trial, monthly billing, cancellation, price changes)
  5. Acceptable Use
  6. Chef and Client Relationship (chef independence, liability)
  7. Payment Processing (Stripe Connected Account Agreement)
  8. Intellectual Property (chef owns their content; ChefFlow owns the platform)
  9. Privacy (cross-references Privacy Policy)
  10. Disclaimer of Warranties
  11. Limitation of Liability
  12. Indemnification
  13. Termination
  14. Governing Law (United States)
  15. Changes to These Terms
  16. Contact Us (`legal@cheflowhq.com`)

> **Legal review note:** Same caveat as above. These terms are reasonable for a SaaS platform but should be reviewed by an attorney before treating them as final, especially the limitation of liability and governing law clauses.

---

## Chef Profile CTA (`app/(public)/chef/[slug]/page.tsx`)

### Before

The CTA description was hardcoded as:

> "Choose a venue above and hire [chef] for an unforgettable dining experience. Or tell us about your event and we'll be in touch."

This copy was always shown, even when the chef had no partners — making the "Choose a venue above" reference nonsensical since no venue section appeared on the page.

The CTA buttons were also laid out as a series of individual `<div>` wrappers with inconsistent margins (`mt-6`, `mt-4`, `mt-3`, `mt-2`), and "Create client account" / "Create partner profile" were full-width blocks competing visually with the primary action buttons.

### After

- **Dynamic copy:** `partners.length > 0` shows the venue-referencing copy; otherwise shows a simpler "Tell us about your event and [chef] will be in touch."
- **Unified button column:** primary action buttons use a `flex flex-col items-center gap-3` container with `w-full max-w-xs` for consistent widths
- **Secondary links row:** "Create client account" and "Become a partner" are rendered as a compact inline row with a middot separator, visually subordinate to the primary CTAs
- Label "Create partner profile" → "Become a partner" (clearer, less technical)

---

## What Was Not Changed (and Why)

- **`/pricing`** — User confirmed the app is not currently charging. Pricing page will be revisited when billing is enabled. Noted issues for that future pass: missing `metadata`, unnecessary `'use client'` directive, inconsistent layout pattern, inline SVGs instead of Lucide icons.
- **`/contact`** — Server action (`lib/contact/actions.ts`) confirmed working. Form is solid.
- **`/chef/[slug]/inquire`** — Clean minimal wrapper. No issues.
- **`/share/[token]`** — Functional RSVP page. No issues.
- **Header/Footer** — Both already polished and consistent.

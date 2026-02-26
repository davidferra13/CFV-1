# Business Profile Opt-In

## What Changed

This change removes the implicit requirement that all chefs must operate as a named business. The platform now serves individual chefs and business owners equally, with business-specific tooling gated behind an explicit opt-in.

## Why It Was Needed

The original signup flow and profile editor used language like "Start managing your private chef business" and "Business Name (required)" that signaled to solo operators — chefs who work under their own personal name — that they needed to be running a company to use the platform. This was unnecessarily restrictive and off-putting to a large segment of potential users.

## Changes Made

### Signup Page (`app/auth/signup/page.tsx`)

- Subtitle changed from "Start managing your private chef business" → "Manage your chef work, your way"
- Field label changed from "Business Name" → "Your Name or Business Name"
- Helper text changed to "How you'd like to be known — a personal name works perfectly"

The field was already marked optional in the server action (auto-defaults to email prefix if blank). This change makes that optionality visible in the UI.

### Profile Form (`app/(chef)/settings/my-profile/chef-profile-form.tsx`)

- Card title changed from "Business Profile" → "Chef Profile"
- Field label changed from "Business Name" → "Your Name or Business Name"
- Helper text added: "How you'd like to be known — a personal name or brand name both work"
- Removed `required` attribute and the `disabled={!businessName.trim()}` save button constraint
  - Chefs can now save a profile without explicitly naming themselves (uses whatever is already stored)

### Profile Actions (`lib/chef/profile-actions.ts`)

- `business_name` Zod validation changed from `z.string().min(1, ...).max(120)` → `z.string().max(120).optional()`
- Server action now only updates `business_name` in the database if a non-empty value is provided
- This preserves the `NOT NULL` constraint on the `chefs.business_name` column without ever writing a blank value

### Business Mode Toggle (`components/settings/business-mode-toggle.tsx`) — new component

A toggle switch shown in the "Business Defaults" section of Settings. When disabled (default), business-specific tools are hidden. When enabled, links to tax workflow, compliance settings, and contract templates are surfaced.

### Settings Page (`app/(chef)/settings/page.tsx`)

- Imports `getBusinessMode` and `BusinessModeToggle`
- Fetches `businessMode` alongside other settings data
- Renders `<BusinessModeToggle>` at the top of the "Business Defaults" section

### Server Actions (`lib/chef/actions.ts`) — new functions added

- `getBusinessMode()` — reads `is_business`, `business_legal_name`, `business_address` from `chef_preferences`
- `setBusinessMode(input)` — toggles `is_business` and optionally sets legal name and address

### Migration (`supabase/migrations/20260304000007_business_opt_in.sql`)

Adds three nullable columns to `chef_preferences`:

- `is_business BOOLEAN NOT NULL DEFAULT FALSE` — the opt-in gate
- `business_legal_name TEXT` — registered legal name (separate from display name)
- `business_address TEXT` — mailing address for invoices and tax docs

All columns default-safe. No existing data is modified or at risk.

## How It Connects to the System

- `business_name` on the `chefs` table still stores the chef's display identity. It is never written as empty — the server action skips the field if blank and the DB fallback remains the email prefix from signup.
- The `is_business` flag on `chef_preferences` is a pure opt-in gate. When `false`, the UI hides business-facing tools (tax workflow, compliance, contracts) so solo operators aren't overwhelmed.
- Business mode can be turned on or off at any time. It is non-destructive in both directions.

## Verification

1. Sign up with only email and password (no name entered) — confirm the account is created with a working email-derived display name
2. Navigate to Settings → "Your Name or Business Name" field is populated but not required to save
3. Toggle Business Mode ON → tax workflow, compliance, and contract links appear
4. Toggle Business Mode OFF → those links disappear

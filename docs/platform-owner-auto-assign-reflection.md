# Platform Owner Auto-Assign: Contact Form Inquiries

## Date: 2026-02-17

## Problem

Public contact form submissions (`/contact`) went into a shared, unclaimed pool visible to **all chefs** on the platform. Any chef could claim them first-come-first-served. As the platform owner who built the app and drives traffic to the contact form, there was no priority — other chefs could grab leads before the owner even saw them.

## Solution

Auto-assign all contact form submissions to the platform owner. The owner gets first dibs and can release unwanted leads back to the marketplace for other chefs.

## What Changed

### 1. Environment Variable: `PLATFORM_OWNER_CHEF_ID`

Added to `.env.local`. Identifies the platform owner by their chef UUID. If unset, the system falls back to the previous behavior (shared pool, no auto-assign). This is a deployment-level config — no database migration needed.

### 2. Auto-Assignment on Submit (`lib/contact/actions.ts`)

After inserting a `contact_submission`, the `submitContactForm()` action now checks for `PLATFORM_OWNER_CHEF_ID`. If set, it:

1. Checks if a client with the matching email already exists for the owner
2. Creates an inquiry (`channel='website'`) under the owner's tenant
3. Marks the contact submission as claimed with a back-reference to the inquiry

This is wrapped in try/catch — if auto-assign fails, the submission still exists in the shared pool as a graceful fallback. Uses the existing admin client (no auth needed — system-level operation).

### 3. Release to Marketplace (`lib/contact/claim.ts`)

Two new functions:

- **`getLinkedContactSubmission(inquiryId)`** — Checks if an inquiry has a linked contact submission. Used by the detail page to determine whether to show the release button.

- **`releaseToMarketplace(inquiryId)`** — Releases an auto-assigned inquiry back to the marketplace:
  1. Verifies the inquiry is in `'new'` status (hasn't been worked on)
  2. Unclaims the contact submission (nulls out claimed_by/at/inquiry_id)
  3. Deletes the auto-created inquiry
  4. The submission reappears in `/leads` for all chefs

Release is restricted to `'new'` status only. If the chef has already started working the inquiry (marked awaiting_client, etc.), they should decline it through the normal flow.

### 4. UI: Release Button (`components/inquiries/inquiry-transitions.tsx`)

A "Release to Marketplace" button (secondary variant) appears in the action group for inquiries that:

- Are in `'new'` status
- Were auto-assigned from a contact submission (verified by linked contact_submission)

Clicking shows a confirmation dialog before releasing.

### 5. Inquiry Detail Page (`app/(chef)/inquiries/[id]/page.tsx`)

The page now fetches the linked contact submission alongside other data and passes `canRelease` as a prop to `InquiryTransitions`.

## Architecture Notes

- **No database migrations** — Uses existing schema. The `contact_submissions` table already has `claimed_by_chef_id`, `claimed_at`, and `inquiry_id` columns.
- **No new roles** — Platform owner is identified by env var, not a database role. Keeps the system simple.
- **Graceful fallback** — If `PLATFORM_OWNER_CHEF_ID` is unset or invalid, everything works as before.
- **Existing marketplace preserved** — Other chefs can still claim from `/leads`. They just see fewer items (only released or non-auto-assigned submissions).

## Files Modified

| File                                           | Change                                                          |
| ---------------------------------------------- | --------------------------------------------------------------- |
| `.env.local`                                   | Added `PLATFORM_OWNER_CHEF_ID`                                  |
| `lib/contact/actions.ts`                       | Auto-assign logic after contact form insert                     |
| `lib/contact/claim.ts`                         | Added `releaseToMarketplace()` + `getLinkedContactSubmission()` |
| `app/(chef)/inquiries/[id]/page.tsx`           | Fetch linked submission, pass `canRelease` prop                 |
| `components/inquiries/inquiry-transitions.tsx` | Added "Release to Marketplace" button                           |

## How It Connects

```
Public /contact form
  |
  v
submitContactForm()
  |
  +--> Insert contact_submission
  |
  +--> PLATFORM_OWNER_CHEF_ID set?
       |
       YES --> autoAssignToOwner()
       |       |
       |       +--> Create inquiry (owner's tenant)
       |       +--> Mark submission as claimed
       |       |
       |       +--> Owner sees in /inquiries (not /leads)
       |            |
       |            +--> Keep it? --> Work it through normal pipeline
       |            |
       |            +--> Don't want it? --> "Release to Marketplace"
       |                                    |
       |                                    +--> Unclaim submission
       |                                    +--> Delete inquiry
       |                                    +--> Submission reappears in /leads
       |
       NO --> Submission goes to shared pool (/leads)
              Any chef can claim (existing behavior)
```

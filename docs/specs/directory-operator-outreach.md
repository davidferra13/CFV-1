# Spec: Directory Operator Outreach Pipeline

> **Status:** built
> **Priority:** P2 (queued)
> **Depends on:** food-directory-import.md (verified), discover-directory-polish.md (verified)
> **Estimated complexity:** medium (7 files created, 4 files modified)
> **Created:** 2026-03-29
> **Built by:** Claude Code session 2026-03-29
>
> **Build notes:** Migration uses 000120 (spec said 000117, which was already taken). Spec said modify `outreach.ts` but campaign logic is in separate `outreach-campaign.ts` to keep existing transactional emails untouched. `sendEmail` in `lib/email/send.ts` now accepts optional `from` parameter for sender identity override.

---

## What This Does (Plain English)

A slow-drip email outreach system that invites food operators to "be featured" on a new food directory, without ever revealing that their business is already listed. Emails come from a neutral sender identity (not cheflowhq.com), use personalized templates based on the operator's cuisine/city/type, and funnel interested respondents to a landing page where they can "join" (which is actually claiming their existing discovered listing). Operators who don't respond never learn the listing exists. The system sends in tiny batches (25-50/day), prioritizes high-quality listings (high lead_score, have website+email), and respects opt-outs permanently. An admin dashboard tracks sent/opened/replied/claimed conversion rates.

---

## Why It Matters

The directory has 200K+ discovered listings from OSM. They're legally sourced (ODbL) and publicly displayed. But discovered listings are sparse: no menu, no photos, no description. The only way to get rich listings is to get operators to claim them. Mass outreach risks backlash if operators feel scraped. This spec designs a system where operators feel invited, not exposed. The ones who like it join. The ones who ignore it never know. The ones who opt out stop hearing from us. Nobody becomes an enemy.

---

## Strategic Design (READ THIS FIRST)

### The Core Principle: Invitation, Not Notification

**NEVER tell an operator they are already listed.** The email frames this as:

- "We're building a food directory for [city]. Want to be featured?"
- NOT: "Your business is on our site. Claim it."

If they say yes, they land on a page that lets them "create their listing" (which silently matches to their existing discovered record and upgrades it to claimed). If they say no or ignore it, nothing changes.

### Sender Identity Protection

**The outreach email must NOT come from `cheflowhq.com` or mention ChefFlow by name.** Reasons:

1. If an operator googles "ChefFlow" and finds their business already listed, they may feel deceived
2. If they report the email as spam, it burns the `cheflowhq.com` sender reputation (which is used for real transactional emails to actual users)
3. Separation between outreach and platform protects both

**Sender identity:** A neutral domain dedicated to the directory outreach.

- Example: `discover@fooddirectory.guide` or `hello@localfoodguide.co`
- Configured as a separate Resend domain (Resend supports multiple sending domains)
- The email content mentions "a new food directory" generically, links to a neutral landing page
- The landing page then bridges to the ChefFlow discover claim flow

**The developer must register and verify this domain with Resend before the system can send.** The spec does not hardcode the domain; it reads from `DIRECTORY_OUTREACH_FROM_EMAIL` env var.

### Three-Layer Anonymity

| Layer             | What the operator sees                      | What's hidden                            |
| ----------------- | ------------------------------------------- | ---------------------------------------- |
| **Email sender**  | `hello@[outreach-domain]`                   | cheflowhq.com identity                   |
| **Email content** | "We're featuring food businesses in [city]" | That their listing already exists        |
| **Landing page**  | "Join our directory" form                   | That it's matching to an existing record |

### Batch Strategy (Reputation Protection)

| Week | Daily volume                   | Target                                |
| ---- | ------------------------------ | ------------------------------------- |
| 1-2  | 10/day                         | Domain warmup, test deliverability    |
| 3-4  | 25/day                         | Monitor bounce rate, adjust templates |
| 5-8  | 50/day                         | Steady state, high-quality leads only |
| 9+   | Scale based on conversion data | Never exceed 100/day without warmup   |

**Prioritization order for who gets emailed first:**

1. Listings with `lead_score >= 70` AND `email IS NOT NULL` AND `website_url IS NOT NULL` (highest quality, most likely to engage positively)
2. Listings with `lead_score >= 50` AND `email IS NOT NULL` (good quality, have contact)
3. Listings with `email IS NOT NULL` only (have contact, lower quality)
4. Never email listings without an email address (obvious)

### What Happens on Negative Responses

| Response                         | Action                                                                                                                    |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| No reply                         | Nothing. Listing stays. They never knew.                                                                                  |
| Unsubscribe click                | Permanently opted out. Listing stays, no more emails.                                                                     |
| "Remove me" reply                | Add to opt-out list. Listing stays (they didn't ask to be removed from the directory, they asked to stop getting emails). |
| "Take me off your website" reply | Flag for manual review. Admin decides: honor removal request or reply explaining public data source.                      |
| Spam report                      | Auto-suppressed by Resend. Email permanently blocked. Listing stays.                                                      |
| Positive reply / clicks "Join"   | Route to claim flow. Listing upgraded to claimed.                                                                         |

---

## Files to Create

| File                                                 | Purpose                                                                                           |
| ---------------------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `lib/discover/outreach-campaign.ts`                  | Campaign engine: batch selection, template rendering, send orchestration                          |
| `lib/email/templates/directory-invitation.tsx`       | The outreach email template (invitation framing, no ChefFlow mention)                             |
| `app/(bare)/layout.tsx`                              | Minimal layout: no header, no footer, just `{children}`. Prevents ChefFlow branding on join page. |
| `app/(bare)/discover/join/page.tsx`                  | Neutral landing page: "Join our food directory" (bridges to claim flow)                           |
| `app/(bare)/discover/join/_components/join-form.tsx` | Client component: operator fills in details, silently matched to existing listing                 |
| `scripts/run-outreach-batch.mjs`                     | CLI script to run a daily batch (called by cron or manually)                                      |
| `app/(admin)/admin/outreach/page.tsx`                | Admin dashboard: conversion funnel, sent/opened/replied/claimed stats                             |

---

## Files to Modify

| File                                                                | What to Change                                                                                                                                                                                                                                                                                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/discover/outreach.ts`                                          | Add `sendDirectoryInvitationEmail()` function using outreach sender identity. Add `getOutreachQueue()` for batch selection. Add `markAsContacted()` to prevent double-sends.                                                                                                                                                                                               |
| `lib/discover/actions.ts`                                           | Add `claimListingByMatch()` action: given business name + email + city, find matching discovered listing and claim it. This is the "join" action that silently matches. Note: `requestListingClaim()` already exists (line 397) but requires an explicit `listingId`. The new function does fuzzy matching by name+city+state, then delegates to the existing claim logic. |
| `lib/email/send.ts`                                                 | Add optional `from` parameter override to `sendEmail()` so outreach can use a different sender without duplicating the circuit breaker logic. Alternatively, create a parallel `sendOutreachEmail()` in `lib/discover/outreach.ts` that instantiates its own Resend call with `DIRECTORY_OUTREACH_FROM_EMAIL`.                                                             |
| `database/migrations/20260401000117_outreach_campaign_tracking.sql` | Add `outreach_status` and `outreach_contacted_at` columns to `directory_listings`. Add `outreach_batches` table for campaign tracking. Timestamp `000117` is next after highest existing (`000116`).                                                                                                                                                                       |

---

## Database Changes

### New Columns on Existing Tables

```sql
-- Track outreach status per listing
ALTER TABLE directory_listings
  ADD COLUMN IF NOT EXISTS outreach_status text DEFAULT 'not_contacted'
    CHECK (outreach_status IN ('not_contacted', 'queued', 'contacted', 'opened', 'replied', 'claimed_via_outreach', 'opted_out', 'bounced')),
  ADD COLUMN IF NOT EXISTS outreach_contacted_at timestamptz,
  ADD COLUMN IF NOT EXISTS outreach_batch_id uuid;

CREATE INDEX IF NOT EXISTS idx_directory_listings_outreach_status
  ON directory_listings(outreach_status) WHERE outreach_status != 'not_contacted';
```

### New Tables

```sql
-- Track outreach batches for auditing and rate control
CREATE TABLE IF NOT EXISTS outreach_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_date date NOT NULL DEFAULT CURRENT_DATE,
  target_count integer NOT NULL DEFAULT 0,
  sent_count integer NOT NULL DEFAULT 0,
  bounced_count integer NOT NULL DEFAULT 0,
  opened_count integer NOT NULL DEFAULT 0,
  replied_count integer NOT NULL DEFAULT 0,
  claimed_count integer NOT NULL DEFAULT 0,
  template_version text NOT NULL DEFAULT 'v1',
  filters_used jsonb, -- what criteria selected this batch
  created_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz
);
```

### Migration Notes

- Migration filename: `20260401000117_outreach_campaign_tracking.sql` (next after highest existing `000116`)
- All additive. No existing columns modified or dropped.

---

## Data Model

**Outreach lifecycle per listing:**

```
not_contacted -> queued -> contacted -> opened -> replied -> claimed_via_outreach
                              |            |          |
                              v            v          v
                           bounced     opted_out   opted_out
```

**Batch model:**

- Each daily run creates one `outreach_batches` row
- Selected listings get `outreach_status = 'queued'` and `outreach_batch_id` set
- After send, status moves to `contacted`
- Resend webhooks (future) update `opened`, `bounced`
- Reply detection (future) updates `replied`
- Claim via join page updates `claimed_via_outreach`

**Selection criteria (who gets queued):**

```sql
SELECT DISTINCT ON (LOWER(email))
  id, name, email, city, state, business_type, cuisine_types, lead_score, website_url
FROM directory_listings
WHERE status = 'discovered'
  AND email IS NOT NULL
  AND email != ''
  AND outreach_status = 'not_contacted'
  AND id NOT IN (SELECT listing_id FROM directory_outreach_log WHERE email_type = 'invitation')
  AND LOWER(email) NOT IN (SELECT LOWER(email) FROM directory_email_preferences WHERE opted_out = true)
  AND LOWER(email) NOT IN (SELECT LOWER(recipient_email) FROM directory_outreach_log WHERE email_type = 'invitation')
ORDER BY LOWER(email), lead_score DESC NULLS LAST, created_at ASC
LIMIT $batchSize
```

Note: `DISTINCT ON (LOWER(email))` ensures one email per operator even if they have multiple listings. The `ORDER BY` picks the highest `lead_score` listing for each email. The second `NOT IN` on `directory_outreach_log` catches cases where listing A was contacted but listing B shares the same email.

---

## Server Actions

| Action                                  | Auth             | Input                                                                   | Output                                                                                                                                              | Side Effects                                                                                                                                                                                                                                                                                                                  |
| --------------------------------------- | ---------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `getOutreachQueue(batchSize)`           | Admin (script)   | `{ batchSize: number, minLeadScore?: number }`                          | `DirectoryListing[]`                                                                                                                                | None (read-only)                                                                                                                                                                                                                                                                                                              |
| `markAsContacted(listingId, batchId)`   | Admin (script)   | `{ listingId: string, batchId: string }`                                | `{ success: boolean }`                                                                                                                              | Updates `outreach_status`, `outreach_contacted_at`, `outreach_batch_id`                                                                                                                                                                                                                                                       |
| `claimListingByMatch(input)`            | Public (no auth) | `{ businessName, email, city, state?, phone?, website?, ref?: string }` | `{ success, listingId?, slug?, isNew? }`                                                                                                            | If `ref` decodes to valid listing: claim directly. Else fuzzy match on name+city+state. If match: claim. If no match: create new `pending_submission`. Delegates claiming logic to existing `requestListingClaim()` (line 397 of actions.ts).                                                                                 |
| `sendDirectoryInvitationEmail(listing)` | Admin (script)   | Full listing object                                                     | `{ success: boolean }`                                                                                                                              | Sends email via outreach sender, logs to `directory_outreach_log`                                                                                                                                                                                                                                                             |
| `getOutreachDashboardStats()`           | `requireAdmin()` | None                                                                    | `{ funnel: { not_contacted, queued, contacted, opened, replied, claimed, opted_out, bounced }, batches: OutreachBatch[], recentOptOuts: string[] }` | None. Queries `directory_listings` grouped by `outreach_status` for funnel counts, `outreach_batches` for batch history, and `directory_email_preferences` for recent opt-outs. Does NOT reuse existing `getOutreachStats()` (which queries `directory_outreach_log` by email_type and doesn't know about `outreach_status`). |

---

## UI / Component Spec

### Email Template: `directory-invitation.tsx`

**Subject line variants (A/B testable):**

- "Want to be featured in [city]'s food directory?"
- "[Business Name], food lovers in [city] are looking for you"
- "Free listing: [Business Name] in [city]"

**Email body (key principles):**

- NO mention of ChefFlow, cheflowhq.com, or any existing listing
- Sent from `DIRECTORY_OUTREACH_FROM_EMAIL` (separate domain)
- Warm, human tone. Not corporate. Not salesy.
- One clear CTA: "Get Featured" button linking to `/discover/join?ref=[listing-id-hash]`
- Unsubscribe link at bottom (CAN-SPAM required)
- Physical mailing address at bottom (CAN-SPAM required)

**Template structure:**

```
Subject: Want to be featured in {city}'s food directory?

Hi {firstName or businessName},

We're putting together a directory of the best food in {city}.
Your {businessType} came up in our research, and we'd love to
feature you.

It's free. Takes about 2 minutes. You add your menu, photos,
and hours. People in {city} find you directly - no middleman,
no commission.

[Get Featured - Button]

If this isn't for you, no worries. Just ignore this email and
you won't hear from us again.

Best,
The Food Directory Team

---
{OUTREACH_PHYSICAL_ADDRESS env var, rendered as plain text}
Unsubscribe: {buildOptOutUrl(recipientEmail) from lib/discover/outreach.ts:29-32}
```

**Physical address rendering:** The template reads `process.env.OUTREACH_PHYSICAL_ADDRESS` and renders it as a plain text line at the bottom of the email. If the env var is empty/missing, the `sendDirectoryInvitationEmail` function must skip sending and log an error (CAN-SPAM hard requirement).

**What the email does NOT say:**

- "Your business is already listed"
- "Claim your listing"
- "We found your business on OpenStreetMap"
- "ChefFlow" anywhere
- Any mention of existing data

### Landing Page: `/discover/join`

**URL:** `/discover/join?ref=[hashed-listing-id]`

The `ref` param is a hashed listing ID (not the raw UUID). Used to silently match the operator to their existing discovered listing when they submit.

**Page content:**

- Clean, simple form: Business Name, Your Email, City, State, Business Type
- If `ref` param exists, pre-fill fields from the matched listing (name, city, state, type)
- CTA: "Get Featured" or "Join the Directory"
- After submit: redirect to `/discover/[slug]/enhance` (existing enhance flow)
- No ChefFlow branding on this page (or minimal, just the domain in the URL which is unavoidable)

**Matching logic on submit (exact algorithm, in order):**

1. If `ref` param decrypts to a valid listing UUID: claim that listing directly
2. If no `ref` or decryption fails, run three-tier match:
   - **Tier 1 (exact):** `WHERE LOWER(name) = LOWER($name) AND LOWER(city) = LOWER($city) AND state = $state AND status = 'discovered'` - if exactly one result, claim it
   - **Tier 2 (loose name):** `WHERE LOWER(REPLACE(name, '''', '')) ILIKE LOWER(REPLACE($name, '''', '')) AND LOWER(city) = LOWER($city) AND state = $state AND status = 'discovered'` - strips apostrophes, handles "Joe's" vs "Joes". If exactly one result, claim it. If multiple, pick highest `lead_score`.
   - **Tier 3 (no match):** Create a new `pending_submission` listing with the submitted data
3. In all cases: send the standard `DirectoryClaimedEmail` (which DOES mention ChefFlow, but by this point they've opted in)
4. Set `outreach_status = 'claimed_via_outreach'` on the matched listing (in addition to normal claim fields)

### Admin Dashboard: `/admin/outreach`

**Visible to admin only.** Shows:

- **Funnel:** Not Contacted -> Contacted -> Opened -> Replied -> Claimed (with counts and percentages)
- **Batch history:** Date, sent count, bounce rate, open rate, claim count
- **Controls:** "Run batch" button (triggers `scripts/run-outreach-batch.mjs` via API route), batch size slider (10-100)
- **Opt-out count and recent opt-outs**
- **Bounce rate warning** if > 5% (stop sending, clean list)

---

## Edge Cases and Error Handling

| Scenario                                                  | Correct Behavior                                                                                                               |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Listing has email but it bounces                          | Mark `outreach_status = 'bounced'`. Never retry. Listing stays.                                                                |
| Operator replies "take me off your site"                  | Flag for manual review. Do NOT auto-remove listing. Admin decides.                                                             |
| Operator clicks "Get Featured" but enters different email | Match by `ref` param (listing ID hash), not by email. Claim succeeds.                                                          |
| Same email on multiple listings (chain restaurant)        | Send ONE email (deduplicate by email address). Let them claim one listing, then manually claim others through the UI.          |
| Batch exceeds daily limit                                 | Hard cap in `run-outreach-batch.mjs`. Never send more than `MAX_DAILY_OUTREACH` (env var, default 50).                         |
| Resend API key not configured                             | Script exits with clear error. No silent failures.                                                                             |
| Outreach domain not verified                              | Resend rejects the send. Logged as error. Script continues with next listing.                                                  |
| Operator googles the outreach domain                      | The domain should have a minimal landing page: "A project to help food businesses get discovered online." No link to ChefFlow. |
| Rate limit hit                                            | Script sleeps between sends (1-3 second delay per email).                                                                      |
| Listing already claimed by someone else                   | Skip in queue selection (status != 'discovered').                                                                              |
| Email in opt-out list                                     | Skip in queue selection (checked against `directory_email_preferences`).                                                       |
| `ref` hash is tampered/invalid                            | Ignore it. Fall through to fuzzy match or new submission. No error shown to user.                                              |

---

## CAN-SPAM Compliance Checklist

Every outreach email MUST include:

1. **Accurate "From" header** - real name and email that accepts replies
2. **Non-deceptive subject line** - must relate to email content
3. **Physical postal address** - of the sender (your address or a PO Box)
4. **Unsubscribe mechanism** - one-click link, honored within 10 business days
5. **Identification as advertisement** - the email is a solicitation (can be implicit through context)

The existing `buildOptOutUrl()` and `optOutDirectoryEmail()` in `lib/discover/outreach.ts` handle items 4. Items 1-3 and 5 are handled in the email template.

---

## Verification Steps

1. **Migration applied:** `outreach_status` column exists on `directory_listings`, `outreach_batches` table exists
2. **Queue selection:** Run `getOutreachQueue(10)` - returns 10 discovered listings with email, ordered by lead_score DESC
3. **Email template:** Render `DirectoryInvitationEmail` with sample data. Verify: no "ChefFlow" text, no "already listed" text, includes unsubscribe link, includes physical address
4. **Join page:** Navigate to `/discover/join?ref=[valid-hash]`. Verify fields are pre-filled. Submit. Verify listing status changes to `claimed`. Verify redirect to enhance page.
5. **Join page (no ref):** Navigate to `/discover/join` (no ref). Submit with a business name that matches an existing discovered listing. Verify it matches and claims.
6. **Join page (no match):** Submit with a business name that doesn't exist. Verify a new `pending_submission` listing is created.
7. **Opt-out:** Click unsubscribe link from email. Verify email is added to `directory_email_preferences` with `opted_out = true`. Verify next batch run skips this email.
8. **Batch script:** Run `node scripts/run-outreach-batch.mjs --dry-run`. Verify it prints what would be sent without actually sending.
9. **Admin dashboard:** Sign in as admin. Navigate to `/admin/outreach`. Verify funnel stats display correctly.
10. **Type check:** `npx tsc --noEmit --skipLibCheck` exits 0

---

## Out of Scope

- **Resend webhook integration** for real-time open/click tracking (future: would update `opened_at`/`clicked_at` on `directory_outreach_log`)
- **A/B testing framework** for subject lines (future: just use `template_version` field manually for now)
- **Reply detection** from inbox (future: would require monitoring a reply-to inbox)
- **Multi-step drip sequences** (future: this spec is single-touch only. One email per operator, ever.)
- **Outreach domain registration** - the developer must register and verify a domain with Resend before this system can send. The spec reads from env vars.
- **Google Places API enrichment** - separate spec for pulling photos/menus
- **Automated removal honoring** - removal requests go to manual review, not auto-processed

---

## Notes for Builder Agent

1. **The `ref` param encoding:** Use AES-256-CBC (reversible encryption), NOT HMAC (one-way). Encrypt the listing UUID with `OUTREACH_HASH_SECRET` env var (falls back to `AUTH_SECRET`). Output as base64url. The join page decrypts the `ref` param back to the listing UUID. Helper functions: `encryptRef(listingId: string): string` and `decryptRef(ref: string): string | null`. Use Node.js `crypto.createCipheriv` / `crypto.createDecipheriv` with a deterministic IV derived from the listing ID (so the same listing always produces the same ref). If decryption fails (tampered ref), return null and fall through to fuzzy match.

2. **Email sender identity:** Add an optional `from?: string` parameter to `SendEmailParams` in `lib/email/send.ts:9-19`. Update line 45 to: `from: from || \`\${FROM_NAME} <\${FROM_EMAIL}>\``. This is a 2-line change that lets outreach use a different sender while keeping the circuit breaker logic. Then `sendDirectoryInvitationEmail`calls`sendEmail({ from: process.env.DIRECTORY_OUTREACH_FROM_EMAIL, ... })`. Do NOT create a parallel send function (avoids duplicating circuit breaker).

3. **The join page must escape the public layout.** The `app/(public)/layout.tsx` renders `<PublicHeader />` and `<PublicFooter />` with full ChefFlow branding (lines 26-30). To avoid this, create the join page under a new route group: `app/(bare)/discover/join/page.tsx` with its own minimal `app/(bare)/layout.tsx` that renders only `{children}` (no header, no footer, no nav). This route group pattern is standard Next.js. The URL will still be `/discover/join` because route groups don't affect the URL path. The page itself should be a clean dark page with a simple form and food imagery. After submit, the redirect to `/discover/[slug]/enhance` goes back into the `(public)` layout with full ChefFlow branding, which is fine because they've opted in.

4. **Deduplication is critical.** The batch script must check `directory_outreach_log` to never send the same listing a second invitation. Also deduplicate by email address (one operator may have multiple listings with the same email).

5. **The `--dry-run` flag on the batch script** is mandatory for the first few runs. It should print: "Would send to: [business name] ([email]) in [city], [state] - lead score: [score]" without actually sending.

6. **Follow the existing outreach patterns** in `lib/discover/outreach.ts`. Same logging, same opt-out checking, same circuit breaker via `lib/resilience/circuit-breaker.ts`.

7. **Do NOT modify** the existing `sendDirectoryWelcomeEmail`, `sendDirectoryClaimedEmail`, or `sendDirectoryVerifiedEmail` functions. Those are for operators who found the directory organically and opted in through the normal flow. The outreach pipeline is a separate funnel.

8. **Physical address for CAN-SPAM:** Read from `OUTREACH_PHYSICAL_ADDRESS` env var. The developer will set this. If not set, the batch script must refuse to send (hard requirement, not optional).

9. **Rate limiting:** Add a `sleep(2000)` between each email send in the batch script. This prevents Resend rate limits and looks less like spam to receiving mail servers.

10. **The admin page goes under the existing admin section**, not under discover. Route: `app/(admin)/admin/outreach/page.tsx`. Gate with `requireAdmin()`.

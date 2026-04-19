# External Directory (Nearby)

Public directory of food businesses that are NOT ChefFlow platform users. Lives at `/nearby` (canonical route; `/discover` redirects here for legacy compatibility), managed at `/admin/directory-listings`.

## How It Works

### Listing lifecycle

```
discovered ──> claimed ──> verified
     │              │           │
     └──────────────┴───────────┴──> removed
                    ↑
        pending_submission
```

- **Discovered:** Admin creates manually or approves a community nomination. Shows public facts only (name, city, cuisine, website). No email on file, no outreach sent.
- **Pending submission:** Business self-submits via `/nearby/submit`. Provides their email. Waits for admin review.
- **Claimed:** Business owner claims an existing discovered listing by providing name + email. Unlocks profile enhancement.
- **Verified:** Admin approves. Green badge, higher ranking in results.
- **Removed:** Business or admin removes the listing.

### Consent boundary

Discovered listings have NO email, NO private data. Only public facts.
Email, phone, address, hours, menu, description are only populated when the business owner provides them (submit or claim).
Outreach is only sent to businesses that gave us their email voluntarily.

## Outreach System

### When emails fire

Emails are non-blocking side effects. They never prevent the main action from succeeding.

| Event in `actions.ts`                                | Outreach function in `outreach.ts` | Template                 |
| ---------------------------------------------------- | ---------------------------------- | ------------------------ |
| `submitDirectoryListing()` inserts a listing         | `sendDirectoryWelcomeEmail()`      | `directory-welcome.tsx`  |
| `requestListingClaim()` updates status to claimed    | `sendDirectoryClaimedEmail()`      | `directory-claimed.tsx`  |
| `adminUpdateListingStatus()` sets status to verified | `sendDirectoryVerifiedEmail()`     | `directory-verified.tsx` |

### How a send works internally

Every send function in `outreach.ts` follows the same pattern:

1. **Opt-out check:** Queries `directory_email_preferences` for the recipient. If `opted_out = true`, logs a skip and returns early.
2. **Build opt-out URL:** `base64url(email)` appended as `?t=` param to `/nearby/unsubscribe`.
3. **Send via Resend:** Calls `sendEmail()` from `lib/email/send.ts` with a React Email component.
4. **Log the send:** Inserts a row into `directory_outreach_log` with email type, recipient, subject, and error (if any).
5. **Error handling:** `try/catch` around everything. Failures are logged, never thrown. The calling action in `actions.ts` also wraps the outreach call in `.catch()` so a failed email never breaks the user's submission/claim.

### Unsubscribe flow

1. Every email footer has an unsubscribe link: `/nearby/unsubscribe?t=<base64url-encoded-email>`
2. Page decodes the `?t` param, pre-fills the email input.
3. User clicks "Unsubscribe", which calls `optOutDirectoryEmail()`.
4. That upserts into `directory_email_preferences` with `opted_out: true`.
5. All future sends check this table first.

### Admin outreach stats

`getOutreachStats()` returns total sends, breakdown by email type, recent errors (last 10), and opt-out count. Rendered on `/admin/directory-listings` when `totalSent > 0`.

## Database

### Tables

**`directory_listings`** - All listings. RLS: public read (non-removed), service_role write.

Key columns: `name`, `slug`, `city`, `state`, `business_type`, `cuisine_types[]`, `website_url`, `status`, `source`, `email`, `phone`, `address`, `description`, `hours` (jsonb), `photo_urls[]`, `menu_url`, `price_range`, `featured`, `claimed_by_name`, `claimed_by_email`, `claimed_at`, `claim_token`, `removal_requested_at`, `removal_reason`.

**`directory_nominations`** - Community suggestions. RLS: public insert, service_role manage.

**`directory_outreach_log`** - Every email sent. Columns: `listing_id`, `email_type`, `recipient_email`, `subject`, `error`, `sent_at`.

**`directory_email_preferences`** - Opt-out records. Columns: `email` (unique), `opted_out`, `opted_out_at`, `opt_out_reason`.

### Migrations

- `20260401000079_external_directory_listings.sql` - listings + nominations tables, RLS, indexes
- `20260401000080_directory_outreach.sql` - outreach log + email preferences tables

## Implementation files

| File                                         | What it does                                                                                                                 |
| -------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| `lib/discover/actions.ts`                    | All server actions (13 total). Public queries, submissions, claims, admin CRUD. Fires outreach as non-blocking side effects. |
| `lib/discover/outreach.ts`                   | Email dispatch, opt-out checks, send logging, admin stats.                                                                   |
| `lib/discover/constants.ts`                  | 8 business types, 21 cuisine categories, 4 price ranges, 5 statuses. Type exports + label helpers.                           |
| `lib/email/templates/directory-welcome.tsx`  | React Email: submission confirmation, 3-step process, preview CTA.                                                           |
| `lib/email/templates/directory-claimed.tsx`  | React Email: claim confirmation, CTA to `/nearby/[slug]/enhance`.                                                             |
| `lib/email/templates/directory-verified.tsx` | React Email: verified badge confirmation, link to live listing.                                                              |

## Data Sources

Primary data source is **OpenStreetMap** (OSM) via the OpenClaw pipeline on Raspberry Pi. Listings carry `osm_id`, `lat`, `lon`, and `postcode` fields for provenance and geolocation. The `/nearby` page includes ODbL attribution in the footer as required by the OSM license.

Additional sources: community nominations (`submitNomination`), self-submissions (`submitDirectoryListing`), and admin manual creation (`adminCreateListing`).

## Adding a new email trigger

1. Create the template in `lib/email/templates/directory-*.tsx` using `BaseLayout`. Include `optOutUrl` in footer.
2. Add a send function in `outreach.ts` following the existing pattern (opt-out check, send, log).
3. Call it from the relevant action in `actions.ts` as a non-blocking side effect:
   ```ts
   sendYourNewEmail({...}).catch((err) => console.error('[non-blocking] ...', err))
   ```
4. Add the email type string to `getOutreachStats()` if you want it tracked separately (it auto-counts by `email_type`).

## Adding a new listing field

1. Add the column via a new migration (additive only).
2. Add it to the `DirectoryListing` type in `actions.ts`.
3. If it's consent-gated: only render it on `[slug]/page.tsx` when `status === 'claimed' || status === 'verified'`.
4. If it's editable by the business owner: add it to `enhanceDirectoryListing()` in `actions.ts` and the form in `enhance-profile-form.tsx`.

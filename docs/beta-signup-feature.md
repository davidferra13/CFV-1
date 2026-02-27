# Beta Signup Feature

**Added:** 2026-02-27
**Status:** Complete

## Overview

A public beta signup system that lets prospective chefs request early access to ChefFlow. Includes a public form, a branded confirmation page, a home page CTA, and an admin management view.

## Routes

| Route             | Auth       | Purpose                                                       |
| ----------------- | ---------- | ------------------------------------------------------------- |
| `/beta`           | Public     | Signup form — name + email required, optional chef details    |
| `/beta/thank-you` | Public     | Confirmation page — explains what the beta is, what to expect |
| `/admin/beta`     | Admin only | Manage signups — view all, change status, add notes           |

## Shareable Link

Send people to: **`https://cheflowhq.com/beta`** (or `https://beta.cheflowhq.com/beta` for the beta environment)

## Database

**Table:** `beta_signups` (platform-level, no tenant scoping)

| Column            | Type        | Notes                                          |
| ----------------- | ----------- | ---------------------------------------------- |
| id                | uuid        | PK                                             |
| name              | text        | Required                                       |
| email             | text        | Required, UNIQUE                               |
| phone             | text        | Optional                                       |
| business_name     | text        | Optional                                       |
| cuisine_type      | text        | Optional                                       |
| years_in_business | text        | Optional (text for flexible input like "5+")   |
| referral_source   | text        | Optional (social_media, friend_referral, etc.) |
| status            | text        | pending → invited → onboarded (or declined)    |
| notes             | text        | Admin private notes                            |
| created_at        | timestamptz | Auto                                           |
| invited_at        | timestamptz | Set when status → invited                      |
| onboarded_at      | timestamptz | Set when status → onboarded                    |

**Migration:** `supabase/migrations/20260327000009_beta_signups.sql`

## Security

- **Honeypot field** — hidden `website` input catches bots (fake success returned)
- **IP rate limiting** — 5 submissions per 5-minute window (in-memory buckets)
- **Email uniqueness** — re-submitting same email updates existing record (upsert)
- **RLS enabled** — no public policies, all access via admin client (service role)
- **No auth required** — `/beta` is in middleware `skipAuthPaths`

## Capacity & Social Proof

- **`BETA_CAPACITY = 25`** — configurable constant in `lib/beta/actions.ts`
- Public `/beta` page shows a progress bar: "X of 25 spots filled"
- At 80%+ capacity: "Only N spots remaining" warning
- At 100%: "Waitlist only — all spots are filled"

## Emails

Two automated emails on new signups (non-blocking — failures don't prevent the signup):

1. **Welcome email** to the person who signed up — `lib/email/templates/beta-welcome.tsx`
2. **Admin notification** with signup details — `lib/email/templates/beta-signup-admin.tsx`

Emails only send for new signups, not re-submissions of the same email. Admin notification includes total signup count.

Admin email configured via `ADMIN_NOTIFICATION_EMAIL` env var (fallback: `info@cheflowhq.com`).

## Key Files

| File                                        | Purpose                                                                |
| ------------------------------------------- | ---------------------------------------------------------------------- |
| `lib/beta/actions.ts`                       | Server actions (submit, get, update, delete, export, count)            |
| `components/beta/beta-signup-form.tsx`      | Public form component                                                  |
| `app/(public)/beta/page.tsx`                | Public signup page with capacity bar                                   |
| `app/(public)/beta/thank-you/page.tsx`      | Confirmation page                                                      |
| `app/(admin)/admin/beta/page.tsx`           | Admin management page                                                  |
| `components/admin/beta-signups-table.tsx`   | Admin table with search, filter, CSV export, delete, status management |
| `lib/email/templates/beta-welcome.tsx`      | Welcome email template (to signup)                                     |
| `lib/email/templates/beta-signup-admin.tsx` | Admin notification email template                                      |

## Admin Workflow

1. Share `cheflowhq.com/beta` with prospective testers
2. View signups at `/admin/beta` — search, filter by status, export CSV
3. Change status: **Pending** → **Invited** (when you send them access) → **Onboarded** (when they're active)
4. Use **Declined** for signups that aren't a fit
5. Add notes for internal tracking
6. Copy invite link per row (pre-fills email on signup page)
7. Delete signups that are spam or duplicates

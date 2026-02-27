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
- **Email uniqueness** — re-submitting same email updates existing record (upsert)
- **RLS enabled** — no public policies, all access via admin client (service role)
- **No auth required** — `/beta` is in middleware `skipAuthPaths`

## Key Files

| File                                      | Purpose                                                                   |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| `lib/beta/actions.ts`                     | Server actions (submitBetaSignup, getBetaSignups, updateBetaSignupStatus) |
| `components/beta/beta-signup-form.tsx`    | Public form component                                                     |
| `app/(public)/beta/page.tsx`              | Public signup page                                                        |
| `app/(public)/beta/thank-you/page.tsx`    | Confirmation page                                                         |
| `app/(admin)/admin/beta/page.tsx`         | Admin management page                                                     |
| `components/admin/beta-signups-table.tsx` | Admin table with status management                                        |

## Admin Workflow

1. Share `cheflowhq.com/beta` with prospective testers
2. View signups at `/admin/beta`
3. Change status: **Pending** → **Invited** (when you send them access) → **Onboarded** (when they're active)
4. Use **Declined** for signups that aren't a fit
5. Add notes for internal tracking

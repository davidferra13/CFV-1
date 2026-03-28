# Onboarding Overhaul - Implementation Notes

**Spec:** `docs/specs/onboarding-overhaul.md`
**Built:** 2026-03-27
**Migration:** `database/migrations/20260401000108_onboarding_overhaul.sql`

## What Changed

### Database

- Added columns to `chefs`: `cuisine_specialties`, `city`, `state`, `social_links`, `onboarding_banner_dismissed_at`, `onboarding_reminders_dismissed`
- Created `chef_marketplace_profiles` table (if not already existing from discovery spec)

### Wizard (5 steps, all skippable)

1. **Profile** - business name (required), cuisine pills with "Other" text input, city/state/service area, website, phone, collapsible social links (Instagram/Facebook/TikTok), bio, public/private toggle
2. **Portfolio** - up to 5 food photos, 5MB each, JPEG/PNG/WebP/HEIC, grid preview with remove
3. **Pricing** - hourly rate, per-guest rate, minimum booking, repeatable package deals, link to full pricing page
4. **Import Leads** - Gmail OAuth with rewritten non-invasive copy, permission-focused language
5. **First Event** - redirect to /events

### Server Actions Added

- `completeOnboardingWizard()` - sets `chefs.onboarding_completed_at`, wizard never auto-shows again
- `dismissOnboardingBanner()` - sets `chefs.onboarding_banner_dismissed_at`, DB-backed persistence
- `dismissOnboardingReminder()` - increments `chefs.onboarding_reminders_dismissed`, stops at 3
- `getOnboardingDismissalState()` - reads all three dismissal flags
- Profile triple-write in `completeStep('profile', data)` - writes to `chefs`, `chef_directory_listings`, `chef_marketplace_profiles`, and `chef_preferences.network_discoverable`

### UI Changes

- `onboarding-wizard.tsx` - full rewrite with sidebar nav, progress bar, dark mode support, crash guard, free step navigation
- `onboarding-banner.tsx` - now checks DB for dismissal state before rendering, persists dismiss to DB
- `onboarding-reminder-banner.tsx` (NEW) - gentle dashboard reminder for incomplete optional steps, max 1 at a time, stops after 3 total dismissals

### Files Modified

- `lib/onboarding/onboarding-constants.ts` - 5-step wizard + US_STATES array
- `lib/onboarding/onboarding-actions.ts` - new actions + triple-write logic
- `app/(chef)/onboarding/page.tsx` - checks `onboarding_completed_at` before showing wizard
- `components/onboarding/onboarding-wizard.tsx` - full rewrite
- `components/onboarding/onboarding-banner.tsx` - DB-backed dismissal
- `components/onboarding/onboarding-steps/profile-step.tsx` - expanded fields
- `components/onboarding/onboarding-steps/connect-gmail-step.tsx` - rewritten copy

### Files Created

- `components/onboarding/onboarding-steps/portfolio-step.tsx`
- `components/onboarding/onboarding-steps/pricing-step-wizard.tsx`
- `components/dashboard/onboarding-reminder-banner.tsx`

### Not Implemented (deferred per spec)

- Profile photo and logo upload in onboarding (upload infrastructure exists in settings, can be wired later)
- Portfolio photo actual storage upload (currently passes file names to onComplete, actual storage upload needs wiring to `/api/storage/`)
- Menu upload is intentionally NOT a wizard step (noted on completion screen as "coming soon")

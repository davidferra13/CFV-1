# Portfolio Upload Fix - Follow-up

**Date:** 2026-03-28
**Spec:** `docs/specs/portfolio-upload-fix.md`

---

## What Changed

### 1. `next.config.js` - Server Action Body Size Limit

Added `serverActions: { bodySizeLimit: '50mb' }` at the top level of the Next.js config. This fixes the root cause of upload failures: Next.js server actions default to a 1MB body size limit, which is far too small for multi-photo uploads (5 photos at 5MB each = 25MB).

This setting is global (applies to all server actions). 50MB is a reasonable compromise that covers batch photo uploads without opening every endpoint to excessive payloads.

### 2. `components/onboarding/onboarding-steps/portfolio-step.tsx` - Removed 5-Photo Cap

- Removed `MAX_PHOTOS = 5` constant and all count-based validation
- The "Add photos" button is now always visible regardless of how many photos are queued
- Added client-side batching: photos upload in groups of 10 to avoid memory pressure
- Added batch progress indicator ("Uploading batch 1 of 3...")
- Updated help text from "Up to 5 photos, 5MB each. JPEG, PNG, or WebP." to "5MB per photo. JPEG, PNG, WebP, or HEIC." (fixes HEIC omission)
- Shows count of selected photos
- Reports which files were skipped and why (instead of silent drops)
- Changed fallback error message from "You can add them later from your profile" to "You can skip this step and try again later" (the profile page uses a different portfolio system, so the old message was misleading)
- Reset file input after selection so re-selecting the same files works

### 3. `lib/onboarding/onboarding-actions.ts` - Server Action Updates

- Removed `files.length > 5` hard cap, replaced with `files.length > 50` (abuse prevention)
- Removed `.slice(0, 5)` on merged portfolio URLs (was capping DB storage to 5)
- Added `skipped` array to success response with per-file failure reasons (name + reason)
- Invalid file type, oversized files, and storage errors now report back instead of being silently dropped

---

## Known Limitations

1. **Two separate portfolio systems.** Onboarding uploads go to `chef_directory_listings.portfolio_urls`. The portfolio gallery at `/portfolio` uses `event_photos.is_portfolio`. These are not unified. Onboarding photos don't appear in the portfolio gallery.

2. **`bodySizeLimit` is global.** No way to set per-action limits in Next.js 14.2. Acceptable trade-off.

3. **Orphaned files.** If the DB upsert fails after files are written to disk, the files become orphaned. No cleanup mechanism exists yet.

---

## Requires Dev Server Restart

The `next.config.js` change requires a dev server restart to take effect. The dev server was stuck recompiling when this change was made. Restart `npm run dev` to pick up the new `serverActions.bodySizeLimit` setting.

Without the restart, uploads will still fail with the old 1MB limit.

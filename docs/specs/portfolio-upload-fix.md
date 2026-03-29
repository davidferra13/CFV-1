# Spec: Portfolio Upload - Remove Limit + Fix Upload Failure

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** medium (3-8 files)
> **Created:** 2026-03-28
> **Built by:** Claude Code (2026-03-28) (already implemented in prior session)
>
> SPEC IS BUILT

---

## What This Does (Plain English)

Chefs can upload as many portfolio photos as they want during onboarding. The current 5-photo cap is removed, and the upload failure (caused by Next.js's default 1MB server action body size limit) is fixed so photos actually persist. Large uploads are batched client-side to avoid memory pressure.

---

## Why It Matters

The portfolio step is currently broken: uploads fail because 5 photos at up to 5MB each (25MB total) exceeds the default 1MB body size limit for Next.js server actions. On top of that, the artificial 5-photo cap limits chefs from showcasing their full range of work.

---

## Files to Create

None.

---

## Files to Modify

| File                                                        | What to Change                                                                                                                                                                                                                                              |
| ----------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `next.config.js`                                            | Add top-level `serverActions: { bodySizeLimit: '50mb' }` (Next.js 14.2+ uses top-level, NOT under `experimental`). Confirm version with `npx next --version` first.                                                                                         |
| `components/onboarding/onboarding-steps/portfolio-step.tsx` | Remove `MAX_PHOTOS` constant and all count-cap references. Keep the "Add photo" button always visible. Add client-side batching (upload in groups of 10). Add progress indicator for multi-batch uploads. Update help text. Fix HEIC mention inconsistency. |
| `lib/onboarding/onboarding-actions.ts`                      | Remove `files.length > 5` server-side check. Remove `.slice(0, 5)` on merged URLs. Add a soft server-side cap (50 per request) as abuse prevention. Return per-file error details so the client can report which files failed and why.                      |

---

## Database Changes

None. The `chef_directory_listings.portfolio_urls` column is `text[]` with no length constraint. The only cap was in application code (`.slice(0, 5)`), which is being removed.

---

## Data Model

No changes. `chef_directory_listings.portfolio_urls` already supports any number of URLs.

---

## Server Actions

| Action                                                 | Auth            | Input                                                                               | Output                                                                                                                   | Side Effects                                                                                                                                      |
| ------------------------------------------------------ | --------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploadPortfolioPhotos(formData)` (existing, modified) | `requireChef()` | FormData with `photos` files (max 50 per request, 5MB per file, JPEG/PNG/WebP/HEIC) | `{ success: true, urls: string[], skipped?: { name: string, reason: string }[] }` or `{ success: false, error: string }` | Writes files to `portfolio-photos` bucket, upserts `chef_directory_listings.portfolio_urls`, revalidates `/onboarding` and `/settings/my-profile` |

Key change: the response now includes a `skipped` array so the client can tell the chef which files failed and why (too large, wrong type, storage error). Currently invalid files are silently dropped.

---

## UI / Component Spec

### Portfolio Step (onboarding step 2 of 6)

**Layout:** Same grid layout (2-3 columns), photo previews with hover-remove buttons, dashed "Add photo" button always visible at the end.

### States

- **Empty:** Just the dashed "Add photo" button and help text
- **With photos:** Grid of previews + "Add photo" button at the end (always present, no cap)
- **Uploading:** Progress text on the Continue button (e.g., "Uploading batch 1 of 3..."), button disabled
- **Partial success:** Green toast for uploaded count, warning for skipped files with reasons
- **Error:** Red error text below the grid if ALL files fail

### Interactions

- Clicking "Add photo" opens file picker (multiple selection enabled)
- Each selected file is validated client-side (type + size only, no count cap)
- Remove button on hover removes individual photos from the queue
- "Continue" batches photos into groups of 10, uploads each batch sequentially via `uploadPortfolioPhotos`, accumulates results
- "I'll do this later" skips without uploading

### Changes from current

- The "Add photo" button is always visible regardless of photo count (previously hidden after 5)
- Help text changes from "Up to 5 photos, 5MB each. JPEG, PNG, or WebP." to "5MB per photo. JPEG, PNG, WebP, or HEIC."
- No count-based error message ("Maximum 5 photos allowed" is removed)
- Upload progress shows batch progress for large uploads
- Skipped files are reported with reasons instead of silently dropped

---

## Edge Cases and Error Handling

| Scenario                                     | Correct Behavior                                                                                                                                                     |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Server action body too large                 | Fixed by `serverActions.bodySizeLimit: '50mb'`. Client batching (10 at a time) keeps each request under 50MB.                                                        |
| Individual file upload fails (storage error) | Skip that file, include in `skipped` response array. Continue uploading others. If ALL fail, return error.                                                           |
| File too large (>5MB)                        | Server skips file, includes in `skipped` array with reason "File exceeds 5MB limit". Client also validates pre-upload.                                               |
| Wrong file type                              | Server skips file, includes in `skipped` array with reason "Unsupported file type". Client also validates pre-upload.                                                |
| Chef uploads 50+ photos in one session       | Client batches into groups of 10. Server caps at 50 per request. Multiple batches accumulate in `portfolio_urls`.                                                    |
| Existing portfolio + new uploads             | Merge arrays (existing + new), no cap                                                                                                                                |
| Storage bucket doesn't exist                 | Auto-create on first upload (existing logic, keep it)                                                                                                                |
| DB upsert fails after files uploaded         | Files persist on disk (orphaned). Existing behavior, acceptable for now. Error is logged server-side. Upload still returns success with URLs since files were saved. |
| Batch 2 of 3 fails mid-upload                | Batch 1 photos are already persisted. Show partial success. Chef can retry remaining.                                                                                |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to onboarding, reach the portfolio step
3. Select 6+ photos (exceeding the old limit)
4. Verify all are shown in the preview grid
5. Verify the "Add photo" button remains visible
6. Click "Continue", verify upload succeeds (no red error)
7. Check that photos are persisted (navigate away and back, or check DB)
8. Test with a single large photo (close to 5MB) to confirm size validation still works
9. Test with an invalid file type to confirm type validation still works
10. Test with 15+ photos to verify batching works and progress indicator shows
11. Screenshot the final result

---

## Out of Scope

- Drag-and-drop reordering of portfolio photos (separate feature)
- Image compression/optimization on upload (separate feature)
- Unifying onboarding portfolio (`chef_directory_listings.portfolio_urls`) with event-based portfolio (`event_photos.is_portfolio`) into a single system (see Known Limitations below)
- Changing the per-file size limit (stays at 5MB)
- Orphaned file cleanup (files uploaded but not linked in DB)

---

## Known Limitations (Builder Agent Must Not Try to Fix These)

1. **Two separate portfolio systems exist.** Onboarding uploads go to `chef_directory_listings.portfolio_urls` (text array). The portfolio gallery at `/portfolio` uses `event_photos` table with `is_portfolio` flag. These are never unified. Photos uploaded during onboarding do NOT appear in the portfolio gallery. This is a known architectural split; unifying them is a separate spec.

2. **"You can add them later from your profile" may be inaccurate.** Verify whether the profile settings page (`/settings/my-profile`) actually has a portfolio upload UI. If it doesn't, change the fallback error message to: "You can try again or skip this step for now." Do NOT promise functionality that doesn't exist (Zero Hallucination rule).

3. **The `bodySizeLimit` is global.** Setting `serverActions.bodySizeLimit: '50mb'` applies to ALL server actions, not just photo uploads. 50MB is a reasonable compromise (covers 10 photos at 5MB) without opening every endpoint to 100MB payloads.

---

## Notes for Builder Agent

1. **Root cause of upload failure:** Next.js server actions default to 1MB body size limit. The fix in `next.config.js` (top-level, NOT under `experimental` for Next.js 14.2+):

   ```js
   const nextConfig = {
     serverActions: {
       bodySizeLimit: '50mb',
     },
     // ... rest of config
   }
   ```

   Run `npx next --version` first to confirm. If <14.2, use `experimental.serverActions.bodySizeLimit`.

2. **The storage layer works fine.** `lib/storage/index.ts` correctly handles `Blob`/`File` objects. The compat shim in `lib/db/compat.ts` passes through properly. The failure happens at the Next.js request parsing level, before the storage layer is reached.

3. **Keep per-file validation.** Only the count limit is removed. Per-file size (5MB) and type (JPEG/PNG/WebP/HEIC) validation stays on both client and server.

4. **The `.slice(0, 5)` on line 410 of `onboarding-actions.ts` is the DB-level cap.** Remove it.

5. **Silent file skipping is a bug.** Lines 359-360 of `onboarding-actions.ts` silently `continue` past invalid files. Refactor to track skipped files with reasons and return them in the response.

6. **Client-side batching pattern:** Split `photos` array into chunks of 10, call `uploadPortfolioPhotos` for each chunk sequentially, accumulate `urls` and `skipped` arrays, update progress between batches.

7. **Dev server restart required.** Changing `next.config.js` requires a restart. Ask the user to restart the dev server after this change (per CLAUDE.md: never kill servers without permission).

8. **Update `docs/app-complete-audit.md`** if the portfolio step's description mentions a 5-photo limit.

9. **Related spec:** `docs/specs/onboarding-overhaul.md` describes this same portfolio step. Don't conflict with it.

10. **Help text HEIC inconsistency.** Current help text says "JPEG, PNG, or WebP" but the code accepts HEIC/HEIF. Update the help text to include HEIC.

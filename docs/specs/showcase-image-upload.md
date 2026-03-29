# Spec: Showcase Image Upload (Hero Image for Public Directory)

> **Status:** verified
> **Priority:** P1 (next up)
> **Depends on:** none
> **Estimated complexity:** small (3 files)
> **Created:** 2026-03-29
> **Built by:** Claude Code (2026-03-29)

---

## What This Does (Plain English)

Chefs can upload a high-resolution showcase image from their discovery settings page. This image appears as the hero banner on their directory tile (`/chefs`) and replaces the current behavior of stretching a small, compressed profile picture into a large display area. The profile picture (avatar) remains separate and unchanged. The directory page also gets Cloudinary optimization so all hero images render at proper quality regardless of source.

---

## Why It Matters

The profile picture is compressed via reSmush on upload and the original is discarded. When that small file is used as a hero image on the public directory (4:3 tile, up to full viewport width), it looks blurry and pixelated. Chefs need to control what represents them publicly. A headshot cropped for a circle is not a billboard. The directory tile needs a dedicated, high-quality landscape image.

---

## Files to Create

None. All changes go into existing files.

---

## Files to Modify

| File                                                 | What to Change                                                                                                                                                                                  |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/discovery/actions.ts`                           | Add `uploadDiscoveryHeroImage(formData)` server action (~60 lines). Add `removeDiscoveryHeroImage()` action (~30 lines). Add constants for bucket name, allowed types, max size.                |
| `components/settings/discovery-profile-settings.tsx` | Replace the `hero_image_url` URL text input (lines 143-150) with a file upload widget matching the profile image/logo upload pattern. Add image preview at 4:3 aspect ratio. Add remove button. |
| `app/(public)/chefs/page.tsx`                        | Line 188: wrap `heroImage` in `getOptimizedGalleryImage()` for Cloudinary optimization on directory tiles. Import the function from `lib/images/cloudinary`.                                    |

---

## Database Changes

None. The `chef_marketplace_profiles.hero_image_url` column already exists (text, nullable). The upload action writes the storage URL to this existing column.

---

## Data Model

**Existing column used:** `chef_marketplace_profiles.hero_image_url` (text, nullable)

- Stores the public storage URL of the uploaded showcase image
- One image per chef (replacing overwrites the previous)
- Null means no showcase image (directory falls back to `profile_image_url` via existing `mergeDiscoveryProfile()` logic)
- The column already accepts URL strings from the existing URL text input. Uploaded images produce a local storage URL in the same format. Both work.

**Storage location:** `./storage/chef-hero-images/{chefId}/{timestamp}-{uuid}.{ext}`

**Fallback chain on `/chefs` directory (unchanged):**

1. `chef_marketplace_profiles.hero_image_url` (highest priority, now uploadable)
2. `chef_directory_listings.profile_photo_url` (external listing data)
3. `chefs.profile_image_url` (legacy fallback, the compressed avatar)

---

## Server Actions

| Action                               | Auth            | Input                                                                     | Output                           | Side Effects                                                                                                                                                                                      |
| ------------------------------------ | --------------- | ------------------------------------------------------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `uploadDiscoveryHeroImage(formData)` | `requireChef()` | `FormData` with `image` file field (JPEG, PNG, WebP, HEIC/HEIF, max 10MB) | `{ success: true, url: string }` | Stores file to `chef-hero-images` bucket. Upserts `chef_marketplace_profiles.hero_image_url`. Deletes previous hero image file if path changed. Revalidates `/chefs`, `/settings/public-profile`. |
| `removeDiscoveryHeroImage()`         | `requireChef()` | None                                                                      | `{ success: true }`              | Sets `hero_image_url` to null. Deletes the file from storage. Revalidates `/chefs`, `/settings/public-profile`.                                                                                   |

### uploadDiscoveryHeroImage - Implementation Notes

- **No reSmush compression.** The entire point is preserving full quality. Do not send the image through reSmush.
- **EXIF metadata stripping (privacy).** Before storing the file, run it through `sharp` to strip all EXIF/metadata (GPS coordinates, camera serial numbers, timestamps). Chefs upload photos taken at clients' homes; leaking GPS data is a privacy risk. Use: `sharp(buffer).rotate().toBuffer()` (`.rotate()` with no args auto-rotates based on EXIF orientation then strips metadata). `sharp` is already in `package.json` (v0.34.5). This preserves full image quality while removing metadata.
- **HEIC to JPEG conversion.** HEIC/HEIF files from iPhones can't be displayed in most browsers without Cloudinary. Convert HEIC/HEIF to JPEG at upload time using `sharp(buffer).jpeg({ quality: 95 }).toBuffer()`. Store as `.jpg`. This ensures the image always renders, even if Cloudinary is not configured. Only convert HEIC/HEIF; leave JPEG/PNG/WebP as-is (just strip EXIF).
- **Upsert pattern:** If no `chef_marketplace_profiles` row exists for this chef, create one (upsert on `chef_id`). Only set `hero_image_url` and `updated_at` in the upsert payload, so other fields aren't wiped.
- **Previous image cleanup:** Extract the storage path from the existing `hero_image_url` (if it's a local storage URL, not an external URL). Delete the old file after successful upload. If the existing URL is external (doesn't match `/api/storage/public/chef-hero-images/`), skip cleanup (it's a pasted URL, not our file).
- **Copy the upload pattern from `uploadChefLogo()` in `lib/chef/profile-actions.ts` (lines 196-269).** Same structure: validate type/size, generate storage path, upload, get public URL, update DB, cleanup previous.
- **Bucket auto-creation:** Add an `ensureChefHeroImagesBucket(db)` helper (same pattern as `ensureChefLogosBucket` in profile-actions.ts). On first upload, the bucket won't exist. Retry after bucket creation on bucket-related errors.
- **Revalidation:** Must match `updateMyDiscoveryProfile()` revalidation (lines 268-279): `/settings/public-profile`, `/chefs`, `chef-layout-{chefId}` tag, plus `/chef/{slug}` and `/chef/{slug}/inquire` if slug exists. Fetch the chef's slug before revalidating.
- **Constants:**
  - `CHEF_HERO_IMAGES_BUCKET = 'chef-hero-images'`
  - `MAX_HERO_IMAGE_SIZE = 10 * 1024 * 1024` (10MB)
  - `ALLOWED_HERO_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif']`

---

## UI / Component Spec

### Discovery Profile Settings - Hero Image Section

**Location:** `components/settings/discovery-profile-settings.tsx`, replacing lines 143-150

**Replace the URL text input with:**

1. **Label:** "Showcase image" with helper text: "This image appears on your public directory tile. Landscape recommended, at least 1200x900px. Max 10MB. GPS and camera metadata are automatically removed for privacy."
2. **Current image preview:** If `hero_image_url` is set, show it in a 4:3 aspect ratio container with `object-cover` and rounded corners. This matches the directory tile aspect ratio so the chef sees exactly how it will look.
3. **Upload button:** "Upload image" button that opens a file picker. Accepts JPEG, PNG, WebP, HEIC/HEIF.
4. **Remove button:** "Remove" text button below the preview (only shown when an image exists).
5. **Upload state:** Show a spinner/loading indicator during upload. Disable the button.
6. **Error state:** Toast on upload failure.

### States

- **Empty (no hero image):** Show a dashed-border placeholder box at 4:3 aspect ratio with "Upload a showcase image" text and an upload button. Helper text below.
- **Populated:** Show the current image in 4:3 preview with "Change image" and "Remove" buttons below.
- **Uploading:** Preview shows the local file preview (`URL.createObjectURL`), upload button shows spinner, buttons disabled.
- **Error:** Toast with "Failed to upload image". Reverts to previous state.

### Interactions

- Chef clicks "Upload image" or "Change image" -> file picker opens
- Chef selects file -> client reads image dimensions using `new Image()` on `URL.createObjectURL(file)`
- If image is below 800x600px -> show warning toast: "This image is smaller than recommended (at least 1200x900px) and may appear blurry on the directory." Allow upload anyway (don't block, just warn).
- If image passes check -> local preview shown immediately, upload starts automatically
- Upload succeeds -> preview updates to the new storage URL, toast "Showcase image updated"
- Upload fails -> toast error, preview reverts to previous image (or empty state)
- Chef clicks "Remove" -> confirmation not needed (they can re-upload), calls `removeDiscoveryHeroImage()`, preview clears

**Important:** The hero image upload/remove is independent of the "Save changes" button on the discovery settings form. It uploads immediately on file selection (same pattern as profile image and logo uploads). The URL field in the form state should update after successful upload so that if the chef subsequently saves other discovery fields, the hero_image_url isn't overwritten with a stale value.

---

## Edge Cases and Error Handling

| Scenario                                                 | Correct Behavior                                                                                                                                                                       |
| -------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upload fails (storage error)                             | Toast error, no DB change, no file left in storage. Revert preview.                                                                                                                    |
| Chef has no `chef_marketplace_profiles` row yet          | Upsert creates the row with only `chef_id`, `hero_image_url`, `created_at`, `updated_at`. Other fields remain null.                                                                    |
| Chef previously pasted an external URL as hero_image_url | The image displays normally. On upload of a new file, the external URL is replaced. No file cleanup needed (it's not our file).                                                        |
| Chef uploads a portrait image                            | `object-cover` crops it to 4:3. It works, just not ideal. The helper text recommends landscape.                                                                                        |
| Chef uploads a tiny image (e.g. 200x150px)               | Client-side dimension check warns: "This image is smaller than recommended and may appear blurry." Upload is NOT blocked (the chef may know what they're doing), but they're informed. |
| Chef uploads a photo with GPS coordinates in EXIF        | `sharp` strips all metadata server-side before storage. No GPS, camera serial, or timestamp data is stored.                                                                            |
| Chef uploads a HEIC file from iPhone                     | Server converts to JPEG (quality 95) via `sharp` before storage. File stored as `.jpg`. Renders in all browsers without Cloudinary dependency.                                         |
| File is > 10MB                                           | Client-side validation rejects before upload. Toast: "File too large. Maximum 10MB."                                                                                                   |
| Invalid file type                                        | Client-side validation rejects. Toast: "Use JPEG, PNG, WebP, or HEIC."                                                                                                                 |
| `NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME` not set              | `getOptimizedGalleryImage()` falls back to raw URL (existing graceful degradation in `getOptimizedImageUrl()`). Images still display, just without CDN optimization.                   |
| Cloudinary can't reach localhost in dev                  | Same fallback. Raw URL used. Images display from local storage directly.                                                                                                               |
| Chef uploads hero, then clears it via remove             | `hero_image_url` set to null. Directory falls back to `profile_image_url` (existing behavior).                                                                                         |
| Rapid re-uploads (chef changes mind 3 times)             | Each upload replaces the previous. Previous file cleaned up each time. Last write wins.                                                                                                |

---

## Verification Steps

1. Sign in with agent account
2. Navigate to `/settings/public-profile`
3. Verify: the hero image section shows an empty upload placeholder (or current image if one was previously pasted as URL)
4. Upload a landscape JPEG (at least 1200px wide)
5. Verify: preview shows the image at 4:3 aspect ratio
6. Navigate to `/chefs` in a new tab
7. Verify: the chef's directory tile shows the uploaded image, sharp and clear (not blurry)
8. Go back to settings, click "Remove"
9. Verify: preview clears to empty state
10. Navigate to `/chefs` again
11. Verify: tile falls back to profile picture (or initial letter if no profile picture)
12. Upload a new image, then upload a different one immediately
13. Verify: second image replaces first, no errors
14. Screenshot the directory tile and the settings page

---

## Out of Scope

- **Profile image upload pipeline** - not changing compression, storage, or display for avatars
- **Logo upload** - untouched
- **Image cropping UI** - `object-cover` handles the crop. A cropper is a separate feature.
- **Gallery/multiple showcase images** - `gallery_urls` column exists but is a future feature
- **Recipe/menu item images** - different system entirely
- **Cloudinary upload (vs fetch)** - we use Cloudinary fetch delivery (no upload needed). No Cloudinary SDK, no upload presets.
- **Migration** - no schema changes needed

---

## Where This Feature Lives in the System (Context Map)

This feature touches a single image field, but that field flows through multiple surfaces. The builder must understand every place the hero image appears so they don't break downstream consumers.

### Surfaces that READ `hero_image_url`

| Surface                                                     | File                                                         | How It Uses the Image                                                               | Impact of This Spec                                                                             |
| ----------------------------------------------------------- | ------------------------------------------------------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| **Chef directory tiles** (`/chefs`)                         | `app/(public)/chefs/page.tsx` line 166, 188                  | `discovery.hero_image_url \|\| profile_image_url` as hero banner in 4:3 tile        | **MODIFIED** - adding Cloudinary wrapper                                                        |
| **Public chef profile** (`/chef/[slug]`)                    | `app/(public)/chef/[slug]/page.tsx` line 42                  | Used for OpenGraph/social share meta image                                          | **NOT MODIFIED** - but benefits automatically (better source image = better OG card)            |
| **Discovery profile settings** (`/settings/public-profile`) | `components/settings/discovery-profile-settings.tsx` line 85 | Displays current value in form, sends on save                                       | **MODIFIED** - replacing URL input with file uploader                                           |
| **Discovery profile completeness**                          | `lib/discovery/profile.ts` (completeness computation)        | `hero_image_url` is one of 8 completeness checkpoints                               | **NOT MODIFIED** - but benefits automatically (uploading an image increases completeness score) |
| **`getDiscoverableChefs()`**                                | `lib/directory/actions.ts` lines 234-237                     | Feeds into `mergeDiscoveryProfile()` which resolves the fallback chain              | **NOT MODIFIED** - reads the same column, no changes needed                                     |
| **`getPublicChefProfile()`**                                | `lib/profile/actions.ts` lines 246-257                       | Returns `profile_image_url ?? discovery.hero_image_url` for the public profile page | **NOT MODIFIED** - reads the same column                                                        |

### Surfaces that WRITE `hero_image_url`

| Writer                           | File                                | How It Writes                                                                            | Impact of This Spec                                                                                   |
| -------------------------------- | ----------------------------------- | ---------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| **Discovery settings form save** | `lib/discovery/actions.ts` line 219 | `updateMyDiscoveryProfile()` upserts full row including `hero_image_url` from form state | **CRITICAL INTERACTION** - form state must sync after upload to prevent save from overwriting new URL |
| **New upload action**            | `lib/discovery/actions.ts` (new)    | `uploadDiscoveryHeroImage()` upserts only `hero_image_url` + `updated_at`                | **ADDED BY THIS SPEC**                                                                                |
| **New remove action**            | `lib/discovery/actions.ts` (new)    | `removeDiscoveryHeroImage()` sets `hero_image_url` to null                               | **ADDED BY THIS SPEC**                                                                                |

### Why This Matters for the Builder

The form save (line 107: `hero_image_url: heroImageUrl.trim() || null`) and the upload action both write to the same column. If the builder doesn't sync React state after upload, the form save will clobber the uploaded URL. This is the single most important thing to get right. Every other consumer is read-only and benefits automatically.

---

## Notes for Builder Agent

### Pattern to Copy

`uploadChefLogo()` in `lib/chef/profile-actions.ts` (lines 196-269) is the exact pattern. Copy its structure for the new `uploadDiscoveryHeroImage()` action. Key differences:

- Different bucket name (`chef-hero-images` instead of `chef-logos`)
- Writes to `chef_marketplace_profiles.hero_image_url` instead of `chefs.logo_url`
- Uses upsert (the marketplace profile row may not exist yet)
- No reSmush compression (skip it entirely)

### Cloudinary on Directory Tiles

In `app/(public)/chefs/page.tsx` line 188, the hero image is passed raw to the Next.js Image component. Add the import:

```ts
import { getOptimizedGalleryImage } from '@/lib/images/cloudinary'
```

And change the src:

```tsx
src={heroImage ? getOptimizedGalleryImage(heroImage, 800, 600) : undefined}
```

`getOptimizedGalleryImage` already exists in `lib/images/cloudinary.ts` (line 189). It calls `getOptimizedImageUrl` which gracefully falls back to the raw URL if Cloudinary is not configured.

### Upsert Gotcha

When upserting `chef_marketplace_profiles`, only include the fields you're setting. If you pass `null` for other fields in the upsert payload, it will wipe existing data (cuisine_types, service_area, etc.). Use a minimal payload:

```ts
{ chef_id: user.entityId, hero_image_url: publicUrl, updated_at: new Date().toISOString() }
```

With `onConflict: 'chef_id'`.

### Storage Path Extraction

To detect whether the existing `hero_image_url` is a local storage URL (vs an external URL), check if it contains `/api/storage/public/chef-hero-images/`. If yes, extract the path after the bucket name for cleanup. If not, skip cleanup. Reference `extractChefProfileImagePath()` in `lib/network/actions.ts` (line 272) for the pattern.

### Form State Sync

After `uploadDiscoveryHeroImage()` returns successfully, update the `heroImageUrl` state in the discovery settings form so that subsequent saves of other fields don't overwrite the new URL with the stale value from initial load.

### Revalidation Paths

After upload or remove:

- `revalidatePath('/chefs')` (directory page)
- `revalidatePath('/settings/public-profile')` (settings page)
- `revalidateTag('chef-discovery-{chefId}')` if this tag exists (check before adding)

### Image Processing Pipeline (sharp)

`sharp` is already in `package.json`. The upload action should process the buffer before storage:

```ts
import sharp from 'sharp'

const rawBuffer = Buffer.from(await file.arrayBuffer())
const isHeic = file.type === 'image/heic' || file.type === 'image/heif'

let processed: Buffer
let finalExt: string
let finalContentType: string

if (isHeic) {
  // Convert HEIC to JPEG (browsers can't render HEIC natively)
  processed = await sharp(rawBuffer).rotate().jpeg({ quality: 95 }).toBuffer()
  finalExt = 'jpg'
  finalContentType = 'image/jpeg'
} else {
  // Strip EXIF metadata, auto-rotate based on orientation
  processed = await sharp(rawBuffer).rotate().toBuffer()
  finalExt = HERO_IMAGE_MIME_TO_EXT[file.type] || 'jpg'
  finalContentType = file.type
}
```

Key points:

- `.rotate()` with no args reads EXIF orientation, applies it, then strips all metadata
- HEIC conversion uses quality 95 (near-lossless, the point is format compat, not compression)
- JPEG/PNG/WebP pass through `sharp` only for EXIF stripping, no re-encoding
- The processed buffer is what gets uploaded to storage (not the original)

### Client-Side Resolution Check

Before uploading, check image dimensions in the browser:

```ts
function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file)
    const img = new window.Image()
    img.onload = () => {
      URL.revokeObjectURL(url)
      resolve({ width: img.naturalWidth, height: img.naturalHeight })
    }
    img.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Could not read image'))
    }
    img.src = url
  })
}
```

- Warn (don't block) if either dimension is below 800px
- HEIC files may not preview in the browser (no native support). Skip the dimension check for HEIC; the server will handle it. Show a generic "Processing..." state instead of a local preview for HEIC uploads.

### Do NOT

- Do not touch `uploadChefProfileImage()` or the profile image pipeline
- Do not add reSmush compression to the hero image upload
- Do not create a new database migration
- Do not add a new column to any table
- Do not modify `mergeDiscoveryProfile()` or `getDiscoverableChefs()`
- Do not add `@ts-nocheck` to any file

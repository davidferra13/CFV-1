# Chef Business Logo Upload

## What Changed

Added the ability for chefs to upload a **business logo** separate from their personal profile photo. The logo is shown prominently on the public chef profile page.

## Files Modified

| File                                                            | Change                                                                              |
| --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| `supabase/migrations/20260304000010_chef_logo.sql`              | New `logo_url TEXT` column on `chefs` + new `chef-logos` storage bucket             |
| `lib/chef/profile-actions.ts`                                   | `logo_url` added to schema, types, get, and update; new `uploadChefLogo` action     |
| `app/(chef)/settings/my-profile/chef-profile-form.tsx`          | Logo upload section with file picker and rectangular preview                        |
| `lib/profile/actions.ts`                                        | `logo_url` added to the public chef profile select query                            |
| `app/(public)/chef/[slug]/page.tsx`                             | Logo displayed in the hero section above the profile photo                          |
| `app/(chef)/settings/client-preview/public-profile-preview.tsx` | Logo added to the preview mirror so Settings → Client Preview matches the live page |

## How It Works

### Upload Flow

1. Chef goes to **Settings → My Profile**
2. Scrolls to the "Public Profile Settings" card
3. A new "Business Logo" section sits below the profile photo section
4. Chef picks a file (JPEG, PNG, WebP, or SVG, max 5MB)
5. A rectangular preview is shown immediately (client-side, no upload yet)
6. On **Save Profile**, `uploadChefLogo` is called first — uploads to the `chef-logos` bucket, saves the public URL to `chefs.logo_url`, then `updateChefFullProfile` persists all other fields

### Public Display

- On `/chef/[slug]`, if a logo is set it renders above the profile photo as a max-height-64px image with `object-contain` (preserves aspect ratio, works with both wide and square logos)
- If no logo is set, the hero renders exactly as before — no visual change
- **Settings → Client Preview** mirrors this exactly, so what the chef sees in preview is what clients see live

### Storage

- Bucket: `chef-logos` (public, 5MB max)
- Accepted types: `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`
- Path pattern: `{chef_id}/{timestamp}-{uuid}.{ext}`
- Previous logo is auto-deleted from storage on new upload

## Distinction from Profile Photo

|               | Profile Photo               | Business Logo               |
| ------------- | --------------------------- | --------------------------- |
| Column        | `profile_image_url`         | `logo_url`                  |
| Bucket        | `chef-profile-images`       | `chef-logos`                |
| Max size      | 10MB                        | 5MB                         |
| Formats       | JPEG, PNG, HEIC, HEIF, WebP | JPEG, PNG, WebP, SVG        |
| Display shape | Circular avatar             | Rectangular, object-contain |
| Intended use  | Personal headshot           | Brand mark / business logo  |

## Migration

Apply via:

```bash
npx supabase db push --linked
```

The migration is additive — it only adds a nullable column and a new bucket. No existing data is affected.

# Event Photo Gallery

**Date:** 2026-02-19
**Branch:** feature/event-photo-gallery
**Status:** Implemented

---

## What This Feature Does

Chefs can now upload photos of dishes and dinners directly to ChefFlow after completing an event. These photos serve two purposes:

1. **Chef asset library** — every dinner photo is permanently stored, organized by event, ready for future marketing and portfolio use.
2. **Client relationship** — clients can view their own dinner's photos in their event portal, which reinforces the experience, encourages repeat bookings, and gives them something to share.

Photos appear in three places:

- **Chef event detail page** (`/events/[id]`) — full upload/manage interface, available once the event is `in_progress` or `completed`.
- **Client event portal** (`/my-events/[id]`) — read-only gallery with a lightbox viewer, appears only when the chef has uploaded at least one photo.
- **Chef inquiry page** (`/inquiries/[id]`) — if the inquiry was converted to an event, the event's photos appear at the bottom of the inquiry so the chef can reference past dinner photos during repeat booking conversations.

---

## Database

### Table: `event_photos`

Migration: `supabase/migrations/20260228000004_event_photo_gallery.sql`

| Column              | Type                 | Notes                                                                       |
| ------------------- | -------------------- | --------------------------------------------------------------------------- |
| `id`                | UUID                 | Primary key, also used as the filename in storage                           |
| `tenant_id`         | UUID FK → chefs      | Tenant isolation — mandatory                                                |
| `event_id`          | UUID FK → events     | The dinner this photo belongs to                                            |
| `storage_path`      | TEXT                 | Relative path in `event-photos` bucket: `{tenant_id}/{event_id}/{id}.{ext}` |
| `filename_original` | TEXT                 | Original filename (display only)                                            |
| `content_type`      | TEXT                 | MIME type — extension always derived from this, never from filename         |
| `size_bytes`        | BIGINT               | File size for display                                                       |
| `caption`           | TEXT nullable        | Chef-added caption per photo                                                |
| `display_order`     | INTEGER              | Sort order within the event gallery (lower = first)                         |
| `uploaded_by`       | UUID FK → auth.users | The chef's auth user ID                                                     |
| `created_at`        | TIMESTAMPTZ          | Auto-set                                                                    |
| `updated_at`        | TIMESTAMPTZ          | Auto-managed by trigger                                                     |
| `deleted_at`        | TIMESTAMPTZ nullable | Soft delete — NULL = active                                                 |

**Key constraint:** No hard DELETE policy via RLS. All deletion is soft-delete via `UPDATE SET deleted_at`. The storage object is removed by the server action after the DB soft-delete succeeds.

**Indexes:**

- `(event_id, display_order) WHERE deleted_at IS NULL` — primary read pattern
- `(tenant_id, created_at DESC) WHERE deleted_at IS NULL` — future cross-event portfolio queries

---

## Storage Bucket

Migration: `supabase/migrations/20260228000005_event_photos_bucket.sql`

| Setting            | Value                                                               |
| ------------------ | ------------------------------------------------------------------- |
| Bucket ID          | `event-photos`                                                      |
| Public             | `false` (PRIVATE)                                                   |
| Max file size      | 10 MB                                                               |
| Allowed MIME types | `image/jpeg`, `image/png`, `image/heic`, `image/heif`, `image/webp` |

**Path format:** `{tenant_id}/{event_id}/{photo_id}.{ext}`

The first segment is always `tenant_id`, which is used in storage-level RLS policies to scope uploads and reads to the correct chef. The second segment is `event_id`, used in the client-facing storage policy to verify ownership.

**Signed URLs:** All reads require signed URLs generated server-side with a 1-hour expiry via `supabase.storage.from('event-photos').createSignedUrls(paths, 3600)`. URLs are generated in batch and hydrated onto the returned `EventPhoto` objects — they are never stored in the database.

**`next.config.js`:** The Supabase storage hostname (`luefkpakzvxcsqroxyhz.supabase.co`) has been added to `images.remotePatterns` so `next/image` can load signed URLs.

---

## RLS Summary

### `event_photos` table

| Policy                       | Role   | Operation | Condition                                                             |
| ---------------------------- | ------ | --------- | --------------------------------------------------------------------- |
| `event_photos_chef_select`   | Chef   | SELECT    | `tenant_id = get_current_tenant_id()`                                 |
| `event_photos_chef_insert`   | Chef   | INSERT    | `tenant_id = get_current_tenant_id()`                                 |
| `event_photos_chef_update`   | Chef   | UPDATE    | `tenant_id = get_current_tenant_id()`                                 |
| `event_photos_client_select` | Client | SELECT    | `deleted_at IS NULL` AND `events.client_id = get_current_client_id()` |

### `storage.objects` (event-photos bucket)

| Policy                       | Operation | Condition                                                           |
| ---------------------------- | --------- | ------------------------------------------------------------------- |
| `event_photos_chef_upload`   | INSERT    | Chef role + path segment 1 = tenant_id                              |
| `event_photos_chef_select`   | SELECT    | Chef role + path segment 1 = tenant_id                              |
| `event_photos_chef_delete`   | DELETE    | Chef role + path segment 1 = tenant_id                              |
| `event_photos_client_select` | SELECT    | Client role + path segment 2 (event_id) → events.client_id = client |

---

## Server Actions

File: `lib/events/photo-actions.ts`

All actions are `'use server'`. All mutations call `revalidatePath`.

| Function                                         | Role   | Description                                                                                                   |
| ------------------------------------------------ | ------ | ------------------------------------------------------------------------------------------------------------- |
| `uploadEventPhoto(eventId, formData)`            | Chef   | Upload one photo. `formData` keys: `photo` (File), `caption` (string, optional). Returns `{ success, photo }` |
| `getEventPhotosForChef(eventId)`                 | Chef   | List active photos with signed URLs                                                                           |
| `getEventPhotosForClient(eventId)`               | Client | Same, but verifies `events.client_id = user.entityId` first                                                   |
| `deleteEventPhoto(photoId)`                      | Chef   | Soft-delete in DB + remove storage object                                                                     |
| `updatePhotoCaption(photoId, caption)`           | Chef   | Update the caption for a single photo                                                                         |
| `reorderEventPhotos(eventId, orderedPhotoIds[])` | Chef   | Assign `display_order` 0..n-1 based on array position                                                         |

**50-photo cap** is enforced in `uploadEventPhoto` by counting active photos before upload.

**Extension derivation** always uses `MIME_TO_EXT[file.type]` — never the original filename. This prevents path traversal and extension spoofing.

**Upload cleanup** — if the DB insert fails after a successful storage upload, the orphaned storage object is immediately removed.

---

## Components

### `EventPhotoGallery` (Chef — upload + manage)

File: `components/events/event-photo-gallery.tsx` (`'use client'`)

Props: `{ eventId: string, initialPhotos: EventPhoto[] }`

Features:

- Drag-and-drop upload zone + click-to-select (multiple files)
- Sequential upload with per-file progress counter ("Uploading 2 of 5…")
- Photo grid: 2 cols mobile / 3 cols sm / 4 cols lg
- Per-photo card: `next/image` thumbnail, inline caption input (save on blur), up/down reorder arrows, delete with confirm step
- Error banner with dismiss button
- Photo count badge ("8 / 50")
- Hint text for clients when no photos are uploaded yet

### `ClientEventPhotoGallery` (Client — read-only)

File: `components/events/client-event-photo-gallery.tsx` (`'use client'`)

Props: `{ photos: EventPhoto[] }`

Features:

- Returns `null` if no photos (section disappears entirely)
- Grid with hover-reveal caption overlay
- Full lightbox: click to open, previous/next navigation, caption, counter
- Keyboard-friendly (focus rings on grid buttons)

---

## Integration Points

### Chef event page (`app/(chef)/events/[id]/page.tsx`)

- `getEventPhotosForChef(params.id)` added to the second `Promise.all` (guest/RSVP batch), guarded by `isCompletedOrBeyond`
- `<EventPhotoGallery>` rendered after the "AAR Summary" card and before "Recipe Capture" — logically: capture AAR → upload photos → capture recipes

### Client event page (`app/(client)/my-events/[id]/page.tsx`)

- `getEventPhotosForClient(params.id)` fetched alongside `getClientReviewForEvent` (both gated on `event.status === 'completed'`)
- `<ClientEventPhotoGallery photos={eventPhotos} />` rendered after "Payment History" and before "Attached Menus" — visible near the top of the completed event view

### Chef inquiry page (`app/(chef)/inquiries/[id]/page.tsx`)

- `converted_to_event_id` extracted from inquiry record (returned by `getInquiryById`'s `select('*')`)
- `getEventPhotosForChef(convertedEventId)` fetched after the `Promise.all` if the inquiry was converted
- `<EventPhotoGallery>` rendered before the "Metadata" card at the bottom of the inquiry
- Shows "No photos uploaded yet" state with a link to the event page when `converted_to_event_id` exists but no photos are present

---

## Signed URL Behavior

Signed URLs are generated server-side on every page load with a **1-hour expiry**. The database stores only the relative storage path. The `signedUrl` field on `EventPhoto` is populated at query time via `createSignedUrls()` (batch API) and is never persisted.

**Implication:** If a user keeps a tab open for more than 1 hour, images will fail to load (403). This is acceptable for MVP and consistent with how receipts and chat attachments work in this codebase.

---

## Limits

| Limit             | Value                       |
| ----------------- | --------------------------- |
| Photos per event  | 50                          |
| Max file size     | 10 MB                       |
| Accepted formats  | JPEG, PNG, HEIC, HEIF, WebP |
| Signed URL expiry | 1 hour                      |

---

## Phase 2 Roadmap

- **Chef photo library page** — a dedicated `/photos` page showing all dinner photos across all events, filterable by date, occasion, and dish type. Good for portfolio building and social media content.
- **Drag-and-drop reorder** — replace up/down arrows with react-dnd or @hello-pangea/dnd for more intuitive gallery ordering.
- **URL refresh mechanism** — store `urlExpiry` timestamp in component state and call a `refreshPhotoUrls(eventId)` server action when URLs are near expiry.
- **Share individual photos** — generate a public share link for a single photo or a full album.
- **Photo tagging** — tag photos by dish name, course, or menu item for searchability.
- **Integration with social queue** — push photos directly into the social content queue for Instagram/TikTok post drafting.

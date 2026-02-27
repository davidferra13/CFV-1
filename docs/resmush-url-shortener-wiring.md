# reSmush.it Image Compression & URL Shortener Integration

**Date:** 2026-02-26
**Branch:** feature/risk-gap-closure

## What Changed

### 1. Image Compression (reSmush.it)

Wired `compressImageBuffer()` from `lib/images/resmush.ts` into two image upload flows as a pre-upload compression step.

**Files modified:**

- `lib/events/photo-actions.ts` — `uploadEventPhoto()`
- `lib/network/actions.ts` — `uploadChefProfileImage()`

**How it works:**

1. File is validated (type, size) as before
2. **New step:** File buffer is sent to reSmush.it API for compression
3. If compression succeeds, the compressed image is downloaded from reSmush.it's temporary URL
4. The compressed (or original, on failure) image is uploaded to Supabase Storage
5. The DB record stores the actual uploaded size (`uploadSize`), not the original file size

**Non-blocking behavior:**

- Entire compression step is wrapped in `try/catch`
- If reSmush.it is down, returns an error, or the compressed download fails, the original file is uploaded unchanged
- Console logs compression results for monitoring (e.g., `Compressed photo.jpg: 2400000 → 1800000 (25% saved)`)
- Console warns on compression failure with the error details

**reSmush.it API details:**

- Free, no API key required
- Max 5MB per image (the POST/buffer method)
- Compression quality: 92 (good balance between quality and size)
- Supports JPEG, PNG, GIF, BMP, TIFF

### 2. URL Shortening (ulvis.net)

Wired `shortenUrl()` from `lib/links/url-shortener.ts` into event share link generation and the event detail page.

**Files modified:**

- `lib/sharing/actions.ts` — `createEventShare()`
- `app/(chef)/events/[id]/page.tsx` — Share QR code, HostMessageTemplate, RSVPTrackerPanel

**How it works:**

- `createEventShare()`: After generating the full share URL, it attempts to shorten it via ulvis.net. The shortened URL is returned in the `shareUrl` field.
- Event detail page: A shortened URL is computed once after `activeShare` is resolved, then used across the Share QR code section, HostMessageTemplate, and RSVPTrackerPanel.
- The QR code encodes the shortened URL, making it smaller and easier to scan.
- The "Open share page" link still uses the full URL for reliable navigation.

**Non-blocking behavior:**

- `shortenUrl()` already returns `null` on failure (internal try/catch)
- Additional `try/catch` wrapper ensures any unexpected errors don't break the flow
- Falls back to the full URL if shortening fails

**ulvis.net API details:**

- Free, no API key or signup required
- 100 requests/hour rate limit
- Returns permanent redirects (URLs don't expire)
- Private mode enabled (URLs not listed publicly)

## What Was NOT Changed

- No function signatures were modified
- No existing tests were affected
- Guest photo uploads, client photo uploads, journey photo uploads, and portal background uploads were not wired (can be added later following the same pattern)
- The recap share link and navigational links still use full URLs (not shortened)
- ClientPortalQR and GuestCodePanel were not modified (those use client-side URL construction)

## How to Test

### Image Compression

1. Upload a photo to an event (event detail page > photos section)
2. Check server console for compression log: `[uploadEventPhoto] Compressed ...`
3. Verify the photo displays correctly after upload
4. Upload a profile image (Network > Profile > change photo)
5. Check server console for: `[uploadChefProfileImage] Compressed ...`

### URL Shortening

1. As a client, create an event share link
2. The returned URL should be a shortened ulvis.net URL
3. Verify the shortened URL redirects to the correct share page
4. As a chef, view an event with an active share — QR code should encode the short URL
5. Copy the host message template — it should contain the short URL
